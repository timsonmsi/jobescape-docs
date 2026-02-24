import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/api";

export function apiOk<T>(
  message: string,
  data?: T
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ ok: true, message, data }, { status: 200 });
}

export function apiError(
  message: string,
  status = 500
): NextResponse<ApiResponse> {
  return NextResponse.json({ ok: false, message }, { status });
}
