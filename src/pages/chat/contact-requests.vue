<script setup lang="ts">
import type { ContactRequestData } from '@/api/chat'
import { onMounted, ref } from 'vue'
import { getContactRequests, handleContactRequest } from '@/api/chat'

definePage({
  style: {
    navigationBarTitleText: '好友请求',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const requests = ref<ContactRequestData[]>([])
const loading = ref(false)

async function fetchRequests() {
  loading.value = true
  try {
    const res = await getContactRequests({ status: 'pending', request_type: 'received' })
    if (res && Array.isArray(res)) {
      requests.value = res
    }
  }
  catch (error) {
    console.error('获取好友请求失败:', error)
    uni.showToast({ title: '获取失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function handleAccept(requestId: string, requesterName?: string) {
  uni.showModal({
    title: '确认',
    content: `确定接受 ${requesterName || '对方'} 的好友请求吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await handleContactRequest(requestId, 'accept')
          uni.showToast({ title: '已接受', icon: 'success' })
          fetchRequests()
        }
        catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleReject(requestId: string, requesterName?: string) {
  uni.showModal({
    title: '确认',
    content: `确定拒绝 ${requesterName || '对方'} 的好友请求吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          await handleContactRequest(requestId, 'reject')
          uni.showToast({ title: '已拒绝', icon: 'success' })
          fetchRequests()
        }
        catch (error) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    accepted: '已接受',
    rejected: '已拒绝',
  }
  return map[status] || status
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'text-orange-500',
    accepted: 'text-green-500',
    rejected: 'text-red-500',
  }
  return colors[status] || 'text-gray-500'
}

function getStatusBgColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-orange-50',
    accepted: 'bg-green-50',
    rejected: 'bg-red-50',
  }
  return colors[status] || 'bg-gray-100'
}

onMounted(() => {
  fetchRequests()
})
</script>

<template>
  <view class="contact-requests-container min-h-screen bg-gray-50">
    <view v-if="loading" class="flex items-center justify-center py-20">
      <wd-icon name="refresh" size="24" color="#3b82f6" class="animate-spin" />
      <text class="ml-2 text-gray-400">加载中...</text>
    </view>

    <view v-else-if="requests.length === 0" class="flex flex-col items-center justify-center py-20">
      <wd-icon name="user-follow" size="48" color="#d1d5db" />
      <text class="mt-3 text-gray-400">暂无好友请求</text>
      <text class="mt-1 text-xs text-gray-300">当有人添加你为联系人时，这里会显示请求</text>
    </view>

    <view v-else class="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <view class="space-y-3">
        <view
          v-for="item in requests"
          :key="item.id"
          class="rounded-xl bg-white p-4 shadow-sm"
        >
          <view class="mb-3 flex items-center justify-between">
            <view class="flex items-center">
              <view class="mr-2 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                <text class="text-base text-blue-600 font-medium">{{ (item.requester_name || '用').charAt(0) }}</text>
              </view>
              <view>
                <text class="text-gray-800 font-medium">{{ item.requester_name || '未知用户' }}</text>
                <text class="ml-2 text-xs text-gray-400">请求添加你为联系人</text>
              </view>
            </view>
            <view class="rounded px-2 py-1 text-sm" :class="[getStatusBgColor(item.status), getStatusColor(item.status)]">
              {{ getStatusText(item.status) }}
            </view>
          </view>

          <view v-if="item.message" class="mb-3 rounded-lg bg-gray-50 p-3">
            <text class="text-xs text-gray-400">申请留言：</text>
            <text class="text-sm text-gray-600">{{ item.message }}</text>
          </view>

          <view v-if="item.target_class_name" class="mb-3 text-sm">
            <text class="text-gray-400">目标：</text>
            <text class="text-gray-600">{{ item.target_class_name }}</text>
          </view>

          <view v-if="item.status === 'pending'" class="flex justify-end gap-3 border-t border-gray-100 pt-3">
            <view class="rounded-lg bg-gray-100 px-5 py-2 text-sm text-gray-500" @click="handleReject(item.id, item.requester_name)">
              拒绝
            </view>
            <view class="rounded-lg bg-blue-500 px-5 py-2 text-sm text-white" @click="handleAccept(item.id, item.requester_name)">
              同意
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
