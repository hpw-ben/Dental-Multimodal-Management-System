"use client"

import * as React from "react"
import * as XLSX from 'xlsx'
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getUsersApi, createUserApi, updateUserApi, deleteUserApi, resetUserPasswordApi, requestUserEmailChangeApi, type UpdateUserRequest } from "@/lib/api/users"
import type { User } from "@/lib/api/auth"
import { getUserColumns } from "@/components/settings/user-columns"
import { DataTable } from "@/components/shared/data-table"
import { CreateUserDialog } from "@/components/settings/create-user-dialog"
import { EditUserDialog } from "@/components/settings/edit-user-dialog"
import { Button } from "@/components/ui/button"
import { Download, Upload } from "lucide-react"
import { useAuthStore } from "@/lib/store/auth-store"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type TableRowWithUser = {
  original: User
}

type UsersTableInstance = {
  getFilteredSelectedRowModel: () => {
    rows: TableRowWithUser[]
  }
}

type ApiLikeError = Error & {
  response?: {
    data?: {
      detail?: string
    }
  }
}

type UserImportRow = {
  用户名?: string
  邮箱?: string
  角色?: string
}

function getErrorMessage(error: unknown) {
  const apiError = error as ApiLikeError
  return apiError?.response?.data?.detail || apiError.message || '未知错误'
}

export default function UsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [rowSelection, setRowSelection] = React.useState({})
  const tableRef = React.useRef<UsersTableInstance | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)

  // 权限检查：只有管理员可以访问
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      toast.error('权限不足：只有管理员才能访问用户管理页面')
      router.push('/dashboard')
    }
  }, [currentUser, router])

  // 获取用户列表
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsersApi({}),
    enabled: currentUser?.role === 'admin',
  })

  const users = usersData?.results || []

  // 创建用户
  const createMutation = useMutation({
    mutationFn: createUserApi,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户创建成功', {
        description: `激活链接已生成：${response.activation_link}`,
        duration: 10000,
      })
    },
    onError: (error: unknown) => {
      toast.error(`创建用户失败：${getErrorMessage(error)}`)
    },
  })

  const handleCreate = (newUser: { name: string; email: string; role: string }) => {
    createMutation.mutate({
      username: newUser.name,
      email: newUser.email,
      role: newUser.role as 'admin' | 'doctor' | 'researcher',
    })
  }

  // 更新用户
  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateUserRequest }) => updateUserApi(userId, data),
    onError: (error: unknown) => {
      toast.error(`更新用户失败：${getErrorMessage(error)}`)
    },
  })

  const requestEmailChangeMutation = useMutation({
    mutationFn: ({ userId, newEmail }: { userId: number; newEmail: string }) =>
      requestUserEmailChangeApi(userId, { new_email: newEmail }),
    onError: (error: unknown) => {
      toast.error(`发送邮箱确认链接失败：${getErrorMessage(error)}`)
    },
  })

  const handleStatusChange = React.useCallback(async (userId: number, isActive: boolean) => {
    await updateMutation.mutateAsync({
      userId,
      data: { is_active: isActive },
    })
    queryClient.invalidateQueries({ queryKey: ['users'] })
    toast.success(isActive ? '用户已启用' : '用户已停用')
  }, [queryClient, updateMutation])

  const handleEdit = React.useCallback((user: User) => {
    setEditingUser(user)
    setEditDialogOpen(true)
  }, [])

  const handleUpdate = async (userId: number, updates: { username?: string; email?: string; role?: string }) => {
    const originalUser = users.find((item) => item.id === userId)

    if (!originalUser) {
      toast.error('未找到要更新的用户')
      return
    }

    const nextUsername = updates.username?.trim()
    const nextEmail = updates.email?.trim()
    const nextRole = updates.role as 'admin' | 'doctor' | 'researcher' | undefined
    const profileUpdates: { username?: string; role?: 'admin' | 'doctor' | 'researcher' } = {}

    if (nextUsername && nextUsername !== originalUser.username) {
      profileUpdates.username = nextUsername
    }

    if (nextRole && nextRole !== originalUser.role) {
      profileUpdates.role = nextRole
    }

    const feedbackMessages: string[] = []

    if (Object.keys(profileUpdates).length > 0) {
      await updateMutation.mutateAsync({
        userId,
        data: profileUpdates,
      })
      feedbackMessages.push('用户基本信息已更新')
    }

    if (nextEmail && nextEmail !== originalUser.email) {
      const response = await requestEmailChangeMutation.mutateAsync({
        userId,
        newEmail: nextEmail,
      })
      feedbackMessages.push(response.message)
    }

    if (feedbackMessages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(feedbackMessages.join('；'))
    }
  }

  // 重置密码
  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPasswordApi,
    onError: (error: unknown) => {
      toast.error(`重置密码失败：${getErrorMessage(error)}`)
    },
  })

  const handleResetPassword = async (userId: number) => {
    const response = await resetPasswordMutation.mutateAsync(userId)
    toast.success(response.message)
  }

  // 删除用户
  const deleteMutation = useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('用户已删除')
    },
    onError: (error: unknown) => {
      toast.error(`删除用户失败：${getErrorMessage(error)}`)
    },
  })

  const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null)

  const handleDelete = React.useCallback((userId: number) => {
    setDeleteTarget(userId)
  }, [])

  // 导出Excel
  const exportToExcel = (users: User[], filename: string) => {
    const roleMap = {
      admin: '管理员',
      doctor: '医生',
      researcher: '研究员',
    }

    const exportData = users.map(u => ({
      '用户名': u.username,
      '邮箱': u.email,
      '角色': roleMap[u.role],
      '状态': u.is_active ? '启用' : '禁用',
      '加入时间': u.date_joined,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表')
    XLSX.writeFile(workbook, filename)
  }

  const handleExportAll = () => {
    const filename = `用户列表_全部_${new Date().toISOString().split('T')[0]}.xlsx`
    exportToExcel(users, filename)
    toast.success(`导出成功，已导出 ${users.length} 个用户`)
  }

  const handleExportSelected = () => {
    if (!tableRef.current) return
    const selectedRows = tableRef.current.getFilteredSelectedRowModel().rows
    const selectedUsers = selectedRows.map((row) => row.original)
    
    if (selectedUsers.length === 0) {
      toast.warning('请至少选择一个用户进行导出')
      return
    }

    const filename = `用户列表_选中_${new Date().toISOString().split('T')[0]}.xlsx`
    exportToExcel(selectedUsers, filename)
    toast.success(`导出成功，已导出 ${selectedUsers.length} 个用户`)
  }

  // 下载模板
  const handleDownloadTemplate = () => {
    const templateData = [{
      '用户名': '张三',
      '邮箱': 'zhangsan@example.com',
      '角色': '研究员',
    }]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '用户模板')
    XLSX.writeFile(workbook, '用户导入模板.xlsx')
    
    toast.success('模板下载成功，请按照模板格式填写用户信息')
  }

  // 导入Excel
  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<UserImportRow>(worksheet)

        // 解析并验证数据
        const roleMap: Record<string, 'admin' | 'doctor' | 'researcher'> = {
          '管理员': 'admin',
          '研究员': 'researcher',
          '医生': 'doctor',
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        jsonData.forEach((row, index) => {
          const rowNum = index + 2 // Excel行号（从2开始，因为第1行是表头）
          
          // 验证必填字段
          if (!row['用户名'] || !row['邮箱']) {
            errors.push(`第${rowNum}行：用户名和邮箱不能为空`)
            errorCount++
            return
          }

          // 验证邮箱格式
          if (!row['邮箱'].includes('@')) {
            errors.push(`第${rowNum}行：邮箱格式无效`)
            errorCount++
            return
          }

          // 检查邮箱是否已存在
          const existingUser = users.find(u => u.email === row['邮箱'])
          if (existingUser) {
            errors.push(`第${rowNum}行：邮箱 ${row['邮箱']} 已存在`)
            errorCount++
            return
          }

          // 解析角色
          const role = row['角色'] ? roleMap[row['角色']] || 'researcher' : 'researcher'

          // 创建新用户
          createUserApi({
            username: row['用户名'],
            email: row['邮箱'],
            role,
          }).then(() => {
            successCount++
          }).catch(() => {
            errorCount++
          })
        })

        // 显示结果并刷新列表
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['users'] })
          if (successCount > 0 && errorCount === 0) {
            toast.success(`导入成功，已导入 ${successCount} 个用户`)
          } else if (successCount > 0 && errorCount > 0) {
            toast.warning(`部分导入成功：${successCount} 个成功，${errorCount} 个失败`, {
              description: errors.join('\n'),
              duration: 8000,
            })
          } else {
            toast.error('导入失败', {
              description: errors.join('\n'),
              duration: 8000,
            })
          }
        }, 1000)
      } catch {
        toast.error('导入失败：文件格式错误，请使用正确的Excel模板')
      }
    }
    reader.readAsBinaryString(file)

    // 重置input以允许重复选择同一文件
    e.target.value = ''
  }

  const columns = React.useMemo(() => getUserColumns({
    onStatusChange: handleStatusChange,
    onEdit: handleEdit,
    onDelete: handleDelete,
  }), [handleStatusChange, handleEdit, handleDelete])

  const selectedCount = tableRef.current ? tableRef.current.getFilteredSelectedRowModel().rows.length : 0

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">用户管理</h1>
          <p className="text-muted-foreground mt-1">
            管理系统用户账号和权限
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            下载模板
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            导入用户
          </Button>
          {selectedCount > 0 && (
            <Button variant="outline" onClick={handleExportSelected}>
              <Download className="mr-2 h-4 w-4" />
              导出选中 ({selectedCount})
            </Button>
          )}
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="mr-2 h-4 w-4" />
            导出全部
          </Button>
          <CreateUserDialog onSubmit={handleCreate} />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full py-2">
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="搜索用户名、邮箱..."
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          onTableInstanceChange={(table) => {
            tableRef.current = table
          }}
        />
      </div>

      <EditUserDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={handleUpdate}
        onResetPassword={handleResetPassword}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="删除用户"
        description="确定要删除这个用户吗？此操作不可恢复，用户的所有数据将被永久删除。"
        confirmText="删除"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget !== null) {
            deleteMutation.mutate(deleteTarget)
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}
