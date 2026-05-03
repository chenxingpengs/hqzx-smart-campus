<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { appBindConfirmUsingPost, appBindVerifyUsingPost } from '@/service/attendance'

definePage({
  style: {
    navigationBarTitleText: '设备绑定',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
  },
})

const token = ref('')
const isLoading = ref(true)
const isBinding = ref(false)
const canBind = ref(false)
const deviceInfo = ref<any>(null)
const classInfo = ref<any>(null)
const errorMessage = ref('')

onLoad((options: any) => {
  if (options.token) {
    token.value = options.token
    verifyToken()
  }
  else {
    errorMessage.value = '缺少绑定token'
    isLoading.value = false
  }
})

async function verifyToken() {
  if (!token.value) {
    errorMessage.value = '缺少绑定token'
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    const result = await appBindVerifyUsingPost({
      body: { token: token.value },
    })

    console.log('验证结果:', result)

    if (result && result.can_bind) {
      canBind.value = true
      deviceInfo.value = result.device_info
      classInfo.value = result.class_info
    }
    else {
      canBind.value = false
      deviceInfo.value = result?.device_info || null
      classInfo.value = result?.class_info || null
      errorMessage.value = result?.msg || '验证失败或无权限绑定设备'
    }
  }
  catch (error: any) {
    console.error('验证失败:', error)
    const errorData = error?.data || error
    errorMessage.value = errorData?.msg || '网络错误，请稍后重试'
  }
  finally {
    isLoading.value = false
  }
}

async function confirmBind() {
  if (!deviceInfo.value || !classInfo.value) {
    uni.showToast({ title: '数据异常', icon: 'none' })
    return
  }

  try {
    isBinding.value = true
    const result = await appBindConfirmUsingPost({
      body: {
        token: token.value,
        device_id: deviceInfo.value.id,
        class_id: classInfo.value.id,
      },
    })

    console.log('绑定结果:', result)

    if (result) {
      uni.showToast({ title: '绑定成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
    else {
      uni.showToast({ title: '绑定失败', icon: 'none' })
    }
  }
  catch (error) {
    console.error('绑定失败:', error)
    uni.showToast({ title: '网络错误，请稍后重试', icon: 'none' })
  }
  finally {
    isBinding.value = false
  }
}

function cancelBind() {
  uni.navigateBack()
}
</script>

<template>
  <view class="min-h-screen bg-gray-50">
    <view v-if="isLoading" class="min-h-screen flex flex-col items-center justify-center">
      <view class="loading-spinner" />
      <text class="mt-4 text-gray-500">验证中...</text>
    </view>

    <view v-else-if="errorMessage" class="min-h-screen flex flex-col items-center justify-center px-6">
      <view class="mb-4 text-6xl">
        ❌
      </view>
      <text class="mb-2 text-lg text-gray-700">绑定失败</text>
      <text class="text-center text-sm text-gray-500">{{ errorMessage }}</text>
      <button
        class="mt-6 rounded-lg bg-blue-500 px-6 py-2 text-white"
        @click="cancelBind"
      >
        返回
      </button>
    </view>

    <view v-else class="px-4 py-6">
      <view class="mb-4 rounded-xl bg-white p-6 shadow-sm">
        <view class="mb-4 text-lg text-gray-800 font-semibold">
          设备信息
        </view>
        <view class="space-y-3">
          <view class="flex justify-between">
            <text class="text-gray-600">设备名称</text>
            <text class="text-gray-800">{{ deviceInfo?.name || '未命名设备' }}</text>
          </view>
          <view class="flex justify-between">
            <text class="text-gray-600">设备ID</text>
            <text class="text-xs text-gray-800">{{ deviceInfo?.id }}</text>
          </view>
        </view>
      </view>

      <view v-if="canBind && classInfo" class="mb-4 rounded-xl bg-white p-6 shadow-sm">
        <view class="mb-4 text-lg text-gray-800 font-semibold">
          班级信息
        </view>
        <view class="space-y-3">
          <view class="flex justify-between">
            <text class="text-gray-600">班级名称</text>
            <text class="text-gray-800">{{ classInfo.name }}</text>
          </view>
          <view v-if="classInfo.grade" class="flex justify-between">
            <text class="text-gray-600">年级</text>
            <text class="text-gray-800">{{ classInfo.grade }}</text>
          </view>
        </view>
      </view>

      <view v-if="canBind" class="mb-6 rounded-xl bg-blue-50 p-4">
        <view class="text-sm text-blue-700">
          <view class="mb-2 font-medium">
            绑定说明：
          </view>
          <view>1. 绑定后，该设备将用于本班级的考勤签到</view>
          <view>2. 一个设备只能绑定一个班级</view>
          <view>3. 如需更换班级，请先解绑当前设备</view>
        </view>
      </view>

      <view v-if="canBind" class="flex gap-3">
        <button
          class="flex-1 rounded-lg bg-gray-200 py-3 text-gray-700 font-medium"
          @click="cancelBind"
        >
          取消
        </button>
        <button
          class="flex-1 rounded-lg bg-orange-500 py-3 text-white font-medium"
          :class="{ 'opacity-50': isBinding }"
          :disabled="isBinding"
          @click="confirmBind"
        >
          {{ isBinding ? '绑定中...' : '确认绑定' }}
        </button>
      </view>

      <view v-else class="rounded-xl bg-red-50 p-4">
        <view class="text-sm text-red-700">
          <view class="mb-2 font-medium">
            无法绑定
          </view>
          <view>{{ errorMessage || '您不是班主任，无法绑定设备' }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #f97316;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
