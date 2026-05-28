import "../globals.css";

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DynamicBreadcrumb } from "@/components/layout/dynamic-breadcrumb"
import { AuthInitializer } from "@/components/auth/auth-initializer"


export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthInitializer>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-x-clip">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-50">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
            <DynamicBreadcrumb />
          </header>
          <div className="flex-1 p-4 lg:p-6 overflow-x-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthInitializer>
  );
}
