<script lang="ts" setup>
import type { ShiftSwapRequest } from '@/service/types'
import { computed, onMounted, ref } from 'vue'
import {
  appAttendanceShiftSwapMyRequestsUsingGet,
  appAttendanceShiftSwapReceivedUsingGet,
  appAttendanceShiftSwapRequestIdCancelUsingPut,
  appAttendanceShiftSwapRequestIdRespondUsingPut,
} from '@/service/attendance'

definePage({
  style: {
    navigationBarTitleText: '代班记录',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const activeTab = ref(0)
const tabs = [
  { title: '我发起的', value: 'my' },
  { title: '收到的申请', value: 'received' },
]

const myRequests = ref<ShiftSwapRequest[]>([])
const receivedRequests = ref<ShiftSwapRequest[]>([])
const loading = ref(false)

const pendingReceivedCount = computed(() => {
  return receivedRequests.value.filter(r => r.status === 'pending').length
})

async function fetchMyRequests() {
  loading.value = true
  try {
    const res = await appAttendanceShiftSwapMyRequestsUsingGet({})
    if (res) {
      myRequests.value = res.requests || []
    }
  }
  catch (error) {
    console.error('获取代班申请失败:', error)
  }
  finally {
    loading.value = false
  }
}

async function fetchReceivedRequests() {
  loading.value = true
  try {
    const res = await appAttendanceShiftSwapReceivedUsingGet({})
    if (res) {
      receivedRequests.value = res.requests || []
    }
  }
  catch (error) {
    console.error('获取收到的代班申请失败:', error)
  }
  finally {
    loading.value = false
  }
}

function handleTabChange(index: number) {
  activeTab.value = index
}

async function handleAccept(requestId: number) {
  uni.showModal({
    title: '确认',
    content: '确定同意代班吗？同意后将由您负责该排班。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await appAttendanceShiftSwapRequestIdRespondUsingPut({
            params: { request_id: requestId },
            body: { accept: true, message: '' },
          })

          uni.showToast({ title: '已同意代班', icon: 'success' })
          fetchReceivedRequests()
        }
        catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleReject(requestId: number) {
  uni.showModal({
    title: '确认',
    content: '确定拒绝该代班申请吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await appAttendanceShiftSwapRequestIdRespondUsingPut({
            params: { request_id: requestId },
            body: { accept: false, message: '' },
          })

          uni.showToast({ title: '已拒绝', icon: 'success' })
          fetchReceivedRequests()
        }
        catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleCancel(requestId: number) {
  uni.showModal({
    title: '确认',
    content: '确定取消该代班申请吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await appAttendanceShiftSwapRequestIdCancelUsingPut({
            params: { request_id: requestId },
          })

          uni.showToast({ title: '已取消', icon: 'success' })
          fetchMyRequests()
        }
        catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'text-orange-500',
    accepted: 'text-green-500',
    rejected: 'text-red-500',
    cancelled: 'text-gray-400',
  }
  return colors[status] || 'text-gray-500'
}

function getStatusBgColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-orange-50',
    accepted: 'bg-green-50',
    rejected: 'bg-red-50',
    cancelled: 'bg-gray-100',
  }
  return colors[status] || 'bg-gray-100'
}

onMounted(() => {
  fetchMyRequests()
  fetchReceivedRequests()
})
</script>

<template>
  <view class="swap-container min-h-screen bg-gray-50">
    <view class="flex items-center border-b border-gray-100 bg-white px-4 py-3">
      <view
        v-for="(tab, index) in tabs"
        :key="tab.value"
        class="relative flex-1 py-2 text-center"
        @click="handleTabChange(index)"
      >
        <view class="flex items-center justify-center">
          <text class="text-base" :class="[activeTab === index ? 'text-blue-500 font-medium' : 'text-gray-500']">
            {{ tab.title }}
          </text>
          <view v-if="index === 1 && pendingReceivedCount > 0" class="ml-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-red-500">
            <text class="text-xs text-white">{{ pendingReceivedCount > 99 ? '99+' : pendingReceivedCount }}</text>
          </view>
        </view>
        <view v-if="activeTab === index" class="absolute bottom-0 left-1/2 h-0.5 w-8 rounded-full bg-blue-500 -translate-x-1/2" />
      </view>
    </view>

    <view v-if="loading" class="flex items-center justify-center py-20">
      <wd-icon name="refresh" size="24" color="#3b82f6" class="animate-spin" />
      <text class="ml-2 text-gray-400">加载中...</text>
    </view>

    <view v-else-if="activeTab === 0" class="p-4">
      <view v-if="myRequests.length === 0" class="flex flex-col items-center justify-center py-20">
        <wd-icon name="warning" size="48" color="#d1d5db" />
        <text class="mt-3 text-gray-400">暂无代班申请记录</text>
      </view>

      <view v-else class="space-y-3">
        <view
          v-for="item in myRequests"
          :key="item.id"
          class="rounded-xl bg-white p-4 shadow-sm"
        >
          <view class="mb-3 flex items-center justify-between">
            <view class="rounded px-2 py-1 text-sm" :class="[getStatusBgColor(item.status), getStatusColor(item.status)]">
              {{ item.statusText }}
            </view>
            <text class="text-xs text-gray-400">{{ item.createdAt }}</text>
          </view>

          <view class="rounded-lg bg-gray-50 p-3">
            <view class="mb-1 text-xs text-gray-400">
              我的排班（申请代班）
            </view>
            <view class="flex items-center justify-between">
              <view>
                <view class="text-sm text-gray-800 font-medium">
                  {{ item.requesterScheduleDate }}
                </view>
                <view class="mt-1 text-xs text-gray-500">
                  {{ item.requesterTimeSlotName }} · {{ item.requesterClassName }}
                </view>
              </view>
            </view>
          </view>

          <view class="mt-3 flex items-center text-sm">
            <text class="text-gray-400">代班人：</text>
            <text :class="item.status === 'accepted' ? 'text-green-600 font-medium' : 'text-gray-600'">{{ item.responderName || '待确认' }}</text>
          </view>

          <view v-if="item.requestMessage" class="mt-3 border-t border-gray-100 pt-3">
            <text class="text-xs text-gray-400">申请留言：</text>
            <text class="text-xs text-gray-600">{{ item.requestMessage }}</text>
          </view>

          <view v-if="item.responseMessage" class="mt-2">
            <text class="text-xs text-gray-400">回复：</text>
            <text class="text-xs text-gray-600">{{ item.responseMessage }}</text>
          </view>

          <view v-if="item.status === 'pending'" class="mt-3 flex justify-end border-t border-gray-100 pt-3">
            <view class="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-500" @click="handleCancel(item.id)">
              取消申请
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <view v-if="receivedRequests.length === 0" class="flex flex-col items-center justify-center py-20">
        <wd-icon name="warning" size="48" color="#d1d5db" />
        <text class="mt-3 text-gray-400">暂无收到的代班申请</text>
      </view>

      <view v-else class="space-y-3">
        <view
          v-for="item in receivedRequests"
          :key="item.id"
          class="rounded-xl bg-white p-4 shadow-sm"
        >
          <view class="mb-3 flex items-center justify-between">
            <view class="flex items-center">
              <view class="mr-2 h-8 w-8 flex items-center justify-center rounded-full bg-blue-100">
                <wd-icon name="user" size="16" color="#3b82f6" />
              </view>
              <text class="text-gray-800 font-medium">{{ item.requesterName }}</text>
              <text class="ml-2 text-xs text-gray-400">请求代班</text>
            </view>
            <view class="rounded px-2 py-1 text-sm" :class="[getStatusBgColor(item.status), getStatusColor(item.status)]">
              {{ item.statusText }}
            </view>
          </view>

          <view class="rounded-lg bg-gray-50 p-3">
            <view class="mb-1 text-xs text-gray-400">
              排班信息
            </view>
            <view class="flex items-center justify-between">
              <view>
                <view class="text-sm text-gray-800 font-medium">
                  {{ item.requesterScheduleDate }}
                </view>
                <view class="mt-1 text-xs text-gray-500">
                  {{ item.requesterTimeSlotName }} · {{ item.requesterClassName }}
                </view>
              </view>
            </view>
          </view>

          <view v-if="item.requestMessage" class="mt-3 border-t border-gray-100 pt-3">
            <text class="text-xs text-gray-400">申请留言：</text>
            <text class="text-xs text-gray-600">{{ item.requestMessage }}</text>
          </view>

          <view v-if="item.status === 'pending'" class="mt-3 flex justify-end gap-3 border-t border-gray-100 pt-3">
            <view class="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-500" @click="handleReject(item.id)">
              拒绝
            </view>
            <view class="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white" @click="handleAccept(item.id)">
              同意代班
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.space-y-3 > view + view {
  margin-top: 12px;
}
</style>
