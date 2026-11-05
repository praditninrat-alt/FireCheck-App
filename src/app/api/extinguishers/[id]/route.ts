import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireUser, invalidInput, isPrismaNotFound, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { extinguisherSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const item = await db.extinguisher.findUnique({
      where: { id },
      include: {
        location: true,
        inspections: { include: { inspector: { select: { name: true } }, items: true, defects: true }, orderBy: { inspectedAt: "desc" }, take: 100 },
        defects: { include: { assignee: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!item || (!item.active && auth.user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบถังนี้" } }, { status: 404 });
    }
    return NextResponse.json({ data: item });
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const parsed = extinguisherSchema.partial().safeParse(await request.json());
    if (!parsed.success || Object.keys(parsed.data).length === 0) return invalidInput();
    if (parsed.data.locationId) {
      const location = await db.location.findUnique({ where: { id: parsed.data.locationId } });
      if (!location?.active) return NextResponse.json({ error: { code: "INVALID_LOCATION", message: "ไม่พบตำแหน่งที่ใช้งานได้" } }, { status: 422 });
    }
    const item = await db.extinguisher.update({ where: { id }, data: { ...parsed.data, updatedById: auth.user.id }, include: { location: true } });
    return NextResponse.json({ data: item });
  } catch (error) {
    if (isPrismaNotFound(error)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบถังนี้" } }, { status: 404 });
    return serverError();
  }
}
