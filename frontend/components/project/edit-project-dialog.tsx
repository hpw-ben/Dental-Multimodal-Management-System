"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateProjectApi } from "@/lib/api/projects"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

interface EditProjectDialogProps {
  projectId: string
  initialTitle: string
  initialDescription: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProjectDialog({
  projectId,
  initialTitle,
  initialDescription,
  open,
  onOpenChange,
}: EditProjectDialogProps) {
  const queryClient = useQueryClient()

  const [title, setTitle] = React.useState(initialTitle)
  const [description, setDescription] = React.useState(initialDescription)
  const [error, setError] = React.useState("")

  // 同步外部数据变化
  React.useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setDescription(initialDescription)
      setError("")
    }
  }, [open, initialTitle, initialDescription])

  const updateMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      updateProjectApi(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('课题信息已更新')
      onOpenChange(false)
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('更新失败，请稍后重试')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim()) {
      setError("请输入课题名称")
      return
    }

    if (!description.trim()) {
      setError("请输入课题描述")
      return
    }

    updateMutation.mutate({
      title: title.trim(),
      description: description.trim(),
    })
  }

  const isLoading = updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>编辑课题</DialogTitle>
            <DialogDescription>
              修改课题的名称和描述信息。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">课题名称 <span className="text-red-500">*</span></Label>
              <Input
                id="edit-title"
                placeholder="请输入课题名称"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">课题描述 <span className="text-red-500">*</span></Label>
              <Textarea
                id="edit-description"
                placeholder="描述该课题的研究目标、方法论以及预期成果..."
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isLoading}>
              取消
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存修改"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
