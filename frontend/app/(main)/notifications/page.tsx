import { NotificationsTable } from "@/components/notifications/notifications-table"

export default function NotificationsPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">通知中心</h1>
      </div>

      <NotificationsTable />
    </div>
  )
}
