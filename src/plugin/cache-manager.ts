import type { CacheMeta, WebviewCacheEntry } from './types'
import { webViewLocalCache } from '@/utils/webview-cache'

const DEFAULT_CACHE_TTL = 30 * 60 * 1000

class WebviewCacheManager {
  private cacheMap: Map<string, WebviewCacheEntry> = new Map()

  shouldReload(pluginId: string, serverVersion: string): boolean {
    const cached = this.cacheMap.get(pluginId)
    if (!cached)
      return true
    if (Date.now() > cached.expiresAt)
      return true
    if (cached.version !== serverVersion)
      return true

    const localExpired = webViewLocalCache.isExpired(pluginId)
    if (localExpired)
      return true

    return false
  }

  setCache(pluginId: string, url: string, version: string, ttlMs = DEFAULT_CACHE_TTL): void {
    this.cacheMap.set(pluginId, {
      pluginId,
      url,
      version,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    })
  }

  getCache(pluginId: string): WebviewCacheEntry | undefined {
    return this.cacheMap.get(pluginId)
  }

  async saveHtmlToStorage(pluginId: string, html: string, etag: string, version: string, ttlMs = DEFAULT_CACHE_TTL): Promise<void> {
    const meta: CacheMeta = {
      etag,
      version,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    }
    await webViewLocalCache.save(pluginId, html, meta)
    this.setCache(pluginId, '', version, ttlMs)
  }

  getHtmlFromStorage(pluginId: string): { html: string, meta: CacheMeta } | null {
    return webViewLocalCache.load(pluginId)
  }

  hasLocalCache(pluginId: string): boolean {
    return webViewLocalCache.getCacheInfo(pluginId) !== null
  }

  invalidate(pluginId: string): void {
    this.cacheMap.delete(pluginId)
    webViewLocalCache.invalidate(pluginId)
  }

  clearAll(): void {
    this.cacheMap.clear()
    webViewLocalCache.clearAll()
  }

  getCacheStats(): { total: number, entries: Array<{ pluginId: string, cachedAt: number, expiresAt: number }> } {
    return {
      total: this.cacheMap.size,
      entries: [...this.cacheMap.values()].map(e => ({
        pluginId: e.pluginId,
        cachedAt: e.cachedAt,
        expiresAt: e.expiresAt,
      })),
    }
  }
}

export const webviewCacheManager = new WebviewCacheManager()
