"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  FolderKanban,
  LayoutDashboard,
  Loader2,
  Palette,
  Plus,
  Settings,
  Shield,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { getPatientsApi, type PatientListItem } from "@/lib/api/patients"
import { getProjectsApi, type ProjectListItem } from "@/lib/api/projects"

// 静态页面导航
const PAGE_ITEMS = [
  { label: "首页", icon: LayoutDashboard, path: "/", keywords: "首页 dashboard home 仪表盘" },
  { label: "课题列表", icon: FolderKanban, path: "/projects", keywords: "课题 项目 project" },
  { label: "患者列表", icon: Users, path: "/patients", keywords: "患者 patient 病人" },
  { label: "设置中心", icon: Settings, path: "/settings", keywords: "设置 setting 配置" },
  { label: "用户管理", icon: UserCog, path: "/settings/users", keywords: "用户 管理 admin user" },
]

// 设置子页面
const SETTING_ITEMS = [
  { label: "外观与显示", icon: Palette, path: "/settings", tab: "display", keywords: "主题 外观 显示 头像 theme display" },
  { label: "安全与隐私", icon: Shield, path: "/settings", tab: "security", keywords: "密码 邮箱 安全 隐私 注销 security password" },
]

// 快捷操作
const ACTION_ITEMS = [
  { label: "新建课题", icon: Plus, path: "/projects?action=create", keywords: "新建 创建 课题 项目 create project" },
  { label: "录入患者", icon: UserPlus, path: "/patients?action=create", keywords: "录入 新建 患者 create patient" },
]

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [patients, setPatients] = React.useState<PatientListItem[]>([])
  const [projects, setProjects] = React.useState<ProjectListItem[]>([])

  // 防抖搜索
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setPatients([])
      setProjects([])
      return
    }
  }, [open])

  React.useEffect(() => {
    if (!query.trim()) {
      setPatients([])
      setProjects([])
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const [patientsRes, projectsRes] = await Promise.all([
          getPatientsApi({ search: query.trim() }),
          getProjectsApi({ search: query.trim() }),
        ])
        setPatients(patientsRes.results.slice(0, 6))
        setProjects(projectsRes.results.slice(0, 4))
      } catch {
        // 静默处理搜索错误
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  const handleSelect = (path: string) => {
    onOpenChange(false)
    router.push(path)
  }

  const hasQuery = query.trim().length > 0
  const hasDynamicResults = patients.length > 0 || projects.length > 0

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="全局搜索"
      description="搜索页面、课题、患者、设置等"
    >
      <CommandInput
        placeholder="搜索页面、课题、患者、病历号、诊断..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">搜索中...</span>
          </div>
        )}

        {!isLoading && hasQuery && !hasDynamicResults && (
          <CommandEmpty>未找到相关结果</CommandEmpty>
        )}

        {/* 搜索建议：页面导航 */}
        <CommandGroup heading="页面">
          {PAGE_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              value={`page-${item.label}-${item.keywords}`}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* 搜索建议：设置 */}
        <CommandGroup heading="设置">
          {SETTING_ITEMS.map((item) => (
            <CommandItem
              key={`setting-${item.tab}`}
              value={`setting-${item.label}-${item.keywords}`}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* 快捷操作 */}
        <CommandGroup heading="快捷操作">
          {ACTION_ITEMS.map((item) => (
            <CommandItem
              key={item.path}
              value={`action-${item.label}-${item.keywords}`}
              onSelect={() => handleSelect(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* 动态搜索结果：课题 */}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="课题">
              {projects.map((project) => (
                <CommandItem
                  key={`project-${project.id}`}
                  value={`project-${project.title}-${project.description}-${project.id}`}
                  onSelect={() => handleSelect(`/projects/${project.id}`)}
                >
                  <FolderKanban className="mr-2 h-4 w-4 text-blue-500" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{project.title}</span>
                    {project.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {project.description}
                      </span>
                    )}
                  </div>
                  <CommandShortcut>{project.patient_count} 名患者</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* 动态搜索结果：患者 */}
        {patients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="患者">
              {patients.map((patient) => (
                <CommandItem
                  key={`patient-${patient.id}`}
                  value={`patient-${patient.name}-${patient.case_number}-${patient.clinical_diagnosis}-${patient.id}`}
                  onSelect={() => handleSelect(`/patients/${patient.id}`)}
                >
                  <Users className="mr-2 h-4 w-4 text-green-500" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium">
                      {patient.name}
                      <span className="ml-2 font-normal text-xs text-muted-foreground">{patient.case_number}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {patient.gender === "Male" ? "男" : "女"} · {patient.clinical_diagnosis || "暂无诊断"}
                    </span>
                  </div>
                  <CommandShortcut>{patient.status}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
