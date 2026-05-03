/**
 * 违禁词检测响应
 */
export interface IProfanityCheckResponse {
  /** 检测状态: forbidden(包含违禁词) / safe(安全) */
  status: 'forbidden' | 'safe'
  /** 原始文本 */
  original_text: string
  /** 屏蔽后的文本（将违禁词替换为*） */
  masked_text: string
  /** 命中的违禁词列表 */
  forbidden_words: string[]
}

/**
 * 违禁词检测结果（扩展版）
 */
export interface IProfanityCheckResult {
  /** 是否包含违禁词 */
  isForbidden: boolean
  /** 原始文本 */
  originalText: string
  /** 屏蔽后的文本 */
  maskedText: string
  /** 命中的违禁词列表 */
  forbiddenWords: string[]
  /** 错误信息（如果有） */
  error?: string
}
