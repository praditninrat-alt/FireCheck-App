import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageTitle } from "@/components/ui";
import { db } from "@/lib/db";
import { formatThaiDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/auth";

type Props = { params: Promise<{ id: string }> };
export default async function ExtinguisherDetailPage({ params }: Props) {
  const { id } = await params;
  const [item, user] = await Promise.all([
    db.extinguisher.findUnique({
    where: { id },
    include: {
      location: true,
      inspections: { include: { inspector: { select: { name: true } }, items: true }, orderBy: { inspectedAt: "desc" }, take: 100 },
      defects: { orderBy: { createdAt: "desc" } },
    },
    }),
    getCurrentUser(),
  ]);
  if (!item) notFound();
  return <>
    <PageTitle title={`ถัง ${item.code}`} description="ข้อมูลอุปกรณ์และประวัติการตรวจย้อนหลัง" action={user?.role !== "MAINTENANCE" ? <Link className="button-primary" href={`/inspections/new?extinguisherId=${item.id}`}>＋ ตรวจถังนี้</Link> : undefined} />
    {!item.active && <p className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">ถังนี้ปิดใช้งานแล้ว ประวัติยังคงอยู่</p>}
    <section className="panel mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
      ["รหัสถัง", item.code], ["ประเภทสารดับเพลิง", item.agentType], ["ขนาด / ความจุ", item.capacity], ["ยี่ห้อ", item.brand || "—"], ["หมายเลขเครื่อง", item.serialNumber || "—"], ["วันที่ติดตั้ง", formatThaiDate(item.installedAt)], ["กำหนดบำรุงรักษาครั้งถัดไป", formatThaiDate(item.nextMaintenanceAt)], ["ตำแหน่ง", `${item.location.name} · ${item.location.building}`], ["ชั้น / พื้นที่", [item.location.floor, item.location.department].filter(Boolean).join(" · ") || "—"], ["สถานะ", item.active ? "ใช้งาน" : "ปิดใช้งาน"],
    ].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}{item.notes && <div className="sm:col-span-2 lg:col-span-3"><p className="text-xs text-slate-500">หมายเหตุ</p><p className="mt-1">{item.notes}</p></div>}</section>
    <section className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">ประวัติการตรวจ ({item.inspections.length})</h2><Link className="text-sm font-semibold text-brand-700" href="/inspections">ประวัติทั้งหมด</Link></div>{item.inspections.length ? <div className="table-wrap"><table className="table"><thead><tr><th>วันที่ตรวจ</th><th>ผู้ตรวจ</th><th>ผล</th><th>รายละเอียด</th></tr></thead><tbody>{item.inspections.map((inspection) => <tr key={inspection.id}><td data-label="วันที่ตรวจ">{formatThaiDate(inspection.inspectedAt)}</td><td data-label="ผู้ตรวจ">{inspection.inspector.name}</td><td data-label="ผล"><Badge value={inspection.status} /></td><td data-label="รายละเอียด"><Link className="font-semibold text-brand-700" href={`/inspections/${inspection.id}`}>ดูผล</Link></td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีประวัติการตรวจ</p>}</section>
    {item.defects.length > 0 && <section className="panel mt-5"><h2 className="mb-4 text-lg font-bold">ข้อบกพร่อง ({item.defects.length})</h2><div className="space-y-3">{item.defects.map((defect) => <div key={defect.id} className="flex justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><span>{defect.description}</span><Badge value={defect.status} /></div>)}</div></section>}
  </>;
}
