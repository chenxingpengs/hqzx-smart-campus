<script lang="ts" setup>
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import TourGuide from '@/components/TourGuide/TourGuide.vue'
import { getTourSteps, PAGE_PATHS, TOUR_VERSION } from '@/config/tourSteps'
import { LOGIN_PAGE } from '@/router/config'
import { useUserStore } from '@/store'
import { useTokenStore } from '@/store/token'
import { useTourStore } from '@/store/tour'
import { getStaticUrl } from '@/utils'
import { getCachedAvatar } from '@/utils/avatarCache'

definePage({
  style: {
    navigationBarTitleText: '我的',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const userStore = useUserStore()
const tokenStore = useTokenStore()
const tourStore = useTourStore()
const { userInfo } = storeToRefs(userStore)

const cachedAvatarUrl = ref('')
const showTour = ref(false)
const tourSteps = getTourSteps(PAGE_PATHS.me)

async function loadCachedAvatar() {
  const avatarUrl = getStaticUrl(userInfo.value.avatar)
  if (avatarUrl) {
    cachedAvatarUrl.value = await getCachedAvatar(avatarUrl)
  }
  else {
    cachedAvatarUrl.value = ''
  }
}

onMounted(() => {
  loadCachedAvatar()
})

onShow(() => {
  if (tourStore.shouldShowPageTour(PAGE_PATHS.me, TOUR_VERSION)) {
    setTimeout(() => {
      showTour.value = true
    }, 500)
  }
})

watch(() => userInfo.value.avatar, () => {
  loadCachedAvatar()
})

const isAdmin = computed(() => userStore.isAdmin)
const isTeacher = computed(() => userStore.isTeacher)
const hasLogin = computed(() => tokenStore.hasValidLogin)

const userRoleText = computed(() => {
  if (isAdmin.value)
    return '管理员'
  if (isTeacher.value)
    return '教师'
  return '用户'
})

const userRoleClass = computed(() => {
  if (isAdmin.value)
    return 'bg-red-500'
  if (isTeacher.value)
    return 'bg-blue-500'
  return 'bg-gray-500'
})

const menuItems = computed(() => {
  const items = [
    { id: 'profile', icon: 'user', title: '个人资料', path: '/pages-me-sub/profile/index', color: '#3b82f6' },
    { id: 'myClass', icon: 'usergroup', title: '我的班级', path: '/pages-me-sub/myClass/index', color: '#10b981', show: isTeacher.value },
    { id: 'stats', icon: 'chart', title: '考勤统计', path: '/pages-me-sub/stats/index', color: '#f59e0b', show: isTeacher.value },
    { id: 'swap', icon: 'refresh', title: '换班记录', path: '/pages-me-sub/swap/index', color: '#8b5cf6', show: isTeacher.value },
    { id: 'view-guide', icon: 'info-outline', title: '查看引导', path: '', color: '#1890ff', action: 'showTour' },
    { id: 'settings', icon: 'setting', title: '系统设置', path: '/pages-me-sub/settings/index', color: '#6b7280' },
    { id: 'about', icon: 'info-circle', title: '关于我们', path: '/pages-me-sub/about/index', color: '#06b6d4' },
  ]
  return items.filter(item => item.show !== false)
})

function handleLogin() {
  // #ifdef MP-WEIXIN
  tokenStore.wxLogin()
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateTo({
    url: `${LOGIN_PAGE}`,
  })
  // #endif
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        tokenStore.logout()
        uni.showToast({
          title: '退出登录成功',
          icon: 'success',
        })
      }
    },
  })
}

function handleMenuClick(item: any) {
  if (item.action === 'showTour') {
    tourStore.resetTour()
    uni.switchTab({
      url: '/pages/index/index',
    })
  }
  else {
    uni.navigateTo({
      url: item.path,
      fail: () => {
        uni.showToast({
          title: '页面开发中',
          icon: 'none',
        })
      },
    })
  }
}

function handleTourComplete() {
  tourStore.markPageCompleted(PAGE_PATHS.me)
  showTour.value = false
}

function handleTourSkip() {
  tourStore.skipPageTour(PAGE_PATHS.me)
  showTour.value = false
}

const defaultAvatar = '/static/images/default-avatar.png'
</script>

<template>
  <scroll-view scroll-y class="profile-container min-h-screen bg-gray-50">
    <!-- 用户信息头部 -->
    <view class="user-header tour-me-header mt-5 from-blue-500 to-blue-600 bg-gradient-to-br px-5 pb-10 pt-12">
      <view class="flex items-center">
        <!-- 头像 -->
        <view class="relative">
          <image
            class="h-20 w-20 border-4 border-white rounded-full bg-white shadow-lg"
            :src="cachedAvatarUrl || defaultAvatar"
            mode="aspectFill"
          />
          <view v-if="hasLogin" class="absolute bottom-0 right-0 h-6 w-6 flex items-center justify-center border-2 border-white rounded-full bg-green-400">
            <wd-icon name="check" size="14" color="#fff" />
          </view>
        </view>

        <!-- 用户信息 -->
        <view class="ml-4 flex-1">
          <view v-if="hasLogin" class="text-white">
            <view class="mb-2 text-xl font-bold">
              {{ userInfo.nickname || userInfo.username || '用户' }}
            </view>
            <view class="flex items-center">
              <view class="rounded-full px-3 py-1 text-xs text-white" :class="[userRoleClass]">
                {{ userRoleText }}
              </view>
            </view>
          </view>
          <view v-else class="text-white">
            <view class="mb-2 text-xl font-bold">
              未登录
            </view>
            <view class="text-sm text-white/80">
              点击登录使用完整功能
            </view>
          </view>
        </view>

        <!-- 编辑按钮 -->
        <view v-if="hasLogin" class="h-10 w-10 flex items-center justify-center rounded-full bg-white/20" @click="handleMenuClick({ path: '/pages-me-sub/profile/index' })">
          <wd-icon name="setting" size="18" color="#fff" />
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-list tour-me-menu relative z-10 px-4 -mt-5">
      <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
        <view
          v-for="(item, index) in menuItems"
          :key="item.id"
          class="flex items-center px-5 py-4 active:bg-gray-50"
          :class="{ 'border-b border-gray-100': index < menuItems.length - 1, 'tour-me-guide': item.action === 'showTour' }"
          @click="handleMenuClick(item)"
        >
          <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl" :style="{ backgroundColor: `${item.color}15` }">
            <wd-icon :name="item.icon" size="22" :color="item.color" />
          </view>
          <view class="flex-1 text-base text-gray-800">
            {{ item.title }}
          </view>
          <wd-icon name="arrow-right" size="16" color="#c0c4cc" />
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view v-if="hasLogin" class="mt-6 px-4">
      <view
        class="rounded-2xl bg-white py-4 text-center text-red-500 font-medium active:bg-gray-50"
        @click="handleLogout"
      >
        退出登录
      </view>
    </view>

    <!-- 登录按钮 -->
    <view v-else class="mt-6 px-4">
      <view
        class="rounded-2xl from-blue-500 to-blue-600 bg-gradient-to-r py-4 text-center text-white font-medium active:opacity-80"
        @click="handleLogin"
      >
        立即登录
      </view>
    </view>

    <!-- 版权信息 -->
    <view class="mt-10 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-gray-400">
      <view>珠海市红旗中学</view>
      <view class="mt-1">
        课后服务考勤系统 v1.0.0
      </view>
    </view>

    <TourGuide
      v-model:show="showTour"
      :steps="tourSteps"
      @complete="handleTourComplete"
      @skip="handleTourSkip"
    />
  </scroll-view>
</template>

<style lang="scss" scoped>
.user-header {
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -30px;
    left: 0;
    right: 0;
    height: 50px;
    background: linear-gradient(to bottom, rgba(59, 130, 246, 0.08), transparent);
    pointer-events: none;
  }
}
</style>
