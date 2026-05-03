<script setup lang="ts">
import type { MorePluginItem } from '@/plugin/types'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import TourGuide from '@/components/TourGuide/TourGuide.vue'
import { getTourSteps, PAGE_PATHS, TOUR_VERSION } from '@/config/tourSteps'
import { wechatPluginEngine } from '@/plugin'
import { useTourStore } from '@/store/tour'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'MorePlugins' })
definePage({
  type: 'page',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const tourStore = useTourStore()
const showTour = ref(false)
const tourSteps = getTourSteps(PAGE_PATHS.more)

const plugins = ref<MorePluginItem[]>([])
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')

function isHtmlEntity(icon: string | undefined): boolean {
  return icon ? icon.startsWith('&#') : false
}

async function loadPlugins() {
  try {
    await wechatPluginEngine.init()
    plugins.value = wechatPluginEngine.getMorePagePlugins()
    error.value = ''
  }
  catch (e) {
    console.error('[More] 加载插件列表失败:', e)
    error.value = '加载失败，请重试'
  }
  finally {
    loading.value = false
    refreshing.value = false
    uni.stopPullDownRefresh()
  }
}

function openPlugin(plugin: MorePluginItem) {
  if (!plugin.webviewUrl) {
    uni.showToast({ title: '该插件暂不可用', icon: 'none' })
    return
  }

  uni.navigateTo({
    url: `/pages-plugin-webview/index?plugin=${encodeURIComponent(plugin.pluginId)}`,
  })
}

onMounted(() => {
  loadPlugins()
})

onShow(() => {
  if (tourStore.shouldShowPageTour(PAGE_PATHS.more, TOUR_VERSION)) {
    setTimeout(() => {
      showTour.value = true
    }, 500)
  }
})

onPullDownRefresh(() => {
  refreshing.value = true
  loadPlugins()
})

function handleTourComplete() {
  tourStore.markPageCompleted(PAGE_PATHS.more)
  showTour.value = false
}

function handleTourSkip() {
  tourStore.skipPageTour(PAGE_PATHS.more)
  showTour.value = false
}
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ marginTop: `${safeAreaInsets?.top}px` }">
    <view class="flex items-center justify-between border-b bg-white px-5 py-3">
      <view class="text-xl text-gray-800 font-bold">
        插件中心
      </view>
      <view v-if="plugins.length > 0" class="text-xs text-gray-400">
        共 {{ plugins.length }} 个插件
      </view>
    </view>

    <view v-if="loading" class="flex flex-col items-center justify-center py-20">
      <qiun-loading />
      <text class="mt-3 text-sm text-gray-400">正在加载插件...</text>
    </view>

    <view v-else-if="error" class="flex flex-col items-center justify-center py-20">
      <view class="mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-gray-100">
        <wd-icon name="warning" size="32px" color="#9ca3af" />
      </view>
      <text class="text-sm text-gray-500">{{ error }}</text>
      <view class="mt-4 rounded-lg bg-blue-500 px-6 py-2" @click="loadPlugins">
        <text class="text-sm text-white">重新加载</text>
      </view>
    </view>

    <view v-else-if="plugins.length === 0" class="flex flex-col items-center justify-center py-20">
      <view class="mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-gray-100">
        <wd-icon name="plugin" size="32px" color="#9ca3af" />
      </view>
      <text class="text-sm text-gray-400">暂无可用插件</text>
    </view>

    <view v-else class="p-4">
      <view class="tour-more-apps overflow-hidden rounded-2xl bg-white shadow-sm">
        <view class="grid grid-cols-4 gap-y-4 p-4">
          <view
            v-for="plugin in plugins"
            :key="plugin.pluginId"
            class="flex flex-col items-center justify-center py-2"
            @click="openPlugin(plugin)"
          >
            <view class="h-12 w-12 flex items-center justify-center rounded-xl from-blue-500 to-purple-600 bg-gradient-to-br">
              <text v-if="plugin.icon?.startsWith('ri:')" class="text-xl text-white" :class="`i-${plugin.icon}`" />
              <text v-else-if="isHtmlEntity(plugin.icon)" class="text-xl text-white">
                {{ plugin.icon }}
              </text>
              <wd-icon v-else name="plugin" size="24px" color="#fff" />
            </view>
            <text class="mt-2 max-w-full truncate px-1 text-xs text-gray-700">{{ plugin.name }}</text>
          </view>
        </view>
      </view>

      <view v-if="plugins.length > 0" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <view class="border-b border-gray-100 px-4 py-3">
          <text class="text-sm text-gray-800 font-medium">插件详情</text>
        </view>
        <view class="divide-y divide-gray-100">
          <view
            v-for="plugin in plugins"
            :key="`detail-${plugin.pluginId}`"
            class="flex cursor-pointer items-center px-4 py-3 transition-all duration-200 active:bg-gray-50"
            @click="openPlugin(plugin)"
          >
            <view class="mr-3 h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-lg from-blue-500 to-purple-600 bg-gradient-to-br">
              <text v-if="plugin.icon?.startsWith('ri:')" class="text-lg text-white" :class="`i-${plugin.icon}`" />
              <text v-else-if="isHtmlEntity(plugin.icon)" class="text-lg text-white">
                {{ plugin.icon }}
              </text>
              <wd-icon v-else name="plugin" size="20px" color="#fff" />
            </view>

            <view class="min-w-0 flex-1">
              <view class="text-sm text-gray-800 font-medium">
                {{ plugin.name }}
              </view>
              <view v-if="plugin.description" class="mt-0.5 truncate text-xs text-gray-500">
                {{ plugin.description }}
              </view>
            </view>

            <view class="ml-2 flex-shrink-0">
              <wd-icon name="arrow-right" size="16px" color="#9ca3af" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <TourGuide
      v-model:show="showTour"
      :steps="tourSteps"
      @complete="handleTourComplete"
      @skip="handleTourSkip"
    />
  </view>
</template>
