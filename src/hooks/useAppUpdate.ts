import { ref } from 'vue'
import type { UpdateCheckResult, UpdateInfo } from '@/utils/update/types'
import { createAppUpdateManager } from '@/utils/update/appUpdate'

export interface UseAppUpdateOptions {
  githubRepo: string
  autoCheckOnMount?: boolean
  showLoading?: boolean
}

export function useAppUpdate(options: UseAppUpdateOptions) {
  const hasUpdate = ref(false)
  const updateInfo = ref<UpdateInfo | null>(null)
  const checking = ref(false)
  const downloading = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  const updateManager = createAppUpdateManager(options.githubRepo)

  async function checkUpdate() {
    if (checking.value)
      return

    checking.value = true
    error.value = null

    if (options.showLoading !== false) {
      uni.showLoading({
        title: '检查更新中...',
        mask: true,
      })
    }

    try {
      const result: UpdateCheckResult = await updateManager.checkUpdate()
      hasUpdate.value = result.hasUpdate
      updateInfo.value = result.updateInfo || null

      if (result.error) {
        error.value = result.error
      }

      return result
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : '检查更新失败'
      error.value = errorMsg
      return {
        hasUpdate: false,
        error: errorMsg,
      }
    }
    finally {
      checking.value = false
      if (options.showLoading !== false) {
        uni.hideLoading()
      }
    }
  }

  async function downloadAndInstall(onProgress?: (p: number) => void) {
    if (!updateInfo.value || downloading.value)
      return

    downloading.value = true
    progress.value = 0

    try {
      const progressCallback = (p: { progress: number }) => {
        progress.value = p.progress
        onProgress?.(p.progress)
      }

      if (updateInfo.value.updateType === 'wgt' && updateInfo.value.wgtUrl) {
        await updateManager.downloadAndInstallWgt(updateInfo.value.wgtUrl, progressCallback)
      }
      else if (updateInfo.value.pkgUrl) {
        await updateManager.downloadAndInstallApk(updateInfo.value.pkgUrl, progressCallback)
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : '更新失败'
      error.value = errorMsg
      throw err
    }
    finally {
      downloading.value = false
    }
  }

  onMounted(() => {
    if (options.autoCheckOnMount) {
      checkUpdate()
    }
  })

  return {
    hasUpdate,
    updateInfo,
    checking,
    downloading,
    progress,
    error,
    checkUpdate,
    downloadAndInstall,
  }
}
