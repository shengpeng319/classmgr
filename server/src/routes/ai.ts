/**
 * AI 助手路由（Agent 循环）
 *   POST /api/classmgr/ai/chat    { messages, image? }  → { text, options, confirmId? }
 *   POST /api/classmgr/ai/confirm { confirmId }          → 执行待确认操作
 *
 * 流程：组装 system prompt + 工具列表 + 消息历史 → 调 LLM →
 *       若返回 tool_calls：执行工具（写操作转待确认）→ 结果回喂 LLM → 循环（上限 5 轮）→
 *       最终 assistant 回复（json_object 优先，解析失败降级为纯文本）。
 */
import Router from 'koa-router'
import { TokenPayload } from '../utils/jwt'
import { authMiddleware } from '../middleware/auth'
import {
  ChatMessage,
  AIConfigError,
  getChatProvider,
  getVisionProvider,
  contentToString
} from '../services/llm'
import {
  aiToolDefs,
  getAITool,
  createPendingConfirm,
  takePendingConfirm
} from '../services/aiTools'

const MAX_TOOL_ROUNDS = 5

const VISION_PROMPT = `请识别这张图片中的课表/课程信息，输出结构化 JSON：
{"courses":[{"name":"课程名","dayOfWeek":"1","startTime":"15:00","endTime":"16:00","location":"地点","type":"sports"}]}
其中 dayOfWeek 为 0-6 的数字字符串（0=周日，1=周一，…，6=周六）；时间为 24 小时制 HH:mm；type 取 school/tutoring/homework/sports/art/other。
如果图片不是课表，请用一段话描述图片内容。`

function buildSystemPrompt(user: TokenPayload): string {
  const roleText = user.role === 'admin' ? '管理员' : '普通用户'
  return `你是「小孩课程管理」应用内的 AI 助手，帮孩子和家长管理课程表、每日任务和积分。

当前登录用户：${user.username}（角色：${roleText}）。所有工具都自动以该用户身份执行，不要猜测或请求别人的数据。

工作规则：
1. 涉及课程/任务/积分的问题，优先调用查询工具拿真实数据，不要编造。
2. 新增/修改/删除/完成任务等写操作工具不会立即执行：调用后会返回 status="needs_confirmation"。此时你要在 text 中清楚复述将要执行的操作（课程名、星期、时间等），并且 options 恰好为 ["确认执行","取消"]。
3. 用户点「确认执行」后由系统直接完成操作（不经过对话）；用户说「取消」时友好收尾即可，不要执行任何操作。
4. 星期规则：dayOfWeek 为字符串，0=周日、1=周一、2=周二、3=周三、4=周四、5=周五、6=周六，多个用逗号分隔如 "1,3"。时间用 24 小时制 "HH:mm"，下午3点=15:00。
5. 课程 type 只能取：school(校内课)/tutoring(辅导班)/homework(作业)/sports(运动)/art(艺术)/other(其他)，游泳、篮球等归 sports。
6. 「课程表 schedule」是长期重复安排；「任务 task」是某天的当日事项。用户说"周三下午3点到4点有游泳课"应创建 schedule（create_schedules）。
7. 用户上传课表图片时，消息中会附带【课表图片识别结果】，据此整理后用 create_schedules 创建（走确认流程）。
8. 最终回复必须是严格 JSON：{"text": "给用户看的中文回复", "options": ["按钮1", ...]}。options 最多 4 个；确认场景必须为 ["确认执行","取消"]；普通问答可给 0-2 个合理的后续建议按钮或空数组。text 要简洁友好。`
}

function sanitizeHistory(input: any): ChatMessage[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(
      (m: any) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .slice(-20)
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

function normalizeImage(image: any): string | undefined {
  if (typeof image !== 'string' || !image.trim()) return undefined
  return image.trim()
}

function parseReply(text: string): { text: string; options: string[] } {
  const t = (text || '').trim()
  if (!t) return { text: 'AI 没有返回内容，请换个说法再试。', options: [] }
  const extract = (j: any) =>
    j && typeof j.text === 'string'
      ? {
          text: j.text,
          options: Array.isArray(j.options) ? j.options.map((o: any) => String(o)).slice(0, 4) : []
        }
      : null
  try {
    const parsed = extract(JSON.parse(t))
    if (parsed) return parsed
  } catch {
    // 继续尝试提取 JSON 片段
  }
  const m = t.match(/\{[\s\S]*\}/)
  if (m) {
    try {
      const parsed = extract(JSON.parse(m[0]))
      if (parsed) return parsed
    } catch {
      // 降级
    }
  }
  return { text: t, options: [] }
}

export function aiRoutes(router: Router) {
  router.post('/ai/chat', authMiddleware, async (ctx) => {
    const user = ctx.state.user as TokenPayload
    const body = (ctx.request.body || {}) as { messages?: any; image?: any }

    try {
      const history = sanitizeHistory(body.messages)
      const image = normalizeImage(body.image)
      if (!image && history.length === 0) {
        ctx.body = { code: 1, message: '请输入内容或上传图片', data: null }
        return
      }

      // ① 图片先走视觉模型，识别结果作为文本上下文进入 Agent 循环
      if (image) {
        const visionProvider = getVisionProvider()
        const visionResp = await visionProvider.chat({
          messages: [{ role: 'user', content: VISION_PROMPT }],
          imageBase64: image
        })
        const visionNote = contentToString(visionResp.content).trim()
        if (visionNote) {
          const tag = `【课表图片识别结果】\n${visionNote}\n【/识别结果】`
          const last = history[history.length - 1]
          if (last && last.role === 'user') {
            last.content = `${last.content}\n${tag}`
          } else {
            history.push({ role: 'user', content: tag })
          }
        }
      }

      // ② Agent 循环
      const provider = getChatProvider()
      const tools = aiToolDefs(user.role)
      const llmMessages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(user) },
        ...history
      ]

      let finalText = ''
      let confirmId: string | undefined

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const resp = await provider.chat({ messages: llmMessages, tools })
        const toolCalls = resp.tool_calls || []

        if (toolCalls.length === 0) {
          finalText = contentToString(resp.content)
          break
        }

        llmMessages.push({ role: 'assistant', content: resp.content ?? '', tool_calls: toolCalls })

        for (const tc of toolCalls) {
          let args: any = {}
          try {
            args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
          } catch {
            args = {}
          }

          let result: any
          const tool = getAITool(tc.function.name)
          if (!tool) {
            result = { status: 'error', message: `未知工具: ${tc.function.name}` }
          } else if (tool.needsConfirm) {
            const pending = createPendingConfirm(user.userId, tool.name, args)
            confirmId = pending.confirmId
            result = {
              status: 'needs_confirmation',
              confirmId: pending.confirmId,
              summary: pending.summary,
              hint: '操作尚未执行，等待用户点击「确认执行」。请在 text 中复述该操作，options 恰好为 ["确认执行","取消"]'
            }
          } else {
            try {
              const data = await tool.execute(
                { userId: user.userId, username: user.username, role: user.role },
                args
              )
              result = { status: 'ok', data }
            } catch (e: any) {
              result = { status: 'error', message: e.message || '工具执行失败' }
            }
          }

          llmMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result)
          })
        }

        if (round === MAX_TOOL_ROUNDS - 1) {
          finalText = '这次的操作步骤有点多，我先停一下。请把需求拆成小步骤再告诉我，好吗？'
        }
      }

      // ③ 最终回复：优先 json_object 格式化一轮（仅当文本不是合法 JSON 时），失败降级
      let reply = parseReply(finalText)
      if (finalText.trim() && !finalText.trim().startsWith('{')) {
        try {
          const reformatted = await provider.chat({
            messages: [
              ...llmMessages,
              { role: 'assistant', content: finalText },
              {
                role: 'user',
                content:
                  '请把上面的回复严格转换成 JSON 对象：{"text": string, "options": string[]}，不要输出其他内容。'
              }
            ],
            responseFormat: 'json_object'
          })
          const retry = parseReply(contentToString(reformatted.content))
          if (retry.text !== 'AI 没有返回内容，请换个说法再试。') reply = retry
        } catch {
          // 降级：直接用解析结果
        }
      }

      ctx.body = { code: 0, message: 'ok', data: { ...reply, confirmId } }
    } catch (e: any) {
      if (e instanceof AIConfigError) {
        ctx.body = { code: 1, message: e.message, data: null }
        return
      }
      console.error('[AI] chat error:', e)
      ctx.body = { code: 1, message: `AI 服务调用失败：${e.message || '未知错误'}`, data: null }
    }
  })

  router.post('/ai/confirm', authMiddleware, async (ctx) => {
    const user = ctx.state.user as TokenPayload
    const { confirmId } = (ctx.request.body || {}) as { confirmId?: string }

    if (!confirmId) {
      ctx.body = { code: 1, message: '缺少 confirmId', data: null }
      return
    }

    const pending = takePendingConfirm(String(confirmId), user.userId)
    if (!pending) {
      ctx.body = {
        code: 1,
        message: '操作不存在、已过期（确认有效期 5 分钟）或无权执行，请重新发起。',
        data: null
      }
      return
    }

    const tool = getAITool(pending.toolName)
    if (!tool) {
      ctx.body = { code: 1, message: `内部错误：未知工具 ${pending.toolName}`, data: null }
      return
    }

    try {
      const result = await tool.execute(
        { userId: user.userId, username: user.username, role: user.role },
        pending.args
      )
      ctx.body = {
        code: 0,
        message: 'ok',
        data: { text: `已执行：${pending.summary}`, options: [], result }
      }
    } catch (e: any) {
      console.error('[AI] confirm error:', e)
      ctx.body = { code: 1, message: `执行失败：${e.message || '未知错误'}`, data: null }
    }
  })
}
