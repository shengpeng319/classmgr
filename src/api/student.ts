import { request } from '@/utils/request'

export interface Student {
  id: string
  name: string
  avatar?: string
  points: number
  createdAt: string
  updatedAt: string
}

export function getStudents() {
  return request<Student[]>({ url: '/students' })
}

export function getStudent(id: string) {
  return request<Student>({ url: `/students/${id}` })
}

export function createStudent(data: { name: string; avatar?: string }) {
  return request<Student>({ url: '/students', method: 'POST', data })
}

export function updateStudent(id: string, data: { name?: string; avatar?: string; points?: number }) {
  return request<Student>({ url: `/students/${id}`, method: 'PUT', data })
}

export function deleteStudent(id: string) {
  return request({ url: `/students/${id}`, method: 'DELETE' })
}
