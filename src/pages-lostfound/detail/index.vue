<script setup lang="ts">
import type { LostFoundItem } from '@/api/types/lostfound'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { closeLostFound, deleteLostFound, getLostFoundDetail, resolveLostFound } from '@/api/lostfound'
import { useUserStore } from '@/store/user'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'LostFoundDetail' })
definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '启事详情',
    backgroundColor: '#F5F7FA',
  },
})

const userStore = useUserStore()
const loading = ref(true)
const item = ref<LostFoundItem | null>(null)
const currentImage = ref(0)
const showActions = ref(false)

const isOwner = ref(false)

function formatTime(dateStr: string) {
  if (!dateStr)
    return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function loadDetail(id: number) {
  loading.value = true
  try {
    const res = await getLostFoundDetail(id)
    item.value = res
    isOwner.value = res.user_id === userStore.userInfo?.id
  }
  catch (e) {
    console.error('加载失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function previewImage(index: number) {
  if (item.value?.images && item.value.images.length > 0) {
    uni.previewImage({
      current: index,
      urls: item.value.images,
    })
  }
}

function handleSwiperChange(e: any) {
  currentImage.value = e.detail.current
}

async function handleClose() {
  if (!item.value)
    return
  uni.showModal({
    title: '确认关闭',
    content: '确定要关闭此启事吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await closeLostFound(item.value!.id)
          uni.showToast({ title: '已关闭', icon: 'success' })
          showActions.value = false
          loadDetail(item.value!.id)
        }
        catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleResolve() {
  if (!item.value)
    return
  uni.showModal({
    title: '确认解决',
    content: '确定要标记为已解决吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await resolveLostFound(item.value!.id)
          uni.showToast({ title: '已标记为解决', icon: 'success' })
          showActions.value = false
          loadDetail(item.value!.id)
        }
        catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleDelete() {
  if (!item.value)
    return
  uni.showModal({
    title: '确认删除',
    content: '确定要删除此启事吗？删除后无法恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteLostFound(item.value!.id)
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        }
        catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    },
  })
}

onLoad((options) => {
  const id = Number(options?.id)
  if (id) {
    loadDetail(id)
  }
})
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ paddingTop: `${safeAreaInsets?.top}px` }">
    <view v-if="loading" class="flex flex-col items-center py-20">
      <wd-loading />
      <text class="mt-3 text-sm text-gray-400">加载中...</text>
    </view>

    <template v-else-if="item">
      <swiper
        v-if="item.images && item.images.length > 0"
        class="h-64 w-full bg-black"
        :indicator-dots="item.images.length > 1"
        indicator-color="rgba(255,255,255,0.5)"
        indicator-active-color="#fff"
        @change="handleSwiperChange"
      >
        <swiper-item v-for="(img, index) in item.images" :key="index">
          <image
            :src="img"
            class="h-full w-full object-cover"
            mode="aspectFill"
            @click="previewImage(index)"
          />
        </swiper-item>
      </swiper>

      <view class="p-4">
        <view class="mb-2 flex items-center gap-2">
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

        <view class="mb-3 text-xl text-gray-800 font-bold">
          {{ item.title }}
        </view>

        <view class="mb-4 flex items-center gap-4 text-xs text-gray-400">
          <text>{{ formatTime(item.created_at) }}</text>
          <view class="flex items-center gap-1">
            <view class="i-carbon-view h-3 w-3" />
            <text>{{ item.view_count || 0 }} 次浏览</text>
          </view>
        </view>

        <view class="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
          <image
            v-if="item.user_avatar"
            :src="item.user_avatar"
            class="h-10 w-10 rounded-full object-cover"
            mode="aspectFill"
          />
          <view v-else class="h-10 w-10 flex items-center justify-center rounded-full bg-gray-200">
            <view class="i-carbon-user text-xl text-gray-400" />
          </view>
          <view>
            <view class="text-sm text-gray-800 font-medium">
              {{ item.user_name || '匿名用户' }}
            </view>
          </view>
        </view>

        <view class="mb-4 space-y-3">
          <view v-if="item.location" class="flex items-start gap-2">
            <view class="i-carbon-location mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
            <view>
              <text class="text-xs text-gray-400">地点</text>
              <view class="text-sm text-gray-700">
                {{ item.location }}
              </view>
            </view>
          </view>

          <view v-if="item.contact" class="flex items-start gap-2">
            <view class="i-carbon-phone mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
            <view>
              <text class="text-xs text-gray-400">联系方式</text>
              <view class="text-sm text-gray-700">
                {{ item.contact }}
              </view>
            </view>
          </view>
        </view>

        <view class="border-t pt-4">
          <text class="text-xs text-gray-400">详细描述</text>
          <view class="mt-2 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {{ item.description || '暂无详细描述' }}
          </view>
        </view>
      </view>

      <view v-if="isOwner && item.status === 'open'" class="fixed bottom-0 left-0 right-0 border-t bg-white p-4" :style="{ paddingBottom: `${safeAreaInsets?.bottom}px` }">
        <view class="flex gap-3">
          <view class="flex-1 rounded-lg bg-gray-100 py-3 text-center text-sm text-gray-700" @click="handleClose">
            关闭启事
          </view>
          <view class="flex-1 rounded-lg bg-green-500 py-3 text-center text-sm text-white" @click="handleResolve">
            标记已解决
          </view>
          <view class="rounded-lg bg-red-500 px-4 py-3 text-center text-sm text-white" @click="handleDelete">
            删除
          </view>
        </view>
      </view>
    </template>

    <view v-else class="flex flex-col items-center py-20">
      <text class="text-sm text-gray-400">启事不存在</text>
    </view>
  </view>
</template>
