"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconClipboardList, IconInnerShadowTop, IconPlus, IconUserCircle } from "@tabler/icons-react";

import { participantLogout } from "@/app/actions/participantAuth";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const ITEMS = [
  { title: "My submissions", href: "/my", icon: IconClipboardList },
  { title: "New registration", href: "/my/register", icon: IconPlus },
  { title: "Account", href: "/my/account", icon: IconUserCircle },
];

function isActive(pathname: string, href: string) {
  if (href === "/my") return pathname === "/my";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParticipantSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string };
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:h-auto! data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/my" className="gap-2">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">I-CRIVE</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(pathname, item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} accountHref="/my/account" logoutAction={participantLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}
