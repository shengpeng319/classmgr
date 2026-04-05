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
  createdAt: string
  updatedAt: string
}

export function getCards() {
  return request<Card[]>({ url: '/cards' })
}

export function drawCard(studentId: string) {
  return request<Card>({ url: '/lottery/draw', method: 'POST', data: { studentId } })
}
