<script setup lang="ts">
import type { LostFoundItem, LostFoundType } from '@/api/types/lostfound'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { getLostFoundList } from '@/api/lostfound'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'LostFoundList' })
definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '寻物启事',
    backgroundColor: '#F5F7FA',
  },
})

const loading = ref(false)
const list = ref<LostFoundItem[]>([])
const currentType = ref<LostFoundType>('lost')
const currentCategory = ref('')
const keyword = ref('')
const page = ref(1)
const size = 10
const total = ref(0)
const hasMore = ref(true)

const categories = ['全部', '证件', '电子产品', '生活用品', '学习用品', '衣物', '钥匙', '其他']

async function loadData(append = false) {
  if (loading.value)
    return
  loading.value = true

  try {
    const res = await getLostFoundList({
      page: page.value,
      size,
      type: currentType.value,
      category: currentCategory.value || undefined,
      keyword: keyword.value || undefined,
      status: 'open',
    })

    if (append) {
      list.value.push(...res.list)
    }
    else {
      list.value = res.list
    }
    total.value = res.total
    hasMore.value = list.value.length < res.total
  }
  catch (e) {
    console.error('加载失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function switchType(type: LostFoundType) {
  currentType.value = type
  page.value = 1
  hasMore.value = true
  loadData()
}

function selectCategory(cat: string) {
  currentCategory.value = cat === '全部' ? '' : cat
  page.value = 1
  hasMore.value = true
  loadData()
}

function handleSearch() {
  page.value = 1
  hasMore.value = true
  loadData()
}

function goDetail(id: number) {
  uni.navigateTo({
    url: `/pages-lostfound/detail/index?id=${id}`,
  })
}

function goPublish() {
  uni.navigateTo({
    url: '/pages-lostfound/publish/index',
  })
}

function formatTime(dateStr: string) {
  if (!dateStr)
    return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1)
    return '刚刚'
  if (minutes < 60)
    return `${minutes}分钟前`
  if (hours < 24)
    return `${hours}小时前`
  if (days < 30)
    return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

onMounted(() => {
  loadData()
})

onPullDownRefresh(() => {
  page.value = 1
  hasMore.value = true
  loadData().finally(() => {
    uni.stopPullDownRefresh()
  })
})

onReachBottom(() => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadData(true)
  }
})
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ paddingTop: `${safeAreaInsets?.top}px` }">
    <view class="sticky top-0 z-10 border-b bg-white">
      <view class="flex items-center justify-between px-4 py-3">
        <view class="flex items-center gap-2">
          <view class="i-carbon-search-locate text-xl text-blue-500" />
          <text class="text-lg text-gray-800 font-bold">寻物启事</text>
        </view>
        <view class="rounded-full bg-blue-500 px-4 py-1.5 text-sm text-white" @click="goPublish">
          发布
        </view>
      </view>

      <view class="flex border-b">
        <view
          class="flex-1 py-2.5 text-center text-sm font-medium"
          :class="currentType === 'lost' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'"
          @click="switchType('lost')"
        >
          丢失物品
        </view>
        <view
          class="flex-1 py-2.5 text-center text-sm font-medium"
          :class="currentType === 'found' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500'"
          @click="switchType('found')"
        >
          拾到物品
        </view>
      </view>

      <scroll-view scroll-x class="whitespace-nowrap px-4 py-2">
        <view
          v-for="cat in categories"
          :key="cat"
          class="mr-2 inline-block rounded-full px-3 py-1 text-xs"
          :class="(cat === '全部' && !currentCategory) || cat === currentCategory ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'"
          @click="selectCategory(cat)"
        >
          {{ cat }}
        </view>
      </scroll-view>

      <view class="px-4 pb-2">
        <view class="relative">
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索物品名称、地点..."
            class="w-full rounded-lg bg-gray-100 py-2 pl-10 pr-4 text-sm"
            confirm-type="search"
            @confirm="handleSearch"
          >
          <view class="i-carbon-search absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </view>
      </view>
    </view>

    <view v-if="loading && list.length === 0" class="flex flex-col items-center py-20">
      <wd-loading />
      <text class="mt-3 text-sm text-gray-400">加载中...</text>
    </view>

    <view v-else-if="list.length === 0" class="flex flex-col items-center py-20">
      <view class="mb-4 h-20 w-20 flex items-center justify-center rounded-full bg-gray-100">
        <view class="i-carbon-search text-4xl text-gray-300" />
      </view>
      <text class="text-sm text-gray-400">暂无启事</text>
      <view class="mt-4 rounded-full bg-blue-500 px-6 py-2 text-sm text-white" @click="goPublish">
        发布启事
      </view>
    </view>

    <view v-else class="p-4 space-y-3">
      <view
        v-for="item in list"
        :key="item.id"
        class="rounded-xl bg-white p-4 shadow-sm active:bg-gray-50"
        @click="goDetail(item.id)"
      >
        <view class="flex gap-3">
          <image
            v-if="item.images && item.images.length > 0"
            :src="item.images[0]"
            class="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
            mode="aspectFill"
          />
          <view class="min-w-0 flex-1">
            <view class="flex items-center gap-2">
              <view
                class="rounded px-2 py-0.5 text-xs font-medium"
                :class="item.type === 'lost' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'"
              >
                {{ item.type === 'lost' ? '丢失' : '拾到' }}
              </view>
              <text class="text-xs text-gray-400">{{ item.category }}</text>
              <text v-if="item.status === 'closed'" class="text-xs text-gray-400">已关闭</text>
              <text v-if="item.status === 'resolved'" class="text-xs text-green-500">已解决</text>
            </view>
            <view class="line-clamp-2 mt-1 text-base text-gray-800 font-medium">
              {{ item.title }}
            </view>
            <view v-if="item.location" class="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
              <view class="i-carbon-location h-3 w-3 flex-shrink-0" />
              <text>{{ item.location }}</text>
            </view>
            <view class="mt-2 flex items-center justify-between">
              <text class="text-xs text-gray-400">{{ formatTime(item.created_at) }}</text>
              <view class="flex items-center gap-1 text-xs text-gray-400">
                <view class="i-carbon-view h-3 w-3" />
                <text>{{ item.view_count || 0 }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="loading" class="py-4 text-center">
        <text class="text-sm text-gray-400">加载更多...</text>
      </view>

      <view v-else-if="!hasMore && list.length > 0" class="py-4 text-center">
        <text class="text-sm text-gray-400">没有更多了</text>
      </view>
    </view>
  </view>
</template>
