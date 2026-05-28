import Link from "next/link"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-slate-50 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-blue-600 text-white flex size-8 items-center justify-center rounded-lg">
            <span className="font-bold text-lg">R</span>
          </div>
          <span className="text-lg font-semibold text-blue-950">数字多模态管理系统</span>
        </Link>
        <LoginForm />
      </div>
    </div>
  )
}
