"use client"

import type { ComponentProps } from "react"
import Image from "next/image"
import Link from "next/link"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { USER_ROLE_LABELS, type UserRole } from "@/schemas/userRole"
import { getNavForRole } from "@/utils/portalNav"

export function AppSidebar({
  user,
  role,
  homeHref,
  ...props
}: ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    avatar: string
  }
  role: UserRole
  homeHref: string
}) {
  const navItems = getNavForRole(role)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="px-4 py-4">
        <Link href={homeHref} aria-label="Staff home" className="inline-flex">
          <Image
            src="/brand/logo-on-dark.png"
            alt="I-CRIVE — Research, Innovation & Excellence"
            width={942}
            height={373}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <Badge className="mt-1 w-fit rounded-full border border-[#e8b84a]/40 bg-[#1a3d62] px-2.5 text-[#e8b84a]">
          {USER_ROLE_LABELS[role]}
        </Badge>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter className="[&_.text-muted-foreground]:text-white/65">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
