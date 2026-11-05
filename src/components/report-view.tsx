"use client";

import { useEffect, useState } from "react";
import { Badge, EmptyState, PageTitle } from "@/components/ui";
import { formatThaiDate, thaiDateInput } from "@/lib/format";

type Inspection = { id: string; status: "PASS" | "FAIL"; inspectedAt: string; extinguisher: { code: string; location: { name: string; building: string } }; inspector: { name: string } };
type Option = { id: string; name: string; building?: string };
type Report = { inspections: Inspection[]; totals: { pass: number; fail: number; openDefects: number }; inspectors: Option[]; locations: Option[] };
export function ReportView() {
  const [from, setFrom] = useState(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric", month: "numeric" }).formatToParts(now);
    return `${parts.find((part) => part.type === "year")?.value}-${String(Number(parts.find((part) => part.type === "month")?.value)).padStart(2, "0")}-01`;
  });
  const [to, setTo] = useState(() => thaiDateInput());
  const [status, setStatus] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ from, to });
      if (status) params.set("status", status);
      if (inspectorId) params.set("inspectorId", inspectorId);
      if (locationId) params.set("locationId", locationId);
      const response = await fetch(`/api/reports?${params}`);
      const json = await response.json() as { data?: Report; error?: { message?: string } };
      if (!response.ok || !json.data) throw new Error(json.error?.message ?? "โหลดรายงานไม่สำเร็จ");
      setReport(json.data);
    } catch (e) { setError(e instanceof Error ? e.message : "โหลดรายงานไม่สำเร็จ"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ from, to });
    fetch(`/api/reports?${params}`).then(async (response) => {
      const json = await response.json() as { data?: Report; error?: { message?: string } };
      if (!response.ok || !json.data) throw new Error(json.error?.message ?? "โหลดรายงานไม่สำเร็จ");
      if (active) setReport(json.data);
    }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "โหลดรายงานไม่สำเร็จ"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, to]);
  return <>
    <div className="print:hidden"><PageTitle title="รายงานผลตรวจ" description="สรุปผลตามช่วงวันที่และตัวกรอง สามารถพิมพ์จากเบราว์เซอร์" action={<button className="button-secondary" onClick={() => window.print()}>พิมพ์รายงาน</button>} /></div>
    <div className="panel mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5 print:hidden"><div><label className="label" htmlFor="report-from">ตั้งแต่วันที่</label><input id="report-from" className="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div><label className="label" htmlFor="report-to">ถึงวันที่</label><input id="report-to" className="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div><div><label className="label" htmlFor="report-status">ผลตรวจ</label><select id="report-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">ทั้งหมด</option><option value="PASS">ผ่าน</option><option value="FAIL">ไม่ผ่าน</option></select></div><div><label className="label" htmlFor="report-inspector">ผู้ตรวจ</label><select id="report-inspector" className="field" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}><option value="">ทุกคน</option>{report?.inspectors.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div><div><label className="label" htmlFor="report-location">ตำแหน่ง</label><select id="report-location" className="field" value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">ทุกตำแหน่ง</option>{report?.locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name} · {loc.building}</option>)}</select></div><button className="button-primary sm:col-span-2 xl:col-span-5" onClick={() => void load()}>แสดงรายงาน</button></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading && !report ? <div className="panel py-10 text-center text-slate-500">กำลังสร้างรายงาน…</div> : report && <div className="space-y-5"><div className="hidden print:block"><h1 className="text-2xl font-bold">รายงานผลตรวจถังดับเพลิง</h1><p>ช่วงวันที่ {from} ถึง {to}</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="panel"><p className="text-sm text-slate-500">ผลตรวจผ่าน</p><p className="mt-2 text-3xl font-bold text-emerald-700">{report.totals.pass}</p></div><div className="panel"><p className="text-sm text-slate-500">ผลตรวจไม่ผ่าน</p><p className="mt-2 text-3xl font-bold text-red-700">{report.totals.fail}</p></div><div className="panel"><p className="text-sm text-slate-500">งานแก้ไขที่ยังเปิด</p><p className="mt-2 text-3xl font-bold text-amber-700">{report.totals.openDefects}</p></div></div>{report.inspections.length ? <div className="table-wrap bg-white"><table className="table"><thead><tr><th>วันเวลาตรวจ</th><th>ถัง</th><th>ตำแหน่ง</th><th>ผู้ตรวจ</th><th>ผลตรวจ</th></tr></thead><tbody>{report.inspections.map((row) => <tr key={row.id}><td data-label="วันเวลาตรวจ">{formatThaiDate(row.inspectedAt)}</td><td data-label="ถัง">{row.extinguisher.code}</td><td data-label="ตำแหน่ง">{row.extinguisher.location.name} · {row.extinguisher.location.building}</td><td data-label="ผู้ตรวจ">{row.inspector.name}</td><td data-label="ผลตรวจ"><Badge value={row.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="ไม่มีข้อมูลในช่วงที่เลือก" description="ปรับช่วงวันที่หรือตัวกรองแล้วลองอีกครั้ง" />}</div>}
    <style jsx global>{`@media print { body { background: white !important; } aside, header, button, .print\\:hidden { display: none !important; } main, main > div { max-width: none !important; padding: 0 !important; } .panel, .table-wrap { box-shadow: none !important; break-inside: avoid; } }`}</style>
  </>;
}
