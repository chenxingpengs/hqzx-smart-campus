import { http } from '@/http/http'

export interface Conversation {
  id: string
  name: string
  type: 'private' | 'group'
  avatar?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
  is_pinned: boolean
  is_muted: boolean
  is_class_group?: boolean
  class_id?: number
}

export interface ChatMessage {
  id: number
  conversation_id: string
  sender_id?: number
  sender_device_id?: string
  sender_class_id?: number
  sender_name?: string
  sender_avatar?: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  sent_at: string
  reply_to_id?: number
  is_mine: boolean
  extra_data?: Record<string, any>
}

export interface ConversationListResponse {
  list: Conversation[]
  total: number
  page: number
  size: number
}

export interface MessageListResponse {
  list: ChatMessage[]
  total: number
  has_more: boolean
}

export function getChatConversations(params?: { page?: number, size?: number, type?: string }) {
  return http.get<ConversationListResponse>('/api/chat/user/conversations', params, {
    localCache: 300000,
  })
}

export function createConversation(data: {
  name: string
  type?: 'private' | 'group'
  participant_class_ids?: number[]
  participant_device_ids?: string[]
}) {
  return http.post<Conversation>('/api/chat/conversations', data)
}

export function getChatMessages(conversationId: string, params?: {
  page?: number
  size?: number
  before_id?: number
  after_id?: number
}) {
  return http.get<MessageListResponse>(`/api/chat/user/conversations/${conversationId}/messages`, params)
}

export function sendChatMessage(conversationId: string, data: {
  content: string
  type?: 'text' | 'image' | 'file'
  reply_to_id?: number
  extra_data?: Record<string, any>
}) {
  return http.post<ChatMessage>(`/api/chat/user/conversations/${conversationId}/messages`, data)
}

export function markAsRead(conversationId: string, lastMessageId?: number) {
  return http.put<{ code: number, msg: string }>(`/api/chat/user/conversations/${conversationId}/read`, { last_message_id: lastMessageId })
}

export function recallMessage(conversationId: string, messageId: number) {
  return http.post<{ code: number, msg: string }>(`/api/chat/user/conversations/${conversationId}/messages/${messageId}/recall`)
}

export interface ClassItem {
  id: number
  name: string
  grade: string
  student_count: number
  has_group?: boolean
}

export function getClasses() {
  return http.get<Class[]>('/api/chat/classes', undefined, {
    localCache: 600000,
  })
}

export interface Device {
  device_id: string
  device_name?: string
  class_id?: number
  class_name?: string
}

export function getDevices() {
  return http.get<Device[]>('/api/chat/devices', undefined, {
    localCache: 600000,
  })
}

export function addParticipants(conversationId: string, data: {
  participant_user_ids?: number[]
  participant_class_ids?: number[]
  participant_device_ids?: string[]
}) {
  return http.post<{ added_count: number }>(`/api/chat/conversations/${conversationId}/participants`, data)
}

export function removeParticipant(conversationId: string, participantId: number) {
  return http.delete<{ code: number, msg: string }>(`/api/chat/conversations/${conversationId}/participants/${participantId}`)
}

export interface SearchResultUser {
  id: number
  username: string
  user_code?: string
  role?: string
  avatar?: string
  wechat_nickname?: string
  class_id?: number
  class_name?: string
}

export interface SearchResultClass {
  id: number
  name: string
  grade: string
  student_count: number
  head_teacher_name?: string
}

export interface SearchResponse<T> {
  list: T[]
  total: number
  page: number
  size: number
}

export function searchUsers(params?: { keyword?: string, page?: number, size?: number }) {
  return http.get<SearchResponse<SearchResultUser>>('/api/chat/search/users', params)
}

export function searchClasses(params?: { keyword?: string, page?: number, size?: number }) {
  return http.get<SearchResponse<SearchResultClass>>('/api/chat/search/classes', params)
}

export interface Participant {
  user_id?: number
  device_id?: string
  class_id?: number
  name?: string
  role: string
}

export interface ConversationDetail {
  id: string
  name: string
  type: 'private' | 'group'
  avatar?: string
  participants: Participant[]
  created_at?: string
}

export function getConversationDetail(conversationId: string) {
  return http.get<ConversationDetail>(`/api/chat/user/conversations/${conversationId}`, undefined, {
    localCache: 300000,
  })
}

export function createClassGroup(data: {
  class_id: number
  name?: string
}) {
  return http.post<Conversation & { student_count: number }>('/api/chat/class-groups', data)
}

export function getMyClasses() {
  return http.get<ClassItem[]>('/api/chat/my-classes', undefined, {
    localCache: 600000,
  })
}

export interface ContactRequestData {
  id: string
  requester_id: number
  target_user_id?: number
  target_class_id?: number
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
  requester_name?: string
  target_user_name?: string
  target_class_name?: string
  conversation_id?: string
}

export function sendContactRequest(data: {
  target_user_id?: number
  target_class_id?: number
  message?: string
}) {
  return http.post<ContactRequestData>('/api/chat/contact-requests', data)
}

export function getContactRequests(params?: {
  status?: string
  request_type?: string
}) {
  return http.get<ContactRequestData[]>('/api/chat/contact-requests', params)
}

export function handleContactRequest(requestId: string, action: 'accept' | 'reject') {
  return http.put<ContactRequestData>(`/api/chat/contact-requests/${requestId}`, { action })
}

export function leaveConversation(conversationId: string) {
  return http.post<{ code: number, msg: string }>(`/api/chat/conversations/${conversationId}/leave`)
}

export function dissolveConversation(conversationId: string) {
  return http.post<{ code: number, msg: string }>(`/api/chat/conversations/${conversationId}/dissolve`)
}
