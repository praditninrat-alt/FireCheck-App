import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser, invalidInput, serverError, isPrismaNotFound } from "@/lib/api";
import { db } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };
const updateSchema = z.object({ active: z.boolean().optional(), role: z.enum(["ADMIN", "INSPECTOR", "MAINTENANCE"]).optional(), name: z.string().trim().min(1).max(100).optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    if (id === auth.user.id) return NextResponse.json({ error: { code: "SELF_UPDATE", message: "ไม่สามารถปิดใช้งานบัญชีของตนเองได้" } }, { status: 409 });
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const current = await db.user.findUnique({ where: { id }, select: { role: true, active: true } });
    if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบผู้ใช้นี้" } }, { status: 404 });
    const removesActiveAdmin = current.role === Role.ADMIN && current.active &&
      (parsed.data.active === false || (parsed.data.role !== undefined && parsed.data.role !== Role.ADMIN));
    if (removesActiveAdmin) {
      const activeAdmins = await db.user.count({ where: { role: Role.ADMIN, active: true } });
      if (activeAdmins <= 1) {
        return NextResponse.json({ error: { code: "LAST_ADMIN", message: "ต้องมีผู้ดูแลระบบที่ใช้งานอยู่อย่างน้อยหนึ่งบัญชี" } }, { status: 409 });
      }
    }
    const user = await db.user.update({ where: { id }, data: parsed.data, select: { id: true, name: true, email: true, role: true, active: true } });
    if (parsed.data.active === false) await db.session.deleteMany({ where: { userId: id } });
    return NextResponse.json({ data: user });
  } catch (error) {
    if (isPrismaNotFound(error)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบผู้ใช้นี้" } }, { status: 404 });
    return serverError();
  }
}
