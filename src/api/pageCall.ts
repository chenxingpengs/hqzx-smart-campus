import { http } from '@/http/http'

export type PageCallStatus = 'pending' | 'confirmed' | 'cancelled'

export interface PageCallResult {
  id: string
  student_name: string
  class_id: number | null
  class_name: string | null
  device_id: string | null
  reason: string | null
  status: PageCallStatus
  created_at: string
  confirmed_at: string | null
  confirmed_by: string | null
  cancelled_at: string | null
}

export interface SendPageCallParams {
  student_name: string
  class_id?: number
  device_id?: string
  reason?: string
}

export interface SendPageCallResult {
  id: string
  device_id: string
  class_name: string | null
  status: string
  offline?: boolean
}

export interface PageCallListResult {
  records: PageCallResult[]
  total: number
  current: number
  size: number
}

export function sendPageCall(data: SendPageCallParams) {
  return http.post<SendPageCallResult>('/app/page-call', data)
}

export function getPageCallStatus(pageCallId: string) {
  return http.get<PageCallResult>(`/app/page-call/${pageCallId}/status`)
}

export function cancelPageCall(pageCallId: string) {
  return http.post<void>(`/app/page-call/${pageCallId}/cancel`)
}

export function getPageCallList(params?: { status?: string, page?: number, size?: number }) {
  return http.get<PageCallListResult>('/app/page-call/list', params)
}
