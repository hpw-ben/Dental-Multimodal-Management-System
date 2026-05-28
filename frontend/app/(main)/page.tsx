"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import {
  Activity,
  Bell,
  Check,
  CheckSquare2,
  FileText,
  FolderKanban,
  GripVertical,
  Loader2,
  MoveDiagonal2,
  Plus,
  RotateCcw,
  Settings,
  Square,
  Tags,
  Trash2,
  UserCog,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"

import { TrendChart } from "@/components/dashboard/trend-chart"
import { toast } from "sonner"
import { DistributionChart } from "@/components/dashboard/distribution-chart"
import { CreateProjectDialog } from "@/components/project/create-project-dialog"
import { CreatePatientDialog } from "@/components/patient/create-patient-dialog"
import { getDashboardApi } from "@/lib/api/dashboard"
import { createPatientApi, type PatientRequest } from "@/lib/api/patients"
import {
  getDashboardLayoutApi,
  resetDashboardLayoutApi,
  updateDashboardLayoutApi,
  type DashboardLayout,
  type DashboardWidgetId,
  type DashboardWidgetLayoutItem,
} from "@/lib/api/auth"
import { useAuthHydration, useAuthStore } from "@/lib/store/auth-store"

const HOME_GRID_COLUMNS = 12
const HOME_GRID_ROW_HEIGHT = 84
const HOME_GRID_MIN_WIDTH = 1200

type DashboardResizeSession = {
  widgetId: DashboardWidgetId
  startClientX: number
  startClientY: number
  startWidth: number
  startHeight: number
  maximumWidth: number
  maximumHeight: number
  lockAspectRatio: boolean
  baseLayout: DashboardLayout
  columnStepSize: number
  rowStepSize: number
}

const EMPTY_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 1,
  home: {
    widgets: [],
  },
}

const DASHBOARD_WIDGET_SURFACE_CLASS = "[&_[data-slot=card]]:h-full"

function normalizeDashboardLayout(layout: DashboardLayout | Partial<DashboardLayout> | null | undefined): DashboardLayout {
  if (!layout || typeof layout !== "object") {
    return EMPTY_DASHBOARD_LAYOUT
  }

  const home = "home" in layout && layout.home && typeof layout.home === "object"
    ? layout.home
    : undefined

  const widgets = home && Array.isArray(home.widgets) ? home.widgets : []

  return {
    version: 1,
    home: {
      widgets: normalizeDashboardWidgets(widgets as DashboardWidgetLayoutItem[]),
    },
  }
}

const DASHBOARD_WIDGET_DEFINITIONS: Record<
  DashboardWidgetId,
  {
    title: string
    defaultW: number
    defaultH: number
    minW: number
    minH: number
    resizable: boolean
    lockAspectRatio?: boolean
  }
> = {
  metric_total_projects: { title: "课题总数", defaultW: 3, defaultH: 2, minW: 3, minH: 2, resizable: false },
  metric_total_patients: { title: "在库患者", defaultW: 3, defaultH: 2, minW: 3, minH: 2, resizable: false },
  metric_pending_patients: { title: "待确认数据", defaultW: 3, defaultH: 2, minW: 3, minH: 2, resizable: false },
  metric_new_patients_month: { title: "本月新增", defaultW: 3, defaultH: 2, minW: 3, minH: 2, resizable: false },
  trend_chart: { title: "患者入库趋势", defaultW: 6, defaultH: 5, minW: 6, minH: 5, resizable: true, lockAspectRatio: true },
  distribution_chart: { title: "全库患者分布", defaultW: 6, defaultH: 5, minW: 6, minH: 5, resizable: true, lockAspectRatio: true },
  quick_actions: { title: "快捷操作", defaultW: 6, defaultH: 4, minW: 6, minH: 4, resizable: true },
  recent_activity: { title: "最近动态", defaultW: 6, defaultH: 4, minW: 6, minH: 4, resizable: true },
}

function cloneDashboardLayout(layout: DashboardLayout): DashboardLayout {
  return {
    version: 1,
    home: {
      widgets: layout.home.widgets.map((widget) => ({ ...widget })),
    },
  }
}

function isWidgetAreaAvailable(
  widgets: DashboardWidgetLayoutItem[],
  candidateWidget: DashboardWidgetLayoutItem,
  ignoredWidgetId?: DashboardWidgetId
) {
  if (candidateWidget.x < 0 || candidateWidget.y < 0) {
    return false
  }

  if (candidateWidget.x + candidateWidget.w > HOME_GRID_COLUMNS) {
    return false
  }

  return widgets.every((widget) => {
    if (widget.id === ignoredWidgetId) {
      return true
    }

    const hasHorizontalOverlap = candidateWidget.x < widget.x + widget.w && candidateWidget.x + candidateWidget.w > widget.x
    const hasVerticalOverlap = candidateWidget.y < widget.y + widget.h && candidateWidget.y + candidateWidget.h > widget.y

    return !(hasHorizontalOverlap && hasVerticalOverlap)
  })
}

function getLockedWidgetHeight(widgetId: DashboardWidgetId, width: number) {
  const widgetDefinition = DASHBOARD_WIDGET_DEFINITIONS[widgetId]
  if (!widgetDefinition.lockAspectRatio) {
    return widgetDefinition.minH
  }

  return Math.max(
    widgetDefinition.minH,
    Math.ceil((width * widgetDefinition.defaultH) / widgetDefinition.defaultW)
  )
}

function getWidgetResizeDimensions(widgetId: DashboardWidgetId, width: number, height: number) {
  const widgetDefinition = DASHBOARD_WIDGET_DEFINITIONS[widgetId]
  const normalizedWidth = Math.max(width, widgetDefinition.minW)

  if (widgetDefinition.lockAspectRatio) {
    return {
      width: normalizedWidth,
      height: getLockedWidgetHeight(widgetId, normalizedWidth),
    }
  }

  return {
    width: normalizedWidth,
    height: Math.max(height, widgetDefinition.minH),
  }
}

function normalizeDashboardWidgets(widgets: DashboardWidgetLayoutItem[]) {
  const clonedWidgets = widgets.map((widget) => ({ ...widget }))

  return clonedWidgets.map((widget) => {
    if (!(widget.id in DASHBOARD_WIDGET_DEFINITIONS)) {
      return widget
    }

    const normalizedDimensions = getWidgetResizeDimensions(widget.id, widget.w, widget.h)
    if (normalizedDimensions.width === widget.w && normalizedDimensions.height === widget.h) {
      return widget
    }

    const candidateWidget: DashboardWidgetLayoutItem = {
      ...widget,
      w: normalizedDimensions.width,
      h: normalizedDimensions.height,
    }

    return isWidgetAreaAvailable(clonedWidgets, candidateWidget, widget.id) ? candidateWidget : widget
  })
}

function findFirstAvailableWidgetPosition(
  widgets: DashboardWidgetLayoutItem[],
  width: number,
  height: number,
  widgetId: DashboardWidgetId
) {
  for (let currentY = 0; currentY < 100; currentY += 1) {
    for (let currentX = 0; currentX <= HOME_GRID_COLUMNS - width; currentX += 1) {
      const candidateWidget: DashboardWidgetLayoutItem = {
        id: widgetId,
        x: currentX,
        y: currentY,
        w: width,
        h: height,
      }

      if (isWidgetAreaAvailable(widgets, candidateWidget)) {
        return { x: currentX, y: currentY }
      }
    }
  }

  return null
}

function addWidgetToLayout(layout: DashboardLayout, widgetId: DashboardWidgetId) {
  if (layout.home.widgets.some((widget) => widget.id === widgetId)) {
    return layout
  }

  const widgetDefinition = DASHBOARD_WIDGET_DEFINITIONS[widgetId]
  const availablePosition = findFirstAvailableWidgetPosition(
    layout.home.widgets,
    widgetDefinition.defaultW,
    widgetDefinition.defaultH,
    widgetId
  )

  if (!availablePosition) {
    return null
  }

  const nextLayout = cloneDashboardLayout(layout)
  nextLayout.home.widgets.push({
    id: widgetId,
    x: availablePosition.x,
    y: availablePosition.y,
    w: widgetDefinition.defaultW,
    h: widgetDefinition.defaultH,
  })

  return nextLayout
}

function resizeWidget(layout: DashboardLayout, widgetId: DashboardWidgetId, width: number, height: number) {
  const targetWidget = layout.home.widgets.find((widget) => widget.id === widgetId)
  if (!targetWidget) {
    return null
  }

  const widgetDefinition = DASHBOARD_WIDGET_DEFINITIONS[widgetId]
  if (!widgetDefinition.resizable) {
    return null
  }

  const resizedDimensions = getWidgetResizeDimensions(widgetId, width, height)

  const candidateWidget: DashboardWidgetLayoutItem = {
    ...targetWidget,
    w: resizedDimensions.width,
    h: resizedDimensions.height,
  }

  if (candidateWidget.w < widgetDefinition.minW || candidateWidget.h < widgetDefinition.minH) {
    return null
  }

  if (!isWidgetAreaAvailable(layout.home.widgets, candidateWidget, widgetId)) {
    return null
  }

  const nextLayout = cloneDashboardLayout(layout)
  nextLayout.home.widgets = nextLayout.home.widgets.map((widget) =>
    widget.id === widgetId ? candidateWidget : widget
  )

  return nextLayout
}

function moveWidgetToPosition(layout: DashboardLayout, widgetId: DashboardWidgetId, nextX: number, nextY: number) {
  const targetWidget = layout.home.widgets.find((widget) => widget.id === widgetId)
  if (!targetWidget) {
    return null
  }

  const candidateWidget: DashboardWidgetLayoutItem = {
    ...targetWidget,
    x: nextX,
    y: nextY,
  }

  if (!isWidgetAreaAvailable(layout.home.widgets, candidateWidget, widgetId)) {
    return null
  }

  const nextLayout = cloneDashboardLayout(layout)
  nextLayout.home.widgets = nextLayout.home.widgets.map((widget) => (
    widget.id === widgetId ? candidateWidget : widget
  ))

  return nextLayout
}

function swapWidgets(layout: DashboardLayout, sourceWidgetId: DashboardWidgetId, targetWidgetId: DashboardWidgetId) {
  const sourceWidget = layout.home.widgets.find((widget) => widget.id === sourceWidgetId)
  const targetWidget = layout.home.widgets.find((widget) => widget.id === targetWidgetId)
  if (!sourceWidget || !targetWidget) {
    return null
  }

  const otherWidgets = layout.home.widgets.filter(
    (widget) => widget.id !== sourceWidgetId && widget.id !== targetWidgetId
  )

  const swappedSourceWidget: DashboardWidgetLayoutItem = {
    ...sourceWidget,
    x: targetWidget.x,
    y: targetWidget.y,
  }
  const swappedTargetWidget: DashboardWidgetLayoutItem = {
    ...targetWidget,
    x: sourceWidget.x,
    y: sourceWidget.y,
  }

  if (!isWidgetAreaAvailable(otherWidgets, swappedSourceWidget)) {
    return null
  }

  if (!isWidgetAreaAvailable([...otherWidgets, swappedSourceWidget], swappedTargetWidget)) {
    return null
  }

  const nextLayout = cloneDashboardLayout(layout)
  nextLayout.home.widgets = nextLayout.home.widgets.map((widget) => {
    if (widget.id === sourceWidgetId) {
      return swappedSourceWidget
    }

    if (widget.id === targetWidgetId) {
      return swappedTargetWidget
    }

    return widget
  })

  return nextLayout
}

function findMaximumWidgetWidth(layout: DashboardLayout, widgetId: DashboardWidgetId) {
  const targetWidget = layout.home.widgets.find((widget) => widget.id === widgetId)
  if (!targetWidget) {
    return HOME_GRID_COLUMNS
  }

  let maximumWidth = targetWidget.w
  for (let nextWidth = targetWidget.w; nextWidth <= HOME_GRID_COLUMNS - targetWidget.x; nextWidth += 1) {
    const resizedDimensions = getWidgetResizeDimensions(widgetId, nextWidth, targetWidget.h)
    const candidateWidget: DashboardWidgetLayoutItem = {
      ...targetWidget,
      w: resizedDimensions.width,
      h: resizedDimensions.height,
    }

    if (!isWidgetAreaAvailable(layout.home.widgets, candidateWidget, widgetId)) {
      break
    }

    maximumWidth = resizedDimensions.width
  }

  return maximumWidth
}

function findMaximumWidgetHeight(layout: DashboardLayout, widgetId: DashboardWidgetId) {
  const targetWidget = layout.home.widgets.find((widget) => widget.id === widgetId)
  if (!targetWidget) {
    return 12
  }

  let maximumHeight = targetWidget.h
  for (let nextHeight = targetWidget.h; nextHeight <= 12; nextHeight += 1) {
    const candidateWidget: DashboardWidgetLayoutItem = {
      ...targetWidget,
      h: nextHeight,
    }

    if (!isWidgetAreaAvailable(layout.home.widgets, candidateWidget, widgetId)) {
      break
    }

    maximumHeight = nextHeight
  }

  return maximumHeight
}

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAuthHydrated = useAuthHydration()
  const [isEditingLayout, setIsEditingLayout] = React.useState(false)
  const [hasUnsavedLayoutChanges, setHasUnsavedLayoutChanges] = React.useState(false)
  const [selectedWidgetIds, setSelectedWidgetIds] = React.useState<DashboardWidgetId[]>([])
  const [draggingWidgetId, setDraggingWidgetId] = React.useState<DashboardWidgetId | null>(null)
  const [isResizingWidget, setIsResizingWidget] = React.useState(false)
  const [dashboardLayout, setDashboardLayout] = React.useState<DashboardLayout>(
    normalizeDashboardLayout(user?.dashboard_layout)
  )
  const dashboardLayoutRef = React.useRef(dashboardLayout)
  const dashboardCanvasRef = React.useRef<HTMLDivElement | null>(null)
  const activeResizeSessionRef = React.useRef<DashboardResizeSession | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
    enabled: isAuthHydrated && !!user,
    refetchInterval: 60000,
  })

  const dashboardLayoutQuery = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: getDashboardLayoutApi,
    enabled: isAuthHydrated && !!user,
    initialData: user?.dashboard_layout
      ? { dashboard_layout: normalizeDashboardLayout(user.dashboard_layout) }
      : undefined,
  })

  const createPatientMutation = useMutation({
    mutationFn: createPatientApi,
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      router.push(`/patients/${newPatient.id}`)
    },
    onError: () => {
      toast.error('创建患者失败，请重试')
    },
  })

  const metrics = data?.metrics
  const currentUserRole = isAuthHydrated ? user?.role : undefined
  const dashboardWidgets = React.useMemo(
    () => [...dashboardLayout.home.widgets].sort((leftWidget, rightWidget) => {
      if (leftWidget.y === rightWidget.y) {
        return leftWidget.x - rightWidget.x
      }
      return leftWidget.y - rightWidget.y
    }),
    [dashboardLayout]
  )
  const existingWidgetIds = React.useMemo(
    () => new Set(dashboardWidgets.map((widget) => widget.id)),
    [dashboardWidgets]
  )
  const availableWidgetIds = React.useMemo(
    () => (Object.keys(DASHBOARD_WIDGET_DEFINITIONS) as DashboardWidgetId[]).filter(
      (widgetId) => !existingWidgetIds.has(widgetId)
    ),
    [existingWidgetIds]
  )
  const dashboardGridRowCount = React.useMemo(
    () => Math.max(6, ...dashboardWidgets.map((widget) => widget.y + widget.h)) + 2,
    [dashboardWidgets]
  )

  React.useEffect(() => {
    dashboardLayoutRef.current = dashboardLayout
  }, [dashboardLayout])

  React.useEffect(() => {
    if (isEditingLayout || hasUnsavedLayoutChanges) {
      return
    }

    const nextDashboardLayout = dashboardLayoutQuery.data?.dashboard_layout
    if (nextDashboardLayout) {
      setDashboardLayout(normalizeDashboardLayout(nextDashboardLayout))
      return
    }

    setDashboardLayout(normalizeDashboardLayout(user?.dashboard_layout))
  }, [dashboardLayoutQuery.data, hasUnsavedLayoutChanges, isEditingLayout, user?.dashboard_layout])

  const saveDashboardLayoutMutation = useMutation({
    mutationFn: updateDashboardLayoutApi,
    onSuccess: (response) => {
      setDashboardLayout(normalizeDashboardLayout(response.dashboard_layout))
      setHasUnsavedLayoutChanges(false)
      setIsEditingLayout(false)
      setSelectedWidgetIds([])
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] })
      toast.success('首页布局已保存')
    },
    onError: (error) => {
      toast.error(`保存首页布局失败：${error instanceof Error ? error.message : '请稍后重试'}`)
    },
  })

  const resetDashboardLayoutMutation = useMutation({
    mutationFn: resetDashboardLayoutApi,
    onSuccess: (response) => {
      setDashboardLayout(normalizeDashboardLayout(response.dashboard_layout))
      setHasUnsavedLayoutChanges(false)
      setSelectedWidgetIds([])
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] })
      toast.success('已恢复推荐布局')
    },
    onError: (error) => {
      toast.error(`恢复推荐布局失败：${error instanceof Error ? error.message : '请稍后重试'}`)
    },
  })

  const handleCreatePatient = (formData: {
    name: string
    caseNumber: string
    gender: PatientRequest['gender']
    birthDate: string
    diagnosis: string
    status: PatientRequest['status']
  }) => {
    createPatientMutation.mutate({
      name: formData.name,
      case_number: formData.caseNumber,
      gender: formData.gender,
      birth_date: formData.birthDate,
      clinical_diagnosis: formData.diagnosis,
      status: formData.status,
    })
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  const applyDashboardLayoutChange = (nextDashboardLayout: DashboardLayout | null, failureMessage: string) => {
    if (!nextDashboardLayout) {
      toast.warning(failureMessage)
      return false
    }

    setDashboardLayout(normalizeDashboardLayout(nextDashboardLayout))
    setHasUnsavedLayoutChanges(true)
    return true
  }

  const handleAddWidget = (widgetId: DashboardWidgetId) => {
    applyDashboardLayoutChange(
      addWidgetToLayout(dashboardLayout, widgetId),
      '当前首页没有足够空间放置该组件'
    )
  }

  const handleRemoveWidget = (widgetId: DashboardWidgetId) => {
    setDashboardLayout((currentLayout) => ({
      version: 1,
      home: {
        widgets: currentLayout.home.widgets.filter((widget) => widget.id !== widgetId),
      },
    }))
    setSelectedWidgetIds([])
    setHasUnsavedLayoutChanges(true)
  }

  const handleResizePointerMove = React.useCallback((event: PointerEvent) => {
    const activeResizeSession = activeResizeSessionRef.current
    if (!activeResizeSession) {
      return
    }

    event.preventDefault()

    const horizontalDelta = Math.round(
      (event.clientX - activeResizeSession.startClientX) / activeResizeSession.columnStepSize
    )
    const verticalDelta = Math.round(
      (event.clientY - activeResizeSession.startClientY) / activeResizeSession.rowStepSize
    )

    const nextWidth = Math.max(
      DASHBOARD_WIDGET_DEFINITIONS[activeResizeSession.widgetId].minW,
      Math.min(activeResizeSession.maximumWidth, activeResizeSession.startWidth + horizontalDelta)
    )

    const nextHeight = activeResizeSession.lockAspectRatio
      ? getLockedWidgetHeight(activeResizeSession.widgetId, nextWidth)
      : Math.max(
          DASHBOARD_WIDGET_DEFINITIONS[activeResizeSession.widgetId].minH,
          Math.min(activeResizeSession.maximumHeight, activeResizeSession.startHeight + verticalDelta)
        )

    const nextLayout = resizeWidget(
      activeResizeSession.baseLayout,
      activeResizeSession.widgetId,
      nextWidth,
      nextHeight
    )

    if (!nextLayout) {
      return
    }

    setDashboardLayout(normalizeDashboardLayout(nextLayout))
    setHasUnsavedLayoutChanges(true)
  }, [])

  const handleResizePointerUp = React.useCallback(() => {
    activeResizeSessionRef.current = null
    setIsResizingWidget(false)
  }, [])

  React.useEffect(() => {
    if (!isResizingWidget) {
      return
    }

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'nwse-resize'
    window.addEventListener('pointermove', handleResizePointerMove)
    window.addEventListener('pointerup', handleResizePointerUp)

    return () => {
      window.removeEventListener('pointermove', handleResizePointerMove)
      window.removeEventListener('pointerup', handleResizePointerUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [handleResizePointerMove, handleResizePointerUp, isResizingWidget])

  const handleResizeHandlePointerDown = (widgetId: DashboardWidgetId, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const targetWidget = dashboardLayoutRef.current.home.widgets.find((widget) => widget.id === widgetId)
    const gridElement = dashboardCanvasRef.current
    if (!targetWidget || !gridElement) {
      return
    }

    const gridStyles = window.getComputedStyle(gridElement)
    const columnGap = Number.parseFloat(gridStyles.columnGap || '0') || 0
    const rowGap = Number.parseFloat(gridStyles.rowGap || '0') || 0
    const gridRect = gridElement.getBoundingClientRect()
    const columnWidth = (gridRect.width - columnGap * (HOME_GRID_COLUMNS - 1)) / HOME_GRID_COLUMNS
    if (columnWidth <= 0) {
      return
    }

    const currentLayout = dashboardLayoutRef.current
    activeResizeSessionRef.current = {
      widgetId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: targetWidget.w,
      startHeight: targetWidget.h,
      maximumWidth: findMaximumWidgetWidth(currentLayout, widgetId),
      maximumHeight: findMaximumWidgetHeight(currentLayout, widgetId),
      lockAspectRatio: Boolean(DASHBOARD_WIDGET_DEFINITIONS[widgetId].lockAspectRatio),
      baseLayout: currentLayout,
      columnStepSize: columnWidth + columnGap,
      rowStepSize: HOME_GRID_ROW_HEIGHT + rowGap,
    }
    setIsResizingWidget(true)
  }

  const handleEnterEditing = () => {
    setIsEditingLayout(true)
    setSelectedWidgetIds([])
  }

  const handleWidgetDragStart = (widgetId: DashboardWidgetId, event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', widgetId)
    setDraggingWidgetId(widgetId)
  }

  const handleWidgetDragEnd = () => {
    setDraggingWidgetId(null)
  }

  const handleGridDrop = (targetX: number, targetY: number) => {
    if (!draggingWidgetId) {
      return
    }

    applyDashboardLayoutChange(
      moveWidgetToPosition(dashboardLayout, draggingWidgetId, targetX, targetY),
      '当前位置无法放置该组件'
    )
    setDraggingWidgetId(null)
  }

  const handleWidgetSwapDrop = (targetWidgetId: DashboardWidgetId) => {
    if (!draggingWidgetId || draggingWidgetId === targetWidgetId) {
      setDraggingWidgetId(null)
      return
    }

    applyDashboardLayoutChange(
      swapWidgets(dashboardLayout, draggingWidgetId, targetWidgetId),
      '当前两个组件无法互换位置'
    )
    setDraggingWidgetId(null)
  }

  const handleToggleWidgetSelection = (widgetId: DashboardWidgetId) => {
    setSelectedWidgetIds((currentSelectedWidgetIds) => (
      currentSelectedWidgetIds.includes(widgetId)
        ? currentSelectedWidgetIds.filter((currentWidgetId) => currentWidgetId !== widgetId)
        : [...currentSelectedWidgetIds, widgetId]
    ))
  }

  const handleRemoveSelectedWidgets = () => {
    if (selectedWidgetIds.length === 0) {
      return
    }

    setDashboardLayout((currentLayout) => ({
      version: 1,
      home: {
        widgets: currentLayout.home.widgets.filter((widget) => !selectedWidgetIds.includes(widget.id)),
      },
    }))
    setSelectedWidgetIds([])
    setHasUnsavedLayoutChanges(true)
  }

  const handleCancelEditing = () => {
    setDashboardLayout(normalizeDashboardLayout(dashboardLayoutQuery.data?.dashboard_layout || user?.dashboard_layout))
    setHasUnsavedLayoutChanges(false)
    setIsEditingLayout(false)
    setSelectedWidgetIds([])
  }

  const handleSaveLayout = () => {
    saveDashboardLayoutMutation.mutate({ dashboard_layout: dashboardLayout })
  }

  const renderPrimaryQuickAction = () => {
    if (!currentUserRole) {
      return <div className="h-full min-h-[7rem] w-full rounded-lg border border-dashed" />
    }

    if (currentUserRole === 'admin') {
      return (
        <Button
          className="h-full min-h-[7rem] w-full flex-1 flex-col gap-2 text-base sm:text-lg shadow-md bg-blue-600 hover:bg-blue-700"
          onClick={() => router.push('/settings/users')}
        >
          <UserCog className="h-8 w-8" />
          <span>用户管理</span>
        </Button>
      )
    }

    if (currentUserRole === 'researcher') {
      return (
        <CreateProjectDialog
          trigger={
            <Button className="h-full min-h-[7rem] w-full flex-1 flex-col gap-2 text-base sm:text-lg shadow-md bg-blue-600 hover:bg-blue-700">
              <FileText className="h-8 w-8" />
              <span>新建课题</span>
            </Button>
          }
        />
      )
    }

    return (
      <CreatePatientDialog
        trigger={
          <Button className="h-full min-h-[7rem] w-full flex-1 flex-col gap-2 text-base sm:text-lg shadow-md bg-blue-600 hover:bg-blue-700">
            <Users className="h-8 w-8" />
            <span>新建患者</span>
          </Button>
        }
        onSubmit={handleCreatePatient}
      />
    )
  }

  const renderSecondaryQuickActions = () => {
    if (!currentUserRole) {
      return (
        <div className="grid grid-cols-2 gap-4">
          <div className="min-h-[4rem] rounded-lg border border-dashed" />
          <div className="min-h-[4rem] rounded-lg border border-dashed" />
        </div>
      )
    }

    if (currentUserRole === 'admin') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <Button className="min-h-[4rem] h-full gap-2 text-sm sm:text-base" variant="outline" onClick={() => router.push('/settings/dental-labels')}>
            <Tags className="h-5 w-5 text-primary" />
            <span>牙位标签</span>
          </Button>
          <Button className="min-h-[4rem] h-full gap-2 text-sm sm:text-base" variant="outline" onClick={() => router.push('/settings')}>
            <Settings className="h-5 w-5 text-primary" />
            <span>设置中心</span>
          </Button>
        </div>
      )
    }

    if (currentUserRole === 'researcher') {
      return (
        <div className="grid grid-cols-2 gap-4">
          <Button className="min-h-[4rem] h-full gap-2 text-sm sm:text-base" variant="outline" onClick={() => router.push('/patients')}>
            <Users className="h-5 w-5 text-primary" />
            <span>患者列表</span>
          </Button>
          <Button className="min-h-[4rem] h-full gap-2 text-sm sm:text-base" variant="outline" onClick={() => router.push('/projects')}>
            <FolderKanban className="h-5 w-5 text-primary" />
            <span>课题列表</span>
          </Button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        <Button className="min-h-[4rem] h-full gap-2 text-sm sm:text-base" variant="outline" onClick={() => router.push('/notifications')}>
          <Bell className="h-5 w-5 text-primary" />
          <span>通知中心</span>
        </Button>
        <Button className="min-h-[4rem] h-full gap-2 text-sm sm:text-base" variant="outline" onClick={() => router.push('/patients')}>
          <Users className="h-5 w-5 text-primary" />
          <span>患者列表</span>
        </Button>
      </div>
    )
  }

  const renderMetricWidget = (widgetId: DashboardWidgetId) => {
    if (widgetId === 'metric_total_projects') {
      return (
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">课题总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : metrics?.total_projects ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">本月新增 +{metrics?.new_projects_this_month ?? 0}</p>
          </CardContent>
        </Card>
      )
    }

    if (widgetId === 'metric_total_patients') {
      return (
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">在库患者</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (metrics?.total_patients ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">今日新增 +{metrics?.new_patients_today ?? 0}</p>
          </CardContent>
        </Card>
      )
    }

    if (widgetId === 'metric_pending_patients') {
      return (
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待确认数据</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : metrics?.pending_patients ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">条记录需要质控</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">本月新增</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `+${metrics?.new_patients_this_month ?? 0}`}
          </div>
          <p className="text-xs text-muted-foreground">位患者入库</p>
        </CardContent>
      </Card>
    )
  }

  const renderQuickActionsWidget = () => {
    return (
      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle>快捷操作</CardTitle>
          <CardDescription>常用功能入口</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1">
            {renderPrimaryQuickAction()}
          </div>
          {renderSecondaryQuickActions()}
        </CardContent>
      </Card>
    )
  }

  const renderRecentActivityWidget = () => {
    return (
      <Card className="flex h-full min-h-0 flex-col">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle>最近动态</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-full w-full space-y-3 overflow-y-auto pr-1">
              {data?.recent_activities?.map((activity, index) => {
                const dotColor = activity.action === 'CREATE'
                  ? 'bg-green-500'
                  : activity.action === 'DELETE'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                return (
                  <div
                    key={`${activity.action}-${activity.model_name}-${index}`}
                    className="flex items-start gap-3 rounded-md px-1 py-1.5 text-[clamp(0.95rem,1.2vw,1.05rem)]"
                  >
                    <div className={`h-2 w-2 mt-1.5 rounded-full ${dotColor}`} />
                    <div className="grid gap-1 flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-[clamp(0.75rem,1vw,0.875rem)] text-muted-foreground">{formatRelativeTime(activity.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              {!data?.recent_activities?.length && (
                <p className="py-4 text-center text-sm text-muted-foreground">暂无动态</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderWidgetContent = (widgetId: DashboardWidgetId) => {
    if (
      widgetId === 'metric_total_projects' ||
      widgetId === 'metric_total_patients' ||
      widgetId === 'metric_pending_patients' ||
      widgetId === 'metric_new_patients_month'
    ) {
      return renderMetricWidget(widgetId)
    }

    if (widgetId === 'trend_chart') {
      return <TrendChart data={data?.trend_data ?? []} isLoading={isLoading} />
    }

    if (widgetId === 'distribution_chart') {
      return <DistributionChart data={data?.distribution_data ?? []} isLoading={isLoading} />
    }

    if (widgetId === 'quick_actions') {
      return renderQuickActionsWidget()
    }

    return renderRecentActivityWidget()
  }

  const renderWidgetActions = (widget: DashboardWidgetLayoutItem) => {
    const isSelected = selectedWidgetIds.includes(widget.id)

    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-4 pt-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          size="icon"
          type="button"
          variant={isSelected ? "default" : "outline"}
          className="pointer-events-auto h-8 w-8 bg-background/95"
          onClick={() => handleToggleWidgetSelection(widget.id)}
        >
          {isSelected ? <CheckSquare2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </Button>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 rounded-md bg-background/95 px-2 py-1.5 shadow-sm">
          <Button
            size="icon"
            type="button"
            variant="ghost"
            className="h-7 w-7 bg-background/95 cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={(event) => handleWidgetDragStart(widget.id, event)}
            onDragEnd={handleWidgetDragEnd}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button size="icon" type="button" variant="ghost" className="h-7 w-7 bg-background/95 text-red-600 hover:text-red-700" onClick={() => handleRemoveWidget(widget.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        {isEditingLayout && (
          <>
            <Button type="button" variant="outline" onClick={handleRemoveSelectedWidgets} disabled={selectedWidgetIds.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除已选组件
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelEditing}>
              取消编辑
            </Button>
            <Button type="button" onClick={handleSaveLayout} disabled={!hasUnsavedLayoutChanges || saveDashboardLayoutMutation.isPending}>
              <Check className="mr-2 h-4 w-4" />
              保存首页
            </Button>
          </>
        )}
        {!isEditingLayout && (
          <Button type="button" size="icon" onClick={handleEnterEditing}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isEditingLayout && (
        <Card>
          <CardHeader>
            <CardTitle>编辑首页</CardTitle>
            <CardDescription>先勾选需要删除的组件，再从下方继续添加组件或使用推荐布局。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => resetDashboardLayoutMutation.mutate()} disabled={resetDashboardLayoutMutation.isPending}>
                <RotateCcw className="mr-2 h-4 w-4" />
                一键使用推荐布局
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableWidgetIds.length > 0 ? (
                availableWidgetIds.map((widgetId) => (
                  <Button key={widgetId} type="button" variant="outline" onClick={() => handleAddWidget(widgetId)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {DASHBOARD_WIDGET_DEFINITIONS[widgetId].title}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">所有组件都已经加入首页了。</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {dashboardLayoutQuery.isLoading && !dashboardLayoutQuery.data ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : dashboardWidgets.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">首页还是空的</h2>
            <p className="text-sm text-muted-foreground">点击右上角加号进入编辑模式，再把常用信息和操作放到你的首页里。</p>
          </div>
        </div>
      ) : isEditingLayout ? (
        <div className="overflow-x-auto pb-2">
          <div
            ref={dashboardCanvasRef}
            className="grid min-w-[1200px] gap-4"
            style={{
              minWidth: `${HOME_GRID_MIN_WIDTH}px`,
              gridTemplateColumns: `repeat(${HOME_GRID_COLUMNS}, minmax(0, 1fr))`,
              gridAutoRows: `${HOME_GRID_ROW_HEIGHT}px`,
            }}
          >
            {draggingWidgetId && Array.from({ length: dashboardGridRowCount * HOME_GRID_COLUMNS }, (_, index) => {
              const cellX = index % HOME_GRID_COLUMNS
              const cellY = Math.floor(index / HOME_GRID_COLUMNS)

              return (
                <div
                  key={`drop-zone-${cellX}-${cellY}`}
                  className="rounded-lg border border-dashed border-primary/40 bg-primary/5"
                  style={{
                    gridColumn: `${cellX + 1} / span 1`,
                    gridRow: `${cellY + 1} / span 1`,
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleGridDrop(cellX, cellY)}
                />
              )
            })}
            {dashboardWidgets.map((widget) => (
              <div
                key={widget.id}
                className="group relative min-h-0 overflow-hidden rounded-xl"
                style={{
                  gridColumn: `${widget.x + 1} / span ${widget.w}`,
                  gridRow: `${widget.y + 1} / span ${widget.h}`,
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                }}
                onDrop={() => handleWidgetSwapDrop(widget.id)}
              >
                {selectedWidgetIds.includes(widget.id) && (
                  <div className="pointer-events-none absolute inset-0 z-30 rounded-xl border-2 border-primary/70" />
                )}
                {renderWidgetActions(widget)}
                <div className={`h-full min-h-0 ${DASHBOARD_WIDGET_SURFACE_CLASS}`}>
                  {renderWidgetContent(widget.id)}
                </div>
                {DASHBOARD_WIDGET_DEFINITIONS[widget.id].resizable && (
                  <Button
                    size="icon"
                    type="button"
                    variant="outline"
                    className="absolute bottom-2 right-2 z-10 h-8 w-8 cursor-nwse-resize touch-none bg-background/95"
                    onPointerDown={(event) => handleResizeHandlePointerDown(widget.id, event)}
                  >
                    <MoveDiagonal2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:hidden">
            {dashboardWidgets.map((widget) => (
              <div
                key={widget.id}
                className={selectedWidgetIds.includes(widget.id) ? "relative min-h-0 rounded-xl ring-2 ring-primary/60 ring-offset-2" : "relative min-h-0"}
              >
                <div className={`min-h-0 ${DASHBOARD_WIDGET_SURFACE_CLASS}`}>
                  {renderWidgetContent(widget.id)}
                </div>
              </div>
            ))}
          </div>

          <div
            className="hidden gap-4 xl:grid"
            style={{
              gridTemplateColumns: `repeat(${HOME_GRID_COLUMNS}, minmax(0, 1fr))`,
              gridAutoRows: `${HOME_GRID_ROW_HEIGHT}px`,
            }}
          >
            {dashboardWidgets.map((widget) => (
              <div
                key={widget.id}
                className={selectedWidgetIds.includes(widget.id) ? "relative min-h-0 rounded-xl ring-2 ring-primary/60 ring-offset-2" : "relative min-h-0"}
                style={{
                  gridColumn: `${widget.x + 1} / span ${widget.w}`,
                  gridRow: `${widget.y + 1} / span ${widget.h}`,
                }}
              >
                <div className={`h-full min-h-0 ${DASHBOARD_WIDGET_SURFACE_CLASS}`}>
                  {renderWidgetContent(widget.id)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
