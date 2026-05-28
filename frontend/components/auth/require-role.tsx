import React from "react"
import { useAuthStore } from "@/lib/store/auth-store"

/**
 * 角色权限守卫组件
 *
 * 前提：AuthInitializer 已在父层（main layout）保证 user 已从后端加载完毕。
 * 此组件只做角色判断，不发起任何网络请求。
 */
export function RequireRole({ 
  allowedRoles, 
  children, 
  denyMessage = "无访问权限" 
}: { 
  allowedRoles: string[]
  children: React.ReactNode
  denyMessage?: string
}) {
  const { user } = useAuthStore()

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="rounded-full bg-red-50 p-4 mb-4 inline-block">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">无访问权限</h3>
          <p className="text-muted-foreground mb-4">{denyMessage}</p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
