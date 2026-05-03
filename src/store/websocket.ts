import type { SocketConnectionState, SocketError } from '@/types/websocket'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { wsManager } from '@/utils/websocket'

export const useWebSocketStore = defineStore('websocket', () => {
  const connectionState = ref<SocketConnectionState>('disconnected')
  const lastError = ref<SocketError | null>(null)
  const socketId = ref<string | undefined>(undefined)

  const isConnected = computed(() => connectionState.value === 'connected')
  const isConnecting = computed(() => connectionState.value === 'connecting')
  const isReconnecting = computed(() => connectionState.value === 'reconnecting')
  const hasError = computed(() => connectionState.value === 'error')

  const init = (): void => {
    wsManager.on('connection-state-change', (state) => {
      connectionState.value = state as SocketConnectionState
      if (state === 'connected') {
        socketId.value = wsManager.getSocketId()
      }
      else if (state === 'disconnected') {
        socketId.value = undefined
      }
    })

    wsManager.on('error', (error) => {
      lastError.value = error as SocketError
    })

    console.log('[WebSocketStore] 初始化完成')
  }

  const connect = (token: string, namespace?: string): void => {
    wsManager.connect(token, namespace)
  }

  const disconnect = (): void => {
    wsManager.disconnect()
    lastError.value = null
  }

  const reconnect = (token?: string): boolean => {
    lastError.value = null
    return wsManager.reconnect(token)
  }

  const clearError = (): void => {
    lastError.value = null
  }

  return {
    connectionState,
    lastError,
    socketId,
    isConnected,
    isConnecting,
    isReconnecting,
    hasError,
    init,
    connect,
    disconnect,
    reconnect,
    clearError,
  }
})
