<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  src: string
  autoplay?: boolean
  muted?: boolean
  height?: number
  showControls?: boolean
  maxRetries?: number
  retryInterval?: number
  initialCache?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
  muted: false,
  height: 200,
  showControls: true,
  maxRetries: 0,
  retryInterval: 3000,
  initialCache: 2,
})

const emit = defineEmits<{
  (e: 'error', detail: { errCode: number, errMsg: string }): void
  (e: 'ready'): void
  (e: 'retry', detail: { current: number, max: number }): void
}>()

const videoRef = ref<any>(null)
const isFullscreen = ref(false)
const retryCount = ref(0)
const isRetrying = ref(false)
const videoKey = ref(0)
const actualSrc = ref('')
const maxCacheValue = ref(3)
let retryTimer: number | null = null

watch(() => props.initialCache, (val) => {
  maxCacheValue.value = val + 1
}, { immediate: true })

function updateActualSrc() {
  if (props.src) {
    const separator = props.src.includes('?') ? '&' : '?'
    actualSrc.value = `${props.src}${separator}_t=${Date.now()}`
  }
  else {
    actualSrc.value = ''
  }
}

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
}

function getRetryDelay(currentRetry: number): number {
  return Math.min(props.retryInterval * 1.5 ** (currentRetry - 1), 10000)
}

function onVideoError(e: any) {
  const detail = e.detail
  console.error('[VideoPlayer] 播放错误:', detail)

  if (props.maxRetries > 0 && retryCount.value < props.maxRetries) {
    retryCount.value++
    isRetrying.value = true
    emit('retry', { current: retryCount.value, max: props.maxRetries })
    console.log(`[VideoPlayer] 自动重试 ${retryCount.value}/${props.maxRetries}`)

    clearRetryTimer()
    const delay = getRetryDelay(retryCount.value)
    retryTimer = setTimeout(() => {
      videoKey.value++
      updateActualSrc()
    }, delay) as unknown as number
  }
  else {
    isRetrying.value = false
    emit('error', {
      errCode: detail.errCode || -1,
      errMsg: detail.errMsg || '播放失败',
    })
  }
}

function onVideoPlay() {
  isRetrying.value = false
  retryCount.value = 0
  emit('ready')
  console.log('[VideoPlayer] 播放开始')
}

function onVideoTimeUpdate(e: any) {
  if (e.detail && e.detail.currentTime > 0) {
    isRetrying.value = false
  }
}

function onLiveStateChange(e: any) {
  console.log('[LivePlayer] live-player state change:', e.detail)
  const code = e.detail.code
  if (code === 2001) {
    console.log('[LivePlayer] 已连接服务器')
  }
  else if (code === 2002) {
    console.log('[LivePlayer] 已开始缓冲')
  }
  else if (code === 2003) {
    console.log('[LivePlayer] 接收到首帧数据')
    isRetrying.value = false
    retryCount.value = 0
    emit('ready')
  }
  else if (code === 2004) {
    console.log('[LivePlayer] 视频播放开始')
  }
  else if (code === -2301) {
    console.error('[LivePlayer] 连接断开')
    onVideoError(e)
  }
  else if (code === -2302) {
    console.error('[LivePlayer] 获取视频流失败')
    onVideoError(e)
  }
}

function play() {
  videoRef.value?.play()
}

function pause() {
  videoRef.value?.pause()
}

function stop() {
  videoRef.value?.stop()
}

function reload() {
  videoKey.value++
  updateActualSrc()
}

function requestFullScreen() {
  videoRef.value?.requestFullScreen()
  isFullscreen.value = true
}

function exitFullScreen() {
  videoRef.value?.exitFullScreen()
  isFullscreen.value = false
}

function snapshot(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!videoRef.value) {
      reject(new Error('播放器未初始化'))
      return
    }

    const ctx = uni.createCanvasContext('snapshot-canvas')
    ctx.drawImage(videoRef.value, 0, 0, props.height * 16 / 9, props.height)
    ctx.draw(false, () => {
      uni.canvasToTempFilePath({
        canvasId: 'snapshot-canvas',
        success: res => resolve(res.tempFilePath),
        fail: err => reject(err),
      })
    })
  })
}

watch(() => props.src, () => {
  retryCount.value = 0
  isRetrying.value = false
  clearRetryTimer()
  updateActualSrc()
}, { immediate: true })

defineExpose({
  play,
  pause,
  stop,
  reload,
  requestFullScreen,
  exitFullScreen,
  snapshot,
})
</script>

<template>
  <view class="video-player-wrapper" :style="{ height: `${height}px` }">
    <!-- #ifdef MP-WEIXIN -->
    <video
      v-if="actualSrc"
      :key="videoKey"
      ref="videoRef"
      :src="actualSrc"
      :autoplay="autoplay"
      :muted="muted"
      :controls="showControls"
      :show-center-play-btn="true"
      :enable-progress-gesture="false"
      :show-loading="true"
      :show-play-btn="true"
      :http-cache="true"
      :enable-play-gesture="true"
      object-fit="contain"
      style="width: 100%; height: 100%;"
      @error="onVideoError"
      @play="onVideoPlay"
      @timeupdate="onVideoTimeUpdate"
    />
    <!-- #endif -->

    <!-- #ifdef APP-PLUS -->
    <video
      v-if="actualSrc"
      id="livePlayer"
      ref="videoRef"
      :src="actualSrc"
      :autoplay="autoplay"
      :muted="muted"
      :controls="showControls"
      :show-center-play-btn="true"
      :enable-progress-gesture="false"
      :show-loading="true"
      :show-play-btn="true"
      :http-cache="true"
      :enable-play-gesture="true"
      object-fit="contain"
      style="width: 100%; height: 100%;"
      @error="onVideoError"
      @play="onVideoPlay"
      @timeupdate="onVideoTimeUpdate"
    />
    <!-- #endif -->

    <view v-if="isRetrying" class="retry-overlay">
      <view class="retry-content">
        <view class="retry-spinner" />
        <text class="retry-text">正在重试 {{ retryCount }}/{{ maxRetries }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.video-player-wrapper {
  position: relative;
  width: 100vw;
  background: #0a0a0a;
  overflow: hidden;
  display: block;
}

.retry-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.retry-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.retry-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.retry-text {
  color: #fff;
  font-size: 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
