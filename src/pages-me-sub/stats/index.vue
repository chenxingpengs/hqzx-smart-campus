<script lang="ts" setup>
import type { ScheduleItem } from '@/service/types'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { appAttendanceSchedulesUsingGet, appAttendanceUsingGet } from '@/service/attendance'

definePage({
  style: {
    navigationBarTitleText: '考勤统计',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const loading = ref(false)
const monthlyStats = ref<any>(null)
const scheduleList = ref<ScheduleItem[]>([])
const myClassInfo = ref<any>(null)

const currentMonth = ref('')
const completionRate = computed(() => {
  if (!monthlyStats.value?.totalSchedules || monthlyStats.value.totalSchedules === 0)
    return 0
  return Math.round((monthlyStats.value.completedSchedules / monthlyStats.value.totalSchedules) * 100)
})

const completedCount = computed(() => monthlyStats.value?.completedSchedules || 0)
const pendingCount = computed(() => monthlyStats.value?.pendingSchedules || 0)
const totalCount = computed(() => monthlyStats.value?.totalSchedules || 0)

function getScheduleStatusStyle(item: ScheduleItem) {
  if (item.isCancelled)
    return { text: '已停课', bg: 'bg-gray-100', textColor: 'text-gray-500' }
  if (item.attendanceCompleted)
    return { text: '已完成', bg: 'bg-green-50', textColor: 'text-green-600' }
  if (item.isToday || item.isUpcoming)
    return { text: '待完成', bg: 'bg-orange-50', textColor: 'text-orange-600' }
  return { text: '未完成', bg: 'bg-red-50', textColor: 'text-red-500' }
}

function formatDate(dateStr: string) {
  if (!dateStr)
    return ''
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${month}月${day}日 ${weekdays[date.getDay()]}`
}

async function fetchStatsData() {
  loading.value = true
  try {
    const now = new Date()
    currentMonth.value = `${now.getFullYear()}年${now.getMonth() + 1}月`

    const attendanceRes = await appAttendanceUsingGet({})
    if (attendanceRes?.data) {
      monthlyStats.value = attendanceRes.data.monthlyStats
      myClassInfo.value = attendanceRes.data.myClassInfo
    }

    const schedulesRes = await appAttendanceSchedulesUsingGet({
      params: { days: '30' },
    })
    if (schedulesRes?.data?.schedules) {
      scheduleList.value = schedulesRes.data.schedules
    }
  }
  catch (e) {
    console.error('获取统计数据失败:', e)
    uni.showToast({ title: '获取数据失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

onShow(() => {
  fetchStatsData()
})
</script>

<template>
  <view class="stats-page min-h-screen bg-gray-50">
    <view v-if="loading" class="flex items-center justify-center py-20">
      <wd-icon name="refresh" size="24" color="#3b82f6" class="animate-spin" />
      <text class="ml-2 text-gray-400">加载中...</text>
    </view>

    <template v-else>
      <view class="px-4 pb-2 pt-6">
        <view class="overflow-hidden rounded-2xl from-blue-500 to-indigo-600 bg-gradient-to-br p-5 shadow-sm">
          <view class="flex items-center justify-between">
            <view>
              <view class="text-xs text-white/70">
                统计周期
              </view>
              <view class="mt-1 text-lg text-white font-bold">
                {{ currentMonth }}
              </view>
            </view>
            <view class="h-12 w-12 flex items-center justify-center rounded-xl bg-white/15">
              <wd-icon name="chart" size="24" color="#fff" />
            </view>
          </view>

          <view v-if="totalCount > 0" class="mt-5 border-t border-white/10 pt-4">
            <view class="mb-2 flex items-center justify-between">
              <text class="text-xs text-white/80">完成率</text>
              <text class="text-sm text-white font-medium">{{ completionRate }}%</text>
            </view>
            <view class="h-2.5 overflow-hidden rounded-full bg-white/20">
              <view
                class="h-full rounded-full bg-white transition-all duration-700"
                :style="{ width: `${completionRate}%` }"
              />
            </view>
          </view>
        </view>
      </view>

      <view class="mt-4 px-4">
        <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
          <view class="border-b border-gray-100 px-5 py-3">
            <view class="text-base text-gray-800 font-medium">
              月度概览
            </view>
          </view>

          <view v-if="totalCount > 0" class="p-5">
            <view class="grid grid-cols-3 gap-4">
              <view class="flex flex-col items-center">
                <view class="relative h-16 w-16 flex items-center justify-center rounded-2xl bg-blue-50">
                  <text class="text-2xl text-blue-600 font-bold">{{ totalCount }}</text>
                </view>
                <text class="mt-2 text-xs text-gray-500">总排班数</text>
              </view>
              <view class="flex flex-col items-center">
                <view class="relative h-16 w-16 flex items-center justify-center rounded-2xl bg-green-50">
                  <text class="text-2xl text-green-600 font-bold">{{ completedCount }}</text>
                </view>
                <text class="mt-2 text-xs text-gray-500">已完成</text>
              </view>
              <view class="flex flex-col items-center">
                <view class="relative h-16 w-16 flex items-center justify-center rounded-2xl bg-orange-50">
                  <text class="text-2xl text-orange-600 font-bold">{{ pendingCount }}</text>
                </view>
                <text class="mt-2 text-xs text-gray-500">待完成</text>
              </view>
            </view>
          </view>

          <view v-else class="flex flex-col items-center p-8">
            <wd-icon name="chart" size="40" color="#d1d5db" />
            <text class="mt-3 text-sm text-gray-400">本月暂无排班记录</text>
          </view>
        </view>
      </view>

      <view class="mt-4 px-4">
        <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
          <view class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <view class="text-base text-gray-800 font-medium">
              近期排班记录
            </view>
            <text class="text-xs text-gray-400">{{ scheduleList.length }} 条</text>
          </view>

          <view v-if="scheduleList.length === 0" class="flex flex-col items-center p-8">
            <wd-icon name="time" size="40" color="#d1d5db" />
            <text class="mt-3 text-sm text-gray-400">暂无排班记录</text>
          </view>

          <view v-else>
            <view
              v-for="(item, index) in scheduleList"
              :key="item.id"
              class="flex items-center px-5 py-4 active:bg-gray-50"
              :class="{ 'border-b border-gray-50': index < scheduleList.length - 1 }"
              @click="item.scheduleId && uni.navigateTo({ url: `/pages-attendance-detail/index?schedule_id=${item.scheduleId}` })"
            >
              <view class="mr-3 flex-shrink-0">
                <view v-if="item.isToday" class="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-500">
                  <text class="text-xs text-white font-bold">今</text>
                </view>
                <view v-else-if="item.isUpcoming" class="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-100">
                  <text class="text-xs text-orange-600 font-bold">{{ new Date(item.serviceDate).getDate() }}</text>
                </view>
                <view v-else-if="item.attendanceCompleted" class="h-10 w-10 flex items-center justify-center rounded-xl bg-green-100">
                  <wd-icon name="check" size="16" color="#10b981" />
                </view>
                <view v-else class="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-100">
                  <text class="text-xs text-gray-400">{{ new Date(item.serviceDate).getDate() }}</text>
                </view>
              </view>

              <view class="min-w-0 flex-1">
                <view class="flex items-center">
                  <text class="truncate text-sm text-gray-800 font-medium">{{ item.className }}</text>
                  <view v-if="item.isToday" class="ml-2 rounded bg-blue-500 px-1.5 py-0.5 text-xs text-white">
                    今天
                  </view>
                </view>
                <view class="mt-1 flex items-center text-xs text-gray-400">
                  <text>{{ formatDate(item.serviceDate) }}</text>
                  <text class="mx-1.5">·</text>
                  <text>{{ item.timeSlotName }}</text>
                  <text class="mx-1.5">·</text>
                  <text>{{ item.scheduleTime }}</text>
                </view>
              </view>

              <view class="ml-3 flex-shrink-0">
                <view class="rounded-full px-2 py-0.5 text-xs font-medium" :class="[getScheduleStatusStyle(item).bg, getScheduleStatusStyle(item).textColor]">
                  {{ getScheduleStatusStyle(item).text }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="pb-[calc(2rem+env(safe-area-inset-bottom))]" />
    </template>
  </view>
</template>
