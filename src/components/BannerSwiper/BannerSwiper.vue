<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getCachedBanner } from '@/utils/bannerCache'

export interface BannerItem {
  id: number | string
  image: string
  title?: string
  link?: string
  linkType?: 'page' | 'webview' | 'none'
}

const props = withDefaults(defineProps<{
  list: BannerItem[]
  height?: string
  autoplay?: boolean
  interval?: number
  indicatorDots?: boolean
  indicatorColor?: string
  indicatorActiveColor?: string
}>(), {
  height: '160px',
  autoplay: true,
  interval: 3000,
  indicatorDots: true,
  indicatorColor: 'rgba(255, 255, 255, 0.5)',
  indicatorActiveColor: '#ffffff',
})

const emit = defineEmits<{
  click: [item: BannerItem]
}>()

const cachedImages = ref<Record<string, string>>({})
const current = ref(0)

async function loadCachedImages() {
  for (const item of props.list) {
    if (item.image && !cachedImages.value[item.image]) {
      const cachedUrl = await getCachedBanner(item.image)
      cachedImages.value[item.image] = cachedUrl
    }
  }
}

function getImageUrl(image: string): string {
  return cachedImages.value[image] || image
}

function handleClick(item: BannerItem) {
  emit('click', item)

  if (!item.link || item.linkType === 'none') {
    return
  }

  if (item.linkType === 'webview') {
    uni.navigateTo({
      url: `/pages-plugin-webview/webview/index?url=${encodeURIComponent(item.link)}`,
    })
  }
  else {
    uni.navigateTo({
      url: item.link,
      fail: () => {
        uni.switchTab({
          url: item.link!,
        })
      },
    })
  }
}

function handleSwiperChange(e: any) {
  current.value = e.detail.current
}

watch(() => props.list, () => {
  loadCachedImages()
}, { immediate: true, deep: true })

onMounted(() => {
  loadCachedImages()
})
</script>

<template>
  <view class="banner-swiper-container" :style="{ height }">
    <swiper
      class="banner-swiper"
      :autoplay="autoplay"
      :interval="interval"
      :indicator-dots="false"
      circular
      @change="handleSwiperChange"
    >
      <swiper-item
        v-for="item in list"
        :key="item.id"
        class="banner-item"
        @click="handleClick(item)"
      >
        <image
          class="banner-image"
          :src="getImageUrl(item.image)"
          mode="aspectFill"
        />
        <view v-if="item.title" class="banner-title">
          {{ item.title }}
        </view>
      </swiper-item>
    </swiper>

    <view v-if="indicatorDots && list.length > 1" class="indicator-dots">
      <view
        v-for="(item, index) in list"
        :key="`dot-${item.id}`"
        class="indicator-dot"
        :class="{ active: index === current }"
        :style="{
          backgroundColor: index === current ? indicatorActiveColor : indicatorColor,
        }"
      />
    </view>
  </view>
</template>

<style scoped>
.banner-swiper-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
}

.banner-swiper {
  width: 100%;
  height: 100%;
}

.banner-item {
  position: relative;
  width: 100%;
  height: 100%;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}

.indicator-dots {
  position: absolute;
  bottom: 12rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8rpx;
  z-index: 10;
}

.indicator-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.indicator-dot.active {
  width: 24rpx;
  border-radius: 6rpx;
}
</style>
