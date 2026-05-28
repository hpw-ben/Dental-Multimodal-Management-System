"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getPatientsApi } from "@/lib/api/patients"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SelectPatientDialogProps {
  existingPatientIds: string[]
  onSelect: (patientIds: string[]) => void
}

export function SelectPatientDialog({
  existingPatientIds,
  onSelect,
}: SelectPatientDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const { data: patientsData, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatientsApi({}),
  })

  const availablePatients = React.useMemo(() => {
    if (!patientsData?.results) return []
    
    return patientsData.results.filter(
      patient => !existingPatientIds.includes(patient.id)
    )
  }, [patientsData?.results, existingPatientIds])

  const filteredPatients = React.useMemo(() => {
    if (!searchTerm) return availablePatients

    const term = searchTerm.toLowerCase()
    return availablePatients.filter(
      patient =>
        patient.name.toLowerCase().includes(term) ||
        patient.case_number.toLowerCase().includes(term)
    )
  }, [availablePatients, searchTerm])

  const handleConfirm = () => {
    if (selectedIds.length > 0) {
      onSelect(selectedIds)
      setSelectedIds([])
      setSearchTerm("")
      setOpen(false)
    }
  }

  const handleToggle = (patientId: string) => {
    setSelectedIds(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPatients.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredPatients.map(p => p.id))
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          选择患者
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>选择已有患者</DialogTitle>
          <DialogDescription>
            从患者列表中选择一个或多个患者添加到课题
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索患者姓名或病例号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {availablePatients.length === 0
                ? "所有患者都已在课题中"
                : "未找到匹配的患者"}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedIds.length === filteredPatients.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    全选 ({selectedIds.length}/{filteredPatients.length})
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleToggle(patient.id)}
                    >
                      <Checkbox
                        checked={selectedIds.includes(patient.id)}
                        onCheckedChange={() => handleToggle(patient.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{patient.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {patient.case_number}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100">
                            {patient.gender === 'Male' ? '男' : '女'}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          出生日期: {patient.birth_date} | 年龄: {patient.age}岁
                          {patient.clinical_diagnosis && (
                            <> | {patient.clinical_diagnosis}</>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              确定添加 ({selectedIds.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
