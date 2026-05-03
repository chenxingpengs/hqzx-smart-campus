export interface UpdateInfo {
  version: string
  versionCode: number
  updateType: 'wgt' | 'pkg'
  updateContent: string
  downloadUrl: string
  wgtUrl?: string
  pkgUrl?: string
  forceUpdate: boolean
  publishDate: string
}

export interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  assets: GitHubAsset[]
  published_at: string
  prerelease: boolean
  draft: boolean
}

export interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
  content_type: string
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  updateInfo?: UpdateInfo
  error?: string
}

export interface DownloadProgress {
  progress: number
  totalBytesWritten: number
  totalBytesExpectedToWrite: number
}

export type UpdatePlatform = 'android' | 'ios'
