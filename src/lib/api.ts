import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentUser, type AuthUser } from "@/lib/auth";

export type ApiContext = { user: AuthUser; response: null } | { user: null; response: NextResponse };
export async function requireUser(roles?: Role[]): Promise<ApiContext> {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: { code: "UNAUTHORIZED", message: "กรุณาเข้าสู่ระบบ" } }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) {
    return { user: null, response: NextResponse.json({ error: { code: "FORBIDDEN", message: "คุณไม่มีสิทธิ์ทำรายการนี้" } }, { status: 403 }) };
  }
  return { user, response: null };
}

export function apiError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function invalidInput() {
  return apiError("ข้อมูลไม่ถูกต้องหรือไม่ครบถ้วน กรุณาตรวจสอบอีกครั้ง", 422, "VALIDATION_ERROR");
}

export function serverError() {
  return apiError("เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง", 500, "INTERNAL_ERROR");
}

export function isPrismaNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}
