import type { MorePluginItem, PluginTabbarItem, WechatPluginConfig } from './types'
import { fetchWechatPluginConfigs } from '@/api/plugin'
import { useUserStore } from '@/store/user'

class WechatPluginEngine {
  private configs: WechatPluginConfig[] = []
  private loaded = false
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.loaded)
      return
    if (this.initPromise)
      return this.initPromise

    this.initPromise = this._doInit()
    return this.initPromise
  }

  private async _doInit(): Promise<void> {
    try {
      const configs = await fetchWechatPluginConfigs()
      this.configs = Array.isArray(configs) ? configs : []
      this.loaded = true
      console.log(`[PluginEngine] 插件引擎就绪，已加载 ${this.configs.length} 个插件`)
    }
    catch (error) {
      console.error('[PluginEngine] 插件配置加载失败:', error)
      this.configs = []
      this.loaded = true
    }
    finally {
      this.initPromise = null
    }
  }

  private getUserRole(): string {
    const userStore = useUserStore()
    return userStore.userInfo.value?.role || ''
  }

  private filterByRole(config: WechatPluginConfig): boolean {
    const userRole = this.getUserRole()
    if (!config.roles || config.roles.length === 0)
      return true
    return config.roles.includes(userRole)
  }

  getTabbarItems(): PluginTabbarItem[] {
    if (!this.loaded)
      return []

    return this.configs
      .filter(c => c.tabbar_menu?.enabled && this.filterByRole(c) && c.has_webview !== false && c.webview_url)
      .map(c => ({
        pluginId: c.plugin_id,
        text: c.tabbar_menu!.title,
        pagePath: `/pages-plugin-webview/index?plugin=${c.plugin_id}`,
        iconType: 'unocss' as const,
        icon: (c.icon || 'i-carbon-plugin').replace('&#x', '\\').replace(';', ''),
        order: c.tabbar_menu!.order,
        webviewUrl: c.webview_url,
      }))
      .sort((a, b) => a.order - b.order)
  }

  getMorePagePlugins(): MorePluginItem[] {
    if (!this.loaded)
      return []

    return this.configs
      .filter(c => c.entry_type === 'webview' && this.filterByRole(c) && c.has_webview !== false && c.webview_url)
      .map(c => ({
        pluginId: c.plugin_id,
        name: c.name,
        icon: c.icon || 'i-carbon-plugin',
        description: c.description || '',
        webviewUrl: c.webview_url,
        order: c.tabbar_menu?.order ?? 99,
        showInMore: c.tabbar_menu?.enabled ?? true,
      }))
      .filter(item => item.showInMore)
      .sort((a, b) => a.order - b.order)
  }

  getEnabledPluginCount(): number {
    return this.configs.filter(c =>
      c.entry_type === 'webview' && (c.tabbar_menu?.enabled ?? true) && this.filterByRole(c) && c.has_webview !== false && c.webview_url,
    ).length
  }

  getWebviewUrl(pluginId: string): string | null {
    const config = this.configs.find(c => c.plugin_id === pluginId)
    return config ? config.webview_url : null
  }

  getApiPrefix(pluginId: string): string {
    return this.configs.find(c => c.plugin_id === pluginId)?.api_prefix || ''
  }

  getPluginConfig(pluginId: string): WechatPluginConfig | undefined {
    return this.configs.find(c => c.plugin_id === pluginId)
  }

  getAllConfigs(): WechatPluginConfig[] {
    return [...this.configs]
  }

  isLoaded(): boolean {
    return this.loaded
  }

  async refresh(): Promise<void> {
    this.loaded = false
    this.configs = []
    await this.init()
  }
}

export const wechatPluginEngine = new WechatPluginEngine()
