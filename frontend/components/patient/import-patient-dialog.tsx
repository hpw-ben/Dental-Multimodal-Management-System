"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileText, AlertCircle, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import * as XLSX from 'xlsx'

interface ImportPatientDialogProps {
    onImport: (data: any[]) => Promise<void>
}

export function ImportPatientDialog({ onImport }: ImportPatientDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [parsedData, setParsedData] = React.useState<any[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isImporting, setIsImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
      setError(null)
      if (!file) return

      try {
          const data = await file.arrayBuffer()
          // Use cellDates: true to parse dates correctly
          const workbook = XLSX.read(data, { cellDates: true })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          if (jsonData.length < 2) throw new Error("文件内容为空或格式不正确 (至少需要表头和一行数据)")
          
          const rows = jsonData.slice(1)
          
          const mappedData = rows.map((cols, idx) => {
               const name = cols[0] || 'Unknown'
               const genderStr = cols[1] || ''
               const birthDateVal = cols[2]
               const diagnosis = cols[3] || '未诊断'

               // Handle birthDate
               let birthDate = '1990-01-01'
               if (birthDateVal) {
                   if (birthDateVal instanceof Date) {
                       const d = birthDateVal
                       // Use local time components
                       const year = d.getFullYear()
                       const month = String(d.getMonth() + 1).padStart(2, '0')
                       const day = String(d.getDate()).padStart(2, '0')
                       birthDate = `${year}-${month}-${day}`
                   } else {
                       // Try to parse string or number (year only)
                       const strVal = String(birthDateVal)
                       if (strVal.match(/^\d{4}$/)) {
                           // User provided only year
                           birthDate = `${strVal}-01-01`
                       } else {
                           // Assume string date
                           birthDate = strVal
                       }
                   }
               }
               
               // Handle createdAt
               let createdAt = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
               if (cols[4]) {
                   if (cols[4] instanceof Date) {
                       // Use local time components to avoid UTC shift
                       const d = cols[4]
                       const year = d.getFullYear()
                       const month = String(d.getMonth() + 1).padStart(2, '0')
                       const day = String(d.getDate()).padStart(2, '0')
                       createdAt = `${year}-${month}-${day}`
                   } else {
                       // If string, try to normalize
                       createdAt = String(cols[4])
                   }
               }
               
               // Optional case number from column 5 (if exists) or skip
               // Let's assume layout: 姓名 | 性别 | 出生日期 | 初步诊断 | 建档日期 | 病历号(可选)
               const caseNumber = cols[5] ? String(cols[5]) : undefined

              return {
                  // No ID generated here
                  name: name,
                  gender: (genderStr === '男' || genderStr === 'Male') ? 'Male' : 'Female',
                  birthDate: birthDate,
                  diagnosis: diagnosis,
                  caseNumber: caseNumber, 
                  createdAt: createdAt,
                  status: '待确认'
              }
          })
          
          setParsedData(mappedData)
      } catch (e: any) {
          setError("解析失败: " + e.message)
      }
  }

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
  }

  const handleConfirm = async () => {
      if (parsedData) {
          setIsImporting(true)
          try {
            await onImport(parsedData)
            setOpen(false)
            setParsedData(null)
          } catch (e) {
            // handle error
          } finally {
            setIsImporting(false)
          }
      }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            导入数据
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>批量导入患者数据</DialogTitle>
          <DialogDescription>
             支持 Excel (.xlsx, .xls) 或 CSV 文件。
             <br/>推荐表头格式: 姓名 | 性别 | 出生日期(年月日) | 初步诊断 | 建档日期 | 病历号
          </DialogDescription>
        </DialogHeader>

        {!parsedData ? (
             <div 
                className={cn(
                    "border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center p-6 transition-colors cursor-pointer bg-slate-50/50",
                    isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300",
                    error ? "border-red-200 bg-red-50" : ""
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
             >
                 <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                 />
                 
                 {error ? (
                     <div className="text-center text-red-500 animate-in fade-in zoom-in">
                         <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-80" />
                         <p className="text-sm font-medium">{error}</p>
                         <p className="text-xs mt-1 text-red-400">点击重试</p>
                     </div>
                 ) : (
                     <div className="text-center text-slate-400 pointer-events-none">
                        <Upload className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium text-slate-600">点击或拖拽 Excel 文件到此处</p>
                        <p className="text-xs mt-1">支持 .xlsx, .xls, .csv</p>
                     </div>
                 )}
             </div>
        ) : (
            <div className="border rounded-lg overflow-hidden animate-in slide-in-from-bottom-4 bg-white">
                <div className="flex items-center justify-between p-3 border-b bg-slate-50">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <FileText className="w-4 h-4 text-blue-500" />
                        解析成功: {parsedData.length} 条数据
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setParsedData(null)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
                <ScrollArea className="h-48">
                    <div className="p-0">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                <tr className="text-slate-500">
                                    <th className="p-2 font-medium">姓名</th>
                                    <th className="p-2 font-medium">性别</th>
                                    <th className="p-2 font-medium">出生日期</th>
                                    <th className="p-2 font-medium">诊断</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                                {parsedData.slice(0, 10).map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80">
                                        <td className="p-2">{row.name}</td>
                                        <td className="p-2">{row.gender === 'Male' ? '男' : '女'}</td>
                                        <td className="p-2">{row.birthDate}</td>
                                        <td className="p-2 text-slate-500 truncate max-w-[150px]">{row.diagnosis}</td>
                                    </tr>
                                ))}
                                {parsedData.length > 10 && (
                                    <tr>
                                        <td colSpan={4} className="p-2 text-center text-muted-foreground bg-slate-50/30">
                                            ... 还有 {parsedData.length - 10} 条数据 ...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>
            </div>
        )}

        <DialogFooter className="gap-2">
           <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
           <Button onClick={handleConfirm} disabled={!parsedData || isImporting} className="bg-blue-600">
               {isImporting ? "正在上传并生成ID..." : "确认导入"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
