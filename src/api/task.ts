import { request } from '@/utils/request'

export interface TaskUser {
  id: string
  username: string
  name?: string
  avatar?: string
}

export interface Task {
  id: string
  title: string
  type: 'school' | 'tutoring' | 'homework' | 'sports' | 'art' | 'other'
  points: number
  isCompleted: boolean
  completedAt?: string
  userId: string
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
  user?: TaskUser
}

export function getTasks(filters?: { userId?: string; startDate?: string; endDate?: string }) {
  let url = '/tasks'
  const params: string[] = []
  if (filters?.userId) params.push(`userId=${filters.userId}`)
  if (filters?.startDate) params.push(`startDate=${filters.startDate}`)
  if (filters?.endDate) params.push(`endDate=${filters.endDate}`)
  if (params.length > 0) url += '?' + params.join('&')
  return request<Task[]>({ url })
}

export function updateTask(id: string, data: { isCompleted: boolean }) {
  return request<Task>({ url: `/tasks/${id}`, method: 'PUT', data })
}

export function initTasks(
  userId: string,
  tasks: Array<{ title: string; type: string; startDate: string; endDate: string }>
) {
  return request({ url: '/tasks/init', method: 'POST', data: { userId, tasks } })
}

// Admin APIs
export function getAdminTasks(filters?: { userId?: string; startDate?: string; endDate?: string }) {
  let url = '/admin/tasks'
  const params: string[] = []
  if (filters?.userId) params.push(`userId=${filters.userId}`)
  if (filters?.startDate) params.push(`startDate=${filters.startDate}`)
  if (filters?.endDate) params.push(`endDate=${filters.endDate}`)
  if (params.length > 0) url += '?' + params.join('&')
  return request<Task[]>({ url })
}

export function createTask(data: {
  userId: string
  title: string
  type: string
  points?: number
  startDate: string
  endDate: string
}) {
  return request<Task>({ url: '/admin/tasks', method: 'POST', data })
}

export function updateAdminTask(id: string, data: {
  title?: string
  type?: string
  points?: number
  startDate?: string
  endDate?: string
  isCompleted?: boolean
}) {
  return request<Task>({ url: `/admin/tasks/${id}`, method: 'PUT', data })
}

export function deleteTask(id: string) {
  return request({ url: `/admin/tasks/${id}`, method: 'DELETE' })
}

export function generateDailyTasks() {
  return request({ url: '/admin/tasks/generate-daily', method: 'POST' })
}

export interface PointRecord {
  id: string
  userId: string
  taskId?: string
  taskTitle: string
  points: number
  reason: string
  createdAt: string
}

export function getPointRecords() {
  return request<PointRecord[]>({ url: '/point-records' })
}

export function getAdminPointRecords(userId?: string) {
  let url = '/admin/point-records'
  if (userId) url += `?userId=${userId}`
  return request<PointRecord[]>({ url })
}

export function getAdminUserPoints(userId: string) {
  return request<{ id: string; name?: string; avatar?: string; points: number }>({ url: `/admin/users/${userId}/points` })
}

export function getUsers() {
  return request<Array<{ id: string; username: string; name?: string; avatar?: string; role: string }>>({ url: '/users' })
}