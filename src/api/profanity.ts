import type { IProfanityCheckResponse } from './types/profanity'

const PROFANITY_CHECK_API = 'https://uapis.cn/api/v1/text/profanitycheck'

interface ProfanityApiResponse {
  status?: string
  original_text?: string
  masked_text?: string
  forbidden_words?: string[]
  code?: number
  data?: {
    status?: string
    original_text?: string
    masked_text?: string
    forbidden_words?: string[]
  }
}

export function checkProfanity(text: string): Promise<IProfanityCheckResponse> {
  return new Promise((resolve, reject) => {
    console.log('[违禁词检测] 开始请求, 文本长度:', text?.length || 0)

    uni.request({
      url: PROFANITY_CHECK_API,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: { text },
      success: (res) => {
        console.log('[违禁词检测] 响应状态码:', res.statusCode)
        console.log('[违禁词检测] 完整响应数据:', JSON.stringify(res.data))

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data as ProfanityApiResponse

          if (!data || typeof data !== 'object') {
            console.error('[违禁词检测] 返回数据为空或非对象:', res.data)
            reject(new Error('返回数据为空或格式错误'))
            return
          }

          if (typeof data.status === 'string') {
            const result: IProfanityCheckResponse = {
              status: data.status,
              original_text: data.original_text || text,
              masked_text: data.masked_text || text,
              forbidden_words: Array.isArray(data.forbidden_words) ? data.forbidden_words : [],
            }
            console.log('[违禁词检测] 解析成功:', result)
            resolve(result)
          }
          else if (data.code !== undefined && data.data) {
            console.warn('[违禁词检测] 检测到标准API响应格式，尝试提取data字段')
            const innerData = data.data

            if (innerData && typeof innerData.status === 'string') {
              const result: IProfanityCheckResponse = {
                status: innerData.status,
                original_text: innerData.original_text || text,
                masked_text: innerData.masked_text || text,
                forbidden_words: Array.isArray(innerData.forbidden_words) ? innerData.forbidden_words : [],
              }
              console.log('[违禁词检测] 从data字段解析成功:', result)
              resolve(result)
            }
            else {
              console.error('[违禁词检测] data字段内容异常:', innerData)
              reject(new Error('返回数据的data字段格式异常'))
            }
          }
          else {
            console.error('[违禁词检测] 未找到status字段, 数据结构:', Object.keys(data))
            reject(new Error(`返回数据缺少status字段, 包含字段: ${Object.keys(data).join(', ')}`))
          }
        }
        else {
          console.error('[违禁词检测] HTTP状态码异常:', res.statusCode)
          reject(new Error(`HTTP错误: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        console.error('[违禁词检测] 网络请求失败:', err.errMsg)
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}
