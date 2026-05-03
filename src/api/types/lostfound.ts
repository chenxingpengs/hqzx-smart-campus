export type LostFoundType = 'lost' | 'found'
export type LostFoundStatus = 'open' | 'closed' | 'resolved'

export interface LostFoundItem {
  id: number
  user_id: number
  type: LostFoundType
  category: string
  title: string
  description?: string
  images?: string[]
  location?: string
  contact?: string
  status: LostFoundStatus
  view_count: number
  created_at: string
  updated_at: string
  user_name?: string
  user_avatar?: string
}
