"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { User } from "@/lib/api/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface EditUserDialogProps {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (userId: number, updates: { username?: string; email?: string; role?: User['role'] }) => Promise<void> | void
  onResetPassword: (userId: number) => Promise<void> | void
}

export function EditUserDialog({ 
  user, 
  open, 
  onOpenChange, 
  onUpdate,
  onResetPassword 
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [username, setUsername] = useState(user?.username || "")
  const [email, setEmail] = useState(user?.email || "")
  const [role, setRole] = useState<User['role']>(user?.role || "researcher")

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
      setRole(user.role)
    }
  }, [user])

  const displayName = user?.username || user?.email || "该用户"

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    try {
      await onUpdate(user.id, { username, email, role })
      onOpenChange(false)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user) return
    setIsSubmitting(true)

    try {
      await onResetPassword(user.id)
      onOpenChange(false)
    } catch {
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>
            修改 {displayName} 的信息
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="password">密码管理</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <form onSubmit={handleSubmit} id="edit-user-form">
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">姓名</Label>
                  <Input
                    id="edit-name"
                    value={username}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">姓名不可修改</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">邮箱</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">角色</Label>
                  <Select 
                    value={role} 
                    onValueChange={(value) => setRole(value as User['role'])}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="researcher">研究员</SelectItem>
                      <SelectItem value="doctor">医生</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button 
                type="submit" 
                form="edit-user-form"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "保存中..." : "保存更改"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <div className="py-4">
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <h4 className="text-sm font-semibold text-orange-900 mb-2">
                  重置密码
                </h4>
                <p className="text-sm text-orange-800 mb-4">
                  将向用户邮箱发送重置密码链接，用户需要点击链接重新设置密码。
                </p>
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    >
                      发送重置链接
                    </Button>
                  }
                  title="重置密码"
                  description={`确定要为 ${displayName} 重置密码吗？系统会向 ${user.email} 发送重置链接，用户需要点击链接重设密码。`}
                  confirmText="重置密码"
                  variant="destructive"
                  onConfirm={handleResetPassword}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
