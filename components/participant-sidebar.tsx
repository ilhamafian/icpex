"use client";

import type { ComponentProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconClipboardList, IconPlus, IconUserCircle } from "@tabler/icons-react";

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
      <SidebarHeader className="px-4 py-4">
        <Link href="/" aria-label="I-CRIVE home" className="inline-flex">
          <Image
            src="/brand/logo-on-dark.png"
            alt="I-CRIVE — Research, Innovation & Excellence"
            width={942}
            height={373}
            priority
            className="h-10 w-auto"
          />
        </Link>
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
      <SidebarFooter className="[&_.text-muted-foreground]:text-white/65">
        <NavUser user={user} accountHref="/my/account" logoutAction={participantLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}
