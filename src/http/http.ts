import type { CustomRequestOptions, IResponse } from '@/http/types'
import { nextTick } from 'vue'
import { useTokenStore } from '@/store/token'
import { getEnvBaseUrl, isDoubleTokenMode } from '@/utils'
import { toLoginPage } from '@/utils/toLoginPage'
import { ResultEnum } from './tools/enum'

let refreshing = false
let taskQueue: (() => void)[] = []

export function http<T>(options: CustomRequestOptions) {
  return new Promise<T>((resolve, reject) => {
    // 处理请求体数据
    const requestData = options.data
    const method = options.method?.toUpperCase() || 'GET'

    // 对于 POST/PUT/PATCH 请求，确保数据格式正确
    if (['POST', 'PUT', 'PATCH'].includes(method) && requestData && typeof requestData === 'object') {
      // uni.request 在微信小程序中会自动序列化对象
      // 但需要确保 header 正确
      options.header = options.header || {}
      if (!options.header['Content-Type'] && !options.header['content-type']) {
        options.header['Content-Type'] = 'application/json'
      }
    }

    uni.request({
      ...options,
      data: requestData,
      dataType: 'json',
      // #ifndef MP-WEIXIN
      responseType: 'json',
      // #endif
      success: async (res) => {
        const responseData = res.data as IResponse<T>
        const { code } = responseData

        const isTokenExpired = res.statusCode === 401 || code === 401

        if (isTokenExpired) {
          const tokenStore = useTokenStore()

          // 非双token模式，直接退出登录
          if (!isDoubleTokenMode) {
            console.log('[401处理] 非双token模式，直接退出登录')
            await tokenStore.logout()
            toLoginPage()
            return reject(res)
          }

          // 双token模式：检查refreshToken是否有效
          const { refreshToken } = tokenStore.tokenInfo || {}
          const isRefreshTokenValid = refreshToken && !tokenStore.isRefreshTokenExpired

          if (!isRefreshTokenValid) {
            console.log('[401处理] refreshToken无效或已过期，必须重新登录')
            await tokenStore.logout()
            toLoginPage()
            return reject(res)
          }

          // 将请求加入队列，等待刷新完成后重试
          taskQueue.push(() => {
            resolve(http<T>(options))
          })

          // 避免并发刷新：只有一个请求负责刷新
          if (!refreshing) {
            refreshing = true
            console.log('[401处理] 开始刷新token...')

            try {
              await tokenStore.refreshToken()
              refreshing = false

              console.log('[401处理] token刷新成功，重试队列中的请求')
              nextTick(() => {
                uni.hideToast()
                uni.showToast({
                  title: '登录状态已更新',
                  icon: 'none',
                  duration: 1500,
                })
              })

              // 执行队列中的所有请求
              taskQueue.forEach(task => task())
            }
            catch (refreshErr) {
              console.error('[401处理] 刷新token失败:', refreshErr)
              refreshing = false

              nextTick(() => {
                uni.hideToast()
                uni.showToast({
                  title: '登录已过期，请重新登录',
                  icon: 'none',
                  duration: 2000,
                })
              })

              // 刷新失败，清理状态并跳转登录页
              await tokenStore.logout()
              setTimeout(() => {
                toLoginPage()
              }, 2000)
            }
            finally {
              taskQueue = []
            }
          }
          else {
            console.log('[401处理] 已有刷新请求在进行中，当前请求加入队列等待')
          }

          return reject(res)
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (code !== ResultEnum.Success0 && code !== ResultEnum.Success200) {
            uni.showToast({
              icon: 'none',
              title: responseData.msg || responseData.message || '请求错误',
            })
          }
          return resolve(responseData.data)
        }

        !options.hideErrorToast
        && uni.showToast({
          icon: 'none',
          title: (res.data as { msg?: string }).msg || '请求错误',
        })
        reject(res)
      },
      fail(err) {
        uni.showToast({
          icon: 'none',
          title: '网络错误，换个网络试试',
        })
        reject(err)
      },
    })
  })
}

/**
 * GET 请求
 * @param url 后台地址
 * @param query 请求query参数
 * @param header 请求头，默认为json格式
 * @returns
 */
export function httpGet<T>(url: string, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    query,
    method: 'GET',
    header,
    ...options,
  })
}

/**
 * POST 请求
 * @param url 后台地址
 * @param data 请求body参数
 * @param query 请求query参数，post请求也支持query，很多微信接口都需要
 * @param header 请求头，默认为json格式
 * @returns
 */
export function httpPost<T>(url: string, data?: Record<string, any>, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    query,
    data,
    method: 'POST',
    header,
    ...options,
  })
}

/**
 * PUT 请求
 */
export function httpPut<T>(url: string, data?: Record<string, any>, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    data,
    query,
    method: 'PUT',
    header,
    ...options,
  })
}

/**
 * DELETE 请求（无请求体，仅 query）
 */
export function httpDelete<T>(url: string, query?: Record<string, any>, header?: Record<string, any>, options?: Partial<CustomRequestOptions>) {
  return http<T>({
    url,
    query,
    method: 'DELETE',
    header,
    ...options,
  })
}

export function httpUpload<T>(
  url: string,
  filePath: string,
  name: string = 'file',
  formData?: Record<string, any>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tokenStore = useTokenStore()
    const token = tokenStore.tokenInfo?.accessToken

    let fullUrl = url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = getEnvBaseUrl() + url
    }

    uni.uploadFile({
      url: fullUrl,
      filePath,
      name,
      formData,
      header: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
      success: (res) => {
        try {
          if (res.statusCode !== 200) {
            uni.showToast({
              icon: 'none',
              title: `上传失败(${res.statusCode})`,
            })
            return reject(new Error(`上传失败，状态码: ${res.statusCode}`))
          }

          const responseText = res.data
          if (typeof responseText === 'string' && responseText.trim().startsWith('<')) {
            console.error('上传失败，返回HTML:', responseText.substring(0, 200))
            uni.showToast({
              icon: 'none',
              title: '服务器返回异常',
            })
            return reject(new Error('服务器返回异常'))
          }

          const data = JSON.parse(responseText) as IResponse<T>
          if (data.code === 200 || data.code === 0) {
            resolve(data.data as T)
          }
          else {
            uni.showToast({
              icon: 'none',
              title: data.msg || '上传失败',
            })
            reject(new Error(data.msg || '上传失败'))
          }
        }
        catch (parseError) {
          console.error('解析响应失败:', parseError)
          uni.showToast({
            icon: 'none',
            title: '响应解析失败',
          })
          reject(parseError)
        }
      },
      fail: (err) => {
        console.error('上传失败:', err)
        uni.showToast({
          icon: 'none',
          title: '网络错误，请重试',
        })
        reject(err)
      },
    })
  })
}

http.upload = httpUpload

// 支持与 axios 类似的API调用
http.get = httpGet
http.post = httpPost
http.put = httpPut
http.delete = httpDelete

// 支持与 alovaJS 类似的API调用
http.Get = httpGet
http.Post = httpPost
http.Put = httpPut
http.Delete = httpDelete
