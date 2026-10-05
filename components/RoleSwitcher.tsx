"use client";

import { useTransition } from "react";
import { IconLoader2, IconSwitchHorizontal } from "@tabler/icons-react";

import { switchPortalRole } from "@/app/actions/portalAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  USER_ROLE_LABELS,
  sortRoles,
  type UserRole,
} from "@/schemas/userRole";

export function RoleSwitcher({
  role,
  roles,
}: {
  role: UserRole;
  roles: UserRole[];
}) {
  const [pending, startTransition] = useTransition();

  if (roles.length < 2) return null;

  function handleChange(value: string) {
    if (value === role) return;
    const formData = new FormData();
    formData.set("role", value);
    startTransition(() => switchPortalRole(formData));
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 md:right-6 md:bottom-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-full bg-background px-4 shadow-lg"
            disabled={pending}
          >
            {pending ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconSwitchHorizontal className="size-4" />
            )}
            <span className="text-muted-foreground">Role:</span>
            <span className="font-medium">{USER_ROLE_LABELS[role]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-52">
          <DropdownMenuLabel>Switch role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={role} onValueChange={handleChange}>
            {sortRoles(roles).map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {USER_ROLE_LABELS[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
