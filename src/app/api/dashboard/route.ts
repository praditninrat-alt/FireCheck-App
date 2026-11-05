import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { monthBounds } from "@/lib/format";
import { OPEN_DEFECT_STATUSES } from "@/lib/constants";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const { start, end } = monthBounds();
    const activeExtinguishers = await db.extinguisher.findMany({ where: { active: true }, select: { id: true } });
    const monthInspections = await db.inspection.findMany({
      where: { inspectedAt: { gte: start, lt: end }, extinguisher: { active: true } },
      select: { extinguisherId: true },
      distinct: ["extinguisherId"],
    });
    const inspectedIds = new Set(monthInspections.map((record) => record.extinguisherId));
    const [inspectionFailures, openDefects, recentInspections, dueDefects] = await Promise.all([
      db.inspection.count({ where: { inspectedAt: { gte: start, lt: end }, status: "FAIL" } }),
      db.defect.count({ where: { status: { in: [...OPEN_DEFECT_STATUSES] } } }),
      db.inspection.findMany({
        take: 6,
        orderBy: { inspectedAt: "desc" },
        include: { extinguisher: { include: { location: true } }, inspector: { select: { name: true } } },
      }),
      db.defect.findMany({
        where: { status: { in: [...OPEN_DEFECT_STATUSES] }, dueAt: { lte: new Date(Date.now() + 7 * 86400000) } },
        take: 6,
        orderBy: { dueAt: "asc" },
        include: { extinguisher: { include: { location: true } }, assignee: { select: { name: true } } },
      }),
    ]);
    return NextResponse.json({
      data: {
        totals: {
          activeExtinguishers: activeExtinguishers.length,
          inspectedThisMonth: inspectedIds.size,
          notInspectedThisMonth: Math.max(0, activeExtinguishers.length - inspectedIds.size),
          inspectionsWithDefects: inspectionFailures,
          openDefects,
        },
        recentInspections,
        dueDefects,
        overdueDefects: dueDefects.filter((defect) => defect.dueAt && defect.dueAt < new Date()),
        role: auth.user.role,
      },
    });
  } catch {
    return serverError();
  }
}
