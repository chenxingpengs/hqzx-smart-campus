import type { DeviceInfo, DeviceListResponse, PowerControlResponse, StartStreamResponse } from './types/device'
import { http } from '@/http/http'

export function getDeviceList() {
  return http.get<DeviceListResponse>('/app/device/list')
}

export function getDeviceDetail(deviceId: string) {
  return http.get<DeviceInfo>(`/app/device/${deviceId}`)
}

export type StreamQuality = 'low' | 'medium' | 'high' | 'ultra'

export function startViewing(deviceId: string, quality: StreamQuality = 'medium') {
  return http.post<StartStreamResponse>(`/app/device/${deviceId}/start-view`, { quality })
}

export function startRemote(deviceId: string, quality: StreamQuality = 'medium') {
  return http.post<StartStreamResponse>(`/app/device/${deviceId}/start-remote`, { quality })
}

export function stopStream(deviceId: string, sessionId: string) {
  return http.post<void>(`/app/device/${deviceId}/stop-stream`, { sessionId })
}

export function shutdownDevice(deviceId: string) {
  return http.post<PowerControlResponse>(`/app/device/${deviceId}/shutdown`)
}

export function rebootDevice(deviceId: string) {
  return http.post<PowerControlResponse>(`/app/device/${deviceId}/reboot`)
}

export function wolDevice(deviceId: string) {
  return http.post<PowerControlResponse>(`/app/device/${deviceId}/wol`)
}

export function deleteDevice(deviceId: string) {
  return http.delete<PowerControlResponse>(`/app/device/${deviceId}`)
}
