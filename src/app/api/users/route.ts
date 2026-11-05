import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser, invalidInput, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { getAssignableRoles } from "@/lib/assignee-roles";
import { userSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireUser([Role.ADMIN, Role.INSPECTOR, Role.MAINTENANCE]);
  if (!auth.user) return auth.response;
  try {
    const forAssignee = new URL(request.url).searchParams.get("for") === "assignee";
    const users = await db.user.findMany({
      where: forAssignee
        ? { active: true, deletedAt: null, role: { in: getAssignableRoles(auth.user.role) } }
        : auth.user.role === Role.ADMIN
          ? { deletedAt: null }
          : auth.user.role === Role.MAINTENANCE
            ? { active: true, deletedAt: null, role: { in: [Role.ADMIN, Role.MAINTENANCE] } }
            : { active: true, deletedAt: null, role: Role.MAINTENANCE },
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: users });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const parsed = userSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await db.user.create({
      data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash, role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: { code: "EMAIL_IN_USE", message: "อีเมลนี้ถูกใช้งานแล้ว" } }, { status: 409 });
    }
    return serverError();
  }
}
