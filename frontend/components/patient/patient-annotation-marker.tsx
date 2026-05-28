"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import {
  Annotation,
  getAnnotations,
  createAnnotation,
  deleteAnnotation,
} from "@/lib/api/annotations"
import { getMeApi } from "@/lib/api/auth"
import { markNotificationAsRead } from "@/lib/api/notifications"
import { MoreHorizontal, AlertCircle, XCircle, MessageSquare } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AnnotationDialog } from "@/components/shared/annotation-dialog"

interface PatientAnnotationMarkerProps {
  patientId: string
  patientName?: string
}

type MarkerStatus = "normal" | "abnormal" | "missing"

export function PatientAnnotationMarker({ patientId, patientName }: PatientAnnotationMarkerProps) {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [newAnnotationContent, setNewAnnotationContent] = React.useState("")
  const [selectedAnnotation, setSelectedAnnotation] = React.useState<Annotation | null>(null)
  const [unmarkDialogOpen, setUnmarkDialogOpen] = React.useState(false)

  // 获取当前登录用户信息
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getMeApi,
  })

  // 获取该患者的所有标注
  const { data: annotations = [], isLoading, isError } = useQuery({
    queryKey: ['annotations', patientId],
    queryFn: () => getAnnotations(patientId),
    // 当对话框打开时，启用轮询（每5秒刷新一次）
    refetchInterval: dialogOpen ? 5000 : false,
    refetchIntervalInBackground: false,
    enabled: !!patientId,
  })

  // 当annotations更新时，同步更新selectedAnnotation（轮询时自动更新对话框内容）
  React.useEffect(() => {
    if (dialogOpen && selectedAnnotation && annotations.length > 0) {
      const updatedAnnotation = annotations.find(a => a.id === selectedAnnotation.id)
      if (updatedAnnotation) {
        setSelectedAnnotation(updatedAnnotation)
      }
    }
  }, [annotations, dialogOpen, selectedAnnotation])

  // 处理URL参数：自动打开指定的标注
  React.useEffect(() => {
    const annotationId = searchParams.get('annotation')
    if (annotationId && annotations.length > 0 && !dialogOpen) {
      const annotation = annotations.find(a => a.id === annotationId)
      if (annotation) {
        setSelectedAnnotation(annotation)
        setDialogOpen(true)
        // 标记为已读
        markNotificationAsRead(annotationId).catch(() => {
          // 静默失败，已读标记不影响用户体验
        })
        // 刷新通知统计
        queryClient.invalidateQueries({ queryKey: ['notificationStats'] })
      }
    }
  }, [searchParams, annotations, dialogOpen, queryClient])

  // 计算当前标记状态
  const markerStatus: MarkerStatus = React.useMemo(() => {
    // 如果正在加载或查询失败，返回normal
    if (isLoading || isError) return "normal"
    if (!annotations || annotations.length === 0) return "normal"
    
    // 根据标注内容判断
    const firstAnnotation = annotations[0]
    if (firstAnnotation?.content?.includes("缺失") || firstAnnotation?.content?.includes("数据缺失")) {
      return "missing"
    }
    return "abnormal"
  }, [annotations, isLoading, isError])

  // 创建标注
  const createAnnotationMutation = useMutation({
    mutationFn: (content: string) => createAnnotation({ patient: patientId, content }),
    onSuccess: (newAnnotation) => {
      queryClient.invalidateQueries({ queryKey: ['annotations', patientId] })
      toast.success('标记成功')
      // 打开对话框显示新创建的标注
      setSelectedAnnotation(newAnnotation)
      setDialogOpen(true)
    },
    onError: () => {
      toast.error('标记失败')
    },
  })

  // 删除标注
  const deleteAnnotationMutation = useMutation({
    mutationFn: (annotationId: string) => deleteAnnotation(annotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotations', patientId] })
      toast.success('已解除标记')
      setDialogOpen(false)
      setSelectedAnnotation(null)
    },
    onError: () => {
      toast.error('操作失败')
    },
  })

  // 标记为异常
  const handleMarkAbnormal = () => {
    setNewAnnotationContent("")
    setCreateDialogOpen(true)
  }

  // 标记为缺失
  const handleMarkMissing = () => {
    createAnnotationMutation.mutate("数据缺失")
  }
  
  // 提交创建标注
  const handleSubmitAnnotation = () => {
    if (newAnnotationContent.trim()) {
      createAnnotationMutation.mutate(newAnnotationContent.trim())
      setCreateDialogOpen(false)
      setNewAnnotationContent("")
    }
  }

  // 解除标记
  const handleUnmark = () => {
    setUnmarkDialogOpen(true)
  }

  // 确认解除标记
  const handleConfirmUnmark = () => {
    if (annotations.length > 0) {
      annotations.forEach(ann => {
        deleteAnnotationMutation.mutate(ann.id)
      })
    }
    setUnmarkDialogOpen(false)
  }

  // 打开对话
  const handleOpenDialog = () => {
    if (annotations.length > 0) {
      setSelectedAnnotation(annotations[0])
      setDialogOpen(true)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {markerStatus === "normal" ? (
          // 只有研究员可以标记患者
          currentUser?.role === "researcher" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  标记患者
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleMarkAbnormal}>
                  <AlertCircle className="mr-2 h-4 w-4 text-orange-500" />
                  标记为异常
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMarkMissing}>
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  标记为缺失
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        ) : (
          <>
            <Badge
              variant={markerStatus === "abnormal" ? "destructive" : "secondary"}
              className="cursor-pointer"
              onClick={handleOpenDialog}
            >
              {markerStatus === "abnormal" ? (
                <>
                  <AlertCircle className="mr-1 h-3 w-3" />
                  异常
                </>
              ) : (
                <>
                  <XCircle className="mr-1 h-3 w-3" />
                  缺失
                </>
              )}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleOpenDialog}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  查看对话
                </DropdownMenuItem>
                {/* 只有研究员可以解除标记 */}
                {currentUser?.role === "researcher" && (
                  <DropdownMenuItem onClick={handleUnmark} className="text-red-600">
                    <XCircle className="mr-2 h-4 w-4" />
                    解除标记
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {/* 使用新的AnnotationDialog组件 */}
      <AnnotationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        annotation={selectedAnnotation}
        currentUserId={currentUser?.id}
        patientName={patientName}
      />

      {/* 创建标注 Dialog - 只有研究员可以使用 */}
      {currentUser?.role === "researcher" && (
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>标记异常情况</DialogTitle>
              <DialogDescription>
                请描述发现的异常情况
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <Textarea
                value={newAnnotationContent}
                onChange={(e) => setNewAnnotationContent(e.target.value)}
                placeholder="请描述发现的异常情况..."
                rows={4}
                className="resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSubmitAnnotation()
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false)
                    setNewAnnotationContent("")
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSubmitAnnotation}
                  disabled={!newAnnotationContent.trim() || createAnnotationMutation.isPending}
                >
                  {createAnnotationMutation.isPending ? "提交中..." : "提交"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 解除标记确认对话框 */}
      <ConfirmDialog
        open={unmarkDialogOpen}
        onOpenChange={setUnmarkDialogOpen}
        title="取消标记"
        description="确定要取消所有标记吗？这将删除所有相关对话记录"
        confirmText="确定"
        variant="destructive"
        onConfirm={handleConfirmUnmark}
      />
    </>
  )
}
