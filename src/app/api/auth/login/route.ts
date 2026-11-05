import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, invalidInput, serverError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user || !user.active || !(await compare(parsed.data.password, user.passwordHash))) {
      return apiError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401, "INVALID_CREDENTIALS");
    }
    await createSession(user.id);
    return NextResponse.json({ data: { id: user.id, name: user.name, role: user.role } });
  } catch {
    return serverError();
  }
}
