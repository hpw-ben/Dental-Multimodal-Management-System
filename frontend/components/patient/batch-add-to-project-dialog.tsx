"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FolderPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { getProjectsApi, batchAddPatientsApi } from "@/lib/api/projects"
import { toast } from "sonner"

interface BatchAddToProjectDialogProps {
  patientIds: string[]
  onSuccess?: () => void
}

export function BatchAddToProjectDialog({ patientIds, onSuccess }: BatchAddToProjectDialogProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("")

  // 获取用户所属的课题列表
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjectsApi(),
    enabled: open,
  })

  const projects = projectsData?.results || []

  const batchMutation = useMutation({
    mutationFn: ({ projectId, patientIds }: { projectId: string; patientIds: string[] }) =>
      batchAddPatientsApi(projectId, patientIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', selectedProjectId] })
      toast.success(data.message)
      setOpen(false)
      setSelectedProjectId("")
      onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(`添加失败：${err.message || '请稍后重试'}`)
    },
  })

  const handleSubmit = () => {
    if (!selectedProjectId) {
      toast.error('请选择一个课题')
      return
    }
    batchMutation.mutate({ projectId: selectedProjectId, patientIds })
  }

  const isLoading = batchMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
          <FolderPlus className="mr-2 h-4 w-4" />
          添加至课题 ({patientIds.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>添加患者至课题</DialogTitle>
          <DialogDescription>
            将选中的 {patientIds.length} 位患者添加到以下课题中。已存在的患者会自动跳过。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoadingProjects ? (
            <div className="text-center text-muted-foreground py-8">加载课题列表...</div>
          ) : projects.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无可用课题，请先创建或加入课题。
            </div>
          ) : (
            <RadioGroup value={selectedProjectId} onValueChange={setSelectedProjectId} className="gap-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <RadioGroupItem value={project.id} id={`project-${project.id}`} />
                  <Label htmlFor={`project-${project.id}`} className="flex-1 cursor-pointer">
                    <div className="font-medium">{project.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {project.description || '暂无描述'}
                    </div>
                  </Label>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {project.patient_count} 位患者
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            取消
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={isLoading || !selectedProjectId || projects.length === 0}
          >
            {isLoading ? "添加中..." : "确认添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
