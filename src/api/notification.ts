import { http } from '@/http/http'

export type NotificationType = 'banner' | 'alert' | 'system' | 'emergency' | 'fire_alarm' | 'air_raid_alert' | 'earthquake_warning'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TargetType = 'all' | 'devices' | 'classes'
export type AirRaidAlertSubtype = 'pre_warning' | 'air_raid' | 'all_clear'
export type EarthquakeWarningSubtype = 'early_warning' | 'arrival'

export interface DisplayConfig {
  duration?: number
  scroll_speed?: number
  position?: 'top' | 'bottom'
  style?: 'info' | 'warning' | 'error' | 'success'
  sound?: boolean
}

export interface SpeakConfig {
  speak_enabled: boolean
  speak_voice: string
  speak_rate: number
}

export interface NotificationTypeConfig {
  value: string
  label: string
  description: string
  allowDeviceSelect: boolean
}

export interface PriorityConfig {
  value: string
  label: string
  color: string
}

export interface TargetTypeConfig {
  value: string
  label: string
}

export interface AlertSubtypeConfig {
  value: string
  label: string
  description: string
  requires_eta?: boolean
}

export interface NotificationTypesResult {
  notificationTypes: NotificationTypeConfig[]
  priorities: PriorityConfig[]
  targetTypes: TargetTypeConfig[]
  airRaidAlertSubtypes?: AlertSubtypeConfig[]
  earthquakeWarningSubtypes?: AlertSubtypeConfig[]
}

export interface SendNotificationParams {
  type: NotificationType
  title?: string
  content?: string
  priority?: NotificationPriority
  target_type?: TargetType
  target_ids?: string[]
  display_config?: DisplayConfig
  speak_config?: SpeakConfig
  alert_subtype?: AirRaidAlertSubtype | EarthquakeWarningSubtype
  magnitude?: string
  eta?: string
}

export interface SendNotificationResult {
  id: string
  sent_count: number
  offline_count?: number
}

export interface ClassWithDevice {
  id: number
  name: string
  grade: string
  has_device: boolean
  device_id: string | null
  device_name: string | null
  device_online: boolean
}

export function getNotificationTypes() {
  return http.get<NotificationTypesResult>('/app/notification/types')
}

export function sendNotification(data: SendNotificationParams) {
  return http.post<SendNotificationResult>('/app/notification/send', data)
}

export function getClassesWithDevices() {
  return http.get<ClassWithDevice[]>('/app/devices/classes')
}
