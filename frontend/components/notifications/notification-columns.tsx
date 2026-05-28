"use client"

import { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Notification } from "@/lib/api/notifications"

interface UseNotificationColumnsProps {
  onViewAnnotation: (notification: Notification) => void
}

export function useNotificationColumns({ onViewAnnotation }: UseNotificationColumnsProps): ColumnDef<Notification>[] {
  return [
    {
      accessorKey: "patient_name",
      meta: {
        visibilityLabel: "患者姓名",
      },
      header: "患者姓名",
      cell: ({ row }) => {
        const isRead = row.original.is_read
        return (
          <div className="flex items-center gap-2">
            {!isRead && (
              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
            <span className={isRead ? "" : "font-semibold"}>
              {row.original.patient_name}
            </span>
          </div>
        )
      }
    },
    {
      accessorKey: "title",
      meta: {
        visibilityLabel: "标注内容",
      },
      header: "标注内容",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex-shrink-0">标记</Badge>
          <span className="line-clamp-2">{row.original.title}</span>
        </div>
      )
    },
    {
      accessorKey: "created_by_name",
      meta: {
        visibilityLabel: "创建者",
      },
      header: "创建者",
      cell: ({ row }) => row.original.created_by_name
    },
    {
      accessorKey: "created_at",
      meta: {
        visibilityLabel: "时间",
      },
      header: "时间",
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
      }
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Button 
          size="sm"
          variant={row.original.is_read ? "outline" : "default"}
          onClick={() => onViewAnnotation(row.original)}
        >
          查看标注
        </Button>
      )
    }
  ]
}
