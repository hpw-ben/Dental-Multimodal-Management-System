"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { sendResetCodeApi } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"

interface OTPFormProps {
  email: string
}

export function OTPForm({ email }: OTPFormProps) {
  const router = useRouter()
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [hasSent, setHasSent] = useState(false)
  const hasSentRef = useRef(false)

  const sendCode = useCallback(async () => {
    if (!email || isSending || countdown > 0) return
    setIsSending(true)
    setError("")
    try {
      await sendResetCodeApi({ email })
      setHasSent(true)
      setCountdown(60)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("发送验证码失败，请重试")
      }
    } finally {
      setIsSending(false)
    }
  }, [email, isSending, countdown])

  // 页面加载时自动发送一次验证码
  useEffect(() => {
    if (email && !hasSentRef.current) {
      hasSentRef.current = true
      sendCode()
    }
  }, [email]) // eslint-disable-line react-hooks/exhaustive-deps

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleVerify = useCallback((code: string) => {
    if (code.length !== 6 || isLoading) return
    setIsLoading(true)
    setError("")
    router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${code}`)
  }, [email, isLoading, router])

  // 输入完成后自动提交（支持粘贴）
  useEffect(() => {
    if (otp.length === 6 && hasSent) {
      handleVerify(otp)
    }
  }, [otp, hasSent]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    handleVerify(otp)
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">重置密码</CardTitle>
        <CardDescription>
          {hasSent
            ? `验证码已发送到 ${email}`
            : isSending
              ? '正在发送验证码...'
              : `将发送验证码到 ${email}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="otp" className="sr-only">
                验证码
              </FieldLabel>
              <InputOTP 
                maxLength={6} 
                id="otp" 
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
                containerClassName="justify-center"
                required
              >
                <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <FieldDescription className="text-center">
                请输入发送到您邮箱的6位验证码
              </FieldDescription>
              {error && (
                <p className="text-sm text-red-600 text-center mt-2">{error}</p>
              )}
            </Field>
            <Button type="submit" disabled={isLoading || !hasSent} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? "验证中..." : "验证"}
            </Button>
            <FieldDescription className="text-center">
              没有收到验证码？
              <button
                type="button"
                className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                onClick={sendCode}
                disabled={countdown > 0 || isSending}
              >
                {countdown > 0 ? `${countdown}s 后重新发送` : '重新发送'}
              </button>
            </FieldDescription>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
