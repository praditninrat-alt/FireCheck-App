import { NextResponse } from "next/server";
import { DefectStatus, Role } from "@prisma/client";
import { requireUser, invalidInput, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { defectQuerySchema, defectUpdateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const parsedQuery = defectQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsedQuery.success) return invalidInput();
    const { status, search } = parsedQuery.data;
    const defects = await db.defect.findMany({
      where: {
        ...(status ? { status: status as DefectStatus } : {}),
        ...(search ? { OR: [
          { description: { contains: search } },
          { extinguisher: { code: { contains: search } } },
        ] } : {}),
      },
      include: {
        extinguisher: { include: { location: true } },
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    return NextResponse.json({ data: defects });
  } catch {
    return serverError();
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser([Role.ADMIN, Role.MAINTENANCE]);
  if (!auth.user) return auth.response;
  try {
    const body = await request.json() as { id?: unknown; [key: string]: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    const parsed = defectUpdateSchema.safeParse(Object.fromEntries(Object.entries(body).filter(([key]) => key !== "id")));
    if (!id || !parsed.success) return invalidInput();
    const { note, status, ...updates } = parsed.data;
    if (updates.assigneeId) {
      const assignee = await db.user.findUnique({ where: { id: updates.assigneeId }, select: { active: true, role: true } });
      if (!assignee?.active || (assignee.role !== Role.ADMIN && assignee.role !== Role.MAINTENANCE)) {
        return NextResponse.json({ error: { code: "INVALID_ASSIGNEE", message: "ผู้รับผิดชอบต้องเป็นผู้ดูแลงานแก้ไขที่ยังใช้งานอยู่" } }, { status: 422 });
      }
    }
    const defect = await db.$transaction(async (tx) => {
      const current = await tx.defect.findUnique({ where: { id } });
      if (!current) return null;
      if (note || status) {
        const statusNote = status ? `เปลี่ยนสถานะจาก ${current.status} เป็น ${status}` : "";
        const changeNote = [note, statusNote].filter(Boolean).join("\n");
        await tx.defectNote.create({ data: { defectId: id, authorId: auth.user!.id, body: changeNote } });
      }
      return tx.defect.update({
        where: { id },
        data: {
          ...updates,
          updatedById: auth.user!.id,
          ...(status ? {
            status,
            closedAt: status === "RESOLVED" || status === "CANCELLED" ? new Date() : null,
            closedById: status === "RESOLVED" || status === "CANCELLED" ? auth.user!.id : null,
          } : {}),
        },
        include: { assignee: { select: { name: true } }, notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } } },
      });
    });
    if (!defect) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบงานแก้ไขนี้" } }, { status: 404 });
    return NextResponse.json({ data: defect });
  } catch {
    return serverError();
  }
}
