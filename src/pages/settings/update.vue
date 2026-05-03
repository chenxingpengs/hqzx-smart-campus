<script setup lang="ts">
import { useAppUpdate } from '@/hooks/useAppUpdate'

definePage({
  name: 'AppUpdate',
  style: {
    navigationBarTitleText: '检查更新',
  },
})

const githubRepo = import.meta.env.VITE_GITHUB_REPO || ''

const {
  hasUpdate,
  updateInfo,
  checking,
  downloading,
  progress,
  error,
  checkUpdate,
  downloadAndInstall,
} = useAppUpdate({
  githubRepo,
  autoCheckOnMount: false,
})

const showUpdateDialog = ref(false)

async function handleCheckUpdate() {
  await checkUpdate()
  if (hasUpdate.value) {
    showUpdateDialog.value = true
  }
  else {
    uni.showToast({
      title: '已是最新版本',
      icon: 'success',
    })
  }
}

async function handleUpdate() {
  try {
    await downloadAndInstall((p) => {
      console.log('下载进度:', p)
    })
  }
  catch (err) {
    uni.showToast({
      title: '更新失败',
      icon: 'none',
    })
  }
}

function handleCloseDialog() {
  if (downloading.value) {
    return
  }
  showUpdateDialog.value = false
}

const currentVersion = ref('1.0.0')

onMounted(() => {
  // #ifdef APP-PLUS
  plus.runtime.getProperty(plus.runtime.appid!, (info) => {
    currentVersion.value = info.version
  })
  // #endif
})
</script>

<template>
  <view class="update-page">
    <view class="current-version">
      <view class="version-label">
        当前版本
      </view>
      <view class="version-number">
        v{{ currentVersion }}
      </view>
    </view>

    <view class="check-section">
      <wd-button
        type="primary"
        size="large"
        :loading="checking"
        @click="handleCheckUpdate"
      >
        {{ checking ? '检查中...' : '检查更新' }}
      </wd-button>
    </view>

    <view v-if="error" class="error-section">
      <wd-icon name="error-fill" color="#ff4d4f" />
      <text class="error-text">
        {{ error }}
      </text>
    </view>

    <view v-if="updateInfo && !showUpdateDialog" class="update-info">
      <view class="update-header">
        <text class="update-title">
          发现新版本 v{{ updateInfo.version }}
        </text>
        <text class="update-type">
          {{ updateInfo.updateType === 'wgt' ? '热更新' : '整包更新' }}
        </text>
      </view>
      <view class="update-content">
        <text class="content-label">
          更新内容：
        </text>
        <text class="content-text">
          {{ updateInfo.updateContent }}
        </text>
      </view>
      <view class="update-actions">
        <wd-button
          type="primary"
          :loading="downloading"
          @click="handleUpdate"
        >
          {{ downloading ? `更新中 ${progress}%` : '立即更新' }}
        </wd-button>
      </view>
    </view>

    <wd-popup
      v-model="showUpdateDialog"
      position="center"
      :close-on-click-modal="!updateInfo?.forceUpdate && !downloading"
      custom-style="border-radius: 16rpx; width: 580rpx; overflow: hidden;"
      @close="handleCloseDialog"
    >
      <view class="dialog-content">
        <view class="dialog-header">
          <wd-icon name="refresh" size="80rpx" color="#1989fa" />
          <text class="dialog-title">
            发现新版本
          </text>
          <text class="dialog-version">
            v{{ updateInfo?.version }}
          </text>
        </view>

        <view class="dialog-body">
          <scroll-view scroll-y class="content-scroll">
            <text class="content-label">
              更新内容：
            </text>
            <text class="content-text">
              {{ updateInfo?.updateContent }}
            </text>
          </scroll-view>
        </view>

        <view v-if="downloading" class="progress-section">
          <wd-progress
            :percentage="progress"
            :show-text="false"
            status="success"
          />
          <text class="progress-text">
            正在下载: {{ progress }}%
          </text>
        </view>

        <view class="dialog-footer">
          <wd-button
            v-if="!updateInfo?.forceUpdate && !downloading"
            block
            @click="handleCloseDialog"
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
  </view>
</template>

<style scoped lang="scss">
.update-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 32rpx;
}

.current-version {
  background: #fff;
  border-radius: 16rpx;
  padding: 48rpx 32rpx;
  text-align: center;
  margin-bottom: 32rpx;
}

.version-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.version-number {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}

.check-section {
  margin-bottom: 32rpx;
}

.error-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.error-text {
  font-size: 28rpx;
  color: #ff4d4f;
}

.update-info {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.update-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.update-type {
  font-size: 24rpx;
  color: #1989fa;
  background: #e6f7ff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.update-content {
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.content-label {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.content-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.update-actions {
  display: flex;
  gap: 24rpx;
}

.dialog-content {
  background: #fff;
  padding: 40rpx;
}

.dialog-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}

.dialog-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-top: 24rpx;
  margin-bottom: 12rpx;
}

.dialog-version {
  font-size: 28rpx;
  color: #666;
  background: #f5f5f5;
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
}

.dialog-body {
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  max-height: 400rpx;
}

.content-scroll {
  max-height: 320rpx;
}

.progress-section {
  margin-bottom: 32rpx;
}

.progress-text {
  text-align: center;
  font-size: 24rpx;
  color: #666;
  margin-top: 12rpx;
  display: block;
}

.dialog-footer {
  display: flex;
  gap: 24rpx;
}
</style>
