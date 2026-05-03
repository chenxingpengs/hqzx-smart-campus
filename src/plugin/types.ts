import type { CustomTabBarItem } from '@/tabbar/types'

export interface WechatPluginConfig {
  plugin_id: string
  name: string
  icon: string
  description?: string
  entry_type: 'webview'
  tabbar_menu?: {
    enabled: boolean
    icon: string
    title: string
    order: number
    roles?: string[]
  }
  api_prefix: string
  webview_url: string
  frontend_entry: string
  roles?: string[]
  has_webview?: boolean
}

export interface PluginTabbarItem extends CustomTabBarItem {
  pluginId: string
  order: number
  webviewUrl: string
}

export interface MorePluginItem {
  pluginId: string
  name: string
  icon: string
  description: string
  webviewUrl: string
  order: number
  showInMore: boolean
}

export interface WebviewCacheEntry {
  pluginId: string
  url: string
  cachedAt: number
  version: string
  expiresAt: number
}

export interface CacheMeta {
  etag: string
  version: string
  cachedAt: number
  expiresAt: number
}

export interface BridgeMessage {
  type: 'navigate' | 'refresh_token' | 'close' | 'share' | 'toast' | 'set_tabbar_badge'
    | 'set_nav_bar' | 'get_user_info' | 'request' | 'show_loading' | 'pick_image'
    | 'preview_image' | 'vibrate' | 'login' | 'logout' | 'cache_clear'
  payload: Record<string, any>
}

export interface BridgeRequestMessage extends BridgeMessage {
  type: 'request'
  payload: {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: any
    requestId: string
  }
}

export interface BridgeResponseMessage {
  type: 'response'
  payload: {
    requestId: string
    data: any
    error?: string
  }
}
