<script setup lang="ts">
import type { NotificationNewData } from '@/types/websocket'
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { navigateToInterceptor } from '@/router/interceptor'
import { useTokenStore } from '@/store/token'
import { useUnreadStore } from '@/store/unread'
import { initAppUpdate } from '@/utils/update'
import { wsManager } from '@/utils/websocket'

let isFirstLaunch = true
const appUpdateManager = ref<ReturnType<typeof initAppUpdate> | null>(null)

onLaunch((options) => {
  console.log('App.vue onLaunch', options)

  // #ifdef APP-PLUS
  const githubRepo = import.meta.env.VITE_GITHUB_REPO
  if (githubRepo) {
    appUpdateManager.value = initAppUpdate(githubRepo)
  }
  // #endif
})

onShow((options) => {
  console.log('App.vue onShow', options)

  const tokenStore = useTokenStore()
  const unreadStore = useUnreadStore()
  const token = tokenStore.tokenInfo.accessToken

  if (token) {
    wsManager.ensureConnected(token)
    unreadStore.init()
  }

  wsManager.on('notification:new', handleNotificationNew)

  if (isFirstLaunch) {
    isFirstLaunch = false
    if (options?.path) {
      navigateToInterceptor.invoke({ url: `/${options.path}`, query: options.query })
    }
    else {
      navigateToInterceptor.invoke({ url: '/' })
    }
  }
})

onHide(() => {
  console.log('App Hide')
  wsManager.off('notification:new', handleNotificationNew)
})

function handleNotificationNew(data: NotificationNewData) {
  console.log('[App] 收到新系统通知:', data)
  uni.showToast({
    title: data.title || '收到新通知',
    icon: 'none',
    duration: 2000,
  })
}
</script>

<style lang="scss">

</style>
