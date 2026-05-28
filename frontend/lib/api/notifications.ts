import { get, post } from './client'

export interface Notification {
  id: string
  patient_id: string
  patient_name: string
  title: string
  created_by_name: string
  created_at: string
  is_read: boolean
}

export interface NotificationStats {
  unread_count: number
}

/**
 * 获取通知统计
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  return get<NotificationStats>('/annotations/notification-stats/')
}

/**
 * 获取通知列表
 */
export async function getNotifications(): Promise<Notification[]> {
  const response = await get<{ results: Notification[] }>('/annotations/notifications/')
  return response.results
}

/**
 * 标记通知已读
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await post<void>(`/annotations/${notificationId}/mark-as-read/`)
}

/**
 * 全部标记已读
 */
export async function markAllNotificationsAsRead(): Promise<{ detail: string; count: number }> {
  return post<{ detail: string; count: number }>('/annotations/mark-all-read/')
}
