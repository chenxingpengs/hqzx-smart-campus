<script setup lang="ts">
import { ref } from 'vue'
import { appChangePasswordUsingPost } from '@/service/login'
import { useTokenStore } from '@/store/token'

definePage({
  style: {
    navigationBarTitleText: '修改密码',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTextStyle: 'black',
  },
})

const tokenStore = useTokenStore()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

function clearError() {
  errorMsg.value = ''
}

function validateForm(): boolean {
  if (!oldPassword.value.trim()) {
    errorMsg.value = '请输入当前密码'
    return false
  }
  if (!newPassword.value.trim()) {
    errorMsg.value = '请输入新密码'
    return false
  }
  if (newPassword.value.length < 6) {
    errorMsg.value = '新密码长度不能少于6位'
    return false
  }
  if (!confirmPassword.value.trim()) {
    errorMsg.value = '请确认新密码'
    return false
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的密码不一致'
    return false
  }
  if (oldPassword.value === newPassword.value) {
    errorMsg.value = '新密码不能与当前密码相同'
    return false
  }
  return true
}

async function handleSubmit() {
  clearError()

  if (!validateForm())
    return

  isLoading.value = true

  try {
    const res = await appChangePasswordUsingPost({
      body: {
        old_password: oldPassword.value,
        new_password: newPassword.value,
      },
    })

    console.log('[修改密码] 返回数据:', res)

    uni.showToast({
      title: '密码修改成功',
      icon: 'success',
      duration: 1500,
    })

    setTimeout(() => {
      const pages = getCurrentPages()
      console.log('[修改密码] 当前页面栈长度:', pages.length)

      if (pages.length > 1) {
        console.log('[修改密码] 使用 navigateBack 返回')
        uni.navigateBack()
      }
      else {
        console.log('[修改密码] 页面栈只有本页，跳转首页')
        uni.reLaunch({
          url: '/pages/index/index',
        })
      }
    }, 1500)
  }
  catch (error: any) {
    console.error('[修改密码] 失败:', error)
    const errorData = error?.data || error
    errorMsg.value = errorData?.msg || errorData?.message || '修改失败，请重试'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <view class="min-h-screen bg-gray-50">
    <view class="px-4 pt-8">
      <!-- 提示信息 -->
      <view class="mb-6 rounded-xl bg-orange-50 p-4">
        <view class="mb-2 flex items-center gap-2">
          <wd-icon name="warning" size="18px" color="#f97316" />
          <text class="text-sm text-orange-700 font-medium">首次登录需修改初始密码</text>
        </view>
        <view class="text-xs text-orange-600 space-y-1">
          <view>• 密码长度不能少于6位</view>
          <view>• 建议使用字母+数字组合</view>
        </view>
      </view>

      <!-- 表单 -->
      <view class="rounded-xl bg-white p-6 shadow-sm">
        <view class="space-y-4">
          <!-- 当前密码 -->
          <view>
            <label class="mb-2 block text-sm text-gray-700 font-medium">
              当前密码
            </label>
            <view class="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-4">
              <wd-icon name="lock" size="20px" color="#9ca3af" />
              <input
                v-model="oldPassword"
                class="ml-3 h-12 flex-1 bg-transparent text-base"
                placeholder="请输入当前密码"
                type="password"
                :disabled="isLoading"
                @input="clearError"
              >
            </view>
          </view>

          <!-- 新密码 -->
          <view>
            <label class="mb-2 block text-sm text-gray-700 font-medium">
              新密码
            </label>
            <view class="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-4">
              <wd-icon name="lock" size="20px" color="#9ca3af" />
              <input
                v-model="newPassword"
                class="ml-3 h-12 flex-1 bg-transparent text-base"
                placeholder="请输入新密码（至少6位）"
                type="password"
                :disabled="isLoading"
                @input="clearError"
              >
            </view>
          </view>

          <!-- 确认新密码 -->
          <view>
            <label class="mb-2 block text-sm text-gray-700 font-medium">
              确认新密码
            </label>
            <view class="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-4">
              <wd-icon name="lock" size="20px" color="#9ca3af" />
              <input
                v-model="confirmPassword"
                class="ml-3 h-12 flex-1 bg-transparent text-base"
                placeholder="请再次输入新密码"
                type="password"
                :disabled="isLoading"
                @input="clearError"
              >
            </view>
          </view>

          <!-- 错误提示 -->
          <view v-if="errorMsg" class="rounded-lg bg-red-50 p-3">
            <view class="flex items-start gap-2">
              <wd-icon name="close-circle-fill" size="16px" color="#ef4444" />
              <text class="flex-1 text-sm text-red-600">{{ errorMsg }}</text>
            </view>
          </view>

          <!-- 提交按钮 -->
          <button
            class="submit-btn mt-2 w-full rounded-lg py-3.5 font-medium shadow-md"
            :class="{ 'btn-disabled': isLoading }"
            :disabled="isLoading"
            @click="handleSubmit"
          >
            <template v-if="isLoading">
              <view class="mx-auto flex items-center justify-center gap-2">
                <view class="loading-spinner" />
                <text>修改中...</text>
              </view>
            </template>
            <template v-else>
              确认修改
            </template>
          </button>
        </view>
      </view>

      <!-- 安全提示 -->
      <view class="mt-6 rounded-xl bg-blue-50 p-4">
        <view class="mb-2 flex items-center gap-2">
          <wd-icon name="info-circle" size="18px" color="#3b82f6" />
          <text class="text-sm text-blue-700 font-medium">安全提示</text>
        </view>
        <view class="text-xs text-blue-600 space-y-1">
          <view>• 请勿使用过于简单的密码（如123456）</view>
          <view>• 建议定期更换密码以保护账号安全</view>
          <view>• 如忘记密码请联系管理员重置</view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 输入框样式重置 */
input {
  appearance: none;
  -webkit-appearance: none;
  border: none;
  outline: none;
  background: transparent;
  margin: 0;
  padding: 0;
}

/* 按钮样式 */
.submit-btn {
  display: flex !important;
  align-items: center;
  justify-content: center;
  height: 48px;
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  color: #ffffff;
  font-size: 16px;
  border: none;
  outline: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  line-height: normal;
  transition: all 0.3s ease;
}

.submit-btn:active {
  transform: scale(0.98);
  opacity: 0.9;
}

.submit-btn.btn-disabled {
  background: #d1d5db !important;
  cursor: not-allowed;
}

.submit-btn::after {
  content: none;
}

/* 加载动画 */
.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
