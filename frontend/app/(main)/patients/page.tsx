"use client"



import * as React from "react"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { DataTable } from "@/components/shared/data-table"

import { getPatientColumns } from "@/components/patient/columns"

import { ImportPatientDialog } from "@/components/patient/import-patient-dialog"

import { CreatePatientDialog } from "@/components/patient/create-patient-dialog"

import { Button } from "@/components/ui/button"

import { Download, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Skeleton } from "@/components/ui/skeleton"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"

import { 

  getPatientsApi, 

  updatePatientApi, 

  deletePatientApi,

  createPatientApi,

  type PatientListItem,

  type PatientRequest

} from "@/lib/api/patients"
import { exportPatientsExcel } from "@/lib/api/export"
import { useAuthStore } from "@/lib/store/auth-store"
import { toast } from "sonner"
import { BatchAddToProjectDialog } from "@/components/patient/batch-add-to-project-dialog"
import { DataTableFacetedFilter } from "@/components/shared/data-table-faceted-filter"
import { DataTableAgeRangeFilter } from "@/components/shared/data-table-age-range-filter"
import { DataTableDateRangeFilter } from "@/components/shared/data-table-date-range-filter"
import { Input } from "@/components/ui/input"
import { RequireRole } from "@/components/auth/require-role"

// 适配前端 Patient 类型
interface Patient {
  id: string
  caseNumber: string
  name: string
  gender: "Male" | "Female"
  birthDate: string
  createdAt: string
  diagnosis: string
  lastVisit: string
  status: "已确认" | "待确认"
}

// 将后端数据转换为前端格式
function transformPatient(item: PatientListItem): Patient {
  return {
    id: item.id,
    caseNumber: item.case_number,
    name: item.name,
    gender: item.gender,
    birthDate: item.birth_date,
    createdAt: item.created_at,
    diagnosis: item.clinical_diagnosis || '',
    lastVisit: item.last_visit,
    status: item.status,
    completenessScore: item.completeness_score || 0,  // 新增：完整度评分
  }
}

export default function PatientsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})

  // 角色权限检查
  const role = user?.role

  // 研究员在患者列表页只读
  const canEditPatient = role !== 'researcher'
  const canCreatePatient = role !== 'researcher'
  const canDeletePatient = role !== 'researcher'
  const canChangeStatus = role !== 'doctor'

  // 年龄范围筛选状态
  const [ageRange, setAgeRange] = React.useState<[number, number]>([0, 120])
  // 日期范围筛选状态
  const [birthDateRange, setBirthDateRange] = React.useState<[string, string]>(["", ""])
  const [createdAtRange, setCreatedAtRange] = React.useState<[string, string]>(["", ""])

  // Inline Edit State

  const [editingRowId, setEditingRowId] = React.useState<string | null>(null)

  const [editFormData, setEditFormData] = React.useState<Partial<Patient> | null>(null)



  // 获取患者列表

  const { data: apiData, isLoading, error } = useQuery({

    queryKey: ['patients'],

    queryFn: () => getPatientsApi(),

  })



  // 转换数据格式

  const data = React.useMemo(() => {

    return apiData?.results?.map(transformPatient) || []

  }, [apiData])

  // 选中的患者 ID 列表
  const selectedPatientIds = React.useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => data[parseInt(index)]?.id)
      .filter(Boolean) as string[]
  }, [rowSelection, data])



  // 更新患者 mutation

  const updateMutation = useMutation({

    mutationFn: ({ id, data }: { id: string; data: Partial<PatientRequest> }) => 

      updatePatientApi(id, data),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['patients'] })

      setEditingRowId(null)

      setEditFormData(null)

    },

  })



  // 删除患者 mutation

  const deleteMutation = useMutation({

    mutationFn: (id: string) => deletePatientApi(id),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['patients'] })

    },

  })



  // 创建患者 mutation

  const createMutation = useMutation({

    mutationFn: (data: PatientRequest) => createPatientApi(data),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['patients'] })

    },

  })



  const handleCreate = (newPatient: any) => {

    createMutation.mutate({

      name: newPatient.name,

      case_number: newPatient.caseNumber,

      gender: newPatient.gender,

      birth_date: newPatient.birthDate,

      status: newPatient.status || '待确认',

      clinical_diagnosis: newPatient.diagnosis || '',

    })

  }



  const handleImport = async (newRows: any[]) => {

    // 批量创建患者

    for (const row of newRows) {

      await createPatientApi({

        name: row.name,

        case_number: row.caseNumber,

        gender: row.gender,

        birth_date: row.birthDate,

        status: '待确认',

      })

    }

    queryClient.invalidateQueries({ queryKey: ['patients'] })

  }



  const handleStatusChange = (patientId: string, newStatus: "已确认" | "待确认") => {

    updateMutation.mutate({

      id: patientId,

      data: { status: newStatus },

    })

  }



  const handleStartEdit = (patient: Patient) => {

    setEditingRowId(patient.id)

    setEditFormData({ ...patient })

  }



  const handleCancelEdit = () => {

    setEditingRowId(null)

    setEditFormData(null)

  }



  const handleSaveEdit = async (patientId: string) => {

    if (!editFormData) return

    

    updateMutation.mutate({

      id: patientId,

      data: {

        name: editFormData.name,

        case_number: editFormData.caseNumber,

        gender: editFormData.gender,

        birth_date: editFormData.birthDate,

        status: editFormData.status,

        clinical_diagnosis: editFormData.diagnosis,

      },

    })

  }



  const handleFormChange = (field: keyof Patient, value: any) => {

    setEditFormData(prev => prev ? ({ ...prev, [field]: value }) : null)

  }



  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)



  const handleDelete = (id: string) => {

    setDeleteTarget(id)

  }



  const [isExporting, setIsExporting] = React.useState(false)

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      // 如果有选中患者，导出选中的；否则导出全部
      await exportPatientsExcel(selectedPatientIds.length > 0 ? selectedPatientIds : undefined)
      if (selectedPatientIds.length > 0) {
        toast.success(`已导出选中的 ${selectedPatientIds.length} 位患者`)
      } else {
        toast.success('患者列表导出成功')
      }
    } catch (error) {
      toast.error(`导出失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Use shared column definition with handlers
  const columns = React.useMemo(() => getPatientColumns({
    editingRowId: canEditPatient ? editingRowId : null,
    editFormData: canEditPatient ? editFormData : null,
    isSaving: updateMutation.isPending,
    onStartEdit: canEditPatient ? handleStartEdit : undefined,
    onCancelEdit: canEditPatient ? handleCancelEdit : undefined,
    onSaveEdit: canEditPatient ? handleSaveEdit : undefined,
    onStatusChange: canChangeStatus ? handleStatusChange : undefined,
    onFormChange: canEditPatient ? handleFormChange : undefined,
    onDelete: canDeletePatient ? handleDelete : undefined,
  }), [editingRowId, editFormData, updateMutation.isPending, canEditPatient, canChangeStatus, canDeletePatient])



  // 加载状态

  if (isLoading) {

    return (

      <div className="flex flex-1 flex-col gap-6 p-4">

        <div className="flex items-center justify-between">

          <Skeleton className="h-8 w-32" />

          <div className="flex gap-2">

            <Skeleton className="h-10 w-24" />

            <Skeleton className="h-10 w-24" />

          </div>

        </div>

        <Skeleton className="h-96 w-full" />

      </div>

    )

  }



  // 错误状态

  if (error) {

    return (

      <div className="flex flex-1 items-center justify-center">

        <div className="text-center">

          <p className="text-red-600 mb-2">加载失败</p>

          <p className="text-muted-foreground text-sm">

            {error instanceof Error ? error.message : '请稍后重试'}

          </p>

        </div>

      </div>

    )

  }



  return (
    <RequireRole 
      allowedRoles={['researcher', 'doctor']}
      denyMessage="管理员没有查看患者列表的权限。如需访问患者数据，请联系研究员或医生。"
    >
      <div className="flex flex-1 flex-col gap-6 p-4">

        <div className="flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold tracking-tight text-blue-950">患者列表</h1>

          </div>

          <div className="flex items-center gap-2">
              {canCreatePatient && <ImportPatientDialog onImport={handleImport} />}
              {selectedPatientIds.length > 0 && (
                <BatchAddToProjectDialog
                  patientIds={selectedPatientIds}
                  onSuccess={() => setRowSelection({})}
                />
              )}
              {canCreatePatient && <CreatePatientDialog onSubmit={handleCreate} />}
          </div>

        </div>



        <div className="w-full py-2">

          {data.length > 0 ? (

            <DataTable

              columns={columns}

              data={data}

              searchPlaceholder="搜索患者姓名、诊断、ID..."

              rowSelection={rowSelection}

              setRowSelection={setRowSelection}

              onRowClick={(row) => router.push(`/patients/${row.id}`)}

              toolbar={(table) => (
                <>
                  {table.getColumn("gender") && (
                    <DataTableFacetedFilter
                      column={table.getColumn("gender")}
                      title="性别"
                      options={[
                        { label: "男", value: "Male" },
                        { label: "女", value: "Female" },
                      ]}
                    />
                  )}
                  {table.getColumn("status") && (
                    <DataTableFacetedFilter
                      column={table.getColumn("status")}
                      title="状态"
                      options={[
                        { label: "已确认", value: "已确认" },
                        { label: "待确认", value: "待确认" },
                      ]}
                    />
                  )}
                  <DataTableDateRangeFilter
                    title="出生日期"
                    startDate={birthDateRange[0]}
                    endDate={birthDateRange[1]}
                    onChange={(start, end) => {
                      setBirthDateRange([start, end])
                      table.getColumn("birthDate")?.setFilterValue(
                        !start && !end ? undefined : [start, end]
                      )
                    }}
                  />
                  <DataTableAgeRangeFilter
                    minAge={ageRange[0]}
                    maxAge={ageRange[1]}
                    onChange={(min, max) => {
                      setAgeRange([min, max])
                      table.getColumn("age")?.setFilterValue(
                        min === 0 && max === 120 ? undefined : [min, max]
                      )
                    }}
                  />
                  {table.getColumn("diagnosis") && (
                    <div className="relative">
                      <Input
                        placeholder="诊断筛选..."
                        value={(table.getColumn("diagnosis")?.getFilterValue() as string) ?? ""}
                        onChange={(e) =>
                          table.getColumn("diagnosis")?.setFilterValue(e.target.value || undefined)
                        }
                        className="h-8 w-[130px] lg:w-[160px]"
                      />
                    </div>
                  )}
                  <DataTableDateRangeFilter
                    title="建档日期"
                    startDate={createdAtRange[0]}
                    endDate={createdAtRange[1]}
                    onChange={(start, end) => {
                      setCreatedAtRange([start, end])
                      table.getColumn("createdAt")?.setFilterValue(
                        !start && !end ? undefined : [start, end]
                      )
                    }}
                  />
                </>
              )}

              actions={
                <Button variant="outline" size="sm" className="h-8" onClick={handleExportExcel} disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {isExporting ? '导出中…' : '导出列表'}
                </Button>
              }

            />

          ) : (

            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-slate-50">

              <div className="rounded-full bg-blue-50 p-4 mb-4">

                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />

                </svg>

              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-1">暂无患者</h3>

              <p className="text-muted-foreground mb-4">开始添加您的第一个患者</p>

              {canCreatePatient && <CreatePatientDialog onSubmit={handleCreate} />}
            </div>

          )}

        </div>

        <ConfirmDialog

          open={deleteTarget !== null}

          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}

          title="删除患者"

          description="确定要删除这个患者吗？此操作不可恢复。"

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
    </RequireRole>
  )

}

