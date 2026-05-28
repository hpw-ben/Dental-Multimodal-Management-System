"use client"



import * as React from "react"

import { useParams, useRouter } from "next/navigation"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { getPatientColumns } from "@/components/patient/columns"

import { DataTable } from "@/components/shared/data-table"

import { Button } from "@/components/ui/button"

import { PackageOpen, Trash2 } from "lucide-react"
import { DataTableFacetedFilter } from "@/components/shared/data-table-faceted-filter"
import { DataTableAgeRangeFilter } from "@/components/shared/data-table-age-range-filter"
import { DataTableDateRangeFilter } from "@/components/shared/data-table-date-range-filter"
import { Input } from "@/components/ui/input"
import { getProjectApi, addProjectPatientApi, removeProjectPatientApi } from "@/lib/api/projects"
import { ExportDatasetDialog } from "@/components/export-dataset-dialog"
import { createPatientApi, getPatientsApi, updatePatientApi, type PatientRequest } from "@/lib/api/patients"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"

import type { Patient } from "@/app/(main)/patients/data"

import { CreatePatientDialog } from "@/components/patient/create-patient-dialog"

import { ImportPatientDialog } from "@/components/patient/import-patient-dialog"

import { SelectPatientDialog } from "@/components/patient/select-patient-dialog"

import { Skeleton } from "@/components/ui/skeleton"

import { toast } from "sonner"
import { useAuthStore } from "@/lib/store/auth-store"

export default function ProjectDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null)
  const [editFormData, setEditFormData] = React.useState<Partial<Patient> | null>(null)
  const [removeTarget, setRemoveTarget] = React.useState<string | null>(null)
  const [showExportDialog, setShowExportDialog] = React.useState(false)
  const [removeAllOpen, setRemoveAllOpen] = React.useState(false)
  const [removeSelectedOpen, setRemoveSelectedOpen] = React.useState(false)

  // 筛选状态
  const [ageRange, setAgeRange] = React.useState<[number, number]>([0, 120])
  const [birthDateRange, setBirthDateRange] = React.useState<[string, string]>(["", ""])
  const [createdAtRange, setCreatedAtRange] = React.useState<[string, string]>(["", ""])

  const projectId = params.id as string

  // 角色权限
  const role = user?.role
  const canCreatePatient = role !== 'researcher'  // 研究员不能新建不存在的患者
  const canEditPatient = role !== 'researcher'    // 研究员不能编辑患者信息
  const canChangeStatus = role !== 'doctor'        // 医生不能改状态
  const canExport = role !== 'doctor'              // 医生不能导出



  // 获取项目详情

  const { data: project, isLoading, error } = useQuery({

    queryKey: ['project', projectId],

    queryFn: () => getProjectApi(projectId),

    enabled: !!projectId,

  })



  // 添加患者到项目的 mutation

  const addPatientMutation = useMutation({

    mutationFn: ({ patientId }: { patientId: string }) => 

      addProjectPatientApi(projectId, patientId),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['project', projectId] })

    },

  })



  // 创建新患者的 mutation

  const createPatientMutation = useMutation({

    mutationFn: createPatientApi,

    onSuccess: (newPatient) => {

      // 创建成功后，将患者添加到项目

      addPatientMutation.mutate({ patientId: newPatient.id })

    },

  })



  // 更新患者 mutation

  const updatePatientMutation = useMutation({

    mutationFn: ({ id, data }: { id: string; data: Partial<PatientRequest> }) =>

      updatePatientApi(id, data),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['project', projectId] })

      setEditingRowId(null)

      setEditFormData(null)

    },

    onError: () => {

      toast.error('更新失败')

    },

  })



  // 从课题中移除患者 mutation

  const removePatientMutation = useMutation({

    mutationFn: (patientId: string) => removeProjectPatientApi(projectId, patientId),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['project', projectId] })

      toast.success('已从课题中移除')

    },

    onError: () => {

      toast.error('移除失败')

    },

  })



  const handleStatusChange = (patientId: string, newStatus: '已确认' | '待确认') => {

    updatePatientMutation.mutate({ id: patientId, data: { status: newStatus } })

  }



  const handleStartEdit = (patient: Patient) => {

    setEditingRowId(patient.id)

    setEditFormData({ ...patient })

  }



  const handleCancelEdit = () => {

    setEditingRowId(null)

    setEditFormData(null)

  }



  const handleSaveEdit = (patientId: string) => {

    if (!editFormData) return

    updatePatientMutation.mutate({

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



  const handleFormChange = (field: keyof Patient, value: string) => {

    setEditFormData(prev => prev ? ({ ...prev, [field]: value }) : null)

  }



  const handleRemoveFromProject = (id: string) => {

    setRemoveTarget(id)

  }



  const columns = React.useMemo(() => getPatientColumns({

    editingRowId: canEditPatient ? editingRowId : null,

    editFormData: canEditPatient ? editFormData : null,

    isSaving: updatePatientMutation.isPending,

    onStartEdit: canEditPatient ? handleStartEdit : undefined,

    onCancelEdit: canEditPatient ? handleCancelEdit : undefined,

    onSaveEdit: canEditPatient ? handleSaveEdit : undefined,

    onStatusChange: canChangeStatus ? handleStatusChange : undefined,
    onFormChange: canEditPatient ? handleFormChange : undefined,
    onDelete: handleRemoveFromProject,
  }), [editingRowId, editFormData, updatePatientMutation.isPending, canChangeStatus, canEditPatient])

  // 从项目患者关联中提取患者列表
  const patients = project?.projectpatient_set?.map(pp => ({
    id: pp.patient_detail.id,
    name: pp.patient_detail.name,
    caseNumber: pp.patient_detail.case_number,
    gender: pp.patient_detail.gender as 'Male' | 'Female',
    birthDate: pp.patient_detail.birth_date,
    status: pp.patient_detail.status as '已确认' | '待确认',
    createdAt: pp.patient_detail.created_at,
    diagnosis: pp.patient_detail.clinical_diagnosis || '',
    age: pp.patient_detail.age,
    lastVisit: pp.patient_detail.last_visit,
    completenessScore: pp.patient_detail.completeness_score || 0,  // 新增：完整度评分
  })) || []

  // 选中的患者 ID 列表
  const selectedPatientIds = React.useMemo(() => {
    return Object.keys(rowSelection)
      .filter(key => rowSelection[key])
      .map(index => patients[parseInt(index)]?.id)
      .filter(Boolean) as string[]
  }, [rowSelection, patients])



  // 创建患者处理函数

  const handleCreate = (newPatient: { name: string; caseNumber: string; gender: 'Male' | 'Female'; birthDate: string; status: string; diagnosis: string }) => {

    createPatientMutation.mutate({

      name: newPatient.name,

      case_number: newPatient.caseNumber,

      gender: newPatient.gender,

      birth_date: newPatient.birthDate,

      status: (newPatient.status || '待确认') as '已确认' | '待确认',

      clinical_diagnosis: newPatient.diagnosis || '',

    })

  }



  // 选择已有患者处理函数

  const handleSelectPatients = async (patientIds: string[]) => {

    for (const patientId of patientIds) {

      await addProjectPatientApi(projectId, patientId)

    }

    queryClient.invalidateQueries({ queryKey: ['project', projectId] })

  }



  // 生成唯一病例号

  const generateCaseNumber = () => {

    const date = new Date()

    const year = date.getFullYear()

    const month = String(date.getMonth() + 1).padStart(2, '0')

    const day = String(date.getDate()).padStart(2, '0')

    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')

    return `P${year}${month}${day}${random}`

  }



  // 导入患者处理函数（全属性去重）

  const handleImport = async (newRows: { name: string; caseNumber?: string; gender: 'Male' | 'Female'; birthDate: string; diagnosis?: string }[]) => {

    try {

      // 获取所有现有患者

      const allPatientsData = await getPatientsApi({})

      const allPatients = allPatientsData.results



      // 获取当前课题中的患者ID列表

      const currentProjectPatientIds = new Set(patients.map(p => p.id))



      let addedCount = 0

      let createdCount = 0

      let skippedCount = 0

      let errorCount = 0



      for (const row of newRows) {

        try {

          // 判断是否提供了病例号

          const hasCaseNumber = row.caseNumber && row.caseNumber.trim() !== ''

          const inputCaseNumber = hasCaseNumber ? row.caseNumber!.trim() : null



          let existingPatient = null



          if (hasCaseNumber) {

            // 如果提供了病例号，按全属性匹配（包括病例号）

            existingPatient = allPatients.find(p => 

              p.name === row.name &&

              p.case_number === inputCaseNumber &&

              p.gender === row.gender &&

              p.birth_date === row.birthDate &&

              (p.clinical_diagnosis || '') === (row.diagnosis || '')

            )

          } else {

            // 如果没有病例号，按其他属性匹配（姓名+性别+出生日期+诊断）

            existingPatient = allPatients.find(p => 

              p.name === row.name &&

              p.gender === row.gender &&

              p.birth_date === row.birthDate &&

              (p.clinical_diagnosis || '') === (row.diagnosis || '')

            )

          }



          if (existingPatient) {

            // 患者已存在，检查是否已在课题中

            if (currentProjectPatientIds.has(existingPatient.id)) {

              console.log(`患者 ${row.name} 已在课题中，跳过`)

              skippedCount++

            } else {

              // 添加到课题

              await addProjectPatientApi(projectId, existingPatient.id)

              currentProjectPatientIds.add(existingPatient.id)

              addedCount++

            }

          } else {

            // 患者不存在，创建新患者并添加到课题

            // 如果没有病例号，现在才生成

            const finalCaseNumber = inputCaseNumber || generateCaseNumber()

            

            const newPatient = await createPatientApi({

              name: row.name,

              case_number: finalCaseNumber,

              gender: row.gender,

              birth_date: row.birthDate,

              status: '待确认',

              clinical_diagnosis: row.diagnosis || '',

            })

            await addProjectPatientApi(projectId, newPatient.id)

            currentProjectPatientIds.add(newPatient.id)

            createdCount++

          }

        } catch (rowErr: unknown) {

          // 区分"已在课题中"和其他错误

          const errDetail = (rowErr as { response?: { data?: { detail?: string } } })?.response?.data?.detail

          if (errDetail === '该患者已在项目中') {

            console.log(`患者 ${row.name} 已在课题中，跳过`)

            skippedCount++

          } else {

            console.error(`导入患者 ${row.name} 失败:`, rowErr)

            errorCount++

          }

        }

      }



      queryClient.invalidateQueries({ queryKey: ['project', projectId] })

      const messageParts = []

      if (createdCount > 0) messageParts.push(`${createdCount} 个新建`)

      if (addedCount > 0) messageParts.push(`${addedCount} 个已有`)

      if (skippedCount > 0) messageParts.push(`${skippedCount} 个已在课题中`)

      if (errorCount > 0) messageParts.push(`${errorCount} 个失败`)

      

      const message = `导入完成：${messageParts.join('，')}`

      console.log(message)

      toast.success(message)

    } catch (err) {

      console.error('导入失败:', err)

      toast.error(`导入失败：${err instanceof Error ? err.message : '未知错误'}`)

    }

  }



  // 加载状态

  if (isLoading) {

    return (

      <div className="flex flex-1 flex-col gap-6 p-4">

        <div className="flex items-center justify-between">

          <div className="space-y-2">

            <Skeleton className="h-8 w-64" />

            <Skeleton className="h-4 w-96" />

          </div>

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

          <p className="text-muted-foreground text-sm mb-4">

            {error instanceof Error ? error.message : '请稍后重试'}

          </p>

          <Button variant="outline" onClick={() => router.back()}>

            返回

          </Button>

        </div>

      </div>

    )

  }



  return (

    <>

    <div className="flex flex-1 flex-col gap-6 p-4">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-2xl font-bold tracking-tight text-blue-950">

            {project?.title || '课题详情'}

          </h1>

          <p className="text-muted-foreground mt-1 max-w-2xl">

            {project?.description || '暂无描述'}

          </p>

        </div>

        <div className="flex items-center gap-2">
            {canCreatePatient && <ImportPatientDialog onImport={handleImport} />}
            {canCreatePatient && <CreatePatientDialog onSubmit={handleCreate} />}
        </div>

      </div>



      <div className="w-full py-2">

        {patients.length > 0 ? (

          <DataTable 

              columns={columns} 

              data={patients} 

              searchPlaceholder="在当前课题中搜索患者..." 

              rowSelection={rowSelection}

              setRowSelection={setRowSelection}

              onRowClick={(row) => router.push(`/projects/${projectId}/patients/${row.id}`)}

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
                <div className="flex items-center gap-2">
                  {canExport && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setShowExportDialog(true)}>
                      <PackageOpen className="mr-2 h-4 w-4" />
                      {selectedPatientIds.length > 0 ? `导出选中 (${selectedPatientIds.length}位)` : '导出数据集'}
                    </Button>
                  )}
                  <SelectPatientDialog
                    existingPatientIds={patients.map(p => p.id)}
                    onSelect={handleSelectPatients}
                  />
                  {(() => {
                    const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k]).map(idx => patients[Number(idx)]?.id).filter(Boolean)
                    const hasSelection = selectedIds.length > 0
                    return hasSelection ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8"
                        onClick={() => setRemoveSelectedOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        移除选中 ({selectedIds.length})
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => setRemoveAllOpen(true)}
                        disabled={patients.length === 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        移除全部
                      </Button>
                    )
                  })()}
                </div>
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

            <p className="text-muted-foreground mb-4">该课题尚未添加任何患者</p>

            {canCreatePatient && <CreatePatientDialog onSubmit={handleCreate} />}
          </div>
        )}
      </div>
    </div>

    <ConfirmDialog

      open={removeTarget !== null}

      onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}

      title="从课题中移除"

      description="确定要将该患者从课题中移除吗？患者数据本身不会被删除。"

      confirmText="移除"

      variant="destructive"

      onConfirm={() => {

        if (removeTarget !== null) {

          removePatientMutation.mutate(removeTarget)

          setRemoveTarget(null)

        }

      }}

    />

    {project && (
      <ExportDatasetDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        projectId={projectId}
        projectTitle={project.title}
        selectedPatientIds={selectedPatientIds}  // 新增：传递选中的患者ID
      />
    )}

    <ConfirmDialog
      open={removeAllOpen}
      onOpenChange={setRemoveAllOpen}
      title="移除全部患者"
      description={`确定要将课题中的全部 ${patients.length} 名患者移除吗？患者数据本身不会被删除。`}
      confirmText="全部移除"
      variant="destructive"
      onConfirm={async () => {
        try {
          for (const p of patients) {
            await removeProjectPatientApi(projectId, p.id)
          }
          queryClient.invalidateQueries({ queryKey: ['project', projectId] })
          setRowSelection({})
          toast.success(`已移除全部 ${patients.length} 名患者`)
        } catch {
          toast.error('移除失败')
        }
      }}
    />

    <ConfirmDialog
      open={removeSelectedOpen}
      onOpenChange={setRemoveSelectedOpen}
      title="移除选中患者"
      description={`确定要将选中的 ${Object.keys(rowSelection).filter(k => rowSelection[k]).length} 名患者从课题中移除吗？患者数据本身不会被删除。`}
      confirmText="移除选中"
      variant="destructive"
      onConfirm={async () => {
        try {
          const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k]).map(idx => patients[Number(idx)]?.id).filter(Boolean)
          for (const id of selectedIds) {
            await removeProjectPatientApi(projectId, id)
          }
          queryClient.invalidateQueries({ queryKey: ['project', projectId] })
          setRowSelection({})
          toast.success(`已移除 ${selectedIds.length} 名患者`)
        } catch {
          toast.error('移除失败')
        }
      }}
    />
    </>
  )
}

