import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireUser, invalidInput, isPrismaNotFound, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { locationSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const parsed = locationSchema.partial().safeParse(await request.json());
    if (!parsed.success || Object.keys(parsed.data).length === 0) return invalidInput();
    if (parsed.data.active === false) {
      const activeExtinguishers = await db.extinguisher.count({ where: { locationId: id, active: true } });
      if (activeExtinguishers > 0) {
        return NextResponse.json({ error: { code: "LOCATION_IN_USE", message: "ตำแหน่งนี้ยังมีถังที่ใช้งานอยู่ กรุณาย้ายหรือปิดใช้งานถังก่อน" } }, { status: 409 });
      }
    }
    const location = await db.location.update({ where: { id }, data: { ...parsed.data, updatedById: auth.user.id } });
    return NextResponse.json({ data: location });
  } catch (error) {
    if (isPrismaNotFound(error)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบตำแหน่งนี้" } }, { status: 404 });
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const location = await db.location.findUnique({ where: { id }, include: { extinguishers: { where: { active: true }, select: { id: true } } } });
    if (!location) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบตำแหน่งนี้" } }, { status: 404 });
    if (location.extinguishers.length) {
      return NextResponse.json({ error: { code: "LOCATION_IN_USE", message: "ตำแหน่งนี้ยังมีถังที่ใช้งานอยู่ กรุณาย้ายหรือปิดใช้งานถังก่อน" } }, { status: 409 });
    }
    const result = await db.location.update({ where: { id }, data: { active: false, updatedById: auth.user.id } });
    return NextResponse.json({ data: result });
  } catch {
    return serverError();
  }
}
