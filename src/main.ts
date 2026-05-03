import { createSSRApp } from 'vue'
import { wechatPluginEngine } from '@/plugin'
import App from './App.vue'
import { requestInterceptor } from './http/interceptor'

import { routeInterceptor } from './router/interceptor'
import store from './store'

import '@/style/index.scss'
import 'virtual:uno.css'

console.log('=== [main.ts] 模块开始加载 ===')

export function createApp() {
  console.log('=== [main.ts] createApp() 被调用 ===')
  const app = createSSRApp(App)
  console.log('[main.ts] SSRApp 创建完成')

  app.use(store)
  console.log('[main.ts] store 已挂载')

  app.use(routeInterceptor)
  app.use(requestInterceptor)

  wechatPluginEngine.init().then(() => {
    console.log(`[App] 插件引擎就绪，已加载 ${wechatPluginEngine.getTabbarItems().length} 个插件Tabbar项`)
  })

  return {
    app,
  }
}

console.log('=== [main.ts] 模块加载完成 ===')
