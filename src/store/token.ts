import type { ILoginForm } from '@/api/login'
import type * as API from '@/service/types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
// ===================== 4. API导入（保持原有，确保接口一致性） =====================
import {
  appBindUserUsingPost,
  appLoginUsingPost,
  appRefreshTokenUsingPost,
  appWxLoginUsingPost,
} from '@/service/login'

import { wsManager } from '@/utils/websocket'
import { useUnreadStore } from './unread'
import { useUserStore } from './user'

// ===================== 1. 常量配置（独立抽离，便于环境切换/配置修改） =====================
/** 双Token模式开关（后端明确返回accessToken/refreshToken时开启） */
export const CONST = {
  IS_DOUBLE_TOKEN: true,
  TOKEN_EXPIRE_WARNING_THRESHOLD: 300, // Token即将过期阈值（秒）
  APP_TOKEN_EXPIRE: 2592000, // APP Token有效期（30天，秒）
  LOGIN_PAGE_PATH: '/pages/login/index', // 登录页路径
  BIND_PAGE_PATH: '/pages/login/bind', // 绑定页路径
  HOME_PAGE_PATH: '/pages/index/index', // 首页路径
  CHANGE_PASSWORD_PATH: '/pages-me-sub/changePassword/index', // 修改密码页路径
  ACCESS_TOKEN_DEFAULT_EXPIRE: 3600, // accessToken默认有效期（秒）
  REFRESH_TOKEN_DEFAULT_EXPIRE: 604800, // refreshToken默认有效期（秒）
  REFRESH_REQUEST_TIMEOUT: 5000, // 刷新Token请求超时（毫秒）
  STORAGE_KEY: {
    ACCESS_TOKEN_EXPIRE: 'accessTokenExpireTime',
    REFRESH_TOKEN_EXPIRE: 'refreshTokenExpireTime',
    STORE_KEY: 'token-store',
  },
} as const

// ===================== 2. 类型定义（完善补充，消除隐式any） =====================
/** 微信登录接口返回数据类型 */
export interface WxLoginData {
  accessToken: string
  refreshToken?: string | null
  accessTokenExpire?: number
  refreshTokenExpire?: number
  is_bound?: boolean
  user_info?: { user_code?: string, username: string } | null
}

/** 账号绑定接口返回数据类型 */
export interface BindData {
  token: string
  refreshToken: string
  user_info: { user_code?: string, username: string }
  need_change_password?: boolean
}

/** Token刷新接口返回数据类型 */
export interface RefreshTokenData {
  accessToken: string
  refreshToken: string
  accessTokenExpire: number
}

/** APP登录接口返回数据类型 */
export interface AppLoginData {
  accessToken: string
  refreshToken: string
  accessTokenExpire: number
  refreshTokenExpire: number
  need_change_password?: boolean
  user_info: { userId?: number, username: string, user_code?: string, role?: string }
}

/** APP登录表单类型 */
export interface AppLoginForm {
  user_code: string
  password: string
}

/** Token状态核心接口 */
export interface TokenInfoState {
  accessToken: string
  refreshToken: string
  accessTokenExpire: number
  refreshTokenExpire: number
  is_bound: boolean
  user_info: { user_code?: string, username: string } | null
}

// ===================== 3. 工具函数（抽离独立，单一职责） =====================
/** 页面跳转工具（防重复跳转、统一页面路径处理） */
let isRedirecting = false
export function redirectToPage(url: string): void {
  if (isRedirecting)
    return
  isRedirecting = true

  // 获取当前页面路由（兼容uni-app页面栈）
  const pages = getCurrentPages()
  const currentRoute = pages[pages.length - 1]?.route || ''
  const targetRoute = url.replace(/^\//, '')

  // 已在目标页面，直接重置状态
  if (currentRoute === targetRoute) {
    isRedirecting = false
    return
  }

  // uni-app统一重定向（关闭所有页面，打开新页面）
  uni.reLaunch({
    url,
    complete: () => { isRedirecting = false },
  })
}

/** 类型守卫 - 校验微信登录返回数据 */
export function isWxLoginData(data: unknown): data is WxLoginData {
  return typeof data === 'object' && data !== null && 'accessToken' in data
}

/** 类型守卫 - 校验绑定返回数据 */
export function isBindData(data: unknown): data is BindData {
  return typeof data === 'object' && data !== null
    && 'token' in data && 'refreshToken' in data && 'user_info' in data
}

/** 类型守卫 - 校验刷新Token返回数据 */
export function isRefreshTokenData(data: unknown): data is RefreshTokenData {
  return typeof data === 'object' && data !== null
    && 'accessToken' in data && 'refreshToken' in data && 'accessTokenExpire' in data
}

/** 清理临时Token存储残留 */
export function clearTemporaryToken(): void {
  uni.removeStorageSync(CONST.STORAGE_KEY.ACCESS_TOKEN_EXPIRE)
  uni.removeStorageSync(CONST.STORAGE_KEY.REFRESH_TOKEN_EXPIRE)
  console.log('[Token工具] 临时Token存储残留已清理')
}

/** 微信原生方法封装 - 获取微信登录Code（完善错误处理） */
export async function getWxCode(): Promise<string> {
  const WX_LOGIN_TIMEOUT = 10000
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('获取微信Code超时，请检查网络连接'))
    }, WX_LOGIN_TIMEOUT)

    wx.login({
      success: (res) => {
        clearTimeout(timeoutId)
        if (res.code) {
          resolve(res.code)
        }
        else {
          const errMsg = `获取微信Code失败: ${res.errMsg || '未知错误'}`
          console.error('[微信登录]', errMsg)
          reject(new Error(errMsg))
        }
      },
      fail: (err) => {
        clearTimeout(timeoutId)
        const errMsg = `微信登录接口调用失败: ${err.errMsg || '系统错误'}`
        console.error('[微信登录]', errMsg)
        reject(new Error(errMsg))
      },
    })
  })
}

// 页面快捷跳转（基于通用跳转工具）
export const redirectToLogin = () => redirectToPage(CONST.LOGIN_PAGE_PATH)
export const redirectToBind = () => redirectToPage(CONST.BIND_PAGE_PATH)
export const redirectToHome = () => redirectToPage(CONST.HOME_PAGE_PATH)

// ===================== 5. Pinia Store 核心逻辑（解耦后更简洁，职责单一） =====================
export const useTokenStore = defineStore(
  'token',
  () => {
    // ===================== 状态初始化 =====================
    /** Token核心状态初始值 */
    const INIT_TOKEN_STATE: TokenInfoState = {
      accessToken: '',
      refreshToken: '',
      accessTokenExpire: 0,
      refreshTokenExpire: 0,
      is_bound: false,
      user_info: null,
    }

    /** Token核心状态 */
    const tokenInfo = ref<TokenInfoState>({ ...INIT_TOKEN_STATE })
    /** 绑定账号加载状态 */
    const isBinding = ref(false)
    /** 微信登录加载状态 */
    const wxLoginPending = ref(false)
    /** Token刷新中状态（防并发） */
    const isRefreshingToken = ref(false)
    /** Token即将过期警告状态 */
    const tokenExpireWarning = ref(false)
    /** 自动登录触发锁（新增：防止重复触发自动登录） */
    const hasAutoLoginTriggered = ref(false)

    // ===================== 基础方法 =====================
    /**
     * 重置所有Token相关状态（含存储清理）
     * @description 退出登录/Token过期时统一调用，保证状态干净
     */
    const resetAllToken = (): void => {
      tokenInfo.value = { ...INIT_TOKEN_STATE }
      tokenExpireWarning.value = false
      isRefreshingToken.value = false
      isBinding.value = false
      wxLoginPending.value = false
      hasAutoLoginTriggered.value = false // 新增：重置自动登录锁
      clearTemporaryToken()
      console.log('[Token状态] 所有Token相关状态已重置')
    }

    /**
     * 存储Token过期时间到本地
     * @param accessExpireMs accessToken过期时间（毫秒）
     * @param refreshExpireMs refreshToken过期时间（毫秒，可选）
     */
    const setTokenExpireStorage = (accessExpireMs: number, refreshExpireMs?: number): void => {
      const now = Date.now()
      uni.setStorageSync(CONST.STORAGE_KEY.ACCESS_TOKEN_EXPIRE, now + accessExpireMs)
      if (refreshExpireMs) {
        uni.setStorageSync(CONST.STORAGE_KEY.REFRESH_TOKEN_EXPIRE, now + refreshExpireMs)
      }
    }

    // ===================== Token设置方法（拆分大函数，单一职责） =====================
    /**
     * 设置微信登录返回的Token信息
     * @param data 微信登录接口返回数据
     * @description 区分已绑定/未绑定用户，分别处理Token存储逻辑
     */
    const setWxLoginToken = (data: WxLoginData): void => {
      const now = Date.now()
      const isBound = data.is_bound || false
      // 兼容后端未返回过期时间，使用默认值
      const accessExpire = data.accessTokenExpire || CONST.ACCESS_TOKEN_DEFAULT_EXPIRE
      const refreshExpire = isBound ? (data.refreshTokenExpire || CONST.REFRESH_TOKEN_DEFAULT_EXPIRE) : 0
      // 转换为毫秒级
      const accessExpireMs = accessExpire * 1000
      const refreshExpireMs = isBound ? refreshExpire * 1000 : 0

      // 已绑定用户强制校验refreshToken（后端必返，此处兜底提示）
      if (isBound && !data.refreshToken) {
        console.warn('[Token警告] 已绑定用户未返回refreshToken，后端接口异常！')
        data.refreshToken = `TEMP_REFRESH_${now}`
      }

      // 构造新的Token状态（无旧值残留）
      const newTokenInfo: TokenInfoState = {
        accessToken: data.accessToken,
        refreshToken: isBound ? (data.refreshToken || '') : '',
        accessTokenExpire: accessExpire,
        refreshTokenExpire: refreshExpire,
        is_bound: isBound,
        user_info: data.user_info || null,
      }

      // 打印状态变更日志（便于调试）
      console.log('[Token更新] 微信登录Token替换', {
        before: { ...tokenInfo.value },
        after: newTokenInfo,
      })

      // 更新状态+存储过期时间
      tokenInfo.value = newTokenInfo
      clearTemporaryToken()
      setTokenExpireStorage(accessExpireMs, refreshExpireMs)

      // 打印存储日志
      isBound
        ? console.log('[Token存储] 已绑定用户Token完成', {
            accessExpire: new Date(now + accessExpireMs).toLocaleString(),
            refreshTokenExpire: new Date(now + refreshExpireMs).toLocaleString(),
          })
        : console.log('[Token存储] 未绑定用户临时Token完成', {
            accessExpire: new Date(now + accessExpireMs).toLocaleString(),
          })
    }

    /**
     * 设置账号绑定成功后的Token信息
     * @param data 绑定接口返回数据
     */
    const setBindSuccessToken = (data: BindData): void => {
      if (!data.token || !data.refreshToken) {
        console.error('[Token错误] 绑定返回数据缺少必要字段:', {
          hasToken: !!data.token,
          hasRefreshToken: !!data.refreshToken,
        })
        throw new Error('绑定返回数据缺少token或refreshToken')
      }

      const accessExpireMs = CONST.ACCESS_TOKEN_DEFAULT_EXPIRE * 1000
      const refreshExpireMs = CONST.REFRESH_TOKEN_DEFAULT_EXPIRE * 1000
      const now = Date.now()

      const newTokenInfo: TokenInfoState = {
        accessToken: data.token,
        refreshToken: data.refreshToken,
        accessTokenExpire: CONST.ACCESS_TOKEN_DEFAULT_EXPIRE,
        refreshTokenExpire: CONST.REFRESH_TOKEN_DEFAULT_EXPIRE,
        is_bound: true,
        user_info: data.user_info || null,
      }

      console.log('[Token更新] 绑定成功Token替换', {
        before: { ...tokenInfo.value },
        after: newTokenInfo,
      })

      tokenInfo.value = newTokenInfo
      clearTemporaryToken()
      setTokenExpireStorage(accessExpireMs, refreshExpireMs)

      console.log('[Token存储] 绑定成功Token已存储', {
        accessExpire: new Date(now + accessExpireMs).toLocaleString(),
        refreshTokenExpire: new Date(now + refreshExpireMs).toLocaleString(),
      })
    }

    /**
     * 设置Token刷新后的新Token信息
     * @param data 刷新接口返回数据
     */
    const setRefreshedToken = (data: RefreshTokenData): void => {
      const accessExpireMs = data.accessTokenExpire * 1000

      const newTokenInfo: TokenInfoState = {
        ...tokenInfo.value,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpire: data.accessTokenExpire,
      }

      console.log('[Token更新] 刷新成功Token替换', newTokenInfo)
      tokenInfo.value = newTokenInfo
      setTokenExpireStorage(accessExpireMs)
    }

    // ===================== 计算属性（Token状态判断，纯函数无副作用） =====================
    /** 判断accessToken是否已过期 */
    const isAccessTokenExpired = computed((): boolean => {
      if (!tokenInfo.value.accessToken)
        return true
      const expireTime = Number(uni.getStorageSync(CONST.STORAGE_KEY.ACCESS_TOKEN_EXPIRE)) || 0
      // 已绑定用户允许10秒误差，未绑定用户严格校验
      return tokenInfo.value.is_bound
        ? Date.now() >= expireTime - 10000
        : Date.now() >= expireTime
    })

    /** 判断refreshToken是否已过期（仅双Token+已绑定用户有效） */
    const isRefreshTokenExpired = computed((): boolean => {
      if (!CONST.IS_DOUBLE_TOKEN || !tokenInfo.value.is_bound) {
        return true
      }
      if (!tokenInfo.value.refreshToken || tokenInfo.value.refreshToken.trim() === '') {
        return true
      }
      const expireTime = Number(uni.getStorageSync(CONST.STORAGE_KEY.REFRESH_TOKEN_EXPIRE)) || 0
      return Date.now() >= expireTime - 10000
    })

    /** Token剩余有效时间（秒） */
    const tokenRemainingTime = computed((): number => {
      if (!tokenInfo.value.accessToken)
        return 0
      const expireTime = Number(uni.getStorageSync(CONST.STORAGE_KEY.ACCESS_TOKEN_EXPIRE)) || 0
      const remainingMs = expireTime - Date.now()
      return Math.max(0, Math.floor(remainingMs / 1000))
    })

    /** 是否为有效登录状态（已绑定+双Token均有效） */
    const hasValidLogin = computed((): boolean => {
      return tokenInfo.value.is_bound
        && !!tokenInfo.value.accessToken
        && !!tokenInfo.value.refreshToken
        && !isAccessTokenExpired.value
        && !isRefreshTokenExpired.value
    })

    /** 是否为已授权未绑定状态（临时Token有效） */
    const hasValidUnboundAccessToken = computed((): boolean => {
      return !tokenInfo.value.is_bound && !!tokenInfo.value.accessToken && !isAccessTokenExpired.value
    })

    /** 是否需要重新进行微信授权（无有效Token） */
    const needWxAuth = computed((): boolean => {
      return !hasValidLogin.value && !hasValidUnboundAccessToken.value
    })

    // ===================== Token核心业务方法 =====================
    /**
     * 刷新Token并获取新的accessToken
     * @returns 新的accessToken
     * @description 含并发控制、超时保护、异常处理
     */
    const refreshAndGetToken = async (): Promise<string> => {
      // 并发刷新拦截：已有刷新请求中，等待完成后返回结果
      if (isRefreshingToken.value) {
        return new Promise((resolve, reject) => {
          const checkInterval = setInterval(() => {
            if (!isRefreshingToken.value) {
              clearInterval(checkInterval)
              hasValidLogin.value
                ? resolve(tokenInfo.value.accessToken)
                : reject(new Error('Token刷新后仍无效，请重新登录'))
            }
          }, 100)
        })
      }

      try {
        isRefreshingToken.value = true
        console.log('[Token刷新] 开始刷新Token')

        // 前置校验：refreshToken已过期直接抛出异常
        if (isRefreshTokenExpired.value) {
          throw new Error('refreshToken已过期，无法刷新')
        }

        // 调用刷新接口（带超时保护）
        const refreshRes = await Promise.race([
          appRefreshTokenUsingPost({
            body: { refreshToken: tokenInfo.value.refreshToken } as API.RefreshTokenRequest,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('刷新请求超时')), CONST.REFRESH_REQUEST_TIMEOUT),
          ),
        ])

        // 数据格式校验
        if (!isRefreshTokenData(refreshRes)) {
          throw new Error(`刷新返回格式错误，期望RefreshTokenData，实际: ${JSON.stringify(refreshRes)}`)
        }

        // 更新Token并返回新的accessToken
        setRefreshedToken(refreshRes)
        console.log('[Token刷新] 刷新成功')
        return refreshRes.accessToken
      }
      catch (error) {
        const errMsg = (error as Error).message || 'Token刷新失败'
        console.error('[Token刷新] 失败:', errMsg)
        // 仅refreshToken过期时重置状态，其他错误保留状态便于排查
        if (errMsg.includes('refreshToken已过期')) {
          resetAllToken()
        }
        throw new Error(`Token刷新失败：${errMsg}`)
      }
      finally {
        isRefreshingToken.value = false
      }
    }

    /**
     * 获取有效accessToken（核心方法，拦截器/业务层统一调用）
     * @returns 有效accessToken
     * @description 仅检查Token是否有效，不主动刷新。刷新由http.ts在401时处理
     */
    const getValidToken = async (): Promise<string> => {
      // 无Token直接抛出异常（由调用方处理跳转）
      if (!tokenInfo.value.accessToken) {
        throw new Error('未获取到微信授权/登录状态，请先授权')
      }

      // Token已过期：分用户类型处理
      if (isAccessTokenExpired.value) {
        // 未绑定用户：临时Token过期，需重新授权
        if (!tokenInfo.value.is_bound) {
          throw new Error('微信授权已过期，请重新授权')
        }
        // 已绑定用户：执行刷新逻辑
        return await refreshAndGetToken()
      }

      // 返回有效Token（不主动刷新，由http.ts在401时处理）
      return tokenInfo.value.accessToken
    }

    // ===================== 业务操作方法（微信登录/绑定/退出/刷新） =====================
    /**
     * 微信登录主流程
     * @returns 微信登录接口返回数据
     * @description 完整的微信授权->接口调用->Token存储->页面跳转流程
     */
    const wxLogin = async (): Promise<WxLoginData> => {
      if (wxLoginPending.value)
        return Promise.reject(new Error('微信登录请求中，请稍候'))
      wxLoginPending.value = true

      try {
        console.log('[微信登录] 开始授权流程')
        // 1. 获取微信code
        const code = await getWxCode()
        console.log('[微信登录] 获取Code成功:', code)

        // 2. 调用后端微信登录接口
        const apiRes = await appWxLoginUsingPost({
          body: { code } as API.LoginRequest,
        })

        // 3. 数据格式校验
        if (!isWxLoginData(apiRes)) {
          throw new Error(`微信登录接口返回格式错误: ${JSON.stringify(apiRes)}`)
        }

        // 4. 已绑定用户校验refreshToken
        if (apiRes.is_bound && !apiRes.refreshToken) {
          throw new Error('已绑定用户登录接口未返回refreshToken，后端配置异常')
        }

        // 5. 存储Token信息（强制更新，覆盖旧的持久化状态）
        setWxLoginToken(apiRes)

        // 6. 根据绑定状态跳转页面
        if (apiRes.is_bound) {
          // 已绑定用户：确保状态正确更新后再跳转
          console.log('[微信登录] 已绑定用户，准备跳转首页', {
            is_bound: tokenInfo.value.is_bound,
            hasAccessToken: !!tokenInfo.value.accessToken,
            hasRefreshToken: !!tokenInfo.value.refreshToken,
          })

          // 强制等待状态更新完成
          await new Promise(resolve => setTimeout(resolve, 100))

          if (hasValidLogin.value) {
            const userStore = useUserStore()
            await userStore.fetchUserInfo()
            redirectToHome()
          }
          else {
            console.error('[微信登录] 状态验证失败', {
              is_bound: tokenInfo.value.is_bound,
              accessToken: !!tokenInfo.value.accessToken,
              refreshToken: !!tokenInfo.value.refreshToken,
              isAccessTokenExpired: isAccessTokenExpired.value,
              isRefreshTokenExpired: isRefreshTokenExpired.value,
            })
            throw new Error('已绑定用户Token存储失败，请重试')
          }
        }
        else {
          redirectToBind()
        }

        return apiRes
      }
      catch (error) {
        const errMsg = (error as Error).message || '微信授权失败'
        console.error('[微信登录] 流程失败:', errMsg)
        resetAllToken()
        throw error
      }
      finally {
        wxLoginPending.value = false
        console.log('[微信登录] 流程结束，加载状态重置')
      }
    }

    /**
     * 退出登录主流程
     * @description 重置Token状态+清理用户信息+跳转登录页，可选调用后端退出接口
     */
    const logout = async (): Promise<void> => {
      try {
        // 可选：调用后端退出登录接口（根据项目需求开启）
        // await logoutUsingPost({ body: { refreshToken: tokenInfo.value.refreshToken } })
        console.log('[退出登录] 已调用后端退出接口（若开启）')
      }
      catch (error) {
        console.error('[退出登录] 后端接口调用失败，强制本地退出:', error)
      }
      finally {
        // 本地状态清理（核心：无论后端是否成功，都重置本地状态）
        resetAllToken()
        const userStore = useUserStore()
        userStore.clearUserInfo()
        redirectToLogin()
      }
    }

    /**
     * 处理登录过期逻辑（统一封装，便于修改）
     */
    const handleLoginExpired = async (): Promise<void> => {
      try {
        await logout()
      }
      catch (err) {
        console.error('[Token过期] 退出登录失败:', err)
      }
    }

    // ===================== 新增：优先刷新Token方法 =====================
    /**
     * 优先尝试使用refreshToken刷新accessToken
     * @returns 是否刷新成功
     * @description 核心优化：减少微信登录请求，优先使用refreshToken刷新
     */
    const tryRefreshTokenFirst = async (): Promise<boolean> => {
      // 1. 检查是否有refreshToken
      if (!tokenInfo.value.refreshToken || tokenInfo.value.refreshToken.trim() === '') {
        console.log('[Token刷新优先] 无refreshToken，需要重新登录')
        return false
      }

      // 2. 检查refreshToken是否过期
      if (isRefreshTokenExpired.value) {
        console.log('[Token刷新优先] refreshToken已过期，需要重新登录')
        return false
      }

      // 3. 尝试刷新Token
      try {
        console.log('[Token刷新优先] 开始使用refreshToken刷新...')
        await refreshAndGetToken()
        console.log('[Token刷新优先] 刷新成功，无需微信登录')
        return true
      }
      catch (error) {
        const errMsg = (error as Error).message || 'Token刷新失败'
        console.log('[Token刷新优先] 刷新失败:', errMsg)
        return false
      }
    }

    // ===================== 新增：自动触发微信登录方法 =====================
    /**
     * 自动触发微信登录（仅执行一次）
     * @description 无有效登录/授权状态时，自动触发一次微信登录，避免重复调用
     * @optimized 优先使用refreshToken刷新，减少微信登录请求
     * @optimized 每次启动都获取用户信息，确保用户状态最新
     */
    const triggerAutoWxLogin = async (): Promise<void> => {
      // 如果已经触发过自动登录，直接返回
      if (hasAutoLoginTriggered.value || wxLoginPending.value) {
        console.log('[自动登录] 无需触发：', {
          hasAutoLoginTriggered: hasAutoLoginTriggered.value,
          wxLoginPending: wxLoginPending.value,
        })
        return
      }

      hasAutoLoginTriggered.value = true
      console.log('[自动登录] 开始检查登录状态...')

      // #ifdef MP-WEIXIN
      // 微信小程序：检查是否有有效登录状态
      if (hasValidLogin.value) {
        // 已有有效登录状态，获取用户信息确保状态最新
        console.log('[自动登录] 已有有效登录状态，获取用户信息...')
        const userStore = useUserStore()
        try {
          await userStore.fetchUserInfo()
          console.log('[自动登录] 用户信息获取成功')
          redirectToHome()
        }
        catch (e) {
          console.error('[自动登录] 获取用户信息失败:', e)
          // 获取用户信息失败，可能是Token已失效，尝试刷新
          if (tokenInfo.value.refreshToken) {
            const refreshed = await tryRefreshTokenFirst()
            if (refreshed) {
              try {
                await userStore.fetchUserInfo()
                redirectToHome()
              }
              catch (e2) {
                console.error('[自动登录] 刷新后获取用户信息仍失败:', e2)
              }
              return
            }
          }
          // 刷新失败，重置状态
          resetAllToken()
          hasAutoLoginTriggered.value = false
        }
        return
      }

      // 没有有效登录状态，尝试使用refreshToken刷新
      if (tokenInfo.value.is_bound && tokenInfo.value.refreshToken) {
        const refreshed = await tryRefreshTokenFirst()
        if (refreshed) {
          console.log('[自动登录] 使用refreshToken刷新成功，跳过微信登录')
          // 刷新成功后获取用户信息
          const userStore = useUserStore()
          try {
            await userStore.fetchUserInfo()
            console.log('[自动登录] 用户信息获取成功')
            redirectToHome()
          }
          catch (e) {
            console.error('[自动登录] 获取用户信息失败:', e)
          }
          return
        }
      }

      // refreshToken无效或刷新失败，走微信登录流程
      console.log('[自动登录] refreshToken无效，开始微信登录流程')
      try {
        await wxLogin()
      }
      catch (error) {
        const errMsg = (error as Error).message || '自动登录失败'
        console.error('[自动登录] 失败:', errMsg)
        hasAutoLoginTriggered.value = false
        throw error
      }
      // #endif

      // #ifdef APP-PLUS
      // APP端：检查本地Token有效性
      if (hasValidLogin.value) {
        // 已有有效登录状态，获取用户信息确保状态最新
        console.log('[自动登录] APP端已有有效登录状态，获取用户信息...')
        const userStore = useUserStore()
        try {
          await userStore.fetchUserInfo()
          console.log('[自动登录] 用户信息获取成功')
          redirectToHome()
        }
        catch (e) {
          console.error('[自动登录] 获取用户信息失败:', e)
          // 获取用户信息失败，可能是Token已失效
          if (tokenInfo.value.refreshToken) {
            const refreshed = await tryRefreshTokenFirst()
            if (refreshed) {
              try {
                await userStore.fetchUserInfo()
                redirectToHome()
              }
              catch (e2) {
                console.error('[自动登录] 刷新后获取用户信息仍失败:', e2)
                resetAllToken()
                hasAutoLoginTriggered.value = false
              }
              return
            }
          }
          resetAllToken()
          hasAutoLoginTriggered.value = false
        }
      }
      else {
        console.log('[自动登录] APP端无有效Token，等待用户手动登录')
        hasAutoLoginTriggered.value = false
      }
      // #endif
    }

    // ===================== 监听Token状态（优化监听逻辑，减少不必要执行） =====================
    /**
     * 监听Token剩余时间，处理过期/即将过期逻辑
     * @description 立即执行+前置刷新，保证初始化时就校验状态
     */
    const watchTokenStatus = (): void => {
      watch(
        tokenRemainingTime,
        (newRemaining) => {
          // 1. 即将过期处理：仅已绑定用户+有剩余时间+达到阈值（仅更新状态，无弹窗）
          if (tokenInfo.value.is_bound && newRemaining > 0 && newRemaining <= CONST.TOKEN_EXPIRE_WARNING_THRESHOLD) {
            tokenExpireWarning.value = true
          }
          else {
            tokenExpireWarning.value = false
          }

          // 2. Token已过期处理：有Token但剩余时间为0
          if (newRemaining === 0 && tokenInfo.value.accessToken) {
            if (tokenInfo.value.is_bound) {
              // 已绑定用户：refreshToken有效则自动刷新，无效则退出登录
              isRefreshTokenExpired.value
                ? handleLoginExpired()
                : refreshAndGetToken().catch((err) => {
                    console.error('[Token过期] 自动刷新失败，强制退出:', err)
                    handleLoginExpired()
                  })
            }
            else {
              // 未绑定用户：临时Token过期，重置状态并跳转授权页
              resetAllToken()
              redirectToLogin()
            }
          }
        },
        { immediate: true, flush: 'pre' },
      )

      // 监听登录状态，已登录时连接 WebSocket 和初始化聊天数据
      // 注意：用户信息获取已移至 triggerAutoWxLogin，确保每次启动都获取
      watch(
        hasValidLogin,
        async (isValid) => {
          console.log('[Token监听] hasValidLogin 变化:', isValid)

          if (isValid) {
            console.log('[Token监听] 检测到有效登录状态，准备连接 WebSocket')

            try {
              console.log('[Token监听] 检测到有效登录状态，准备连接 WebSocket')
              wsManager.connect(tokenInfo.value.accessToken)
              console.log('[WebSocket] 登录成功，已触发自动连接')
            }
            catch (e) {
              console.error('[WebSocket] 自动连接失败:', e)
            }

            try {
              console.log('[Token监听] 开始初始化聊天数据')
              const unreadStore = useUnreadStore()
              await unreadStore.init()
              console.log('[Token监听] 聊天数据初始化完成')
            }
            catch (e) {
              console.error('[Token监听] 聊天数据初始化失败:', e)
            }
          }
          else {
            console.log('[Token监听] 检测到登出状态，准备断开 WebSocket')

            try {
              wsManager.disconnect()
              console.log('[WebSocket] 已断开连接')
            }
            catch (e) {
              console.error('[WebSocket] 断开连接失败:', e)
            }

            try {
              const unreadStore = useUnreadStore()
              unreadStore.reset()
              console.log('[Token监听] 未读数据已重置')
            }
            catch (e) {
              console.error('[Token监听] 未读数据重置失败:', e)
            }
          }
        },
        { immediate: true },
      )
    }

    /**
     * 账号绑定主流程
     * @param bindForm 绑定表单数据
     * @returns 绑定接口返回数据
     */
    const bindUser = async (bindForm: API.BindRequest): Promise<BindData> => {
      if (!hasValidUnboundAccessToken.value) {
        resetAllToken()
        redirectToLogin()
        throw new Error('无有效微信授权状态，无法绑定')
      }

      if (isBinding.value)
        return Promise.reject(new Error('绑定请求中，请稍候'))
      isBinding.value = true

      try {
        console.log('[账号绑定] 开始绑定流程，携带Token:', tokenInfo.value.accessToken)
        const bindRes = await appBindUserUsingPost({ body: bindForm })

        if (!isBindData(bindRes)) {
          console.error('[账号绑定] 返回数据格式错误:', JSON.stringify(bindRes))
          throw new Error(`绑定接口返回格式错误: ${JSON.stringify(bindRes)}`)
        }

        console.log('[账号绑定] 绑定成功，准备更新状态:', {
          hasToken: !!bindRes.token,
          hasRefreshToken: !!bindRes.refreshToken,
          userInfo: bindRes.user_info,
          needChangePassword: bindRes.need_change_password,
        })

        setBindSuccessToken(bindRes)

        console.log('[账号绑定] 状态已更新，等待持久化完成...')
        await new Promise(resolve => setTimeout(resolve, 300))

        console.log('[账号绑定] 验证状态:', {
          is_bound: tokenInfo.value.is_bound,
          hasAccessToken: !!tokenInfo.value.accessToken,
          hasRefreshToken: !!tokenInfo.value.refreshToken,
          hasValidLogin: hasValidLogin.value,
        })

        if (!hasValidLogin.value) {
          console.error('[账号绑定] 状态验证失败，但绑定已成功')
          throw new Error('绑定成功但登录状态异常，请重试')
        }

        if (bindRes.need_change_password) {
          console.log('[账号绑定] 检测到需要修改密码，将跳转到修改密码页面')
        }

        console.log('[账号绑定] 准备延迟跳转，当前 isBinding:', isBinding.value)

        await new Promise(resolve => setTimeout(resolve, 200))

        console.log('[账号绑定] 延迟完成，准备跳转')
        console.log('[账号绑定] 当前 hasValidLogin:', hasValidLogin.value)
        console.log('[账号_binding] 当前 isRedirecting:', isRedirecting)
        console.log('[账号绑定] 当前页面栈:', getCurrentPages().map(p => p.route))

        if (!hasValidLogin.value) {
          console.error('[账号绑定] 跳转前再次验证失败')
          throw new Error('跳转前登录状态失效')
        }

        const targetUrl = bindRes.need_change_password
          ? CONST.CHANGE_PASSWORD_PATH
          : CONST.HOME_PAGE_PATH

        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        const currentRoute = currentPage?.route || ''
        const targetRoute = targetUrl.replace(/^\//, '')

        console.log('[账号绑定] 当前页面:', currentRoute, '目标页面:', targetRoute, '(need_change_password:', bindRes.need_change_password, ')')

        if (currentRoute === targetRoute) {
          console.log('[账号绑定] 已在目标页面，清理多余页面...')
          const delta = pages.length - 1
          if (delta > 0) {
            uni.navigateBack({ delta })
          }
        }
        else {
          console.log('[账号绑定] 重置 isRedirecting 并强制跳转...')
          isRedirecting = false

          try {
            await new Promise<void>((resolve, reject) => {
              uni.reLaunch({
                url: targetUrl,
                success: () => {
                  console.log('[账号绑定] ✓ 跳转成功 ->', targetUrl)
                  resolve()
                },
                fail: (err) => {
                  console.error('[账号绑定] ✗ 跳转失败:', err)
                  reject(new Error(String(err)))
                },
              })
            })
          }
          catch (e) {
            console.error('[账号绑定] reLaunch 失败，尝试 redirectTo...')
            uni.redirectTo({
              url: targetUrl,
              fail: (err) => {
                console.error('[账号绑定] redirectTo 也失败:', err)
              },
            })
          }
        }

        return bindRes
      }
      catch (error) {
        const errMsg = (error as Error).message || '账号绑定失败'
        console.error('[账号绑定] 流程失败:', errMsg)
        throw new Error(errMsg)
      }
      finally {
        isBinding.value = false
      }
    }

    /**
     * 主动刷新Token（业务层手动调用，http.ts在401时调用）
     * @returns 刷新接口返回数据
     * @description 复用refreshAndGetToken的并发控制逻辑
     */
    const refreshToken = async (): Promise<RefreshTokenData> => {
      // 复用refreshAndGetToken的并发控制和刷新逻辑
      const newAccessToken = await refreshAndGetToken()
      return {
        accessToken: newAccessToken,
        refreshToken: tokenInfo.value.refreshToken || '',
        accessTokenExpire: tokenInfo.value.accessTokenExpire || 3600,
      }
    }

    /**
     * 普通登录（暂不支持，保留接口便于后续扩展）
     * @param loginForm 普通登录表单
     */
    const login = async (loginForm: ILoginForm): Promise<void> => {
      throw new Error('当前系统仅支持微信登录，暂不支持账号密码登录')
    }

    /**
     * APP/H5 账号密码登录
     * @param appLoginForm 登录表单
     * @returns 登录接口返回数据
     * @description APP端/H5端专用，账号密码登录，Token长期有效（30天）
     */
    const appLogin = async (appLoginForm: AppLoginForm): Promise<AppLoginData> => {
      // #ifdef APP-PLUS || H5
      if (!appLoginForm.user_code.trim()) {
        throw new Error('请输入用户账号')
      }
      if (!appLoginForm.password.trim()) {
        throw new Error('请输入密码')
      }

      try {
        console.log('[APP/H5登录] 开始登录流程')
        const loginRes = await appLoginUsingPost({
          body: {
            user_code: appLoginForm.user_code.trim(),
            password: appLoginForm.password,
            device_info: 'app',
          } as API.AppLoginRequest,
        })

        // 数据格式校验 (request 函数返回的是 AppLoginData，不是 AppLoginResponse)
        if (!loginRes || !loginRes.accessToken) {
          throw new Error('登录返回数据格式错误')
        }

        const data = loginRes

        // 更新Token状态
        const newTokenInfo: TokenInfoState = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpire: data.accessTokenExpire,
          refreshTokenExpire: data.refreshTokenExpire,
          is_bound: true,
          user_info: {
            user_code: data.user_info?.user_code,
            username: data.user_info?.username || '',
          },
        }

        tokenInfo.value = newTokenInfo
        const accessExpireMs = data.accessTokenExpire * 1000
        const refreshExpireMs = data.refreshTokenExpire * 1000
        setTokenExpireStorage(accessExpireMs, refreshExpireMs)

        console.log('[APP/H5登录] 登录成功')

        // 获取用户信息
        const userStore = useUserStore()
        await userStore.fetchUserInfo()

        // 跳转首页
        redirectToHome()

        return data
      }
      catch (error) {
        const errMsg = (error as Error).message || '登录失败'
        console.error('[APP/H5登录] 失败:', errMsg)
        throw new Error(errMsg)
      }
      // #endif

      // #ifndef APP-PLUS || H5
      throw new Error('账号密码登录仅在APP/H5端可用')
      // #endif
    }

    // ===================== 生命周期 =====================
    // 直接调用 watchTokenStatus，不使用 onMounted（Pinia store setup 中没有组件实例）
    watchTokenStatus()
    console.log('[Token Store] 开始监听Token状态')

    // ===================== 暴露状态和方法 =====================
    return {
      // 核心状态
      tokenInfo,
      // 加载/警告状态
      isBinding,
      wxLoginPending,
      isRefreshingToken,
      tokenExpireWarning,
      // 计算属性（状态判断）
      isAccessTokenExpired,
      isRefreshTokenExpired,
      tokenRemainingTime,
      hasValidLogin,
      hasValidUnboundAccessToken,
      needWxAuth,
      // 核心方法
      login,
      wxLogin,
      appLogin,
      bindUser,
      logout,
      refreshToken,
      getValidToken,
      resetAllToken,
      // 新增：暴露自动登录方法（便于页面手动触发）
      triggerAutoWxLogin,
      // 新增：暴露优先刷新Token方法
      tryRefreshTokenFirst,
    }
  },
  // ===================== Pinia持久化配置（统一常量，规范存储） =====================
  {
    persist: {
      key: CONST.STORAGE_KEY.STORE_KEY,
      storage: {
        getItem: key => uni.getStorageSync(key),
        setItem: (key, value) => uni.setStorageSync(key, value),
      },
      paths: ['tokenInfo'], // 仅持久化核心Token状态，临时状态不持久化
    },
  },
)
