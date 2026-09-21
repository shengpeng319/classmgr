/**
 * 智谱（GLM）provider —— OpenAI 兼容 wire format
 * 厂商端点/默认模型只允许出现在本文件与 deepseek.ts / llm.ts 中
 */
import { LLMProvider, LLMChatParams, ChatMessage, openAICompatibleChat } from './llm'

// coding plan 端点（与普通 paas 端点额度独立）；支持 AI_BASE_URL env 覆盖以便切换套餐
const ZHIPU_ENDPOINT = process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const ZHIPU_DEFAULT_CHAT_MODEL = 'glm-4-flash'
const ZHIPU_DEFAULT_VISION_MODEL = 'glm-4v-flash'

export function createZhipuProvider(
  apiKey: string,
  model: string | undefined,
  kind: 'chat' | 'vision' = 'chat'
): LLMProvider {
  const resolvedModel =
    model || (kind === 'vision' ? ZHIPU_DEFAULT_VISION_MODEL : ZHIPU_DEFAULT_CHAT_MODEL)
  return {
    name: 'zhipu',
    async chat(params: LLMChatParams): Promise<ChatMessage> {
      return openAICompatibleChat(
        { endpoint: ZHIPU_ENDPOINT, apiKey, model: resolvedModel },
        params
      )
    }
  }
}
