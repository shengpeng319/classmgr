import { request } from '@/utils/request'

export interface AIChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIChatResult {
  text: string
  options: string[]
  confirmId?: string
}

export interface AIConfirmResult {
  text: string
  options: string[]
  result?: any
}

/** AI 对话；image 为可选的 base64（不带 dataURL 前缀也可） */
export function aiChat(messages: AIChatMessage[], image?: string) {
  return request<AIChatResult>({
    url: '/ai/chat',
    method: 'POST',
    data: { messages, image }
  })
}

/** 确认执行待确认操作 */
export function aiConfirm(confirmId: string) {
  return request<AIConfirmResult>({
    url: '/ai/confirm',
    method: 'POST',
    data: { confirmId }
  })
}
