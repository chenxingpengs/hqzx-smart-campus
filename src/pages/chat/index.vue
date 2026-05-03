<script setup lang="ts">
import type { Conversation } from '@/api/chat'
import type { ChatMessageData, ContactRequestNewData, ConversationNewData } from '@/types/websocket'
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getChatConversations, getContactRequests } from '@/api/chat'
import TourGuide from '@/components/TourGuide/TourGuide.vue'
import { getTourSteps, PAGE_PATHS, TOUR_VERSION } from '@/config/tourSteps'
import { useChatCacheStore } from '@/store/chatCache'
import { useTokenStore } from '@/store/token'
import { useTourStore } from '@/store/tour'
import { useUnreadStore } from '@/store/unread'
import { useUserStore } from '@/store/user'
import { wsManager } from '@/utils/websocket'

definePage({
  style: {
    navigationBarTitleText: '消息',
    backgroundColor: '#f5f5f5',
    backgroundTextStyle: 'dark',
  },
})

const tourStore = useTourStore()
const showTour = ref(false)
const tourSteps = getTourSteps(PAGE_PATHS.chat)

const userStore = useUserStore()
const unreadStore = useUnreadStore()
const chatCacheStore = useChatCacheStore()
const tokenStore = useTokenStore()
const conversations = ref<Conversation[]>([])
const loading = ref(false)
const refreshing = ref(false)
const showMoreMenu = ref(false)
const pendingRequestCount = ref(0)

const canCreateGroup = computed(() => {
  const role = userStore.userInfo?.role
  return role === 'admin' || role === 'teacher'
})

function handleNewMessage(data: ChatMessageData) {
  console.log('[会话列表] 收到新消息:', data)
  const convIndex = conversations.value.findIndex(c => c.id === data.conversation_id)
  if (convIndex > -1) {
    const conv = conversations.value[convIndex]
    conv.last_message = data.content || '[非文本消息]'
    conv.last_message_time = data.sent_at

    if (data.sender_id !== userStore.userInfo?.userId) {
      conv.unread_count = (conv.unread_count || 0) + 1
      unreadStore.incrementConversationUnread(data.conversation_id)
      unreadStore.updateTabbarBadge()
    }

    conversations.value.splice(convIndex, 1)
    conversations.value.unshift(conv)
    chatCacheStore.setConversations(conversations.value)
  }
}

function handleContactRequestNew(data: ContactRequestNewData) {
  console.log('[会话列表] 收到新的好友/入群请求:', data)
  pendingRequestCount.value += 1
  uni.showToast({
    title: '收到新的好友请求',
    icon: 'none',
    duration: 2000,
  })
}

function handleConversationNew(data: ConversationNewData) {
  console.log('[会话列表] 收到新会话:', data)
  const exists = conversations.value.some(c => c.id === data.id)
  if (!exists) {
    const newConv: Conversation = {
      id: data.id,
      name: data.name,
      type: data.type,
      avatar: data.avatar,
      unread_count: 0,
      is_pinned: false,
      is_muted: false,
    }
    conversations.value.unshift(newConv)
    chatCacheStore.setConversations(conversations.value)
  }
}

onMounted(() => {
  const token = tokenStore.tokenInfo.accessToken
  if (token) {
    wsManager.ensureConnected(token)
  }
  wsManager.on('chat:message', handleNewMessage)
  wsManager.on('contact:request_new', handleContactRequestNew)
  wsManager.on('chat:conversation_new', handleConversationNew)
})

onUnmounted(() => {
  wsManager.off('chat:message', handleNewMessage)
  wsManager.off('contact:request_new', handleContactRequestNew)
  wsManager.off('chat:conversation_new', handleConversationNew)
})

async function loadConversations(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = chatCacheStore.getConversations()
    if (cached) {
      conversations.value = cached
      console.log('[聊天页面] 使用缓存数据')
    }
  }

  loading.value = true
  console.log('[聊天页面] 开始加载会话列表')
  try {
    const [convRes, reqRes] = await Promise.all([
      getChatConversations(),
      getContactRequests({ status: 'pending', request_type: 'received' }),
    ])
    console.log('[聊天页面] API返回结果:', JSON.stringify(convRes))
    if (convRes && convRes.list) {
      conversations.value = convRes.list.filter((item: Conversation) => item.type !== 'broadcast')
      chatCacheStore.setConversations(conversations.value)
      unreadStore.updateChatUnreadFromList(conversations.value)
      unreadStore.updateTabbarBadge()
      console.log('[聊天页面] 会话列表已设置:', conversations.value.length, '条')
    }
    else {
      console.log('[聊天页面] 返回数据格式异常')
    }

    if (reqRes && Array.isArray(reqRes)) {
      pendingRequestCount.value = reqRes.length
      console.log('[聊天页面] 待处理好友请求:', pendingRequestCount.value, '条')
    }
  }
  catch (error) {
    console.error('[聊天页面] 加载会话列表失败:', error)
  }
  finally {
    loading.value = false
    console.log('[聊天页面] 加载完成, loading=', loading.value)
  }
}

onShow(() => {
  loadConversations()
  if (tourStore.shouldShowPageTour(PAGE_PATHS.chat, TOUR_VERSION)) {
    setTimeout(() => {
      showTour.value = true
    }, 500)
  }
})

async function onRefresh() {
  refreshing.value = true
  await loadConversations(true)
  refreshing.value = false
}

function requestSubscribeMessage() {
  // #ifdef MP-WEIXIN
  wx.requestSubscribeMessage({
    tmplIds: ['PuThjmXbKecLwWFYoRc43Ptu0J4HeZOq7EELzjRdrKs'],
    success: (res) => {
      console.log('[订阅消息] 订阅结果:', res)
      const status = res.PuThjmXbKecLwWFYoRc43Ptu0J4HeZOq7EELzjRdrKs
      if (status === 'accept') {
        console.log('[订阅消息] 用户已同意订阅')
      }
      else if (status === 'reject') {
        console.log('[订阅消息] 用户拒绝订阅')
      }
      else if (status === 'ban') {
        console.log('[订阅消息] 用户已被后台封禁')
      }
    },
    fail: (err) => {
      console.warn('[订阅消息] 调用失败:', err)
    },
  })
  // #endif
}

function goToChat(conversationId: string, conversationName?: string, conversationType?: string) {
  const unreadCount = unreadStore.getConversationUnread(conversationId)
  let url = `/pages-chat/detail/index?id=${conversationId}&unread=${unreadCount}`
  if (conversationName) {
    url += `&name=${encodeURIComponent(conversationName)}`
  }
  if (conversationType) {
    url += `&type=${conversationType}`
  }

  // #ifdef MP-WEIXIN
  wx.requestSubscribeMessage({
    tmplIds: ['PuThjmXbKecLwWFYoRc43Ptu0J4HeZOq7EELzjRdrKs'],
    success: (res) => {
      console.log('[订阅消息] 订阅结果:', res)
    },
    fail: (err) => {
      console.warn('[订阅消息] 调用失败:', err)
    },
    complete: () => {
      uni.navigateTo({ url })
    },
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.navigateTo({ url })
  // #endif
}

function openMoreMenu() {
  showMoreMenu.value = true
}

function closeMoreMenu() {
  showMoreMenu.value = false
}

function handleMenuAction(action: string) {
  showMoreMenu.value = false

  switch (action) {
    case 'create-group':
      uni.navigateTo({ url: '/pages/chat/create-group' })
      break
    case 'add-contact':
      uni.navigateTo({ url: '/pages/chat/add-contact' })
      break
    case 'add-class':
      uni.navigateTo({ url: '/pages/chat/add-class' })
      break
    case 'contact-requests':
      uni.navigateTo({ url: '/pages/chat/contact-requests' })
      break
  }
}

function goToContactRequests() {
  uni.navigateTo({ url: '/pages/chat/contact-requests' })
}

function formatTime(time: string) {
  if (!time)
    return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000)
    return '刚刚'
  if (diff < 3600000)
    return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000)
    return `${Math.floor(diff / 3600000)}小时前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getTypeName(type: string) {
  switch (type) {
    case 'private': return '私聊'
    case 'group': return '群聊'
    default: return '会话'
  }
}

function handleTourComplete() {
  tourStore.markPageCompleted(PAGE_PATHS.chat)
  showTour.value = false
}

function handleTourSkip() {
  tourStore.skipPageTour(PAGE_PATHS.chat)
  showTour.value = false
}
</script>

<template>
  <view class="h-screen flex flex-col bg-gray-100">
    <view class="flex items-center justify-between border-b border-gray-200 bg-white px-30rpx py-20rpx">
      <text class="text-36rpx text-gray-800 font-bold">消息</text>
      <view class="tour-chat-more h-60rpx w-60rpx flex items-center justify-center" @click="openMoreMenu">
        <text class="text-40rpx text-gray-600 font-bold">⋯</text>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="flex-1"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 好友请求提示条 -->
      <view v-if="pendingRequestCount > 0" class="request-banner tour-chat-request" @click="goToContactRequests">
        <view class="banner-content">
          <text class="banner-icon">👥</text>
          <view class="banner-text">
            <text class="banner-title">新的好友请求</text>
            <text class="banner-desc">您有 {{ pendingRequestCount > 99 ? '99+' : pendingRequestCount }} 个待处理的好友请求</text>
          </view>
          <view class="banner-badge">
            <text class="badge-text">{{ pendingRequestCount > 99 ? '99+' : pendingRequestCount }}</text>
          </view>
        </view>
      </view>

      <view
        v-for="item in conversations"
        :key="item.id"
        class="conversation-item tour-chat-list"
        @click="goToChat(item.id, item.name, item.type)"
      >
        <view class="avatar" :class="{ group: item.type === 'group', private: item.type === 'private' }">
          <text class="avatar-text">{{ item.name?.charAt(0) || '群' }}</text>
        </view>

        <view class="content">
          <view class="top-row">
            <view class="name-wrapper">
              <text class="name">{{ item.name }}</text>
              <text class="type-tag" :class="item.type">{{ getTypeName(item.type) }}</text>
              <text v-if="item.is_class_group" class="class-tag">班级群</text>
            </view>
            <text class="time">{{ formatTime(item.last_message_time || '') }}</text>
          </view>
          <view class="bottom-row">
            <text class="last-message">{{ item.last_message || '暂无消息' }}</text>
            <view v-if="item.unread_count > 0" class="unread-badge">
              <text>{{ item.unread_count > 99 ? '99+' : item.unread_count }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="conversations.length === 0 && !loading" class="empty">
        <text>暂无会话</text>
        <text class="tip">点击右上角 ⋯ 添加联系人或创建群聊</text>
      </view>
    </scroll-view>

    <!-- 更多菜单 -->
    <view v-if="showMoreMenu" class="menu-mask" @click="closeMoreMenu">
      <view class="menu-content" @click.stop>
        <view class="menu-header">
          <text class="menu-title">更多选项</text>
          <text class="close-btn" @click="closeMoreMenu">×</text>
        </view>

        <view class="menu-list">
          <view
            v-if="canCreateGroup"
            class="menu-item"
            @click="handleMenuAction('create-group')"
          >
            <view class="menu-icon create-icon">
              <text>📝</text>
            </view>
            <view class="menu-text">
              <text class="menu-name">创建群聊</text>
              <text class="menu-desc">以班级为单位创建群聊</text>
            </view>
          </view>

          <view
            class="menu-item"
            @click="handleMenuAction('add-contact')"
          >
            <view class="menu-icon contact-icon">
              <text>👥</text>
            </view>
            <view class="menu-text">
              <text class="menu-name">添加联系人</text>
              <text class="menu-desc">添加其他用户进行私聊</text>
            </view>
          </view>

          <view
            class="menu-item"
            @click="handleMenuAction('add-class')"
          >
            <view class="menu-icon class-icon">
              <text>🏫</text>
            </view>
            <view class="menu-text">
              <text class="menu-name">添加班级</text>
              <text class="menu-desc">申请加入其他班级群聊</text>
            </view>
          </view>

          <view
            class="menu-item"
            @click="handleMenuAction('contact-requests')"
          >
            <view class="menu-icon request-icon">
              <text>📬</text>
            </view>
            <view class="menu-text">
              <view class="flex items-center justify-between">
                <text class="menu-name">好友请求</text>
                <view v-if="pendingRequestCount > 0" class="menu-badge">
                  <text>{{ pendingRequestCount > 99 ? '99+' : pendingRequestCount }}</text>
                </view>
              </view>
              <text class="menu-desc">查看和处理好友请求</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <TourGuide
      v-model:show="showTour"
      :steps="tourSteps"
      @complete="handleTourComplete"
      @skip="handleTourSkip"
    />
  </view>
</template>

<style lang="scss" scoped>
.request-banner {
  margin: 20rpx 30rpx;
  padding: 24rpx 30rpx;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-radius: 16rpx;
  border-left: 6rpx solid #1976d2;

  .banner-content {
    display: flex;
    align-items: center;

    .banner-icon {
      font-size: 40rpx;
      margin-right: 20rpx;
    }

    .banner-text {
      flex: 1;

      .banner-title {
        font-size: 28rpx;
        font-weight: 600;
        color: #1976d2;
        display: block;
      }

      .banner-desc {
        font-size: 24rpx;
        color: #1565c0;
        margin-top: 4rpx;
        display: block;
      }
    }

    .banner-badge {
      background: #f44336;
      border-radius: 20rpx;
      padding: 4rpx 14rpx;
      min-width: 36rpx;
      height: 36rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .badge-text {
        font-size: 22rpx;
        color: #fff;
        font-weight: 500;
      }
    }
  }

  &:active {
    opacity: 0.9;
  }
}

.conversation-item {
  display: flex;
  padding: 24rpx 30rpx;
  background: #fff;
  border-bottom: 1rpx solid #eee;
  width: 100%;
  box-sizing: border-box;

  .avatar {
    width: 96rpx;
    height: 96rpx;
    border-radius: 48rpx;
    background: #1976d2;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.group {
      background: #ff9800;
    }

    &.private {
      background: #4caf50;
    }

    .avatar-text {
      font-size: 36rpx;
      color: #fff;
      font-weight: bold;
    }
  }

  .content {
    flex: 1;
    margin-left: 24rpx;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    overflow: hidden;

    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .name-wrapper {
        display: flex;
        align-items: center;
        gap: 12rpx;
        flex: 1;
        min-width: 0;
        overflow: hidden;

        .name {
          font-size: 30rpx;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .type-tag {
          font-size: 20rpx;
          padding: 2rpx 12rpx;
          border-radius: 8rpx;
          background: #e3f2fd;
          color: #1976d2;

          &.group {
            background: #fff3e0;
            color: #ff9800;
          }

          &.private {
            background: #e8f5e9;
            color: #4caf50;
          }
        }

        .class-tag {
          font-size: 20rpx;
          padding: 2rpx 12rpx;
          border-radius: 8rpx;
          background: #fce4ec;
          color: #e91e63;
        }
      }

      .time {
        font-size: 24rpx;
        color: #999;
      }
    }

    .bottom-row {
      display: flex;
      justify-content: space-between;
      margin-top: 8rpx;

      .last-message {
        font-size: 26rpx;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
      }

      .unread-badge {
        background: #f44336;
        border-radius: 20rpx;
        padding: 0 12rpx;
        min-width: 32rpx;
        height: 32rpx;
        display: flex;
        align-items: center;
        justify-content: center;

        text {
          font-size: 20rpx;
          color: #fff;
        }
      }
    }
  }
}

.empty {
  padding: 100rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  color: #999;

  .tip {
    font-size: 24rpx;
    color: #bbb;
  }
}

.menu-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.menu-content {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;

  .menu-title {
    font-size: 32rpx;
    font-weight: bold;
  }

  .close-btn {
    font-size: 48rpx;
    color: #999;
    line-height: 1;
  }
}

.menu-list {
  padding: 20rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #f9f9f9;
  border-radius: 16rpx;
  margin-bottom: 16rpx;

  &:active {
    background: #f0f0f0;
  }

  &:last-child {
    margin-bottom: 0;
  }

  .menu-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    font-size: 36rpx;

    &.create-icon {
      background: #e3f2fd;
    }

    &.contact-icon {
      background: #e8f5e9;
    }

    &.class-icon {
      background: #fff3e0;
    }

    &.request-icon {
      background: #fce4ec;
    }
  }

  .menu-text {
    flex: 1;

    .menu-name {
      font-size: 30rpx;
      font-weight: 500;
      color: #333;
      display: block;
      .menu-desc {
        font-size: 24rpx;
        color: #999;
        margin-top: 4rpx;
        display: block;
      }

      .menu-badge {
        background: #f44336;
        border-radius: 16rpx;
        padding: 2rpx 10rpx;
        min-widht: 28rpx;
        height: 28rpx;
        display: flex;
        align-items: center;
        justify-content: center;

        text {
          font-size: 20rpx;
          color: #fff;
          font-weight: 500;
        }
      }
    }
  }
}
</style>
