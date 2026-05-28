"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Palette, Shield, Check, Camera, Tags } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/store/auth-store"
import { changePasswordApi, changeEmailApi, deactivateAccountApi, uploadAvatarApi } from "@/lib/api/users"
import { logoutApi } from "@/lib/api/auth"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export default function SettingsPage() {
  const router = useRouter()
  const { user, setUser, clearUser } = useAuthStore()
  const [activeTab, setActiveTab] = React.useState("display")

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] p-6 gap-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">设置中心</h1>
        <p className="text-muted-foreground mt-1">
          管理您的外观偏好和账户安全。
        </p>
      </div>
      <Separator />

      <div className="flex flex-col md:flex-row flex-1 gap-8 min-h-0">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-[240px] flex-shrink-0 flex flex-col gap-1">
           <NavButton 
              active={activeTab === "display"} 
              onClick={() => setActiveTab("display")}
              icon={Palette}
              label="外观与显示"
           />
           <NavButton 
              active={activeTab === "security"} 
              onClick={() => setActiveTab("security")}
              icon={Shield}
              label="安全与隐私"
           />
           {user?.role === 'admin' && (
             <NavButton 
               active={false} 
               onClick={() => router.push('/settings/dental-labels')}
               icon={Tags}
               label="牙位图标签"
             />
           )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto pr-4 pb-10">
           {activeTab === "display" && <DisplaySettings user={user} setUser={setUser} />}
           {activeTab === "security" && <SecuritySettings user={user} router={router} clearUser={clearUser} />}
        </main>
      </div>
    </div>
  )
}

function NavButton({ active, onClick, icon: Icon, label }: any) {
    return (
        <Button
          variant={active ? "secondary" : "ghost"}
          className={cn(
            "justify-start gap-3 h-10 font-normal",
            active
              ? "bg-secondary text-secondary-foreground font-medium hover:bg-secondary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
          onClick={onClick}
        >
            <Icon className="w-4 h-4" />
            {label}
        </Button>
    )
}


function DisplaySettings({ user, setUser }: { user: any; setUser: (user: any) => void }) {
    const [theme, setTheme] = React.useState<'light' | 'dark'>('light')
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const avatarMutation = useMutation({
        mutationFn: (file: File) => uploadAvatarApi(file),
        onSuccess: (response) => {
            if (user) {
                setUser({ ...user, avatar: response.avatar })
            }
            toast.success('头像上传成功')
        },
        onError: (error: Error) => {
            toast.error(`上传失败：${error.message}`)
        },
    })

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        avatarMutation.mutate(file)
    }

    const applyTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme)
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        localStorage.setItem('theme', newTheme)
    }

    React.useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
        if (savedTheme) {
            applyTheme(savedTheme)
        }
    }, [])

    return (
         <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div>
                <h3 className="text-lg font-medium">外观与显示</h3>
                <p className="text-sm text-muted-foreground">自定义系统的主题和显示偏好。</p>
            </div>
            <Separator />

            {/* 头像上传 */}
            <div className="space-y-4 max-w-xl">
                <Label className="text-base mb-3 block">头像</Label>
                <div className="flex items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user?.avatar || undefined} alt={user?.username} />
                            <AvatarFallback className="text-2xl">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="h-6 w-6 text-white" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarMutation.isPending}
                        >
                            {avatarMutation.isPending ? '上传中...' : '更换头像'}
                        </Button>
                        <p className="text-xs text-muted-foreground">支持 JPG、PNG、GIF、WebP，最大 2MB</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                    />
                </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                <div>
                    <Label className="text-base mb-3 block">主题模式</Label>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div 
                            className="cursor-pointer space-y-2"
                            onClick={() => applyTheme('light')}
                        >
                            <div className={cn(
                                "items-center rounded-md border-2 bg-muted/60 p-1 transition-colors hover:bg-muted",
                                theme === 'light' ? "border-foreground" : "border-border"
                            )}>
                                <div className="space-y-2 rounded-sm bg-white p-2">
                                    <div className="space-y-2 rounded-md bg-slate-300 h-2 w-[80px]" />
                                    <div className="space-y-2 rounded-md bg-slate-300 h-2 w-[100px]" />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                {theme === 'light' && <Check className="h-4 w-4 text-foreground" />}
                                <span className="block text-center font-normal text-sm text-foreground">浅色模式</span>
                            </div>
                        </div>
                        <div 
                            className="cursor-pointer space-y-2"
                            onClick={() => applyTheme('dark')}
                        >
                            <div className={cn(
                                "items-center rounded-md border-2 bg-slate-950 p-1 hover:bg-slate-800 transition-colors",
                                theme === 'dark' ? "border-foreground" : "border-border"
                            )}>
                                <div className="space-y-2 rounded-sm bg-slate-800 p-2">
                                    <div className="space-y-2 rounded-md bg-slate-400 h-2 w-[80px]" />
                                    <div className="space-y-2 rounded-md bg-slate-400 h-2 w-[100px]" />
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                {theme === 'dark' && <Check className="h-4 w-4 text-foreground" />}
                                <span className="block text-center font-normal text-sm text-foreground">深色模式</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
         </div>
    )
}

interface SecuritySettingsProps {
  user: any
  router: any
  clearUser: () => void
}

function SecuritySettings({ user, router, clearUser }: SecuritySettingsProps) {
    const [oldPassword, setOldPassword] = React.useState('')
    const [newPassword, setNewPassword] = React.useState('')
    const [confirmPassword, setConfirmPassword] = React.useState('')
    const [newEmail, setNewEmail] = React.useState('')

    // 修改密码
    const changePasswordMutation = useMutation({
        mutationFn: () => changePasswordApi(user.id, { old_password: oldPassword, new_password: newPassword }),
        onSuccess: () => {
            toast.success('密码修改成功')
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
        },
        onError: (error: any) => {
            toast.error(`修改密码失败：${error?.response?.data?.detail || error.message || '未知错误'}`)
        },
    })

    // 修改邮箱
    const changeEmailMutation = useMutation({
        mutationFn: () => changeEmailApi({ new_email: newEmail }),
        onSuccess: (response) => {
            toast.success(response.message || '确认链接已发送，请查收新邮箱')
            setNewEmail('')
        },
        onError: (error: any) => {
            toast.error(`修改邮箱失败：${error.message || '未知错误'}`)
        },
    })

    // 注销账户
    const deactivateAccountMutation = useMutation({
        mutationFn: () => deactivateAccountApi(user.id),
        onSuccess: async () => {
            toast.success('账户已注销，即将退出登录')
            await logoutApi()
            clearUser()
            router.push('/login')
        },
        onError: (error: any) => {
            toast.error(`注销账户失败：${error?.response?.data?.detail || error.message || '未知错误'}`)
        },
    })

    const handleChangePassword = () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.warning('请填写完整的密码信息')
            return
        }
        if (newPassword !== confirmPassword) {
            toast.warning('两次输入的新密码不一致')
            return
        }
        if (newPassword.length < 6) {
            toast.warning('新密码长度至少为 6 位')
            return
        }
        changePasswordMutation.mutate()
    }

    const [emailConfirmOpen, setEmailConfirmOpen] = React.useState(false)

    const handleChangeEmail = () => {
        if (!newEmail) {
            toast.warning('请输入新的电子邮箱')
            return
        }
        if (!newEmail.includes('@')) {
            toast.warning('请输入有效的电子邮箱')
            return
        }
        setEmailConfirmOpen(true)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             <div>
                <h3 className="text-lg font-medium">安全与隐私</h3>
            </div>
            <Separator />
            
            {/* 修改邮箱 */}
            <div className="space-y-4 max-w-xl">
                <div>
                    <h4 className="text-base font-medium mb-3">修改电子邮箱</h4>
                    <p className="text-sm text-muted-foreground mb-4">当前邮箱：{user?.email}</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="new-email">新邮箱地址</Label>
                    <Input 
                        id="new-email" 
                        type="email" 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="输入新的电子邮箱"
                    />
                </div>
                <div className="flex justify-end">
                    <Button 
                        onClick={handleChangeEmail}
                        disabled={changeEmailMutation.isPending}
                    >
                        {changeEmailMutation.isPending ? '修改中...' : '更新邮箱'}
                    </Button>
                    <ConfirmDialog
                        open={emailConfirmOpen}
                        onOpenChange={setEmailConfirmOpen}
                        title="确认修改邮箱"
                        description={`确定要将邮箱修改为 ${newEmail} 吗？\n确认后系统将向新邮箱发送验证链接。`}
                        confirmText="确认修改"
                        onConfirm={() => changeEmailMutation.mutate()}
                    />
                </div>
            </div>

            <Separator />

            {/* 修改密码 */}
            <div className="space-y-4 max-w-xl">
                <div>
                    <h4 className="text-base font-medium mb-3">修改密码</h4>
                    <p className="text-sm text-muted-foreground mb-4">为了您的账户安全，建议定期更换密码。</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="current-password">当前密码</Label>
                    <Input 
                        id="current-password" 
                        type="password" 
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="new-password">新密码</Label>
                    <Input 
                        id="new-password" 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="confirm-password">确认新密码</Label>
                    <Input 
                        id="confirm-password" 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
                <div className="flex justify-end">
                    <Button 
                        onClick={handleChangePassword}
                        disabled={changePasswordMutation.isPending}
                    >
                        {changePasswordMutation.isPending ? '更新中...' : '更新密码'}
                    </Button>
                </div>
            </div>

            <Separator />

            {/* 注销账户 */}
            <div className="space-y-4 max-w-xl">
                <div>

                </div>
                <div className="flex justify-start">
                    <ConfirmDialog
                        trigger={
                            <Button 
                                variant="outline" 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                disabled={deactivateAccountMutation.isPending}
                            >
                                {deactivateAccountMutation.isPending ? '注销中...' : '注销账户'}
                            </Button>
                        }
                        title="确定要注销账户吗？"
                        description="此操作不可恢复，您的所有数据将被永久删除，包括个人信息、项目数据和操作记录。请确认您已知晓该风险。"
                        confirmText="确认注销"
                        variant="destructive"
                        onConfirm={() => deactivateAccountMutation.mutate()}
                    />
                </div>
            </div>
        </div>
    )
}


