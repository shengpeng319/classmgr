import { request } from '@/utils/request'

export interface Course {
  id: string
  name: string
  description?: string
  color?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function getCourses() {
  return request<Course[]>({ url: '/courses' })
}

export function getCourse(id: string) {
  return request<Course>({ url: `/courses/${id}` })
}

export function createCourse(data: {
  name: string
  description?: string
  color?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location?: string
}) {
  return request<Course>({ url: '/courses', method: 'POST', data })
}

export function updateCourse(id: string, data: Partial<Course>) {
  return request<Course>({ url: `/courses/${id}`, method: 'PUT', data })
}

export function deleteCourse(id: string) {
  return request({ url: `/courses/${id}`, method: 'DELETE' })
}

export function getTodayCourses() {
  return request<Course[]>({ url: '/today-courses' })
}
