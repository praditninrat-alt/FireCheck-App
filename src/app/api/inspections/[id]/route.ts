import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireUser, serverError } from "@/lib/api";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const inspection = await db.inspection.findUnique({
      where: { id },
      include: {
        extinguisher: { include: { location: true } },
        inspector: { select: { id: true, name: true } },
        items: true,
        defects: {
          include: {
            assignee: { select: { name: true } },
            notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!inspection) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบรายการตรวจนี้" } }, { status: 404 });
    return NextResponse.json({ data: inspection });
  } catch {
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const result = await db.$transaction(async (tx) => {
      const inspection = await tx.inspection.findUnique({ where: { id }, select: { id: true } });
      if (!inspection) return "NOT_FOUND" as const;
      const defectCount = await tx.defect.count({ where: { inspectionId: id } });
      if (defectCount > 0) return "HAS_DEFECTS" as const;
      await tx.inspection.delete({ where: { id } });
      return "DELETED" as const;
    });
    if (result === "NOT_FOUND") {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบรายการตรวจนี้" } }, { status: 404 });
    }
    if (result === "HAS_DEFECTS") {
      return NextResponse.json({ error: { code: "INSPECTION_HAS_DEFECTS", message: "ลบประวัตินี้ไม่ได้ เนื่องจากมีงานแก้ไขผูกอยู่ กรุณาจัดการงานแก้ไขก่อน" } }, { status: 409 });
    }
    return NextResponse.json({ data: { id } });
  } catch {
    return serverError();
  }
}
