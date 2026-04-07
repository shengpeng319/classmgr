import { request } from '@/utils/request'

export interface Schedule {
  id: string
  name: string
  dayOfWeek: string  // "1,3" 逗号分隔的星期几
  startTime: string
  endTime: string
  location?: string
  type: 'school' | 'tutoring' | 'homework' | 'sports' | 'art' | 'other'
  color?: string
  isDailyTask: boolean
  points: number
  userId: string
  startDate?: string
  endDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    name?: string
    avatar?: string
  }
}

export function getSchedules() {
  return request<Schedule[]>({ url: '/schedules' })
}

export function getAdminSchedules(userId?: string) {
  let url = '/admin/schedules'
  if (userId) url += `?userId=${userId}`
  return request<Schedule[]>({ url })
}

export function createSchedule(data: {
  userId: string
  name: string
  dayOfWeek: string
  startTime: string
  endTime: string
  location?: string
  type: string
  color?: string
  isDailyTask?: boolean
  points?: number
}) {
  return request<Schedule>({ url: '/admin/schedules', method: 'POST', data })
}

export function updateSchedule(id: string, data: {
  name?: string
  dayOfWeek?: string
  startTime?: string
  endTime?: string
  location?: string
  type?: string
  color?: string
  isDailyTask?: boolean
  points?: number
  isActive?: boolean
}) {
  return request<Schedule>({ url: `/admin/schedules/${id}`, method: 'PUT', data })
}

export function deleteSchedule(id: string) {
  return request({ url: `/admin/schedules/${id}`, method: 'DELETE' })
}

export function getUsers() {
  return request<Array<{ id: string; username: string; name?: string; avatar?: string; role: string }>>({ url: '/users' })
}
