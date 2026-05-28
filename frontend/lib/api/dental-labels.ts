/**
 * 牙位图标签 API
 */
import { get, post, patch, del } from './client'

export interface DentalLabel {
  id: number
  label_id: string
  label: string
  label_type: 'color' | 'symbol'
  value: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface DentalLabelCreate {
  label: string
  label_type: 'color' | 'symbol'
  value: string
  color?: string
  is_active?: boolean
}

/** 获取所有牙位图标签 */
export const getDentalLabelsApi = () =>
  get<DentalLabel[]>('/dental-labels/')

/** 创建牙位图标签（仅管理员） */
export const createDentalLabelApi = (data: DentalLabelCreate) =>
  post<DentalLabel>('/dental-labels/', data)

/** 更新牙位图标签（仅管理员） */
export const updateDentalLabelApi = (id: number, data: Partial<DentalLabelCreate>) =>
  patch<DentalLabel>(`/dental-labels/${id}/`, data)

/** 删除牙位图标签（仅管理员） */
export const deleteDentalLabelApi = (id: number) =>
  del(`/dental-labels/${id}/`)
