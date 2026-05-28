"use client"

import * as React from "react"
import { PlusCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface DataTableAgeRangeFilterProps {
  /** 当前最小年龄 */
  minAge: number
  /** 当前最大年龄 */
  maxAge: number
  /** 范围变更回调 */
  onChange: (min: number, max: number) => void
  /** 绝对最小值 */
  absoluteMin?: number
  /** 绝对最大值 */
  absoluteMax?: number
}

export function DataTableAgeRangeFilter({
  minAge,
  maxAge,
  onChange,
  absoluteMin = 0,
  absoluteMax = 120,
}: DataTableAgeRangeFilterProps) {
  const isActive = minAge !== absoluteMin || maxAge !== absoluteMax

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          年龄
          {isActive && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {minAge}–{maxAge} 岁
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] space-y-4" align="start">
        <div className="space-y-2">
          <p className="text-sm font-medium">年龄范围</p>
          <Slider
            min={absoluteMin}
            max={absoluteMax}
            step={1}
            value={[minAge, maxAge]}
            onValueChange={([newMin, newMax]) => onChange(newMin, newMax)}
            className="py-2"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minAge}
              min={absoluteMin}
              max={maxAge}
              onChange={(e) => {
                const v = Math.max(absoluteMin, Math.min(Number(e.target.value) || absoluteMin, maxAge))
                onChange(v, maxAge)
              }}
              className="h-8 text-xs"
            />
            <span className="text-muted-foreground text-xs">至</span>
            <Input
              type="number"
              value={maxAge}
              min={minAge}
              max={absoluteMax}
              onChange={(e) => {
                const v = Math.max(minAge, Math.min(Number(e.target.value) || absoluteMax, absoluteMax))
                onChange(minAge, v)
              }}
              className="h-8 text-xs"
            />
            <span className="text-muted-foreground text-xs shrink-0">岁</span>
          </div>
        </div>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
            onClick={() => onChange(absoluteMin, absoluteMax)}
          >
            清除筛选
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
