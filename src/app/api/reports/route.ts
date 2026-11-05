import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser, serverError, apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { reportQuerySchema } from "@/lib/validation";
import { getDisplayedInspectionStatus } from "@/lib/inspection-logic";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const parsedQuery = reportQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsedQuery.success) return apiError("ตัวกรองรายงานไม่ถูกต้อง", 422, "VALIDATION_ERROR");
    const { from: fromValue, to: toValue, status, inspectorId, locationId } = parsedQuery.data;
    const from = fromValue ? new Date(`${fromValue}T00:00:00+07:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = toValue ? new Date(`${toValue}T23:59:59.999+07:00`) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return apiError("ช่วงวันที่ไม่ถูกต้อง", 422, "INVALID_DATE_RANGE");
    const inspections = await db.inspection.findMany({
      where: {
        inspectedAt: { gte: from, lte: to },
        ...(inspectorId ? { inspectorId } : {}),
        ...(locationId ? { extinguisher: { locationId } } : {}),
      },
      include: {
        extinguisher: { include: { location: true } },
        inspector: { select: { name: true } },
        items: { select: { id: true, status: true } },
        defects: { select: { inspectionItemId: true, status: true } },
      },
      orderBy: { inspectedAt: "desc" },
    });
    const displayedInspections = inspections
      .map((inspection) => ({ ...inspection, status: getDisplayedInspectionStatus(inspection) }))
      .filter((inspection) => !status || inspection.status === status);
    const openDefects = await db.defect.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        ...(locationId ? { extinguisher: { locationId } } : {}),
      },
    });
    const inspectors = await db.user.findMany({ where: { active: true, role: { in: [Role.ADMIN, Role.INSPECTOR] } }, select: { id: true, name: true } });
    const locations = await db.location.findMany({ where: { active: true }, select: { id: true, name: true, building: true } });
    return NextResponse.json({
      data: {
        inspections: displayedInspections,
        totals: {
          pass: displayedInspections.filter((inspection) => inspection.status === "PASS").length,
          fail: displayedInspections.filter((inspection) => inspection.status === "FAIL").length,
          openDefects,
        },
        inspectors,
        locations,
      },
    });
  } catch {
    return serverError();
  }
}
