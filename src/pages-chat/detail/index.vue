<script setup lang="ts">
import type { ChatMessage, Participant, SearchResultClass, SearchResultUser } from '@/api/chat'
import type { ChatMessageData } from '@/types/websocket'
import { onHide, onLoad, onShow } from '@dcloudio/uni-app'
import { computed, nextTick, onUnmounted, ref } from 'vue'
import {
  addParticipants,

  getChatMessages,
  getConversationDetail,
  markAsRead,

  recallMessage,
  searchClasses,

  searchUsers,
  sendChatMessage,
} from '@/api/chat'
import { useChatCacheStore } from '@/store/chatCache'
import { useTokenStore } from '@/store/token'
import { useUnreadStore } from '@/store/unread'
import { useUserStore } from '@/store/user'
import { getStaticUrl } from '@/utils'
import { getCachedAvatar } from '@/utils/avatarCache'
import { getCachedImage } from '@/utils/imageCache'
import { getEnvBaseUrl } from '@/utils/index'
import { quickProfanityCheck } from '@/utils/profanity'
import { getMenuButtonRect, safeAreaInsets } from '@/utils/systemInfo'
import { wsManager } from '@/utils/websocket'

definePage({
  style: {
    navigationBarTitleText: '',
    navigationStyle: 'custom',
    backgroundColor: '#ededed',
    backgroundTextStyle: 'dark',
  },
})

const userStore = useUserStore()
const unreadStore = useUnreadStore()
const chatCacheStore = useChatCacheStore()
const tokenStore = useTokenStore()

const menuButtonRect = getMenuButtonRect()
const navRightPadding = menuButtonRect ? `${menuButtonRect.left + menuButtonRect.width + 10}px` : '24rpx'
const navHeight = (safeAreaInsets?.top || 0) + 88

const conversationId = ref('')
const conversationName = ref('')
const conversationType = ref<'private' | 'group' | 'broadcast'>('group')
const messages = ref<ChatMessage[]>([])
const inputContent = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const scrollTop = ref(0)
const scrollToView = ref('')
const showEmojiPicker = ref(false)
const showMorePanel = ref(false)
const showActionMenu = ref(false)
const selectedMessage = ref<ChatMessage | null>(null)
const sendingMessages = ref<Set<number>>(new Set())
const failedMessages = ref<Set<number>>(new Set())
const unreadCount = ref(0)
const replyToMessage = ref<ChatMessage | null>(null)

const emojis = ['[微笑]', '[大笑]', '[开心]', '[喜欢]', '[爱]', '[亲]', '[调皮]', '[思考]', '[酷]', '[赞]', '[踩]', '[心]', '[庆祝]', '[鼓掌]', '[感谢]']

const uploadingImages = ref<Set<number>>(new Set())

const cachedAvatars = ref<Record<string, string>>({})
const cachedImages = ref<Record<string, string>>({})
const loadingAvatars = ref<Set<string>>(new Set())
const loadingImages = ref<Set<string>>(new Set())

async function loadCachedAvatar(avatarUrl: string): Promise<string> {
  if (!avatarUrl)
    return ''
  if (cachedAvatars.value[avatarUrl]) {
    return cachedAvatars.value[avatarUrl]
  }
  if (loadingAvatars.value.has(avatarUrl)) {
    return getStaticUrl(avatarUrl)
  }
  loadingAvatars.value.add(avatarUrl)
  const fullUrl = getStaticUrl(avatarUrl)
  if (!fullUrl) {
    loadingAvatars.value.delete(avatarUrl)
    return ''
  }
  try {
    const cached = await getCachedAvatar(fullUrl)
    cachedAvatars.value[avatarUrl] = cached
    return cached
  }
  finally {
    loadingAvatars.value.delete(avatarUrl)
  }
}

async function loadCachedImage(imageUrl: string): Promise<string> {
  if (!imageUrl)
    return ''
  if (cachedImages.value[imageUrl]) {
    return cachedImages.value[imageUrl]
  }
  if (loadingImages.value.has(imageUrl)) {
    return imageUrl
  }
  loadingImages.value.add(imageUrl)
  try {
    const cached = await getCachedImage(imageUrl)
    cachedImages.value[imageUrl] = cached
    return cached
  }
  finally {
    loadingImages.value.delete(imageUrl)
  }
}

function getCachedAvatarUrl(avatarUrl: string): string {
  if (!avatarUrl)
    return ''
  return cachedAvatars.value[avatarUrl] || getStaticUrl(avatarUrl)
}

function getCachedImageUrl(imageUrl: string): string {
  if (!imageUrl)
    return ''
  return cachedImages.value[imageUrl] || imageUrl
}

function getUploadBaseUrl() {
  return `${getEnvBaseUrl()}/app/upload`
}

const MAX_IMAGE_SIZE = 500 * 1024

function compressImage(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    uni.compressImage({
      src: filePath,
      quality: 80,
      success: (res) => {
        console.log('[聊天详情] 图片压缩成功:', res.tempFilePath)
        resolve(res.tempFilePath)
      },
      fail: (err) => {
        console.warn('[聊天详情] 图片压缩失败，使用原图:', err)
        resolve(filePath)
      },
    })
  })
}

function getFileInfo(filePath: string): Promise<{ size: number }> {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().getFileInfo({
      filePath,
      success: (res) => {
        resolve({ size: res.size })
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

const canManageMembers = computed(() => {
  const role = userStore.userInfo?.role
  return role === 'admin' || role === 'teacher'
})

const isGroupChat = computed(() => conversationType.value === 'group' || conversationType.value === 'broadcast')

const lastMessageId = computed(() => {
  if (messages.value.length > 0) {
    return messages.value[messages.value.length - 1].id
  }
  return undefined
})

function handleNewMessage(data: ChatMessageData) {
  if (data.sender_id && data.sender_id === userStore.userInfo?.userId) {
    console.log('[聊天详情] 过滤自己发送的消息:', data.id)
    return
  }

  if (data.conversation_id === conversationId.value) {
    const exists = messages.value.some(msg => msg.id === data.id)
    if (!exists) {
      const parsedData = parseMessageExtraData(data)
      messages.value.push(parsedData)
      chatCacheStore.addMessage(conversationId.value, parsedData)
      chatCacheStore.updateConversationLastMessage(
        conversationId.value,
        parsedData.content,
        parsedData.sent_at,
      )
      scrollToBottom()
      markMessagesAsRead()
    }
  }
}

function parseMessageExtraData(msg: ChatMessageData): ChatMessage {
  if (!msg)
    return msg

  const parsedMsg = { ...msg }

  if (typeof parsedMsg.extra_data === 'string') {
    try {
      parsedMsg.extra_data = JSON.parse(parsedMsg.extra_data)
    }
    catch (e) {
      console.warn('[聊天详情] 解析 extra_data 失败:', e)
      parsedMsg.extra_data = {}
    }
  }

  return parsedMsg
}

onLoad((options) => {
  conversationId.value = options.id as string
  if (options.name) {
    conversationName.value = decodeURIComponent(options.name as string)
  }
  if (options.type) {
    conversationType.value = options.type as 'private' | 'group' | 'broadcast'
  }
  if (options.unread) {
    unreadCount.value = Number.parseInt(options.unread as string) || 0
  }
  loadMessages()

  if (isGroupChat.value) {
    loadConversationDetail()
  }

  const token = tokenStore.tokenInfo.accessToken
  if (token) {
    wsManager.ensureConnected(token)
  }

  wsManager.on('chat:message', handleNewMessage)
})

onShow(() => {
  if (conversationId.value && lastMessageId.value) {
    markMessagesAsRead()
  }
})

onHide(() => {
  if (conversationId.value && lastMessageId.value) {
    markMessagesAsRead()
  }
})

onUnmounted(() => {
  wsManager.off('chat:message', handleNewMessage)
})

async function loadMessages(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = chatCacheStore.getMessages(conversationId.value)
    if (cached) {
      messages.value = cached
      hasMore.value = chatCacheStore.getHasMore(conversationId.value)
      scrollToBottom()
      preloadMessageImages(cached)
      console.log('[聊天详情] 使用缓存消息, 数量:', cached.length, 'hasMore:', hasMore.value)
    }
  }

  loading.value = true
  try {
    console.log('[聊天详情] 加载消息, conversationId:', conversationId.value, 'forceRefresh:', forceRefresh)
    const res = await getChatMessages(conversationId.value)
    console.log('[聊天详情] 消息响应:', res)
    if (res && res.list) {
      messages.value = res.list.reverse().map(msg => parseMessageExtraData(msg))
      hasMore.value = res.has_more ?? true
      chatCacheStore.setMessages(conversationId.value, messages.value, hasMore.value)
      scrollToBottom()
      preloadMessageImages(messages.value)
      if (lastMessageId.value) {
        markMessagesAsRead()
      }
    }
  }
  catch (error) {
    console.error('[聊天详情] 加载消息失败', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function preloadMessageImages(msgs: ChatMessage[]) {
  const avatarUrls = new Set<string>()
  const imageUrls = new Set<string>()

  msgs.forEach((msg) => {
    if (msg.sender_avatar && !cachedAvatars.value[msg.sender_avatar]) {
      avatarUrls.add(msg.sender_avatar)
    }
    if (msg.type === 'image') {
      const url = getFullUrl(msg.content || msg.extra_data?.url)
      if (url && !cachedImages.value[url]) {
        imageUrls.add(url)
      }
    }
    if (msg.type === 'video' && msg.extra_data?.thumbnail && !cachedImages.value[msg.extra_data.thumbnail]) {
      imageUrls.add(msg.extra_data.thumbnail)
    }
  })

  if (userStore.userInfo?.avatar && !cachedAvatars.value[userStore.userInfo.avatar]) {
    avatarUrls.add(userStore.userInfo.avatar)
  }

  avatarUrls.forEach(url => loadCachedAvatar(url))
  imageUrls.forEach(url => loadCachedImage(url))
}

async function onRefresh() {
  refreshing.value = true
  chatCacheStore.clearMessagesCache(conversationId.value)
  await loadMessages(true)
  refreshing.value = false
}

async function loadMoreMessages() {
  if (loadingMore.value || !hasMore.value || messages.value.length === 0)
    return

  loadingMore.value = true
  const firstMessageId = messages.value[0].id

  try {
    const res = await getChatMessages(conversationId.value, {
      before_id: firstMessageId,
      size: 20,
    })

    if (res && res.list && res.list.length > 0) {
      const oldHeight = await getScrollHeight()
      const olderMessages = res.list.reverse().map(msg => parseMessageExtraData(msg))
      messages.value = [...olderMessages, ...messages.value]
      hasMore.value = res.has_more ?? false

      chatCacheStore.prependMessages(conversationId.value, olderMessages)

      nextTick(async () => {
        const newHeight = await getScrollHeight()
        scrollTop.value = newHeight - oldHeight
      })
    }
    else {
      hasMore.value = false
    }
  }
  catch (error) {
    console.error('[聊天详情] 加载更多消息失败', error)
  }
  finally {
    loadingMore.value = false
  }
}

function getScrollHeight() {
  return new Promise<number>((resolve) => {
    const query = uni.createSelectorQuery()
    query.select('.message-area').scrollOffset()
    query.exec((res) => {
      resolve(res[0]?.scrollHeight || 0)
    })
  }) as any
}

async function markMessagesAsRead() {
  try {
    await markAsRead(conversationId.value, lastMessageId.value)
    console.log('[聊天详情] 标记已读成功')
    if (unreadCount.value > 0) {
      unreadStore.markAllConversationRead(conversationId.value)
      chatCacheStore.updateConversationUnreadCount(conversationId.value, 0)
      unreadCount.value = 0
    }
  }
  catch (error) {
    console.error('[聊天详情] 标记已读失败', error)
  }
}

async function handleSend() {
  if (!inputContent.value.trim())
    return

  let content = inputContent.value.trim()

  try {
    const checkResult = await quickProfanityCheck(content)

    if (checkResult.isForbidden) {
      content = checkResult.maskedText || content

      uni.showToast({
        title: `已屏蔽 ${checkResult.forbiddenWords.length} 个敏感词`,
        icon: 'none',
        duration: 2000,
      })

      console.log('[聊天详情] 违禁词已自动替换:', checkResult)
    }

    if (checkResult.error) {
      console.warn('[聊天详情] 违禁词检测失败，但仍允许发送:', checkResult.error)
    }
  }
  catch (error) {
    console.warn('[聊天详情] 违禁词检测异常，仍允许发送:', error)
  }

  inputContent.value = ''
  mentions.value = []

  const replyToId = replyToMessage.value?.id
  const tempReplyTo = replyToMessage.value
  replyToMessage.value = null

  const tempId = Date.now()
  const tempMessage: ChatMessage = {
    id: tempId,
    conversation_id: conversationId.value,
    sender_id: userStore.userInfo?.userId,
    sender_name: userStore.userInfo?.username || '我',
    sender_avatar: userStore.userInfo?.avatar,
    content,
    type: 'text',
    sent_at: new Date().toISOString(),
    is_mine: true,
    reply_to_id: replyToId,
    extra_data: {
      replyTo: tempReplyTo
        ? {
            id: tempReplyTo.id,
            content: tempReplyTo.content,
            sender_name: tempReplyTo.sender_name,
            type: tempReplyTo.type,
          }
        : undefined,
    },
  }

  messages.value.push(tempMessage)
  sendingMessages.value.add(tempId)
  scrollToBottom()

  chatCacheStore.addMessage(conversationId.value, tempMessage)
  chatCacheStore.updateConversationLastMessage(
    conversationId.value,
    content,
    tempMessage.sent_at,
  )

  sendChatMessage(conversationId.value, {
    content,
    type: 'text',
    reply_to_id: replyToId,
    extra_data: {
      mentions: mentions.value.length > 0 ? mentions.value : undefined,
      replyTo: tempReplyTo
        ? {
            id: tempReplyTo.id,
            content: tempReplyTo.content,
            sender_name: tempReplyTo.sender_name,
          }
        : undefined,
    },
  }).then((res) => {
    const index = messages.value.findIndex(msg => msg.id === tempId)
    if (index > -1 && res && res.id) {
      const parsedRes = parseMessageExtraData(res)
      const messageWithMine = {
        ...parsedRes,
        is_mine: true,
      }
      messages.value[index] = messageWithMine
      chatCacheStore.updateMessage(conversationId.value, tempId, messageWithMine)
    }
    sendingMessages.value.delete(tempId)
  }).catch((error) => {
    console.error('[聊天详情] 发送消息失败', error)
    failedMessages.value.add(tempId)
    sendingMessages.value.delete(tempId)
    uni.showToast({ title: '发送失败，请重试', icon: 'none' })
  })
}

function handleChooseImage() {
  showMorePanel.value = false

  uni.chooseImage({
    count: 9,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      console.log('[聊天详情] 选择图片成功:', res.tempFilePaths.length, '张')
      res.tempFilePaths.forEach((tempPath, index) => {
        uploadAndSendImage(tempPath, index === res.tempFilePaths.length - 1)
      })
    },
    fail: (err) => {
      console.error('[聊天详情] 选择图片失败:', err)
      if (err.errMsg?.includes('cancel'))
        return
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    },
  })
}

function handleChooseFile() {
  showMorePanel.value = false

  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    success: (res) => {
      console.log('[聊天详情] 选择文件成功:', res.tempFiles[0])
      const file = res.tempFiles[0]

      if (file.size > 10 * 1024 * 1024) {
        uni.showModal({
          title: '提示',
          content: '对不起，因服务器性能限制不支持上传10MB以上文件，详情请联系管理员',
          showCancel: false,
          confirmText: '我知道了',
        })
        return
      }

      uploadAndSendFile(file)
    },
    fail: (err) => {
      console.error('[聊天详情] 选择文件失败:', err)
      if (err.errMsg?.includes('cancel'))
        return
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    },
  })
}

function uploadAndSendFile(file: { name: string, size: number, path?: string, tempFilePath?: string }) {
  const tempId = Date.now() + Math.random()
  const filePath = file.path || file.tempFilePath || ''
  const fileName = file.name || '未知文件'
  const fileSize = formatFileSize(file.size)

  const tempMessage: ChatMessage = {
    id: tempId,
    conversation_id: conversationId.value,
    sender_id: userStore.userInfo?.userId,
    sender_name: userStore.userInfo?.username || '我',
    sender_avatar: userStore.userInfo?.avatar,
    content: fileName,
    type: 'file',
    sent_at: new Date().toISOString(),
    is_mine: true,
    extra_data: {
      fileName,
      fileSize,
      isUploading: true,
      localPath: filePath,
    },
  }

  messages.value.push(tempMessage)
  sendingMessages.value.add(tempId)
  scrollToBottom()

  uni.uploadFile({
    url: getUploadBaseUrl(),
    filePath,
    name: 'file',
    formData: { type: 'chat', originalName: fileName },
    header: {
      Authorization: `Bearer ${tokenStore.tokenInfo.accessToken}`,
    },
    success: (uploadRes) => {
      try {
        const responseData = JSON.parse(uploadRes.data)
        if (responseData.code !== 200 && responseData.code !== 0) {
          throw new Error(responseData.msg || '上传失败')
        }
        const fileUrl = responseData.data || responseData.url || responseData

        const index = messages.value.findIndex(msg => msg.id === tempId)
        if (index > -1) {
          messages.value[index].extra_data = {
            ...messages.value[index].extra_data,
            isUploading: false,
            url: fileUrl,
          }
          messages.value[index].content = fileUrl

          sendChatMessage(conversationId.value, {
            content: fileUrl,
            type: 'file',
            extra_data: {
              url: fileUrl,
              fileName,
              fileSize,
            },
          }).then((res) => {
            if (index > -1 && res && res.id) {
              const messageWithMine = {
                ...res,
                is_mine: true,
              }
              messages.value[index] = messageWithMine
              chatCacheStore.updateMessage(conversationId.value, tempId, messageWithMine)
              chatCacheStore.updateConversationLastMessage(
                conversationId.value,
                `[文件] ${fileName}`,
                messageWithMine.sent_at,
              )
            }
            sendingMessages.value.delete(tempId)
          }).catch((error) => {
            console.error('[聊天详情] 发送文件消息失败:', error)
            failedMessages.value.add(tempId)
            sendingMessages.value.delete(tempId)
            uni.showToast({ title: '发送失败，请重试', icon: 'none' })
          })
        }
      }
      catch (err) {
        console.error('[聊天详情] 解析文件上传响应失败:', err)
        failedMessages.value.add(tempId)
        sendingMessages.value.delete(tempId)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    fail: (err) => {
      console.error('[聊天详情] 上传文件失败:', err)
      failedMessages.value.add(tempId)
      sendingMessages.value.delete(tempId)
      uni.showToast({ title: '上传失败，请重试', icon: 'none' })
    },
  })
}

function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

function getFileIcon(fileName?: string): string {
  if (!fileName)
    return 'file-unknown'
  const ext = fileName.split('.').pop()?.toLowerCase()

  const iconMap: Record<string, string> = {
    pdf: 'file-pdf',
    doc: 'file-word',
    docx: 'file-word',
    xls: 'file-excel',
    xlsx: 'file-excel',
    ppt: 'file-ppt',
    pptx: 'file-ppt',
    txt: 'file-text',
    zip: 'file-zip',
    rar: 'file-zip',
    jpg: 'file-image',
    jpeg: 'file-image',
    png: 'file-image',
    gif: 'file-image',
    mp4: 'file-video',
    mp3: 'file-audio',
  }

  return iconMap[ext || ''] || 'file-unknown'
}

function openFile(msg: ChatMessage) {
  const url = getFullUrl(msg.content || msg.extra_data?.url)
  const fileName = msg.extra_data?.fileName || '文件'

  if (!url) {
    uni.showToast({ title: '文件不存在', icon: 'none' })
    return
  }

  uni.showLoading({ title: '打开中...' })

  uni.downloadFile({
    url,
    success: (downloadRes) => {
      if (downloadRes.statusCode === 200) {
        uni.openDocument({
          filePath: downloadRes.tempFilePath,
          showMenu: true,
          success: () => {
            uni.hideLoading()
          },
          fail: (err) => {
            uni.hideLoading()
            console.error('[聊天详情] 打开文件失败:', err)
            uni.showToast({ title: '无法打开此文件', icon: 'none' })
          },
        })
      }
      else {
        uni.hideLoading()
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
    },
    fail: (err) => {
      uni.hideLoading()
      console.error('[聊天详情] 下载文件失败:', err)
      uni.showToast({ title: '下载失败', icon: 'none' })
    },
  })
}

async function uploadAndSendImage(tempPath: string, isLast: boolean = true) {
  const tempId = Date.now() + Math.random()
  let uploadPath = tempPath

  try {
    const fileInfo = await getFileInfo(tempPath)

    if (fileInfo.size > 10 * 1024 * 1024) {
      uni.showModal({
        title: '提示',
        content: '对不起，因服务器性能限制不支持上传10MB以上文件，详情请联系管理员',
        showCancel: false,
        confirmText: '我知道了',
      })
      return
    }

    if (fileInfo.size > MAX_IMAGE_SIZE) {
      console.log('[聊天详情] 图片过大，进行压缩:', fileInfo.size)
      uploadPath = await compressImage(tempPath)
    }
  }
  catch (err) {
    console.warn('[聊天详情] 获取文件信息失败，直接上传:', err)
  }

  const tempMessage: ChatMessage = {
    id: tempId,
    conversation_id: conversationId.value,
    sender_id: userStore.userInfo?.userId,
    sender_name: userStore.userInfo?.username || '我',
    sender_avatar: userStore.userInfo?.avatar,
    content: tempPath,
    type: 'image',
    sent_at: new Date().toISOString(),
    is_mine: true,
    extra_data: { isUploading: true, localPath: tempPath },
  }

  messages.value.push(tempMessage)
  uploadingImages.value.add(tempId)
  scrollToBottom()

  uni.uploadFile({
    url: getUploadBaseUrl(),
    filePath: uploadPath,
    name: 'file',
    formData: { type: 'chat' },
    header: {
      Authorization: `Bearer ${tokenStore.tokenInfo.accessToken}`,
    },
    success: (uploadRes) => {
      try {
        const responseData = JSON.parse(uploadRes.data)
        if (responseData.code !== 200 && responseData.code !== 0) {
          throw new Error(responseData.msg || '上传失败')
        }
        const imageUrl = responseData.data || responseData.url || responseData

        const index = messages.value.findIndex(msg => msg.id === tempId)
        if (index > -1) {
          messages.value[index].content = imageUrl
          messages.value[index].extra_data = {
            ...messages.value[index].extra_data,
            isUploading: false,
            url: imageUrl,
          }

          sendChatMessage(conversationId.value, {
            content: imageUrl,
            type: 'image',
            extra_data: { url: imageUrl },
          }).then((res) => {
            if (index > -1 && res && res.id) {
              const messageWithMine = {
                ...res,
                is_mine: true,
              }
              messages.value[index] = messageWithMine
              chatCacheStore.updateMessage(conversationId.value, tempId, messageWithMine)
              chatCacheStore.updateConversationLastMessage(
                conversationId.value,
                '[图片]',
                messageWithMine.sent_at,
              )
            }
            uploadingImages.value.delete(tempId)
          }).catch((error) => {
            console.error('[聊天详情] 发送图片消息失败:', error)
            failedMessages.value.add(tempId)
            uploadingImages.value.delete(tempId)
            uni.showToast({ title: '发送失败，请重试', icon: 'none' })
          })
        }
      }
      catch (err) {
        console.error('[聊天详情] 解析上传响应失败:', err)
        failedMessages.value.add(tempId)
        uploadingImages.value.delete(tempId)
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
    fail: (err) => {
      console.error('[聊天详情] 上传图片失败:', err)
      failedMessages.value.add(tempId)
      uploadingImages.value.delete(tempId)
      uni.showToast({ title: '上传失败，请重试', icon: 'none' })
    },
  })
}

function scrollToBottom() {
  nextTick(() => {
    if (messages.value.length > 0) {
      const lastMsg = messages.value[messages.value.length - 1]
      scrollToView.value = `msg-${lastMsg.id}`
    }
  })
}

function formatTime(time: string) {
  if (!time)
    return ''
  const date = new Date(time)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function formatDate(time: string) {
  if (!time)
    return ''
  const date = new Date(time)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  if (messageDate.getTime() === today.getTime()) {
    return '今天'
  }
  else if (messageDate.getTime() === yesterday.getTime()) {
    return '昨天'
  }
  else if (date.getFullYear() === now.getFullYear()) {
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / 86400000)
    if (diffDays < 7) {
      return weekDays[date.getDay()]
    }
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  else {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
}

function shouldShowDate(index: number) {
  if (index === 0)
    return true

  const currentMsg = messages.value[index]
  const prevMsg = messages.value[index - 1]

  if (!currentMsg.sent_at || !prevMsg.sent_at)
    return false

  const currentDate = new Date(currentMsg.sent_at).setHours(0, 0, 0, 0)
  const prevDate = new Date(prevMsg.sent_at).setHours(0, 0, 0, 0)

  return currentDate !== prevDate
}

function insertEmoji(emoji: string) {
  inputContent.value += emoji
}

function handleLongPress(msg: ChatMessage) {
  if (msg.type === 'system')
    return

  selectedMessage.value = msg
  showActionMenu.value = true
}

function copyMessage() {
  if (selectedMessage.value) {
    uni.setClipboardData({
      data: selectedMessage.value.content,
      success: () => {
        uni.showToast({ title: '已复制', icon: 'success' })
        showActionMenu.value = false
      },
    })
  }
}

function deleteMessage() {
  if (selectedMessage.value) {
    const index = messages.value.findIndex(msg => msg.id === selectedMessage.value!.id)
    if (index > -1) {
      messages.value.splice(index, 1)
      uni.showToast({ title: '已删除', icon: 'success' })
    }
    showActionMenu.value = false
  }
}

function replyToMsg() {
  if (selectedMessage.value && selectedMessage.value.type !== 'system') {
    replyToMessage.value = selectedMessage.value
    showActionMenu.value = false
  }
}

function canRecall(msg: ChatMessage): boolean {
  if (!msg.is_mine)
    return false
  const sentTime = new Date(msg.sent_at).getTime()
  const now = Date.now()
  const diffMinutes = (now - sentTime) / 1000 / 60
  return diffMinutes <= 2
}

function handleRecall() {
  if (!selectedMessage.value)
    return

  uni.showModal({
    title: '确认撤回',
    content: '确定要撤回这条消息吗？撤回后对方将无法查看',
    confirmColor: '#F44336',
    success: async (res) => {
      if (res.confirm) {
        try {
          await recallMessage(conversationId.value, selectedMessage.value.id)

          const index = messages.value.findIndex(msg => msg.id === selectedMessage.value!.id)
          if (index > -1) {
            messages.value[index].content = ' 消息已撤回'
            messages.value[index].type = 'system'
            messages.value[index].extra_data = { ...messages.value[index].extra_data, isRecalled: true }
          }

          uni.showToast({ title: '已撤回', icon: 'success' })
        }
        catch (error) {
          console.error('[聊天详情] 撤回失败:', error)
          uni.showToast({ title: '撤回失败', icon: 'none' })
        }
      }
    },
  })

  showActionMenu.value = false
}

function cancelReply() {
  replyToMessage.value = null
}

function getFullUrl(url: string | undefined): string {
  if (!url)
    return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  if (url.startsWith('/uploads')) {
    const fullUrl = `${getEnvBaseUrl()}${url}`
    return fullUrl
  }
  if (url.startsWith('wxfile://') || url.startsWith('http://tmp/') || url.startsWith('https://tmp/')) {
    return url
  }
  const fullUrl = `${getEnvBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`
  return fullUrl
}

function getReplyPreviewText(msg: ChatMessage): string {
  if (!msg)
    return ''

  switch (msg.type) {
    case 'image':
      return '[图片]'
    case 'file':
      return `[文件] ${msg.extra_data?.fileName || ''}`
    case 'video':
      return '[视频]'
    default:
      const text = msg.content || ''
      return text.length > 50 ? `${text.slice(0, 50)}...` : text
  }
}

function getQuotePreviewText(replyTo: { content?: string, type?: string, extra_data?: any }): string {
  if (!replyTo)
    return ''

  switch (replyTo.type) {
    case 'image':
      return '[图片]'
    case 'file':
      return `[文件] ${replyTo.extra_data?.fileName || ''}`
    case 'video':
      return '[视频]'
    default:
      const text = replyTo.content || ''
      return text.length > 50 ? `${text.slice(0, 50)}...` : text
  }
}

function scrollToReplyMessage(replyId: number) {
  const targetMsg = messages.value.find(msg => msg.id === replyId)
  if (targetMsg) {
    scrollToView.value = `msg-${replyId}`
  }
  else {
    uni.showToast({ title: '原消息已删除', icon: 'none' })
  }
}

function onImageError(msg: ChatMessage, event: any) {
  console.error('[聊天详情] 图片加载失败:', {
    msgId: msg.id,
    msgType: msg.type,
    content: msg.content,
    extra_data_url: msg.extra_data?.url,
    localPath: msg.extra_data?.localPath,
    fullUrl: getFullUrl(msg.content || msg.extra_data?.url),
    event,
  })
}

function onImageLoad(msg: ChatMessage, event: any) {
  console.log('[聊天详情] 图片加载成功:', {
    msgId: msg.id,
    msgType: msg.type,
    fullUrl: getFullUrl(msg.content || msg.extra_data?.url),
  })
}

function previewImage(currentUrl: string) {
  const imageMessages = messages.value.filter(msg => msg.type === 'image')
  const urls = imageMessages.map(msg => getFullUrl(msg.content || msg.extra_data?.url) || msg.extra_data?.localPath).filter(Boolean)

  uni.previewImage({
    current: currentUrl,
    urls,
    longPressActions: {
      itemList: ['保存到相册'],
      success: (res) => {
        if (res.tapIndex === 0) {
          saveImageToAlbum(currentUrl)
        }
      },
    },
  })
}

function saveImageToAlbum(url: string) {
  uni.saveImageToPhotosAlbum({
    filePath: url,
    success: () => {
      uni.showToast({ title: '保存成功', icon: 'success' })
    },
    fail: (err) => {
      console.error('[聊天详情] 保存图片失败:', err)
      if (err.errMsg?.includes('auth deny')) {
        uni.showModal({
          title: '提示',
          content: '需要您授权保存相册权限',
          confirmText: '去设置',
          success: (modalRes) => {
            if (modalRes.confirm) {
              uni.openSetting()
            }
          },
        })
      }
      else {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    },
  })
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
  showMorePanel.value = false
}

function toggleMorePanel() {
  showMorePanel.value = !showMorePanel.value
  showEmojiPicker.value = false
}

function handleInputFocus() {
  showEmojiPicker.value = false
  showMorePanel.value = false
}

function requestSubscribeMessage() {
  // #ifdef MP-WEIXIN
  console.log('[聊天详情-订阅] 开始请求订阅授权...')

  const tmplIds = ['PuThjmXbKecLwWFYoRc43Ptu0J4HeZOq7EELzjRdrKs']
  const templateCategoryIds: string[] = []

  wx.requestSubscribeMessage({
    tmplIds,
    async success(res: any) {
      console.log('[聊天详情-订阅] 授权结果:', JSON.stringify(res))

      tmplIds.forEach((tmplId) => {
        if (res[tmplId] === 'accept') {
          console.log(`[聊天详情-订阅] ✅ 模板 ${tmplId} 用户同意订阅`)

          for (let i = 0; i < 15; i++) {
            templateCategoryIds.push(tmplId)
          }

          console.log(`[聊天详情-订阅] 📝 已累积 ${templateCategoryIds.length} 次订阅机会`)
        }
        else if (res[tmplId] === 'reject') {
          console.log(`[聊天详情-订阅] ❌ 模板 ${tmplId} 用户拒绝订阅`)
        }
      })
    },
    fail(err: any) {
      console.warn('[聊天详情-订阅] ❌ 调用失败:', err.errMsg)
    },
  })
  // #endif
}

function handleInputChange(e: any) {
  const value = e.detail.value || ''
  const lastChar = value.slice(-1)

  if (lastChar === '@' && isGroupChat.value) {
    showAtPanel.value = true
    atSearchKeyword.value = ''
  }
  else if (showAtPanel.value) {
    if (value.endsWith('@')) {
      atSearchKeyword.value = ''
    }
    else {
      const atIndex = value.lastIndexOf('@')
      if (atIndex >= 0) {
        atSearchKeyword.value = value.slice(atIndex + 1)
      }
      else {
        showAtPanel.value = false
      }
    }
  }
}

function selectAtMember(member: Participant) {
  if (!member.user_id) {
    console.warn('[聊天详情] 选择@成员失败：该成员没有user_id', member)
    return
  }

  const newMention = { id: member.user_id, name: member.name || '未知用户' }

  const exists = mentions.value.some(m => m.id === newMention.id)
  if (!exists) {
    mentions.value.push(newMention)
  }

  inputContent.value += `${newMention.name} `
  showAtPanel.value = false
  atSearchKeyword.value = ''
}

function closeAtPanel() {
  showAtPanel.value = false
  atSearchKeyword.value = ''
}

function removeMention(index: number) {
  mentions.value.splice(index, 1)
}

function parseContentWithMentions(content: string, msgMentions?: { id: number, name: string }[]) {
  if (!msgMentions || msgMentions.length === 0)
    return [{ text: content, isMention: false }]

  const parts: { text: string, isMention: boolean, mentionName?: string }[] = []
  let remaining = content

  for (const mention of msgMentions) {
    const mentionText = `@${mention.name}`
    const index = remaining.indexOf(mentionText)
    if (index >= 0) {
      if (index > 0) {
        parts.push({ text: remaining.slice(0, index), isMention: false })
      }
      parts.push({ text: mentionText, isMention: true, mentionName: mention.name })
      remaining = remaining.slice(index + mentionText.length)
    }
  }

  if (remaining) {
    parts.push({ text: remaining, isMention: false })
  }

  return parts.length > 0 ? parts : [{ text: content, isMention: false }]
}

function isMentionedMe(msg: ChatMessage) {
  if (!msg.extra_data?.mentions)
    return false
  const myId = userStore.userInfo?.userId
  return msg.extra_data.mentions.some((m: { id: number }) => m.id === myId)
}

function goBack() {
  uni.navigateBack()
}

const showMemberList = ref(false)
const participants = ref<Participant[]>([])
const showAddMemberPopup = ref(false)

const showAtPanel = ref(false)
const atSearchKeyword = ref('')
const mentions = ref<{ id: number, name: string }[]>([])

const filteredMembers = computed(() => {
  const currentUserId = userStore.userInfo?.userId

  if (!atSearchKeyword.value.trim()) {
    return participants.value.filter(p => p.user_id && p.user_id !== currentUserId)
  }
  const keyword = atSearchKeyword.value.toLowerCase()
  return participants.value.filter(p =>
    p.user_id
    && p.user_id !== currentUserId
    && (p.name || '').toLowerCase().includes(keyword),
  )
})

const searchKeyword = ref('')
const activeTab = ref<'user' | 'class'>('user')
const searchResults = ref<(SearchResultUser | SearchResultClass)[]>([])
const selectedUsers = ref<number[]>([])
const selectedClasses = ref<number[]>([])
const searching = ref(false)

async function openMemberList() {
  showMemberList.value = true
  loadConversationDetail()
}

function goToChatInfo() {
  const url = `/pages-chat/info/index?id=${conversationId.value}&name=${encodeURIComponent(conversationName.value)}&type=${conversationType.value}`
  uni.navigateTo({ url })
}

async function loadConversationDetail() {
  try {
    const res = await getConversationDetail(conversationId.value)
    if (res) {
      participants.value = res.participants || []
      if (!conversationName.value && res.name) {
        conversationName.value = res.name
      }
      if (res.type) {
        conversationType.value = res.type
      }
    }
  }
  catch (error) {
    console.error('[聊天详情] 获取会话详情失败', error)
  }
}

function openAddMemberPopup() {
  showAddMemberPopup.value = true
  searchKeyword.value = ''
  selectedUsers.value = []
  selectedClasses.value = []
  searchResults.value = []
  activeTab.value = 'user'
}

async function handleSearch() {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  searching.value = true
  try {
    if (activeTab.value === 'user') {
      const res = await searchUsers({ keyword: searchKeyword.value, size: 20 })
      searchResults.value = res?.list || []
    }
    else {
      const res = await searchClasses({ keyword: searchKeyword.value, size: 20 })
      searchResults.value = res?.list || []
    }
  }
  catch (error) {
    console.error('搜索失败:', error)
    uni.showToast({ title: '搜索失败', icon: 'none' })
  }
  finally {
    searching.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 500)
}

function switchTab(tab: 'user' | 'class') {
  activeTab.value = tab
  searchResults.value = []
  if (searchKeyword.value.trim()) {
    handleSearch()
  }
}

function toggleUserSelection(userId: number) {
  const index = selectedUsers.value.indexOf(userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  }
  else {
    selectedUsers.value.push(userId)
  }
}

function toggleClassSelection(classId: number) {
  const index = selectedClasses.value.indexOf(classId)
  if (index > -1) {
    selectedClasses.value.splice(index, 1)
  }
  else {
    selectedClasses.value.push(classId)
  }
}

const isUserSelected = (userId: number) => selectedUsers.value.includes(userId)
const isClassSelected = (classId: number) => selectedClasses.value.includes(classId)

const totalSelected = computed(() => selectedUsers.value.length + selectedClasses.value.length)

async function handleAddMembers() {
  if (totalSelected.value === 0) {
    uni.showToast({ title: '请至少选择一个用户或班级', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '添加中...' })

    let addedCount = 0

    if (selectedUsers.value.length > 0) {
      const res = await addParticipants(conversationId.value, {
        participant_user_ids: selectedUsers.value,
      })
      if (res?.added_count) {
        addedCount += res.added_count
      }
    }

    if (selectedClasses.value.length > 0) {
      const res = await addParticipants(conversationId.value, {
        participant_class_ids: selectedClasses.value,
      })
      if (res?.added_count) {
        addedCount += res.added_count
      }
    }

    uni.hideLoading()
    uni.showToast({ title: `成功添加 ${addedCount} 人`, icon: 'success' })

    showAddMemberPopup.value = false
    loadConversationDetail()
  }
  catch (error) {
    uni.hideLoading()
    console.error('添加成员失败:', error)
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="chat-detail">
    <!-- 自定义导航栏 - 微信风格 -->
    <view class="custom-nav">
      <view class="status-bar" :style="{ height: `${safeAreaInsets?.top || 0}px` }" />
      <view class="nav-content" :style="{ paddingRight: navRightPadding }">
        <view class="nav-left" @click="goBack">
          <view class="back-btn-wrapper">
            <text class="back-icon">‹</text>
          </view>
          <view v-if="unreadCount > 0" class="unread-badge">
            <text class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
          </view>
        </view>
        <view class="nav-center" @click="openMemberList">
          <text class="nav-title">{{ conversationName || '聊天' }}</text>
          <text v-if="isGroupChat && participants.length > 0" class="member-count">({{ participants.length }})</text>
        </view>
        <view class="nav-right" @click="goToChatInfo">
          <view class="more-btn">
            <wd-icon name="more" size="40rpx" color="#191919" />
          </view>
        </view>
      </view>
      <view class="nav-bottom-line" />
    </view>

    <scroll-view
      scroll-y
      class="message-area"
      :style="{ paddingTop: `${navHeight}px` }"
      :scroll-top="scrollTop"
      :scroll-into-view="scrollToView"
      scroll-with-animation
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltoupper="loadMoreMessages"
    >
      <view v-if="loadingMore" class="loading-more">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-if="loading && messages.length === 0" class="loading-container">
        <view class="loading-spinner" />
        <text class="loading-text">加载中...</text>
      </view>

      <view
        v-for="(msg, index) in messages"
        :id="`msg-${msg.id}`"
        :key="msg.id"
        class="message-item"
      >
        <view v-if="shouldShowDate(index)" class="date-divider">
          <text class="date-text">{{ formatDate(msg.sent_at) }} {{ formatTime(msg.sent_at) }}</text>
        </view>

        <!-- 系统消息 -->
        <view v-if="msg.type === 'system'" class="system-message">
          <wd-icon name="info-circle" size="28rpx" color="#f59e0b" />
          <text class="system-text">{{ msg.content }}</text>
        </view>

        <!-- 我发的消息 -->
        <view v-else-if="msg.is_mine" class="message-row mine" @longpress="handleLongPress(msg)">
          <view class="status-icon">
            <view v-if="sendingMessages.has(msg.id)" class="sending-dot" />
            <text v-else-if="failedMessages.has(msg.id)" class="failed-text">!</text>
          </view>
          <view class="bubble-wrapper">
            <view v-if="msg.extra_data?.replyTo" class="reply-quote" @click.stop="scrollToReplyMessage(msg.extra_data.replyTo.id)">
              <view class="quote-bar" />
              <view class="quote-content">
                <text class="quote-sender">{{ msg.extra_data.replyTo.sender_name || '对方' }}：</text>
                <text class="quote-text">{{ getQuotePreviewText(msg.extra_data.replyTo) }}</text>
              </view>
            </view>
            <view v-if="msg.type === 'image'" class="image-message" @click.stop="previewImage(getFullUrl(msg.content || msg.extra_data?.url) || msg.extra_data?.localPath)">
              <image
                :src="getCachedImageUrl(getFullUrl(msg.content || msg.extra_data?.url)) || msg.extra_data?.localPath"
                mode="widthFix"
                class="message-image"
                :class="{ uploading: msg.extra_data?.isUploading }"
                lazy-load
                @error="onImageError(msg, $event)"
                @load="onImageLoad(msg, $event)"
              />
              <view v-if="msg.extra_data?.isUploading" class="image-uploading-mask">
                <view class="loading-spinner-small" />
                <text class="uploading-text">上传中...</text>
              </view>
            </view>
            <view v-else-if="msg.type === 'file'" class="file-message mine-file" @click="openFile(msg)">
              <view class="file-icon-box">
                <wd-icon :name="getFileIcon(msg.extra_data?.fileName)" size="48rpx" color="#576B95" />
              </view>
              <view class="file-info">
                <text class="file-name">{{ msg.extra_data?.fileName || '文件' }}</text>
                <text class="file-size">{{ msg.extra_data?.fileSize || '' }}</text>
              </view>
              <view v-if="msg.extra_data?.isUploading" class="file-status uploading">
                <view class="loading-spinner-small" />
              </view>
            </view>
            <view v-else-if="msg.type === 'video'" class="video-message mine-video">
              <image
                v-if="msg.extra_data?.thumbnail"
                :src="getCachedImageUrl(msg.extra_data.thumbnail)"
                mode="aspectFill"
                class="video-thumbnail"
                lazy-load
              />
              <view v-else class="video-placeholder">
                <wd-icon name="play-circle" size="60rpx" color="rgba(0, 0, 0, 0.25)" />
              </view>
              <view class="video-play-btn">
                <wd-icon name="pause" size="36rpx" color="#fff" />
              </view>
              <text v-if="msg.extra_data?.duration" class="video-duration">{{ msg.extra_data.duration }}</text>
            </view>
            <view v-else class="bubble mine-bubble" :class="{ 'mentioned-bubble': isMentionedMe(msg) }">
              <template v-for="(part, pIdx) in parseContentWithMentions(msg.content, msg.extra_data?.mentions)" :key="pIdx">
                <text v-if="part.isMention" class="mention-text">{{ part.text }}</text>
                <text v-else class="bubble-text">{{ part.text }}</text>
              </template>
            </view>
          </view>
          <image
            v-if="userStore.userInfo?.avatar"
            :src="getCachedAvatarUrl(userStore.userInfo.avatar)"
            mode="aspectFill"
            class="avatar"
          />
          <view v-else class="avatar avatar-placeholder">
            <text class="avatar-char">{{ userStore.userInfo?.username?.charAt(0) || '我' }}</text>
          </view>
        </view>

        <!-- 别人发的消息 - 私聊模式 -->
        <view v-else-if="!isGroupChat" class="message-row other" @longpress="handleLongPress(msg)">
          <image
            v-if="msg.sender_avatar"
            :src="getCachedAvatarUrl(msg.sender_avatar)"
            mode="aspectFill"
            class="avatar"
          />
          <view v-else class="avatar avatar-placeholder">
            <text class="avatar-char">{{ msg.sender_name?.charAt(0) || '?' }}</text>
          </view>
          <view class="bubble-wrapper">
            <view v-if="msg.extra_data?.replyTo" class="reply-quote" @click.stop="scrollToReplyMessage(msg.extra_data.replyTo.id)">
              <view class="quote-bar" />
              <view class="quote-content">
                <text class="quote-sender">{{ msg.extra_data.replyTo.sender_name || '对方' }}：</text>
                <text class="quote-text">{{ getQuotePreviewText(msg.extra_data.replyTo) }}</text>
              </view>
            </view>
            <view v-if="msg.type === 'image'" class="image-message" @click.stop="previewImage(getFullUrl(msg.content || msg.extra_data?.url))">
              <image
                :src="getCachedImageUrl(getFullUrl(msg.content || msg.extra_data?.url))"
                mode="widthFix"
                class="message-image"
                lazy-load
                @error="onImageError(msg, $event)"
                @load="onImageLoad(msg, $event)"
              />
            </view>
            <view v-else-if="msg.type === 'file'" class="file-message other-file" @click="openFile(msg)">
              <view class="file-icon-box">
                <wd-icon :name="getFileIcon(msg.extra_data?.fileName)" size="48rpx" color="#576B95" />
              </view>
              <view class="file-info">
                <text class="file-name">{{ msg.extra_data?.fileName || '文件' }}</text>
                <text class="file-size">{{ msg.extra_data?.fileSize || '' }}</text>
              </view>
            </view>
            <view v-else-if="msg.type === 'video'" class="video-message other-video">
              <image
                v-if="msg.extra_data?.thumbnail"
                :src="getCachedImageUrl(msg.extra_data.thumbnail)"
                mode="aspectFill"
                class="video-thumbnail"
                lazy-load
              />
              <view v-else class="video-placeholder">
                <wd-icon name="play-circle" size="60rpx" color="rgba(0, 0, 0, 0.25)" />
              </view>
              <view class="video-play-btn">
                <wd-icon name="pause" size="36rpx" color="#fff" />
              </view>
              <text v-if="msg.extra_data?.duration" class="video-duration">{{ msg.extra_data.duration }}</text>
            </view>
            <view v-else class="bubble other-bubble" :class="{ 'mentioned-bubble': isMentionedMe(msg) }">
              <template v-for="(part, pIdx) in parseContentWithMentions(msg.content, msg.extra_data?.mentions)" :key="pIdx">
                <text v-if="part.isMention" class="mention-text">{{ part.text }}</text>
                <text v-else class="bubble-text">{{ part.text }}</text>
              </template>
            </view>
          </view>
        </view>

        <!-- 别人发的消息 - 群聊模式 -->
        <view v-else class="message-row other group-mode" @longpress="handleLongPress(msg)">
          <image
            v-if="msg.sender_avatar"
            :src="getCachedAvatarUrl(msg.sender_avatar)"
            mode="aspectFill"
            class="avatar"
          />
          <view v-else class="avatar avatar-placeholder">
            <text class="avatar-char">{{ msg.sender_name?.charAt(0) || '?' }}</text>
          </view>
          <view class="content-wrapper">
            <text class="sender-name">{{ msg.sender_name }}</text>
            <view v-if="msg.extra_data?.replyTo" class="reply-quote" @click.stop="scrollToReplyMessage(msg.extra_data.replyTo.id)">
              <view class="quote-bar" />
              <view class="quote-content">
                <text class="quote-sender">{{ msg.extra_data.replyTo.sender_name || '对方' }}：</text>
                <text class="quote-text">{{ getQuotePreviewText(msg.extra_data.replyTo) }}</text>
              </view>
            </view>
            <view v-if="msg.type === 'image'" class="image-message" @click.stop="previewImage(getFullUrl(msg.content || msg.extra_data?.url))">
              <image
                :src="getCachedImageUrl(getFullUrl(msg.content || msg.extra_data?.url))"
                mode="widthFix"
                class="message-image"
                lazy-load
                @error="onImageError(msg, $event)"
                @load="onImageLoad(msg, $event)"
              />
            </view>
            <view v-else-if="msg.type === 'file'" class="file-message other-file" @click="openFile(msg)">
              <view class="file-icon-box">
                <wd-icon :name="getFileIcon(msg.extra_data?.fileName)" size="48rpx" color="#576B95" />
              </view>
              <view class="file-info">
                <text class="file-name">{{ msg.extra_data?.fileName || '文件' }}</text>
                <text class="file-size">{{ msg.extra_data?.fileSize || '' }}</text>
              </view>
            </view>
            <view v-else-if="msg.type === 'video'" class="video-message other-video">
              <image
                v-if="msg.extra_data?.thumbnail"
                :src="getCachedImageUrl(msg.extra_data.thumbnail)"
                mode="aspectFill"
                class="video-thumbnail"
                lazy-load
              />
              <view v-else class="video-placeholder">
                <wd-icon name="play-circle" size="60rpx" color="rgba(0, 0, 0, 0.25)" />
              </view>
              <view class="video-play-btn">
                <wd-icon name="pause" size="36rpx" color="#fff" />
              </view>
              <text v-if="msg.extra_data?.duration" class="video-duration">{{ msg.extra_data.duration }}</text>
            </view>
            <view v-else-if="msg.type === 'mention'" class="bubble mention-bubble">
              <text class="bubble-text">"{{ msg.sender_name }}" {{ msg.content }}</text>
            </view>
            <view v-else class="bubble other-bubble" :class="{ 'mentioned-bubble': isMentionedMe(msg) }">
              <template v-for="(part, pIdx) in parseContentWithMentions(msg.content, msg.extra_data?.mentions)" :key="pIdx">
                <text v-if="part.isMention" class="mention-text">{{ part.text }}</text>
                <text v-else class="bubble-text">{{ part.text }}</text>
              </template>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!loading && messages.length === 0" class="empty-state">
        <view class="empty-icon">
          <wd-icon name="chat" size="120rpx" color="rgba(0, 0, 0, 0.15)" />
        </view>
        <text class="empty-text">暂无消息</text>
        <text class="empty-tip">发送第一条消息开始聊天吧</text>
      </view>
    </scroll-view>

    <view class="input-area">
      <!-- 引用消息预览 -->
      <view v-if="replyToMessage" class="reply-preview">
        <view class="reply-content">
          <text class="reply-sender">{{ replyToMessage.sender_name || '对方' }}：</text>
          <text class="reply-text">{{ getReplyPreviewText(replyToMessage) }}</text>
        </view>
        <view class="reply-close" @click="cancelReply">
          <text>×</text>
        </view>
      </view>

      <view v-if="mentions.length > 0" class="mention-tags">
        <view
          v-for="(mention, idx) in mentions"
          :key="mention.id"
          class="mention-tag"
        >
          <text class="mention-tag-text">@{{ mention.name }}</text>
          <text class="mention-tag-close" @click="removeMention(idx)">×</text>
        </view>
      </view>

      <view class="input-row">
        <input
          v-model="inputContent"
          class="input"
          placeholder=""
          confirm-type="send"
          :adjust-position="true"
          :hold-keyboard="true"
          @confirm="handleSend"
          @focus="handleInputFocus"
          @input="handleInputChange"
        >

        <view class="action-btn" @click="toggleEmojiPicker">
          <wd-icon name="chat1" size="38rpx" color="#576B95" />
        </view>

        <view class="action-btn" @click="toggleMorePanel">
          <text class="icon-text more-add-icon">+</text>
        </view>
      </view>

      <view v-if="showAtPanel && isGroupChat" class="at-overlay" @click="closeAtPanel">
        <view class="at-panel" @click.stop>
          <view class="at-panel-header">
            <text class="at-panel-title">选择要@的人</text>
            <text class="at-panel-close" @click="closeAtPanel">×</text>
          </view>
          <scroll-view scroll-y class="at-member-list">
            <view
              v-for="member in filteredMembers"
              :key="member.user_id"
              class="at-member-item"
              @click="selectAtMember(member)"
            >
              <view class="at-member-avatar">
                <text class="avatar-char">{{ (member.name || '?').charAt(0) }}</text>
              </view>
              <view class="at-member-info">
                <text class="at-member-name">{{ member.name || '未知用户' }}</text>
                <text v-if="member.role === 'owner'" class="at-role-tag owner">群主</text>
                <text v-else-if="member.role === 'admin'" class="at-role-tag admin">管理员</text>
              </view>
            </view>
            <view v-if="filteredMembers.length === 0" class="at-empty">
              <text>无匹配成员</text>
            </view>
          </scroll-view>
        </view>
      </view>

      <view v-if="showEmojiPicker" class="emoji-picker">
        <view
          v-for="(emoji, index) in emojis"
          :key="index"
          class="emoji-item"
          @click="insertEmoji(emoji)"
        >
          <text>{{ emoji }}</text>
        </view>
      </view>

      <view v-if="showMorePanel" class="more-panel">
        <view class="more-item" @click="handleChooseImage">
          <view class="more-icon-box">
            <wd-icon name="camera" size="48rpx" color="#576B95" />
          </view>
          <text class="more-text">图片</text>
        </view>
        <view class="more-item">
          <view class="more-icon-box">
            <wd-icon name="scan" size="48rpx" color="#576B95" />
          </view>
          <text class="more-text">拍摄</text>
        </view>
        <view class="more-item" @click="handleChooseFile">
          <view class="more-icon-box">
            <wd-icon name="list" size="48rpx" color="#576B95" />
          </view>
          <text class="more-text">文件</text>
        </view>
        <view class="more-item">
          <view class="more-icon-box">
            <wd-icon name="calendar" size="48rpx" color="#576B95" />
          </view>
          <text class="more-text">位置</text>
        </view>
      </view>
    </view>

    <view v-if="showActionMenu" class="action-menu-mask" @click="showActionMenu = false">
      <view class="action-menu" @click.stop>
        <view v-if="selectedMessage?.type !== 'system'" class="menu-item" @click="replyToMsg">
          <wd-icon name="chat1" size="36rpx" color="#333" />
          <text class="menu-text">引用</text>
        </view>
        <view v-if="selectedMessage?.is_mine && canRecall(selectedMessage)" class="menu-item danger" @click="handleRecall">
          <wd-icon name="refresh" size="36rpx" color="#e74c3c" />
          <text class="menu-text">撤回</text>
        </view>
        <view class="menu-item" @click="copyMessage">
          <wd-icon name="check-circle" size="36rpx" color="#333" />
          <text class="menu-text">复制</text>
        </view>
        <view class="menu-item danger" @click="deleteMessage">
          <wd-icon name="delete" size="36rpx" color="#e74c3c" />
          <text class="menu-text">删除</text>
        </view>
        <view class="menu-item cancel" @click="showActionMenu = false">
          <text class="menu-text">取消</text>
        </view>
      </view>
    </view>

    <!-- 成员列表弹窗 -->
    <view v-if="showMemberList" class="popup-mask" @click="showMemberList = false">
      <view class="popup-content member-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">群成员 ({{ participants.length }})</text>
          <text class="close-btn" @click="showMemberList = false">×</text>
        </view>

        <scroll-view scroll-y class="popup-body">
          <view class="member-grid">
            <view
              v-for="(participant, index) in participants"
              :key="index"
              class="member-item"
            >
              <view class="member-avatar">
                <text class="avatar-char">{{ participant.name?.charAt(0) || '?' }}</text>
              </view>
              <text class="member-name">{{ participant.name || '未知' }}</text>
              <text v-if="participant.role === 'owner'" class="role-tag owner">群主</text>
              <text v-else-if="participant.role === 'admin'" class="role-tag admin">管理员</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="canManageMembers && conversationType !== 'private'" class="popup-footer">
          <button class="btn add-member-btn" @click="showMemberList = false; openAddMemberPopup()">
            <text class="btn-icon">+</text>
            <text>添加成员</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 添加成员弹窗 -->
    <view v-if="showAddMemberPopup" class="popup-mask" @click="showAddMemberPopup = false">
      <view class="popup-content add-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">添加成员</text>
          <text class="close-btn" @click="showAddMemberPopup = false">×</text>
        </view>

        <view class="search-section">
          <view class="search-box">
            <wd-icon name="search" size="28rpx" color="rgba(0, 0, 0, 0.35)" />
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索用户姓名、学号或班级名称"
              confirm-type="search"
              @confirm="handleSearch"
              @input="onSearchInput"
            >
          </view>

          <view class="tab-bar">
            <view
              class="tab-item"
              :class="{ active: activeTab === 'user' }"
              @click="switchTab('user')"
            >
              <text>用户</text>
            </view>
            <view
              class="tab-item"
              :class="{ active: activeTab === 'class' }"
              @click="switchTab('class')"
            >
              <text>班级</text>
            </view>
          </view>
        </view>

        <scroll-view scroll-y class="popup-body">
          <view v-if="searching" class="searching-hint">
            <text>搜索中...</text>
          </view>

          <view v-else-if="searchResults.length === 0 && searchKeyword" class="empty-search">
            <text>未找到相关结果</text>
          </view>

          <view v-else-if="searchResults.length === 0 && !searchKeyword" class="empty-search">
            <text>请输入关键词搜索</text>
          </view>

          <view v-else class="result-list">
            <view
              v-for="(item, index) in searchResults"
              :key="index"
              class="result-item"
              :class="{ selected: activeTab === 'user' ? isUserSelected((item as SearchResultUser).id) : isClassSelected((item as SearchResultClass).id) }"
              @click="activeTab === 'user' ? toggleUserSelection((item as SearchResultUser).id) : toggleClassSelection((item as SearchResultClass).id)"
            >
              <view class="checkbox">
                <text v-if="activeTab === 'user' ? isUserSelected((item as SearchResultUser).id) : isClassSelected((item as SearchResultClass).id)" class="check-icon">✓</text>
              </view>

              <view class="result-info">
                <template v-if="activeTab === 'user'">
                  <text class="result-name">{{ (item as SearchResultUser).username }}</text>
                  <text class="result-desc">
                    {{ (item as SearchResultUser).user_code || '' }}
                    {{ (item as SearchResultUser).class_name ? ` · ${(item as SearchResultUser).class_name}` : '' }}
                  </text>
                </template>
                <template v-else>
                  <text class="result-name">{{ (item as SearchResultClass).name }}</text>
                  <text class="result-desc">
                    {{ (item as SearchResultClass).grade }} · {{ (item as SearchResultClass).student_count }}人
                    {{ (item as SearchResultClass).head_teacher_name ? ` · 班主任: ${(item as SearchResultClass).head_teacher_name}` : '' }}
                  </text>
                </template>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="add-footer">
          <view class="selected-info">
            <text class="selected-text">已选 {{ totalSelected }} 项</text>
          </view>
          <button
            class="btn confirm-add-btn"
            :class="{ disabled: totalSelected === 0 }"
            @click="handleAddMembers"
          >
            确定添加
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.chat-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ededed;
  color: #333;
}

.custom-nav {
  background: #ededed;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;

  .status-bar {
    background: #ededed;
  }

  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 24rpx;
    position: relative;
  }

  .nav-left {
    width: 160rpx;
    display: flex;
    align-items: center;
    gap: 12rpx;

    .back-btn-wrapper {
      width: 64rpx;
      height: 64rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      &:active {
        opacity: 0.6;
      }

      .back-icon {
        font-size: 56rpx;
        color: #191919;
        line-height: 1;
        font-weight: 300;
        margin-top: -6rpx;
      }
    }

    .unread-badge {
      min-width: 32rpx;
      height: 32rpx;
      background: #f44336;
      border-radius: 16rpx;
      padding: 0 10rpx;
      display: flex;
      align-items: center;
      justify-content: center;

      .badge-text {
        font-size: 20rpx;
        color: #fff;
        font-weight: 500;
        line-height: 1;
      }
    }
  }

  .nav-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);

    .nav-title {
      font-size: 34rpx;
      font-weight: 500;
      color: #191919;
      max-width: 400rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .member-count {
      font-size: 26rpx;
      color: rgba(25, 25, 25, 0.55);
    }
  }

  .nav-right {
    width: auto;
    min-width: 100rpx;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: flex-end;

    .more-btn {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16rpx;

      &:active {
        opacity: 0.6;
      }
    }
  }

  .nav-bottom-line {
    height: 1rpx;
    background: rgba(0, 0, 0, 0.08);
    transform: scaleY(0.5);
  }
}

.message-area {
  flex: 1;
  min-height: 0;
  padding-left: 20rpx;
  padding-right: 20rpx;
  padding-bottom: 20rpx;
}

.loading-more {
  text-align: center;
  padding: 20rpx;

  .loading-text {
    font-size: 24rpx;
    color: rgba(25, 25, 25, 0.35);
    letter-spacing: 1rpx;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx;

  .loading-spinner {
    width: 56rpx;
    height: 56rpx;
    border: 4rpx solid rgba(7, 193, 96, 0.12);
    border-top-color: #07c160;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-text {
    margin-top: 24rpx;
    font-size: 28rpx;
    color: rgba(25, 25, 25, 0.35);
    letter-spacing: 1rpx;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 180rpx 40rpx;

  .empty-icon {
    margin-bottom: 32rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.wd-icon) {
      opacity: 0.15;
    }
  }

  .empty-text {
    font-size: 32rpx;
    color: rgba(25, 25, 25, 0.45);
    margin-bottom: 16rpx;
    font-weight: 400;
  }

  .empty-tip {
    font-size: 26rpx;
    color: rgba(25, 25, 25, 0.3);
    line-height: 1.5;
  }
}

.date-divider {
  text-align: center;
  padding: 24rpx 0;

  .date-text {
    font-size: 24rpx;
    color: rgba(25, 25, 25, 0.4);
    background: rgba(0, 0, 0, 0.04);
    padding: 8rpx 24rpx;
    border-radius: 20rpx;
    display: inline-block;
    letter-spacing: 1rpx;
  }
}

.system-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 20rpx 32rpx;
  margin: 16rpx auto;
  max-width: 80%;
  background: rgba(255, 193, 7, 0.08);
  border-radius: 16rpx;

  .system-icon {
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.wd-icon) {
      opacity: 0.85;
    }
  }

  .system-text {
    font-size: 26rpx;
    color: #e65100;
    line-height: 1.5;
    font-weight: 400;
  }
}

.message-item {
  margin-bottom: 20rpx;
  width: 100%;
  box-sizing: border-box;
}

.message-row {
  display: flex;
  align-items: flex-start;
  padding: 12rpx 24rpx;
  box-sizing: border-box;
  gap: 16rpx;

  &.mine {
    justify-content: flex-end;
    padding-right: 36rpx;

    .bubble-wrapper {
      max-width: 520rpx;
      display: flex;
      justify-content: flex-end;
    }

    .mine-bubble {
      background: #95ec69;
      border-radius: 8rpx 0 8rpx 8rpx;
      padding: 18rpx 22rpx;
      display: inline-block;
      word-break: break-all;
      line-height: 1.5;
      box-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.04);

      .bubble-text {
        font-size: 32rpx;
        color: #191919;
      }
    }

    .mine-video {
      position: relative;
      width: 400rpx;
      border-radius: 8rpx 0 8rpx 8rpx;
      overflow: hidden;
      box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
    }

    .avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 10rpx;
      flex-shrink: 0;
      object-fit: cover;
      box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.08);
    }

    .avatar-placeholder {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10rpx;

      .avatar-char {
        color: #fff;
        font-size: 30rpx;
        font-weight: 500;
      }
    }

    .status-icon {
      width: 36rpx;
      height: 36rpx;
      margin-top: 4rpx;
      flex-shrink: 0;

      .sending-dot {
        width: 28rpx;
        height: 28rpx;
        border: 3rpx solid rgba(0, 0, 0, 0.08);
        border-top-color: #07c160;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        display: block;
      }

      .failed-text {
        width: 32rpx;
        height: 32rpx;
        line-height: 32rpx;
        text-align: center;
        background: #f44336;
        color: #fff;
        font-size: 22rpx;
        font-weight: bold;
        border-radius: 50%;
        display: block;
      }
    }
  }

  &.other {
    padding-left: 12rpx;

    .avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 10rpx;
      flex-shrink: 0;
      object-fit: cover;
      box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.08);
    }

    .avatar-placeholder {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10rpx;

      .avatar-char {
        color: #fff;
        font-size: 30rpx;
        font-weight: 500;
      }
    }

    .bubble-wrapper {
      max-width: 520rpx;
    }

    .other-bubble {
      background: #ffffff;
      border-radius: 0 8rpx 8rpx 8rpx;
      padding: 18rpx 22rpx;
      display: inline-block;
      word-break: break-all;
      line-height: 1.5;
      box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.06);

      .bubble-text {
        font-size: 32rpx;
        color: #191919;
      }
    }

    .other-video {
      position: relative;
      width: 400rpx;
      border-radius: 0 8rpx 8rpx 8rpx;
      overflow: hidden;
      box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
    }

    &.group-mode {
      .content-wrapper {
        flex: 1;
        min-width: 0;

        .sender-name {
          font-size: 26rpx;
          color: #576b95;
          margin-bottom: 8rpx;
          margin-left: 4rpx;
          display: block;
          font-weight: 500;
        }
      }
    }
  }
}

.image-message {
  position: relative;
  max-width: 400rpx;
  min-width: 200rpx;
  min-height: 200rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background: #f5f5f5;

  .message-image {
    width: 100%;
    min-height: 200rpx;
    display: block;
    border-radius: 8rpx;

    &.uploading {
      opacity: 0.7;
    }
  }

  .image-uploading-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12rpx;

    .loading-spinner-small {
      width: 48rpx;
      height: 48rpx;
      border: 3rpx solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .uploading-text {
      font-size: 24rpx;
      color: #fff;
    }
  }
}

.file-message {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 8rpx;
  min-width: 320rpx;
  max-width: 450rpx;

  &.mine-file {
    background: #95ec69;
    border-radius: 8rpx 0 8rpx 8rpx;
  }

  &.other-file {
    border-radius: 0 8rpx 8rpx 8rpx;
    box-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.05);
  }

  .file-icon-box {
    width: 80rpx;
    height: 80rpx;
    background: #e3f2fd;
    border-radius: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
    margin-left: 20rpx;
    overflow: hidden;

    .file-name {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      font-size: 24rpx;
      color: #999;
      margin-top: 6rpx;
      display: block;
    }
  }

  .file-status {
    margin-left: 16rpx;

    &.uploading {
      .loading-spinner-small {
        width: 32rpx;
        height: 32rpx;
        border: 2rpx solid rgba(0, 0, 0, 0.1);
        border-top-color: #07c160;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }
  }
}

.video-message {
  position: relative;
  background: #e8e8e8;

  .video-thumbnail {
    width: 100%;
    height: 280rpx;
    object-fit: cover;
    display: block;
  }

  .video-placeholder {
    width: 100%;
    height: 280rpx;
    background: linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-play-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90rpx;
    height: 90rpx;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10rpx);
  }

  .video-duration {
    position: absolute;
    bottom: 12rpx;
    right: 12rpx;
    font-size: 22rpx;
    color: #fff;
    background: rgba(0, 0, 0, 0.7);
    padding: 4rpx 12rpx;
    border-radius: 6rpx;
  }
}

.mention-bubble {
  background: rgba(255, 243, 224, 0.8);
  border: 2rpx solid rgba(255, 152, 0, 0.25);
  border-radius: 0 8rpx 8rpx 8rpx;
  padding: 18rpx 22rpx;
  display: inline-block;
  word-break: break-all;
  line-height: 1.5;

  .bubble-text {
    font-size: 32rpx;
    color: #e65100;
  }
}

.mentioned-bubble {
  border: 2rpx solid #ff9800 !important;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%) !important;
}

.reply-quote {
  display: flex;
  align-items: flex-start;
  padding: 14rpx 16rpx;
  margin-bottom: 10rpx;
  border-radius: 8rpx;
  position: relative;
  transition: background-color 0.15s ease;

  &:active {
    opacity: 0.75;
  }

  .quote-bar {
    width: 6rpx;
    height: auto;
    min-height: 36rpx;
    border-radius: 3rpx;
    margin-right: 12rpx;
    flex-shrink: 0;
    align-self: stretch;
  }

  .quote-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4rpx;
  }

  .quote-sender {
    font-size: 24rpx;
    font-weight: 600;
    line-height: 1.4;
    flex-shrink: 0;
  }

  .quote-text {
    font-size: 24rpx;
    color: rgba(25, 25, 25, 0.65);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.mine-bubble + .reply-quote,
.mine .reply-quote {
  background: rgba(255, 255, 255, 0.45);

  .quote-bar {
    background: rgba(150, 200, 100, 0.6);
  }

  .quote-sender {
    color: rgba(0, 100, 50, 0.85);
  }
}

.other-bubble + .reply-quote,
.other .reply-quote {
  background: rgba(0, 0, 0, 0.03);

  .quote-bar {
    background: rgba(87, 107, 149, 0.35);
  }

  .quote-sender {
    color: #576b95;
  }
}

.mention-text {
  font-size: 32rpx;
  color: #1976d2;
  font-weight: 600;
}

.input-area {
  background: #f7f7f7;
  border-top: 1rpx solid rgba(0, 0, 0, 0.06);
  position: relative;

  .reply-preview {
    display: flex;
    align-items: center;
    padding: 16rpx 24rpx;
    background: #fff9e6;
    border-left: 6rpx solid #ffa000;

    .reply-content {
      flex: 1;
      overflow: hidden;

      .reply-sender {
        font-size: 26rpx;
        color: #ff8f00;
        font-weight: 600;
      }

      .reply-text {
        font-size: 26rpx;
        color: #666;
        margin-left: 8rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .reply-close {
      width: 44rpx;
      height: 44rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 36rpx;
      flex-shrink: 0;
      margin-left: 12rpx;
    }
  }

  .mention-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    padding: 12rpx 24rpx 0;

    .mention-tag {
      display: inline-flex;
      align-items: center;
      gap: 6rpx;
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-radius: 20rpx;
      padding: 6rpx 14rpx 6rpx 16rpx;

      .mention-tag-text {
        font-size: 24rpx;
        color: #1976d2;
        font-weight: 500;
      }

      .mention-tag-close {
        font-size: 26rpx;
        color: #90caf9;
        line-height: 1;
        padding: 0 4rpx;
      }
    }
  }

  .input-row {
    display: flex;
    align-items: center;
    padding: 16rpx 20rpx;
    gap: 16rpx;

    .action-btn {
      width: 68rpx;
      height: 68rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;

      &:active {
        background: rgba(0, 0, 0, 0.04);
      }

      .more-add-icon {
        font-size: 44rpx;
        font-weight: 300;
        color: #191919;
      }
    }

    .input {
      flex: 1;
      height: 72rpx;
      background: #ffffff;
      border-radius: 36rpx;
      padding: 0 28rpx;
      font-size: 30rpx;
      color: #191919;
      box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.06);

      &::placeholder {
        color: rgba(0, 0, 0, 0.25);
      }
    }
  }

  .emoji-picker {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    padding: 20rpx;
    background: #f7f7f7;
    border-top: 1rpx solid rgba(0, 0, 0, 0.06);

    .emoji-item {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16rpx;
      font-size: 44rpx;

      &:active {
        background: rgba(0, 0, 0, 0.04);
        border-radius: 12rpx;
      }
    }
  }

  .more-panel {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    padding: 30rpx 20rpx;
    background: #f7f7f7;
    border-top: 1rpx solid rgba(0, 0, 0, 0.06);

    .more-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20rpx;

      &:active {
        background: rgba(0, 0, 0, 0.04);
        border-radius: 16rpx;
      }

      .more-icon-box {
        width: 100rpx;
        height: 100rpx;
        background: #ffffff;
        border-radius: 20rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14rpx;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
      }

      .more-text {
        font-size: 24rpx;
        color: rgba(25, 25, 25, 0.65);
      }
    }
  }
}

.action-menu-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.action-menu {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  overflow: hidden;
  animation: slideUp 0.25s ease-out;

  .menu-item {
    display: flex;
    align-items: center;
    padding: 32rpx 40rpx;
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
    transition: background-color 0.15s ease;

    &:active {
      background: #f7f8fa;
    }

    &:last-of-type:not(.cancel) {
      border-bottom: none;
    }

    .menu-text {
      font-size: 32rpx;
      color: #191919;
      margin-left: 20rpx;
      font-weight: 400;
    }

    &.danger {
      .menu-text {
        color: #f44336;
        font-weight: 500;
      }
    }

    &.cancel {
      margin-top: 16rpx;
      background: #f5f5f5;
      border-bottom: none;
      border-top: 12rpx solid #f0f0f0;
      padding: 28rpx 40rpx;

      &:active {
        background: #efefef;
      }

      .menu-text {
        color: rgba(25, 25, 25, 0.4);
        text-align: center;
        width: 100%;
        display: block;
        margin-left: 0;
      }
    }
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.at-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;

  .at-panel {
    background: #fff;
    border-radius: 28rpx 28rpx 0 0;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .at-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 28rpx 32rpx;
      border-bottom: 1rpx solid #f0f0f0;
      flex-shrink: 0;

      .at-panel-title {
        font-size: 30rpx;
        color: #1a1a1a;
        font-weight: 600;
      }

      .at-panel-close {
        width: 52rpx;
        height: 52rpx;
        line-height: 48rpx;
        text-align: center;
        font-size: 38rpx;
        color: #999;
        background: #f5f5f5;
        border-radius: 50%;
      }
    }

    .at-member-list {
      flex: 1;
      padding: 12rpx 0;

      .at-member-item {
        display: flex;
        align-items: center;
        padding: 24rpx 32rpx;

        &:active {
          background: #f7f8fa;
        }

        .at-member-avatar {
          width: 76rpx;
          height: 76rpx;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 22rpx;
          flex-shrink: 0;

          .avatar-char {
            color: #fff;
            font-size: 30rpx;
            font-weight: bold;
          }
        }

        .at-member-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 14rpx;

          .at-member-name {
            font-size: 30rpx;
            color: #1a1a1a;
            font-weight: 500;
          }

          .at-role-tag {
            font-size: 20rpx;
            padding: 4rpx 14rpx;
            border-radius: 8rpx;
            font-weight: 500;

            &.owner {
              background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
              color: #e65100;
            }

            &.admin {
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
              color: #1565c0;
            }
          }
        }
      }

      .at-empty {
        padding: 100rpx 0;
        text-align: center;

        text {
          color: #bbb;
          font-size: 26rpx;
        }
      }
    }
  }
}

.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.popup-content {
  width: 90%;
  max-width: 650rpx;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: scaleIn 0.2s ease-out;

  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;

  .popup-title {
    font-size: 34rpx;
    font-weight: 600;
    color: #191919;
  }

  .close-btn {
    font-size: 48rpx;
    color: rgba(25, 25, 25, 0.4);
    line-height: 1;
    width: 52rpx;
    height: 52rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;

    &:active {
      background: rgba(0, 0, 0, 0.04);
    }
  }
}

.popup-body {
  flex: 1;
  overflow-y: auto;
  padding: 20rpx 30rpx;
}

.popup-footer {
  border-top: 1rpx solid rgba(0, 0, 0, 0.08);
  padding: 20rpx 30rpx;
  flex-shrink: 0;

  .btn {
    width: 100%;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    background: #07c160;
    color: #fff;
    border-radius: 16rpx;
    font-size: 30rpx;
    font-weight: bold;
    border: none;

    .btn-icon {
      font-size: 36rpx;
    }
  }
}

.member-popup {
  .member-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24rpx;
    padding: 16rpx 0;
  }

  .member-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12rpx;
    border-radius: 12rpx;
    transition: background-color 0.15s ease;

    &:active {
      background: rgba(0, 0, 0, 0.03);
    }

    .member-avatar {
      width: 96rpx;
      height: 96rpx;
      border-radius: 50%;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      display: flex;
      align-items: center;
      justify-content: center;

      .avatar-char {
        color: #fff;
        font-size: 36rpx;
        font-weight: bold;
      }
    }

    .member-name {
      font-size: 24rpx;
      color: #191919;
      max-width: 140rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
      margin-top: 10rpx;
      line-height: 1.3;
    }

    .role-tag {
      font-size: 18rpx;
      padding: 2rpx 10rpx;
      border-radius: 8rpx;
      margin-top: 4rpx;
      font-weight: 500;

      &.owner {
        background: rgba(255, 152, 0, 0.12);
        color: #ff9800;
      }

      &.admin {
        background: rgba(33, 150, 243, 0.12);
        color: #1976d2;
      }
    }
  }
}

.add-popup {
  .search-section {
    padding: 0 30rpx 20rpx;
    border-bottom: 1rpx solid rgba(0, 0, 0, 0.08);
    flex-shrink: 0;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 40rpx;
    padding: 16rpx 24rpx;
    margin-bottom: 20rpx;
    gap: 12rpx;

    .search-input {
      flex: 1;
      font-size: 28rpx;
      color: #333;
    }
  }

  .tab-bar {
    display: flex;
    gap: 20rpx;

    .tab-item {
      flex: 1;
      height: 72rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 16rpx;
      font-size: 28rpx;
      color: rgba(0, 0, 0, 0.55);
      border: 2rpx solid transparent;

      &.active {
        background: rgba(7, 193, 96, 0.1);
        color: #07c160;
        border-color: #07c160;
      }
    }
  }

  .searching-hint,
  .empty-search {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80rpx 0;
    color: rgba(0, 0, 0, 0.4);
    font-size: 28rpx;
  }

  .result-list {
    .result-item {
      display: flex;
      align-items: center;
      padding: 24rpx;
      background: #f5f5f5;
      border-radius: 16rpx;
      margin-bottom: 16rpx;

      &.selected {
        background: rgba(7, 193, 96, 0.1);
      }

      .checkbox {
        width: 44rpx;
        height: 44rpx;
        border: 2rpx solid rgba(0, 0, 0, 0.15);
        border-radius: 10rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20rpx;
        flex-shrink: 0;

        .check-icon {
          color: #07c160;
          font-size: 28rpx;
          font-weight: bold;
        }
      }

      .result-info {
        flex: 1;

        .result-name {
          font-size: 30rpx;
          color: #333;
          font-weight: 500;
          display: block;
        }

        .result-desc {
          font-size: 24rpx;
          color: rgba(0, 0, 0, 0.45);
          display: block;
          margin-top: 6rpx;
        }
      }
    }
  }

  .add-footer {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 20rpx 30rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.08);
    flex-shrink: 0;

    .selected-info {
      flex: 1;

      .selected-text {
        font-size: 26rpx;
        color: rgba(0, 0, 0, 0.5);
      }
    }

    .confirm-add-btn {
      width: auto;
      min-width: 200rpx;
      padding: 0 32rpx;
      height: 76rpx;
      line-height: 76rpx;
      background: #07c160;
      color: #fff;
      border-radius: 38rpx;
      font-size: 28rpx;
      font-weight: bold;
      border: none;

      &.disabled {
        background: #e0e0e0;
        color: rgba(0, 0, 0, 0.3);
      }
    }
  }
}
</style>
