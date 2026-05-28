"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { resetPasswordApi, setPasswordApi } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { toast } from "sonner"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const code = searchParams.get('code') || ''
  const token = searchParams.get('token') || ''
  const type = searchParams.get('type') || 'reset'
  
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const isActivate = type === 'activate'
  const isResetLink = type === 'reset-link'
  const usesTokenFlow = Boolean(token) && (isActivate || isResetLink)
  const title = isActivate ? '设置密码' : '重置密码'
  const description = isActivate
    ? '请设置您的登录密码'
    : '请输入新密码'
  const buttonText = isActivate ? '设置密码' : '重置密码'
  const loadingText = isActivate ? '设置中...' : '重置中...'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("密码至少需要6位字符")
      return
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致")
      return
    }

    setIsLoading(true)

    try {
      if (usesTokenFlow) {
        await setPasswordApi({ token, password, password_confirm: confirmPassword })
        toast.success(isActivate ? '账号激活成功' : '密码重置成功')
      } else if (email && code) {
        await resetPasswordApi({ email, code, new_password: password, new_password_confirm: confirmPassword })
        toast.success('密码重置成功')
      } else {
        setError('缺少必要参数，请重新操作')
        setIsLoading(false)
        return
      }
      router.push("/login")
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('操作失败，请重试')
      }
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">新密码</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位字符"
                required
                disabled={isLoading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">确认密码</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                required
                disabled={isLoading}
              />
            </Field>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? loadingText : buttonText}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
