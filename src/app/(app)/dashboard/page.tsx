import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { monthBounds, formatThaiDate, dueWindowEnd } from "@/lib/format";
import { OPEN_DEFECT_STATUSES } from "@/lib/constants";
import { Badge } from "@/components/ui";
import { PageTitle } from "@/components/ui";
import { getDisplayedInspectionStatus } from "@/lib/inspection-logic";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const { start, end } = monthBounds();
  const active = await db.extinguisher.findMany({ where: { active: true }, select: { id: true } });
  const checked = await db.inspection.findMany({ where: { inspectedAt: { gte: start, lt: end }, extinguisher: { active: true } }, distinct: ["extinguisherId"], select: { extinguisherId: true } });
  const [failedInspections, open, recent, due] = await Promise.all([
    db.inspection.findMany({
      where: { inspectedAt: { gte: start, lt: end }, status: "FAIL" },
      select: { status: true, items: { select: { id: true, status: true } }, defects: { select: { inspectionItemId: true, status: true } } },
    }),
    db.defect.count({ where: { status: { in: [...OPEN_DEFECT_STATUSES] } } }),
    db.inspection.findMany({ take: 5, orderBy: { inspectedAt: "desc" }, include: { extinguisher: { include: { location: true } }, inspector: { select: { name: true } }, items: true, defects: { select: { inspectionItemId: true, status: true } } } }),
    db.defect.findMany({ where: { status: { in: [...OPEN_DEFECT_STATUSES] }, dueAt: { lte: dueWindowEnd(7) } }, take: 5, orderBy: { dueAt: "asc" }, include: { extinguisher: true, assignee: { select: { name: true } } } }),
  ]);
  const failed = failedInspections.filter((inspection) => getDisplayedInspectionStatus(inspection) === "FAIL").length;
  const checkedIds = new Set(checked.map((inspection) => inspection.extinguisherId));
  const stats = [
    { title: "ถังที่ใช้งาน", value: active.length, note: "รายการที่เปิดใช้งาน", color: "bg-blue-50 text-blue-700" },
    { title: "ตรวจแล้วเดือนนี้", value: checkedIds.size, note: "ถังไม่ซ้ำในเดือนปัจจุบัน", color: "bg-emerald-50 text-emerald-700" },
    { title: "ยังไม่ได้ตรวจ", value: Math.max(0, active.length - checkedIds.size), note: "จากถังที่ยังใช้งาน", color: "bg-amber-50 text-amber-800" },
    { title: "ผลตรวจพบข้อบกพร่อง", value: failed, note: "รายการตรวจในเดือนนี้", color: "bg-red-50 text-red-700" },
    { title: "งานแก้ไขที่ยังเปิด", value: open, note: "เปิดหรือกำลังดำเนินการ", color: "bg-violet-50 text-violet-700" },
  ];
  return <>
    <PageTitle title="ภาพรวม" description="สรุปสถานะข้อมูลตรวจถังดับเพลิงจากฐานข้อมูล" action={user?.role !== "MAINTENANCE" ? <Link className="button-primary" href="/inspections/new">＋ เริ่มตรวจถัง</Link> : undefined} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{stats.map((stat) => <section key={stat.title} className="panel"><div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${stat.color}`}>{stat.title}</div><p className="mt-4 text-3xl font-bold">{stat.value}</p><p className="mt-1 text-xs text-slate-500">{stat.note}</p></section>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <section className="panel min-w-0"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="min-w-0 font-bold">ผลตรวจล่าสุด</h2><Link className="shrink-0 text-sm font-semibold text-brand-700" href="/inspections">ดูประวัติ</Link></div>
        {recent.length ? <div className="space-y-3">{recent.map((inspection) => <Link key={inspection.id} href={`/inspections/${inspection.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"><div className="min-w-0"><p className="truncate font-semibold">{inspection.extinguisher.code} <span className="font-normal text-slate-500">· {inspection.extinguisher.location.name}</span></p><p className="mt-1 text-xs text-slate-500">{inspection.inspector.name} · {formatThaiDate(inspection.inspectedAt)}</p></div><Badge value={getDisplayedInspectionStatus(inspection)} /></Link>)}</div> : <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีผลตรวจ</p>}
      </section>
      <section className="panel min-w-0"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="min-w-0 break-words font-bold">งานใกล้ครบกำหนด / เกินกำหนด</h2><Link className="shrink-0 text-sm font-semibold text-brand-700" href="/defects">ดูงานทั้งหมด</Link></div>
        {due.length ? <div className="space-y-3">{due.map((defect) => <div key={defect.id} className="rounded-xl border border-slate-100 p-3"><div className="flex min-w-0 items-start justify-between gap-3"><p className="min-w-0 font-semibold">{defect.extinguisher.code} · {defect.description}</p><div className="flex shrink-0 flex-col items-start gap-1.5 text-xs font-semibold text-slate-600"><span className="inline-flex flex-wrap items-center gap-1">ความเร่งด่วน: <Badge value={defect.severity} /></span><span className="inline-flex flex-wrap items-center gap-1">สถานะ: <Badge value={defect.status} /></span></div></div><p className="mt-2 text-xs text-slate-500">ครบกำหนด {formatThaiDate(defect.dueAt)} · ผู้รับผิดชอบ: {defect.assignee?.name ?? "ยังไม่มอบหมาย"}</p></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">ไม่มีงานใกล้ครบกำหนด</p>}
      </section>
    </div>
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>หมายเหตุ:</b> รายการตรวจเป็นเครื่องมือช่วยบันทึกและติดตามงาน ไม่ใช่การรับรองความปลอดภัยหรือใช้แทนการตรวจโดยผู้เชี่ยวชาญ</div>
  </>;
}
