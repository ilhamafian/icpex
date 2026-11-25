import { NextRequest, NextResponse } from "next/server";

import { verifyParticipantEmail } from "@/app/actions/participantAuth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ok = await verifyParticipantEmail(token);
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = ok ? "verified=1" : "verify=invalid";
  return NextResponse.redirect(url);
}
