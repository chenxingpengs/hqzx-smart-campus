import type { CacheMeta } from '@/plugin/types'

const CACHE_PREFIX = 'wv_cache_'
const META_PREFIX = 'wv_meta_'
const DEFAULT_TTL = 30 * 60 * 1000

class WebViewLocalCache {
  private static instance: WebViewLocalCache | null = null

  static getInstance(): WebViewLocalCache {
    if (!WebViewLocalCache.instance) {
      WebViewLocalCache.instance = new WebViewLocalCache()
    }
    return WebViewLocalCache.instance
  }

  async save(pluginId: string, html: string, meta: CacheMeta): Promise<void> {
    try {
      uni.setStorageSync(CACHE_PREFIX + pluginId, html)
      uni.setStorageSync(META_PREFIX + pluginId, JSON.stringify(meta))
    }
    catch (e) {
      console.error(`[WVCache] 保存插件 ${pluginId} 缓存失败:`, e)
    }
  }

  load(pluginId: string): { html: string, meta: CacheMeta } | null {
    try {
      const html = uni.getStorageSync(CACHE_PREFIX + pluginId)
      const metaStr = uni.getStorageSync(META_PREFIX + pluginId)

      if (html && metaStr) {
        const meta = JSON.parse(metaStr) as CacheMeta
        return { html, meta }
      }
      return null
    }
    catch (e) {
      console.error(`[WVCache] 读取插件 ${pluginId} 缓存失败:`, e)
      return null
    }
  }

  isExpired(pluginId: string, ttlMs: number = DEFAULT_TTL): boolean {
    try {
      const metaStr = uni.getStorageSync(META_PREFIX + pluginId)
      if (!metaStr)
        return true

      const meta = JSON.parse(metaStr) as CacheMeta
      return Date.now() > meta.expiresAt
    }
    catch {
      return true
    }
  }

  getCacheInfo(pluginId: string): CacheMeta | null {
    try {
      const metaStr = uni.getStorageSync(META_PREFIX + pluginId)
      if (!metaStr)
        return null

      return JSON.parse(metaStr) as CacheMeta
    }
    catch {
      return null
    }
  }

  invalidate(pluginId: string): void {
    try {
      uni.removeStorageSync(CACHE_PREFIX + pluginId)
      uni.removeStorageSync(META_PREFIX + pluginId)
    }
    catch (e) {
      console.error(`[WVCache] 清除插件 ${pluginId} 缓存失败:`, e)
    }
  }

  clearAll(): void {
    try {
      const res = uni.getStorageInfoSync()
      const keys = res.keys || []

      keys.forEach((key) => {
        if (key.startsWith(CACHE_PREFIX) || key.startsWith(META_PREFIX)) {
          uni.removeStorageSync(key)
        }
      })
    }
    catch (e) {
      console.error('[WVCache] 清除所有缓存失败:', e)
    }
  }

  getStats(): { total: number, plugins: Array<{ pluginId: string, cachedAt: number, size: number }> } {
    try {
      const res = uni.getStorageInfoSync()
      const keys = res.keys || []
      const pluginIds = new Set<string>()
      const stats: Array<{ pluginId: string, cachedAt: number, size: number }> = []

      keys.forEach((key) => {
        if (key.startsWith(META_PREFIX)) {
          const pluginId = key.replace(META_PREFIX, '')
          pluginIds.add(pluginId)
        }
      })

      pluginIds.forEach((pluginId) => {
        const meta = this.getCacheInfo(pluginId)
        if (meta) {
          const html = uni.getStorageSync(CACHE_PREFIX + pluginId) || ''
          stats.push({
            pluginId,
            cachedAt: meta.cachedAt,
            size: (html as string).length,
          })
        }
      })

      return { total: pluginIds.size, plugins: stats }
    }
    catch {
      return { total: 0, plugins: [] }
    }
  }
}

export const webViewLocalCache = WebViewLocalCache.getInstance()
