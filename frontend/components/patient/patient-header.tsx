"use client"

import { useParams, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function PatientHeader() {
  const params = useParams()
  const pathname = usePathname()
  
  // Only show on patient detail pages (check if ID exists and path matches)
  const isPatientPage = params?.id && pathname.includes(`/patients/${params.id}`)
  
  if (!isPatientPage) return null

  // Mock data - in real app would come from context or query
  const patientId = params.id
  
  return (
    <div className="ml-auto flex items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-300">
        {/* Divider only for desktop */}
        <div className="hidden lg:block w-px h-8 bg-border/50 mx-2"></div>

        <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-slate-200">
                <AvatarImage src="/avatars/02.png" />
                <AvatarFallback>张</AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">张三</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">Male</Badge>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal border-slate-300">45 Y</Badge>
                </div>
                
                <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                    <span>ID: #{patientId}</span>
                    <span className="text-slate-300">•</span>
                    <span>Case: 20240101</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-red-500 bg-red-50 px-1 rounded font-medium">High Risk</span>
                </div>
            </div>
        </div>
    </div>
  )
}
