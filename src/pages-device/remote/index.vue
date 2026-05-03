<script setup lang="ts">
import type { ConnectResponse } from '@/api/types/device'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { startRemote, stopStream } from '@/api/device'
import LivePlayer from '@/components/LivePlayer/LivePlayer.vue'
import { useTokenStore } from '@/store/token'
import { getEnvBaseUrl } from '@/utils'
import { safeAreaInsets } from '@/utils/systemInfo'

interface WxSocket {
  id?: string
  connected: boolean
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler?: (...args: unknown[]) => void) => void
  emit: (event: string, ...args: unknown[]) => void
  disconnect: () => void
  connect: () => void
}

defineOptions({ name: 'DeviceRemotePage' })

const props = defineProps<{
  deviceId: string
  deviceName: string
}>()

class WxSocketIOClient implements WxSocket {
  id?: string
  connected = false

  private url: string
  private namespace: string
  private socketTask: UniApp.SocketTask | null = null
  private eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()
  private pingInterval: number = 25000
  private pingTimeout: number = 20000
  private lastPingTime: number = 0
  private heartbeatTimer: number | null = null
  private auth: Record<string, unknown>

  constructor(url: string, namespace: string = '/', auth: Record<string, unknown> = {}) {
    this.url = url
    this.namespace = namespace
    this.auth = auth
    this.connect()
  }

  connect(): void {
    if (this.socketTask)
      return

    const queryStr = `EIO=4&transport=websocket&token=${this.auth.token || ''}`
    const fullUrl = `${this.url}?${queryStr}`

    this.socketTask = uni.connectSocket({
      url: fullUrl,
      success: () => {},
      fail: (err) => {
        this.trigger('connect_error', new Error(err.errMsg || '连接失败'))
      },
    })

    this.socketTask.onOpen(() => {})
    this.socketTask.onMessage(res => this.handleMessage(res.data as string))
    this.socketTask.onClose((res) => {
      this.connected = false
      this.socketTask = null
      this.stopHeartbeatMonitor()
      this.trigger('disconnect', res.reason || '连接关闭')
    })
    this.socketTask.onError(() => {
      this.trigger('connect_error', new Error('WebSocket 错误'))
    })
  }

  private handleMessage(data: string): void {
    const packetType = Number.parseInt(data[0], 10)
    const payload = data.slice(1)
    switch (packetType) {
      case 0: this.handleOpen(payload); break
      case 2: this.lastPingTime = Date.now(); this.sendPong(); break
      case 4: this.handleSocketIOMessage(payload); break
    }
  }

  private handleOpen(payload: string): void {
    const data = JSON.parse(payload)
    this.id = data.sid
    this.pingInterval = data.pingInterval || 25000
    this.pingTimeout = data.pingTimeout || 20000
    const authStr = Object.keys(this.auth).length > 0 ? JSON.stringify(this.auth) : ''
    this.sendRaw(`40${this.namespace},${authStr}`)
    this.startHeartbeatMonitor()
  }

  private handleSocketIOMessage(payload: string): void {
    if (!payload)
      return
    const socketIOType = Number.parseInt(payload[0], 10)
    const eventData = payload.slice(1)
    switch (socketIOType) {
      case 0: this.connected = true; this.trigger('connect'); break
      case 1: this.trigger('disconnect', 'server disconnect'); break
      case 2: this.handleEvent(eventData); break
    }
  }

  private handleEvent(data: string): void {
    let eventData = data
    if (data.startsWith('/')) {
      const commaIndex = data.indexOf(',')
      if (commaIndex > 0)
        eventData = data.substring(commaIndex + 1)
      else return
    }
    const parsed = JSON.parse(eventData)
    if (Array.isArray(parsed) && parsed.length > 0) {
      this.trigger(parsed[0], ...parsed.slice(1))
    }
  }

  private sendRaw(data: string): void {
    this.socketTask?.send({ data, success: () => {}, fail: () => {} })
  }

  private sendPong(): void { this.sendRaw('3') }

  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor()
    this.lastPingTime = Date.now()
    const effectiveTimeout = (this.pingInterval + this.pingTimeout) * 1.5
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastPingTime > effectiveTimeout)
        this.disconnect()
    }, 10000) as unknown as number
  }

  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event))
      this.eventHandlers.set(event, new Set())
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event))
      return
    if (handler)
      this.eventHandlers.get(event)!.delete(handler)
    else this.eventHandlers.delete(event)
  }

  private trigger(event: string, ...args: unknown[]): void {
    this.eventHandlers.get(event)?.forEach((h) => {
      try { h(...args) }
      catch {}
    })
  }

  emit(event: string, ...args: unknown[]): void {
    const data = JSON.stringify([event, ...args])
    if (this.namespace && this.namespace !== '/') {
      this.sendRaw(`42${this.namespace},${data}`)
    }
    else {
      this.sendRaw(`42${data}`)
    }
  }

  disconnect(): void {
    this.stopHeartbeatMonitor()
    this.socketTask?.close({ code: 1000, reason: 'Client disconnect' })
    this.socketTask = null
    this.connected = false
  }
}

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
const connecting = ref(true)
const error = ref('')
const sessionId = ref('')
const streamName = ref('')
const hlsUrl = ref('')
const flvUrl = ref('')
const rtmpUrl = ref('')
const isFullscreen = ref(false)
const playerHeight = ref(300)
const connectionTimeout = ref<number | null>(null)
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

const streamUrl = computed(() => {
  // #ifdef APP-PLUS
  if (currentStreamType.value === 'rtmp') {
    return rtmpUrl.value
  }
  return hlsUrl.value
  // #endif
  // #ifdef MP-WEIXIN
  return hlsUrl.value
  // #endif
  return hlsUrl.value
})

let socket: WxSocket | null = null
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

  socket = new WxSocketIOClient(wsUrl, '/device-control', { token })

  connectionTimeout.value = setTimeout(() => {
    if (loading.value && !sessionId.value) {
      error.value = '连接超时，请检查设备是否在线'
      loading.value = false
      connecting.value = false
      socket?.disconnect()
      uni.showToast({ title: '连接超时', icon: 'none' })
    }
  }, CONNECTION_TIMEOUT) as unknown as number

  socket.on('connect', () => {
    console.log('[DeviceRemote] Socket.IO 已连接')
  })

  socket.on('connect_response', (data: unknown) => {
    console.log('[DeviceRemote] 收到连接响应:', data)
    const response = data as ConnectResponse
    if (response.code !== 200) {
      clearTimeout(connectionTimeout.value!)
      error.value = response.msg
      loading.value = false
    }
    else {
      startStream()
    }
  })

  socket.on('stream_started', (data: unknown) => {
    console.log('[DeviceRemote] 收到推流开始:', data)
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
      connecting.value = false
    }
  })

  socket.on('error', (data: unknown) => {
    console.error('[DeviceRemote] 收到错误:', data)
    const errData = data as { msg?: string }
    error.value = errData.msg || '发生错误'
    loading.value = false
  })

  socket.on('stream_stopped', () => {
    error.value = '推流已停止'
    hlsUrl.value = ''
  })

  socket.on('disconnect', () => {
    connecting.value = false
  })

  socket.on('connect_error', () => {
    error.value = '连接错误'
    loading.value = false
  })
}

async function startStream() {
  try {
    const res = await startRemote(props.deviceId)
    sessionId.value = res.sessionId
    streamName.value = res.streamName
    hlsUrl.value = res.hlsUrl || `https://live.hqzx.me/live/${res.streamName}/index.m3u8`
    flvUrl.value = res.httpFlvUrl || ''
    rtmpUrl.value = `rtmp://117.72.166.182:1935/live/${res.streamName}`

    console.log('[DeviceRemote] 等待推流准备...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (streamUrl.value) {
      clearTimeout(connectionTimeout.value!)
      loading.value = false
      connecting.value = false
    }
  }
  catch (e) {
    console.error('[DeviceRemote] 开始推流失败:', e)
    error.value = '开始推流失败'
    loading.value = false
  }
}

function onPlayerReady() {
  console.log('[DeviceRemote] 播放器就绪')
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
  console.error('[DeviceRemote] 播放错误:', e)

  if (isPlaying.value) {
    console.log('[DeviceRemote] 已在播放中，忽略错误')
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
      console.log(`[DeviceRemote] ${retryingText.value}`)
      setTimeout(() => {
        isPlaying.value = false
        playerRef.value?.reload()
      }, 2000)
      return
    }
    else {
      console.log('[DeviceRemote] RTMP 重试失败，切换到 HLS')
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
      console.log(`[DeviceRemote] ${retryingText.value}`)
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

async function cleanup() {
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
        console.error('[DeviceRemote] 停止推流失败:', e)
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
  connectWebSocket()
})

onUnload(() => {
  cleanup()
})
</script>

<template>
  <view class="min-h-screen bg-black" :style="{ paddingTop: `${safeAreaInsets?.top}px` }">
    <view v-if="!isFullscreen" class="flex items-center justify-between bg-black/50 px-4 py-3">
      <view class="flex items-center" @click="goBack">
        <view class="i-carbon-arrow-left text-24px text-white" />
      </view>
      <view class="text-white font-medium">
        {{ deviceName }} - 远程控制
      </view>
      <view class="w-6" />
    </view>

    <view v-if="loading" class="flex flex-col items-center justify-center py-32">
      <qiun-loading />
      <text class="mt-3 text-sm text-gray-400">{{ connecting ? '连接中...' : '加载中...' }}</text>
    </view>

    <view v-else-if="error" class="flex flex-col items-center justify-center py-32">
      <view class="mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-gray-800">
        <view class="i-carbon-warning text-32px text-gray-400" />
      </view>
      <text class="text-sm text-gray-400">{{ error }}</text>
      <view class="mt-4 rounded-lg bg-blue-500 px-6 py-2" @click="goBack">
        <text class="text-sm text-white">返回</text>
      </view>
    </view>

    <view v-else class="flex flex-col">
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
          <view class="flex items-center justify-end">
            <view
              class="h-9 w-9 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm active:bg-white/20"
              @click="toggleFullscreen"
            >
              <view v-if="!isFullscreen" class="i-carbon-expand text-18px text-white" />
              <view v-else class="i-carbon-collapse text-18px text-white" />
            </view>
          </view>
        </view>
      </view>

      <view v-if="!isFullscreen" class="flex flex-1 flex-col items-center justify-center p-6">
        <view class="mb-6 text-center text-sm text-gray-400">
          屏幕实时捕获预览
        </view>

        <view class="rounded-xl bg-gray-800 p-4">
          <view class="text-center text-xs text-gray-500">
            控制功能开发中...
          </view>
          <view class="mt-2 text-center text-xs text-gray-600">
            当前仅支持查看屏幕画面
          </view>
        </view>

        <view class="grid grid-cols-3 mt-6 gap-4">
          <view class="flex flex-col items-center rounded-lg bg-gray-800 p-3">
            <view class="i-carbon-cursor-1 text-24px text-gray-500" />
            <text class="mt-1 text-xs text-gray-500">鼠标控制</text>
            <text class="text-xs text-gray-600">待开发</text>
          </view>
          <view class="flex flex-col items-center rounded-lg bg-gray-800 p-3">
            <view class="i-carbon-keyboard text-24px text-gray-500" />
            <text class="mt-1 text-xs text-gray-500">键盘输入</text>
            <text class="text-xs text-gray-600">待开发</text>
          </view>
          <view class="flex flex-col items-center rounded-lg bg-gray-800 p-3">
            <view class="i-carbon-document text-24px text-gray-500" />
            <text class="mt-1 text-xs text-gray-500">文件传输</text>
            <text class="text-xs text-gray-600">待开发</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
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
