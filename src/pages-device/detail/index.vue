<script setup lang="ts">
import type { StreamQuality } from '@/api/device'
import type { ConnectResponse } from '@/api/types/device'
import type { WxSocket } from '@/utils/websocket'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, nextTick, ref } from 'vue'
import { startViewing, stopStream } from '@/api/device'
import LivePlayer from '@/components/LivePlayer/LivePlayer.vue'
import { useTokenStore } from '@/store/token'
import { getEnvBaseUrl } from '@/utils'
import { safeAreaInsets } from '@/utils/systemInfo'
import { WxSocketIOClient } from '@/utils/websocket'

defineOptions({ name: 'DeviceDetailPage' })
const props = defineProps<{
  deviceId: string
  deviceName: string
}>()

definePage({
  type: 'page',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#000000',
    backgroundTextStyle: 'light',
  },
})

const tokenStore = useTokenStore()
const loading = ref(true)
const error = ref('')
const sessionId = ref('')
const streamName = ref('')
const hlsUrl = ref('')
const flvUrl = ref('')
const rtmpUrl = ref('')
const isRecording = ref(false)
const recordTime = ref(0)
const recordTimer = ref<number | null>(null)
const connectionTimeout = ref<number | null>(null)
const isFullscreen = ref(false)
const playerHeight = ref(300)
const showWarning = ref(true)
const showNotice = ref(true)
const showQualitySelector = ref(false)
const currentQuality = ref<StreamQuality>('medium')
const CONNECTION_TIMEOUT = 15000

const RTMP_MAX_RETRIES = 3
const HLS_MAX_RETRIES = 2
const currentStreamType = ref<'rtmp' | 'hls'>('rtmp')
const rtmpRetryCount = ref(0)
const hlsRetryCount = ref(0)
const isRetrying = ref(false)
const retryingText = ref('')
let errorTimer: number | null = null
let isPlaying = ref(false)

const qualityOptions: { value: StreamQuality, label: string, desc: string }[] = [
  { value: 'low', label: '省流', desc: '360P 300kbps' },
  { value: 'medium', label: '流畅', desc: '480P 500kbps' },
  { value: 'high', label: '高清', desc: '480P 700kbps' },
  { value: 'ultra', label: '超清', desc: '720P 900kbps' },
]

const streamUrl = computed(() => {
  // #ifdef APP-PLUS
  if (currentStreamType.value === 'rtmp') {
    return rtmpUrl.value
  }
  return hlsUrl.value
  // #endif
  return hlsUrl.value
})

let socket: WxSocket | null = null
let recorderManager: UniApp.RecorderManager | null = null
const playerRef = ref<InstanceType<typeof LivePlayer> | null>(null)

const baseUrl = getEnvBaseUrl()
const httpUrl = baseUrl.replace(/\/app$/, '')
const wsUrl = `${httpUrl
  .replace(/^https:/, 'wss:')
  .replace(/^http:/, 'ws:')}/socket.io/`

function connectWebSocket() {
  const token = tokenStore.tokenInfo?.accessToken
  if (!token) {
    error.value = '未登录'
    loading.value = false
    return
  }

  console.log('[DeviceDetail] 开始连接WebSocket, URL:', wsUrl)
  loading.value = true
  error.value = ''
  sessionId.value = ''
  streamName.value = ''
  hlsUrl.value = ''

  socket = new WxSocketIOClient(wsUrl, {
    auth: { token },
    query: { token },
  }, '/device-control')

  connectionTimeout.value = setTimeout(() => {
    console.log('[DeviceDetail] 连接超时检查, loading:', loading.value, 'sessionId:', sessionId.value)
    if (loading.value && !hlsUrl.value) {
      error.value = '连接超时，设备可能不支持推流功能，请升级到最新版本'
      loading.value = false
      socket?.disconnect()
      uni.showToast({ title: '连接超时', icon: 'none' })
    }
  }, CONNECTION_TIMEOUT) as unknown as number

  socket.on('connect', () => {
    console.log('[DeviceDetail] WebSocket已连接')
  })

  socket.on('connect_response', (data: unknown) => {
    console.log('[DeviceDetail] 收到connect_response:', data)
    const response = data as ConnectResponse
    if (response.code !== 200) {
      clearTimeout(connectionTimeout.value!)
      error.value = response.msg
      loading.value = false
    }
    else {
      console.log('[DeviceDetail] connect_response成功，开始调用API')
      startStream()
    }
  })

  socket.on('stream_started', (data: unknown) => {
    console.log('[DeviceDetail] 收到推流开始:', data)
    const streamData = data as {
      session_id?: string
      stream_name?: string
      http_flv_url?: string
    }

    if (streamData.hls_url || streamData.http_flv_url) {
      hlsUrl.value = streamData.hls_url || streamData.http_flv_url
      streamName.value = streamData.stream_name || ''
      clearTimeout(connectionTimeout.value!)
      loading.value = false
      console.log('[DeviceDetail] 已设置hlsUrl:', hlsUrl.value)
    }
  })

  socket.on('stream_stopped', () => {
    console.log('[DeviceDetail] 推流已停止')
    error.value = '推流已停止'
    hlsUrl.value = ''
    loading.value = false
  })

  socket.on('stream_error', (data: unknown) => {
    console.error('[DeviceDetail] 推流错误:', data)
    const errData = data as { error?: string, error_code?: string }
    clearTimeout(connectionTimeout.value!)
    loading.value = false

    if (errData.error_code === 'STREAM_NOT_SUPPORTED') {
      error.value = '当前设备版本不支持推流功能，请升级到最新版本'
    }
    else if (errData.error_code === 'CAMERA_NOT_AVAILABLE') {
      error.value = '摄像头不可用，请检查设备摄像头'
    }
    else if (errData.error_code === 'STREAM_BUSY') {
      error.value = '设备正在被其他用户观看，请稍后再试'
    }
    else {
      error.value = errData.error || '推流失败，请重试'
    }
    hlsUrl.value = ''
  })

  socket.on('error', (data: unknown) => {
    console.error('[DeviceDetail] WebSocket错误:', data)
    const errData = data as { msg?: string }
    error.value = errData.msg || '发生错误'
    loading.value = false
  })

  socket.on('disconnect', () => {
    console.log('[DeviceDetail] WebSocket断开')
  })

  socket.on('connect_error', (err: unknown) => {
    console.error('[DeviceDetail] WebSocket连接错误:', err)
    error.value = '连接错误'
    loading.value = false
  })
}

async function startStream() {
  try {
    console.log('[DeviceDetail] 调用 startViewing API, quality:', currentQuality.value)
    const res = await startViewing(props.deviceId, currentQuality.value)
    console.log('[DeviceDetail] API返回:', res)
    sessionId.value = res.sessionId
    streamName.value = res.streamName
    hlsUrl.value = res.hlsUrl || `https://live.hqzx.me/live/${res.streamName}/index.m3u8`
    flvUrl.value = res.httpFlvUrl || `https://live.hqzx.me/live/${res.streamName}.flv`
    rtmpUrl.value = `rtmp://117.72.166.182:1935/live/${res.streamName}`
    console.log('[DeviceDetail] hlsUrl:', hlsUrl.value, 'rtmpUrl:', rtmpUrl.value)

    console.log('[DeviceDetail] 等待推流准备...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (streamUrl.value) {
      clearTimeout(connectionTimeout.value!)
      loading.value = false
      console.log('[DeviceDetail] loading设置为false, streamUrl已设置')
      await nextTick()
      console.log('[DeviceDetail] nextTick完成, loading:', loading.value, 'streamUrl:', streamUrl.value)
    }
  }
  catch (e: any) {
    console.error('[DeviceDetail] 开始推流失败:', e)
    clearTimeout(connectionTimeout.value!)
    loading.value = false

    const errorMsg = e?.data?.msg || e?.message || '开始推流失败'
    if (errorMsg.includes('离线')) {
      error.value = '设备离线，无法查看'
    }
    else if (errorMsg.includes('不支持')) {
      error.value = '当前设备版本不支持推流功能，请升级到最新版本'
    }
    else {
      error.value = errorMsg
    }
  }
}

function selectQuality(quality: StreamQuality) {
  currentQuality.value = quality
  showQualitySelector.value = false
}

function getCurrentQualityLabel() {
  return qualityOptions.find(q => q.value === currentQuality.value)?.label || '高清'
}

function onPlayerReady() {
  console.log('[DeviceDetail] 播放器就绪')
  isRetrying.value = false
  isPlaying.value = true
  rtmpRetryCount.value = 0
  hlsRetryCount.value = 0
  if (errorTimer) {
    clearTimeout(errorTimer)
    errorTimer = null
  }
}

function onPlayerError(e: { errCode: number, errMsg: string }) {
  console.error('[DeviceDetail] 播放错误:', e)

  if (isPlaying.value) {
    console.log('[DeviceDetail] 已在播放中，忽略错误')
    return
  }

  if (errorTimer) {
    clearTimeout(errorTimer)
  }

  errorTimer = setTimeout(() => {
    handleError(e)
  }, 3000) as unknown as number
}

function handleError(e: { errCode: number, errMsg: string }) {
  // #ifdef APP-PLUS
  if (currentStreamType.value === 'rtmp') {
    rtmpRetryCount.value++
    if (rtmpRetryCount.value <= RTMP_MAX_RETRIES) {
      isRetrying.value = true
      retryingText.value = `RTMP 重试 ${rtmpRetryCount.value}/${RTMP_MAX_RETRIES}`
      console.log(`[DeviceDetail] ${retryingText.value}`)
      setTimeout(() => {
        isPlaying.value = false
        playerRef.value?.reload()
      }, 2000)
      return
    }
    else {
      console.log('[DeviceDetail] RTMP 重试失败，切换到 HLS')
      currentStreamType.value = 'hls'
      hlsRetryCount.value = 0
      isRetrying.value = true
      retryingText.value = '切换到 HLS...'
      setTimeout(() => {
        isPlaying.value = false
        playerRef.value?.reload()
      }, 1000)
      return
    }
  }
  else {
    hlsRetryCount.value++
    if (hlsRetryCount.value <= HLS_MAX_RETRIES) {
      isRetrying.value = true
      retryingText.value = `HLS 重试 ${hlsRetryCount.value}/${HLS_MAX_RETRIES}`
      console.log(`[DeviceDetail] ${retryingText.value}`)
      setTimeout(() => {
        isPlaying.value = false
        playerRef.value?.reload()
      }, 2000)
      return
    }
  }
  // #endif

  isRetrying.value = false
  error.value = e.errMsg || '播放失败'
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    playerHeight.value = 500
    playerRef.value?.requestFullScreen()
  }
  else {
    playerHeight.value = 300
    playerRef.value?.exitFullScreen()
  }
}

function takeScreenshot() {
  playerRef.value?.snapshot().then((tempPath) => {
    uni.saveImageToPhotosAlbum({
      filePath: tempPath,
      success: () => {
        uni.showToast({ title: '截图已保存', icon: 'success' })
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          uni.showModal({
            title: '需要相册权限',
            content: '请在设置中开启相册权限',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                uni.openSetting()
              }
            },
          })
        }
        else {
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
      },
    })
  }).catch(() => {
    uni.showToast({ title: '截图失败', icon: 'none' })
  })
}

function initRecorder() {
  recorderManager = uni.getRecorderManager()

  recorderManager.onStart(() => {
    isRecording.value = true
    recordTime.value = 0
    recordTimer.value = setInterval(() => {
      recordTime.value++
    }, 1000) as unknown as number
  })

  recorderManager.onStop((res) => {
    isRecording.value = false
    if (recordTimer.value) {
      clearInterval(recordTimer.value)
      recordTimer.value = null
    }
    sendAudio(res.tempFilePath)
  })

  recorderManager.onError(() => {
    isRecording.value = false
    uni.showToast({ title: '录音失败', icon: 'none' })
  })
}

async function sendAudio(tempFilePath: string) {
  if (!socket || !sessionId.value)
    return

  try {
    const res = await uni.getFileSystemManager().readFileSync(tempFilePath)
    const base64 = uni.arrayBufferToBase64(res as ArrayBuffer)

    socket.emit('audio_data', {
      session_id: sessionId.value,
      data: base64,
      timestamp: Date.now(),
    })

    uni.showToast({ title: '喊话已发送', icon: 'success' })
  }
  catch (e) {
    console.error('[DeviceDetail] 发送音频失败:', e)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

function startRecording() {
  if (!recorderManager) {
    initRecorder()
  }

  // #ifdef MP-WEIXIN
  uni.authorize({
    scope: 'scope.record',
    success: () => {
      recorderManager?.start({
        format: 'mp3',
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 32000,
      })
    },
    fail: () => {
      uni.showModal({
        title: '需要录音权限',
        content: '请在设置中开启录音权限',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            uni.openSetting()
          }
        },
      })
    },
  })
  // #endif

  // #ifdef APP-PLUS
  recorderManager?.start({
    format: 'mp3',
    sampleRate: 16000,
    numberOfChannels: 1,
    encodeBitRate: 32000,
  })
  // #endif
}

function stopRecording() {
  if (recorderManager && isRecording.value) {
    recorderManager.stop()
  }
}

function handleVoiceStart() {
  startRecording()
}

function handleVoiceEnd() {
  stopRecording()
}

async function cleanup() {
  if (recordTimer.value) {
    clearInterval(recordTimer.value)
    recordTimer.value = null
  }

  if (connectionTimeout.value) {
    clearTimeout(connectionTimeout.value)
    connectionTimeout.value = null
  }

  if (socket) {
    if (sessionId.value) {
      try {
        await stopStream(props.deviceId, sessionId.value)
      }
      catch (e) {
        console.error('[DeviceDetail] 停止推流失败:', e)
      }
    }
    socket.disconnect()
    socket = null
  }
}

function goBack() {
  uni.navigateBack()
}

onLoad(() => {
  initRecorder()
  connectWebSocket()
})

onUnload(() => {
  cleanup()
})

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
</script>

<template>
  <view class="min-h-screen bg-[#0a0a0a]" :style="{ paddingTop: `${safeAreaInsets?.top}px` }">
    <view class="flex items-center justify-between from-black/80 to-transparent bg-gradient-to-b px-4 py-3">
      <view class="flex items-center gap-2" @click="goBack">
        <view class="i-carbon-arrow-left text-24px text-white" />
        <text class="text-sm text-gray-300">返回</text>
      </view>
      <view class="text-base text-white font-medium">
        {{ deviceName }}
      </view>
      <view class="w-16" />
    </view>

    <view v-if="loading" class="flex flex-col items-center justify-center py-32">
      <view class="relative">
        <view class="h-16 w-16 animate-spin border-4 border-blue-500/30 border-t-blue-500 rounded-full" />
        <view class="absolute inset-0 flex items-center justify-center">
          <view class="i-carbon-video text-24px text-blue-400" />
        </view>
      </view>
      <text class="mt-4 text-sm text-gray-400">正在连接设备...</text>
      <text class="mt-2 text-xs text-gray-500">请确保设备已开机并联网</text>
    </view>

    <view v-else-if="error" class="flex flex-col items-center justify-center px-6 py-32">
      <view class="mb-4 h-20 w-20 flex items-center justify-center rounded-full bg-red-500/10">
        <view class="i-carbon-warning-alt text-40px text-red-400" />
      </view>
      <text class="text-base text-gray-300">{{ error }}</text>
      <text class="mt-2 text-xs text-gray-500">请检查设备状态后重试</text>
      <view class="mt-6 flex gap-3">
        <view class="rounded-lg bg-gray-700 px-5 py-2.5" @click="goBack">
          <text class="text-sm text-gray-300">返回</text>
        </view>
        <view class="rounded-lg bg-blue-500 px-5 py-2.5" @click="connectWebSocket">
          <text class="text-sm text-white">重试</text>
        </view>
      </view>
    </view>

    <view v-else class="flex flex-col">
      <!-- #ifdef MP-WEIXIN -->
      <view v-if="showWarning" class="warning-banner">
        <view class="warning-content">
          <view class="warning-header">
            <view class="i-carbon-information text-18px text-blue-400" />
            <text class="warning-title">智校红中现已上线</text>
          </view>
          <view class="warning-body">
            <text class="warning-text">因小程序限制，使用 APP 获得更好的体验</text>
            <text class="warning-text mt-1">如无法查看请使用 APP</text>
          </view>
        </view>
        <view class="warning-close" @click="showWarning = false">
          <view class="i-carbon-close text-16px text-gray-400" />
        </view>
      </view>
      <!-- #endif -->

      <view v-if="showNotice" class="notice-banner">
        <view class="notice-content">
          <view class="notice-header">
            <view class="i-carbon-information text-18px text-amber-400" />
            <text class="notice-title">温馨提示</text>
          </view>
          <view class="notice-body">
            <view class="notice-item">
              <view class="notice-dot" />
              <text class="notice-text">服务器总带宽 <text class="text-amber-400 font-medium">3Mbps</text>，多人观看请选择较低画质</text>
            </view>
            <view class="notice-item">
              <view class="notice-dot" />
              <text class="notice-text">建议 <text class="text-amber-400 font-medium">1-2人</text> 观看，超过 <text class="text-amber-400 font-medium">3人</text> 可能卡顿</text>
            </view>
          </view>
        </view>
        <view class="notice-close" @click="showNotice = false">
          <view class="i-carbon-close text-16px text-gray-400" />
        </view>
      </view>

      <view class="relative w-full bg-[#0a0a0a]">
        <LivePlayer
          v-if="streamUrl"
          ref="playerRef"
          :src="streamUrl"
          :height="playerHeight"
          autoplay
          :show-controls="true"
          @ready="onPlayerReady"
          @error="onPlayerError"
        />

        <view v-if="isRetrying" class="retry-overlay">
          <view class="retry-content">
            <view class="retry-spinner" />
            <text class="retry-text">{{ retryingText }}</text>
          </view>
        </view>

        <view v-if="!isFullscreen" class="absolute bottom-0 left-0 right-0 from-black/80 to-transparent bg-gradient-to-t p-3">
          <view class="flex items-center justify-between">
            <view class="flex items-center gap-3">
              <view
                class="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20"
                @click="toggleFullscreen"
              >
                <view v-if="!isFullscreen" class="i-carbon-expand text-18px text-white" />
                <view v-else class="i-carbon-collapse text-18px text-white" />
              </view>
              <view
                class="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20"
                @click="takeScreenshot"
              >
                <view class="i-carbon-camera text-18px text-white" />
              </view>
              <view
                class="h-9 flex items-center justify-center rounded-full bg-white/10 px-3 backdrop-blur-sm active:bg-white/20"
                @click="showQualitySelector = true"
              >
                <text class="text-xs text-white">{{ getCurrentQualityLabel() }}</text>
              </view>
            </view>
            <text class="text-xs text-white/60">{{ new Date().toLocaleTimeString() }}</text>
          </view>
        </view>
      </view>

      <view v-if="showQualitySelector" class="quality-selector-overlay" @click="showQualitySelector = false">
        <view class="quality-selector" @click.stop>
          <view class="quality-selector-header">
            <text class="quality-selector-title">画质选择</text>
          </view>
          <view class="quality-options">
            <view
              v-for="option in qualityOptions"
              :key="option.value"
              class="quality-option"
              :class="{ 'quality-option-active': currentQuality === option.value }"
              @click="selectQuality(option.value)"
            >
              <text class="quality-option-label">{{ option.label }}</text>
              <text class="quality-option-desc">{{ option.desc }}</text>
              <view v-if="currentQuality === option.value" class="i-carbon-checkmark text-16px text-blue-400" />
            </view>
          </view>
        </view>
      </view>

      <view class="flex flex-1 flex-col items-center justify-center p-6">
        <view class="mb-6 text-center">
          <text class="text-sm text-gray-400">长按下方按钮进行喊话</text>
          <text class="mt-1 block text-xs text-gray-500">松开后自动发送</text>
        </view>

        <view
          class="relative h-28 w-28 flex items-center justify-center rounded-full transition-all duration-200"
          :class="isRecording ? 'bg-red-500 scale-110' : 'bg-gradient-to-br from-blue-500 to-blue-600'"
          @touchstart="handleVoiceStart"
          @touchend="handleVoiceEnd"
          @touchcancel="handleVoiceEnd"
        >
          <view class="i-carbon-microphone text-48px text-white" />
          <view
            v-if="isRecording"
            class="absolute inset-0 animate-ping border-2 border-red-300 rounded-full"
          />
        </view>

        <view v-if="isRecording" class="mt-4 flex flex-col items-center">
          <text class="text-2xl text-white font-bold font-mono">
            {{ formatTime(recordTime) }}
          </text>
          <view class="mt-2 flex items-center gap-1">
            <view class="h-1 w-1 animate-pulse rounded-full bg-red-500" />
            <view class="h-1 w-1 animate-pulse rounded-full bg-red-500" style="animation-delay: 0.2s" />
            <view class="h-1 w-1 animate-pulse rounded-full bg-red-500" style="animation-delay: 0.4s" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.warning-banner {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  margin: 8px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.warning-content {
  flex: 1;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.warning-title {
  font-size: 15px;
  font-weight: 600;
  color: #60a5fa;
}

.warning-body {
  display: flex;
  flex-direction: column;
}

.warning-text {
  font-size: 13px;
  color: #93c5fd;
  line-height: 1.5;
}

.warning-close {
  padding: 4px;
  margin-left: 8px;
}

.notice-banner {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  margin: 8px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%);
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.notice-content {
  flex: 1;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.notice-title {
  font-size: 15px;
  font-weight: 600;
  color: #fbbf24;
}

.notice-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notice-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.notice-dot {
  width: 6px;
  height: 6px;
  min-width: 6px;
  margin-top: 7px;
  background: #fbbf24;
  border-radius: 50%;
}

.notice-text {
  font-size: 13px;
  color: #d1d5db;
  line-height: 1.5;
}

.notice-close {
  padding: 4px;
  margin-left: 8px;
}

.quality-selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 100;
}

.quality-selector {
  width: 100%;
  background: #1a1a1a;
  border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.quality-selector-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.quality-selector-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.quality-options {
  padding: 8px 0;
}

.quality-option {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.quality-option-active {
  background: rgba(59, 130, 246, 0.1);
}

.quality-option-label {
  font-size: 15px;
  color: #fff;
  min-width: 48px;
}

.quality-option-desc {
  font-size: 13px;
  color: #9ca3af;
  flex: 1;
}

@keyframes ping {
  75%,
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
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
