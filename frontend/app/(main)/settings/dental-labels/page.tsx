"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, GripVertical, ArrowLeft, Pencil, Search } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store/auth-store"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  getDentalLabelsApi,
  createDentalLabelApi,
  updateDentalLabelApi,
  deleteDentalLabelApi,
  type DentalLabel,
} from "@/lib/api/dental-labels"

/** 预设颜色选项 */
const PRESET_COLORS = [
  '#ef4444', '#dc2626', '#f97316', '#f59e0b',
  '#22c55e', '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#654321',
  '#6b7280', '#374151',
]

/** 颜色选择器组件（预设 + 自定义） */
function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  const colorInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          className={`w-6 h-6 rounded-full border-2 transition-transform ${
            value === c ? 'border-slate-900 scale-125' : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
        />
      ))}
      {/* 自定义颜色按钮 */}
      <button
        type="button"
        className={`w-6 h-6 rounded-full border-2 transition-transform relative overflow-hidden ${
          !PRESET_COLORS.includes(value) && value ? 'border-slate-900 scale-125' : 'border-gray-300'
        }`}
        style={{
          background: !PRESET_COLORS.includes(value) && value
            ? value
            : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
        }}
        onClick={() => colorInputRef.current?.click()}
        title="自定义颜色"
      />
      <input
        ref={colorInputRef}
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </div>
  )
}

export default function DentalLabelsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // 非管理员重定向
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/settings')
    }
  }, [user, router])

  const { data: labels, isLoading } = useQuery({
    queryKey: ['dental-labels'],
    queryFn: getDentalLabelsApi,
  })

  // 编辑态
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editForm, setEditForm] = React.useState<Partial<DentalLabel>>({})

  // 新建 Dialog 态
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    label: '',
    label_type: 'color' as 'color' | 'symbol',
    value: '',
    color: '#ef4444',
    is_active: true,
  })

  const resetCreateForm = () => {
    setCreateForm({
      label: '', label_type: 'color', value: '', color: '#ef4444', is_active: true,
    })
  }

  const createMutation = useMutation({
    mutationFn: createDentalLabelApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dental-labels'] })
      toast.success('标签已创建')
      setCreateDialogOpen(false)
      resetCreateForm()
    },
    onError: (error: Error) => {
      toast.error(`创建失败：${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<DentalLabel> }) =>
      updateDentalLabelApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dental-labels'] })
      toast.success('标签已更新')
      setEditingId(null)
    },
    onError: (error: Error) => {
      toast.error(`更新失败：${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDentalLabelApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dental-labels'] })
      toast.success('标签已删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败：${error.message}`)
    },
  })

  const handleCreate = () => {
    if (!createForm.label) {
      toast.warning('请填写显示名称')
      return
    }
    if (createForm.label_type === 'symbol' && !createForm.value) {
      toast.warning('请填写符号标记的数据值（单个大写字母）')
      return
    }
    if (createForm.label_type === 'color' && !createForm.color) {
      toast.warning('请选择颜色')
      return
    }
    // 颜色标记：value 同步为 color
    const submitData = createForm.label_type === 'color'
      ? { ...createForm, value: createForm.color }
      : createForm
    createMutation.mutate(submitData)
  }

  const handleStartEdit = (label: DentalLabel) => {
    setEditingId(label.id)
    setEditForm({ ...label })
  }

  const handleSaveEdit = () => {
    if (editingId === null) return
    // 颜色标记：value 同步为 color
    const data = editForm.label_type === 'color'
      ? { ...editForm, value: editForm.color }
      : editForm
    updateMutation.mutate({ id: editingId, data })
  }

  /** 处理符号数据值输入：单字母 + 自动大写 */
  const handleSymbolValueChange = (
    val: string,
    setter: (v: string) => void
  ) => {
    // 只取最后输入的字符，限制单字母，自动大写
    const lastChar = val.slice(-1).toUpperCase()
    if (/^[A-Z]$/.test(lastChar)) {
      setter(lastChar)
    } else if (val === '') {
      setter('')
    }
  }

  // 搜索过滤
  const [searchQuery, setSearchQuery] = React.useState('')
  const filteredLabels = labels?.filter(l =>
    !searchQuery || l.label.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []
  const colorLabels = filteredLabels.filter(l => l.label_type === 'color')
  const symbolLabels = filteredLabels.filter(l => l.label_type === 'symbol')

  return (
    <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">牙位图标签管理</h1>
          <p className="text-muted-foreground mt-1">
            管理牙位图中可用的治疗标记和符号标记。
          </p>
        </div>
        {/* 添加标签按钮 */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) resetCreateForm()
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              添加标签
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>新建标签</DialogTitle>
              <DialogDescription>
                创建新的牙位图标记，用于标注牙齿状态。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-type" className="text-right text-xs">
                  标签类型
                </Label>
                <Select
                  value={createForm.label_type}
                  onValueChange={(v) => setCreateForm(f => ({
                    ...f,
                    label_type: v as 'color' | 'symbol',
                    value: v === 'symbol' ? '' : f.value,
                  }))}
                >
                  <SelectTrigger className="col-span-3 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="color">颜色标记</SelectItem>
                    <SelectItem value="symbol">符号标记</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="create-label-name" className="text-right text-xs">
                  显示名称
                </Label>
                <Input
                  id="create-label-name"
                  value={createForm.label}
                  onChange={(e) => setCreateForm(f => ({ ...f, label: e.target.value }))}
                  className="col-span-3 h-8"
                  placeholder="如 充填(树脂)、Crown 等"
                />
              </div>
              {createForm.label_type === 'symbol' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="create-value" className="text-right text-xs">
                    符号字母
                  </Label>
                  <Input
                    id="create-value"
                    value={createForm.value}
                    onChange={(e) => handleSymbolValueChange(
                      e.target.value,
                      (v) => setCreateForm(f => ({ ...f, value: v }))
                    )}
                    className="col-span-3 h-8 uppercase"
                    placeholder="单个大写字母，如 R"
                    maxLength={1}
                  />
                </div>
              )}
              {createForm.label_type === 'color' && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right text-xs mt-1">颜色</Label>
                  <div className="col-span-3">
                    <ColorPicker
                      value={createForm.color}
                      onChange={(c) => setCreateForm(f => ({ ...f, color: c }))}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                size="sm"
              >
                {createMutation.isPending ? '创建中...' : '创建标签'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="space-y-8 pb-10">
        {/* 颜色标记 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">颜色标记</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : colorLabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
              暂无颜色标记，点击右上角「添加标签」创建
            </div>
          ) : (
            <div className="space-y-2">
              {colorLabels.map(label => (
                <LabelRow
                  key={label.id}
                  label={label}
                  isEditing={editingId === label.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onStartEdit={() => handleStartEdit(label)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => deleteMutation.mutate(label.id)}
                  onToggleActive={(active) =>
                    updateMutation.mutate({ id: label.id, data: { is_active: active } })
                  }
                  isSaving={updateMutation.isPending}
                  onSymbolValueChange={handleSymbolValueChange}
                />
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* 符号标记 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">符号标记</h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : symbolLabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
              暂无符号标记，点击右上角「添加标签」创建
            </div>
          ) : (
            <div className="space-y-2">
              {symbolLabels.map(label => (
                <LabelRow
                  key={label.id}
                  label={label}
                  isEditing={editingId === label.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onStartEdit={() => handleStartEdit(label)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => deleteMutation.mutate(label.id)}
                  onToggleActive={(active) =>
                    updateMutation.mutate({ id: label.id, data: { is_active: active } })
                  }
                  isSaving={updateMutation.isPending}
                  onSymbolValueChange={handleSymbolValueChange}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ============ 标签行组件 ============

interface LabelRowProps {
  label: DentalLabel
  isEditing: boolean
  editForm: Partial<DentalLabel>
  setEditForm: (form: Partial<DentalLabel>) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onToggleActive: (active: boolean) => void
  isSaving: boolean
  onSymbolValueChange: (val: string, setter: (v: string) => void) => void
}

function LabelRow({
  label,
  isEditing,
  editForm,
  setEditForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleActive,
  isSaving,
  onSymbolValueChange,
}: LabelRowProps) {
  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-blue-50/50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">显示名称</Label>
            <Input
              value={editForm.label || ''}
              onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
            />
          </div>
          {label.label_type === 'symbol' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">符号字母</Label>
              <Input
                value={editForm.value || ''}
                onChange={(e) => onSymbolValueChange(
                  e.target.value,
                  (v) => setEditForm({ ...editForm, value: v })
                )}
                className="uppercase"
                maxLength={1}
                placeholder="单个大写字母"
              />
            </div>
          )}
        </div>
        {label.label_type === 'color' && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">颜色</Label>
            <ColorPicker
              value={editForm.color || ''}
              onChange={(c) => setEditForm({ ...editForm, color: c, value: c })}
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>取消</Button>
          <Button size="sm" onClick={onSaveEdit} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 border rounded-lg p-3 hover:bg-slate-50 transition-colors group">
      <GripVertical className="h-4 w-4 text-muted-foreground/40" />

      {/* 颜色/符号预览 */}
      {label.label_type === 'color' ? (
        <div
          className="w-8 h-8 rounded-md border shadow-sm flex-shrink-0"
          style={{ backgroundColor: label.color }}
        />
      ) : (
        <div className="w-8 h-8 rounded-md border bg-white flex items-center justify-center text-sm font-bold text-slate-700 flex-shrink-0">
          {label.value}
        </div>
      )}

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{label.label}</div>
        {label.label_type === 'color' && label.color && (
          <div className="text-xs text-muted-foreground">{label.color}</div>
        )}
      </div>

      {/* 启用开关 */}
      <Switch
        checked={label.is_active}
        onCheckedChange={onToggleActive}
      />

      {/* 操作按钮 */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStartEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          }
          title={`删除标签「${label.label}」？`}
          description="删除后，使用此标签的牙位图数据不会受到影响，但无法再使用此标签进行标记。"
          confirmText="确认删除"
          variant="destructive"
          onConfirm={onDelete}
        />
      </div>
    </div>
  )
}
