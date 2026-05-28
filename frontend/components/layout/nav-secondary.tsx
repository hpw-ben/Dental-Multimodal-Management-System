"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface NavSecondaryItem {
  title: string
  url: string
  icon: LucideIcon
  onClick?: () => void
  /** 快捷键提示，如 "⌘K" */
  shortcut?: string
}

export function NavSecondary({
  items,
  ...props
}: {
  items: NavSecondaryItem[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.onClick ? (
                <SidebarMenuButton size="sm" tooltip={item.title} onClick={item.onClick}>
                  <item.icon />
                  <span className="truncate whitespace-nowrap">{item.title}</span>
                  {item.shortcut && (
                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
                      {item.shortcut}
                    </kbd>
                  )}
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton asChild size="sm" tooltip={item.title}>
                  <a href={item.url}>
                    <item.icon />
                    <span className="truncate whitespace-nowrap">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
