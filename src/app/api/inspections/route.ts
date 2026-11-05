import { InspectionStatus, ItemStatus, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser, invalidInput, serverError, apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { inspectionQuerySchema, inspectionSchema } from "@/lib/validation";
import { summarizeInspection } from "@/lib/inspection-logic";
import { getAssignableRoles } from "@/lib/assignee-roles";
import { decodeDefectImageDataUrl } from "@/lib/defect-image";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const parsedQuery = inspectionQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsedQuery.success) return invalidInput();
    const { from: fromValue, to: toValue, status, extinguisherId, inspectorId, locationId } = parsedQuery.data;
    const start = fromValue ? new Date(`${fromValue}T00:00:00+07:00`) : undefined;
    const end = toValue ? new Date(`${toValue}T23:59:59.999+07:00`) : undefined;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime())) || (start && end && start > end)) return apiError("ช่วงวันที่ไม่ถูกต้อง", 422, "INVALID_DATE_RANGE");
    const items = await db.inspection.findMany({
      where: {
        ...(status ? { status: status as InspectionStatus } : {}),
        ...(extinguisherId ? { extinguisherId } : {}),
        ...(inspectorId ? { inspectorId } : {}),
        ...(start || end ? { inspectedAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
        ...(locationId ? { extinguisher: { locationId } } : {}),
      },
      include: { extinguisher: { include: { location: true } }, inspector: { select: { id: true, name: true } }, items: true, defects: true },
      orderBy: { inspectedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ data: items });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const auth = await requireUser([Role.ADMIN, Role.INSPECTOR]);
  if (!auth.user) return auth.response;
  try {
    const parsed = inspectionSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    if (parsed.data.items.some((item) => item.status === "FAIL" && !item.note?.trim() && !item.defect?.description?.trim())) {
      return NextResponse.json({ error: { code: "FAILURE_DETAIL_REQUIRED", message: "กรุณาระบุรายละเอียดสำหรับรายการที่ไม่ผ่าน อย่างน้อยในหมายเหตุหรือรายละเอียดข้อบกพร่อง" } }, { status: 422 });
    }
    const extinguisher = await db.extinguisher.findUnique({ where: { id: parsed.data.extinguisherId } });
    if (!extinguisher?.active) return NextResponse.json({ error: { code: "EXTINGUISHER_UNAVAILABLE", message: "ไม่พบถังที่ใช้งานได้" } }, { status: 422 });
    const assigneeIds = [...new Set(parsed.data.items.flatMap((item) => item.defect?.assigneeId ? [item.defect.assigneeId] : []))];
    if (assigneeIds.length) {
      const assignees = await db.user.findMany({ where: { id: { in: assigneeIds }, active: true, role: { in: getAssignableRoles(auth.user.role) } }, select: { id: true } });
      if (assignees.length !== assigneeIds.length) return NextResponse.json({ error: { code: "INVALID_ASSIGNEE", message: "ผู้รับผิดชอบไม่มีสิทธิ์ตามบทบาทผู้ใช้งานหรือปิดใช้งานอยู่" } }, { status: 422 });
    }
    const images = new Map<string, { mimeType: string; data: Uint8Array<ArrayBuffer> }>();
    for (const item of parsed.data.items) {
      if (item.defect?.imageDataUrl) {
        const image = decodeDefectImageDataUrl(item.defect.imageDataUrl);
        if (!image) return NextResponse.json({ error: { code: "INVALID_IMAGE", message: "รูปภาพไม่ถูกต้องหรือมีขนาดเกิน 5 MB รองรับ JPG, PNG หรือ WebP" } }, { status: 422 });
        images.set(item.criterion, image);
      }
    }
    const status = summarizeInspection(parsed.data.items);
    const inspection = await db.$transaction(async (tx) => {
      const created = await tx.inspection.create({
        data: {
          extinguisherId: parsed.data.extinguisherId,
          inspectorId: auth.user!.id,
          inspectedAt: parsed.data.inspectedAt ? new Date(parsed.data.inspectedAt) : new Date(),
          status,
          notes: parsed.data.notes,
          items: { create: parsed.data.items.map(({ criterion, status: itemStatus, note }) => ({ criterion, status: itemStatus, note })) },
        },
        include: { items: true },
      });
      const failedItems = created.items.filter((item) => item.status === ItemStatus.FAIL);
      for (const failedItem of failedItems) {
        const requestItem = parsed.data.items.find((item) => item.criterion === failedItem.criterion);
        const problem = requestItem?.defect;
        if (problem) {
          const createdDefect = await tx.defect.create({
            data: {
              inspectionId: created.id,
              inspectionItemId: failedItem.id,
              extinguisherId: extinguisher.id,
              description: problem.description,
              severity: problem.severity,
              assigneeId: problem.assigneeId || null,
              dueAt: problem.dueAt || null,
              createdById: auth.user!.id,
            },
            select: { id: true },
          });
          const image = images.get(failedItem.criterion);
          if (image) await tx.defectImage.create({ data: { defectId: createdDefect.id, ...image } });
        }
      }
      return created;
    });
    return NextResponse.json({ data: { id: inspection.id, status: inspection.status } }, { status: 201 });
  } catch {
    return serverError();
  }
}
