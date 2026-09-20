/**
 * DeepSeek provider —— OpenAI 兼容 wire format
 * 注意：DeepSeek 无视觉模型，kind='vision' 时必须显式传入模型名，否则抛配置错误
 */
import {
  LLMProvider,
  LLMChatParams,
  ChatMessage,
  openAICompatibleChat,
  AIConfigError
} from './llm'

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_DEFAULT_CHAT_MODEL = 'deepseek-chat'

export function createDeepseekProvider(
  apiKey: string,
  model: string | undefined,
  kind: 'chat' | 'vision' = 'chat'
): LLMProvider {
  if (kind === 'vision' && !model) {
    throw new AIConfigError(
      'DeepSeek 没有视觉模型：请在 server/.env 中配置 AI_VISION_PROVIDER / AI_VISION_MODEL（例如视觉走智谱 glm-4v-flash）。'
    )
  }
  const resolvedModel = model || DEEPSEEK_DEFAULT_CHAT_MODEL
  return {
    name: 'deepseek',
    async chat(params: LLMChatParams): Promise<ChatMessage> {
      return openAICompatibleChat(
        { endpoint: DEEPSEEK_ENDPOINT, apiKey, model: resolvedModel },
        params
      )
    }
  }
}
