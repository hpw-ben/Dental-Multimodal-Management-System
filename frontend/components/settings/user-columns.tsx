"use client"

import { ColumnDef } from "@tanstack/react-table"
import { User } from "@/lib/api/auth"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ArrowUpDown, Pencil, Copy, Trash2 } from "lucide-react"
import { toast } from "sonner"

const roleColors: Record<'admin' | 'doctor' | 'researcher', string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  researcher: "bg-blue-100 text-blue-800 border-blue-200",
  doctor: "bg-green-100 text-green-800 border-green-200",
}

const roleLabels: Record<'admin' | 'doctor' | 'researcher', string> = {
  admin: "管理员",
  researcher: "研究员",
  doctor: "医生",
}

interface UserColumnsProps {
  onStatusChange?: (id: number, isActive: boolean) => void
  onEdit?: (user: User) => void
  onDelete?: (id: number) => void
}

export const getUserColumns = ({
  onStatusChange,
  onEdit,
  onDelete
}: UserColumnsProps = {}): ColumnDef<User>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="全选"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="选中此行"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "username",
    meta: {
      visibilityLabel: "用户",
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          用户
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} alt={user.username} />
            <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.username}</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "role",
    meta: {
      visibilityLabel: "角色",
    },
    header: () => <div className="text-center">角色</div>,
    cell: ({ row }) => {
      const role = row.getValue("role") as 'admin' | 'doctor' | 'researcher'
      return (
        <div className="flex justify-center">
          <Badge variant="outline" className={roleColors[role]}>
            {roleLabels[role]}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "is_active",
    meta: {
      visibilityLabel: "状态",
    },
    header: () => <div className="text-center">状态</div>,
    cell: ({ row }) => {
      const user = row.original
      const isActive = user.is_active
      return (
        <div className="flex justify-center items-center gap-2">
          <Switch
            checked={isActive}
            onCheckedChange={(checked) =>
              onStatusChange && onStatusChange(user.id, checked)
            }
            disabled={!onStatusChange}
          />
          <span className="text-sm">
            {isActive ? "启用" : "未启用"}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "date_joined",
    meta: {
      visibilityLabel: "加入时间",
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
          加入时间
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const dateJoined = row.getValue("date_joined") as string
      return (
        <div className="text-center text-sm">
          {dateJoined.split('T')[0]}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center">操作</div>,
    cell: ({ row }) => {
      const user = row.original

      const handleCopy = () => {
        navigator.clipboard.writeText(user.email)
        toast.success(`已复制邮箱: ${user.email}`)
      }

      return (
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => onEdit?.(user)}
            title="编辑用户"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            onClick={handleCopy}
            title="复制邮箱"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete?.(user.id)}
            title="删除用户"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]
