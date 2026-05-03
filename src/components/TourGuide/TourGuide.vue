<script setup lang="ts">
import type { TourGuideProps, TourStep } from './types'
import { computed, nextTick, ref, watch } from 'vue'
import TourMask from './TourMask.vue'
import TourTooltip from './TourTooltip.vue'

const props = withDefaults(defineProps<TourGuideProps>(), {
  startIndex: 0,
  maskClosable: false,
  showSkip: true,
  showPrevious: true,
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  'complete': []
  'skip': []
  'step-change': [index: number]
  'close': []
}>()

const currentStepIndex = ref(props.startIndex)
const targetRect = ref<UniApp.NodeInfo | null>(null)
const isAnimating = ref(false)

const currentStep = computed<TourStep>(() => {
  return props.steps[currentStepIndex.value] || props.steps[0]
})

function disablePageScroll() {
  // #ifdef H5
  document.body.style.overflow = 'hidden'
  // #endif
}

function enablePageScroll() {
  // #ifdef H5
  document.body.style.overflow = ''
  // #endif
}

async function updateHighlight() {
  if (!currentStep.value)
    return

  try {
    const rect = await getElementRect(currentStep.value.target)
    targetRect.value = rect
    console.log('[TourGuide] 元素位置获取成功:', rect)

    const systemInfo = uni.getSystemInfoSync()
    const screenHeight = systemInfo.windowHeight
    const padding = 100

    if (rect.top < padding || rect.bottom > screenHeight - padding) {
      const scrollTop = rect.top < padding
        ? 0
        : rect.top - padding

      await new Promise<void>((resolve) => {
        uni.pageScrollTo({
          scrollTop: Math.max(0, scrollTop),
          duration: 300,
          success: () => {
            setTimeout(async () => {
              const newRect = await getElementRect(currentStep.value.target)
              targetRect.value = newRect
              resolve()
            }, 350)
          },
          fail: () => resolve(),
        })
      })
    }
  }
  catch (error) {
    console.error('Failed to get element rect:', error)
    if (currentStepIndex.value < props.steps.length - 1) {
      nextStep()
    }
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

async function nextStep() {
  if (isAnimating.value)
    return
  if (currentStepIndex.value >= props.steps.length - 1)
    return

  isAnimating.value = true
  currentStepIndex.value++
  emit('step-change', currentStepIndex.value)

  await nextTick()
  await updateHighlight()

  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

async function previousStep() {
  if (isAnimating.value)
    return
  if (currentStepIndex.value <= 0)
    return

  isAnimating.value = true
  currentStepIndex.value--
  emit('step-change', currentStepIndex.value)

  await nextTick()
  await updateHighlight()

  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

function skipTour() {
  console.log('[TourGuide] 用户跳过引导')
  enablePageScroll()
  emit('skip')
  emit('update:show', false)
}

function completeTour() {
  console.log('[TourGuide] 引导完成')
  enablePageScroll()
  emit('complete')
  emit('update:show', false)
}

function handleMaskClick() {
  if (props.maskClosable) {
    enablePageScroll()
    emit('close')
    emit('update:show', false)
  }
}

function startTour() {
  console.log('[TourGuide] startTour 被调用')
  disablePageScroll()
  currentStepIndex.value = props.startIndex
  updateHighlight()
}

function goToStep(index: number) {
  if (index < 0 || index >= props.steps.length)
    return
  currentStepIndex.value = index
  emit('step-change', index)
  updateHighlight()
}

watch(() => props.show, (newVal) => {
  console.log('[TourGuide] props.show 变化:', newVal)
  if (newVal) {
    startTour()
  }
  else {
    enablePageScroll()
  }
})

watch(currentStepIndex, () => {
  updateHighlight()
})

defineExpose({
  startTour,
  nextStep,
  previousStep,
  skipTour,
  completeTour,
  goToStep,
})
</script>

<template>
  <view v-if="show" class="tour-guide">
    <TourMask
      :target="currentStep.target"
      :padding="currentStep.highlightPadding"
      :border-radius="currentStep.highlightBorderRadius"
      :highlight-color="currentStep.highlightColor"
      @mask-click="handleMaskClick"
    />

    <TourTooltip
      :title="currentStep.title"
      :content="currentStep.content"
      :position="currentStep.position"
      :current-step="currentStepIndex"
      :total-steps="steps.length"
      :show-skip="showSkip"
      :show-previous="showPrevious"
      :target-rect="targetRect"
      @previous="previousStep"
      @next="nextStep"
      @skip="skipTour"
      @finish="completeTour"
    />
  </view>
</template>

<style scoped>
.tour-guide {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  pointer-events: none;
}
</style>
