import { request } from '@/utils/request'

export interface Card {
  id: string
  name: string
  description?: string
  rarity: string
  image?: string
  pointsCost: number
  stock: number
  isActive: boolean
}

export interface Student {
  id: string
  name: string
  avatar?: string
  points: number
  userId?: string
}

export interface DrawResult {
  card: Card
  remainingPoints: number
}

export interface StudentCard {
  id: string
  studentId: string
  cardId: string
  drawnAt: string
  card: Card
}

export function getLotteryStudent() {
  return request<Student>({ url: '/lottery/student' })
}

export function getLotteryCards() {
  return request<Card[]>({ url: '/lottery/cards' })
}

export function drawCard() {
  return request<DrawResult>({ url: '/lottery/draw', method: 'POST' })
}

export function getMyCards() {
  return request<StudentCard[]>({ url: '/lottery/my-cards' })
}

export function getLotteryHistory() {
  return request<StudentCard[]>({ url: '/lottery/history' })
}
