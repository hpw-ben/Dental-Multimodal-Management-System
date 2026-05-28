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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PatientFormData {
  name: string
  gender: 'Male' | 'Female'
  birthDate: string
  caseNumber: string
  diagnosis: string
  status: '已确认' | '待确认'
}

interface CreatePatientDialogProps {
    trigger?: React.ReactNode
    onOpenChange?: (open: boolean) => void
    onSubmit: (data: PatientFormData) => void
}

// 生成病历号：P + 今天日期 + 序号
function generateCaseNumber(sequence: number = 1): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `P${year}${month}${day}${String(sequence).padStart(3, '0')}`
}

export function CreatePatientDialog({ trigger, onSubmit }: CreatePatientDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [caseSequence, setCaseSequence] = React.useState(1)
  
  const [formData, setFormData] = React.useState({
      name: '',
      gender: 'Male' as 'Male' | 'Female',
      birthDate: '',
      caseNumber: '',
      diagnosis: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)
      
      // 如果病历号为空，自动生成
      const caseNumber = formData.caseNumber.trim() || generateCaseNumber(caseSequence)
      
      onSubmit({
          ...formData,
          caseNumber,
          status: '待确认',
      })
      
      // 增加序号用于下一次生成
      setCaseSequence(prev => prev + 1)
      
      setIsLoading(false)
      setOpen(false)
      setFormData({
          name: '',
          gender: 'Male',
          birthDate: '',
          caseNumber: '',
          diagnosis: '',
      })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:scale-105 active:scale-95">
              <Plus className="mr-2 h-4 w-4" />
              新建患者
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>新建患者</DialogTitle>
          <DialogDescription>
            输入患者的基础信息
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right text-xs">
                    姓名
                    </Label>
                    <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="col-span-3 h-8"
                    placeholder="请输入真实姓名"
                    required
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="caseNumber" className="text-right text-xs">
                    病例号
                    </Label>
                    <Input
                    id="caseNumber"
                    value={formData.caseNumber}
                    onChange={(e) => setFormData({...formData, caseNumber: e.target.value})}
                    className="col-span-3 h-8"
                    placeholder={`留空则自动生成`}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="gender" className="text-right text-xs">
                    性别
                    </Label>
                    <Select 
                        value={formData.gender} 
                        onValueChange={(v: 'Male' | 'Female') => setFormData({...formData, gender: v})}
                    >
                        <SelectTrigger className="col-span-3 h-8">
                            <SelectValue placeholder="选择性别" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">男</SelectItem>
                            <SelectItem value="Female">女</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="birthDate" className="text-right text-xs">
                    出生日期
                    </Label>
                    <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                    className="col-span-3 h-8"
                    required
                    />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="diagnosis" className="text-right text-xs mt-2">
                    临床诊断
                    </Label>
                    <Input
                        id="diagnosis"
                        value={formData.diagnosis}
                        onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                        className="col-span-3 h-8"
                        placeholder="例如：牙周炎"
                    />
                </div>
            </div>
            <DialogFooter>
            <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? "保存中..." : "确认保存"}
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
