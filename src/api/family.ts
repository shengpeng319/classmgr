// v2 多家庭接口封装（对齐 server/src/routes/v2.ts）
import { request } from '@/utils/request'

export interface FamilyInfo {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Child {
  id: string
  familyId: string
  name: string
  gender: string
  avatar?: string | null
  points: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ChildBrief {
  id: string
  name: string
}

export interface TaskV2 {
  id: string
  title: string
  type: 'school' | 'tutoring' | 'homework' | 'sports' | 'art' | 'other' | string
  points: number
  isCompleted: boolean
  completedAt?: string | null
  childId: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  child?: ChildBrief
}

export interface ScheduleV2 {
  id: string
  name: string
  dayOfWeek: string
  startTime: string
  endTime: string
  location?: string
  type: string
  color?: string
  isDailyTask: boolean
  points: number
  childId: string
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  child?: ChildBrief
}

export interface PointRecordV2 {
  id: string
  childId: string
  taskId?: string
  taskTitle: string
  points: number
  reason: string
  createdAt: string
  child?: ChildBrief
}

export interface CardV2 {
  id: string
  name: string
  description?: string
  rarity: string
  image?: string
  pointsCost: number
  stock: number
  isActive: boolean
}

export interface StudentCardV2 {
  id: string
  childId: string
  cardId: string
  drawnAt: string
  card: CardV2
}

// ---------- family ----------
export function getV2Family() {
  return request<{ family: FamilyInfo; children: Child[] }>({ url: '/v2/family' })
}

// ---------- children ----------
export function getV2Children() {
  return request<Child[]>({ url: '/v2/children' })
}

export function createV2Child(data: { name: string; gender?: string; age?: number; avatar?: string }) {
  return request<Child>({ url: '/v2/children', method: 'POST', data })
}

export function updateV2Child(id: string, data: { name?: string; gender?: string; age?: number | null; avatar?: string; isActive?: boolean }) {
  return request<Child>({ url: `/v2/children/${id}`, method: 'PATCH', data })
}

export function deleteV2Child(id: string) {
  return request<{ id: string; isActive: boolean } | null>({ url: `/v2/children/${id}`, method: 'DELETE' })
}

// ---------- tasks ----------
export function getV2Tasks(filters?: { childId?: string; date?: string; startDate?: string; endDate?: string }) {
  let url = '/v2/tasks'
  const params: string[] = []
  if (filters?.childId) params.push(`childId=${filters.childId}`)
  if (filters?.date) params.push(`date=${filters.date}`)
  if (filters?.startDate) params.push(`startDate=${filters.startDate}`)
  if (filters?.endDate) params.push(`endDate=${filters.endDate}`)
  if (params.length > 0) url += '?' + params.join('&')
  return request<TaskV2[]>({ url })
}

export function createV2Task(data: {
  childId: string
  title: string
  type?: string
  points?: number
  startDate: string
  endDate: string
}) {
  return request<TaskV2>({ url: '/v2/tasks', method: 'POST', data })
}

export function updateV2Task(id: string, data: { isCompleted?: boolean; title?: string; points?: number }) {
  return request<TaskV2>({ url: `/v2/tasks/${id}`, method: 'PATCH', data })
}

export function deleteV2Task(id: string) {
  return request({ url: `/v2/tasks/${id}`, method: 'DELETE' })
}

// ---------- schedules ----------
export function getV2Schedules(childId?: string) {
  const url = childId ? `/v2/schedules?childId=${childId}` : '/v2/schedules'
  return request<ScheduleV2[]>({ url })
}

export function createV2Schedule(data: {
  childId: string
  name: string
  dayOfWeek: string
  startTime: string
  endTime: string
  location?: string
  type?: string
  color?: string
  isDailyTask?: boolean
  points?: number
  startDate?: string
  endDate?: string
}) {
  return request<ScheduleV2>({ url: '/v2/schedules', method: 'POST', data })
}

export function updateV2Schedule(id: string, data: Partial<{
  name: string
  dayOfWeek: string
  startTime: string
  endTime: string
  location: string
  type: string
  color: string
  isDailyTask: boolean
  points: number
  isActive: boolean
  startDate: string | null
  endDate: string | null
}>) {
  return request<ScheduleV2>({ url: `/v2/schedules/${id}`, method: 'PATCH', data })
}

export function deleteV2Schedule(id: string) {
  return request({ url: `/v2/schedules/${id}`, method: 'DELETE' })
}

// ---------- 积分 ----------
export function getV2ChildPoints(childId: string) {
  return request<{ points: number; records: PointRecordV2[] }>({ url: `/v2/children/${childId}/points` })
}

export function adjustV2ChildPoints(childId: string, points: number, reason: string) {
  return request<{ points: number }>({ url: `/v2/children/${childId}/points`, method: 'POST', data: { points, reason } })
}

export function getV2PointRecords(childId?: string) {
  const url = childId ? `/v2/point-records?childId=${childId}` : '/v2/point-records'
  return request<PointRecordV2[]>({ url })
}

// ---------- 抽卡 ----------
export function getV2LotteryInfo(childId: string) {
  return request<{ points: number; cards: StudentCardV2[] }>({ url: `/v2/lottery/info?childId=${childId}` })
}

export function drawV2Card(childId: string, pointsCost?: number) {
  return request<{ card: CardV2; studentCard: StudentCardV2; pointsLeft: number }>({
    url: '/v2/lottery/draw',
    method: 'POST',
    data: { childId, pointsCost }
  })
}

export function renameV2Family(name: string) {
  return request<Family>({ url: '/v2/family', method: 'PATCH', data: { name } })
}

export function regenInviteCode() {
  return request<{ inviteCode: string }>({ url: '/v2/family/invite-code', method: 'POST' })
}

export function joinFamily(inviteCode: string) {
  return request<{ familyId: string; familyName: string }>({ url: '/v2/family/join', method: 'POST', data: { inviteCode } })
}

export function leaveFamily() {
  return request<null>({ url: '/v2/family/leave', method: 'POST' })
}

export function kickMember(userId: string) {
  return request<null>({ url: '/v2/family/kick', method: 'POST', data: { userId } })
}
