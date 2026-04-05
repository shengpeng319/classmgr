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
  type: 'homework' | 'extracurricular'
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

export function getUsers() {
  return request<Array<{ id: string; username: string; name?: string; role: string }>>({ url: '/users' })
}