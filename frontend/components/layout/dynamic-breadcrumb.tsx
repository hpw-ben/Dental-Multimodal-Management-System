"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"
import { getProjectApi } from "@/lib/api/projects"
import { getPatientApi } from "@/lib/api/patients"

const routeMap: Record<string, string> = {
  dashboard: "仪表盘",
  projects: "课题管理",
  patients: "患者列表",
  settings: "系统设置",
  users: "用户管理",
  notifications: "通知中心",
  "dental-labels": "牙位标签管理",
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  
  // Split pathname into segments, filter empty strings
  const segments = pathname.split("/").filter(Boolean)
  
  // 检查是否是项目详情页（提取 projectId）
  const projectIdIndex = segments.findIndex((seg, idx) => segments[idx - 1] === 'projects' && !routeMap[seg])
  const projectId = projectIdIndex >= 0 ? segments[projectIdIndex] : null
  
  // 检查是否是患者详情页（提取 patientId）
  const patientIdIndex = segments.findIndex((seg, idx) => segments[idx - 1] === 'patients' && !routeMap[seg])
  const patientId = patientIdIndex >= 0 ? segments[patientIdIndex] : null

  // 判断是否是嵌套路由：/projects/[id]/patients/[pid]
  const isNestedPatient = !!projectId && !!patientId
  
  // 获取项目详情（用于显示项目名称）
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProjectApi(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })

  // 获取患者详情（用于显示患者姓名）
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientApi(patientId!),
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  })

  const breadcrumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    let label = routeMap[segment] || segment
    let skip = false
    
    // 项目 ID → 显示项目名称
    if (segments[index - 1] === 'projects' && !routeMap[segment]) {
        label = project?.title || "加载中..."
    }
    
    // 患者 ID → 显示患者姓名
    if (segments[index - 1] === 'patients' && !routeMap[segment]) {
        label = patient?.name || "加载中..."
    }

    // 嵌套路由中，跳过中间的 "patients" 文字段（不显示"患者列表"）
    if (isNestedPatient && segment === 'patients' && index > 0 && segments[index - 1] !== undefined && !routeMap[segments[index - 1]]) {
        skip = true
    }

    const isLast = index === segments.length - 1

    return { href, label, isLast, skip }
  })

  // Always prepend Home, filter skipped segments
  const items = [
    { href: "/", label: "首页", isHome: true, isLast: breadcrumbs.length === 0 },
    ...breadcrumbs
      .filter(b => b.href !== '/' && b.href !== '/dashboard' && !b.skip)
      .map(b => ({ ...b, isHome: false })),
  ]

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <React.Fragment key={item.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                   <Link href={item.href} className="flex items-center">
                     {item.isHome && <Home className="mr-1 h-3 w-3" />}
                     {!item.isHome ? item.label : "首页"}
                   </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
