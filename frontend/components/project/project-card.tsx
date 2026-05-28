"use client"

import * as React from "react"
import { Calendar, MoreVertical, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ProjectListItem } from "@/lib/api/projects"

interface ProjectCardProps {
  project: ProjectListItem
  onEdit?: (project: ProjectListItem) => void
  onDelete?: (project: ProjectListItem) => void
}

/**
 * 格式化日期显示
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <div className="relative h-full">
      <Link href={`/projects/${project.id}`} className="block h-full">
        <Card className="flex flex-col min-h-[320px] border-l-4 border-l-blue-600 shadow-sm transition-all hover:shadow-md h-full">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1 pr-8">
                <CardTitle className="text-xl text-blue-900 group-hover:text-blue-700 transition-colors">
                  {project.title}
                </CardTitle>
                <CardDescription className="line-clamp-4 leading-relaxed">
                  {project.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
               <div className="flex items-center gap-1">
                 <Calendar className="h-4 w-4" />
                 <span>创建时间: {formatDate(project.created_at)}</span>
               </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-slate-50/50 p-4">
            <div className="flex w-full items-center justify-between">
               {/* 负责人信息 */}
               {project.principal ? (
                 <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarImage src={project.principal.avatar || undefined} alt={project.principal.name} />
                      <AvatarFallback className="text-base">{project.principal.name?.slice(0, 1) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{project.principal.name}</span>
                        <span className="text-xs text-muted-foreground">项目负责人</span>
                    </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarFallback className="text-base">?</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-400">暂无负责人</span>
                    </div>
                 </div>
               )}
               
               {/* 患者数量 */}
               <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <span className="text-sm font-bold leading-none">{project.patient_count}</span>
                  <span className="text-[11px] opacity-80">患者</span>
               </div>
            </div>
          </CardFooter>
        </Card>
      </Link>

      {/* 操作菜单 — 绝对定位在卡片右上角，阻止冒泡避免触发 Link 跳转 */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.preventDefault()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-slate-100"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑课题
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onDelete(project)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除课题
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
