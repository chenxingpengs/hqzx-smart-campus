<script setup lang="ts">
import type { LostFoundType } from '@/api/types/lostfound'
import { ref } from 'vue'
import { createLostFound } from '@/api/lostfound'
import useUpload from '@/hooks/useUpload'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'LostFoundPublish' })
definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '发布启事',
    backgroundColor: '#F5F7FA',
  },
})

const categories = ref<string[]>(['证件', '电子产品', '生活用品', '学习用品', '衣物', '钥匙', '其他'])

const form = ref({
  type: 'lost' as LostFoundType,
  category: '',
  title: '',
  description: '',
  images: [] as string[],
  location: '',
  contact: '',
})

const submitting = ref(false)

const { loading: uploadLoading, run: runUpload } = useUpload({
  maxSize: 5 * 1024 * 1024,
  success: (res: any) => {
    if (res.url) {
      form.value.images.push(res.url)
    }
    else if (res) {
      form.value.images.push(res)
    }
  },
})

function selectType(type: LostFoundType) {
  form.value.type = type
}

function selectCategory(cat: string) {
  form.value.category = cat
}

function removeImage(index: number) {
  form.value.images.splice(index, 1)
}

function chooseImage() {
  if (form.value.images.length >= 9) {
    uni.showToast({ title: '最多上传9张图片', icon: 'none' })
    return
  }
  runUpload()
}

function validateForm(): boolean {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入标题', icon: 'none' })
    return false
  }
  if (!form.value.category) {
    uni.showToast({ title: '请选择分类', icon: 'none' })
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validateForm())
    return

  submitting.value = true
  try {
    await createLostFound(form.value)
    uni.showToast({ title: '发布成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  }
  catch (e) {
    console.error('发布失败:', e)
    uni.showToast({ title: '发布失败', icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="min-h-screen bg-gray-50 pb-24" :style="{ paddingTop: `${safeAreaInsets?.top}px` }">
    <view class="p-4 space-y-4">
      <view>
        <view class="mb-2 text-sm text-gray-700 font-medium">
          启事类型 <text class="text-red-500">*</text>
        </view>
        <view class="flex gap-3">
          <view
            class="flex-1 border-2 rounded-lg py-3 text-center text-sm font-medium transition-all"
            :class="form.type === 'lost' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600'"
            @click="selectType('lost')"
          >
            <view class="flex items-center justify-center gap-2">
              <view class="i-carbon-warning-alt text-base" />
              <text>丢失物品</text>
            </view>
          </view>
          <view
            class="flex-1 border-2 rounded-lg py-3 text-center text-sm font-medium transition-all"
            :class="form.type === 'found' ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-200 text-gray-600'"
            @click="selectType('found')"
          >
            <view class="flex items-center justify-center gap-2">
              <view class="i-carbon-checkmark-circle text-base" />
              <text>拾到物品</text>
            </view>
          </view>
        </view>
      </view>

      <view>
        <view class="mb-2 text-sm text-gray-700 font-medium">
          物品分类 <text class="text-red-500">*</text>
        </view>
        <view class="flex flex-wrap gap-2">
          <view
            v-for="cat in categories"
            :key="cat"
            class="border rounded-full px-4 py-2 text-sm"
            :class="cat === form.category ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 text-gray-600'"
            @click="selectCategory(cat)"
          >
            {{ cat }}
          </view>
        </view>
      </view>

      <view>
        <view class="mb-2 text-sm text-gray-700 font-medium">
          标题 <text class="text-red-500">*</text>
        </view>
        <input
          v-model="form.title"
          type="text"
          placeholder="请输入物品名称或简要描述"
          maxlength="100"
          class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm"
        >
        <view class="mt-1 text-right text-xs text-gray-400">
          {{ form.title.length }}/100
        </view>
      </view>

      <view>
        <view class="mb-2 text-sm text-gray-700 font-medium">
          图片（最多9张）
        </view>
        <view class="grid grid-cols-3 gap-2">
          <view
            v-for="(img, index) in form.images"
            :key="index"
            class="relative aspect-square"
          >
            <image
              :src="img"
              class="h-full w-full rounded-lg object-cover"
              mode="aspectFill"
            />
            <view
              class="absolute h-5 w-5 rounded-full bg-red-500 text-center text-xs text-white leading-5 -right-1 -top-1"
              @click="removeImage(index)"
            >
              ×
            </view>
          </view>
          <view
            v-if="form.images.length < 9"
            class="aspect-square flex items-center justify-center border-2 border-gray-300 rounded-lg border-dashed bg-gray-50"
            @click="chooseImage"
          >
            <view v-if="uploadLoading" class="i-carbon-circle-dash animate-spin text-xl text-gray-400" />
            <view v-else class="text-center">
              <view class="i-carbon-add text-2xl text-gray-400" />
              <text class="text-xs text-gray-400">添加图片</text>
            </view>
          </view>
        </view>
      </view>

      <view>
        <view class="mb-2 text-sm text-gray-700 font-medium">
          详细描述
        </view>
        <textarea
          v-model="form.description"
          placeholder="请详细描述物品特征、丢失/拾到时间等信息..."
          maxlength="500"
          class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm"
          :style="{ height: '100px' }"
        />
        <view class="mt-1 text-right text-xs text-gray-400">
          {{ form.description.length }}/500
        </view>
      </view>

      <view>
        <view class="mb-2 text-sm text-gray-700 font-medium">
          地点
        </view>
        <input
          v-model="form.location"
          type="text"
          placeholder="丢失/拾到的地点"
          maxlength="200"
          class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm"
        >
      </view>

      <view>
        <view class="mb-2 text-sm text-gray-700 font-medium">
          联系方式
        </view>
        <input
          v-model="form.contact"
          type="text"
          placeholder="手机号、微信等联系方式"
          maxlength="100"
          class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm"
        >
      </view>
    </view>

    <view class="fixed bottom-0 left-0 right-0 border-t bg-white p-4" :style="{ paddingBottom: `${safeAreaInsets?.bottom}px` }">
      <view
        class="rounded-lg py-3 text-center text-sm text-white font-medium"
        :class="submitting ? 'bg-gray-400' : 'bg-blue-500'"
        @click="!submitting && handleSubmit()"
      >
        {{ submitting ? '发布中...' : '发布启事' }}
      </view>
    </view>
  </view>
</template>
