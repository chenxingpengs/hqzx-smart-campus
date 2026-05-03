import type { CustomRequestOptions } from '@/http/types'
import { useTokenStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'
import { stringifyQuery } from './tools/queryString'

// ===================== 核心配置：无需 Token 的接口路径（必须根据实际接口调整）====================
// 1. 填写登录/授权相关接口（这些接口不需要携带 Token）
// 2. 路径支持模糊匹配（包含该路径的请求都会被排除）
// 注意：/app/bind-user 需要携带临时token，不能排除
const NO_TOKEN_PATHS = [
  '/app/wx-login', // 微信登录接口（对应 wxLoginUsingPost）
  '/app/refresh-token', // 刷新Token接口（对应 refreshTokenUsingPost）
  '/app/app-login', // APP账号密码登录接口
  // '/app/bind-user', // ❌ 已移除：绑定接口需要携带临时token验证openid
  // 可根据需要添加其他无需 Token 的接口，例如：
  // '/public/xxx', '/auth/xxx'
]

// ===================== Token主动刷新阈值（秒）====================
const TOKEN_REFRESH_THRESHOLD = 300 // 5分钟内过期时主动刷新

// ===================== 工具函数：判断是否为无需 Token 的接口 =====================
function isNoTokenRequest(url: string): boolean {
  return NO_TOKEN_PATHS.some(path => url.includes(path))
}

// ===================== 工具函数：跳转登录页（避免重复跳转） =====================
let isRedirecting = false // 防止重复跳转锁
function redirectToLogin() {
  if (isRedirecting)
    return
  isRedirecting = true

  // 获取当前页面路径，避免在登录页重复跳转
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]?.route || ''
  const loginPagePath = '/pages-fg/login/login' // 请根据你的实际登录页路径修改

  // 若当前已在登录页，直接返回
  if (currentPage === loginPagePath.replace(/^\//, '')) {
    isRedirecting = false
    return
  }

  // 跳转登录页（清除页面栈，避免返回）
  uni.reLaunch({
    url: loginPagePath,
  })
}

// 拦截器配置
const httpInterceptor = {
  // 保持 async 函数，支持 await 获取 Token
  async invoke(options: CustomRequestOptions) {
    // 如果使用 alova，直接返回 options（原有逻辑保留）
    // if (options.alova) {
    //   return options
    // }

    // 1. 处理 query 参数拼接（原有逻辑保留）
    if (options.query) {
      const queryStr = stringifyQuery(options.query)
      options.url += options.url.includes('?') ? `&${queryStr}` : `?${queryStr}`
    }

    // 2. 处理基础路径拼接（原有逻辑保留）
    if (!options.url.startsWith('http')) {
      // #ifdef H5
      if (JSON.parse(import.meta.env.VITE_APP_PROXY_ENABLE)) {
        options.url = import.meta.env.VITE_APP_PROXY_PREFIX + options.url
      }
      else {
        options.url = getEnvBaseUrl() + options.url
      }
      // #endif
      // #ifndef H5
      options.url = getEnvBaseUrl() + options.url
      // #endif
    }

    // 3. 基础配置（原有逻辑保留）
    options.timeout = 60000 // 60s 超时
    options.header = { ...options.header } // 初始化 header，避免 undefined

    // ===================== 核心修改：Token 拦截逻辑（排除无需 Token 的接口）=====================
    const tokenStore = useTokenStore()
    // 判断当前请求是否需要排除 Token 拦截
    const needExcludeToken = isNoTokenRequest(options.url)

    if (!needExcludeToken) { // 仅非排除接口才添加 Token
      try {
        // 优化：优先使用缓存的accessToken，减少不必要的检查
        let token = tokenStore.tokenInfo?.accessToken

        // 检查accessToken是否存在且未过期
        if (token && !tokenStore.isAccessTokenExpired) {
          // 优化：Token即将过期时主动刷新（避免请求过程中过期）
          if (tokenStore.tokenRemainingTime < TOKEN_REFRESH_THRESHOLD && tokenStore.tokenInfo?.refreshToken) {
            console.log('[拦截器] Token即将过期，主动刷新...')
            try {
              await tokenStore.refreshToken()
              token = tokenStore.tokenInfo?.accessToken
            }
            catch (refreshErr) {
              console.log('[拦截器] 主动刷新失败，使用当前Token继续请求')
            }
          }
          options.header.Authorization = `Bearer ${token}`
        }
        else {
          // Token不存在或已过期，尝试获取有效Token（会触发刷新或抛出异常）
          token = await tokenStore.getValidToken()
          if (token) {
            options.header.Authorization = `Bearer ${token}`
          }
        }
      }
      catch (error) {
        const errMsg = (error as Error).message || 'Token获取失败'
        console.error(`请求 [${options.url}] 获取 Token 失败:`, errMsg)

        // 优化：仅在真正无法恢复时才跳转登录页
        // 如果是双token模式且refreshToken有效，让请求继续发出，由http.ts的401处理逻辑统一处理
        const isDoubleToken = import.meta.env.VITE_AUTH_MODE === 'double'
        const hasRefreshToken = tokenStore.tokenInfo?.refreshToken && !tokenStore.isRefreshTokenExpired

        if (isDoubleToken && hasRefreshToken) {
          console.log('[拦截器] refreshToken仍有效，让请求继续发出，由401处理逻辑刷新token')
          // 使用过期的accessToken继续请求，让http.ts的401处理逻辑来刷新
          if (tokenStore.tokenInfo?.accessToken) {
            options.header.Authorization = `Bearer ${tokenStore.tokenInfo.accessToken}`
          }
        }
        else {
          // refreshToken也过期了，或者不是双token模式，必须重新登录
          console.log('[拦截器] 无法恢复登录状态，跳转登录页')
          isRedirecting = false // 重置跳转锁
          redirectToLogin()
          return false // uni 拦截器返回 false 会取消当前请求
        }
      }
    }

    return options
  },
}

export const requestInterceptor = {
  install() {
    // 拦截 request 请求
    uni.addInterceptor('request', httpInterceptor)
    // 拦截 uploadFile 文件上传（如需排除文件上传接口，可在 isNoTokenRequest 中添加路径）
    uni.addInterceptor('uploadFile', httpInterceptor)
  },
}
