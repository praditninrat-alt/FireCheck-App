import Link from "next/link";
import { db } from "@/lib/db";
import { monthBounds, formatThaiDate, dueWindowEnd } from "@/lib/format";
import { OPEN_DEFECT_STATUSES } from "@/lib/constants";
import { Badge } from "@/components/ui";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const { start, end } = monthBounds();
  const active = await db.extinguisher.findMany({ where: { active: true }, select: { id: true } });
  const checked = await db.inspection.findMany({ where: { inspectedAt: { gte: start, lt: end }, extinguisher: { active: true } }, distinct: ["extinguisherId"], select: { extinguisherId: true } });
  const [failed, open, recent, due] = await Promise.all([
    db.inspection.count({ where: { inspectedAt: { gte: start, lt: end }, status: "FAIL" } }),
    db.defect.count({ where: { status: { in: [...OPEN_DEFECT_STATUSES] } } }),
    db.inspection.findMany({ take: 5, orderBy: { inspectedAt: "desc" }, include: { extinguisher: { include: { location: true } }, inspector: { select: { name: true } } } }),
    db.defect.findMany({ where: { status: { in: [...OPEN_DEFECT_STATUSES] }, dueAt: { lte: dueWindowEnd(7) } }, take: 5, orderBy: { dueAt: "asc" }, include: { extinguisher: true, assignee: { select: { name: true } } } }),
  ]);
  const checkedIds = new Set(checked.map((inspection) => inspection.extinguisherId));
  const stats = [
    { title: "ถังที่ใช้งาน", value: active.length, note: "รายการที่เปิดใช้งาน", color: "bg-blue-50 text-blue-700" },
    { title: "ตรวจแล้วเดือนนี้", value: checkedIds.size, note: "ถังไม่ซ้ำในเดือนปัจจุบัน", color: "bg-emerald-50 text-emerald-700" },
    { title: "ยังไม่ได้ตรวจ", value: Math.max(0, active.length - checkedIds.size), note: "จากถังที่ยังใช้งาน", color: "bg-amber-50 text-amber-800" },
    { title: "ผลตรวจพบข้อบกพร่อง", value: failed, note: "รายการตรวจในเดือนนี้", color: "bg-red-50 text-red-700" },
    { title: "งานแก้ไขที่ยังเปิด", value: open, note: "เปิดหรือกำลังดำเนินการ", color: "bg-violet-50 text-violet-700" },
  ];
  return <>
    <PageTitle title="ภาพรวม" description="สรุปสถานะข้อมูลตรวจถังดับเพลิงจากฐานข้อมูล" action={<Link className="button-primary" href="/inspections/new">＋ เริ่มตรวจถัง</Link>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{stats.map((stat) => <section key={stat.title} className="panel"><div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${stat.color}`}>{stat.title}</div><p className="mt-4 text-3xl font-bold">{stat.value}</p><p className="mt-1 text-xs text-slate-500">{stat.note}</p></section>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <section className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">ผลตรวจล่าสุด</h2><Link className="text-sm font-semibold text-brand-700" href="/inspections">ดูประวัติ</Link></div>
        {recent.length ? <div className="space-y-3">{recent.map((inspection) => <Link key={inspection.id} href={`/inspections/${inspection.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50"><div className="min-w-0"><p className="truncate font-semibold">{inspection.extinguisher.code} <span className="font-normal text-slate-500">· {inspection.extinguisher.location.name}</span></p><p className="mt-1 text-xs text-slate-500">{inspection.inspector.name} · {formatThaiDate(inspection.inspectedAt)}</p></div><Badge value={inspection.status} /></Link>)}</div> : <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีผลตรวจ</p>}
      </section>
      <section className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">งานใกล้ครบกำหนด / เกินกำหนด</h2><Link className="text-sm font-semibold text-brand-700" href="/defects">ดูงานทั้งหมด</Link></div>
        {due.length ? <div className="space-y-3">{due.map((defect) => <div key={defect.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="min-w-0"><p className="truncate font-semibold">{defect.extinguisher.code} · {defect.description}</p><p className="mt-1 text-xs text-slate-500">ครบกำหนด {formatThaiDate(defect.dueAt)} · {defect.assignee?.name ?? "ยังไม่มอบหมาย"}</p></div><Badge value={defect.severity} /></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">ไม่มีงานใกล้ครบกำหนด</p>}
      </section>
    </div>
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><b>หมายเหตุ:</b> รายการตรวจเป็นเครื่องมือช่วยบันทึกและติดตามงาน ไม่ใช่การรับรองความปลอดภัยหรือใช้แทนการตรวจโดยผู้เชี่ยวชาญ</div>
  </>;
}
