const CACHE_PREFIX = 'banner_cache_'
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000
const BANNER_DIR = 'banner_cache'

interface BannerCacheInfo {
  localPath: string
  originalUrl: string
  cacheTime: number
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function getCacheKey(url: string): string {
  return `${CACHE_PREFIX}${simpleHash(url)}`
}

function getUserDataPath(): string {
  // #ifdef MP-WEIXIN
  return wx.env.USER_DATA_PATH
  // #endif
  // #ifdef MP-ALIPAY
  return my.env.USER_DATA_PATH
  // #endif
  // #ifdef H5
  return ''
  // #endif
  return ''
}

async function ensureCacheDir(): Promise<string> {
  // #ifdef H5
  return ''
  // #endif

  const basePath = getUserDataPath()

  if (!basePath) {
    return ''
  }

  const dirPath = `${basePath}/${BANNER_DIR}`

  try {
    const fs = uni.getFileSystemManager()
    fs.accessSync(dirPath)
  }
  catch (e) {
    try {
      const fs = uni.getFileSystemManager()
      fs.mkdirSync(dirPath, true)
    }
    catch (mkdirErr) {
      console.error('创建轮播图缓存目录失败:', mkdirErr)
    }
  }

  return dirPath
}

export async function getCachedBanner(bannerUrl: string | undefined | null): Promise<string> {
  if (!bannerUrl)
    return ''

  if (bannerUrl.startsWith('/static/') || bannerUrl.startsWith('static/')) {
    return bannerUrl
  }

  if (!bannerUrl.startsWith('http://') && !bannerUrl.startsWith('https://')) {
    return bannerUrl
  }

  try {
    const cacheKey = getCacheKey(bannerUrl)
    const cachedInfoStr = uni.getStorageSync(cacheKey)

    if (cachedInfoStr) {
      const cachedInfo: BannerCacheInfo = JSON.parse(cachedInfoStr)

      const isExpired = Date.now() - cachedInfo.cacheTime > CACHE_EXPIRY_TIME

      if (!isExpired) {
        const fs = uni.getFileSystemManager()
        try {
          fs.accessSync(cachedInfo.localPath)
          return cachedInfo.localPath
        }
        catch (e) {
          uni.removeStorageSync(cacheKey)
        }
      }
      else {
        await deleteCachedBanner(bannerUrl)
      }
    }
  }
  catch (e) {
    console.error('读取轮播图缓存信息失败:', e)
  }

  return await downloadAndCacheBanner(bannerUrl)
}

export async function downloadAndCacheBanner(bannerUrl: string): Promise<string> {
  return new Promise((resolve) => {
    uni.downloadFile({
      url: bannerUrl,
      success: async (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          try {
            const cacheDir = await ensureCacheDir()
            const fileName = `banner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.tmp`
            const localPath = `${cacheDir}/${fileName}`

            const fs = uni.getFileSystemManager()

            fs.saveFile({
              tempFilePath: res.tempFilePath,
              filePath: localPath,
              success: () => {
                const cacheKey = getCacheKey(bannerUrl)
                const cacheInfo: BannerCacheInfo = {
                  localPath,
                  originalUrl: bannerUrl,
                  cacheTime: Date.now(),
                }

                try {
                  uni.setStorageSync(cacheKey, JSON.stringify(cacheInfo))
                }
                catch (e) {
                  console.error('保存轮播图缓存信息失败:', e)
                }

                resolve(localPath)
              },
              fail: (err) => {
                console.error('保存轮播图到本地失败:', err)
                resolve(bannerUrl)
              },
            })
          }
          catch (e) {
            console.error('处理缓存的轮播图失败:', e)
            resolve(bannerUrl)
          }
        }
        else {
          console.error('下载轮播图失败，状态码:', res.statusCode)
          resolve(bannerUrl)
        }
      },
      fail: (err) => {
        console.error('下载轮播图失败:', err)
        resolve(bannerUrl)
      },
    })
  })
}

export async function deleteCachedBanner(bannerUrl: string): Promise<void> {
  try {
    const cacheKey = getCacheKey(bannerUrl)
    const cachedInfoStr = uni.getStorageSync(cacheKey)

    if (cachedInfoStr) {
      const cachedInfo: BannerCacheInfo = JSON.parse(cachedInfoStr)

      const fs = uni.getFileSystemManager()
      try {
        fs.unlink({
          path: cachedInfo.localPath,
          success: () => {},
          fail: (err) => {
            console.error('删除轮播图缓存文件失败:', err)
          },
        })
      }
      catch (e) {
        console.error('删除轮播图缓存文件异常:', e)
      }

      uni.removeStorageSync(cacheKey)
    }
  }
  catch (e) {
    console.error('删除轮播图缓存失败:', e)
  }
}

export function clearAllBannerCache(): void {
  try {
    const res = uni.getStorageInfoSync()
    const keys = res.keys || []

    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cachedInfoStr = uni.getStorageSync(key)
          if (cachedInfoStr) {
            const cachedInfo: BannerCacheInfo = JSON.parse(cachedInfoStr)
            const fs = uni.getFileSystemManager()
            try {
              fs.unlink({
                path: cachedInfo.localPath,
                success: () => {},
                fail: () => {},
              })
            }
            catch (e) {}
          }
          uni.removeStorageSync(key)
        }
        catch (e) {}
      }
    })

    // #ifndef H5
    const fs = uni.getFileSystemManager()
    const basePath = getUserDataPath()
    if (basePath) {
      const dirPath = `${basePath}/${BANNER_DIR}`
      try {
        fs.rmdir({
          dirPath,
          recursive: true,
          success: () => {},
          fail: () => {},
        })
      }
      catch (e) {}
    }
    // #endif

    console.log('已清除所有轮播图缓存')
  }
  catch (e) {
    console.error('清除所有轮播图缓存失败:', e)
  }
}
