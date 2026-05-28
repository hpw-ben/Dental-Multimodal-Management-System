"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, CircleDashed } from "lucide-react"

interface PatientStatusBadgeProps {
  status: "已确认" | "待确认"
  onChange?: (newStatus: "已确认" | "待确认") => void
  readonly?: boolean
  className?: string
}

export function PatientStatusBadge({ status, onChange, readonly = false, className }: PatientStatusBadgeProps) {
  const isConfirmed = status === "已确认"
  
  const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation() // Prevent row click
      if (readonly || !onChange) return
      
      const newStatus = isConfirmed ? "待确认" : "已确认"
      onChange(newStatus)
  }

  return (
    <Badge 
        variant={isConfirmed ? "default" : "secondary"} 
        className={cn(
            "transition-all duration-200 flex items-center gap-1.5 px-2.5 py-0.5 select-none",
            isConfirmed ? "bg-green-600 hover:bg-green-700 border-transparent" : "bg-slate-200 text-slate-600 hover:bg-slate-300 border-slate-300",
            !readonly && "cursor-pointer hover:scale-105 active:scale-95",
            className
        )}
        onClick={handleClick}
    >
        {isConfirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
        {status}
    </Badge>
  )
}
