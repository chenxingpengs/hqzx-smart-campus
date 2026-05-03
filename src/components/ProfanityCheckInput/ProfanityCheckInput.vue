<script setup lang="ts">
/**
 * ProfanityCheckInput 违禁词检测输入框组件
 *
 * 用于在输入时实时或提交前检测文本是否包含违禁词
 *
 * @example
 * ```vue
 * <template>
 *   <ProfanityCheckInput
 *     v-model="content"
 *     placeholder="请输入内容"
 *     :max-length="500"
 *     :auto-check="true"
 *     @check-result="handleCheckResult"
 *   />
 * </template>
 *
 * <script setup lang="ts">
 * import { ref } from 'vue'
 * import { ProfanityCheckInput } from '@/components/ProfanityCheckInput'
 *
 * const content = ref('')
 *
 * function handleCheckResult(result: any) {
 *   if (result.isForbidden) {
 *     console.log('发现违禁词:', result.forbiddenWords)
 *   }
 * }
 * </script>
 * ```
 */

import { ref, watch } from 'vue'
import { useProfanityCheck } from '@/utils/profanity'

interface Props {
  modelValue?: string
  placeholder?: string
  maxLength?: number
  autoHeight?: boolean
  autoCheck?: boolean
  checkDebounce?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'checkResult', result: any): void
  (e: 'forbidden', words: string[]): void
  (e: 'safe'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入内容',
  maxLength: 500,
  autoHeight: true,
  autoCheck: false,
  checkDebounce: 1000,
})

const emit = defineEmits<Emits>()

const { result, loading, error, checkText } = useProfanityCheck()

const inputValue = ref(props.modelValue)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.modelValue, (val) => {
  inputValue.value = val
})

watch(inputValue, (val) => {
  emit('update:modelValue', val)

  if (props.autoCheck && val && val.trim()) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(async () => {
      try {
        const checkResult = await checkText(val)
        emit('checkResult', checkResult)

        if (checkResult.isForbidden) {
          emit('forbidden', checkResult.forbiddenWords)
        }
        else {
          emit('safe')
        }
      }
      catch (err) {
        console.error('违禁词检测失败:', err)
      }
    }, props.checkDebounce)
  }
})

async function handleManualCheck() {
  if (!inputValue.value || !inputValue.value.trim()) {
    uni.showToast({
      title: '请输入要检测的内容',
      icon: 'none',
    })
    return
  }

  try {
    const checkResult = await checkText(inputValue.value)
    emit('checkResult', checkResult)

    if (checkResult.isForbidden) {
      uni.showToast({
        title: `包含违禁词: ${checkResult.forbiddenWords.join(', ')}`,
        icon: 'none',
        duration: 3000,
      })
      emit('forbidden', checkResult.forbiddenWords)
    }
    else {
      uni.showToast({
        title: '内容安全',
        icon: 'success',
      })
      emit('safe')
    }
  }
  catch (err) {
    console.error('检测失败:', err)
  }
}

defineExpose({
  checkText,
  result,
  loading,
})
</script>

<template>
  <view class="profanity-check-input">
    <textarea
      v-model="inputValue"
      class="textarea"
      :placeholder="placeholder"
      :maxlength="maxLength"
      :auto-height="autoHeight"
      :disabled="loading"
    />

    <view class="actions">
      <text v-if="loading" class="status-text loading">
        检测中...
      </text>

      <text
        v-else-if="result?.isForbidden"
        class="status-text forbidden"
      >
        发现 {{ result.forbiddenWords.length }} 个违禁词
      </text>

      <text
        v-else-if="result && !result.isForbidden && !error"
        class="status-text safe"
      >
        内容安全 ✓
      </text>

      <text v-else-if="error" class="status-text error">
        检测失败
      </text>

      <view class="btn-wrapper">
        <text class="char-count">{{ inputValue.length }}/{{ maxLength }}</text>
        <button
          class="check-btn"
          :disabled="loading || !inputValue.trim()"
          @click="handleManualCheck"
        >
          {{ loading ? '检测中...' : '检测' }}
        </button>
      </view>
    </view>

    <view v-if="result?.isForbidden" class="forbidden-words">
      <text class="label">命中词汇：</text>
      <view class="words-list">
        <text
          v-for="(word, index) in result.forbiddenWords"
          :key="index"
          class="word-tag"
        >
          {{ word }}
        </text>
      </view>
    </view>

    <view v-if="result?.masked_text && result.isForbidden" class="masked-text">
      <text class="label">屏蔽后文本：</text>
      <text class="masked-content">{{ result.maskedText }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.profanity-check-input {
  padding: 20rpx;
  background-color: #fff;
  border-radius: 16rpx;
  border: 2rpx solid #eee;

  .textarea {
    width: 100%;
    min-height: 200rpx;
    padding: 20rpx;
    font-size: 28rpx;
    line-height: 1.6;
    color: #333;
    background-color: #f8f9fa;
    border-radius: 12rpx;
    box-sizing: border-box;

    &::placeholder {
      color: #999;
    }
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid #f0f0f0;

    .status-text {
      font-size: 24rpx;

      &.loading {
        color: #ff9800;
      }

      &.forbidden {
        color: #f44336;
        font-weight: bold;
      }

      &.safe {
        color: #4caf50;
      }

      &.error {
        color: #9e9e9e;
      }
    }

    .btn-wrapper {
      display: flex;
      align-items: center;
      gap: 16rpx;

      .char-count {
        font-size: 24rpx;
        color: #999;
      }

      .check-btn {
        padding: 12rpx 32rpx;
        font-size: 26rpx;
        color: #fff;
        background-color: #2196f3;
        border: none;
        border-radius: 8rpx;

        &:disabled {
          opacity: 0.5;
          background-color: #ccc;
        }

        &:active:not(:disabled) {
          background-color: #1976d2;
        }
      }
    }
  }

  .forbidden-words {
    margin-top: 20rpx;
    padding: 16rpx;
    background-color: #fff3e0;
    border-radius: 8rpx;

    .label {
      display: block;
      margin-bottom: 12rpx;
      font-size: 24rpx;
      font-weight: bold;
      color: #e65100;
    }

    .words-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;

      .word-tag {
        padding: 8rpx 16rpx;
        font-size: 24rpx;
        color: #d32f2f;
        background-color: #ffebee;
        border-radius: 4rpx;
      }
    }
  }

  .masked-text {
    margin-top: 16rpx;
    padding: 16rpx;
    background-color: #f5f5f5;
    border-radius: 8rpx;

    .label {
      display: block;
      margin-bottom: 8rpx;
      font-size: 24rpx;
      font-weight: bold;
      color: #666;
    }

    .masked-content {
      font-size: 26rpx;
      line-height: 1.6;
      color: #333;
      word-break: break-all;
    }
  }
}
</style>
