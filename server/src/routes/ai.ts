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
  const now = new Date()
  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const todayText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}（${weekdayNames[now.getDay()]}）`
  return `你是「小孩课程管理」应用内的 AI 助手，帮孩子和家长管理课程表、每日任务和积分。

当前登录用户：${user.username}（角色：${roleText}）。所有工具都自动以该用户身份执行，不要猜测或请求别人的数据。
今天是：${todayText}。用户问「今天/明天/周几」时，先换算成具体星期，再与课程表的 dayOfWeek 匹配。「今天有什么课」= 只列 dayOfWeek 包含今天星期的课程，不是列全部课程表。

工作规则：
1. 涉及课程/任务/积分的问题，必须先调用查询工具拿真实数据。回答只能基于工具返回的数据：工具结果里没有的课/任务/积分一律回答"没有"，严禁凭空编造课程名、星期、时间、地点，严禁把 A 孩子的课说成 B 孩子的。工具结果中每条数据都带 owner（归属孩子），复述时必须与 owner 一致。
2. 新增/修改/删除/完成任务等写操作工具不会立即执行：调用后会返回 status="needs_confirmation"。此时你要在 text 中清楚复述将要执行的操作（课程名、星期、时间等），并且 options 恰好为 ["确认执行","取消"]。
3. 用户点「确认执行」后由系统直接完成操作（不经过对话）；用户说「取消」时友好收尾即可，不要执行任何操作。
4. 星期规则：dayOfWeek 为字符串，0=周日、1=周一、2=周二、3=周三、4=周四、5=周五、6=周六，多个用逗号分隔如 "1,3"。时间用 24 小时制 "HH:mm"，下午3点=15:00。
5. 课程 type 只能取：school(校内课)/tutoring(辅导班)/homework(作业)/sports(运动)/art(艺术)/other(其他)，游泳、篮球等归 sports。
6. 概念区分（最重要）：「课程 schedule」= 每周固定重复的模板，如"每周三下午游泳课"，只在课程表页显示，永远不能被"完成"；「任务 task」= 某一天的一次性事项，由系统每天从课程模板自动生成（或手动添加），可勾选完成、完成得积分，在今日任务页显示。判断标准：有"每周/周几"→ schedule；有具体某天/今天要做/完成→ task。查询严格区分：问「有什么课/课程/兴趣班/每周几上什么」→ list_schedules；问「今天/某天有什么任务/要做的事/待完成」→ list_tasks。新增同理：固定每周的课用 create_schedules，某天的一次性事项用 create_task（存在该工具，别再说没有）。用户说"周三下午3点到4点有游泳课"= 每周三 → create_schedules；说"明天下午写作业"= 某天一次性 → create_task。
7. 主动追问（多轮补全，适用于一切数据写操作）：用户下达创建/修改/删除指令但信息不全时，先补齐再动手。各操作至少要明确：创建任务=给谁、哪天；创建课程=给谁、周几、几点到几点；完成任务/删除课程/加积分=给谁、哪条（不确定是哪条时先列出选项让用户挑，别猜）。缺什么就在 text 里一次性问全（可给选项按钮），用户答完再调用工具走确认流程。已知信息不要重复问：任务时间没说几点就先问；积分没提就默认5分并复述，不单独追问。admin 一次对话内只操作一个孩子，别自作主张分配。禁止在信息不全时编造默认值直接创建。
8. 用户上传课表图片时，消息中会附带【课表图片识别结果】，据此整理后用 create_schedules 创建（走确认流程）。
9. 最终回复必须是严格 JSON：{"text": "给用户看的中文回复", "options": ["按钮1", ...]}。options 最多 4 个；确认场景必须为 ["确认执行","取消"]；普通问答可给 0-2 个合理的后续建议按钮或空数组。text 要简洁友好。`
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

// 内存任务表：异步 AI 聊天（callContainer 15s 硬超时 → 提交/轮询两段式）
interface AIJob {
  id: string
  userId: string
  status: 'running' | 'done' | 'error'
  result?: any
  error?: string
  createdAt: number
}
const aiJobs = new Map<string, AIJob>()
// ponytail: 内存表，单实例部署没问题；多实例时换 Redis 或落库
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [id, j] of aiJobs) if (j.createdAt < cutoff) aiJobs.delete(id)
}, 60 * 1000).unref()

export function aiRoutes(router: Router) {
  router.post('/ai/chat', authMiddleware, async (ctx) => {
    const user = ctx.state.user as TokenPayload
    const body = (ctx.request.body || {}) as { messages?: any; image?: any; wait?: boolean }

    const runChat = async (): Promise<any> => {
      try {
      const history = sanitizeHistory(body.messages)
      const image = normalizeImage(body.image)
      if (!image && history.length === 0) {
        return { code: 1, message: '请输入内容或上传图片', data: null }
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
          console.log('[ai-chat] tool result:', JSON.stringify(result).slice(0, 300))
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

      return { code: 0, message: 'ok', data: { ...reply, confirmId } }
    } catch (e: any) {
      if (e instanceof AIConfigError) {
        return { code: 1, message: e.message, data: null }
      }
      console.error('[AI] chat error:', e)
      return { code: 1, message: `AI 服务调用失败：${e.message || '未知错误'}`, data: null }
    }
  }

  // 同步模式（H5/开发者工具/直连场景）：?wait=1 或 body.wait=true 时直接等结果
  if (body.wait) {
    ctx.body = await runChat()
    return
  }

  // 异步模式（小程序正式版）：立即返回 jobId，前端轮询 /ai/result
  const job: AIJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.userId,
    status: 'running',
    createdAt: Date.now()
  }
  aiJobs.set(job.id, job)
  runChat()
    .then((r) => {
      job.status = r.code === 0 ? 'done' : 'error'
      job.result = r
      if (r.code !== 0) job.error = r.message
    })
    .catch((e) => {
      job.status = 'error'
      job.error = e.message || '未知错误'
    })
  ctx.body = { code: 0, message: 'ok', data: { jobId: job.id } }
  })

  // 轮询任务结果
  router.get('/ai/result/:jobId', authMiddleware, async (ctx) => {
    const user = ctx.state.user as TokenPayload
    const job = aiJobs.get(String(ctx.params.jobId))
    if (!job || job.userId !== user.userId) {
      ctx.body = { code: 1, message: '任务不存在或已过期', data: null }
      return
    }
    if (job.status === 'running') {
      ctx.body = { code: 0, message: 'ok', data: { status: 'running' } }
      return
    }
    aiJobs.delete(job.id)
    ctx.body = { code: 0, message: 'ok', data: { status: job.status, ...(job.result?.data || {}), message: job.error } }
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
