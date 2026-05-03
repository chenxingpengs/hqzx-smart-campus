export interface DeviceInfo {
  deviceId: string
  deviceName: string
  deviceType: string
  className: string
  classId: number | null
  status: number
  macAddress: string
  ipAddress: string
  lastActiveAt: string
}

export interface DeviceListResponse {
  list: DeviceInfo[]
  total: number
  onlineCount: number
}

export interface StreamInfo {
  streamName: string
  sessionId: string
  streamType: 'camera' | 'screen'
  rtmpUrl: string
  httpFlvUrl: string
  status: string
}

export interface StartStreamResponse {
  sessionId: string
  streamName: string
  httpFlvUrl: string
  hlsUrl: string
  rtmpUrl: string
  status: string
}

export interface PowerControlResponse {
  success: boolean
  message: string
}

export interface VideoFrameData {
  type: 'video_frame'
  sessionId: string
  timestamp: number
  data: string
  width?: number
  height?: number
  mimeType?: string
  format?: string
}

export interface AudioData {
  type: 'audio_data'
  sessionId: string
  timestamp: number
  data: string
}

export interface StreamStatus {
  type: 'stream_status'
  sessionId: string
  status: 'starting' | 'running' | 'stopped' | 'error'
}

export interface ConnectResponse {
  type: 'connect_response'
  code: number
  msg: string
  data?: {
    clientType: string
    sid: string
  }
}
