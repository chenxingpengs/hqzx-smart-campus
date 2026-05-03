<script setup lang="ts">
import { ref, watch } from 'vue'
import { getCachedImage } from '@/utils/imageCache'

const props = withDefaults(defineProps<{
  src?: string
  mode?: string
  class?: string
  lazyLoad?: boolean
  placeholder?: string
  showError?: boolean
}>(), {
  mode: 'aspectFill',
  lazyLoad: true,
  placeholder: '',
  showError: true,
})

const emit = defineEmits<{
  load: [e: Event]
  error: [e: Event]
}>()

const cachedSrc = ref('')
const loading = ref(true)
const hasError = ref(false)

async function loadImage() {
  if (!props.src) {
    cachedSrc.value = ''
    loading.value = false
    return
  }

  loading.value = true
  hasError.value = false

  try {
    const cached = await getCachedImage(props.src)
    cachedSrc.value = cached || props.src
  }
  catch (e) {
    console.error('加载缓存图片失败:', e)
    cachedSrc.value = props.src
  }
}

function handleLoad(e: Event) {
  loading.value = false
  hasError.value = false
  emit('load', e)
}

function handleError(e: Event) {
  loading.value = false
  hasError.value = true
  emit('error', e)
}

watch(() => props.src, () => {
  loadImage()
}, { immediate: true })
</script>

<template>
  <view class="cached-image-wrapper" :class="props.class">
    <image
      v-if="cachedSrc && !hasError"
      :src="cachedSrc"
      :mode="mode"
      :lazy-load="lazyLoad"
      class="cached-image"
      @load="handleLoad"
      @error="handleError"
    />
    <view v-if="loading" class="loading-placeholder">
      <image
        v-if="placeholder"
        :src="placeholder"
        :mode="mode"
        class="placeholder-image"
      />
      <view v-else class="loading-spinner">
        <wd-icon name="refresh" size="24" color="#999" class="animate-spin" />
      </view>
    </view>
    <view v-if="hasError && showError" class="error-placeholder">
      <wd-icon name="image-error" size="32" color="#ccc" />
    </view>
  </view>
</template>

<style scoped>
.cached-image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cached-image {
  width: 100%;
  height: 100%;
}

.loading-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.placeholder-image {
  width: 100%;
  height: 100%;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
