<script setup lang="ts">
import type { ClassWithDevice } from '@/api/notification'
import type { PageCallResult, PageCallStatus } from '@/api/pageCall'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getClassesWithDevices } from '@/api/notification'
import { cancelPageCall, getPageCallList, getPageCallStatus, sendPageCall } from '@/api/pageCall'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'PageCallPage' })
definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '寻人传呼',
    backgroundColor: '#F5F7FA',
  },
})

const loading = ref(false)
const submitting = ref(false)
const classes = ref<ClassWithDevice[]>([])
const activeTab = ref<'new' | 'history'>('new')
const historyList = ref<PageCallResult[]>([])
const historyLoading = ref(false)
const historyTotal = ref(0)
const historyPage = ref(1)
const historyStatus = ref<PageCallStatus | ''>('')

const form = ref({
  student_name: '',
  class_id: null as number | null,
  reason: '',
})

const currentCall = ref<PageCallResult | null>(null)
const showStatusModal = ref(false)
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)

const selectedClass = computed(() => {
  return classes.value.find(c => c.id === form.value.class_id)
})

const statusText = computed(() => {
  if (!currentCall.value)
    return ''
  switch (currentCall.value.status) {
    case 'pending': return '等待确认中...'
    case 'confirmed': return '已确认'
    case 'cancelled': return '已取消'
    default: return ''
  }
})

const statusColor = computed(() => {
  if (!currentCall.value)
    return ''
  switch (currentCall.value.status) {
    case 'pending': return 'text-orange-500'
    case 'confirmed': return 'text-green-500'
    case 'cancelled': return 'text-gray-400'
    default: return ''
  }
})

async function loadClasses() {
  loading.value = true
  try {
    classes.value = await getClassesWithDevices()
  }
  catch (e) {
    console.error('加载班级失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const result = await getPageCallList({
      status: historyStatus.value || undefined,
      page: historyPage.value,
      size: 20,
    })
    if (historyPage.value === 1) {
      historyList.value = result.records || []
    }
    else {
      historyList.value.push(...(result.records || []))
    }
    historyTotal.value = result.total || 0
  }
  catch (e) {
    console.error('加载历史记录失败:', e)
  }
  finally {
    historyLoading.value = false
  }
}

async function handleSubmit() {
  if (!form.value.student_name.trim()) {
    uni.showToast({ title: '请输入学生姓名', icon: 'none' })
    return
  }

  if (!form.value.class_id) {
    uni.showToast({ title: '请选择班级', icon: 'none' })
    return
  }

  if (!selectedClass.value?.has_device) {
    uni.showToast({ title: '该班级暂无绑定设备', icon: 'none' })
    return
  }

  if (!selectedClass.value?.device_online) {
    uni.showModal({
      title: '设备离线提示',
      content: '目标设备当前离线，寻人请求将被保存，设备上线后将收到通知。是否继续？',
      successText: '继续发送',
      cancelText: '取消',
      success: async () => {
        await doSendPageCall()
      },
    })
    return
  }

  await doSendPageCall()
}

async function doSendPageCall() {
  submitting.value = true
  try {
    const result = await sendPageCall({
      student_name: form.value.student_name.trim(),
      class_id: form.value.class_id,
      reason: form.value.reason.trim() || undefined,
    })

    currentCall.value = {
      id: result.id,
      student_name: form.value.student_name.trim(),
      class_id: form.value.class_id,
      class_name: result.class_name,
      device_id: result.device_id,
      reason: form.value.reason.trim() || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      confirmed_at: null,
      confirmed_by: null,
      cancelled_at: null,
    }

    showStatusModal.value = true
    startPolling()

    uni.showToast({
      title: result.offline ? '已发送，设备离线' : '发送成功',
      icon: result.offline ? 'none' : 'success',
    })
  }
  catch (e) {
    console.error('发送失败:', e)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}

function startPolling() {
  stopPolling()
  if (!currentCall.value || currentCall.value.status !== 'pending')
    return

  pollingTimer.value = setInterval(async () => {
    if (!currentCall.value)
      return

    try {
      const result = await getPageCallStatus(currentCall.value.id)
      if (result.status !== currentCall.value.status) {
        currentCall.value.status = result.status
        if (result.confirmed_at) {
          currentCall.value.confirmed_at = result.confirmed_at
        }
        if (result.confirmed_by) {
          currentCall.value.confirmed_by = result.confirmed_by
        }
        if (result.cancelled_at) {
          currentCall.value.cancelled_at = result.cancelled_at
        }

        if (result.status === 'confirmed') {
          uni.showToast({ title: '传呼已确认', icon: 'success' })
          stopPolling()
        }
        else if (result.status === 'cancelled') {
          uni.showToast({ title: '传呼已取消', icon: 'none' })
          stopPolling()
        }
      }
    }
    catch (e) {
      console.error('[寻人传呼] 轮询状态失败:', e)
    }
  }, 3000)
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

async function handleCancel() {
  if (!currentCall.value || currentCall.value.status !== 'pending')
    return

  try {
    await cancelPageCall(currentCall.value.id)
    currentCall.value.status = 'cancelled'
    currentCall.value.cancelled_at = new Date().toISOString()
    uni.showToast({ title: '已取消', icon: 'success' })
  }
  catch (e) {
    console.error('取消失败:', e)
    uni.showToast({ title: '取消失败', icon: 'none' })
  }
}

function closeModal() {
  stopPolling()
  showStatusModal.value = false
  form.value = {
    student_name: '',
    class_id: null,
    reason: '',
  }
  currentCall.value = null
  if (activeTab.value === 'history') {
    historyPage.value = 1
    loadHistory()
  }
}

function handleTabChange(tab: 'new' | 'history') {
  activeTab.value = tab
  if (tab === 'history' && historyList.value.length === 0) {
    loadHistory()
  }
}

function formatTime(timeStr: string | null) {
  if (!timeStr)
    return '-'
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'pending': return 'bg-orange-100 text-orange-600'
    case 'confirmed': return 'bg-green-100 text-green-600'
    case 'cancelled': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'pending': return '等待中'
    case 'confirmed': return '已确认'
    case 'cancelled': return '已取消'
    default: return status
  }
}

onMounted(() => {
  loadClasses()
})

onUnmounted(() => {
  stopPolling()
})

onPullDownRefresh(() => {
  if (activeTab.value === 'new') {
    loadClasses().finally(() => uni.stopPullDownRefresh())
  }
  else {
    historyPage.value = 1
    loadHistory().finally(() => uni.stopPullDownRefresh())
  }
})
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ marginTop: `${safeAreaInsets?.top}px` }">
    <view class="flex border-b border-gray-200 bg-white">
      <view
        class="flex-1 py-3 text-center text-base"
        :class="activeTab === 'new' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'"
        @click="handleTabChange('new')"
      >
        发起传呼
      </view>
      <view
        class="flex-1 py-3 text-center text-base"
        :class="activeTab === 'history' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'"
        @click="handleTabChange('history')"
      >
        传呼记录
      </view>
    </view>

    <view v-if="activeTab === 'new'">
      <view v-if="loading" class="flex flex-col items-center justify-center py-20">
        <qiun-loading />
        <text class="mt-3 text-sm text-gray-400">正在加载...</text>
      </view>

      <view v-else class="p-4">
        <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
          <view class="p-4">
            <view class="mb-2 text-sm text-gray-500">
              学生姓名 <text class="text-red-500">*</text>
            </view>
            <input
              v-model="form.student_name"
              class="w-full border border-gray-200 rounded-lg p-3 text-base"
              placeholder="请输入学生姓名"
              maxlength="50"
            >
          </view>

          <view class="border-t border-gray-100 p-4">
            <view class="mb-2 text-sm text-gray-500">
              选择班级 <text class="text-red-500">*</text>
            </view>
            <picker
              mode="selector"
              :range="classes.filter(c => c.has_device)"
              range-key="name"
              @change="(e: any) => form.class_id = classes.filter(c => c.has_device)[e.detail.value].id"
            >
              <view class="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                <text :class="selectedClass ? 'text-gray-900' : 'text-gray-400'">
                  {{ selectedClass?.name || '请选择班级' }}
                </text>
                <text class="i-carbon-chevron-down text-gray-400" />
              </view>
            </picker>
            <view v-if="selectedClass" class="mt-2 flex items-center gap-2">
              <view
                class="h-2 w-2 rounded-full"
                :class="selectedClass.device_online ? 'bg-green-500' : 'bg-gray-300'"
              />
              <text class="text-xs" :class="selectedClass.device_online ? 'text-green-600' : 'text-gray-400'">
                {{ selectedClass.device_online ? '设备在线' : '设备离线' }}
              </text>
            </view>
            <view v-if="selectedClass && !selectedClass.has_device" class="mt-2 text-xs text-red-500">
              该班级暂无绑定设备
            </view>
          </view>

          <view class="border-t border-gray-100 p-4">
            <view class="mb-2 text-sm text-gray-500">
              传呼原因（选填）
            </view>
            <textarea
              v-model="form.reason"
              class="h-20 w-full border border-gray-200 rounded-lg p-3 text-base"
              placeholder="请输入传呼原因，如：请到办公室一趟"
              maxlength="200"
            />
          </view>
        </view>

        <view class="mb-8 mt-6">
          <button
            class="w-full rounded-xl py-4 text-base text-white font-medium"
            :class="submitting ? 'bg-gray-300' : 'bg-blue-500'"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '发送中...' : '发送传呼' }}
          </button>
        </view>
      </view>
    </view>

    <view v-else class="p-4">
      <view class="mb-4 flex gap-2">
        <view
          class="rounded-full px-3 py-1.5 text-sm"
          :class="!historyStatus ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'"
          @click="historyStatus = ''; historyPage = 1; loadHistory()"
        >
          全部
        </view>
        <view
          class="rounded-full px-3 py-1.5 text-sm"
          :class="historyStatus === 'pending' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'"
          @click="historyStatus = 'pending'; historyPage = 1; loadHistory()"
        >
          等待中
        </view>
        <view
          class="rounded-full px-3 py-1.5 text-sm"
          :class="historyStatus === 'confirmed' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'"
          @click="historyStatus = 'confirmed'; historyPage = 1; loadHistory()"
        >
          已确认
        </view>
      </view>

      <view v-if="historyLoading && historyList.length === 0" class="flex flex-col items-center justify-center py-20">
        <qiun-loading />
        <text class="mt-3 text-sm text-gray-400">正在加载...</text>
      </view>

      <view v-else-if="historyList.length === 0" class="flex flex-col items-center justify-center py-20">
        <text class="text-gray-400">暂无传呼记录</text>
      </view>

      <view v-else class="space-y-3">
        <view
          v-for="item in historyList"
          :key="item.id"
          class="overflow-hidden rounded-xl bg-white p-4 shadow-sm"
        >
          <view class="flex items-start justify-between">
            <view class="flex-1">
              <view class="flex items-center gap-2">
                <text class="text-base font-medium">{{ item.student_name }}</text>
                <view
                  class="rounded px-2 py-0.5 text-xs"
                  :class="getStatusBadgeClass(item.status)"
                >
                  {{ getStatusText(item.status) }}
                </view>
              </view>
              <view class="mt-1 text-sm text-gray-500">
                {{ item.class_name || '未知班级' }}
              </view>
              <view v-if="item.reason" class="mt-2 text-sm text-gray-600">
                {{ item.reason }}
              </view>
            </view>
            <view class="text-xs text-gray-400">
              {{ formatTime(item.created_at) }}
            </view>
          </view>

          <view v-if="item.status === 'confirmed'" class="mt-2 border-t border-gray-100 pt-2 text-xs text-green-600">
            确认时间: {{ formatTime(item.confirmed_at) }}
          </view>
        </view>
      </view>
    </view>

    <wd-popup
      v-model="showStatusModal"
      position="bottom"
      closable
      custom-style="border-radius: 24rpx 24rpx 0 0; padding: 40rpx;"
      @close="closeModal"
    >
      <view class="text-center">
        <view class="mb-4 text-lg font-medium">
          传呼状态
        </view>

        <view class="py-6">
          <view class="mb-2 text-2xl font-bold">
            {{ currentCall?.student_name }}
          </view>
          <view class="mb-4 text-gray-500">
            {{ currentCall?.class_name }}
          </view>

          <view class="flex items-center justify-center gap-2">
            <view
              class="h-3 w-3 rounded-full"
              :class="currentCall?.status === 'pending' ? 'bg-orange-500 animate-pulse'
                : currentCall?.status === 'confirmed' ? 'bg-green-500' : 'bg-gray-400'"
            />
            <text class="text-base" :class="statusColor">{{ statusText }}</text>
          </view>
        </view>

        <view v-if="currentCall?.status === 'pending'" class="mt-4">
          <button
            class="w-full rounded-xl bg-red-500 py-3 text-base text-white"
            @click="handleCancel"
          >
            取消传呼
          </button>
        </view>

        <view v-else class="mt-4">
          <button
            class="w-full rounded-xl bg-blue-500 py-3 text-base text-white"
            @click="closeModal"
          >
            确定
          </button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>
