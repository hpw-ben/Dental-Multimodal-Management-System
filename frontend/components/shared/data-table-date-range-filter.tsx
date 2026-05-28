"use client"

import * as React from "react"
import { CalendarIcon, PlusCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface DataTableDateRangeFilterProps {
  /** 筛选标题 */
  title: string
  /** 当前起始日期 (yyyy-MM-dd 或 "") */
  startDate: string
  /** 当前结束日期 (yyyy-MM-dd 或 "") */
  endDate: string
  /** 范围变更回调 */
  onChange: (start: string, end: string) => void
}

export function DataTableDateRangeFilter({
  title,
  startDate,
  endDate,
  onChange,
}: DataTableDateRangeFilterProps) {
  const isActive = startDate !== "" || endDate !== ""

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {isActive && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {startDate || "..."} ~ {endDate || "..."}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] space-y-4" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium">{title}范围</p>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onChange(e.target.value, endDate)}
              className="h-8 text-xs"
            />
            <span className="text-muted-foreground text-xs shrink-0">至</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onChange(startDate, e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => onChange("", "")}
          >
            清除筛选
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
