<script lang="ts" setup>
definePage({
  style: {
    navigationBarTitleText: '关于我们',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const appVersion = '1.0.0'
const buildTime = '2026-04'
const appName = '课后服务考勤系统'
const schoolName = '珠海市红旗中学'

const infoItems = [
  { icon: 'bank', label: '所属学校', value: schoolName, color: '#3b82f6' },
  { icon: 'tag', label: '应用名称', value: appName, color: '#8b5cf6' },
  { icon: 'info', label: '当前版本', value: `v${appVersion}`, color: '#10b981' },
  { icon: 'time', label: '更新时间', value: buildTime, color: '#f59e0b' },
]

function handleCopyVersion() {
  uni.setClipboardData({
    data: `${appName} v${appVersion}`,
    success: () => {
      uni.showToast({ title: '已复制版本信息', icon: 'success' })
    },
  })
}

function handleCheckUpdate() {
  uni.showToast({ title: '已是最新版本', icon: 'none' })
}
</script>

<template>
  <view class="about-page min-h-screen bg-gray-50">
    <view class="flex flex-col items-center pb-8 pt-12">
      <view class="h-24 w-24 flex items-center justify-center rounded-3xl from-blue-500 to-indigo-600 bg-gradient-to-br shadow-blue-200 shadow-lg">
        <wd-icon name="calendar" size="40" color="#fff" />
      </view>
      <view class="mt-5 text-xl text-gray-800 font-bold">
        {{ appName }}
      </view>
      <view class="mt-2 text-sm text-gray-400" @click="handleCopyVersion">
        版本 v{{ appVersion }} · 点击复制
      </view>
    </view>

    <view class="px-4">
      <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
        <view
          v-for="(item, index) in infoItems"
          :key="item.label"
          class="flex items-center px-5 py-4"
          :class="{ 'border-b border-gray-50': index < infoItems.length - 1 }"
        >
          <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl" :style="{ backgroundColor: `${item.color}15` }">
            <wd-icon :name="item.icon" size="20" :color="item.color" />
          </view>
          <view class="flex-1">
            <view class="text-sm text-gray-400">
              {{ item.label }}
            </view>
          </view>
          <view class="text-base text-gray-800 font-medium">
            {{ item.value }}
          </view>
        </view>
      </view>
    </view>

    <view class="mt-4 px-4">
      <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
        <view
          class="flex items-center px-5 py-4 active:bg-gray-50"
          @click="handleCheckUpdate"
        >
          <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-cyan-50">
            <wd-icon name="refresh" size="20" color="#06b6d4" />
          </view>
          <view class="flex-1 text-base text-gray-800">
            检查更新
          </view>
          <wd-icon name="arrow-right" size="16" color="#c0c4cc" />
        </view>

        <view class="flex items-center border-t border-gray-50 px-5 py-4">
          <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-orange-50">
            <wd-icon name="service" size="20" color="#f59e0b" />
          </view>
          <view class="flex-1 text-base text-gray-800">
            用户协议
          </view>
          <wd-icon name="arrow-right" size="16" color="#c0c4cc" />
        </view>

        <view class="flex items-center border-t border-gray-50 px-5 py-4">
          <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-pink-50">
            <wd-icon name="shield" size="20" color="#ec4899" />
          </view>
          <view class="flex-1 text-base text-gray-800">
            隐私政策
          </view>
          <wd-icon name="arrow-right" size="16" color="#c0c4cc" />
        </view>
      </view>
    </view>

    <view class="mt-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
      <text class="text-xs text-gray-300">{{ schoolName }} · {{ appName }}</text>
      <view class="mt-1">
        <text class="text-xs text-gray-200">© {{ new Date().getFullYear() }} All Rights Reserved</text>
      </view>
    </view>
  </view>
</template>
