import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-9xl font-bold text-blue-600">404</h1>
          <h2 className="text-2xl font-semibold text-blue-950">页面未找到</h2>
          <p className="text-muted-foreground max-w-md">
            抱歉，您访问的页面不存在或已被移除。请检查 URL 是否正确，或返回首页。
          </p>
        </div>

        <div className="flex gap-3">
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/patients">
              <Search className="mr-2 h-4 w-4" />
              查看患者列表
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p>如果您认为这是一个错误，请联系系统管理员</p>
        </div>
      </div>
    </div>
  )
}
