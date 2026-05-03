import type { ChatMessage, Conversation } from '@/api/chat'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const CONVERSATION_CACHE_EXPIRE = 10 * 60 * 1000
const MESSAGE_CACHE_EXPIRE = 30 * 60 * 1000
const MAX_MESSAGES_PER_CONVERSATION = 100
const MAX_CONVERSATIONS = 50

interface ConversationCache {
  data: Conversation[]
  timestamp: number
}

interface MessageCache {
  data: ChatMessage[]
  timestamp: number
  hasMore: boolean
}

export const useChatCacheStore = defineStore(
  'chatCache',
  () => {
    const conversationsCache = ref<ConversationCache | null>(null)
    const messagesCache = ref<Record<string, MessageCache>>({})

    const isCacheValid = (timestamp: number, expireTime: number): boolean => {
      return Date.now() - timestamp < expireTime
    }

    const getConversations = (): Conversation[] | null => {
      if (conversationsCache.value && isCacheValid(conversationsCache.value.timestamp, CONVERSATION_CACHE_EXPIRE)) {
        console.log('[ChatCache] 使用会话列表缓存')
        return conversationsCache.value.data
      }
      console.log('[ChatCache] 会话列表缓存已过期或不存在')
      return null
    }

    const setConversations = (data: Conversation[]) => {
      let sortedData = [...data]

      sortedData.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) {
          return b.is_pinned ? 1 : -1
        }
        const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0
        const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0
        return timeB - timeA
      })

      if (sortedData.length > MAX_CONVERSATIONS) {
        sortedData = sortedData.slice(0, MAX_CONVERSATIONS)
        console.log('[ChatCache] 会话列表已裁剪至', MAX_CONVERSATIONS, '条')
      }

      conversationsCache.value = {
        data: sortedData,
        timestamp: Date.now(),
      }
      console.log('[ChatCache] 更新会话列表缓存, 数量:', sortedData.length)
    }

    const getMessages = (conversationId: string): ChatMessage[] | null => {
      const cache = messagesCache.value[conversationId]
      if (cache && isCacheValid(cache.timestamp, MESSAGE_CACHE_EXPIRE)) {
        console.log('[ChatCache] 使用消息缓存, conversationId:', conversationId)
        return cache.data
      }
      console.log('[ChatCache] 消息缓存已过期或不存在, conversationId:', conversationId)
      return null
    }

    const setMessages = (conversationId: string, data: ChatMessage[], hasMore: boolean = false) => {
      let messagesToCache = data

      if (messagesToCache.length > MAX_MESSAGES_PER_CONVERSATION) {
        messagesToCache = messagesToCache.slice(-MAX_MESSAGES_PER_CONVERSATION)
        console.log('[ChatCache] 消息已裁剪至', MAX_MESSAGES_PER_CONVERSATION, '条')
      }

      messagesCache.value[conversationId] = {
        data: messagesToCache,
        timestamp: Date.now(),
        hasMore,
      }
      console.log('[ChatCache] 更新消息缓存, conversationId:', conversationId, '数量:', messagesToCache.length)
    }

    const addMessage = (conversationId: string, message: ChatMessage) => {
      const cache = messagesCache.value[conversationId]
      if (cache) {
        const exists = cache.data.some(msg => msg.id === message.id)
        if (!exists) {
          cache.data.push(message)

          if (cache.data.length > MAX_MESSAGES_PER_CONVERSATION) {
            cache.data = cache.data.slice(-MAX_MESSAGES_PER_CONVERSATION)
          }

          cache.timestamp = Date.now()
          console.log('[ChatCache] 添加新消息到缓存, conversationId:', conversationId)
        }
      }
      else {
        messagesCache.value[conversationId] = {
          data: [message],
          timestamp: Date.now(),
          hasMore: false,
        }
        console.log('[ChatCache] 创建新消息缓存, conversationId:', conversationId)
      }
    }

    const prependMessages = (conversationId: string, olderMessages: ChatMessage[]) => {
      const cache = messagesCache.value[conversationId]
      if (cache) {
        const existingIds = new Set(cache.data.map(msg => msg.id))
        const newMessages = olderMessages.filter(msg => !existingIds.has(msg.id))

        cache.data = [...newMessages, ...cache.data]

        if (cache.data.length > MAX_MESSAGES_PER_CONVERSATION) {
          cache.data = cache.data.slice(0, MAX_MESSAGES_PER_CONVERSATION)
        }

        cache.timestamp = Date.now()
        console.log('[ChatCache] 前置添加历史消息, conversationId:', conversationId, '新增:', newMessages.length)
      }
    }

    const updateMessage = (conversationId: string, tempId: number, realMessage: ChatMessage) => {
      const cache = messagesCache.value[conversationId]
      if (cache) {
        const index = cache.data.findIndex(msg => msg.id === tempId)
        if (index > -1) {
          cache.data[index] = realMessage
          cache.timestamp = Date.now()
          console.log('[ChatCache] 更新缓存中的临时消息, conversationId:', conversationId)
        }
      }
    }

    const updateConversationLastMessage = (conversationId: string, lastMessage: string, lastMessageTime: string) => {
      if (conversationsCache.value) {
        const conv = conversationsCache.value.data.find(c => c.id === conversationId)
        if (conv) {
          conv.last_message = lastMessage
          conv.last_message_time = lastMessageTime
          conversationsCache.value.timestamp = Date.now()
          console.log('[ChatCache] 更新会话最后消息, conversationId:', conversationId)
        }
      }
    }

    const updateConversationUnreadCount = (conversationId: string, count: number) => {
      if (conversationsCache.value) {
        const conv = conversationsCache.value.data.find(c => c.id === conversationId)
        if (conv) {
          conv.unread_count = count
          conversationsCache.value.timestamp = Date.now()
        }
      }
    }

    const clearConversationCache = () => {
      conversationsCache.value = null
      console.log('[ChatCache] 清空会话列表缓存')
    }

    const clearMessagesCache = (conversationId?: string) => {
      if (conversationId) {
        delete messagesCache.value[conversationId]
        console.log('[ChatCache] 清空消息缓存, conversationId:', conversationId)
      }
      else {
        messagesCache.value = {}
        console.log('[ChatCache] 清空所有消息缓存')
      }
    }

    const clearAllCache = () => {
      conversationsCache.value = null
      messagesCache.value = {}
      console.log('[ChatCache] 清空所有缓存')
    }

    const updateConversationPin = (conversationId: string, isPinned: boolean) => {
      if (conversationsCache.value) {
        const conv = conversationsCache.value.data.find(c => c.id === conversationId)
        if (conv) {
          conv.is_pinned = isPinned
          conversationsCache.value.timestamp = Date.now()
          console.log('[ChatCache] 更新会话置顶状态, conversationId:', conversationId, 'isPinned:', isPinned)
        }
      }
    }

    const updateConversationMute = (conversationId: string, isMuted: boolean) => {
      if (conversationsCache.value) {
        const conv = conversationsCache.value.data.find(c => c.id === conversationId)
        if (conv) {
          conv.is_muted = isMuted
          conversationsCache.value.timestamp = Date.now()
          console.log('[ChatCache] 更新会话免打扰状态, conversationId:', conversationId, 'isMuted:', isMuted)
        }
      }
    }

    const clearMessages = (conversationId: string) => {
      clearMessagesCache(conversationId)
      if (conversationsCache.value) {
        const conv = conversationsCache.value.data.find(c => c.id === conversationId)
        if (conv) {
          conv.last_message = ''
          conv.last_message_time = undefined
          conversationsCache.value.timestamp = Date.now()
        }
      }
    }

    const removeConversation = (conversationId: string) => {
      if (conversationsCache.value) {
        const index = conversationsCache.value.data.findIndex(c => c.id === conversationId)
        if (index > -1) {
          conversationsCache.value.data.splice(index, 1)
          conversationsCache.value.timestamp = Date.now()
          console.log('[ChatCache] 移除会话, conversationId:', conversationId)
        }
      }
      clearMessagesCache(conversationId)
    }

    const addConversation = (conversation: Conversation) => {
      if (conversationsCache.value) {
        const exists = conversationsCache.value.data.some(c => c.id === conversation.id)
        if (!exists) {
          conversationsCache.value.data.unshift(conversation)
          conversationsCache.value.timestamp = Date.now()
          console.log('[ChatCache] 添加新会话, conversationId:', conversation.id)
        }
      }
      else {
        conversationsCache.value = {
          data: [conversation],
          timestamp: Date.now(),
        }
      }
    }

    const getCacheStats = () => {
      const conversationCount = conversationsCache.value?.data.length || 0
      const messageCacheCount = Object.keys(messagesCache.value).length
      let totalMessages = 0
      Object.values(messagesCache.value).forEach((cache) => {
        totalMessages += cache.data.length
      })

      return {
        conversationCount,
        messageCacheCount,
        totalMessages,
        oldestMessageCache: getOldestCacheTime(),
      }
    }

    const getOldestCacheTime = (): number | null => {
      let oldest: number | null = null
      Object.values(messagesCache.value).forEach((cache) => {
        if (oldest === null || cache.timestamp < oldest) {
          oldest = cache.timestamp
        }
      })
      return oldest
    }

    const cleanupExpiredCache = () => {
      const now = Date.now()
      let cleaned = 0

      Object.keys(messagesCache.value).forEach((conversationId) => {
        const cache = messagesCache.value[conversationId]
        if (cache && !isCacheValid(cache.timestamp, MESSAGE_CACHE_EXPIRE)) {
          delete messagesCache.value[conversationId]
          cleaned++
        }
      })

      if (conversationsCache.value && !isCacheValid(conversationsCache.value.timestamp, CONVERSATION_CACHE_EXPIRE)) {
        conversationsCache.value = null
        cleaned++
      }

      if (cleaned > 0) {
        console.log('[ChatCache] 清理过期缓存, 数量:', cleaned)
      }

      return cleaned
    }

    const getHasMore = (conversationId: string): boolean => {
      const cache = messagesCache.value[conversationId]
      return cache?.hasMore ?? true
    }

    return {
      conversationsCache,
      messagesCache,
      getConversations,
      setConversations,
      getMessages,
      setMessages,
      addMessage,
      prependMessages,
      updateMessage,
      updateConversationLastMessage,
      updateConversationUnreadCount,
      updateConversationPin,
      updateConversationMute,
      clearMessages,
      clearConversationCache,
      clearMessagesCache,
      clearAllCache,
      removeConversation,
      addConversation,
      getCacheStats,
      cleanupExpiredCache,
      getHasMore,
    }
  },
  {
    persist: {
      paths: ['conversationsCache', 'messagesCache'],
    },
  },
)
