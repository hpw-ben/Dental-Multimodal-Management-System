"use client"

import * as React from "react"
import {
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  UserCog,
} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavSecondary, type NavSecondaryItem } from "@/components/layout/nav-secondary"
import { NavUser } from "@/components/layout/nav-user"
import { SearchDialog } from "@/components/layout/search-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/lib/store/auth-store"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuthStore()
  const [searchOpen, setSearchOpen] = React.useState(false)

  // Ctrl+K / Cmd+K 全局快捷键打开搜索
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // 根据用户角色构建主导航菜单
  const navMainItems = React.useMemo(() => {
    const items = [
      { title: "首页", url: "/", icon: LayoutDashboard },
    ]
    
    // 管理员不显示课题和患者菜单
    if (user?.role !== "admin") {
      items.push(
        { title: "课题", url: "/projects", icon: FolderKanban },
        { title: "患者", url: "/patients", icon: Users },
      )
    }
    
    return items
  }, [user?.role])

  // 根据用户角色构建次要导航菜单
  const navSecondaryItems = React.useMemo<NavSecondaryItem[]>(() => {
    const items: NavSecondaryItem[] = [
      { title: "搜索", url: "#", icon: Search, onClick: () => setSearchOpen(true), shortcut: "⌘K" },
    ]
    if (user?.role === "admin") {
      items.push({ title: "用户管理", url: "/settings/users", icon: UserCog })
    }
    items.push({ title: "设置", url: "/settings", icon: Settings })
    return items
  }, [user?.role])

  return (
    <>
      <Sidebar collapsible="icon" className="border-r-0" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <span className="font-bold">S</span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">数字口腔多模态管理系统</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <NavMain items={navMainItems} />
          <NavSecondary items={navSecondaryItems} className="mt-auto" />
        </SidebarContent>

        <SidebarFooter>
           <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
