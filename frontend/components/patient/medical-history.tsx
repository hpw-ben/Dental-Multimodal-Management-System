"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Calendar, CheckSquare, XSquare, Save, MoreHorizontal } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getVisitRecordsByPatientApi, createVisitRecordApi, deleteVisitRecordApi, batchDeleteVisitRecordsApi } from "@/lib/api/visit-records"
import type { VisitRecord, VisitRecordRequest } from "@/lib/api/visit-records"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface MedicalHistoryProps {
    patientId?: string
}

export function MedicalHistory({ patientId }: MedicalHistoryProps) {
    const queryClient = useQueryClient()
    
    // 获取就诊记录
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['visitRecords', patientId],
        queryFn: () => getVisitRecordsByPatientApi(patientId!),
        enabled: !!patientId,
    })
    
    // 创建就诊记录
    const createMutation = useMutation({
        mutationFn: (data: VisitRecordRequest) => createVisitRecordApi(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visitRecords', patientId] })
            toast.success('记录已添加')
        },
        onError: (error: unknown) => {
            const err = error as { message?: string }
            toast.error(`添加失败：${err.message || '请稍后重试'}`)
        },
    })
    
    // 删除就诊记录
    const deleteMutation = useMutation({
        mutationFn: deleteVisitRecordApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visitRecords', patientId] })
        },
        onError: (error: unknown) => {
            const err = error as { message?: string }
            toast.error(`删除失败：${err.message || '请稍后重试'}`)
        },
    })
    
    // 批量删除
    const batchDeleteMutation = useMutation({
        mutationFn: batchDeleteVisitRecordsApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visitRecords', patientId] })
            setSelection(new Set())
            setMode('view')
            toast.success('已删除选中记录')
        },
        onError: (error: unknown) => {
            const err = error as { message?: string }
            toast.error(`批量删除失败：${err.message || '请稍后重试'}`)
        },
    })
    
    // UI States
    const [mode, setMode] = React.useState<'view' | 'add-single' | 'add-batch' | 'manage'>('view')
    const [selection, setSelection] = React.useState<Set<string>>(new Set())
    
    // Input States
    const [singleDate, setSingleDate] = React.useState(new Date().toISOString().split('T')[0])
    const [singleContent, setSingleContent] = React.useState('')
    const [batchText, setBatchText] = React.useState('')

    // --- Actions ---

    const handleAddSingle = () => {
        if (!singleContent.trim() || !patientId) return
        
        createMutation.mutate({
            patient: patientId,
            visit_date: singleDate,
            visit_notes: singleContent,
        })
        
        setSingleContent('')
        setMode('view')
    }

    const handleAddBatch = async () => {
        if (!batchText.trim() || !patientId) return

        const blocks = batchText.split(/\n\s*\n/).filter(b => b.trim())
        const requests: VisitRecordRequest[] = blocks.map((block) => {
            const lines = block.trim().split('\n')
            const firstLine = lines[0].trim()
            
            const dateRegex = /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
            const match = firstLine.match(dateRegex)
            
            let date = new Date().toISOString().split('T')[0]
            let content = block.trim()

            if (match) {
                date = match[0].replace(/\//g, '-')
                if (firstLine === match[0]) {
                    content = lines.slice(1).join('\n').trim()
                }
            }
            
            return {
                patient: patientId,
                visit_date: date,
                visit_notes: content,
            }
        })
        
        try {
            await Promise.all(requests.map(req => createVisitRecordApi(req)))
            queryClient.invalidateQueries({ queryKey: ['visitRecords', patientId] })
            setBatchText('')
            setMode('view')
            toast.success(`已添加 ${requests.length} 条记录`)
        } catch (error) {
            const err = error as { message?: string }
            toast.error(`批量导入失败：${err.message || '请稍后重试'}`)
        }
    }

    const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
    const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false)

    const handleDelete = (id: string) => {
        setDeleteTarget(id)
    }

    const handleBatchDelete = () => {
        setBatchDeleteOpen(true)
    }

    const toggleSelection = (id: string) => {
        setSelection(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }
    
    // Sort records by date ascending (oldest first, newest last)
    const sortedRecords = [...records].sort((a, b) => 
        new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
    )
    
    if (!patientId) {
        return (
            <Card className="w-1/4 flex flex-col min-h-0 bg-slate-50/50">
                <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="text-base">病史与治疗记录</CardTitle>
                </CardHeader>
                <Separator />
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                    请先选择患者
                </div>
            </Card>
        )
    }

    return (
        <>
        <Card className="w-1/4 flex flex-col min-h-0 bg-slate-50/50">
            <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">病史与治疗记录</CardTitle>
                    <div className="flex gap-1">
                        {mode === 'view' && (
                            <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setMode('add-single')} title="添加记录">
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setMode('add-batch')} title="批量文本导入">
                                    <FileTextIcon className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => setMode('manage')} title="批量管理">
                                    <CheckSquare className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {mode !== 'view' && (
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                 setMode('view')
                                 setSelection(new Set())
                             }} title="取消">
                                <XSquare className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <Separator />
            
            <div className="flex-1 overflow-hidden flex flex-col">
                
                {/* --- Input Areas --- */}
                {mode === 'add-single' && (
                    <div className="p-3 bg-white border-b animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <Input 
                                    type="date" 
                                    value={singleDate} 
                                    onChange={e => setSingleDate(e.target.value)} 
                                    className="h-8 w-[130px] text-xs"
                                />
                            </div>
                            <Textarea 
                                placeholder="输入病史内容..." 
                                value={singleContent}
                                onChange={e => setSingleContent(e.target.value)}
                                className="text-xs min-h-[80px] resize-none"
                            />
                            <Button size="sm" onClick={handleAddSingle} className="self-end h-7 text-xs">
                                保存记录
                            </Button>
                        </div>
                    </div>
                )}
                
                {mode === 'add-batch' && (
                    <div className="p-3 bg-white border-b animate-in slide-in-from-top-2 duration-200 flex-1 flex flex-col min-h-0">
                        <div className="text-[10px] text-muted-foreground mb-2">
                            提示: 多条记录请用<strong>空行</strong>分隔。每段若包含日期格式(2024-01-01)将自动提取。
                        </div>
                        <Textarea 
                            placeholder={`2024-10-01\n初诊，患者主诉...\n\n2024-10-05\n复诊，情况良好...`}
                            value={batchText}
                            onChange={e => setBatchText(e.target.value)}
                            className="flex-1 text-xs resize-none font-mono"
                        />
                         <Button size="sm" onClick={handleAddBatch} className="mt-2 self-end h-7 text-xs">
                            批量导入
                        </Button>
                    </div>
                )}

                {/* --- List Area --- */}
                 {mode !== 'add-batch' && (
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {sortedRecords.map((record, index) => (
                                <div key={record.id} className="flex gap-3 relative group">
                                    
                                    {/* Checkbox for Manage Mode */}
                                    {mode === 'manage' && (
                                        <div className="flex items-start pt-1">
                                            <Checkbox 
                                                checked={selection.has(record.id)}
                                                onCheckedChange={() => toggleSelection(record.id)}
                                            />
                                        </div>
                                    )}

                                    {/* Timeline Line */}
                                    {mode !== 'manage' && (
                                        <div className="flex flex-col items-center flex-shrink-0 w-4">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 ring-2 ring-blue-100" />
                                            {index !== sortedRecords.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                                            )}
                                        </div>
                                    )}

                                    {/* Content Card */}
                                    <div className="flex-1 min-w-0">
                                         <div className={cn(
                                             "bg-white p-3 rounded-lg border shadow-sm relative transition-all",
                                             mode === 'manage' && selection.has(record.id) && "border-blue-500 bg-blue-50/50"
                                         )}>
                                             {/* Date Header */}
                                            <div className="flex justify-between items-start mb-1.5">
                                                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                                    {record.visit_date}
                                                </span>
                                            </div>
                                            
                                            {/* Content Body */}
                                            <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                {record.visit_notes}
                                            </p>

                                            {/* Hover Delete Action (Only in View Mode) */}
                                            {mode === 'view' && (
                                                <div 
                                                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md cursor-pointer"
                                                    onClick={() => handleDelete(record.id)}
                                                    title="删除"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                         </div>
                                    </div>
                                </div>
                            ))}
                            
                            {sortedRecords.length === 0 && (
                                <div className="text-center py-8 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                                    暂无记录，点击右上角 "+" 添加
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                 )}
            </div>

            {/* Batch Delete Footer */}
            {mode === 'manage' && (
                 <div className="p-2 border-t bg-white flex justify-between items-center animate-in slide-in-from-bottom-2">
                     <span className="text-xs text-muted-foreground ml-2">已选 {selection.size} 项</span>
                     <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-7 text-xs"
                        disabled={selection.size === 0}
                        onClick={handleBatchDelete}
                     >
                         删除选中
                     </Button>
                 </div>
            )}
        </Card>

        <ConfirmDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
            title="删除就诊记录"
            description="确定要删除这条就诊记录吗？"
            confirmText="删除"
            variant="destructive"
            onConfirm={() => {
                if (deleteTarget !== null) {
                    deleteMutation.mutate(deleteTarget)
                    setDeleteTarget(null)
                }
            }}
        />

        <ConfirmDialog
            open={batchDeleteOpen}
            onOpenChange={setBatchDeleteOpen}
            title="批量删除"
            description={`确定要删除选中的 ${selection.size} 条记录吗？`}
            confirmText="删除"
            variant="destructive"
            onConfirm={() => {
                batchDeleteMutation.mutate(Array.from(selection))
                setBatchDeleteOpen(false)
            }}
        />
        </>
    )
}

function FileTextIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
    )
}
