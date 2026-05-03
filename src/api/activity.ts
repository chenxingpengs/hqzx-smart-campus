import { http } from '@/http/http'

export interface ActivityItem {
  id: number
  title: string
  coverImage: string
  activityType: 'normal' | 'performance' | 'sports'
  startTime: string
  endTime: string
  location: string
  status: 'upcoming' | 'ongoing' | 'ended'
  targetScope: string
  allowStudentSignup: boolean
  allowVolunteer: boolean
  enableProgram: boolean
  registrationCount: number
  maxParticipants: number | null
}

export interface ActivityDetail {
  id: number
  title: string
  coverImage: string
  description: string
  activityType: string
  startTime: string
  endTime: string
  signupStart: string
  signupEnd: string
  location: string
  organizer: string
  maxParticipants: number | null
  allowStudentSignup: boolean
  allowVolunteer: boolean
  collectAttachment: boolean
  attachmentDeadline: string | null
  status: string
  enableProgram: boolean
  registrationCount: number
}

export interface RegistrationInfo {
  registered: boolean
  registrationId?: number
  registrationType?: 'participant' | 'volunteer'
  voucherCode?: string
  remark?: string
  createdAt?: string
  attachments?: AttachmentItem[]
}

export interface AttachmentItem {
  id: number
  fileName: string
  filePath: string
  fileSize: number | null
  fileType: string
  createdAt: string
}

export interface ProgramItem {
  id: number
  name: string
  performers: string
  classIds: number[]
  programType: string
  duration: number | null
  status: 'pending' | 'performing' | 'completed'
  likeCount: number
  commentCount: number
  sortOrder: number
}

export function getActivityList(params?: { current?: number, size?: number, keyword?: string }) {
  return http.get<{ records: ActivityItem[], current: number, size: number, total: number, pages: number }>('/app/activity/list', params)
}

export function getActivityDetail(id: number) {
  return http.get<ActivityDetail>(`/app/activity/${id}`)
}

export function signupActivity(activityId: number, data: { type: 'participant' | 'volunteer', remark?: string }) {
  return http.post<{ registrationId: number, voucherCode: string, message: string }>(`/app/activity/${activityId}/signup`, data)
}

export function getMyRegistration(activityId: number) {
  return http.get<RegistrationInfo>(`/app/activity/${activityId}/my-registration`)
}

export function getPrograms(activityId: number) {
  return http.get<ProgramItem[]>(`/app/activity/${activityId}/programs`)
}

export function interactProgram(programId: number, data: { type: 'like' | 'comment', content?: string }) {
  return http.post(`/app/activity/programs/${programId}/interact`, data)
}

export function updateProgramStatus(programId: number, status: string) {
  return http.put(`/app/activity/programs/${programId}/status`, { status })
}

export function programSignup(activityId: number, data: {
  name: string
  programType: string
  performers?: string
  performerIds?: number[]
  classIds?: number[]
  duration?: number
  accompanimentUrl?: string
  remark?: string
}) {
  return http.post<{ programId: number }>(`/app/activity/${activityId}/program-signup`, data)
}

export function uploadAttachment(registrationId: number, filePath: string) {
  return http.upload<AttachmentItem>('/app/activity/attachments/upload', filePath, 'file', { registrationId: String(registrationId) })
}

export function getMyVoucher(activityId: number) {
  return http.get<{
    voucherCode: string
    activityTitle: string
    activityTime: string
    location: string
    userName: string
    typeLabel: string
    createdAt: string
  }>('/app/activity/registrations/my-voucher', { activityId })
}

export interface StudentItem {
  id: number
  username: string
  userCode: string
}

export function getClassStudents(params: { classId: number, keyword?: string, current?: number, size?: number }) {
  return http.get<{ records: StudentItem[], total: number }>('/web/user/list', {
    role: 'student',
    class_id: params.classId,
    username: params.keyword,
    current: params.current || 1,
    size: params.size || 20,
  })
}

export function teacherBatchSignup(activityId: number, studentIds: number[], registrationType?: string, remark?: string) {
  return http.post<{ successCount: number, failedCount: number }>('/activity/teacher/batch-signup', {
    activityId,
    studentIds,
    registrationType: registrationType || 'participant',
    remark,
  })
}
