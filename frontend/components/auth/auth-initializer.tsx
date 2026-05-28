"use client"

/**
 * AuthInitializer — 全局认证初始化组件
 *
 * 每次进入 (main) 布局时，立即向后端验证当前 session 中的用户身份。
 * 在验证结果返回之前，渲染全屏 Spinner，防止侧边栏和各页面以"无角色"状态
 * 短暂渲染后再因角色数据到位而重绘（即闪现问题）。
 *
 * 设计要点：
 * - 始终调用 getMeApi()，不依赖 localStorage 中的角色缓存
 * - 调用完成后更新 Zustand store，后续所有组件直接读取 store
 * - 若后端返回 401（session 失效），中间件会在下次导航时重定向登录页
 */

import React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { getMeApi } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { useAuthStore } from "@/lib/store/auth-store"

interface AuthInitializerProps {
  children: React.ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const router = useRouter()
  const { setUser, clearUser } = useAuthStore()

  // 每次进入 main layout 时，立即从后端确认身份和角色
  // staleTime: 0 确保每次导航都重新验证（配合 layout 的 mount 行为）
  const { isLoading, error } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = await getMeApi()
      setUser(user)
      return user
    },
    staleTime: 5 * 60 * 1000, // 5分钟内无需重复请求
    retry: false,
  })

  const hasAuthError = error instanceof ApiError && [401, 403].includes(error.status)

  React.useEffect(() => {
    if (!hasAuthError) {
      return
    }

    clearUser()
    router.replace("/login")
  }, [clearUser, hasAuthError, router])

  // 用户身份确认中：显示全屏加载动画，阻止任何角色相关 UI 渲染
  if (isLoading || hasAuthError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-muted-foreground">加载中...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
