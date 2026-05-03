import type { WechatPluginConfig } from '@/plugin/types'
import { httpGet } from '@/http/http'

export function fetchWechatPluginConfigs(): Promise<WechatPluginConfig[]> {
  return httpGet<WechatPluginConfig[]>('/app/plugins/configs')
}
