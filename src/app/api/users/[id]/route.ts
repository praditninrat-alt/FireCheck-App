import { randomBytes } from "node:crypto";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser, invalidInput, serverError, isPrismaNotFound } from "@/lib/api";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };
const updateSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(["ADMIN", "INSPECTOR", "MAINTENANCE"]).optional(),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const current = await db.user.findUnique({ where: { id }, select: { role: true, active: true, deletedAt: true } });
    if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบผู้ใช้นี้" } }, { status: 404 });
    if (current.deletedAt) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบบัญชีนี้" } }, { status: 404 });
    if (id === auth.user.id && (parsed.data.active === false || (parsed.data.role !== undefined && parsed.data.role !== current.role))) {
      return NextResponse.json({ error: { code: "SELF_UPDATE", message: "ไม่สามารถปิดใช้งานหรือเปลี่ยนบทบาทบัญชีของตนเองได้" } }, { status: 409 });
    }
    const removesActiveAdmin = current.role === Role.ADMIN && current.active &&
      (parsed.data.active === false || (parsed.data.role !== undefined && parsed.data.role !== Role.ADMIN));
    if (removesActiveAdmin) {
      const activeAdmins = await db.user.count({ where: { role: Role.ADMIN, active: true, deletedAt: null } });
      if (activeAdmins <= 1) {
        return NextResponse.json({ error: { code: "LAST_ADMIN", message: "ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อยหนึ่งบัญชี" } }, { status: 409 });
      }
    }
    const user = await db.user.update({ where: { id }, data: parsed.data, select: { id: true, name: true, email: true, role: true, active: true } });
    if (parsed.data.active === false) await db.session.deleteMany({ where: { userId: id } });
    return NextResponse.json({ data: user });
  } catch (error) {
    if (isPrismaNotFound(error)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบผู้ใช้นี้" } }, { status: 404 });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: { code: "EMAIL_IN_USE", message: "อีเมลนี้ถูกใช้งานแล้ว" } }, { status: 409 });
    }
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    if (id === auth.user.id) {
      return NextResponse.json({ error: { code: "SELF_DELETE", message: "ไม่สามารถลบบัญชีของตนเองได้" } }, { status: 409 });
    }
    const user = await db.user.findUnique({ where: { id }, select: { role: true, active: true, deletedAt: true } });
    if (!user || user.deletedAt) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบบัญชีนี้" } }, { status: 404 });
    if (user.role === Role.ADMIN && user.active) {
      const activeAdmins = await db.user.count({ where: { role: Role.ADMIN, active: true, deletedAt: null } });
      if (activeAdmins <= 1) {
        return NextResponse.json({ error: { code: "LAST_ADMIN", message: "ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อยหนึ่งบัญชี" } }, { status: 409 });
      }
    }
    await db.$transaction([
      db.user.update({
        where: { id },
        data: {
          name: "บัญชีถูกลบ",
          email: `deleted-${id}@deleted.invalid`,
          passwordHash: randomBytes(32).toString("base64url"),
          active: false,
          deletedAt: new Date(),
        },
      }),
      db.session.deleteMany({ where: { userId: id } }),
    ]);
    return NextResponse.json({ data: { id } });
  } catch (error) {
    if (isPrismaNotFound(error)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบบัญชีนี้" } }, { status: 404 });
    return serverError();
  }
}
