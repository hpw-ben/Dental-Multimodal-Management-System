"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Patient } from "@/app/(main)/patients/data"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, Pencil, Check, X, Copy, Trash2 } from "lucide-react"
import { PatientStatusBadge } from "@/components/patient/patient-status-badge"
import React from "react"
import { toast } from "sonner"

// Interface for callbacks required for editing
interface PatientColumnProps {
    editingRowId?: string | null;
    editFormData?: Partial<Patient> | null;
    isSaving?: boolean;
    onStartEdit?: (patient: Patient) => void;
    onCancelEdit?: () => void;
    onSaveEdit?: (id: string) => void;
    onStatusChange?: (id: string, newStatus: "已确认" | "待确认") => void;
    onFormChange?: (field: keyof Patient, value: any) => void;
    onDelete?: (id: string) => void;
}

export const getPatientColumns = ({
    editingRowId = null,
    editFormData = null,
    isSaving = false,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onStatusChange,
    onFormChange,
    onDelete
}: PatientColumnProps = {}): ColumnDef<Patient>[] => {
    
  const isEditable = !!onStartEdit; // If handlers are provided, enable edit UI
  const hasActions = isEditable || !!onDelete; // 操作列：有编辑或删除就显示

  return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "caseNumber",
    meta: {
      visibilityLabel: "病历号",
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
           病历号
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium text-center">{row.getValue("caseNumber")}</div>,
  },
  {
    accessorKey: "name",
    meta: {
      visibilityLabel: "姓名",
    },
    header: ({ column }) => <div className="text-center w-full">姓名</div>,
    cell: ({ row }) => {
        if (isEditable && editingRowId === row.original.id && onFormChange) {
            return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input 
                      value={editFormData?.name || ""}
                      onChange={(e) => onFormChange("name", e.target.value)}
                      className="h-7 text-xs"
                  />
                </div>
            )
        }
        return <div className="text-center">{row.getValue("name")}</div>
    },
  },
  {
    accessorKey: "gender",
    meta: {
      visibilityLabel: "性别",
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
           性别
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        if (isEditable && editingRowId === row.original.id && onFormChange) {
            return (
                <Select
                   value={editFormData?.gender}
                   onValueChange={(v) => onFormChange("gender", v)}
                >
                    <SelectTrigger className="h-7 text-xs px-2">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Male">男</SelectItem>
                        <SelectItem value="Female">女</SelectItem>
                    </SelectContent>
                </Select>
            )
        }
        const gender = row.getValue("gender") as string
        return <div className="text-center">{gender === "Male" ? "男" : "女"}</div>
    },
  },
  {
    accessorKey: "birthDate",
    meta: {
      visibilityLabel: "出生日期",
    },
    filterFn: (row, id, value) => {
      const date = row.getValue(id) as string
      if (!date) return false
      const [start, end] = value as [string, string]
      if (start && date < start) return false
      if (end && date > end) return false
      return true
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
           出生日期
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        if (isEditable && editingRowId === row.original.id && onFormChange) {
            return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Input 
                      type="date"
                      value={editFormData?.birthDate || ""}
                      onChange={(e) => onFormChange("birthDate", e.target.value)}
                      className="h-7 text-xs px-2"
                  />
                </div>
            )
        }
        const date = row.getValue("birthDate") as string
        return <div className="text-center">{date || "-"}</div>
    },
  },
  {
    id: "age",
    accessorFn: (row) => {
      if (!row.birthDate) return null
      const birthYear = new Date(row.birthDate).getFullYear()
      return new Date().getFullYear() - birthYear
    },
    meta: {
      visibilityLabel: "年龄",
    },
    filterFn: (row, id, value) => {
      const age = row.getValue(id) as number | null
      if (age == null) return false
      const [min, max] = value as [number, number]
      return age >= min && age <= max
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
           年龄
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        const age = row.getValue("age") as number | null
        if (age == null) return <div className="text-center">-</div>
        return <div className="text-center">{age}岁</div>
    },
  },
  {
    accessorKey: "diagnosis",
    meta: {
      visibilityLabel: "临床诊断",
    },
    filterFn: (row, id, value) => {
      const diagnosis = (row.getValue(id) as string || "").toLowerCase()
      return diagnosis.includes((value as string).toLowerCase())
    },
    header: ({ column }) => <div className="text-center w-full">临床诊断</div>,
    cell: ({ row }) => {
          if (isEditable && editingRowId === row.original.id && onFormChange) {
              return (
                  <Input 
                      value={editFormData?.diagnosis || ""}
                      onChange={(e) => onFormChange("diagnosis", e.target.value)}
                      className="h-7 text-xs"
                  />
              )
          }
        return <div className="text-center">{row.getValue("diagnosis")}</div>
    },
  },
  {
    accessorKey: "createdAt",
    meta: {
      visibilityLabel: "建档日期",
    },
    filterFn: (row, id, value) => {
      const date = row.getValue(id) as string
      if (!date) return false
      const [start, end] = value as [string, string]
      if (start && date < start) return false
      if (end && date > end) return false
      return true
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
           建档日期
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
          if (isEditable && editingRowId === row.original.id && onFormChange) {
              return (
                  <Input 
                      type="date"
                      value={editFormData?.createdAt || ""}
                      onChange={(e) => onFormChange("createdAt", e.target.value)}
                      className="h-7 text-xs px-2"
                  />
              )
          }
        return <div className="text-center">{row.getValue("createdAt")}</div>
    },
  },
  {
    accessorKey: "completenessScore",
    meta: {
      visibilityLabel: "完整度",
    },
    filterFn: (row, id, value) => {
      const score = row.getValue(id) as number | undefined
      if (score == null) return false
      const [min, max] = value as [number, number]
      return score >= min && score <= max
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-center"
        >
           完整度
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const score = row.getValue("completenessScore") as number | undefined || 0
      
      // 颜色根据分数
      const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-green-500'
        if (score >= 50) return 'bg-yellow-500'
        if (score > 0) return 'bg-orange-500'
        return 'bg-gray-300'
      }
      
      return (
        <div className="flex items-center justify-center gap-2 px-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-20">
            <div 
              className={`h-full transition-all ${getScoreColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 min-w-8 text-right">{score}分</span>
        </div>
      )
    },
  },
  {
    accessorKey: "status",
    meta: {
      visibilityLabel: "状态",
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    header: () => <div className="text-center">状态</div>,
    cell: ({ row }) => {
        const status = row.getValue("status") as "已确认" | "待确认"
        return (
            <div className="flex justify-center">
                <PatientStatusBadge 
                    status={status} 
                    onChange={(newStatus) => onStatusChange && onStatusChange(row.original.id, newStatus)}
                    readonly={!onStatusChange}
                />
            </div>
        )
    }
  },
  ...(hasActions ? [{
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: any }) => {
        const patient = row.original
        const isEditing = isEditable && editingRowId === patient.id

        if (isEditing) {
            return (
                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => onSaveEdit && onSaveEdit(patient.id)}
                        disabled={isSaving}
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                     <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={onCancelEdit}
                        disabled={isSaving}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
  
        return (
          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            {isEditable && (
              <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={(e) => {
                      e.stopPropagation()
                      onStartEdit && onStartEdit(patient)
                  }}
                  title="编辑患者"
              >
                  <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(patient.caseNumber)
                    toast.success(`已复制病历号: ${patient.caseNumber}`)
                }}
                title="复制病历号"
            >
                <Copy className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                      e.stopPropagation()
                      onDelete(patient.id)
                  }}
                  title="删除患者"
              >
                  <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      },
  }] : [])
]
}
