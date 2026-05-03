<script setup lang="ts">
import type { DownloadProgress, UpdateInfo } from '@/utils/update/types'
import { AppUpdateManager, createAppUpdateManager } from '@/utils/update/appUpdate'

const props = defineProps<{
  githubRepo: string
  autoCheck?: boolean
}>()

const visible = ref(false)
const updateInfo = ref<UpdateInfo | null>(null)
const downloading = ref(false)
const progress = ref(0)
const progressText = ref('')

let updateManager: AppUpdateManager | null = null

onMounted(() => {
  updateManager = createAppUpdateManager(props.githubRepo)
  if (props.autoCheck !== false) {
    checkUpdate()
  }
})

async function checkUpdate() {
  if (!updateManager)
    return

  try {
    const result = await updateManager.checkUpdate()
    if (result.hasUpdate && result.updateInfo) {
      updateInfo.value = result.updateInfo
      visible.value = true
    }
  }
  catch (error) {
    console.error('[AppUpdateDialog] 检查更新失败:', error)
  }
}

async function handleUpdate() {
  if (!updateInfo.value || !updateManager)
    return

  downloading.value = true
  progress.value = 0

  try {
    const onProgress = (p: DownloadProgress) => {
      progress.value = p.progress
      progressText.value = `正在下载: ${p.progress}%`
    }

    if (updateInfo.value.updateType === 'wgt' && updateInfo.value.wgtUrl) {
      await updateManager.downloadAndInstallWgt(updateInfo.value.wgtUrl, onProgress)
    }
    else if (updateInfo.value.pkgUrl) {
      await updateManager.downloadAndInstallApk(updateInfo.value.pkgUrl, onProgress)
    }
  }
  catch (error) {
    console.error('[AppUpdateDialog] 更新失败:', error)
    uni.showToast({
      title: '更新失败',
      icon: 'none',
    })
    downloading.value = false
  }
}

function handleCancel() {
  if (updateInfo.value?.forceUpdate) {
    uni.showToast({
      title: '此版本需要强制更新',
      icon: 'none',
    })
    return
  }
  visible.value = false
}

function handleClose() {
  if (downloading.value) {
    return
  }
  visible.value = false
}

defineExpose({
  checkUpdate,
})
</script>

<template>
  <wd-popup
    v-model="visible"
    position="center"
    :close-on-click-modal="!updateInfo?.forceUpdate && !downloading"
    :close-on-click-escape="!updateInfo?.forceUpdate && !downloading"
    custom-style="border-radius: 16rpx; width: 580rpx; overflow: hidden;"
    @close="handleClose"
  >
    <view class="update-dialog">
      <view class="update-header">
        <view class="update-icon">
          <wd-icon name="refresh" size="80rpx" color="#1989fa" />
        </view>
        <view class="update-title">
          发现新版本
        </view>
        <view class="update-version">
          v{{ updateInfo?.version }}
        </view>
      </view>

      <view class="update-content">
        <scroll-view scroll-y class="update-scroll">
          <view class="update-label">
            更新内容：
          </view>
          <view class="update-text">
            {{ updateInfo?.updateContent }}
          </view>
        </scroll-view>
      </view>

      <view v-if="downloading" class="update-progress">
        <wd-progress
          :percentage="progress"
          :show-text="false"
          status="success"
        />
        <view class="progress-text">
          {{ progressText }}
        </view>
      </view>

      <view class="update-footer">
        <wd-button
          v-if="!updateInfo?.forceUpdate && !downloading"
          block
          @click="handleCancel"
        >
          稍后更新
        </wd-button>
        <wd-button
          type="primary"
          block
          :disabled="downloading"
          @click="handleUpdate"
        >
          {{ downloading ? '更新中...' : '立即更新' }}
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<style scoped lang="scss">
.update-dialog {
  background: #fff;
  padding: 40rpx;
}

.update-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}

.update-icon {
  margin-bottom: 24rpx;
}

.update-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.update-version {
  font-size: 28rpx;
  color: #666;
  background: #f5f5f5;
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
}

.update-content {
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  max-height: 400rpx;
}

.update-scroll {
  max-height: 320rpx;
}

.update-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.update-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.update-progress {
  margin-bottom: 32rpx;
}

.progress-text {
  text-align: center;
  font-size: 24rpx;
  color: #666;
  margin-top: 12rpx;
}

.update-footer {
  display: flex;
  gap: 24rpx;
}
</style>
