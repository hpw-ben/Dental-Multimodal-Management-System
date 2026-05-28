"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { exportProjectDataset, type ExportMode } from "@/lib/api/export"

const EXPORT_MODE_OPTIONS: { value: ExportMode; label: string; description: string }[] = [
  { value: "cases_only", label: "仅病例", description: "导出患者基本信息与就诊记录" },
  { value: "with_charts", label: "病例 + 牙位图", description: "包含牙位图结构化数据" },
  { value: "full", label: "全部数据", description: "包含影像文件（DICOM / JPG 等）" },
]

interface ExportDatasetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectTitle: string
  selectedPatientIds?: string[]  // 新增：选中的患者ID列表
}

export function ExportDatasetDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  selectedPatientIds = [],  // 新增：默认为空数组
}: ExportDatasetDialogProps) {
  const [exportMode, setExportMode] = React.useState<ExportMode>("cases_only")
  const [anonymize, setAnonymize] = React.useState(true)
  const [confirmedOnly, setConfirmedOnly] = React.useState(true)
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportProjectDataset(projectId, { 
        anonymize, 
        exportMode, 
        confirmedOnly,
        patientIds: selectedPatientIds.length > 0 ? selectedPatientIds : undefined  // 新增
      })
      
      if (selectedPatientIds.length > 0) {
        toast.success(`已导出选中的 ${selectedPatientIds.length} 位患者`)
      } else {
        toast.success("数据集导出成功")
      }
      
      onOpenChange(false)
    } catch (error) {
      toast.error(
        `导出失败：${error instanceof Error ? error.message : "未知错误"}`
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导出数据集</DialogTitle>
          <DialogDescription>
            将「{projectTitle}」的课题数据打包导出为 ZIP 数据集
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 导出模式选择 */}
          <div className="grid gap-2">
            <Label>导出范围</Label>
            <div className="grid gap-2">
              {EXPORT_MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    exportMode === opt.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="export-mode"
                    value={opt.value}
                    checked={exportMode === opt.value}
                    onChange={() => setExportMode(opt.value)}
                    className="accent-primary"
                  />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 匿名化开关 */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="anonymize">隐私脱敏</Label>
              <p className="text-xs text-muted-foreground">
                使用匿名 ID 替代患者姓名和病案号
              </p>
            </div>
            <Switch
              id="anonymize"
              checked={anonymize}
              onCheckedChange={setAnonymize}
            />
          </div>

          {/* 包含未确认患者开关 */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="confirmed-only">包含未确认患者</Label>
              <p className="text-xs text-muted-foreground">
                关闭时仅导出状态为「已确认」的患者
              </p>
            </div>
            <Switch
              id="confirmed-only"
              checked={!confirmedOnly}
              onCheckedChange={(checked) => setConfirmedOnly(!checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            取消
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                导出中…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                导出数据集
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
