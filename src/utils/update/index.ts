export * from './types'
export * from './appUpdate'

import { createAppUpdateManager } from './appUpdate'
import type { UpdateInfo } from './types'

export interface UpdateOptions {
  githubRepo: string
  autoCheck?: boolean
  onCheckComplete?: (hasUpdate: boolean, updateInfo?: UpdateInfo) => void
  onError?: (error: Error) => void
}

export function useAppUpdate(options: UpdateOptions) {
  const updateManager = createAppUpdateManager(options.githubRepo)

  async function checkUpdate() {
    try {
      const result = await updateManager.checkUpdate()
      options.onCheckComplete?.(result.hasUpdate, result.updateInfo)
      return result
    }
    catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      options.onError?.(err)
      return {
        hasUpdate: false,
        error: err.message,
      }
    }
  }

  return {
    updateManager,
    checkUpdate,
  }
}

export function initAppUpdate(githubRepo: string) {
  if (typeof plus === 'undefined') {
    console.log('[AppUpdate] 非APP环境，跳过更新检查')
    return null
  }

  return createAppUpdateManager(githubRepo)
}
