"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { CreateProjectDialog } from "@/components/project/create-project-dialog"
import { EditProjectDialog } from "@/components/project/edit-project-dialog"
import { ProjectCard } from "@/components/project/project-card"
import { getProjectsApi, deleteProjectApi, type ProjectListItem } from "@/lib/api/projects"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"
import { RequireRole } from "@/components/auth/require-role"
import { useAuthStore } from "@/lib/store/auth-store"

export default function ProjectsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  // 只有研究员可以创建课题
  const canCreate = user?.role === 'researcher'

  // 搜索状态
  const [searchQuery, setSearchQuery] = React.useState("")
  // 编辑状态
  const [editTarget, setEditTarget] = React.useState<ProjectListItem | null>(null)
  // 删除状态
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectListItem | null>(null)
  // 延迟显示骨架屏，避免加载太快一闪而过
  const [showSkeleton, setShowSkeleton] = React.useState(false)

  // 获取项目列表（带搜索参数）
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', searchQuery],
    queryFn: () => getProjectsApi({ search: searchQuery || undefined }),
  })

  const projects = data?.results || []

  // 300ms 延迟后才显示骨架屏
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), 300)
      return () => clearTimeout(timer)
    }
    setShowSkeleton(false)
  }, [isLoading])

  // 删除课题 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProjectApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('课题已删除')
      setDeleteTarget(null)
    },
    onError: (err: Error) => {
      toast.error(`删除失败：${err.message || '请稍后重试'}`)
    },
  })

  return (
    <RequireRole 
      allowedRoles={['researcher', 'doctor']}
      denyMessage="管理员没有查看课题列表的权限。如需访问课题数据，请联系研究员或医生。"
    >
      <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">课题管理</h1>
        </div>
        {canCreate && <CreateProjectDialog />}
      </div>

      {/* 搜索框 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索课题名称、描述或成员..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 加载状态 */}
      {isLoading && showSkeleton && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col min-h-[320px] border rounded-lg p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-2">加载失败</p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : '请稍后重试'}
            </p>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-blue-50 p-4 mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无课题</h3>
          <p className="text-muted-foreground mb-4">开始创建您的第一个科研课题</p>
          {canCreate && <CreateProjectDialog />}
        </div>
      )}

      {/* 项目列表 */}
      {!isLoading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* 编辑课题弹窗 */}
      {editTarget && (
        <EditProjectDialog
          projectId={editTarget.id}
          initialTitle={editTarget.title}
          initialDescription={editTarget.description}
          open={!!editTarget}
          onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        />
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="删除课题"
        description={`确定要删除课题「${deleteTarget?.title}」吗？\n此操作不可恢复，课题内的患者关联将被解除。`}
        confirmText="删除"
        variant="destructive"
        disabled={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id)
          }
        }}
      />
      </div>
    </RequireRole>
  )
}
