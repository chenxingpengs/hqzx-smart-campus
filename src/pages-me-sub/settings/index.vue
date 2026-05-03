<script lang="ts" setup>
import { ref } from 'vue'

definePage({
  style: {
    navigationBarTitleText: '系统设置',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const clearingCache = ref(false)
const cacheSize = ref('计算中...')

const settingGroups = ref([
  {
    title: '通用设置',
    items: [
      { id: 'notification', icon: 'notification', title: '消息通知', desc: '接收考勤提醒通知', hasSwitch: true, enabled: true, color: '#3b82f6' },
      { id: 'sound', icon: 'sound', title: '提示音', desc: '操作提示音效', hasSwitch: true, enabled: true, color: '#8b5cf6' },
    ],
  },
  {
    title: '存储与数据',
    items: [
      { id: 'cache', icon: 'folder', title: '清除缓存', desc: '', color: '#f59e0b', action: true },
      { id: 'data', icon: 'download', title: '数据管理', desc: '导出或同步数据', color: '#06b6d4', arrow: true },
    ],
  },
  {
    title: '其他',
    items: [
      { id: 'update', icon: 'refresh', title: '检查更新', desc: '查看是否有新版本', color: '#1989fa', arrow: true },
      { id: 'about', icon: 'info-circle', title: '关于我们', desc: '版本信息与帮助', color: '#10b981', arrow: true },
      { id: 'feedback', icon: 'edit', title: '意见反馈', desc: '问题反馈与建议', color: '#ec4899', arrow: true },
    ],
  },
])

function getCacheSize() {
  try {
    const res = uni.getStorageInfoSync()
    const sizeKB = res.currentSize
    if (sizeKB < 1024) {
      cacheSize.value = `${sizeKB} KB`
    }
    else {
      cacheSize.value = `${(sizeKB / 1024).toFixed(1)} MB`
    }
  }
  catch (e) {
    cacheSize.value = '未知'
  }
}

getCacheSize()

function handleToggle(item: any) {
  item.enabled = !item.enabled
  uni.showToast({ title: item.enabled ? '已开启' : '已关闭', icon: 'none' })
}

function handleClearCache() {
  if (clearingCache.value)
    return
  uni.showModal({
    title: '确认清除',
    content: '确定要清除本地缓存吗？不会影响您的账号数据。',
    success: async (res) => {
      if (res.confirm) {
        clearingCache.value = true
        try {
          uni.clearStorageSync()
          cacheSize.value = '0 KB'
          uni.showToast({ title: '清除成功', icon: 'success' })
          getCacheSize()
        }
        catch (e) {
          uni.showToast({ title: '清除失败', icon: 'none' })
        }
        finally {
          clearingCache.value = false
        }
      }
    },
  })
}

function handleItemClick(item: any) {
  switch (item.id) {
    case 'cache':
      handleClearCache()
      break
    case 'update':
      uni.navigateTo({ url: '/pages/settings/update' })
      break
    case 'about':
      uni.navigateTo({ url: '/pages-me-sub/about/index' })
      break
    case 'feedback':
      uni.showToast({ title: '感谢您的反馈', icon: 'none' })
      break
    default:
      break
  }
}
</script>

<template>
  <view class="settings-page min-h-screen bg-gray-50">
    <view v-for="(group, gIndex) in settingGroups" :key="gIndex" class="mt-4 px-4" :class="{ 'mt-4': gIndex > 0 }">
      <view class="mb-2 px-1">
        <text class="text-xs text-gray-400 font-medium">{{ group.title }}</text>
      </view>
      <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
        <view
          v-for="(item, index) in group.items"
          :key="item.id"
          class="flex items-center px-5 py-4 active:bg-gray-50"
          :class="{ 'border-b border-gray-50': index < group.items.length - 1 }"
          @click="handleItemClick(item)"
        >
          <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl" :style="{ backgroundColor: `${item.color}15` }">
            <wd-icon :name="item.icon" size="20" :color="item.color" />
          </view>

          <view class="min-w-0 flex-1">
            <view class="text-base text-gray-800">
              {{ item.title }}
            </view>
            <view v-if="!item.hasSwitch && !item.action" class="mt-0.5 truncate text-xs text-gray-400">
              {{ item.desc }}
            </view>
            <view v-if="item.id === 'cache'" class="mt-0.5 text-xs text-gray-400">
              {{ cacheSize }}
            </view>
          </view>

          <view v-if="item.hasSwitch" class="ml-3">
            <switch
              :checked="item.enabled"
              color="#3b82f6"
              style="transform: scale(0.85)"
              @change="handleToggle(item)"
            />
          </view>

          <view v-if="item.arrow" class="ml-3">
            <wd-icon name="arrow-right" size="16" color="#c0c4cc" />
          </view>

          <view v-if="item.action" class="ml-3">
            <wd-icon name="arrow-right" size="16" color="#c0c4cc" />
          </view>
        </view>
      </view>
    </view>

    <view class="pb-[calc(2rem+env(safe-area-inset-bottom))]" />
  </view>
</template>
