<script setup lang="ts">
import type { DeviceInfo } from '@/api/types/device'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { deleteDevice, getDeviceList, rebootDevice, shutdownDevice, wolDevice } from '@/api/device'
import { useUserStore } from '@/store/user'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'DeviceListPage' })
definePage({
  type: 'page',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const userStore = useUserStore()
const devices = ref<DeviceInfo[]>([])
const loading = ref(true)
const showMoreMenu = ref(false)
const selectedDevice = ref<DeviceInfo | null>(null)

const isAdmin = computed(() => userStore.isAdmin)
const isHeadTeacher = computed(() => userStore.isTeacher && userStore.userInfo.permission === 1)
const canPowerControl = computed(() => isAdmin.value || isHeadTeacher.value)

const onlineCount = computed(() => devices.value.filter(d => d.status === 1).length)
const offlineCount = computed(() => devices.value.filter(d => d.status !== 1).length)

async function loadDevices() {
  try {
    loading.value = true
    const res = await getDeviceList()
    devices.value = res.list || []
  }
  catch (e) {
    console.error('加载设备列表失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function handleView(device: DeviceInfo) {
  if (device.status !== 1) {
    uni.showToast({ title: '设备离线，无法查看', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages-device/detail/index?deviceId=${device.deviceId}&deviceName=${encodeURIComponent(device.deviceName)}`,
  })
}

function handleRemote(device: DeviceInfo) {
  if (device.status !== 1) {
    uni.showToast({ title: '设备离线，无法远控', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages-device/remote/index?deviceId=${device.deviceId}&deviceName=${encodeURIComponent(device.deviceName)}`,
  })
}

function handleMore(device: DeviceInfo) {
  selectedDevice.value = device
  showMoreMenu.value = true
}

async function handleShutdown() {
  if (!selectedDevice.value)
    return
  showMoreMenu.value = false

  uni.showModal({
    title: '确认关机',
    content: `确定要远程关闭 ${selectedDevice.value.deviceName} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '发送中...' })
          const result = await shutdownDevice(selectedDevice.value!.deviceId)
          uni.hideLoading()
          if (result.success) {
            uni.showToast({ title: '关机指令已发送', icon: 'success' })
          }
          else {
            uni.showToast({ title: result.message || '发送失败', icon: 'none' })
          }
        }
        catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleReboot() {
  if (!selectedDevice.value)
    return
  showMoreMenu.value = false

  uni.showModal({
    title: '确认重启',
    content: `确定要远程重启 ${selectedDevice.value.deviceName} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '发送中...' })
          const result = await rebootDevice(selectedDevice.value!.deviceId)
          uni.hideLoading()
          if (result.success) {
            uni.showToast({ title: '重启指令已发送', icon: 'success' })
          }
          else {
            uni.showToast({ title: result.message || '发送失败', icon: 'none' })
          }
        }
        catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleWol() {
  if (!selectedDevice.value)
    return
  showMoreMenu.value = false

  if (!selectedDevice.value.macAddress) {
    uni.showToast({ title: '设备未配置MAC地址', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '发送中...' })
    const result = await wolDevice(selectedDevice.value.deviceId)
    uni.hideLoading()
    if (result.success) {
      uni.showToast({ title: '开机指令已发送', icon: 'success' })
    }
    else {
      uni.showToast({ title: result.message || '发送失败', icon: 'none' })
    }
  }
  catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function handleDelete() {
  if (!selectedDevice.value)
    return
  showMoreMenu.value = false

  uni.showModal({
    title: '确认删除',
    content: `确定要删除设备 ${selectedDevice.value.deviceName} 吗？此操作不可恢复。`,
    confirmColor: '#EF4444',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          const result = await deleteDevice(selectedDevice.value!.deviceId)
          uni.hideLoading()
          if (result.success) {
            uni.showToast({ title: '设备已删除', icon: 'success' })
            loadDevices()
          }
          else {
            uni.showToast({ title: result.message || '删除失败', icon: 'none' })
          }
        }
        catch (e) {
          uni.hideLoading()
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function closeMoreMenu() {
  showMoreMenu.value = false
  selectedDevice.value = null
}

function goBack() {
  uni.navigateBack()
}

onLoad(() => {
  loadDevices()
})

onPullDownRefresh(() => {
  loadDevices().then(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ marginTop: `${safeAreaInsets?.top}px` }">
    <view class="flex items-center justify-between border-b bg-white px-4 py-3">
      <view class="flex items-center" @click="goBack">
        <view class="i-carbon-arrow-left text-24px text-gray-600" />
      </view>
      <view class="text-lg text-gray-800 font-bold">
        设备管理
      </view>
      <view class="flex items-center space-x-3">
        <view class="flex items-center text-xs text-gray-500">
          <view class="mr-1 h-2 w-2 rounded-full bg-green-500" />
          <text>{{ onlineCount }}</text>
        </view>
        <view class="flex items-center text-xs text-gray-500">
          <view class="mr-1 h-2 w-2 rounded-full bg-gray-400" />
          <text>{{ offlineCount }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="flex flex-col items-center justify-center py-20">
      <qiun-loading />
      <text class="mt-3 text-sm text-gray-400">加载中...</text>
    </view>

    <view v-else-if="devices.length === 0" class="flex flex-col items-center justify-center py-20">
      <view class="mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-gray-100">
        <view class="i-carbon-screen text-32px text-gray-400" />
      </view>
      <text class="text-sm text-gray-400">暂无设备</text>
    </view>

    <view v-else class="p-4">
      <view
        v-for="device in devices"
        :key="device.deviceId"
        class="mb-3 overflow-hidden rounded-2xl bg-white shadow-sm"
      >
        <view class="flex items-center justify-between p-4">
          <view class="flex items-center">
            <view
              class="mr-3 h-12 w-12 flex items-center justify-center rounded-xl"
              :class="device.status === 1 ? 'bg-green-100' : 'bg-gray-100'"
            >
              <view
                class="i-carbon-screen text-24px"
                :class="device.status === 1 ? 'text-green-500' : 'text-gray-400'"
              />
            </view>
            <view>
              <view class="text-base text-gray-800 font-medium">
                {{ device.deviceName }}
              </view>
              <view class="mt-1 text-xs text-gray-500">
                {{ device.className }}
              </view>
              <view class="mt-0.5 text-xs" :class="device.status === 1 ? 'text-green-500' : 'text-gray-400'">
                {{ device.status === 1 ? '在线' : '离线' }}
                <text v-if="device.ipAddress" class="ml-2">{{ device.ipAddress }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="flex border-t border-gray-100">
          <view
            class="flex flex-1 items-center justify-center py-3 text-sm"
            :class="device.status === 1 ? 'text-blue-500' : 'text-gray-400'"
            @click="handleView(device)"
          >
            <view
              class="i-carbon-view text-18px"
              :class="device.status === 1 ? 'text-blue-500' : 'text-gray-400'"
            />
            <text class="ml-1">看班</text>
          </view>
          <view
            v-if="canPowerControl"
            class="flex flex-1 items-center justify-center border-l border-gray-100 py-3 text-sm"
            :class="device.status === 1 ? 'text-purple-500' : 'text-gray-400'"
            @click="handleRemote(device)"
          >
            <view
              class="i-carbon-settings-adjust text-18px"
              :class="device.status === 1 ? 'text-purple-500' : 'text-gray-400'"
            />
            <text class="ml-1">远控</text>
          </view>
          <view
            v-if="canPowerControl"
            class="flex flex-1 items-center justify-center border-l border-gray-100 py-3 text-sm text-gray-600"
            @click="handleMore(device)"
          >
            <view class="i-carbon-overflow-menu-horizontal text-18px text-gray-500" />
            <text class="ml-1">更多</text>
          </view>
        </view>
      </view>
    </view>

    <wd-popup v-model="showMoreMenu" position="bottom" custom-style="border-radius: 16px 16px 0 0;">
      <view class="rounded-t-2xl bg-white">
        <view class="border-b border-gray-100 px-5 py-4">
          <view class="text-center text-base text-gray-800 font-medium">
            {{ selectedDevice?.deviceName }}
          </view>
          <view class="mt-1 text-center text-xs text-gray-500">
            {{ selectedDevice?.className }}
          </view>
        </view>

        <view class="p-4">
          <view
            v-if="selectedDevice?.status !== 1 && selectedDevice?.macAddress"
            class="mb-3 flex items-center rounded-xl bg-blue-50 p-4"
            @click="handleWol"
          >
            <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-500">
              <view class="i-carbon-power text-20px text-white" />
            </view>
            <view class="ml-3">
              <view class="text-sm text-gray-800 font-medium">
                远程开机
              </view>
              <view class="text-xs text-gray-500">
                发送WOL唤醒信号
              </view>
            </view>
          </view>

          <view
            v-if="selectedDevice?.status === 1"
            class="mb-3 flex items-center rounded-xl bg-orange-50 p-4"
            @click="handleReboot"
          >
            <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-500">
              <view class="i-carbon-restart text-20px text-white" />
            </view>
            <view class="ml-3">
              <view class="text-sm text-gray-800 font-medium">
                远程重启
              </view>
              <view class="text-xs text-gray-500">
                设备将在10秒后重启
              </view>
            </view>
          </view>

          <view
            v-if="selectedDevice?.status === 1"
            class="mb-3 flex items-center rounded-xl bg-red-50 p-4"
            @click="handleShutdown"
          >
            <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-red-500">
              <view class="i-carbon-close text-20px text-white" />
            </view>
            <view class="ml-3">
              <view class="text-sm text-gray-800 font-medium">
                远程关机
              </view>
              <view class="text-xs text-gray-500">
                设备将在10秒后关机
              </view>
            </view>
          </view>

          <view
            class="mb-3 flex items-center rounded-xl bg-gray-50 p-4"
            @click="handleDelete"
          >
            <view class="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-500">
              <view class="i-carbon-trash-can text-20px text-white" />
            </view>
            <view class="ml-3">
              <view class="text-sm text-gray-800 font-medium">
                删除设备
              </view>
              <view class="text-xs text-gray-500">
                从系统中移除此设备
              </view>
            </view>
          </view>
        </view>

        <view class="border-t border-gray-100 px-5 py-4" @click="closeMoreMenu">
          <view class="text-center text-sm text-gray-500">
            取消
          </view>
        </view>
      </view>
    </wd-popup>
  </view>
</template>
