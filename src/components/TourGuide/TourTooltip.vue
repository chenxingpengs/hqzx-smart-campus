<script setup lang="ts">
import type { TooltipPosition, TourTooltipProps } from './types'
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<TourTooltipProps>(), {
  showSkip: true,
  showPrevious: true,
  skipText: '跳过',
  previousText: '上一步',
  nextText: '下一步',
  finishText: '完成',
})

const emit = defineEmits<{
  previous: []
  next: []
  skip: []
  finish: []
}>()

const visible = ref(true)
const tooltipPosition = ref({ x: 0, y: 0 })
const actualPosition = ref<TooltipPosition>(props.position)

const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.x}px`,
  top: `${tooltipPosition.value.y}px`,
}))

function calculatePosition() {
  if (!props.targetRect)
    return

  const { width: targetWidth, height: targetHeight, left, top } = props.targetRect
  const tooltipWidth = 280
  const tooltipHeight = 200
  const gap = 16

  const systemInfo = uni.getSystemInfoSync()
  const screenWidth = systemInfo.windowWidth
  const screenHeight = systemInfo.windowHeight
  const safeAreaBottom = systemInfo.safeAreaInsets?.bottom || 0

  let x = 0
  let y = 0
  let position = props.position

  const topSpace = top
  const bottomSpace = screenHeight - (top + targetHeight)
  const hasTopSpace = topSpace >= tooltipHeight + gap
  const hasBottomSpace = bottomSpace >= tooltipHeight + gap + safeAreaBottom

  switch (position) {
    case 'top':
      x = left + (targetWidth - tooltipWidth) / 2
      if (hasTopSpace) {
        y = top - tooltipHeight - gap
        position = 'top'
      }
      else if (hasBottomSpace) {
        y = top + targetHeight + gap
        position = 'bottom'
      }
      else {
        if (topSpace > bottomSpace) {
          y = Math.max(10, top - tooltipHeight - gap)
          position = 'top'
        }
        else {
          y = Math.min(screenHeight - tooltipHeight - safeAreaBottom - 10, top + targetHeight + gap)
          position = 'bottom'
        }
      }
      break

    case 'bottom':
      x = left + (targetWidth - tooltipWidth) / 2
      if (hasBottomSpace) {
        y = top + targetHeight + gap
        position = 'bottom'
      }
      else if (hasTopSpace) {
        y = top - tooltipHeight - gap
        position = 'top'
      }
      else {
        if (bottomSpace > topSpace) {
          y = Math.min(screenHeight - tooltipHeight - safeAreaBottom - 10, top + targetHeight + gap)
          position = 'bottom'
        }
        else {
          y = Math.max(10, top - tooltipHeight - gap)
          position = 'top'
        }
      }
      break

    case 'left':
      x = left - tooltipWidth - gap
      y = top + (targetHeight - tooltipHeight) / 2
      if (x < 10) {
        x = left + targetWidth + gap
        position = 'right'
        if (x + tooltipWidth > screenWidth - 10) {
          if (hasBottomSpace) {
            x = Math.max(10, (screenWidth - tooltipWidth) / 2)
            position = 'bottom'
            y = top + targetHeight + gap
          }
          else if (hasTopSpace) {
            x = Math.max(10, (screenWidth - tooltipWidth) / 2)
            position = 'top'
            y = top - tooltipHeight - gap
          }
          else {
            x = Math.max(10, (screenWidth - tooltipWidth) / 2)
            position = 'bottom'
            y = Math.min(screenHeight - tooltipHeight - safeAreaBottom - 10, top + targetHeight + gap)
          }
        }
      }
      break

    case 'right':
      x = left + targetWidth + gap
      y = top + (targetHeight - tooltipHeight) / 2
      if (x + tooltipWidth > screenWidth - 10) {
        x = left - tooltipWidth - gap
        position = 'left'
        if (x < 10) {
          if (hasBottomSpace) {
            x = Math.min(screenWidth - tooltipWidth - 10, (screenWidth - tooltipWidth) / 2)
            position = 'bottom'
            y = top + targetHeight + gap
          }
          else if (hasTopSpace) {
            x = Math.min(screenWidth - tooltipWidth - 10, (screenWidth - tooltipWidth) / 2)
            position = 'top'
            y = top - tooltipHeight - gap
          }
          else {
            x = Math.min(screenWidth - tooltipWidth - 10, (screenWidth - tooltipWidth) / 2)
            position = 'bottom'
            y = Math.min(screenHeight - tooltipHeight - safeAreaBottom - 10, top + targetHeight + gap)
          }
        }
      }
      break
  }

  if (x < 10)
    x = 10
  if (x + tooltipWidth > screenWidth - 10)
    x = screenWidth - tooltipWidth - 10
  if (y < 10)
    y = 10
  if (y + tooltipHeight > screenHeight - safeAreaBottom - 10) {
    y = screenHeight - tooltipHeight - safeAreaBottom - 10
  }

  tooltipPosition.value = { x, y }
  actualPosition.value = position
}

function show() {
  visible.value = true
}

function hide() {
  visible.value = false
}

watch(() => props.targetRect, () => {
  calculatePosition()
}, { immediate: true })

defineExpose({
  show,
  hide,
  calculatePosition,
})
</script>

<template>
  <view
    v-if="visible"
    class="tour-tooltip"
    :style="tooltipStyle"
  >
    <view class="tooltip-arrow" :class="`arrow-${actualPosition}`" />

    <view class="tooltip-content">
      <view class="tooltip-title">
        {{ title }}
      </view>

      <view class="tooltip-description">
        {{ content }}
      </view>

      <view class="tooltip-progress">
        <view class="progress-dots">
          <view
            v-for="i in totalSteps"
            :key="i"
            class="dot"
            :class="{ active: i === currentStep + 1 }"
          />
        </view>
        <view class="progress-text">
          {{ currentStep + 1 }} / {{ totalSteps }}
        </view>
      </view>

      <view class="tooltip-actions">
        <view
          v-if="showSkip"
          class="btn btn-skip"
          @click.stop="emit('skip')"
        >
          {{ skipText }}
        </view>

        <view
          v-if="showPrevious && currentStep > 0"
          class="btn btn-previous"
          @click.stop="emit('previous')"
        >
          {{ previousText }}
        </view>

        <view
          v-if="currentStep < totalSteps - 1"
          class="btn btn-next"
          @click.stop="emit('next')"
        >
          {{ nextText }}
        </view>

        <view
          v-else
          class="btn btn-finish"
          @click.stop="emit('finish')"
        >
          {{ finishText }}
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.tour-tooltip {
  position: fixed;
  z-index: 10000;
  width: 280px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: fadeInUp 0.3s ease;
  pointer-events: auto;
}

.tooltip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border: 8px solid transparent;
}

.arrow-top {
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: #ffffff;
}

.arrow-bottom {
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: #ffffff;
}

.arrow-left {
  right: -16px;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: #ffffff;
}

.arrow-right {
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: #ffffff;
}

.tooltip-content {
  padding: 20px;
}

.tooltip-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 10px;
}

.tooltip-description {
  font-size: 14px;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 18px;
}

.tooltip-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.progress-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: #e5e5e5;
  transition: all 0.3s ease;
}

.dot.active {
  width: 18px;
  background: #1890ff;
}

.progress-text {
  font-size: 13px;
  color: #999999;
}

.tooltip-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.btn {
  padding: 9px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-skip {
  color: #999999;
  background: transparent;
}

.btn-skip:active {
  color: #666666;
}

.btn-previous {
  color: #1890ff;
  background: transparent;
  border: 1px solid #1890ff;
}

.btn-previous:active {
  background: rgba(24, 144, 255, 0.05);
}

.btn-next,
.btn-finish {
  color: #ffffff;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.35);
}

.btn-next:active,
.btn-finish:active {
  opacity: 0.85;
  transform: scale(0.98);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
