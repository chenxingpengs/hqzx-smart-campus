<script setup lang="ts">
// i-carbon-code
import { customTabbarEnable, needHideNativeTabbar, tabbarCacheEnable } from './config'
import { tabbarList, tabbarStore } from './store'
import TabbarItem from './TabbarItem.vue'

// #ifdef MP-WEIXIN
// 将自定义节点设置成虚拟的（去掉自定义组件包裹层），更加接近Vue组件的表现，能更好的使用flex属性
defineOptions({
  virtualHost: true,
})
// #endif

/**
 * 中间的鼓包tabbarItem的点击事件
 */
function handleClickBulge() {
  uni.showToast({
    title: '点击了中间的鼓包tabbarItem',
    icon: 'none',
  })
}

function handleClick(index: number) {
  if (index === tabbarStore.curIdx) {
    if (index === 2) {
      requestSubscribeMessage()
    }
    return
  }
  const list = tabbarList.value
  if (!list[index]) {
    return
  }
  if (list[index].isBulge) {
    handleClickBulge()
    return
  }

  if (index === 2) {
    requestSubscribeMessage()
  }

  const url = list[index].pagePath
  tabbarStore.setCurIdx(index)
  if (tabbarCacheEnable) {
    uni.switchTab({
      url,
      fail() {
        uni.reLaunch({ url })
      },
    })
  }
  else {
    uni.navigateTo({ url })
  }
}

function requestSubscribeMessage() {
  // #ifdef MP-WEIXIN
  console.log('[订阅消息] 开始请求订阅授权...')

  wx.getSetting({
    withSubscriptions: true,
    success(settingRes: any) {
      console.log('[订阅消息] 用户订阅设置:', JSON.stringify(settingRes))

      const subscriptionsSetting = settingRes.subscriptionsSetting
      if (subscriptionsSetting && subscriptionsSetting.itemSettings) {
        const templateSetting = subscriptionsSetting.itemSettings.PuThjmXbKecLwWFYoRc43Ptu0J4HeZOq7EELzjRdrKs
        console.log('[订阅消息] 模板订阅状态:', templateSetting)

        if (templateSetting === 'reject') {
          console.log('[订阅消息] ⚠️ 用户之前拒绝过，引导去设置开启')
          uni.showModal({
            title: '开启消息通知',
            content: '您之前拒绝了消息通知，是否前往设置开启？',
            success(modalRes: any) {
              if (modalRes.confirm) {
                wx.openSetting({
                  success(openRes: any) {
                    console.log('[订阅消息] 设置页面返回:', openRes)
                  },
                })
              }
            },
          })
          return
        }
      }

      requestSubscribe()
    },
    fail() {
      requestSubscribe()
    },
  })

  function requestSubscribe() {
    const tmplIds = ['PuThjmXbKecLwWFYoRc43Ptu0J4HeZOq7EELzjRdrKs']
    const templateCategoryIds: string[] = []

    wx.requestSubscribeMessage({
      tmplIds,
      async success(res: any) {
        console.log('[订阅消息] 授权结果:', JSON.stringify(res))

        tmplIds.forEach((tmplId) => {
          if (res[tmplId] === 'accept') {
            console.log(`[订阅消息] ✅ 模板 ${tmplId} 用户同意订阅`)

            for (let i = 0; i < 15; i++) {
              templateCategoryIds.push(tmplId)
            }

            console.log(`[订阅消息] 📝 已累积 ${templateCategoryIds.length} 次订阅机会`)
          }
          else if (res[tmplId] === 'reject') {
            console.log(`[订阅消息] ❌ 模板 ${tmplId} 用户拒绝订阅`)
          }
          else if (res[tmplId] === 'ban') {
            console.log(`[订阅消息] 🚫 模板 ${tmplId} 已被封禁`)
          }
        })
      },
      fail(err: any) {
        console.warn('[订阅消息] ❌ 调用失败:', err.errMsg)
      },
    })
  }
  // #endif
}
// #ifndef MP-WEIXIN || MP-ALIPAY
// 因为有了 custom:true， 微信里面不需要多余的hide操作
onLoad(() => {
  // 解决原生 tabBar 未隐藏导致有2个 tabBar 的问题
  needHideNativeTabbar
  && uni.hideTabBar({
    fail(err) {
      console.log('hideTabBar fail: ', err)
    },
    success(res) {
      // console.log('hideTabBar success: ', res)
    },
  })
})
// #endif

// #ifdef MP-ALIPAY
onMounted(() => {
  // 解决支付宝自定义tabbar 未隐藏导致有2个 tabBar 的问题; 注意支付宝很特别，需要在 onMounted 钩子调用
  customTabbarEnable // 另外，支付宝里面，只要是 customTabbar 都需要隐藏
  && uni.hideTabBar({
    fail(err) {
      console.log('hideTabBar fail: ', err)
    },
    success(res) {
      // console.log('hideTabBar success: ', res)
    },
  })
})
// #endif
const activeColor = 'var(--wot-color-theme, #1890ff)'
const inactiveColor = '#666'
function getColorByIndex(index: number) {
  return tabbarStore.curIdx === index ? activeColor : inactiveColor
}
</script>

<template>
  <view v-if="customTabbarEnable" class="h-50px pb-safe">
    <view class="border-and-fixed bg-white" @touchmove.stop.prevent>
      <view class="h-50px flex items-center">
        <view
          v-for="(item, index) in tabbarList" :key="index"
          class="flex flex-1 flex-col items-center justify-center"
          :class="{
            'tabbar-item-message': index === 2,
            'tabbar-item-me': index === 4,
          }"
          :style="{ color: getColorByIndex(index) }"
          @click="handleClick(index)"
        >
          <view v-if="item.isBulge" class="relative">
            <!-- 中间一个鼓包tabbarItem的处理 -->
            <view class="bulge">
              <TabbarItem :item="item" :index="index" class="text-center" is-bulge />
            </view>
          </view>
          <TabbarItem v-else :item="item" :index="index" class="relative px-3 text-center" />
        </view>
      </view>

      <view class="pb-safe" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.border-and-fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  border-top: 1px solid #eee;
  box-sizing: border-box;
}
// 中间鼓包的样式
.bulge {
  position: absolute;
  top: -20px;
  left: 50%;
  transform-origin: top center;
  transform: translateX(-50%) scale(0.5) translateY(-33%);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 250rpx;
  height: 250rpx;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: inset 0 0 0 1px #fefefe;

  &:active {
    // opacity: 0.8;
  }
}
</style>
