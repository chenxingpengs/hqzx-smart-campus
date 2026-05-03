import type { BridgeMessage, BridgeRequestMessage, BridgeResponseMessage } from './types'
import { httpGet } from '@/http/http'
import { useTokenStore } from '@/store/token'
import { getEnvBaseUrl } from '@/utils'
import { webviewCacheManager } from './cache-manager'

interface ProxyResponse {
  code: number
  data: unknown
  message?: string
  msg?: string
}

let webViewContext: UniApp.WebViewContext | null = null
const pendingRequests = new Map<string, { resolve: (data: unknown) => void, reject: (err: Error) => void }>()

export function setWebViewContext(ctx: UniApp.WebViewContext) {
  webViewContext = ctx
}

export function handleBridgeMessage(msg: BridgeMessage): void {
  switch (msg.type) {
    case 'navigate': {
      const url = msg.payload.url
      if (url) {
        uni.navigateTo({ url })
      }
      break
    }
    case 'close':
      uni.navigateBack()
      break
    case 'toast':
      uni.showToast({ title: msg.payload.text || '', icon: 'none' })
      break
    case 'refresh_token': {
      const tokenStore = useTokenStore()
      tokenStore.refreshToken?.()
      break
    }
    case 'share': {
      if (msg.payload.title && msg.payload.path) {
        uni.shareAppMessage?.({
          title: msg.payload.title,
          path: msg.payload.path,
        })
      }
      break
    }
    case 'set_tabbar_badge':
      console.log('[Bridge] set_tabbar_badge:', msg.payload)
      break
    case 'set_nav_bar': {
      if (msg.payload.title) {
        uni.setNavigationBarTitle({ title: msg.payload.title })
      }
      if (msg.payload.color) {
        uni.setNavigationBarColor({
          frontColor: msg.payload.frontColor || '#000000',
          backgroundColor: msg.payload.color,
        })
      }
      break
    }
    case 'get_user_info': {
      const userStore = useTokenStore()
      const userInfo = userStore.tokenInfo || {}
      sendResponse('get_user_info', { data: userInfo })
      break
    }
    case 'request':
      handleProxyRequest(msg as BridgeRequestMessage)
      break
    case 'show_loading':
      if (msg.payload.show !== false) {
        uni.showLoading({ title: msg.payload.text || '加载中...', mask: true })
      }
      else {
        uni.hideLoading()
      }
      break
    case 'pick_image': {
      uni.chooseImage({
        count: msg.payload.count || 1,
        sizeType: msg.payload.sizeType || ['compressed'],
        sourceType: msg.payload.sourceType || ['album', 'camera'],
        success(res) {
          sendResponse('pick_image', { data: res.tempFilePaths })
        },
        fail() {
          sendResponse('pick_image', { error: '用户取消选择' })
        },
      })
      break
    }
    case 'preview_image': {
      if (msg.payload.urls) {
        uni.previewImage({
          urls: msg.payload.urls,
          current: msg.payload.current || msg.payload.urls[0],
        })
      }
      break
    }
    case 'vibrate':
      uni.vibrateShort?.({ type: msg.payload.type || 'light' })
      break
    case 'login': {
      uni.navigateTo({ url: '/pages-fg/login/login' })
      break
    }
    case 'cache_clear': {
      const pluginId = msg.payload.pluginId
      if (pluginId) {
        webviewCacheManager.invalidate(pluginId)
      }
      sendResponse('cache_clear', { data: { success: true } })
      break
    }
    default:
      console.warn('[Bridge] 未知消息类型:', msg.type)
  }
}

async function handleProxyRequest(msg: BridgeRequestMessage): Promise<void> {
  const { url, method, data, requestId } = msg.payload

  try {
    let response: ProxyResponse

    if (method === 'GET' || !method) {
      response = await httpGet<ProxyResponse>(url)
    }
    else {
      const tokenStore = useTokenStore()
      const token = tokenStore.tokenInfo?.token || tokenStore.token || ''
      const baseUrl = (await import('@/http/http')).baseUrl || ''

      const res = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
        uni.request({
          url: `${baseUrl}${url}`,
          method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
          data,
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          success: res => resolve(res),
          fail: err => reject(err),
        })
      })

      response = res.data as ProxyResponse
    }

    sendResponse('request', { requestId, data: response }, requestId)
  }
  catch (error) {
    const err = error as Error
    sendResponse('request', { requestId, error: err.message || '请求失败' }, requestId)
  }
}

function sendResponse(type: string, payload: Record<string, unknown>, requestId?: string): void {
  if (!webViewContext)
    return

  const responseMsg: BridgeResponseMessage = {
    type: 'response',
    payload: { ...payload, responseType: type, ...(requestId ? { requestId } : {}) },
  }

  try {
    webViewContext.postMessage({ data: responseMsg })
  }
  catch (e) {
    console.error('[Bridge] 发送响应失败:', e)
  }
}

export function buildWebviewInitParams(): Record<string, string> {
  const params: Record<string, string> = {}
  try {
    const tokenStore = useTokenStore()
    const token = tokenStore.tokenInfo?.token || tokenStore.token || ''
    if (token)
      params.token = token
  }
  catch {
    console.warn('[Bridge] 获取token失败')
  }

  try {
    const userInfo = useTokenStore().tokenInfo
    if (userInfo) {
      params.user_id = String(userInfo.userId || '')
      params.username = userInfo.username || ''
    }
  }
  catch {
  }

  params.platform = 'wechat'
  params.timestamp = String(Date.now())
  return params
}

const WEBVIEW_URL_MAPPINGS: Record<string, string> = {
  '/plugins/music/webview': 'https://music.hqzx.me',
}

export function buildWebviewUrl(relativeUrl: string): string {
  const params = buildWebviewInitParams()
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')

  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    const separator = relativeUrl.includes('?') ? '&' : '?'
    return `${relativeUrl}${separator}${queryString}`
  }

  const mappedUrl = WEBVIEW_URL_MAPPINGS[relativeUrl]
  if (mappedUrl) {
    const separator = mappedUrl.includes('?') ? '&' : '?'
    return `${mappedUrl}${separator}${queryString}`
  }

  let baseUrl = getEnvBaseUrl()

  if (baseUrl.endsWith('/app')) {
    baseUrl = baseUrl.slice(0, -4)
  }

  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    baseUrl = 'https://api.hqzx.me'
  }

  const fullUrl = relativeUrl.startsWith('/') ? `${baseUrl}${relativeUrl}` : `${baseUrl}/${relativeUrl}`
  const separator = fullUrl.includes('?') ? '&' : '?'
  return `${fullUrl}${separator}${queryString}`
}
