import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/register";
  url.search = "";
  return NextResponse.redirect(url);
}
