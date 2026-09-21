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

/** AI 对话；image 为可选的 base64（不带 dataURL 前缀也可）。
 *  小程序走异步提交+轮询（callContainer 15s 硬超时装不下 LLM 多轮）；H5 走同步 wait */
export function aiChat(messages: AIChatMessage[], image?: string) {
  const data = { messages, image, wait: true }
  const submit = () => request<{ jobId?: string } & Partial<AIChatResult>>({
    url: '/ai/chat',
    method: 'POST',
    data
  })
  const poll = (jobId: string): Promise<AIChatResult> =>
    new Promise((resolve, reject) => {
      const started = Date.now()
      const tick = () => {
        request<{ status: string; message?: string } & Partial<AIChatResult>>({
          url: `/ai/result/${jobId}`,
          method: 'GET'
        })
          .then((r) => {
            if (r.data?.status === 'running') {
              if (Date.now() - started > 120000) return reject(new Error('AI 响应超时，请重试'))
              setTimeout(tick, 1500)
            } else if (r.data?.status === 'error') {
              reject(new Error(r.data.message || 'AI 处理失败'))
            } else {
              resolve({
                text: r.data?.text || '',
                options: r.data?.options || [],
                confirmId: r.data?.confirmId
              })
            }
          })
          .catch(reject)
      }
      tick()
    })

  // #ifdef H5
  return submit() as Promise<AIChatResult>
  // #endif
  // #ifdef MP-WEIXIN
  return submit().then((r) => {
    if (r.data?.jobId) return poll(r.data.jobId)
    return r as unknown as AIChatResult
  })
  // #endif
}

/** 确认执行待确认操作 */
export function aiConfirm(confirmId: string) {
  return request<AIConfirmResult>({
    url: '/ai/confirm',
    method: 'POST',
    data: { confirmId }
  })
}
