<script lang="ts" setup>
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { appAttendanceUsingGet } from '@/service/attendance'

definePage({
  style: {
    navigationBarTitleText: '我的班级',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const loading = ref(false)
const myClassInfo = ref<any>(null)
const todayAttendance = ref<any>(null)
const monthlyStats = ref<any>(null)

const attendanceStatusColor = computed(() => {
  const status = myClassInfo.value?.attendanceStatus
  if (status === '已完成')
    return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' }
  if (status === '待确认')
    return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' }
  if (status === '异常' || status === '有缺勤待处理')
    return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
  return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
})

const completionRate = computed(() => {
  if (!todayAttendance.value || !todayAttendance.value.shouldAttend || todayAttendance.value.shouldAttend === 0)
    return 0
  return Math.round((todayAttendance.value.present / todayAttendance.value.shouldAttend) * 100)
})

async function fetchMyClassData() {
  loading.value = true
  try {
    const res = await appAttendanceUsingGet({})
    if (res) {
      myClassInfo.value = res.myClassInfo
      todayAttendance.value = res.myClassInfo?.todayAttendance
      monthlyStats.value = res.monthlyStats
    }
  }
  catch (e) {
    console.error('获取班级数据失败:', e)
    uni.showToast({ title: '获取数据失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function handleGoToDetail() {
  if (!myClassInfo.value?.scheduleId)
    return
  uni.navigateTo({
    url: `/pages-attendance-detail/index?schedule_id=${myClassInfo.value.scheduleId}`,
  })
}

onShow(() => {
  fetchMyClassData()
})
</script>

<template>
  <view class="my-class-page min-h-screen bg-gray-50">
    <view v-if="loading" class="flex items-center justify-center py-20">
      <wd-icon name="refresh" size="24" color="#3b82f6" class="animate-spin" />
      <text class="ml-2 text-gray-400">加载中...</text>
    </view>

    <template v-else>
      <view v-if="!myClassInfo" class="flex flex-col items-center justify-center py-20">
        <wd-icon name="warning" size="48" color="#d1d5db" />
        <text class="mt-3 text-gray-400">暂无班级信息</text>
        <text class="mt-1 text-xs text-gray-300">请联系管理员分配班级</text>
      </view>

      <template v-else>
        <view class="px-4 pb-4 pt-6">
          <view class="overflow-hidden rounded-2xl from-blue-500 to-indigo-600 bg-gradient-to-br shadow-sm">
            <view class="px-5 pb-5 pt-6">
              <view class="flex items-start justify-between">
                <view>
                  <view class="text-xs text-white/70">
                    当前负责班级
                  </view>
                  <view class="mt-2 text-2xl text-white font-bold">
                    {{ myClassInfo.name || myClassInfo.className || '-' }}
                  </view>
                  <view class="mt-2 flex items-center gap-2">
                    <view class="rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white">
                      {{ myClassInfo.grade || '-' }}
                    </view>
                    <view class="rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white">
                      {{ myClassInfo.timeSlotName || '-' }}
                    </view>
                  </view>
                </view>
                <view class="h-14 w-14 flex items-center justify-center rounded-2xl bg-white/15">
                  <wd-icon name="bank" size="28" color="#fff" />
                </view>
              </view>

              <view v-if="myClassInfo.schoolName" class="mt-3 border-t border-white/10 pt-3">
                <text class="text-xs text-white/60">{{ myClassInfo.schoolName }}</text>
              </view>
            </view>

            <view class="flex items-center justify-between bg-white/10 px-5 py-3 backdrop-blur-sm">
              <view class="flex items-center">
                <view class="mr-2 h-2 w-2 animate-pulse rounded-full bg-white" />
                <text class="text-xs text-white">{{ myClassInfo.attendanceDate || '今日' }}</text>
              </view>
              <view class="rounded-full px-3 py-1 text-xs text-white font-medium" :class="[attendanceStatusColor.bg, attendanceStatusColor.text.replace('text-', 'text-').replace('bg-', 'bg-')]">
                {{ myClassInfo.attendanceStatus || '未知' }}
              </view>
            </view>
          </view>
        </view>

        <view class="mt-4 px-4">
          <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
            <view class="border-b border-gray-100 px-5 py-3">
              <view class="text-base text-gray-800 font-medium">
                时段信息
              </view>
            </view>
            <view class="px-5 py-4">
              <view class="grid grid-cols-2 gap-4">
                <view class="rounded-xl bg-gray-50 p-3">
                  <view class="text-xs text-gray-400">
                    开始时间
                  </view>
                  <view class="mt-1 text-lg text-gray-800 font-medium">
                    {{ myClassInfo.startTime?.substring(0, 5) || '--:--' }}
                  </view>
                </view>
                <view class="rounded-xl bg-gray-50 p-3">
                  <view class="text-xs text-gray-400">
                    结束时间
                  </view>
                  <view class="mt-1 text-lg text-gray-800 font-medium">
                    {{ myClassInfo.endTime?.substring(0, 5) || '--:--' }}
                  </view>
                </view>
              </view>
              <view v-if="myClassInfo.scheduleTime" class="mt-3 rounded-xl bg-blue-50 p-3 text-center">
                <text class="text-sm text-blue-600 font-medium">时间段：{{ myClassInfo.scheduleTime }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="mt-4 px-4">
          <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
            <view class="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <view class="text-base text-gray-800 font-medium">
                当日考勤统计
              </view>
              <view v-if="myClassInfo.shouldAttend != null" class="text-xs text-gray-400">
                应到 {{ myClassInfo.shouldAttend }} 人
              </view>
            </view>

            <view v-if="todayAttendance" class="p-5">
              <view class="grid grid-cols-4 gap-3">
                <view class="flex flex-col items-center">
                  <view class="h-12 w-12 flex items-center justify-center rounded-xl bg-blue-50">
                    <text class="text-xl text-blue-600 font-bold">{{ todayAttendance.shouldAttend || 0 }}</text>
                  </view>
                  <text class="mt-1.5 text-xs text-gray-500">应到</text>
                </view>
                <view class="flex flex-col items-center">
                  <view class="h-12 w-12 flex items-center justify-center rounded-xl bg-green-50">
                    <text class="text-xl text-green-600 font-bold">{{ todayAttendance.present || 0 }}</text>
                  </view>
                  <text class="mt-1.5 text-xs text-gray-500">实到</text>
                </view>
                <view class="flex flex-col items-center">
                  <view class="h-12 w-12 flex items-center justify-center rounded-xl bg-orange-50">
                    <text class="text-xl text-orange-600 font-bold">{{ todayAttendance.leaveRequest || 0 }}</text>
                  </view>
                  <text class="mt-1.5 text-xs text-gray-500">请假</text>
                </view>
                <view class="flex flex-col items-center">
                  <view class="h-12 w-12 flex items-center justify-center rounded-xl bg-red-50">
                    <text class="text-xl text-red-600 font-bold">{{ todayAttendance.absent || 0 }}</text>
                  </view>
                  <text class="mt-1.5 text-xs text-gray-500">缺勤</text>
                </view>
              </view>

              <view v-if="todayAttendance.shouldAttend > 0" class="mt-5">
                <view class="mb-2 flex items-center justify-between">
                  <text class="text-xs text-gray-500">出勤率</text>
                  <text class="text-sm text-gray-800 font-medium">{{ completionRate }}%</text>
                </view>
                <view class="h-2 overflow-hidden rounded-full bg-gray-100">
                  <view
                    class="h-full rounded-full transition-all duration-500"
                    :class="completionRate >= 95 ? 'bg-green-500' : completionRate >= 80 ? 'bg-orange-500' : 'bg-red-500'"
                    :style="{ width: `${completionRate}%` }"
                  />
                </view>
              </view>
            </view>

            <view v-else class="flex flex-col items-center p-5">
              <text class="text-sm text-gray-400">今日暂无考勤数据</text>
            </view>
          </view>
        </view>

        <view v-if="monthlyStats" class="mt-4 px-4">
          <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
            <view class="border-b border-gray-100 px-5 py-3">
              <view class="text-base text-gray-800 font-medium">
                本月概览
              </view>
            </view>
            <view class="p-5">
              <view class="grid grid-cols-3 gap-3">
                <view class="rounded-xl bg-gray-50 p-3 text-center">
                  <view class="text-2xl text-gray-800 font-bold">
                    {{ monthlyStats.totalSchedules || 0 }}
                  </view>
                  <view class="mt-1 text-xs text-gray-400">
                    总排班
                  </view>
                </view>
                <view class="rounded-xl bg-green-50 p-3 text-center">
                  <view class="text-2xl text-green-600 font-bold">
                    {{ monthlyStats.completedSchedules || 0 }}
                  </view>
                  <view class="mt-1 text-xs text-gray-400">
                    已完成
                  </view>
                </view>
                <view class="rounded-xl bg-orange-50 p-3 text-center">
                  <view class="text-2xl text-orange-600 font-bold">
                    {{ monthlyStats.pendingSchedules || 0 }}
                  </view>
                  <view class="mt-1 text-xs text-gray-400">
                    待完成
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="myClassInfo.scheduleId" class="mt-6 px-4">
          <view
            class="rounded-2xl from-blue-500 to-indigo-600 bg-gradient-to-r py-4 text-center text-white font-medium active:opacity-80"
            @click="handleGoToDetail"
          >
            进入考勤详情
          </view>
        </view>

        <view class="pb-[calc(2rem+env(safe-area-inset-bottom))]" />
      </template>
    </template>
  </view>
</template>
