"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from "@/lib/api/notifications"
import { getAnnotations } from "@/lib/api/annotations"
import { getMeApi } from "@/lib/api/auth"
import { useNotificationColumns } from "./notification-columns"
import { DataTable } from "@/components/shared/data-table"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { AnnotationDialog } from "@/components/shared/annotation-dialog"

export function NotificationsTable() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 30000, // 每30秒刷新
  })

  // 获取当前用户
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getMeApi,
  })

  // 获取选中通知的完整标注信息
  const { data: annotationDetails } = useQuery({
    queryKey: ['annotation', selectedNotification?.id],
    queryFn: async () => {
      if (!selectedNotification) return null
      const annotations = await getAnnotations(selectedNotification.patient_id)
      return annotations.find(a => a.id === selectedNotification.id) || null
    },
    enabled: !!selectedNotification && dialogOpen,
    refetchInterval: dialogOpen ? 5000 : false, // 对话框打开时轮询
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: (data) => {
      toast.success(`已标记 ${data.count} 条通知为已读`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationStats'] })
    },
    onError: () => {
      toast.error('标记失败，请重试')
    }
  })

  const handleViewAnnotation = async (notification: Notification) => {
    setSelectedNotification(notification)
    setDialogOpen(true)
    
    // 标记为已读
    try {
      await markNotificationAsRead(notification.id)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notificationStats'] })
    } catch {
      // 静默失败
    }
  }

  // 整行点击跳转到患者详情页
  const handleRowClick = (notification: Notification) => {
    router.push(`/patients/${notification.patient_id}`)
  }

  const columns = useNotificationColumns({ onViewAnnotation: handleViewAnnotation })

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {notifications.length} 条通知，{unreadCount} 条未读
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  标记中...
                </>
              ) : (
                '全部已读'
              )}
            </Button>
          )}
        </div>

        <DataTable 
          columns={columns} 
          data={notifications}
          onRowClick={handleRowClick}
        />
      </div>

      {/* 使用新的AnnotationDialog组件 */}
      <AnnotationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        annotation={annotationDetails}
        currentUserId={currentUser?.id}
        patientName={selectedNotification?.patient_name}
      />
    </>
  )
}
