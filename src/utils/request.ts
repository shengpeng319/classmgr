// #ifdef H5
const BASE_URL = '/api/classmgr'
// #endif
// #ifndef H5
// 云托管域名，部署时替换为实际域名
const BASE_URL = 'https://CLASSMGR_API_DOMAIN/api/classmgr'
// #endif

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
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

    uni.request({
      url: fullUrl,
      method,
      data,
      header,
      success: (res) => {
        console.log(`[API] ${method} ${fullUrl} → ${res.statusCode}`, { code: (res.data as any)?.code, message: (res.data as any)?.message })
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as ApiResponse<T>)
        } else {
          const err = new Error((res.data as ApiResponse).message || 'Request failed')
          console.error(`[API] ${method} ${fullUrl} ✗`, err.message)
          reject(err)
        }
      },
      fail: (err) => {
        console.error(`[API] ${method} ${fullUrl} ✗ NETWORK ERROR`, JSON.stringify(err))
        reject(err)
      }
    })
  })
}