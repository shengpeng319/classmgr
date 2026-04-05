const BASE_URL = 'http://192.168.101.50:3000/api'

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

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as ApiResponse<T>)
        } else {
          reject(new Error((res.data as ApiResponse).message || 'Request failed'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}
