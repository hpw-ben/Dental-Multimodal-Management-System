"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import DentalChart from "@/components/dental-chart/dental-chart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { FileText, Pencil, Loader2 } from "lucide-react"
import { ImageGallery } from "@/components/dicom-viewer/image-gallery"
import { MedicalHistory } from "@/components/patient/medical-history"
import { PatientStatusBadge } from "@/components/patient/patient-status-badge"
import { PatientAnnotationMarker } from "@/components/patient/patient-annotation-marker"
import { getPatientApi, updatePatientApi, getPatientsApi } from "@/lib/api/patients"
import { getProjectApi } from "@/lib/api/projects"
import { getDentalChartByPatientApi, saveDentalChartApi } from "@/lib/api/dental-charts"
import type { ToothState } from "@/components/dental-chart/tooth"
import { toast } from "sonner"

interface PatientDetailContentProps {
  patientId: string
  projectId?: string // 从课题进入时传入，限定翻页范围并影响导航 URL
}

export function PatientDetailContent({ patientId, projectId }: PatientDetailContentProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // 获取患者详情
  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientApi(patientId),
    enabled: !!patientId,
  })

  // 获取全局患者列表（仅非课题模式）
  const { data: allPatientsData } = useQuery({
    queryKey: ['patients', 'all'],
    queryFn: () => getPatientsApi({}),
    enabled: !projectId,
  })

  // 获取课题详情（课题模式：用于获取课题内患者列表）
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProjectApi(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })

  // 获取患者牙位图数据
  const { data: dentalChartData } = useQuery({
    queryKey: ['dentalChart', patientId],
    queryFn: () => getDentalChartByPatientApi(patientId),
    enabled: !!patientId,
    retry: false,
  })

  // 保存牙位图的 mutation
  const saveDentalChartMutation = useMutation({
    mutationFn: (chartData: Record<number, ToothState>) =>
      saveDentalChartApi(patientId, chartData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentalChart', patientId] })
      toast.success('牙位图数据已保存')
    },
    onError: (error: unknown) => {
      const err = error as { message?: string }
      toast.error(`保存失败：${err.message || '请稍后重试'}`)
    },
  })

  const handleSaveDentalChart = (chartData: Record<number, ToothState>) => {
    saveDentalChartMutation.mutate(chartData)
  }

  // State for editable diagnosis
  const [diagnosis, setDiagnosis] = React.useState('')
  const [isEditingDiagnosis, setIsEditingDiagnosis] = React.useState(false)
  const [status, setStatus] = React.useState<'已确认' | '待确认'>('待确认')

  // 更新患者信息的 mutation
  const updatePatientMutation = useMutation({
    mutationFn: (data: { clinical_diagnosis?: string; status?: '已确认' | '待确认' }) =>
      updatePatientApi(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      }
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } }; message?: string }
      toast.error(`更新失败：${err?.response?.data?.detail || err.message || '未知错误'}`)
    },
  })

  // Update when patient changes
  React.useEffect(() => {
    if (patient) {
      setDiagnosis(patient.clinical_diagnosis || '')
      setStatus(patient.status)
    }
  }, [patient])

  // Calculate Age
  const age = patient?.age || 0

  // 根据来源构建患者 ID 列表
  const patientIds = React.useMemo(() => {
    if (projectId && projectData?.projectpatient_set) {
      // 课题模式：仅课题内患者
      return projectData.projectpatient_set.map((pp: { patient_detail: { id: string } }) => pp.patient_detail.id)
    }
    // 全局模式
    return allPatientsData?.results?.map(p => p.id) || []
  }, [projectId, projectData, allPatientsData])

  const currentIndex = patientIds.indexOf(patientId)
  const totalPatients = patientIds.length

  // 构建患者详情页 URL 的辅助函数
  const buildPatientUrl = React.useCallback((pid: string) => {
    if (projectId) {
      return `/projects/${projectId}/patients/${pid}`
    }
    return `/patients/${pid}`
  }, [projectId])

  // 导航函数
  const handlePrev = React.useCallback(() => {
    if (currentIndex > 0) {
      router.push(buildPatientUrl(patientIds[currentIndex - 1]))
    }
  }, [currentIndex, patientIds, router, buildPatientUrl])

  const handleNext = React.useCallback(() => {
    if (currentIndex < patientIds.length - 1) {
      router.push(buildPatientUrl(patientIds[currentIndex + 1]))
    }
  }, [currentIndex, patientIds, router, buildPatientUrl])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrev, handleNext])

  const handleDiagnosisSave = () => {
    setIsEditingDiagnosis(false)
    if (diagnosis !== patient?.clinical_diagnosis) {
      updatePatientMutation.mutate({ clinical_diagnosis: diagnosis })
    }
  }

  const handleStatusChange = (newStatus: '已确认' | '待确认') => {
    setStatus(newStatus)
    updatePatientMutation.mutate({ status: newStatus })
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-muted-foreground">加载患者信息中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error || !patient) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-60px)]">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg text-red-600">加载患者信息失败</p>
          <p className="text-sm text-muted-foreground">{error?.message || '患者不存在'}</p>
          <Button onClick={() => router.back()}>返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] gap-4 p-4 overflow-hidden">
       {/* Top Header: Patient Info */}
       <div className="flex flex-shrink-0 items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold tracking-tight">{patient.name}</h1>
                  <Badge variant="outline" className="text-xs font-normal">
                    {patient.gender === 'Male' ? '男' : '女'}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-normal">
                    {age} 岁
                  </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm mt-1">
                  {isEditingDiagnosis ? (
                       <div className="flex items-center gap-1">
                          <span className="font-medium text-xs text-blue-700">临床诊断:</span>
                          <Input 
                              value={diagnosis}
                              onChange={(e) => setDiagnosis(e.target.value)}
                              onBlur={handleDiagnosisSave}
                              onKeyDown={(e) => e.key === 'Enter' && handleDiagnosisSave()}
                              autoFocus
                              className="h-6 w-[200px] text-xs"
                              disabled={updatePatientMutation.isPending}
                          />
                       </div>
                  ) : (
                      <Badge 
                        variant="secondary" 
                        className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 cursor-pointer group transition-colors"
                        onClick={() => setIsEditingDiagnosis(true)}
                        title="点击修改诊断"
                      >
                        临床诊断: {diagnosis || '未填写'}
                        <Pencil className="w-3 h-3 ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                      </Badge>
                  )}
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    病历号: <span className="font-mono text-slate-700">{patient.case_number}</span>
                  </span>
                  
                  <PatientStatusBadge 
                      status={status} 
                      onChange={handleStatusChange}
                  />
                  
                  <PatientAnnotationMarker 
                      patientId={patientId}
                      patientName={patient.name}
                  />
              </div>
          </div>
          <div className="flex items-center gap-2">
              <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  导出病历
              </Button>
          </div>
       </div>

       {/* Main Workstation Layout */}
       <div className="flex flex-1 gap-4 min-h-0">
           {/* Left: Medical History (25%) */}
           <MedicalHistory patientId={patientId} />

           {/* Center: Dental Chart (50%) */}
           <DentalChart 
             className="w-2/4 min-h-0" 
             patientId={patientId}
             patientBirthDate={patient?.birth_date}
             initialData={dentalChartData?.chart_data}
             onSave={handleSaveDentalChart}
           />

           {/* Right: Media Gallery (25%) */}
           <ImageGallery patientId={patientId} />
       </div>
       
       {/* Footer: Pagination */}
       <div className="flex flex-shrink-0 items-center justify-center gap-8 py-2 bg-white/80 backdrop-blur border text-slate-700 rounded-lg shadow-sm">
            <Button 
              variant="ghost" 
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-8 text-xs" 
              onClick={handlePrev}
              disabled={currentIndex <= 0}
            >
                &lt; 上一个 (←)
            </Button>
            <span className="font-mono text-sm font-medium">进度: {currentIndex + 1} / {totalPatients} 个患者</span>
            <Button 
              variant="ghost" 
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-8 text-xs" 
              onClick={handleNext}
              disabled={currentIndex >= totalPatients - 1}
            >
                下一个 (→) &gt;
            </Button>
       </div>
    </div>
  )
}
