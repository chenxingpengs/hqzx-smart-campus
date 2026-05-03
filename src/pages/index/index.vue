<script setup lang="ts">
import type { BannerItem } from '@/components/BannerSwiper/BannerSwiper.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import BannerSwiper from '@/components/BannerSwiper/BannerSwiper.vue'
import TourGuide from '@/components/TourGuide/TourGuide.vue'
import { TOUR_VERSION, tourSteps } from '@/config/tourSteps'
import { useTourStore } from '@/store/tour'
import { useUserStore } from '@/store/user'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'SmartCampusHome' })
definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const userStore = useUserStore()
const tourStore = useTourStore()
const today = ref('')
const showTour = ref(false)

const isAdmin = computed(() => userStore.isAdmin)
const isTeacher = computed(() => userStore.isTeacher)
const isStudent = computed(() => userStore.isStudent)

const bannerList = ref<BannerItem[]>([
  {
    id: 1,
    image: 'https://mmbiz.qpic.cn/mmbiz_jpg/gJwUDscO4FmKJxjxgpChq0VPzzJeYg32d67bykhV5Oz0n86ia08u6bYMUbJaG8VR06egkg7bZp85F5N8qsyTSEt4oyjXcuHhZ2Xu8sKWRLuo/0?wx_fmt=jpeg',
  },
  {
    id: 2,
    image: 'https://mmbiz.qpic.cn/mmbiz_jpg/NIUw4E8D3ic1lib3vBCHRxFiaZPSic6iaW3vGy5oJRdiaNph6iaBD0UPaZOjTvjXZSV4yDKHmnn6hoDBtx8ECsP3Ribtcw/0?wx_fmt=jpeg',
  },
])

const quickActions = computed(() => {
  const actions = []

  if (isTeacher.value || isAdmin.value) {
    actions.push({
      id: 'attendance',
      name: '考勤管理',
      icon: 'i-carbon-calendar',
      color: 'from-orange-400 to-orange-500',
      path: '/pages/attendance/index',
    })
    actions.push({
      id: 'device',
      name: '设备管理',
      icon: 'i-carbon-screen',
      color: 'from-indigo-400 to-indigo-500',
      path: '/pages-device/list/index',
    })
    actions.push({
      id: 'notification',
      name: '发送通知',
      icon: 'i-carbon-notification',
      color: 'from-red-400 to-red-500',
      path: '/pages-notification/notification/index',
    })
    actions.push({
      id: 'page-call',
      name: '寻人传呼',
      icon: 'i-carbon-user-multiple',
      color: 'from-purple-400 to-purple-500',
      path: '/pages-notification/page-call/index',
    })
  }

  actions.push({
    id: 'lostfound',
    name: '寻物启事',
    icon: 'i-carbon-search-locate',
    color: 'from-amber-400 to-amber-500',
    path: '/pages-lostfound/list/index',
  })

  actions.push({
    id: 'plugins',
    name: '应用中心',
    icon: 'i-carbon-grid',
    color: 'from-blue-400 to-blue-500',
    path: '/pages/more/index',
  })

  actions.push({
    id: 'activity',
    name: '校园活动',
    icon: 'i-carbon-star',
    color: 'from-green-400 to-green-500',
    path: '/pages/activity/list/index',
  })

  actions.push({
    id: 'message',
    name: '消息中心',
    icon: 'i-carbon-chat',
    color: 'from-cyan-400 to-cyan-500',
    path: '/pages/chat/index',
  })

  actions.push({
    id: 'profile',
    name: '个人中心',
    icon: 'i-carbon-user',
    color: 'from-pink-400 to-pink-500',
    path: '/pages/me/me',
  })

  return actions
})

const announcements = ref([
  { id: 1, title: '欢迎使用智慧校园系统', date: '2024-01-01', type: 'system' },
])

onLoad(() => {
  updateDateTime()
  console.log('[首页] onLoad, 引导状态:', {
    completed: tourStore.completed,
    skipped: tourStore.skipped,
    version: tourStore.version,
    shouldShow: tourStore.shouldShowTour(TOUR_VERSION),
  })
})

onShow(() => {
  updateDateTime()
  console.log('[首页] onShow, 引导状态:', {
    completed: tourStore.completed,
    skipped: tourStore.skipped,
    version: tourStore.version,
    shouldShow: tourStore.shouldShowTour(TOUR_VERSION),
    showTour: showTour.value,
  })
  if (tourStore.shouldShowTour(TOUR_VERSION) && !showTour.value) {
    console.log('[首页] 准备显示引导...')
    setTimeout(() => {
      showTour.value = true
      console.log('[首页] showTour 已设置为 true')
    }, 500)
  }
})

onMounted(() => {
  console.log('[首页] onMounted, 引导状态:', {
    completed: tourStore.completed,
    skipped: tourStore.skipped,
    version: tourStore.version,
    shouldShow: tourStore.shouldShowTour(TOUR_VERSION),
  })
  if (tourStore.shouldShowTour(TOUR_VERSION)) {
    console.log('[首页] onMounted 准备显示引导...')
    setTimeout(() => {
      showTour.value = true
      console.log('[首页] onMounted showTour 已设置为 true')
    }, 500)
  }
})

function updateDateTime() {
  const date = new Date()
  today.value = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

function handleScanCode() {
  uni.scanCode({
    async success(res) {
      console.log('扫码结果:', res)
      let token = res.result

      if (token && token.includes('token=')) {
        const match = token.match(/token=([^&]+)/)
        if (match && match[1]) {
          token = match[1]
        }
      }

      if (token) {
        uni.navigateTo({
          url: `/pages-notification/bindConfirm/index?token=${encodeURIComponent(token)}`,
        })
      }
    },
    fail(res) {
      console.error('扫码失败:', res)
      uni.showToast({ title: '扫码失败，请重试', icon: 'none' })
    },
  })
}

function navigateTo(path: string) {
  const tabBarPages = ['/pages/index/index', '/pages/chat/index', '/pages/more/index', '/pages/me/me']
  if (tabBarPages.includes(path)) {
    uni.switchTab({ url: path })
  }
  else {
    uni.navigateTo({ url: path })
  }
}

function handleComplete() {
  tourStore.markCompleted()
  showTour.value = false
}

function handleSkip() {
  tourStore.skipTour()
  showTour.value = false
}
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ marginTop: `${safeAreaInsets?.top}px` }">
    <view class="school-name from-blue-500 to-blue-600 bg-gradient-to-br px-5 pb-4 pt-3">
      <view class="flex items-center justify-between">
        <view>
          <view class="text-xl text-white font-bold">
            珠海市红旗中学
          </view>
        </view>
        <view class="flex items-center space-x-3">
          <view class="scan-button h-10 w-10 flex items-center justify-center rounded-full bg-white/20" @click="handleScanCode">
            <wd-icon name="scan" size="22px" color="#fff" />
          </view>
        </view>
      </view>
    </view>

    <view class="mx-4 mt-4">
      <BannerSwiper :list="bannerList" height="160px" />
    </view>

    <view class="quick-actions mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <view class="mb-3 text-base text-gray-800 font-semibold">
        快捷入口
      </view>
      <view class="grid grid-cols-4 gap-4">
        <view
          v-for="action in quickActions"
          :key="action.id"
          class="flex flex-col items-center"
          @click="navigateTo(action.path)"
        >
          <view class="h-12 w-12 flex items-center justify-center rounded-xl bg-gradient-to-br" :class="action.color">
            <view class="text-xl text-white" :class="action.icon" />
          </view>
          <text class="mt-2 text-xs text-gray-600">{{ action.name }}</text>
        </view>
      </view>
    </view>

    <view class="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-center justify-between">
        <view class="text-base text-gray-800 font-semibold">
          通知公告
        </view>
        <view class="text-xs text-gray-400">
          更多
        </view>
      </view>
      <view v-if="announcements.length === 0" class="py-6 text-center text-sm text-gray-400">
        暂无通知
      </view>
      <view v-else class="space-y-3">
        <view
          v-for="item in announcements"
          :key="item.id"
          class="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
        >
          <view class="flex-1">
            <view class="text-sm text-gray-800">
              {{ item.title }}
            </view>
            <view class="mt-1 text-xs text-gray-400">
              {{ item.date }}
            </view>
          </view>
          <wd-icon name="arrow-right" size="16px" color="#9ca3af" />
        </view>
      </view>
    </view>

    <view class="common-functions mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <view class="mb-3 text-base text-gray-800 font-semibold">
        常用功能
      </view>
      <view class="grid grid-cols-2 gap-3">
        <view
          v-if="isTeacher || isAdmin"
          class="flex items-center rounded-xl bg-orange-50 p-3"
          @click="navigateTo('/pages/attendance/index')"
        >
          <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-500">
            <view class="i-carbon-calendar text-lg text-white" />
          </view>
          <view class="ml-3">
            <view class="text-sm text-gray-800 font-medium">
              考勤管理
            </view>
            <view class="text-xs text-gray-500">
              晚午托考勤
            </view>
          </view>
        </view>

        <view
          v-if="isTeacher || isAdmin"
          class="flex items-center rounded-xl bg-red-50 p-3"
          @click="navigateTo('/pages-notification/notification/index')"
        >
          <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-red-500">
            <view class="i-carbon-notification text-lg text-white" />
          </view>
          <view class="ml-3">
            <view class="text-sm text-gray-800 font-medium">
              发送通知
            </view>
            <view class="text-xs text-gray-500">
              集控通知推送
            </view>
          </view>
        </view>

        <view
          v-if="isTeacher || isAdmin"
          class="flex items-center rounded-xl bg-purple-50 p-3"
          @click="navigateTo('/pages-notification/page-call/index')"
        >
          <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-500">
            <view class="i-carbon-user-multiple text-lg text-white" />
          </view>
          <view class="ml-3">
            <view class="text-sm text-gray-800 font-medium">
              寻人传呼
            </view>
            <view class="text-xs text-gray-500">
              远程呼叫学生
            </view>
          </view>
        </view>

        <view
          class="flex items-center rounded-xl bg-amber-50 p-3"
          @click="navigateTo('/pages-lostfound/list/index')"
        >
          <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-amber-500">
            <view class="i-carbon-search-locate text-lg text-white" />
          </view>
          <view class="ml-3">
            <view class="text-sm text-gray-800 font-medium">
              寻物启事
            </view>
            <view class="text-xs text-gray-500">
              丢失/拾到物品
            </view>
          </view>
        </view>

        <view
          class="flex items-center rounded-xl bg-blue-50 p-3"
          @click="navigateTo('/pages/more/index')"
        >
          <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-500">
            <view class="i-carbon-grid text-lg text-white" />
          </view>
          <view class="ml-3">
            <view class="text-sm text-gray-800 font-medium">
              应用中心
            </view>
            <view class="text-xs text-gray-500">
              更多应用
            </view>
          </view>
        </view>

        <view
          class="flex items-center rounded-xl bg-green-50 p-3"
          @click="navigateTo('/pages/me/me')"
        >
          <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-green-500">
            <view class="i-carbon-user text-lg text-white" />
          </view>
          <view class="ml-3">
            <view class="text-sm text-gray-800 font-medium">
              个人中心
            </view>
            <view class="text-xs text-gray-500">
              个人信息设置
            </view>
          </view>
        </view>
      </view>
    </view>

    <TourGuide
      v-model:show="showTour"
      :steps="tourSteps"
      @complete="handleComplete"
      @skip="handleSkip"
    />
  </view>
</template>

<style scoped>
</style>
