<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import TourGuide from '@/components/TourGuide/TourGuide.vue'
import { getTourSteps, PAGE_PATHS, TOUR_VERSION } from '@/config/tourSteps'
import { appAttendanceShiftSwapPendingCountUsingGet, appAttendanceShiftSwapReceivedUsingGet, appAttendanceShiftSwapRequestIdRespondUsingPut } from '@/service/attendance'
import { useTourStore } from '@/store/tour'
import { safeAreaInsets } from '@/utils/systemInfo'
import AttendanceQuery from './AttendanceQuery.vue'
import MyAttendance from './MyAttendance.vue'
import Schedule from './Schedule.vue'

defineOptions({ name: 'AttendancePage' })
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
const tourSteps = getTourSteps(PAGE_PATHS.attendance)

const navItems = ref([
  { id: 'myAttendance', name: '我的考勤' },
  { id: 'query', name: '考勤查询' },
  { id: 'schedule', name: '排班' },
])
const activeNavId = ref('myAttendance')
const today = ref('')
const showSwapPopup = ref(false)
const currentSwapRequest = ref(null)
const pendingSwapRequests = ref([])

function formatDate(date, format = 'yyyy-MM-dd') {
  if (typeof date === 'string')
    date = new Date(date)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  switch (format) {
    case 'yyyy年MM月': return `${year}年${month}月`
    case 'MM月dd日 周w': return `${month}月${day}日 周${weekDay}`
    default: return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
}

onLoad(() => {
  updateDateTime()
  checkPendingSwapRequests()
})

onShow(() => {
  updateDateTime()
  if (tourStore.shouldShowPageTour(PAGE_PATHS.attendance, TOUR_VERSION)) {
    setTimeout(() => {
      showTour.value = true
    }, 500)
  }
})

function handleTourComplete() {
  tourStore.markPageCompleted(PAGE_PATHS.attendance)
  showTour.value = false
}

function handleTourSkip() {
  tourStore.skipPageTour(PAGE_PATHS.attendance)
  showTour.value = false
}

function updateDateTime() {
  const date = new Date()
  today.value = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

function switchNav(id) {
  activeNavId.value = id
}

async function checkPendingSwapRequests() {
  try {
    const countRes = await appAttendanceShiftSwapPendingCountUsingGet({})
    if (countRes?.data?.count > 0) {
      const requestsRes = await appAttendanceShiftSwapReceivedUsingGet({})
      if (requestsRes?.data?.requests?.length > 0) {
        pendingSwapRequests.value = requestsRes.data.requests.filter(r => r.status === 'pending')
        if (pendingSwapRequests.value.length > 0) {
          currentSwapRequest.value = pendingSwapRequests.value[0]
          showSwapPopup.value = true
        }
      }
    }
  }
  catch (e) {
    console.error('检查换班申请失败:', e)
  }
}

async function respondSwap(accept) {
  if (!currentSwapRequest.value)
    return
  try {
    await appAttendanceShiftSwapRequestIdRespondUsingPut({
      params: { request_id: currentSwapRequest.value.id },
      options: {
        data: { accept, message: '' },
      },
    })
    uni.showToast({ title: accept ? '已同意换班' : '已拒绝', icon: 'success' })
    pendingSwapRequests.value = pendingSwapRequests.value.filter(r => r.id !== currentSwapRequest.value.id)
    if (pendingSwapRequests.value.length > 0) {
      currentSwapRequest.value = pendingSwapRequests.value[0]
    }
    else {
      showSwapPopup.value = false
      currentSwapRequest.value = null
    }
  }
  catch (e) {
    console.error('处理换班申请失败:', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ marginTop: `${safeAreaInsets?.top}px` }">
    <view class="flex items-center justify-between border-b bg-white px-5 py-3">
      <view class="text-xl text-gray-800 font-bold">
        晚午托考勤
      </view>
      <view class="flex items-center space-x-4">
        <text class="text-sm text-gray-500">{{ today }}</text>
      </view>
    </view>

    <view class="tour-attendance-nav border-b bg-white">
      <view class="flex overflow-x-auto px-1 py-2" style="-webkit-overflow-scrolling: touch;">
        <view class="scroll-view" style="width: 100%;">
          <view class="flex">
            <view v-for="item in navItems" :key="item.id" class="mx-1.5 flex-shrink-0">
              <view
                class="w-20 rounded-lg py-2 text-center text-sm transition-all duration-200"
                :class="activeNavId === item.id ? 'bg-orange-500 text-white font-medium' : 'bg-gray-100 text-gray-700'"
                style="touch-action: manipulation;"
                @click="switchNav(item.id)"
              >
                {{ item.name }}
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-show="activeNavId === 'myAttendance'" class="tour-attendance-my">
      <MyAttendance />
    </view>
    <view v-show="activeNavId === 'query'" class="tour-attendance-query">
      <AttendanceQuery />
    </view>
    <view v-show="activeNavId === 'schedule'" class="tour-attendance-schedule">
      <Schedule />
    </view>

    <wd-popup v-model="showSwapPopup" position="center" custom-style="border-radius: 16px; width: 85%; max-width: 340px;">
      <view class="rounded-2xl bg-white p-5">
        <view class="mb-4 text-center">
          <view class="mx-auto mb-3 h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <uni-icons type="hand-up" size="24" color="#3b82f6" />
          </view>
          <view class="text-lg text-gray-800 font-bold">
            换班申请
          </view>
        </view>

        <view v-if="currentSwapRequest" class="mb-4 rounded-lg bg-gray-50 p-3">
          <view class="mb-2 flex items-center">
            <view class="mr-2 h-8 w-8 flex items-center justify-center rounded-full bg-orange-100">
              <text class="text-xs text-orange-600 font-bold">{{ currentSwapRequest.requesterName?.charAt(0) }}</text>
            </view>
            <view>
              <view class="text-sm text-gray-800 font-medium">
                {{ currentSwapRequest.requesterName }}
              </view>
              <view class="text-xs text-gray-500">
                请求与您换班
              </view>
            </view>
          </view>
          <view class="text-xs text-gray-600 space-y-1">
            <view>对方排班：{{ currentSwapRequest.requesterScheduleDate }} {{ currentSwapRequest.requesterTimeSlotName }}</view>
            <view>您的排班：{{ currentSwapRequest.responderScheduleDate }} {{ currentSwapRequest.responderTimeSlotName }}</view>
            <view v-if="currentSwapRequest.requestMessage" class="mt-2 text-blue-500">
              留言：{{ currentSwapRequest.requestMessage }}
            </view>
          </view>
        </view>

        <view class="flex gap-3">
          <view class="flex-1 rounded-lg bg-gray-100 py-2.5 text-center text-sm text-gray-600" @click="respondSwap(false)">
            拒绝
          </view>
          <view class="flex-1 rounded-lg bg-blue-500 py-2.5 text-center text-sm text-white" @click="respondSwap(true)">
            同意
          </view>
        </view>

        <view class="mt-3 text-center text-xs text-gray-400" @click="showSwapPopup = false">
          稍后处理
        </view>
      </view>
    </wd-popup>

    <TourGuide
      v-model:show="showTour"
      :steps="tourSteps"
      @complete="handleTourComplete"
      @skip="handleTourSkip"
    />
  </view>
</template>

<style scoped>
.scroll-view::-webkit-scrollbar {
  display: none;
}
.scroll-view {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
button {
  border: none;
  outline: none;
  transition: all 0.2s ease;
}
button:active {
  transform: scale(0.98);
}
input {
  outline: none;
}
</style>
