import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge, PageTitle } from "@/components/ui";
import { db } from "@/lib/db";
import { formatThaiDate } from "@/lib/format";
import { getDisplayedInspectionStatus, getDisplayedItemStatus } from "@/lib/inspection-logic";

type Props = { params: Promise<{ id: string }> };
export default async function InspectionDetailPage({ params }: Props) {
  const { id } = await params;
  const inspection = await db.inspection.findUnique({
    where: { id },
    include: {
      extinguisher: { include: { location: true } },
      inspector: { select: { name: true } },
      items: true,
      defects: {
        include: {
          assignee: { select: { name: true } },
          image: { select: { id: true } },
          notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!inspection) notFound();
  return <>
    <PageTitle title={`ผลตรวจ ${inspection.extinguisher.code}`} description={`บันทึกเมื่อ ${formatThaiDate(inspection.inspectedAt)}`} action={<Link className="button-secondary" href="/inspections">กลับหน้าประวัติ</Link>} />
    <section className="panel mb-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-500">ถัง / ประเภท</p><p className="mt-1 font-semibold">{inspection.extinguisher.code} · {inspection.extinguisher.agentType}</p></div><div><p className="text-xs text-slate-500">ตำแหน่ง</p><p className="mt-1 font-semibold">{inspection.extinguisher.location.name} · {inspection.extinguisher.location.building}</p></div><div><p className="text-xs text-slate-500">ผู้ตรวจ / ผลรวม</p><p className="mt-2 flex items-center gap-2 font-semibold">{inspection.inspector.name}<Badge value={getDisplayedInspectionStatus(inspection)} /></p></div>{inspection.notes && <div className="sm:col-span-3"><p className="text-xs text-slate-500">หมายเหตุรวม</p><p className="mt-1">{inspection.notes}</p></div>}</section>
    <section className="space-y-3"><h2 className="text-lg font-bold">รายการตรวจ</h2>{inspection.items.map((item, index) => <article key={item.id} className="panel flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold">{index + 1}</span><div><h3 className="font-semibold">{item.criterion}</h3>{item.note && <p className="mt-1 text-sm text-slate-500">{item.note}</p>}</div></div><Badge value={getDisplayedItemStatus(item.status, inspection.defects.filter((defect) => defect.inspectionItemId === item.id))} /></article>)}</section>
    {inspection.defects.length > 0 && <section className="mt-6 space-y-3"><h2 className="text-lg font-bold">งานแก้ไขที่เปิดจากผลตรวจนี้</h2>{inspection.defects.map((defect) => <article key={defect.id} className="panel"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{defect.description}</p><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>ความเร่งด่วน:</span><Badge value={defect.severity} /></span><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>สถานะ:</span><Badge value={defect.status} /></span></div></div><div className="mt-3 space-y-1 text-sm text-slate-600"><p><span className="font-semibold text-slate-700">ผู้รับผิดชอบ:</span> {defect.assignee?.name ?? "ยังไม่มอบหมาย"}</p><p><span className="font-semibold text-slate-700">กำหนดส่ง:</span> {formatThaiDate(defect.dueAt)}</p></div>{defect.image && <Image unoptimized width={640} height={480} className="mt-4 max-h-80 rounded-xl border border-slate-200 object-contain" src={`/api/defects/${defect.id}/image`} alt="รูปประกอบงานแก้ไข" />}</article>)}</section>}
  </>;
}
