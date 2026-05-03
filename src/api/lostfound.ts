import type { LostFoundItem, LostFoundStatus, LostFoundType } from './types'
import { http } from '@/http/http'

export function getLostFoundList(params?: {
  page?: number
  size?: number
  type?: LostFoundType
  category?: string
  status?: LostFoundStatus
  keyword?: string
}) {
  return http.get<{ list: LostFoundItem[], total: number, page: number, size: number }>('/api/lostfound/list', params)
}

export function getLostFoundDetail(id: number) {
  return http.get<LostFoundItem>(`/api/lostfound/detail/${id}`)
}

export function createLostFound(data: {
  type: LostFoundType
  category: string
  title: string
  description?: string
  images?: string[]
  location?: string
  contact?: string
}) {
  return http.post<LostFoundItem>('/api/lostfound/create', data)
}

export function updateLostFound(id: number, data: Partial<{
  title: string
  category: string
  description: string
  images: string[]
  location: string
  contact: string
}>) {
  return http.put<LostFoundItem>(`/api/lostfound/update/${id}`, data)
}

export function closeLostFound(id: number) {
  return http.put<{ code: number, msg: string }>(`/api/lostfound/close/${id}`)
}

export function resolveLostFound(id: number) {
  return http.put<{ code: number, msg: string }>(`/api/lostfound/resolve/${id}`)
}

export function deleteLostFound(id: number) {
  return http.delete<{ code: number, msg: string }>(`/api/lostfound/delete/${id}`)
}

export function getMyLostFounds(params?: { page?: number, size?: number, status?: LostFoundStatus }) {
  return http.get<{ list: LostFoundItem[], total: number, page: number, size: number }>('/api/lostfound/my', params)
}

export function getCategories() {
  return http.get<string[]>('/api/lostfound/categories')
}
