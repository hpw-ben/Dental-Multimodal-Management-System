"use client"

import { CheckIcon, SlidersHorizontal } from "lucide-react"
import { Table, VisibilityState } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 列名中英映射
const columnLabels: Record<string, string> = {
  caseNumber: "病历号",
  name: "姓名",
  gender: "性别",
  birthDate: "出生日期",
  age: "年龄",
  diagnosis: "临床诊断",
  createdAt: "建档日期",
  status: "状态",
  role: "角色",
  lastLogin: "最后登录",
}

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  /** 传入 columnVisibility 状态以确保 React Compiler 能检测到变化 */
  columnVisibility: VisibilityState
}

type ColumnWithVisibilityLabel = {
  columnDef: {
    meta?: {
      visibilityLabel?: string
    }
  }
}

export function DataTableViewOptions<TData>({
  table,
  columnVisibility,
}: DataTableViewOptionsProps<TData>) {
  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanHide()
    )

  const getColumnLabel = (column: typeof columns[number]) => {
    const columnMeta = (column as ColumnWithVisibilityLabel).columnDef.meta
    return columnMeta?.visibilityLabel || columnLabels[column.id] || column.id
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          列表
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>显示字段</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => {
          // 直接从 columnVisibility prop 读取，不依赖 table 方法
          // undefined 或 true 表示可见，false 表示隐藏
          const isVisible = columnVisibility[column.id] !== false
          return (
            <DropdownMenuItem
              key={column.id}
              onSelect={(e) => {
                e.preventDefault()
                // 直接通过 table.setColumnVisibility 更新状态
                table.setColumnVisibility((prev) => ({
                  ...prev,
                  [column.id]: !isVisible,
                }))
              }}
            >
              <span
                className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center",
                  !isVisible && "opacity-0"
                )}
              >
                <CheckIcon className="h-4 w-4" />
              </span>
              {getColumnLabel(column)}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
