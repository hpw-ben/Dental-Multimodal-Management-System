"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { loginApi, type LoginRequest } from "@/lib/api/auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { ApiError } from "@/lib/api/client"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")

  // Zustand store
  const { setUser, setRememberMe: setStoreRememberMe } = useAuthStore()

  // 登录 mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => loginApi(data),
    onSuccess: (response) => {
      // 设置记住我状态
      setStoreRememberMe(rememberMe)
      // 存储用户信息
      setUser(response.user)
      // 跳转到首页
      router.push("/")
    },
    onError: (err: Error) => {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("登录失败，请稍后重试")
      }
    },
  })

  const handleForgotPassword = () => {
    if (!email || !email.includes('@')) {
      setError('请先输入有效的邮箱地址')
      return
    }
    router.push(`/otp?email=${encodeURIComponent(email)}`)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    // 基础验证
    if (!email || !email.includes('@')) {
      setError("请输入有效的邮箱地址")
      return
    }

    if (!password) {
      setError("请输入密码")
      return
    }

    // 调用登录 API
    loginMutation.mutate({ email, password })
  }

  const isLoading = loginMutation.isPending

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">欢迎回来</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">邮箱</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱地址"
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <div className="relative">
                  <Input 
                    id="password" 
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>
              
              <Field>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading}
                    />
                    <label 
                      htmlFor="remember" 
                      className="text-sm cursor-pointer select-none"
                    >
                      记住我
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    忘记密码?
                  </button>
                </div>
              </Field>

              {error && (
                <div className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <Field>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "登录中..." : "登录"}
                </Button>
                <FieldDescription className="text-center">
                  还没有账号？ <a href="#" className="text-blue-600 hover:underline">联系管理员</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
