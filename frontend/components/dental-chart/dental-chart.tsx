"use client"

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { RotateCcw, MousePointer2 } from "lucide-react"
import { Tooth, ToothType, ToothState, Surface, TreatmentData } from './tooth'
import { cn } from "@/lib/utils"
import { getDentalLabelsApi, type DentalLabel } from "@/lib/api/dental-labels"

// --- Data Constants ---
const PERMANENT_UPPER = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28]
const PERMANENT_LOWER = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]
const PRIMARY_UPPER   = [55,54,53,52,51, 61,62,63,64,65]
const PRIMARY_LOWER   = [85,84,83,82,81, 71,72,73,74,75]

// --- 硬编码回退标签（API不可用时使用） ---
const FALLBACK_LABELS: DentalLabel[] = [
  { id: 0, label_id: 'filling-resin', label: '充填(树脂)', label_type: 'color', value: 'filled-resin', color: '#ef4444', sort_order: 1, is_active: true, created_at: '' },
  { id: 0, label_id: 'filling-amalgam', label: '充填(银汞)', label_type: 'color', value: 'filled-amalgam', color: '#8b5cf6', sort_order: 2, is_active: true, created_at: '' },
  { id: 0, label_id: 'filling-gic', label: '充填(玻璃离子)', label_type: 'color', value: 'filled-gic', color: '#22c55e', sort_order: 3, is_active: true, created_at: '' },
  { id: 0, label_id: 'missing', label: '缺失', label_type: 'color', value: 'missing', color: '#654321', sort_order: 4, is_active: true, created_at: '' },
  { id: 0, label_id: 'crown', label: '牙冠', label_type: 'color', value: 'crown', color: '#f97316', sort_order: 5, is_active: true, created_at: '' },
  { id: 0, label_id: 'caries', label: '龋齿', label_type: 'color', value: 'caries', color: '#dc2626', sort_order: 6, is_active: true, created_at: '' },
  { id: 0, label_id: 'sym-R', label: '根管治疗 (R)', label_type: 'symbol', value: 'R', color: '', sort_order: 1, is_active: true, created_at: '' },
  { id: 0, label_id: 'sym-M', label: '缺失 (M)', label_type: 'symbol', value: 'M', color: '', sort_order: 2, is_active: true, created_at: '' },
  { id: 0, label_id: 'sym-C', label: '龋齿 (C)', label_type: 'symbol', value: 'C', color: '', sort_order: 3, is_active: true, created_at: '' },
  { id: 0, label_id: 'sym-F', label: '骨折 (F)', label_type: 'symbol', value: 'F', color: '', sort_order: 4, is_active: true, created_at: '' },
]

/** 将API标签列表构建为工具栏项目 */
function buildTreatmentTools(labels: DentalLabel[]) {
  const colorLabels = labels.filter(l => l.label_type === 'color')
  const symbolLabels = labels.filter(l => l.label_type === 'symbol')
  
  const tools: Array<{id: string; type: string; value?: string; label?: string; color?: string; icon?: React.ReactNode}> = []
  
  // 颜色标记
  colorLabels.forEach(l => {
    tools.push({ id: l.label_id, type: 'color', value: l.value, label: l.label, color: l.color })
  })
  // 清除颜色
  tools.push({ id: 'color-clear', type: 'color', value: 'clear', label: '清除状态', icon: <RotateCcw className="w-3 h-3"/> })
  // 分隔符
  tools.push({ id: 'div1', type: 'divider' })
  // 符号标记
  symbolLabels.forEach(l => {
    tools.push({ id: l.label_id, type: 'symbol', value: l.value, label: l.label })
  })
  // 清除符号
  tools.push({ id: 'sym-clear', type: 'symbol', value: '', label: '清除符号', icon: <RotateCcw className="w-3 h-3"/> })
  
  return tools
}

/** 模块级当前工具列表 - 由 DentalChart 组件动态更新 */
let currentTools: ReturnType<typeof buildTreatmentTools> = buildTreatmentTools(FALLBACK_LABELS)

// Helper to get meaning map（保持原始签名，供Tooth组件使用）
const getMeaningHelper = (type: 'color' | 'symbol', value: string): string => {
    const tool = currentTools.find(t => t.type === type && t.value === value)
    return tool?.label || ''
}

const getColorHelper = (value: string): string => {
    const tool = currentTools.find(t => t.value === value)
    return tool?.color || 'white'
}

// --- Helper Components (Outside Render) ---

interface ToothWrapperProps {
  id: number
  type: ToothType
  labelPos: 'top' | 'bottom'
  data: ToothState
  selected: Set<string>
  onMouseDown: (id: number, surface: Surface) => void
  onMouseEnter: (id: number, surface: Surface) => void
}

const ToothWrapper = React.memo(({ id, type, labelPos, data, selected, onMouseDown, onMouseEnter}: ToothWrapperProps) => {
  const selectedSurfaces = Array.from(selected)
    .filter(k => k.startsWith(`${id}-`))
    .map(k => k.split('-')[1])

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      {labelPos === 'top' && <span className="text-xs text-slate-400 font-medium">{id}</span>}
      <Tooth 
         id={id}
         type={type} 
         data={data} 
         selectedSurfaces={selectedSurfaces}
         onSurfaceMouseDown={(s) => onMouseDown(id, s)}
         onSurfaceMouseEnter={(s) => onMouseEnter(id, s)}
         getMeaning={getMeaningHelper}
         getColor={getColorHelper}
      />
      {labelPos === 'bottom' && <span className="text-xs text-slate-400 font-medium">{id}</span>}
    </div>
  )
})
ToothWrapper.displayName = "ToothWrapper"

interface RenderRowProps {
    range: number[]
    type: ToothType
    labelPos: 'top' | 'bottom'
    allData: Record<number, ToothState>
    selected: Set<string>
    onMouseDown: (id: number, surface: Surface) => void
    onMouseEnter: (id: number, surface: Surface) => void
    className?: string
}

const RenderRow = React.memo(({ range, type, labelPos, allData, selected, onMouseDown, onMouseEnter, className }: RenderRowProps) => {
    const half = Math.ceil(range.length / 2)
    return (
        <div className={`flex items-end gap-2 w-full ${className || ''}`}>
            <div className="flex gap-1 flex-1 min-w-0">
                {range.slice(0, half).map(id => (
                   <ToothWrapper 
                      key={id} id={id} type={type} labelPos={labelPos} 
                      data={allData[id] || {}} 
                      selected={selected} 
                      onMouseDown={onMouseDown} onMouseEnter={onMouseEnter}
                   />
                ))}
            </div>
            <div className="w-px h-8 bg-slate-300 mx-2 self-center opacity-50 shrink-0"></div>
            <div className="flex gap-1 flex-1 min-w-0">
                {range.slice(half).map(id => (
                   <ToothWrapper 
                      key={id} id={id} type={type} labelPos={labelPos} 
                      data={allData[id] || {}} 
                      selected={selected} 
                      onMouseDown={onMouseDown} onMouseEnter={onMouseEnter}
                   />
                ))}
            </div>
        </div>
    )
})
RenderRow.displayName = "RenderRow"

// ... props definition
interface DentalChartProps {
    className?: string
    patientId?: string
    patientBirthDate?: string // 患者出生日期，用于判断是否显示乳牙
    initialData?: Record<number, ToothState>
    onSave?: (data: Record<number, ToothState>) => void
}

export default function DentalChart({ className, patientBirthDate, initialData, onSave }: DentalChartProps) {
  // 动态加载牙位图标签
  const { data: apiLabels } = useQuery({
    queryKey: ['dental-labels'],
    queryFn: getDentalLabelsApi,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  })
  
  // 构建工具栏
  const treatmentTools = useMemo(() => {
    const labels = apiLabels || FALLBACK_LABELS
    return buildTreatmentTools(labels)
  }, [apiLabels])
  
  // 在Effect中更新模块级变量供helper函数使用
  React.useEffect(() => {
    currentTools = treatmentTools
  }, [treatmentTools])
  
  // Data Store
  const [data, setData] = useState<Record<number, ToothState>>(initialData || {})
  
  // 根据数据自动判断是否有乳牙数据
  const hasPrimaryTeeth = React.useMemo(() => {
    const toothIds = Object.keys(data).map(Number)
    return toothIds.some(id => (id >= 51 && id <= 85))
  }, [data])
  
  // 计算患者年龄
  const patientAge = React.useMemo(() => {
    if (!patientBirthDate) return null
    const birthDate = new Date(patientBirthDate)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }, [patientBirthDate])
  
  // 默认显示乳牙的条件：年龄小于13岁 或 有乳牙数据
  const shouldShowPrimaryByDefault = React.useMemo(() => {
    return (patientAge !== null && patientAge < 13) || hasPrimaryTeeth
  }, [patientAge, hasPrimaryTeeth])
  
  const [showPrimary, setShowPrimary] = useState(shouldShowPrimaryByDefault)
  
  // 当初始数据变化时更新
  React.useEffect(() => {
    if (initialData) {
      setData(initialData)
    }
  }, [initialData])
  
  // 当默认显示条件变化时更新乳牙显示状态
  React.useEffect(() => {
    if (shouldShowPrimaryByDefault && !showPrimary) {
      setShowPrimary(true)
    }
  }, [shouldShowPrimaryByDefault, showPrimary])

  // Selection Store
  const [selected, setSelected] = useState<Set<string>>(new Set())


  // Check Drag State
  const dragMode = React.useRef<'select' | 'deselect' | null>(null)

  // Global mouse up to stop dragging
  React.useEffect(() => {
    const stopDrag = () => { dragMode.current = null }
    window.addEventListener('mouseup', stopDrag)
    return () => window.removeEventListener('mouseup', stopDrag)
  }, [])

  const updateSelection = (id: number, surface: Surface, mode: 'select' | 'deselect') => {
      setSelected(prev => {
          const newSelected = new Set(prev)
          const key = `${id}-${surface}`
          if (mode === 'select') newSelected.add(key)
          else newSelected.delete(key)
          return newSelected
      })
  }

  const handleSurfaceMouseDown = (id: number, surface: Surface) => {
      const key = `${id}-${surface}`
      // If currently selected -> Switch to Deselect Mode
      // If not selected -> Switch to Select Mode
      const isSelected = selected.has(key)
      const mode = isSelected ? 'deselect' : 'select'
      
      dragMode.current = mode
      updateSelection(id, surface, mode)
  }
  
  const handleSurfaceMouseEnter = (id: number, surface: Surface) => {
      if (!dragMode.current) return
      updateSelection(id, surface, dragMode.current)
  }

  const applyTreatment = (tool: ReturnType<typeof buildTreatmentTools>[0]) => {
    if (selected.size === 0) return
    if (tool.type === 'divider') return

    setData(prev => {
      const next = { ...prev }
      selected.forEach(key => {
        const [idStr, surface] = key.split('-')
        const id = parseInt(idStr)
        
        if (!next[id]) next[id] = {}
        const tooth = { ...next[id] }
        
        const currentData = tooth[surface] || {}
        const newData: TreatmentData = { ...currentData }

        if (tool.type === 'color') {
           newData.color = tool.value as string
        } else if (tool.type === 'symbol') {
           newData.symbol = tool.value as string
        }

         if (newData.color === 'clear') delete newData.color
         if (newData.symbol === '') delete newData.symbol
        
        tooth[surface] = newData
        next[id] = tooth
      })
      return next
    })
    
    // Auto-clear selection after application
    setSelected(new Set())
  }
  
  const handleSave = () => {
    if (onSave) {
      onSave(data)
    }
  }

  const clearSelection = () => setSelected(new Set())

  return (
    <Card className={`h-full flex flex-col border shadow-sm bg-white overflow-hidden ${className || ''}`}>
        <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800">牙位图</CardTitle>
                <div className="flex items-center gap-2">
                    <label className="text-xs flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={showPrimary} onChange={e => setShowPrimary(e.target.checked)} className="rounded text-blue-500 focus:ring-0" />
                        显示乳牙
                    </label>
                    {onSave && (
                        <Button size="sm" onClick={handleSave} className="h-7">
                            保存牙位图
                        </Button>
                    )}
                </div>
            </div>
        </CardHeader>
        <Separator />
        
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center justify-center">
            <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-slate-100 rounded text-xs text-slate-500">
                <MousePointer2 className="w-3 h-3" />
                <span>选中: {selected.size}</span>
                {selected.size > 0 && <button onClick={clearSelection} className="ml-2 bg-slate-200 px-1 rounded hover:bg-slate-300 text-slate-700">取消选中</button>}
            </div>
            
            <Separator orientation="vertical" className="h-6" />

            {treatmentTools.map((tool: ReturnType<typeof buildTreatmentTools>[0], idx: number) => {
                if (tool.type === 'divider') return <Separator key={idx} orientation="vertical" className="h-6 mx-1" />
                
                return (
                    <Button 
                        key={tool.id}
                        variant="outline" 
                        size="sm" 
                        className="h-7 px-2 text-xs gap-1 min-w-[30px] bg-white"
                        onClick={() => applyTreatment(tool)}
                        title={tool.label}
                    >
                        {tool.type === 'color' && tool.color && (
                            <div className="w-3 h-3 rounded-sm border border-black/10" style={{ background: tool.color }}></div>
                        )}
                        {tool.type === 'symbol' && tool.value && (
                            <span className="font-bold">{tool.value}</span>
                        )}
                        {tool.icon}
                    </Button>
                )
            })}
        </div>
        
        <CardContent className="flex-1 overflow-hidden p-0 relative bg-slate-50/30">
            <div className="h-full w-full overflow-auto flex flex-col items-center">
                <div className="p-4 md:p-8 flex flex-col items-center gap-4 w-full max-w-5xl mx-auto">
                    
                    {/* Upper Permanent */}
                    <RenderRow 
                        range={PERMANENT_UPPER} type="upper" labelPos="top" 
                        allData={data} selected={selected} 
                        onMouseDown={handleSurfaceMouseDown} onMouseEnter={handleSurfaceMouseEnter}
                    />

                    {/* Primary Section */}
                    {showPrimary && (
                        <div className="flex flex-col gap-2 p-6 bg-slate-100/50 rounded-2xl border border-dashed border-slate-200 w-[70%] self-center">
                             <RenderRow 
                                range={PRIMARY_UPPER} type="deciduous" labelPos="top"
                                allData={data} selected={selected} 
                                onMouseDown={handleSurfaceMouseDown} onMouseEnter={handleSurfaceMouseEnter}
                             />
                             <RenderRow 
                                range={PRIMARY_LOWER} type="deciduous" labelPos="bottom"
                                allData={data} selected={selected} 
                                onMouseDown={handleSurfaceMouseDown} onMouseEnter={handleSurfaceMouseEnter}
                             />
                        </div>
                    )}

                    {/* Lower Permanent */}
                    <RenderRow 
                        range={PERMANENT_LOWER} type="lower" labelPos="bottom"
                        allData={data} selected={selected} 
                        onMouseDown={handleSurfaceMouseDown} onMouseEnter={handleSurfaceMouseEnter}
                    />
                    
                </div>
            </div>
        </CardContent>
    </Card>
  )
}
