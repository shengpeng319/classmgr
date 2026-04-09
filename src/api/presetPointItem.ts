import { request } from '@/utils/request'

export interface PresetPointItem {
  id: string
  label: string
  points: number
  type: 'add' | 'subtract'
  icon?: string
  color?: string
  sortOrder: number
}

export function getPresetPointItems(type?: 'add' | 'subtract') {
  let url = '/admin/points/preset-items'
  if (type) url += `?type=${type}`
  return request<PresetPointItem[]>({ url })
}

export function createPresetPointItem(data: { label: string; points: number; type: 'add' | 'subtract'; icon?: string; color?: string }) {
  return request<PresetPointItem>({ url: '/admin/points/preset-items', method: 'POST', data })
}

export function updatePresetPointItem(id: string, data: Partial<PresetPointItem>) {
  return request<PresetPointItem>({ url: `/admin/points/preset-items/${id}`, method: 'PUT', data })
}

export function deletePresetPointItem(id: string) {
  return request({ url: `/admin/points/preset-items/${id}`, method: 'DELETE' })
}