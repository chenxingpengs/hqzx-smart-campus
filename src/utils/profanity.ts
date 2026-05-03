import type { IProfanityCheckResult } from '@/api/types/profanity'
import { ref } from 'vue'
import { checkProfanity } from '@/api/profanity'

/**
 * 违禁词检测组合式函数
 *
 * @returns 违禁词检测结果和操作方法
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useProfanityCheck } from '@/utils/profanity'
 *
 * const { result, loading, error, checkText, reset } = useProfanityCheck()
 *
 * const handleCheck = async () => {
 *   await checkText('需要检测的文本')
 *   if (result.value?.isForbidden) {
 *     console.log('发现违禁词:', result.value.forbiddenWords)
 *   }
 * }
 * </script>
 * ```
 */
export function useProfanityCheck() {
  const result = ref<IProfanityCheckResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 检测文本是否包含违禁词
   * @param text 需要检测的文本
   */
  async function checkText(text: string) {
    if (!text || !text.trim()) {
      result.value = {
        isForbidden: false,
        originalText: text,
        maskedText: text,
        forbiddenWords: [],
      }
      return result.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await checkProfanity(text)

      result.value = {
        isForbidden: response.status === 'forbidden',
        originalText: response.original_text,
        maskedText: response.masked_text,
        forbiddenWords: response.forbidden_words || [],
      }

      return result.value
    }
    catch (err) {
      const errObj = err as Error & { msg?: string }
      const errorMessage = errObj?.msg || errObj?.message || '违禁词检测失败'
      error.value = errorMessage
      console.error('违禁词检测错误:', err)

      result.value = {
        isForbidden: false,
        originalText: text,
        maskedText: text,
        forbiddenWords: [],
        error: errorMessage,
      }

      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 重置状态
   */
  function reset() {
    result.value = null
    loading.value = false
    error.value = null
  }

  return {
    result,
    loading,
    error,
    checkText,
    reset,
  }
}

/**
 * 快速检测文本是否包含违禁词（不使用响应式状态）
 * 适用于不需要响应式的场景
 *
 * @param text 需要检测的文本
 * @returns Promise<IProfanityCheckResult> 检测结果
 *
 * @example
 * ```typescript
 * import { quickProfanityCheck } from '@/utils/profanity'
 *
 * const isValid = async () => {
 *   try {
 *     const result = await quickProfanityCheck(inputValue)
 *     if (result.isForbidden) {
 *       uni.showToast({ title: `包含违禁词: ${result.forbiddenWords.join(', ')}`, icon: 'none' })
 *       return false
 *     }
 *     return true
 *   } catch {
 *     return false
 *   }
 * }
 * ```
 */
export async function quickProfanityCheck(text: string): Promise<IProfanityCheckResult> {
  if (!text || !text.trim()) {
    return {
      isForbidden: false,
      originalText: text,
      maskedText: text,
      forbiddenWords: [],
    }
  }

  try {
    const response = await checkProfanity(text)

    return {
      isForbidden: response.status === 'forbidden',
      originalText: response.original_text,
      maskedText: response.masked_text,
      forbiddenWords: response.forbidden_words || [],
    }
  }
  catch (err) {
    const error = err as Error & { msg?: string }
    const errorMessage = error?.msg || error?.message || '违禁词检测失败'
    console.error('违禁词检测错误:', err)

    return {
      isForbidden: false,
      originalText: text,
      maskedText: text,
      forbiddenWords: [],
      error: errorMessage,
    }
  }
}

/**
 * 表单验证器 - 用于 uni-app 表单验证规则
 *
 * @example
 * ```typescript
 * import { profanityValidator } from '@/utils/profanity'
 *
 * const rules = {
 *   content: [
 *     { required: true, message: '请输入内容' },
 *     { validator: profanityValidator }
 *   ]
 * }
 * ```
 */
interface FormRule {
  required?: boolean
  message?: string
  validator?: (rule: FormRule, value: string, callback: (error?: Error) => void) => void
}

export function profanityValidator(rule: FormRule, value: string, callback: (error?: Error) => void) {
  if (!value) {
    callback()
    return
  }

  quickProfanityCheck(value).then((result) => {
    if (result.isForbidden) {
      callback(new Error(`内容包含违禁词: ${result.forbiddenWords.join(', ')}`))
    }
    else {
      callback()
    }
  }).catch(() => {
    callback(new Error('违禁词检测失败，请稍后重试'))
  })
}
