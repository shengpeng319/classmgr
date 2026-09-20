/**
 * 通用 LLM 适配层（L1）
 *
 * 厂商差异（端点 / 鉴权头 / 默认模型名）全部锁定在本目录：
 *   - llm.ts     统一接口 + OpenAI 兼容 wire format 引擎 + env 驱动的 provider 解析
 *   - zhipu.ts   智谱 provider
 *   - deepseek.ts DeepSeek provider
 *
 * 约定：全部走 OpenAI 兼容格式（messages / tools / tool_calls），
 * GLM 与 DeepSeek 原生兼容该格式。无 SDK 依赖，直接 fetch。
 */
import * as fs from 'fs'
import * as path from 'path'
import { createZhipuProvider } from './zhipu'
import { createDeepseekProvider } from './deepseek'

// ---- 轻量 .env 加载（tsx 运行时未必有人加载 .env；不覆盖已有环境变量） ----
loadEnvFile()

function loadEnvFile() {
  try {
    // src/services/llm.ts -> server/.env
    const envPath = path.join(__dirname, '..', '..', '.env')
    if (!fs.existsSync(envPath)) return
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!m || line.trim().startsWith('#')) continue
      let value = m[2]
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[m[1]] === undefined) {
        process.env[m[1]] = value
      }
    }
  } catch {
    // .env 加载失败不阻塞服务
  }
}

// ---- 统一类型（OpenAI 兼容 wire format） ----

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export type MessageContent = string | Array<Record<string, any>>

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: MessageContent | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, any> // JSON Schema
  }
}

export interface LLMChatParams {
  messages: ChatMessage[]
  tools?: ToolDef[]
  /** 最终回复轮才用，强制 JSON 输出 */
  responseFormat?: 'json_object'
  /** 有图时走视觉模型，图片注入到最后一条 user message */
  imageBase64?: string
}

export interface LLMProvider {
  name: string
  chat(params: LLMChatParams): Promise<ChatMessage>
}

/** 配置类错误（缺 key / 不支持的视觉模型等），上层应返回友好提示而非 500 */
export class AIConfigError extends Error {}

// ---- OpenAI 兼容请求引擎 ----

function withImage(messages: ChatMessage[], imageBase64: string): ChatMessage[] {
  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`
  const msgs = messages.map((m) => ({ ...m }))
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role === 'user' && typeof m.content === 'string') {
      m.content = [
        { type: 'text', text: m.content },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
      return msgs
    }
  }
  msgs.push({
    role: 'user',
    content: [
      { type: 'text', text: '请识别这张图片' },
      { type: 'image_url', image_url: { url: dataUrl } }
    ]
  })
  return msgs
}

export async function openAICompatibleChat(
  config: { endpoint: string; apiKey: string; model: string },
  params: LLMChatParams
): Promise<ChatMessage> {
  let messages = params.messages
  if (params.imageBase64) {
    messages = withImage(messages, params.imageBase64)
  }

  const body: Record<string, any> = { model: config.model, messages }
  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools
    body.tool_choice = 'auto'
  }
  if (params.responseFormat) {
    body.response_format = { type: params.responseFormat }
  }

  let res: any
  try {
    res = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    })
  } catch (e: any) {
    throw new Error(`无法连接 LLM 服务: ${e.message}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LLM API 错误 ${res.status}: ${text.slice(0, 500)}`)
  }

  const json = await res.json()
  const msg = json.choices && json.choices[0] && json.choices[0].message
  if (!msg) {
    throw new Error(`LLM API 返回格式异常: ${JSON.stringify(json).slice(0, 300)}`)
  }

  const out: ChatMessage = { role: 'assistant', content: msg.content ?? '' }
  if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
    out.tool_calls = msg.tool_calls
  }
  return out
}

export function contentToString(content: MessageContent | null | undefined): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  return content
    .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n')
}

// ---- env 驱动的 provider 解析 ----

function env(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

function requireApiKey(): string {
  const apiKey = env('AI_API_KEY')
  if (!apiKey) {
    throw new AIConfigError(
      'AI 助手尚未配置：请在 server/.env 中填写 AI_API_KEY（智谱 https://open.bigmodel.cn 控制台获取），然后重启服务。'
    )
  }
  return apiKey
}

/** 文本对话 provider（AI_PROVIDER / AI_API_KEY / AI_MODEL） */
export function getChatProvider(): LLMProvider {
  const providerName = (env('AI_PROVIDER') || 'zhipu').toLowerCase()
  const apiKey = requireApiKey()
  if (providerName === 'deepseek') {
    return createDeepseekProvider(apiKey, env('AI_MODEL'), 'chat')
  }
  return createZhipuProvider(apiKey, env('AI_MODEL'), 'chat')
}

/**
 * 视觉 provider（AI_VISION_PROVIDER / AI_VISION_MODEL）。
 * 默认与 AI_PROVIDER 相同；DeepSeek 无视觉模型，必须显式配置 AI_VISION_MODEL，
 * 否则在有图片请求时抛 AIConfigError。
 */
export function getVisionProvider(): LLMProvider {
  const providerName = (env('AI_VISION_PROVIDER') || env('AI_PROVIDER') || 'zhipu').toLowerCase()
  const apiKey = requireApiKey()
  if (providerName === 'deepseek') {
    return createDeepseekProvider(apiKey, env('AI_VISION_MODEL'), 'vision')
  }
  return createZhipuProvider(apiKey, env('AI_VISION_MODEL'), 'vision')
}
