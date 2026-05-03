<script setup lang="ts">
import { ref } from 'vue'
import { useTokenStore } from '@/store/token'
import { useUnreadStore } from '@/store/unread'
import FgTabbar from '@/tabbar/index.vue'
import { isPageTabbar } from './tabbar/store'
import { currRoute } from './utils'

console.log('[App启动] App.ku.vue 开始执行')

const isCurrentPageTabbar = ref(true)
const unreadStore = useUnreadStore()
const tokenStore = useTokenStore()

console.log('[App启动] Token状态:', {
  hasToken: !!tokenStore.tokenInfo.accessToken,
  isBound: tokenStore.tokenInfo.is_bound,
  hasValidLogin: tokenStore.hasValidLogin,
})

onShow(() => {
  console.log('App.ku.vue onShow', currRoute())
  const { path } = currRoute()
  // "蜡笔小开心"提到本地是 '/pages/index/index'，线上是 '/' 导致线上 tabbar 不见了
  // 所以这里需要判断一下，如果是 '/' 就当做首页，也要显示 tabbar
  if (path === '/') {
    isCurrentPageTabbar.value = true
  }
  else {
    isCurrentPageTabbar.value = isPageTabbar(path)
  }
})

const helloKuRoot = ref('Hello AppKuVue')

const exposeRef = ref('this is form app.Ku.vue')

watch(() => tokenStore.accessToken, (newToken) => {
  if (newToken) {
    console.log('[App] 检测到登录，初始化未读消息')
    unreadStore.init()
  }
  else {
    console.log('[App] 检测到登出，重置未读消息')
    unreadStore.reset()
  }
}, { immediate: true })

defineExpose({
  exposeRef,
})
</script>

<template>
  <view>
    <!-- 这个先隐藏了，知道这样用就行 -->
    <view class="hidden text-center">
      {{ helloKuRoot }}，这里可以配置全局的东西
    </view>

    <KuRootView />

    <FgTabbar v-if="isCurrentPageTabbar" />
  </view>
</template>
