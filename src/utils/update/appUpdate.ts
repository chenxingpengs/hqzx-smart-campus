import type { DownloadProgress, GitHubRelease, UpdateCheckResult, UpdateInfo, UpdatePlatform } from './types'

export class AppUpdateManager {
  private githubRepo: string
  private currentVersion: string
  private currentVersionCode: number
  private platform: UpdatePlatform

  constructor(githubRepo: string) {
    this.githubRepo = githubRepo
    this.currentVersion = this.getCurrentVersion()
    this.currentVersionCode = this.getCurrentVersionCode()
    this.platform = this.getPlatform()
  }

  private getCurrentVersion(): string {
    const accountInfo = uni.getAccountInfoSync?.()
    if (accountInfo?.miniProgram?.version) {
      return accountInfo.miniProgram.version
    }
    return '1.0.0'
  }

  private getCurrentVersionCode(): number {
    const manifest = plus?.runtime?.getProperty?.(plus.runtime.appid, (info) => {
      return info.version
    })
    return 100
  }

  private getPlatform(): UpdatePlatform {
    return plus.os.name.toLowerCase() as UpdatePlatform
  }

  async checkUpdate(): Promise<UpdateCheckResult> {
    try {
      const releases = await this.fetchGitHubReleases()
      if (!releases || releases.length === 0) {
        return { hasUpdate: false }
      }

      const latestRelease = this.getLatestValidRelease(releases)
      if (!latestRelease) {
        return { hasUpdate: false }
      }

      const updateInfo = this.parseUpdateInfo(latestRelease)
      if (!updateInfo) {
        return { hasUpdate: false }
      }

      const hasUpdate = this.compareVersion(updateInfo.versionCode)

      return {
        hasUpdate,
        updateInfo: hasUpdate ? updateInfo : undefined,
      }
    }
    catch (error) {
      console.error('[AppUpdateManager] 检查更新失败:', error)
      return {
        hasUpdate: false,
        error: error instanceof Error ? error.message : '检查更新失败',
      }
    }
  }

  private async fetchGitHubReleases(): Promise<GitHubRelease[]> {
    const url = `https://api.github.com/repos/${this.githubRepo}/releases`

    return new Promise((resolve, reject) => {
      uni.request({
        url,
        method: 'GET',
        header: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'uni-app',
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data as GitHubRelease[])
          }
          else {
            reject(new Error(`获取发布信息失败: ${res.statusCode}`))
          }
        },
        fail: (err) => {
          reject(err)
        },
      })
    })
  }

  private getLatestValidRelease(releases: GitHubRelease[]): GitHubRelease | null {
    for (const release of releases) {
      if (release.draft || release.prerelease) {
        continue
      }
      return release
    }
    return null
  }

  private parseUpdateInfo(release: GitHubRelease): UpdateInfo | null {
    const version = release.tag_name.replace(/^v/, '')
    const versionCode = this.versionToCode(version)

    const wgtAsset = release.assets.find(asset =>
      asset.name.endsWith('.wgt'),
    )

    const pkgAsset = release.assets.find((asset) => {
      if (this.platform === 'android') {
        return asset.name.endsWith('.apk')
      }
      else if (this.platform === 'ios') {
        return asset.name.endsWith('.ipa') || asset.name.endsWith('.pkg')
      }
      return false
    })

    if (!wgtAsset && !pkgAsset) {
      return null
    }

    const updateType = wgtAsset ? 'wgt' : 'pkg'

    return {
      version,
      versionCode,
      updateType,
      updateContent: release.body || '暂无更新说明',
      downloadUrl: updateType === 'wgt' ? wgtAsset!.browser_download_url : pkgAsset!.browser_download_url,
      wgtUrl: wgtAsset?.browser_download_url,
      pkgUrl: pkgAsset?.browser_download_url,
      forceUpdate: release.body?.includes('[FORCE]') || false,
      publishDate: release.published_at,
    }
  }

  private versionToCode(version: string): number {
    const parts = version.split('.').map(Number)
    let code = 0
    for (let i = 0; i < 3; i++) {
      code = code * 100 + (parts[i] || 0)
    }
    return code
  }

  private compareVersion(newVersionCode: number): boolean {
    return newVersionCode > this.currentVersionCode
  }

  async downloadWgt(
    url: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const downloadTask = plus.downloader.createDownload(
        url,
        {
          filename: `_downloads/${Date.now()}.wgt`,
        },
        (download, status) => {
          if (status === 200) {
            resolve(download.filename!)
          }
          else {
            reject(new Error(`下载失败: ${status}`))
          }
        },
      )

      downloadTask.addEventListener('statechanged', (download) => {
        if (download.state === 3) {
          const progress: DownloadProgress = {
            progress: Math.round((download.downloadedSize / download.totalSize) * 100),
            totalBytesWritten: download.downloadedSize,
            totalBytesExpectedToWrite: download.totalSize,
          }
          onProgress?.(progress)
        }
      })

      downloadTask.start()
    })
  }

  async installWgt(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      plus.runtime.install(
        filePath,
        { force: true },
        () => {
          resolve()
        },
        (error) => {
          reject(new Error(`安装失败: ${error.message}`))
        },
      )
    })
  }

  async downloadAndInstallWgt(
    url: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    const filePath = await this.downloadWgt(url, onProgress)
    await this.installWgt(filePath)
    plus.runtime.restart()
  }

  async downloadApk(
    url: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const downloadTask = plus.downloader.createDownload(
        url,
        {
          filename: `_downloads/${Date.now()}.apk`,
        },
        (download, status) => {
          if (status === 200) {
            resolve(download.filename!)
          }
          else {
            reject(new Error(`下载失败: ${status}`))
          }
        },
      )

      downloadTask.addEventListener('statechanged', (download) => {
        if (download.state === 3) {
          const progress: DownloadProgress = {
            progress: Math.round((download.downloadedSize / download.totalSize) * 100),
            totalBytesWritten: download.downloadedSize,
            totalBytesExpectedToWrite: download.totalSize,
          }
          onProgress?.(progress)
        }
      })

      downloadTask.start()
    })
  }

  async installApk(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      plus.runtime.openFile(filePath, {}, (error) => {
        reject(new Error(`安装失败: ${error.message}`))
      })
      resolve()
    })
  }

  async downloadAndInstallApk(
    url: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    const filePath = await this.downloadApk(url, onProgress)
    await this.installApk(filePath)
  }
}

export function createAppUpdateManager(githubRepo: string): AppUpdateManager {
  return new AppUpdateManager(githubRepo)
}
