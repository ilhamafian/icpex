import type { ReactNode } from "react";
import { redirect } from "next/navigation";

export default function ParticipantLayout({ children }: { children: ReactNode }) {
  void children;
  redirect("/register");
}
