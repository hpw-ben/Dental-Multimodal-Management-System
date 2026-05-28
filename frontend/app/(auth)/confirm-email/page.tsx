"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { confirmEmailChangeApi } from "@/lib/api/users"

export default function ConfirmEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? '' : '链接无效')

  useEffect(() => {
    if (!token) return

    confirmEmailChangeApi(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.message)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message || '确认失败')
      })
  }, [token])

  return (
    <div className="bg-slate-50 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-blue-600 text-white flex size-8 items-center justify-center rounded-lg">
            <span className="font-bold text-lg">R</span>
          </div>
          <span className="text-lg font-semibold text-blue-950">数字多模态管理系统</span>
        </Link>
        <div className="bg-white rounded-lg border p-8 text-center">
          {status === 'loading' && (
            <div>
              <h2 className="text-xl font-semibold text-blue-950 mb-2">正在确认邮箱变更...</h2>
              <p className="text-sm text-gray-600">请稍候</p>
            </div>
          )}
          {status === 'success' && (
            <div>
              <h2 className="text-xl font-semibold text-green-700 mb-2">邮箱变更成功</h2>
              <p className="text-sm text-gray-600 mb-4">{message}</p>
              <Link href="/login" className="text-blue-600 hover:underline text-sm">
                前往登录
              </Link>
            </div>
          )}
          {status === 'error' && (
            <div>
              <h2 className="text-xl font-semibold text-red-700 mb-2">确认失败</h2>
              <p className="text-sm text-gray-600 mb-4">{message}</p>
              <Link href="/login" className="text-blue-600 hover:underline text-sm">
                返回登录
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
