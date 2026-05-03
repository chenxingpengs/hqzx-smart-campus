import type {
  ChatMessageData,
  SocketConnectionState,
  SocketError,
} from '@/types/websocket'
import { getEnvBaseUrl } from './index'

type MessageHandler = (data: unknown) => void

export interface WxSocketOptions {
  path?: string
  transports?: string[]
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
  reconnectionDelayMax?: number
  timeout?: number
  query?: Record<string, string>
  auth?: Record<string, unknown>
}

export interface WxSocket {
  id?: string
  connected: boolean
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler?: (...args: unknown[]) => void) => void
  emit: (event: string, ...args: unknown[]) => void
  disconnect: () => void
  connect: () => void
}

export class WxSocketIOClient implements WxSocket {
  id?: string
  connected = false

  private url: string
  private options: WxSocketOptions
  private namespace: string
  private socketTask: UniApp.SocketTask | null = null
  private eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map()
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private pingInterval: number = 25000
  private pingTimeout: number = 20000
  private lastPingTime: number = 0
  private heartbeatTimer: number | null = null

  constructor(url: string, options: WxSocketOptions = {}, namespace: string = '/') {
    this.url = url
    this.options = options
    this.namespace = namespace
    this.connect()
  }

  connect(): void {
    if (this.socketTask) {
      return
    }

    const baseParams: Record<string, string> = {
      EIO: '4',
      transport: 'websocket',
    }

    const allParams = { ...baseParams, ...this.options.query }
    const queryStr = Object.entries(allParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')

    const fullUrl = `${this.url}?${queryStr}`

    console.log('[WxSocketIO] 连接 URL:', fullUrl)

    this.socketTask = uni.connectSocket({
      url: fullUrl,
      success: () => {
        console.log('[WxSocketIO] WebSocket 连接已发起')
      },
      fail: (err) => {
        console.error('[WxSocketIO] WebSocket 连接失败:', err)
        this.trigger('connect_error', new Error(err.errMsg || '连接失败'))
        this.handleReconnect()
      },
    })

    this.setupSocketListeners()
  }

  private setupSocketListeners(): void {
    if (!this.socketTask)
      return

    this.socketTask.onOpen(() => {
      console.log('[WxSocketIO] WebSocket 已打开')
      this.connected = true
      this.reconnectAttempts = 0
    })

    this.socketTask.onMessage((res) => {
      this.handleMessage(res.data)
    })

    this.socketTask.onClose((res) => {
      console.log('[WxSocketIO] WebSocket 已关闭:', res.code, res.reason)
      this.connected = false
      this.id = undefined
      this.socketTask = null
      this.stopHeartbeatMonitor()
      this.trigger('disconnect', res.reason || '连接关闭')

      if (this.options.reconnection !== false) {
        this.handleReconnect()
      }
    })

    this.socketTask.onError((err) => {
      console.error('[WxSocketIO] WebSocket 错误:', err)
      this.trigger('connect_error', new Error('WebSocket 错误'))
    })
  }

  private handleMessage(data: string): void {
    try {
      if (typeof data !== 'string') {
        console.warn('[WxSocketIO] 收到非文本消息')
        return
      }

      // Engine.IO v4 协议解析
      // 格式: <packet type><data>
      // 0 = open, 1 = close, 2 = ping, 3 = pong, 4 = message, 6 = noop

      const packetType = Number.parseInt(data[0], 10)
      const payload = data.slice(1)

      switch (packetType) {
        case 0: // open
          this.handleOpen(payload)
          break
        case 2: // ping
          this.lastPingTime = Date.now()
          this.sendPong()
          break
        case 3: // pong
          break
        case 4: // message
          this.handleSocketIOMessage(payload)
          break
        case 6: // noop
          break
        default:
          console.log('[WxSocketIO] 未知包类型:', packetType)
      }
    }
    catch (e) {
      console.error('[WxSocketIO] 消息解析失败:', e)
    }
  }

  private handleOpen(payload: string): void {
    try {
      const data = JSON.parse(payload)
      this.id = data.sid
      this.pingInterval = data.pingInterval || 25000
      this.pingTimeout = data.pingTimeout || 20000

      console.log('[WxSocketIO] 会话已建立, sid:', this.id)
      console.log('[WxSocketIO] 心跳配置: pingInterval=', this.pingInterval, 'pingTimeout=', this.pingTimeout)

      // 发送 Socket.IO 连接消息（包含 namespace 和 auth 数据）
      if (this.namespace && this.namespace !== '/') {
        // 格式: 40/ns,{"token":"xxx"} - 命名空间连接需要传递认证数据
        const authData = this.options.auth || {}
        const authStr = Object.keys(authData).length > 0 ? JSON.stringify(authData) : ''
        this.sendRaw(`40${this.namespace},${authStr}`)
        console.log('[WxSocketIO] 发送命名空间连接消息:', `40${this.namespace},${authStr}`)
      }
      else {
        // 根命名空间连接
        const authData = this.options.auth || {}
        const authStr = Object.keys(authData).length > 0 ? JSON.stringify(authData) : ''
        this.sendRaw(`40${authStr}`)
        console.log('[WxSocketIO] 发送根命名空间连接消息:', `40${authStr}`)
      }

      // 启动心跳检测
      this.startHeartbeatMonitor()
    }
    catch (e) {
      console.error('[WxSocketIO] 解析 open 消息失败:', e)
    }
  }

  private handleSocketIOMessage(payload: string): void {
    // Socket.IO 消息格式: <engine io type>[<socket.io type>]<data>
    // 4 = message (Engine.IO)
    // 0 = connect, 1 = disconnect, 2 = event, 3 = ack, 4 = error, 5 = binary event, 6 = binary ack

    if (!payload)
      return

    const socketIOType = Number.parseInt(payload[0], 10)
    const eventData = payload.slice(1)

    switch (socketIOType) {
      case 0: // connect
        // 格式可能是: 0, 0{"sid":"xxx"}, 0/chat, 0/chat,{"sid":"xxx"}
        this.handleConnectAck(eventData)
        break
      case 1: // disconnect
        console.log('[WxSocketIO] Socket.IO 已断开')
        this.trigger('disconnect', 'server disconnect')
        break
      case 2: // event
        this.handleEvent(eventData)
        break
      case 4: // error
        this.trigger('error', new Error(eventData))
        break
      default:
        console.log('[WxSocketIO] 未知 Socket.IO 消息类型:', socketIOType, 'payload:', payload)
    }
  }

  private handleConnectAck(data: string): void {
    // 处理命名空间连接确认
    // 格式:
    // - 空字符串 (根命名空间连接成功)
    // - {"sid":"xxx"} (根命名空间连接成功，带会话信息)
    // - /chat (命名空间连接成功)
    // - /chat,{"sid":"xxx"} (命名空间连接成功，带会话信息)

    console.log('[WxSocketIO] 收到连接确认:', data)

    if (!data || data === '') {
      // 根命名空间连接成功
      console.log('[WxSocketIO] Socket.IO 根命名空间已连接')
      this.trigger('connect')
      return
    }

    // 检查是否是命名空间格式
    if (data.startsWith('/')) {
      // 命名空间连接确认
      const commaIndex = data.indexOf(',')
      if (commaIndex > 0) {
        // 格式: /chat,{"sid":"xxx"}
        const ns = data.substring(0, commaIndex)
        const jsonData = data.substring(commaIndex + 1)
        console.log('[WxSocketIO] Socket.IO 命名空间已连接:', ns)
        try {
          const parsed = JSON.parse(jsonData)
          console.log('[WxSocketIO] 命名空间连接数据:', parsed)
        }
        catch (e) {
          // 忽略解析错误
        }
      }
      else {
        // 格式: /chat
        console.log('[WxSocketIO] Socket.IO 命名空间已连接:', data)
      }
      this.trigger('connect')
      return
    }

    // 可能是JSON格式的会话信息
    try {
      const parsed = JSON.parse(data)
      console.log('[WxSocketIO] Socket.IO 连接数据:', parsed)
      this.trigger('connect')
    }
    catch (e) {
      // 如果不是JSON，也触发连接事件
      console.log('[WxSocketIO] Socket.IO 已连接')
      this.trigger('connect')
    }
  }

  private handleEvent(data: string): void {
    try {
      // 检查是否是命名空间前缀的格式
      // 格式可能是: /chat,["event",data] 或 ["event",data]
      let eventData = data
      if (data.startsWith('/')) {
        const commaIndex = data.indexOf(',')
        if (commaIndex > 0) {
          eventData = data.substring(commaIndex + 1)
        }
        else {
          console.warn('[WxSocketIO] 事件数据格式异常:', data)
          return
        }
      }

      const parsed = JSON.parse(eventData)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const eventName = parsed[0]
        const args = parsed.slice(1)
        console.log('[WxSocketIO] 触发事件:', eventName, '参数:', args)
        this.trigger(eventName, ...args)
      }
    }
    catch (e) {
      console.error('[WxSocketIO] 解析事件失败:', e, '原始数据:', data)
    }
  }

  private sendRaw(data: string): void {
    if (!this.socketTask || !this.connected) {
      console.warn('[WxSocketIO] 未连接，无法发送')
      return
    }

    this.socketTask.send({
      data,
      success: () => {},
      fail: (err) => {
        console.error('[WxSocketIO] 发送失败:', err)
      },
    })
  }

  private sendPong(): void {
    this.sendRaw('3')
  }

  private startHeartbeatMonitor(): void {
    this.stopHeartbeatMonitor()
    this.lastPingTime = Date.now()

    const tolerance = 1.5
    const effectiveTimeout = (this.pingInterval + this.pingTimeout) * tolerance

    this.heartbeatTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastPingTime

      if (elapsed > effectiveTimeout) {
        console.log('[WxSocketIO] 心跳超时，断开连接')
        this.disconnect()
      }
    }, 10000) as unknown as number
  }

  private stopHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private handleReconnect(): void {
    if (this.options.reconnection === false)
      return

    const maxAttempts = this.options.reconnectionAttempts || 5
    if (this.reconnectAttempts >= maxAttempts) {
      console.log('[WxSocketIO] 达到最大重连次数')
      this.trigger('reconnect_failed')
      return
    }

    this.reconnectAttempts++
    this.trigger('reconnect_attempt', this.reconnectAttempts)

    const delay = Math.min(
      this.options.reconnectionDelay || 1000,
      this.options.reconnectionDelayMax || 5000,
    ) * this.reconnectAttempts

    console.log(`[WxSocketIO] ${delay}ms 后进行第 ${this.reconnectAttempts} 次重连`)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay) as unknown as number
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event))
      return

    if (handler) {
      this.eventHandlers.get(event)!.delete(handler)
    }
    else {
      this.eventHandlers.delete(event)
    }
  }

  private trigger(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args)
        }
        catch (e) {
          console.error(`[WxSocketIO] 事件处理器错误 [${event}]:`, e)
        }
      })
    }
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.connected) {
      console.warn('[WxSocketIO] 未连接，无法发送事件')
      return
    }

    const data = JSON.stringify([event, ...args])
    this.sendRaw(`42${data}`) // 4 = Engine.IO message, 2 = Socket.IO event
  }

  disconnect(): void {
    this.stopHeartbeatMonitor()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.socketTask) {
      this.socketTask.close({
        code: 1000,
        reason: 'Client disconnect',
      })
      this.socketTask = null
    }

    this.connected = false
    this.id = undefined
  }
}

function wxIo(url: string, options?: WxSocketOptions, namespace?: string): WxSocket {
  return new WxSocketIOClient(url, options, namespace)
}

class WebSocketManager {
  private socket: WxSocket | null = null
  private connectionState: SocketConnectionState = 'disconnected'
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private currentToken: string = ''
  private currentNamespace: string = '/chat'
  private wasConnected: boolean = false

  connect(token?: string, namespace?: string): void {
    console.log('[WebSocket] connect() 被调用')
    console.log('[WebSocket] 当前状态 - connectionState:', this.connectionState, ', socket:', !!this.socket)

    if (!token) {
      console.warn('[WebSocket] 未登录，跳过连接')
      return
    }

    if (this.connectionState === 'connected') {
      console.log('[WebSocket] 已连接，跳过')
      if (token !== this.currentToken) {
        console.log('[WebSocket] Token 已更新，重新连接')
        this.disconnect()
      }
      else {
        return
      }
    }

    if (this.socket && this.connectionState !== 'connected') {
      console.log('[WebSocket] 存在断开的连接，先清理')
      this.socket = null
    }

    this.currentToken = token
    if (namespace) {
      this.currentNamespace = namespace
    }

    const baseUrl = getEnvBaseUrl()
    // 构造正确的 Socket.IO WebSocket URL
    // 格式: ws://host:port/socket.io/?EIO=4&transport=websocket&token=xxx
    const httpUrl = baseUrl.replace(/\/app$/, '') // 移除 /app 后缀
    const wsUrl = `${httpUrl
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:')}/socket.io/`

    console.log('[WebSocket] baseUrl:', baseUrl)
    console.log('[WebSocket] httpUrl:', httpUrl)
    console.log('[WebSocket] wsUrl:', wsUrl)
    console.log('[WebSocket] namespace:', this.currentNamespace)

    this.setConnectionState('connecting')

    this.socket = wxIo(wsUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 60000,
      query: {
        token,
      },
      auth: {
        token,
      },
    }, this.currentNamespace)

    this.socket.on('connect', () => {
      console.log('[WebSocket] Socket.IO 连接成功, socket id:', this.socket?.id)
      console.log('[WebSocket] 当前 EIO 版本：4（正确）')
      this.setConnectionState('connected')
      this.reconnectAttempts = 0

      if (this.wasConnected) {
        console.log('[WebSocket] 重连成功，触发 reconnected 事件')
        this.handleMessage('reconnected', { timestamp: Date.now() })
      }
      this.wasConnected = true
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] Socket.IO 断开连接:', reason)
      this.setConnectionState('disconnected')

      if (reason === 'io server disconnect') {
        console.log('[WebSocket] 服务器主动断开，需要手动重连')
      }
    })

    this.socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] Socket.IO 连接错误:', error)
      this.reconnectAttempts++
      this.setConnectionState('error')

      const socketError: SocketError = {
        type: this.classifyError(error),
        message: error.message,
        originalError: error,
      }
      this.handleMessage('error', socketError)

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] 已达到最大重连次数，停止自动重连')
        this.setConnectionState('error')
      }
    })

    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket] 重连失败，请检查网络连接')
      this.setConnectionState('error')
    })

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('[WebSocket] 正在尝试重连，第', attemptNumber, '次')
      this.setConnectionState('reconnecting')
    })

    this.socket.on('error', (error: Error) => {
      console.error('[WebSocket] Socket.IO 错误:', error)
      const socketError: SocketError = {
        type: 'unknown',
        message: error.message,
        originalError: error,
      }
      this.handleMessage('error', socketError)
    })

    this.socket.on('chat:message', (data: ChatMessageData) => {
      console.log('[WebSocket] 收到 chat:message:', data)
      this.handleMessage('chat:message', data)
    })

    this.socket.on('message', (data: unknown) => {
      console.log('[WebSocket] 收到 message:', data)
      this.handleMessage('message', data)
    })

    this.socket.on('connected', (data: { message?: string, device_id?: string, user_id?: number, joined_rooms?: number[] }) => {
      console.log('[WebSocket] 收到 connected 响应:', data)
      if (data.joined_rooms && data.joined_rooms.length > 0) {
        console.log('[WebSocket] 已加入房间:', data.joined_rooms)
      }
      this.handleMessage('connected', data)
    })

    this.socket.on('error', (data: { message?: string }) => {
      console.error('[WebSocket] 收到 error:', data)
      this.handleMessage('socket_error', data)
    })
  }

  private classifyError(error: Error): SocketError['type'] {
    const message = error.message.toLowerCase()
    if (message.includes('timeout')) {
      return 'timeout'
    }
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
      return 'auth'
    }
    if (message.includes('network') || message.includes('connection') || message.includes('econnrefused')) {
      return 'network'
    }
    return 'unknown'
  }

  private setConnectionState(state: SocketConnectionState): void {
    const oldState = this.connectionState
    this.connectionState = state
    if (oldState !== state) {
      console.log('[WebSocket] 连接状态变更:', oldState, '->', state)
      this.handleMessage('connection-state-change', state)
    }
  }

  disconnect(): void {
    console.log('[WebSocket] 主动断开连接')

    try {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
      }
    }
    catch (error) {
      console.error('[WebSocket] 断开连接时发生错误:', error)
      this.socket = null
    }

    this.setConnectionState('disconnected')
    this.currentToken = ''
  }

  reconnect(token?: string): boolean {
    console.log('[WebSocket] 手动触发重连')

    const reconnectToken = token || this.currentToken

    if (!reconnectToken) {
      console.warn('[WebSocket] 无法重连：缺少有效Token')
      return false
    }

    this.disconnect()
    this.reconnectAttempts = 0
    this.connect(reconnectToken)
    return true
  }

  ensureConnected(token: string): void {
    if (this.connectionState !== 'connected') {
      console.log('[WebSocket] 检测到未连接，尝试连接')
      this.connect(token)
    }
  }

  on(event: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, [])
    }
    this.messageHandlers.get(event)!.push(handler)
  }

  off(event: string, handler?: MessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      return
    }

    if (!handler) {
      this.messageHandlers.delete(event)
      return
    }

    const handlers = this.messageHandlers.get(event)!
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }

  private handleMessage(event: string, data: unknown): void {
    const handlers = this.messageHandlers.get(event) || []
    handlers.forEach((handler) => {
      try {
        handler(data)
      }
      catch (error) {
        console.error(`[WebSocket] 消息处理器执行失败 [${event}]:`, error)
      }
    })

    const allHandlers = this.messageHandlers.get('*') || []
    allHandlers.forEach((handler) => {
      try {
        handler({ event, data })
      }
      catch (error) {
        console.error('[WebSocket] 通用消息处理器执行失败:', error)
      }
    })
  }

  emit(event: string, data: unknown): boolean {
    if (this.connectionState !== 'connected' || !this.socket) {
      console.warn('[WebSocket] 未连接，无法发送消息')
      return false
    }

    this.socket.emit(event, data)
    return true
  }

  send(data: unknown): boolean {
    return this.emit('message', data)
  }

  getConnectionStatus(): boolean {
    return this.connectionState === 'connected'
  }

  getConnectionState(): SocketConnectionState {
    return this.connectionState
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }

  joinConversation(conversationId: number | string): boolean {
    if (this.connectionState !== 'connected' || !this.socket) {
      console.warn('[WebSocket] 未连接，无法加入会话')
      return false
    }

    console.log('[WebSocket] 发送 join_conversation 事件, conversation_id:', conversationId)
    this.socket.emit('join_conversation', { conversation_id: conversationId })
    return true
  }

  leaveConversation(conversationId: number | string): boolean {
    if (this.connectionState !== 'connected' || !this.socket) {
      console.warn('[WebSocket] 未连接，无法离开会话')
      return false
    }

    console.log('[WebSocket] 发送 leave_conversation 事件, conversation_id:', conversationId)
    this.socket.emit('leave_conversation', { conversation_id: conversationId })
    return true
  }
}

export const wsManager = new WebSocketManager()
