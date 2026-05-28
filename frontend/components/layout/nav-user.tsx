"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Bell,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/lib/store/auth-store"
import { logoutApi, getMeApi } from "@/lib/api/auth"
import { getNotificationStats } from "@/lib/api/notifications"
import { Badge } from "@/components/ui/badge"

export function NavUser() {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const { user, setUser, clearUser } = useAuthStore()

  // 当 user 为 null 时，尝试从后端恢复用户信息
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await getMeApi()
      setUser(userData)
      return userData
    },
    enabled: !user,
    retry: false,
    staleTime: Infinity,
  })

  // 获取通知统计
  const { data: notificationStats } = useQuery({
    queryKey: ['notificationStats'],
    queryFn: getNotificationStats,
    enabled: !!user,
    refetchInterval: 30000, // 每30秒刷新一次
  })

  const unreadCount = notificationStats?.unread_count || 0

  // 登出 mutation
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // 清除用户状态
      clearUser()
      // 跳转到登录页
      router.push("/login")
    },
    onError: () => {
      // 即使登出失败也清除本地状态
      clearUser()
      router.push("/login")
    },
  })

  const handleLogout = () => {
    logoutMutation.mutate()
  }

  // 如果没有用户信息，显示占位符
  if (!user) {
    return null
  }

  // 获取用户名首字母作为头像占位
  const getInitials = (name: string) => {
    return name.slice(0, 1).toUpperCase()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar || undefined} alt={user.username} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.username}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={user.username} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.username}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* 通知菜单项 */}
            {['doctor', 'researcher'].includes(user.role) ? (
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => router.push('/notifications')}
              >
                <Bell className="mr-2 h-4 w-4" />
                <span>通知中心</span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {unreadCount}
                  </Badge>
                )}
              </DropdownMenuItem>
            ) : null}
            
            {['doctor', 'researcher'].includes(user.role) && <DropdownMenuSeparator />}
            
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "退出中..." : "退出登录"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
