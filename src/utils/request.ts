// #ifdef H5
const BASE_URL = '/api/classmgr'
// #endif
// #ifdef MP-WEIXIN
const BASE_URL = '/api/classmgr'
// #endif

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: any
}

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data } = options

  const token = uni.getStorageSync('token')
  const header: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    const fullUrl = `${BASE_URL}${url}`
    console.log(`[API] ${method} ${fullUrl}`, data || '')

    const handleResponse = (res: any) => {
      console.log(`[API] ${method} ${fullUrl} → ${res.statusCode}`, { code: (res.data as any)?.code, message: (res.data as any)?.message })
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(res.data as ApiResponse<T>)
      } else {
        const err = new Error((res.data as ApiResponse).message || 'Request failed')
        console.error(`[API] ${method} ${fullUrl} ✗`, err.message)
        reject(err)
      }
    }
    const handleFail = (err: any) => {
      console.error(`[API] ${method} ${fullUrl} ✗ NETWORK ERROR`, JSON.stringify(err))
      reject(err)
    }

    // #ifdef MP-WEIXIN
    // AI 聊天走公网域名（callContainer 硬性 15s 超时，LLM 多轮工具调用必超时报 102002）
    const isAI = url.startsWith('/ai/')
    const mpUrl = isAI
      ? `https://express-ft3j-317141-10-1492539128.sh.run.tcloudbase.com${fullUrl}`
      : fullUrl
    if (isAI) {
      uni.request({
        url: mpUrl,
        method,
        data,
        header,
        timeout: 120000,
        success: handleResponse,
        fail: handleFail
      })
    } else {
      wx.cloud.callContainer({
        config: { env: 'prod-d9gek74f6512f04e7' },
        path: fullUrl,
        method,
        data,
        header: { ...header, 'X-WX-SERVICE': 'express-ft3j' },
        success: handleResponse,
        fail: handleFail
      })
    }
    // #endif

    // #ifdef H5
    uni.request({
      url: fullUrl,
      method,
      data,
      header,
      success: handleResponse,
      fail: handleFail
    })
    // #endif
  })
}