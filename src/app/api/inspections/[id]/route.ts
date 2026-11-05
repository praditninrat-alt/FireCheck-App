import { NextResponse } from "next/server";
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
