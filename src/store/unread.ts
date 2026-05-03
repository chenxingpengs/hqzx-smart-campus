import type { Conversation } from '@/api/chat'
import type { CustomTabBarItemBadge } from '@/tabbar/types'
import type {
  ConversationNewData,
  ConversationUpdateData,
  NotificationUnreadCountData,
  UnreadUpdateData,
} from '@/types/websocket'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getChatConversations } from '@/api/chat'
import { appNotificationsUnreadCountUsingGet } from '@/service/notification'
import { useChatCacheStore } from '@/store/chatCache'
import { customTabbarList } from '@/tabbar/config'
import { tabbarStore } from '@/tabbar/store'
import { wsManager } from '@/utils/websocket'

const CHAT_TABBAR_INDEX = 2

export const useUnreadStore = defineStore(
  'unread',
  () => {
    const notificationUnreadCount = ref(0)
    const chatUnreadCount = ref(0)
    const conversations = ref<Conversation[]>([])
    const isInitialized = ref(false)
    const wsListenersRegistered = ref(false)

    const totalUnreadCount = computed(() => {
      return notificationUnreadCount.value + chatUnreadCount.value
    })

    const updateTabbarBadge = () => {
      const total = totalUnreadCount.value
      const chatTabIndex = customTabbarList.findIndex(item => item.pagePath.includes('chat'))

      if (chatTabIndex !== -1) {
        const badge: CustomTabBarItemBadge = total > 0 ? total : undefined
        tabbarStore.setTabbarItemBadge(chatTabIndex, badge)
      }

      console.log('[UnreadStore] 更新tabbar角标:', total)
    }

    const fetchNotificationUnreadCount = async () => {
      try {
        const res = await appNotificationsUnreadCountUsingGet({})
        if (res && res.data) {
          notificationUnreadCount.value = res.data.count || 0
          console.log('[UnreadStore] 系统通知未读数量:', notificationUnreadCount.value)
        }
      }
      catch (error) {
        console.error('[UnreadStore] 获取系统通知未读数量失败:', error)
      }
    }

    const fetchChatUnreadCount = async () => {
      try {
        const res = await getChatConversations()
        if (res && res.list) {
          updateChatUnreadFromList(res.list)
          const chatCacheStore = useChatCacheStore()
          chatCacheStore.setConversations(res.list)
          console.log('[UnreadStore] 聊天未读数量:', chatUnreadCount.value)
        }
      }
      catch (error) {
        console.error('[UnreadStore] 获取聊天未读数量失败:', error)
      }
    }

    const updateChatUnreadFromList = (list: Conversation[]) => {
      conversations.value = list
      const total = list.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
      chatUnreadCount.value = total
      console.log('[UnreadStore] 从会话列表更新未读数量:', total)
    }

    const fetchAllUnreadCount = async () => {
      console.log('[UnreadStore] 开始获取所有未读数量（系统通知 + 聊天消息）')

      try {
        await Promise.all([
          fetchNotificationUnreadCount(),
          fetchChatUnreadCount(),
        ])

        console.log('[UnreadStore] 未读数量统计完成:')
        console.log('  - 系统通知未读:', notificationUnreadCount.value)
        console.log('  - 聊天消息未读:', chatUnreadCount.value)
        console.log('  - 总计:', totalUnreadCount.value)

        updateTabbarBadge()
      }
      catch (error) {
        console.error('[UnreadStore] 获取未读数量失败:', error)
        updateTabbarBadge()
      }
    }

    const handleUnreadUpdate = (data: UnreadUpdateData) => {
      console.log('[UnreadStore] WebSocket 收到未读更新:', data)
      const conv = conversations.value.find(c => c.id === data.conversation_id)
      if (conv) {
        const oldCount = conv.unread_count || 0
        const diff = data.unread_count - oldCount
        conv.unread_count = data.unread_count
        chatUnreadCount.value = Math.max(0, chatUnreadCount.value + diff)
        updateTabbarBadge()

        if (diff > 0) {
          triggerVibrate()
        }
      }
    }

    const triggerVibrate = () => {
      console.log('[UnreadStore] 收到新消息，触发震动')
      uni.vibrateShort({
        success: () => {
          console.log('[UnreadStore] 震动成功')
        },
        fail: (err) => {
          console.warn('[UnreadStore] 震动失败:', err)
        },
      })
    }

    const handleConversationUpdate = (data: ConversationUpdateData) => {
      console.log('[UnreadStore] WebSocket 收到会话更新:', data)
      const conv = conversations.value.find(c => c.id === data.id)
      if (conv) {
        if (data.last_message !== undefined) {
          conv.last_message = data.last_message
        }
        if (data.last_message_time !== undefined) {
          conv.last_message_time = data.last_message_time
        }
        const chatCacheStore = useChatCacheStore()
        chatCacheStore.updateConversationLastMessage(
          data.id,
          data.last_message || '',
          data.last_message_time,
        )
      }
    }

    const handleConversationNew = (data: ConversationNewData) => {
      console.log('[UnreadStore] WebSocket 收到新会话:', data)
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
        const chatCacheStore = useChatCacheStore()
        chatCacheStore.setConversations(conversations.value)
      }
    }

    const handleNotificationUnreadCount = (data: NotificationUnreadCountData) => {
      console.log('[UnreadStore] WebSocket 收到通知未读数更新:', data)
      notificationUnreadCount.value = data.count
      updateTabbarBadge()
    }

    const registerWebSocketListeners = () => {
      if (wsListenersRegistered.value) {
        console.log('[UnreadStore] WebSocket 监听器已注册，跳过')
        return
      }

      wsManager.on('chat:unread_update', handleUnreadUpdate)
      wsManager.on('chat:conversation_update', handleConversationUpdate)
      wsManager.on('chat:conversation_new', handleConversationNew)
      wsManager.on('notification:unread_count', handleNotificationUnreadCount)
      wsManager.on('reconnected', handleReconnected)

      wsListenersRegistered.value = true
      console.log('[UnreadStore] WebSocket 监听器已注册')
    }

    const unregisterWebSocketListeners = () => {
      wsManager.off('chat:unread_update', handleUnreadUpdate)
      wsManager.off('chat:conversation_update', handleConversationUpdate)
      wsManager.off('chat:conversation_new', handleConversationNew)
      wsManager.off('notification:unread_count', handleNotificationUnreadCount)
      wsManager.off('reconnected', handleReconnected)

      wsListenersRegistered.value = false
      console.log('[UnreadStore] WebSocket 监听器已注销')
    }

    const handleReconnected = async () => {
      console.log('[UnreadStore] WebSocket 重连成功，同步离线数据')
      await fetchAllUnreadCount()
    }

    const markConversationRead = (conversationId: string, count: number = 1) => {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (conv && conv.unread_count > 0) {
        const actualCount = Math.min(count, conv.unread_count)
        conv.unread_count -= actualCount
        chatUnreadCount.value = Math.max(0, chatUnreadCount.value - actualCount)
        updateTabbarBadge()
        console.log('[UnreadStore] 会话已读, 减少未读:', actualCount, '剩余:', chatUnreadCount.value)
      }
    }

    const markAllConversationRead = (conversationId: string) => {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (conv && conv.unread_count > 0) {
        chatUnreadCount.value = Math.max(0, chatUnreadCount.value - conv.unread_count)
        conv.unread_count = 0
        updateTabbarBadge()
        console.log('[UnreadStore] 会话全部已读, 剩余:', chatUnreadCount.value)
      }
    }

    const incrementConversationUnread = (conversationId: string, count: number = 1) => {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (conv) {
        conv.unread_count = (conv.unread_count || 0) + count
        chatUnreadCount.value += count
        updateTabbarBadge()
        console.log('[UnreadStore] 会话未读增加:', count, '当前:', conv.unread_count)
        triggerVibrate()
      }
    }

    const decreaseNotificationUnread = (count: number = 1) => {
      notificationUnreadCount.value = Math.max(0, notificationUnreadCount.value - count)
      updateTabbarBadge()
      console.log('[UnreadStore] 系统通知已读, 减少:', count, '剩余:', notificationUnreadCount.value)
    }

    const clearNotificationUnread = () => {
      notificationUnreadCount.value = 0
      updateTabbarBadge()
      console.log('[UnreadStore] 清空系统通知未读')
    }

    const getConversationUnread = (conversationId: string): number => {
      const conv = conversations.value.find(c => c.id === conversationId)
      return conv?.unread_count || 0
    }

    const init = async () => {
      if (isInitialized.value) {
        console.log('[UnreadStore] 已初始化，跳过')
        return
      }

      console.log('[UnreadStore] 开始初始化')
      await fetchAllUnreadCount()
      registerWebSocketListeners()
      isInitialized.value = true
    }

    const reset = () => {
      unregisterWebSocketListeners()
      notificationUnreadCount.value = 0
      chatUnreadCount.value = 0
      conversations.value = []
      isInitialized.value = false
      updateTabbarBadge()
      console.log('[UnreadStore] 重置完成')
    }

    watch([notificationUnreadCount, chatUnreadCount], () => {
      updateTabbarBadge()
    })

    return {
      notificationUnreadCount,
      chatUnreadCount,
      totalUnreadCount,
      conversations,
      fetchNotificationUnreadCount,
      fetchChatUnreadCount,
      updateChatUnreadFromList,
      fetchAllUnreadCount,
      markConversationRead,
      markAllConversationRead,
      incrementConversationUnread,
      decreaseNotificationUnread,
      clearNotificationUnread,
      getConversationUnread,
      init,
      reset,
      updateTabbarBadge,
      registerWebSocketListeners,
      unregisterWebSocketListeners,
    }
  },
  {
    persist: {
      paths: ['notificationUnreadCount', 'chatUnreadCount'],
    },
  },
)
