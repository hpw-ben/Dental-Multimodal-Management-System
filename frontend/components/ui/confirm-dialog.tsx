"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  /** 触发按钮（非受控模式） */
  trigger?: React.ReactNode
  /** 受控模式：是否打开 */
  open?: boolean
  /** 受控模式：打开状态变化回调 */
  onOpenChange?: (open: boolean) => void
  /** 弹窗标题 */
  title: string
  /** 弹窗描述 */
  description: string
  /** 确认按钮文字，默认"确认" */
  confirmText?: string
  /** 取消按钮文字，默认"取消" */
  cancelText?: string
  /** 确认按钮样式变体 */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  /** 确认回调 */
  onConfirm: () => void
  /** 是否禁用确认按钮 */
  disabled?: boolean
}

/**
 * 可复用确认弹窗，基于 shadcn AlertDialog
 * 支持非受控模式（通过 trigger 触发）和受控模式（通过 open/onOpenChange 控制）
 */
export function ConfirmDialog({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "default",
  onConfirm,
  disabled = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <AlertDialogTrigger asChild>
          {trigger}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
