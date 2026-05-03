<script setup lang="ts">
import type { HighlightRect, TourMaskProps } from './types'
import { computed, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<TourMaskProps>(), {
  padding: 8,
  borderRadius: 8,
  maskColor: 'rgba(0, 0, 0, 0.6)',
  highlightColor: '#1890ff',
  animate: true,
})

const emit = defineEmits<{
  'mask-click': []
  'highlight-ready': []
}>()

const visible = ref(true)
const highlightRect = ref<HighlightRect | null>(null)

const highlightStyle = computed(() => {
  if (!highlightRect.value)
    return {}
  const { x, y, width, height, borderRadius } = highlightRect.value
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: `${borderRadius}px`,
    boxShadow: `0 0 0 9999px ${props.maskColor}`,
  }
})

const borderStyle = computed(() => ({
  borderColor: props.highlightColor,
}))

async function updateHighlight() {
  try {
    const rect = await getElementRect(props.target)
    highlightRect.value = {
      x: (rect.left as number) - props.padding,
      y: (rect.top as number) - props.padding,
      width: (rect.width as number) + props.padding * 2,
      height: (rect.height as number) + props.padding * 2,
      padding: props.padding,
      borderRadius: props.borderRadius,
    }
    emit('highlight-ready')
  }
  catch (error) {
    console.error('Failed to get element rect:', error)
  }
}

function getElementRect(selector: string): Promise<UniApp.NodeInfo> {
  return new Promise((resolve, reject) => {
    uni.createSelectorQuery()
      .select(selector)
      .boundingClientRect((rect) => {
        if (rect) {
          resolve(rect as UniApp.NodeInfo)
        }
        else {
          reject(new Error(`Element not found: ${selector}`))
        }
      })
      .exec()
  })
}

function show() {
  visible.value = true
}

function hide() {
  visible.value = false
}

function handleMaskClick() {
  emit('mask-click')
}

onMounted(() => {
  updateHighlight()
})

watch(() => props.target, () => {
  updateHighlight()
})

defineExpose({
  show,
  hide,
  updateHighlight,
})
</script>

<template>
  <view
    v-if="visible"
    class="tour-mask"
    @click="handleMaskClick"
  >
    <view
      v-if="highlightRect"
      class="highlight-area"
      :style="highlightStyle"
      :class="{ 'animate-highlight': animate }"
      @click.stop
    >
      <view class="highlight-border" :style="borderStyle" />
    </view>
  </view>
</template>

<style scoped>
.tour-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: auto;
  overflow: hidden;
}

.highlight-area {
  position: absolute;
  background: transparent;
  will-change: transform, width, height;
}

.animate-highlight {
  transition: all 0.3s ease;
}

.highlight-border {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid;
  border-radius: inherit;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
