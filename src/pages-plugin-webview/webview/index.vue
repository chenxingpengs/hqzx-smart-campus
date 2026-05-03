<script setup lang="ts">
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { buildWebviewUrl, handleBridgeMessage, wechatPluginEngine } from '@/plugin'
import { webviewCacheManager } from '@/plugin/cache-manager'

const webviewSrc = ref('')
const pluginId = ref('')
const loading = ref(true)
const pluginName = ref('')
const error = ref('')
const errorType = ref<'network' | 'permission' | 'personal' | 'domain' | 'unknown'>('unknown')
const useCache = ref(false)
const webViewContextRef: UniApp.WebViewContext | null = null

const errorIcon = computed(() => {
  switch (errorType.value) {
    case 'personal':
      return 'info-circle'
    case 'permission':
      return 'lock'
    case 'domain':
      return 'link'
    case 'network':
      return 'wifi-error'
    default:
      return 'warning'
  }
})

const errorIconColor = computed(() => {
  switch (errorType.value) {
    case 'personal':
      return '#f97316'
    case 'permission':
      return '#8b5cf6'
    case 'domain':
      return '#3b82f6'
    case 'network':
      return '#ef4444'
    default:
      return '#ef4444'
  }
})

const errorIconBgClass = computed(() => {
  switch (errorType.value) {
    case 'personal':
      return 'bg-orange-50'
    case 'permission':
      return 'bg-purple-50'
    case 'domain':
      return 'bg-blue-50'
    case 'network':
      return 'bg-red-50'
    default:
      return 'bg-red-50'
  }
})

const errorTitle = computed(() => {
  switch (errorType.value) {
    case 'personal':
      return '功能暂不可用'
    case 'permission':
      return '权限不足'
    case 'domain':
      return '域名配置错误'
    case 'network':
      return '网络连接失败'
    default:
      return '加载失败'
  }
})

const errorDesc = computed(() => {
  switch (errorType.value) {
    case 'personal':
      return '个人主体小程序暂不支持使用此功能'
    case 'permission':
      return '您没有权限访问此页面，请联系管理员'
    case 'domain':
      return '页面域名未在小程序后台配置或配置错误'
    case 'network':
      return '网络连接失败，请检查网络设置后重试'
    default:
      return error.value || '页面加载失败，请稍后重试'
  }
})

onLoad(async (query) => {
  if (!query?.plugin) {
    uni.showToast({ title: '插件参数缺失', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  pluginId.value = query.plugin

  try {
    await wechatPluginEngine.init()
  }
  catch (e) {
    console.error('[WebView] 插件引擎初始化失败:', e)
    error.value = '插件系统初始化失败'
    errorType.value = 'unknown'
    loading.value = false
    return
  }

  const config = wechatPluginEngine.getPluginConfig(pluginId.value)

  if (!config) {
    error.value = '插件不存在或未启用'
    errorType.value = 'unknown'
    loading.value = false
    return
  }

  console.log('[WebView] 插件配置:', JSON.stringify(config, null, 2))

  if (!config.webview_url) {
    error.value = '该插件没有 webview 页面'
    errorType.value = 'unknown'
    loading.value = false
    return
  }

  pluginName.value = config.name

  const localCache = webviewCacheManager.getHtmlFromStorage(pluginId.value)
  if (localCache && !webviewCacheManager.isExpired(pluginId.value, '')) {
    useCache.value = true
    webviewSrc.value = buildWebviewCachedUrl(config.webview_url, localCache.html)
    loading.value = false
    console.log(`[WebView] 使用本地缓存加载插件 ${pluginId.value}`)
  }
  else {
    webviewSrc.value = buildWebviewUrl(config.webview_url)
    loading.value = false
    console.log(`[WebView] 从服务端加载插件 ${pluginId.value}, URL: ${webviewSrc.value}`)
  }

  uni.setNavigationBarTitle({ title: config.name })
})

function buildWebviewCachedUrl(baseUrl: string, htmlContent: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
}

function onWebviewMessage(e: any): void {
  try {
    const rawData = e.detail?.data
    if (!rawData)
      return

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
    if (Array.isArray(data)) {
      data.forEach(msg => handleBridgeMessage(msg))
    }
    else {
      handleBridgeMessage(data)
    }
  }
  catch (error) {
    console.error('[WebView] 消息解析失败:', error)
  }
}

function onWebviewError(e: any): void {
  console.error('[WebView] 加载错误:', e)

  const errorMsg = e?.detail?.errMsg || e?.errMsg || ''
  console.log('[WebView] 错误信息:', errorMsg)

  // 优先判断个人主体错误（个人主体小程序不支持 web-view）
  // 微信可能返回包含 domain 的错误信息，但实际上是因为个人主体限制
  if (
    errorMsg.includes('个人主体')
    || errorMsg.includes('个人类型')
    || errorMsg.includes('个人小程序')
    || errorMsg.includes('不支持 web-view')
    || errorMsg.includes('不支持打开')
    || errorMsg.includes('不支持使用')
    || errorMsg.includes('web-view 组件')
    || errorMsg.includes('业务域名未配置')
    || errorMsg.includes('invalid domain')
    || errorMsg.includes('not in domain list')
    || errorMsg.includes('域名未配置')
  ) {
    // 检查是否是个人主体导致的域名错误
    // 个人主体小程序无法配置业务域名，所以域名错误本质上是个人主体限制
    error.value = '个人主体小程序暂不支持使用此功能'
    errorType.value = 'personal'
    loading.value = false
    console.log('[WebView] 识别为个人主体错误')
    return
  }

  if (errorMsg.includes('permission') || errorMsg.includes('权限')) {
    error.value = '无权限访问此页面'
    errorType.value = 'permission'
    loading.value = false
    return
  }

  const localCache = webviewCacheManager.getHtmlFromStorage(pluginId.value)

  if (localCache) {
    console.log('[WebView] 加载失败，尝试使用缓存')
    webviewSrc.value = buildWebviewCachedUrl('', localCache.html)
    useCache.value = true
    error.value = ''
    errorType.value = 'unknown'
  }
  else {
    error.value = '页面加载失败，请检查网络'
    errorType.value = 'network'
  }
}

function onWebviewLoad(e: any): void {
  console.log('[WebView] 页面加载完成')
}

function retryLoad(): void {
  error.value = ''
  errorType.value = 'unknown'
  loading.value = true
  useCache.value = false

  const config = wechatPluginEngine.getPluginConfig(pluginId.value)
  if (config) {
    webviewSrc.value = buildWebviewUrl(config.webview_url)
  }
  loading.value = false
}

onPullDownRefresh(() => {
  webviewCacheManager.invalidate(pluginId.value)
  retryLoad()
  setTimeout(() => uni.stopPullDownRefresh(), 500)
})
</script>

<template>
  <view class="webview-container">
    <view v-if="loading" class="loading-wrap h-screen flex flex-col items-center justify-center">
      <qiun-loading />
      <text class="mt-2 text-sm text-gray-400">正在加载{{ pluginName }}...</text>
    </view>

    <view v-else-if="error" class="error-wrap h-screen flex flex-col items-center justify-center px-8">
      <view class="mb-4 h-16 w-16 flex items-center justify-center rounded-full" :class="errorIconBgClass">
        <wd-icon :name="errorIcon" size="32px" :color="errorIconColor" />
      </view>
      <text class="mb-2 text-center text-base text-gray-800 font-medium">{{ errorTitle }}</text>
      <text class="mb-4 text-center text-sm text-gray-600">{{ errorDesc }}</text>

      <view v-if="errorType === 'personal'" class="mb-6 w-full rounded-lg bg-orange-50 p-4">
        <view class="flex items-start gap-2">
          <wd-icon name="info-circle" size="16px" color="#f97316" class="mt-0.5" />
          <view class="flex-1">
            <text class="text-xs text-gray-600 leading-relaxed">
              微信小程序规定：个人主体小程序不支持使用 web-view 组件加载外部网页。仅企业、政府、媒体等非个人主体小程序可使用此功能。
            </text>
          </view>
        </view>
      </view>

      <view class="mt-2 max-w-xs w-full flex gap-3">
        <view class="flex-1 border border-gray-200 rounded-lg py-2.5 text-center text-sm text-gray-600" @click="uni.navigateBack()">
          返回
        </view>
        <view
          v-if="errorType !== 'personal'"
          class="flex-1 rounded-lg bg-blue-500 py-2.5 text-center text-sm text-white"
          @click="retryLoad"
        >
          重试
        </view>
      </view>

      <view v-if="useCache" class="mt-4 text-xs text-gray-400">
        当前使用缓存版本
      </view>
    </view>

    <web-view
      v-else-if="webviewSrc"
      ref="webViewContextRef"
      :src="webviewSrc"
      :update-title="true"
      @message="onWebviewMessage"
      @error="onWebviewError"
      @load="onWebviewLoad"
    />
  </view>
</template>

<style lang="scss" scoped>
.webview-container {
  width: 100%;
  height: 100vh;
}
</style>
