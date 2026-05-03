<template>
  <view class="login-page">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="bg-circle bg-circle-1" />
      <view class="bg-circle bg-circle-2" />
      <view class="bg-circle bg-circle-3" />
    </view>

    <!-- 主内容区域 -->
    <view class="login-card">
      <!-- 品牌 Logo 区域 -->
      <view class="brand-section">
        <image class="brand-logo" src="/static/hqzx.png" mode="aspectFit" />
        <view class="brand-title">
          晚午托考勤系统
        </view>
        <view class="brand-subtitle">
          珠海市红旗中学
        </view>
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <!-- 微信小程序：自动登录状态显示 -->
      <view v-if="shouldShowLoading" class="auth-loading">
        <view class="loading-icon-wrapper">
          <wd-icon name="wechat" size="28px" color="#07c160" />
          <view class="loading-ring" />
        </view>
        <view class="loading-text">
          {{ loginStatusText }}
        </view>
      </view>

      <!-- 微信小程序：自动登录失败，显示重试 -->
      <view v-if="autoLoginFailed" class="auth-failed">
        <view class="failed-icon-wrapper">
          <wd-icon name="warning" size="48px" color="#ef4444" />
        </view>
        <view class="failed-title">
          登录失败
        </view>
        <view class="failed-message">
          {{ errorMsg }}
        </view>
        <button class="btn-retry" @click="handleRetry">
          <wd-icon name="refresh" size="18px" color="#f97316" />
          <text>重新登录</text>
        </button>
      </view>

      <!-- 微信小程序：需要微信授权 -->
      <view v-if="shouldShowNeedAuth" class="auth-failed">
        <view class="failed-icon-wrapper" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
          <wd-icon name="wechat" size="48px" color="#07c160" />
        </view>
        <view class="failed-title">
          需要微信授权
        </view>
        <view class="failed-message">
          请点击下方按钮进行微信授权登录
        </view>
        <button class="btn-retry" style="background: linear-gradient(135deg, #07c160 0%, #059669 100%); color: #fff; border-color: #07c160;" @click="handleRetry">
          <wd-icon name="wechat" size="18px" color="#fff" />
          <text>微信授权登录</text>
        </button>
      </view>

      <!-- 微信小程序：账号绑定表单 -->
      <view v-if="tokenStore.hasValidUnboundAccessToken" class="bind-section">
        <!-- 倒计时提示 -->
        <view class="countdown-bar">
          <wd-icon name="clock" size="14px" color="#f97316" />
          <text>授权有效期：{{ Math.floor(accessTokenCountdown / 60) }}分{{ accessTokenCountdown % 60 }}秒</text>
        </view>

        <!-- 用户名输入框 -->
        <view class="input-wrapper" :class="{ 'input-focused': focusedInput === 'user_code' }">
          <wd-icon name="user" size="20px" :color="focusedInput === 'user_code' ? '#f97316' : '#9ca3af'" />
          <input
            v-model="bindForm.user_code"
            class="input-field"
            placeholder="请输入用户名/学号/工号"
            @input="clearError"
            @focus="focusedInput = 'user_code'"
            @blur="focusedInput = ''"
          >
        </view>

        <!-- 密码输入框 -->
        <view class="input-wrapper" :class="{ 'input-focused': focusedInput === 'password' }">
          <wd-icon name="lock" size="20px" :color="focusedInput === 'password' ? '#f97316' : '#9ca3af'" />
          <input
            v-model="bindForm.password"
            class="input-field"
            placeholder="请输入系统账号密码"
            type="password"
            @input="clearError"
            @focus="focusedInput = 'password'"
            @blur="focusedInput = ''"
          >
        </view>

        <!-- 提交绑定按钮 -->
        <button
          class="btn-submit"
          :disabled="tokenStore.isBinding || accessTokenCountdown <= 0"
          @click="handleBindSubmit"
        >
          <template v-if="tokenStore.isBinding">
            <view class="btn-loading" />
            <text>绑定中...</text>
          </template>
          <template v-else-if="accessTokenCountdown <= 0">
            <wd-icon name="clock" size="18px" color="#9ca3af" />
            <text>授权已过期</text>
          </template>
          <template v-else>
            <wd-icon name="check-circle" size="18px" color="#fff" />
            <text>提交绑定并登录</text>
          </template>
        </button>

        <!-- 错误提示 -->
        <view v-if="errorMsg" class="error-message">
          <wd-icon name="warning" size="16px" color="#ef4444" />
          <text>{{ errorMsg }}</text>
        </view>
      </view>
      <!-- #endif -->

      <!-- #ifdef APP-PLUS -->
      <!-- APP端：账号密码登录表单 -->
      <view v-if="!tokenStore.hasValidLogin" class="app-login-section">
        <view class="app-login-title">
          账号登录
        </view>

        <!-- 用户名输入框 -->
        <view class="input-wrapper" :class="{ 'input-focused': focusedInput === 'app_user_code' }">
          <wd-icon name="user" size="20px" :color="focusedInput === 'app_user_code' ? '#f97316' : '#9ca3af'" />
          <input
            v-model="appLoginForm.user_code"
            class="input-field"
            placeholder="请输入用户名/学号/工号"
            @input="clearError"
            @focus="focusedInput = 'app_user_code'"
            @blur="focusedInput = ''"
          >
        </view>

        <!-- 密码输入框 -->
        <view class="input-wrapper" :class="{ 'input-focused': focusedInput === 'app_password' }">
          <wd-icon name="lock" size="20px" :color="focusedInput === 'app_password' ? '#f97316' : '#9ca3af'" />
          <input
            v-model="appLoginForm.password"
            class="input-field"
            placeholder="请输入密码"
            type="password"
            @input="clearError"
            @focus="focusedInput = 'app_password'"
            @blur="focusedInput = ''"
          >
        </view>

        <!-- 登录按钮 -->
        <button
          class="btn-submit"
          :disabled="isAppLoggingIn"
          @click="handleAppLogin"
        >
          <template v-if="isAppLoggingIn">
            <view class="btn-loading" />
            <text>登录中...</text>
          </template>
          <template v-else>
            <wd-icon name="check-circle" size="18px" color="#fff" />
            <text>登录</text>
          </template>
        </button>

        <!-- 错误提示 -->
        <view v-if="errorMsg" class="error-message">
          <wd-icon name="warning" size="16px" color="#ef4444" />
          <text>{{ errorMsg }}</text>
        </view>
      </view>
      <!-- #endif -->

      <!-- #ifdef H5 -->
      <!-- H5端：账号密码登录表单 -->
      <view v-if="!tokenStore.hasValidLogin" class="app-login-section">
        <view class="app-login-title">
          账号登录
        </view>

        <!-- 用户名输入框 -->
        <view class="input-wrapper" :class="{ 'input-focused': focusedInput === 'h5_user_code' }">
          <wd-icon name="user" size="20px" :color="focusedInput === 'h5_user_code' ? '#f97316' : '#9ca3af'" />
          <input
            v-model="h5LoginForm.user_code"
            class="input-field"
            placeholder="请输入用户名/学号/工号"
            @input="clearError"
            @focus="focusedInput = 'h5_user_code'"
            @blur="focusedInput = ''"
          >
        </view>

        <!-- 密码输入框 -->
        <view class="input-wrapper" :class="{ 'input-focused': focusedInput === 'h5_password' }">
          <wd-icon name="lock" size="20px" :color="focusedInput === 'h5_password' ? '#f97316' : '#9ca3af'" />
          <input
            v-model="h5LoginForm.password"
            class="input-field"
            placeholder="请输入密码"
            type="password"
            @input="clearError"
            @focus="focusedInput = 'h5_password'"
            @blur="focusedInput = ''"
          >
        </view>

        <!-- 登录按钮 -->
        <button
          class="btn-submit"
          :disabled="isH5LoggingIn"
          @click="handleH5Login"
        >
          <template v-if="isH5LoggingIn">
            <view class="btn-loading" />
            <text>登录中...</text>
          </template>
          <template v-else>
            <wd-icon name="check-circle" size="18px" color="#fff" />
            <text>登录</text>
          </template>
        </button>

        <!-- 错误提示 -->
        <view v-if="errorMsg" class="error-message">
          <wd-icon name="warning" size="16px" color="#ef4444" />
          <text>{{ errorMsg }}</text>
        </view>
      </view>
      <!-- #endif -->
    </view>

    <!-- 底部版权信息 -->
    <view class="footer">
      <view class="footer-line" />
      <text class="footer-text">本系统为内部系统，不支持注册</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { redirectToHome, useTokenStore } from '@/store/token'

definePage({
  type: 'page',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '',
    disableScroll: true,
  },
})

const tokenStore = useTokenStore()

const errorMsg = ref('')
const autoLoginFailed = ref(false)
const bindForm = ref({
  user_code: '',
  password: '',
})
const appLoginForm = ref({
  user_code: '',
  password: '',
})
const isAppLoggingIn = ref(false)
const h5LoginForm = ref({
  user_code: '',
  password: '',
})
const isH5LoggingIn = ref(false)
const accessTokenCountdown = ref(0)
const focusedInput = ref('')
const isInitializing = ref(false)
const hasInitialized = ref(false)
let countdownTimer = null
let globalTimeoutId = null

const loginStatusText = computed(() => {
  if (tokenStore.wxLoginPending) {
    return '正在获取微信授权...'
  }
  if (tokenStore.isBinding) {
    return '正在绑定账号...'
  }
  return '正在登录...'
})

const shouldShowLoading = computed(() => {
  if (autoLoginFailed.value) {
    return false
  }

  if (isInitializing.value || tokenStore.wxLoginPending || tokenStore.isBinding) {
    return true
  }

  if (tokenStore.needWxAuth && !hasInitialized.value) {
    return true
  }

  return false
})

const shouldShowNeedAuth = computed(() => {
  return tokenStore.needWxAuth
    && hasInitialized.value
    && !isInitializing.value
    && !tokenStore.wxLoginPending
    && !tokenStore.isBinding
    && !autoLoginFailed.value
})

const shouldShowContent = computed(() => {
  return shouldShowLoading.value || autoLoginFailed.value || tokenStore.hasValidUnboundAccessToken.value
})

function initAccessTokenCountdown() {
  if (tokenStore.hasValidUnboundAccessToken) {
    const expireTime = Number(uni.getStorageSync('accessTokenExpireTime')) || 0
    const remainingMs = expireTime - Date.now()
    accessTokenCountdown.value = Math.max(0, Math.floor(remainingMs / 1000))
    startCountdownTimer()
  }
  else {
    accessTokenCountdown.value = 0
    clearCountdownTimer()
  }
}

function startCountdownTimer() {
  clearCountdownTimer()
  countdownTimer = setInterval(() => {
    if (accessTokenCountdown.value > 0) {
      accessTokenCountdown.value--
    }
    else {
      tokenStore.resetAllToken()
      clearCountdownTimer()
    }
  }, 1000)
}

function clearCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

const AUTO_LOGIN_TIMEOUT = 15000

function waitForWxLoginComplete(): Promise<void> {
  return new Promise((resolve) => {
    if (!tokenStore.wxLoginPending) {
      resolve()
      return
    }
    const checkInterval = setInterval(() => {
      if (!tokenStore.wxLoginPending) {
        clearInterval(checkInterval)
        resolve()
      }
    }, 100)
  })
}

async function triggerAutoLogin(force = false) {
  console.log('[登录页] triggerAutoLogin 被调用, force:', force, {
    hasValidLogin: tokenStore.hasValidLogin,
    hasValidUnboundAccessToken: tokenStore.hasValidUnboundAccessToken,
    wxLoginPending: tokenStore.wxLoginPending,
    hasInitialized: hasInitialized.value,
  })

  if (tokenStore.hasValidLogin) {
    console.log('[登录页] 已有有效登录状态，跳转首页')
    isInitializing.value = false
    redirectToHome()
    return
  }

  if (tokenStore.hasValidUnboundAccessToken) {
    console.log('[登录页] 已有有效未绑定Token，显示绑定表单')
    isInitializing.value = false
    initAccessTokenCountdown()
    return
  }

  if (!force && hasInitialized.value) {
    console.log('[登录页] 非强制模式且已初始化，跳过')
    isInitializing.value = false
    return
  }

  if (tokenStore.wxLoginPending) {
    console.log('[登录页] 微信登录请求中，等待完成...')
    isInitializing.value = true
    try {
      await Promise.race([
        waitForWxLoginComplete(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('等待登录超时')), AUTO_LOGIN_TIMEOUT)),
      ])
      console.log('[登录页] 微信登录请求已完成')

      if (!tokenStore.hasValidLogin && !tokenStore.hasValidUnboundAccessToken) {
        autoLoginFailed.value = true
        errorMsg.value = '登录失败，请重试'
      }
    }
    catch (err) {
      console.error('[登录页] 等待登录超时:', err)
      autoLoginFailed.value = true
      errorMsg.value = err?.message || '等待登录超时，请重试'
    }
    finally {
      isInitializing.value = false
      hasInitialized.value = true
    }
    return
  }

  try {
    autoLoginFailed.value = false
    isInitializing.value = true
    console.log('[登录页] 开始触发自动微信登录')
    await tokenStore.triggerAutoWxLogin()

    if (tokenStore.hasValidUnboundAccessToken) {
      initAccessTokenCountdown()
    }
  }
  catch (err) {
    console.error('[自动登录] 失败:', err)
    autoLoginFailed.value = true
    errorMsg.value = err?.message || '登录失败，请重试'
  }
  finally {
    isInitializing.value = false
    hasInitialized.value = true
  }
}

async function handleRetry() {
  console.log('[登录页] handleRetry 被调用')
  autoLoginFailed.value = false
  errorMsg.value = ''
  hasInitialized.value = false
  await triggerAutoLogin(true)
}

async function handleBindSubmit() {
  errorMsg.value = ''
  const { user_code: bindUserCode, password } = bindForm.value

  if (!bindUserCode.trim()) {
    errorMsg.value = '请输入用户名/学号/工号'
    return
  }
  if (!password.trim()) {
    errorMsg.value = '请输入系统账号密码'
    return
  }

  if (!tokenStore.hasValidUnboundAccessToken) {
    errorMsg.value = '授权已过期，请重新授权微信'
    return
  }

  try {
    await tokenStore.bindUser({
      user_code: bindUserCode.trim(),
      password,
    })
  }
  catch (err) {
    errorMsg.value = err?.message || '绑定操作异常，请重试'
  }
}

async function handleAppLogin() {
  errorMsg.value = ''
  const { user_code, password } = appLoginForm.value

  if (!user_code.trim()) {
    errorMsg.value = '请输入用户名/学号/工号'
    return
  }
  if (!password.trim()) {
    errorMsg.value = '请输入密码'
    return
  }

  isAppLoggingIn.value = true

  try {
    await tokenStore.appLogin({
      user_code: user_code.trim(),
      password,
    })
  }
  catch (err) {
    errorMsg.value = err?.message || '登录失败，请重试'
  }
  finally {
    isAppLoggingIn.value = false
  }
}

async function handleH5Login() {
  errorMsg.value = ''
  const { user_code, password } = h5LoginForm.value

  if (!user_code.trim()) {
    errorMsg.value = '请输入用户名/学号/工号'
    return
  }
  if (!password.trim()) {
    errorMsg.value = '请输入密码'
    return
  }

  isH5LoggingIn.value = true

  try {
    await tokenStore.appLogin({
      user_code: user_code.trim(),
      password,
    })
  }
  catch (err) {
    errorMsg.value = err?.message || '登录失败，请重试'
  }
  finally {
    isH5LoggingIn.value = false
  }
}

function clearError() {
  errorMsg.value = ''
}

watch(
  () => [tokenStore.hasValidUnboundAccessToken, tokenStore.tokenInfo.accessTokenExpire],
  () => {
    initAccessTokenCountdown()
  },
  { immediate: true, deep: true },
)

function initPage() {
  console.log('[登录页] initPage 被调用')
  initAccessTokenCountdown()

  if (tokenStore.hasValidLogin) {
    console.log('[登录页] initPage: 已有有效登录状态，跳转首页')
    redirectToHome()
    return
  }

  if (tokenStore.hasValidUnboundAccessToken) {
    console.log('[登录页] initPage: 已有有效未绑定Token')
    return
  }

  setTimeout(() => {
    triggerAutoLogin(true)
  }, 100)
}

onMounted(() => {
  console.log('[登录页] onMounted')
  initPage()

  globalTimeoutId = setTimeout(() => {
    if (isInitializing.value && !autoLoginFailed.value) {
      console.error('[登录页] 全局超时，强制显示错误')
      isInitializing.value = false
      autoLoginFailed.value = true
      errorMsg.value = '登录超时，请检查网络连接后重试'
    }
  }, 20000)
})

onShow(() => {
  console.log('[登录页] onShow')
  initAccessTokenCountdown()

  if (tokenStore.hasValidLogin) {
    console.log('[登录页] onShow: 已有有效登录状态，跳转首页')
    redirectToHome()
    return
  }

  if (tokenStore.hasValidUnboundAccessToken) {
    console.log('[登录页] onShow: 已有有效未绑定Token')
    return
  }

  if (!hasInitialized.value && !tokenStore.wxLoginPending && !isInitializing.value) {
    console.log('[登录页] onShow: 未初始化且无登录进行中，触发自动登录')
    setTimeout(() => {
      triggerAutoLogin(true)
    }, 100)
  }
})

onUnmounted(() => {
  clearCountdownTimer()
  if (globalTimeoutId) {
    clearTimeout(globalTimeoutId)
    globalTimeoutId = null
  }
})
</script>

<style scoped>
.login-page {
  height: 100vh;
  background: linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fef3c7 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.4;
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  top: -100px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.bg-circle-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  bottom: 100px;
  left: -80px;
  animation: float 10s ease-in-out infinite reverse;
}

.bg-circle-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  bottom: -50px;
  right: 50px;
  animation: float 12s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

/* 登录卡片 */
.login-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 10px 15px -3px rgba(0, 0, 0, 0.08),
    0 20px 25px -5px rgba(0, 0, 0, 0.05);
  width: 100%;
  max-width: 400px;
  padding: 24px 20px;
  position: relative;
  z-index: 1;
  animation: cardEnter 0.5s ease-out;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 品牌区域 */
.brand-section {
  text-align: center;
  margin-bottom: 24px;
}

.brand-logo {
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
}

.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.brand-subtitle {
  font-size: 13px;
  color: #6b7280;
}

/* 自动登录加载状态 */
.auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

.loading-icon-wrapper {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.loading-ring {
  position: absolute;
  width: 56px;
  height: 56px;
  border: 2px solid rgba(7, 193, 96, 0.1);
  border-radius: 50%;
  border-top-color: #07c160;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 15px;
  color: #6b7280;
}

/* 登录失败状态 */
.auth-failed {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.failed-icon-wrapper {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.failed-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.failed-message {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;
  text-align: center;
}

.btn-retry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 2px solid #f97316;
  font-size: 15px;
  font-weight: 500;
  color: #f97316;
  transition: all 0.3s ease;
}

.btn-retry:active {
  transform: scale(0.98);
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
}

/* 绑定区域 */
.bind-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* APP登录区域 */
.app-login-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-login-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
  margin-bottom: 8px;
}

.countdown-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 12px;
  color: #f97316;
  margin-bottom: 4px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  border-radius: 10px;
  background: #f9fafb;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  gap: 12px;
}

.input-wrapper.input-focused {
  background: #fff;
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
}

.input-field {
  flex: 1;
  height: 100%;
  font-size: 15px;
  color: #1f2937;
  background: transparent;
}

.input-field::placeholder {
  color: #9ca3af;
}

/* 提交按钮 */
.btn-submit {
  width: 100%;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  margin-top: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
}

.btn-submit:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
}

.btn-submit:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  box-shadow: none;
}

.btn-loading {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

/* 错误提示 */
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-radius: 8px;
  border-left: 4px solid #ef4444;
  font-size: 13px;
  color: #dc2626;
}

/* 底部版权 */
.footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 20px 0;
  margin-top: 16px;
}

.footer-line {
  width: 60px;
  height: 1px;
  background: linear-gradient(to right, transparent, #d1d5db, transparent);
  margin-bottom: 12px;
}

.footer-text {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

/* 按钮样式重置 */
button {
  display: flex !important;
  align-items: center;
  justify-content: center;
  border: none;
  outline: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  background: transparent;
  line-height: normal;
}

button::after {
  content: none;
}

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
</style>
