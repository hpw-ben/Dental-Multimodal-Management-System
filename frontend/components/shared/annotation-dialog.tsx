"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { toast } from "sonner"
import { addReply } from "@/lib/api/annotations"
import type { Annotation } from "@/lib/api/annotations"

interface AnnotationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  annotation: Annotation | null
  currentUserId?: number
  patientName?: string
}

export function AnnotationDialog({
  open,
  onOpenChange,
  annotation,
  currentUserId,
  patientName,
}: AnnotationDialogProps) {
  const queryClient = useQueryClient()
  const [newReply, setNewReply] = React.useState("")
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 当对话框打开或消息更新时，滚动到底部
  React.useEffect(() => {
    if (open && annotation) {
      // 延迟滚动，确保DOM已渲染
      setTimeout(scrollToBottom, 100)
    }
  }, [open, annotation?.replies.length, annotation])

  const addReplyMutation = useMutation({
    mutationFn: ({ annotationId, content }: { annotationId: string; content: string }) =>
      addReply(annotationId, { content }),
    onSuccess: () => {
      setNewReply("")
      queryClient.invalidateQueries({ queryKey: ['annotation', annotation?.id] })
      queryClient.invalidateQueries({ queryKey: ['annotations'] })
      // 发送后滚动到底部
      setTimeout(scrollToBottom, 100)
    },
    onError: () => {
      toast.error('回复失败，请重试')
    }
  })

  const handleSendReply = () => {
    if (annotation && newReply.trim()) {
      addReplyMutation.mutate({
        annotationId: annotation.id,
        content: newReply.trim(),
      })
    }
  }

  if (!annotation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>
            对话窗口
          </DialogTitle>
        </DialogHeader>

        {/* 消息区域 */}
        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 px-6 py-4 max-h-[calc(80vh-180px)] overflow-hidden"
        >
          <div className="space-y-4">
            {/* 原始标注 */}
            {(() => {
              const isCurrentUser = annotation.created_by === currentUserId
              return (
                <div className={`flex gap-3 items-start ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    {annotation.created_by_avatar && (
                      <AvatarImage src={annotation.created_by_avatar || undefined} alt={annotation.created_by_name} />
                    )}
                    <AvatarFallback className={isCurrentUser ? "bg-blue-500 text-white text-xs" : "bg-orange-500 text-white text-xs"}>
                      {annotation.created_by_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{annotation.created_by_name}</span>
                      <Badge variant="outline" className="text-xs h-5">
                        {annotation.created_by_role === 'doctor' ? '医生' : '研究员'}
                      </Badge>
                    </div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      isCurrentUser 
                        ? 'bg-blue-500 text-white rounded-tr-sm' 
                        : 'bg-orange-50 border border-orange-200 text-gray-800 rounded-tl-sm'
                    }`}>
                      <p className="text-sm break-words">{annotation.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground px-1">
                      {formatDistanceToNow(new Date(annotation.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                </div>
              )
            })()}

            {/* 回复列表 */}
            {annotation.replies.map((reply) => {
              const isCurrentUser = reply.created_by === currentUserId
              return (
                <div key={reply.id} className={`flex gap-3 items-start ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    {reply.created_by_avatar && (
                      <AvatarImage src={reply.created_by_avatar || undefined} alt={reply.created_by_name} />
                    )}
                    <AvatarFallback className={isCurrentUser ? "bg-blue-500 text-white text-xs" : "bg-slate-500 text-white text-xs"}>
                      {reply.created_by_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{reply.created_by_name}</span>
                      <Badge variant="secondary" className="text-xs h-5">
                        {reply.created_by_role === 'doctor' ? '医生' : '研究员'}
                      </Badge>
                    </div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      isCurrentUser 
                        ? 'bg-blue-500 text-white rounded-tr-sm' 
                        : 'bg-slate-100 text-gray-800 rounded-tl-sm'
                    }`}>
                      <p className="text-sm break-words">{reply.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground px-1">
                      {formatDistanceToNow(new Date(reply.created_at), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* 滚动锚点 */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* 输入区域 */}
        <div className="px-6 py-4 border-t bg-slate-50/50">
          <div className="flex gap-2 items-end">
            <Textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="输入内容 (Enter发送，Shift+Enter换行)"
              rows={2}
              className="flex-1 resize-none bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendReply()
                }
              }}
            />
            <Button
              onClick={handleSendReply}
              disabled={!newReply.trim() || addReplyMutation.isPending}
              size="icon"
              className="h-10 w-10 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
