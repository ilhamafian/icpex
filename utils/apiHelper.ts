import { NextResponse } from "next/server";

export const createResponse = (data: unknown, status: number = 200) => {
  return NextResponse.json(data, { status });
};

export const handleError = (error: unknown) => {
  console.error("API Error:", error);
  return createResponse({ error: "Internal server error" }, 500);
};
