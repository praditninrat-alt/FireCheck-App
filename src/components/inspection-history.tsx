"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, EmptyState, PageTitle } from "@/components/ui";
import { formatThaiDate, thaiDateInput } from "@/lib/format";

type Inspection = { id: string; inspectedAt: string; status: string; inspector: { id: string; name: string }; extinguisher: { code: string; location: { id: string; name: string; building: string } } };
export function InspectionHistory() {
  const [items, setItems] = useState<Inspection[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [inspector, setInspector] = useState("");
  const [location, setLocation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetch("/api/inspections").then(async (r) => { const data = await r.json() as { data?: Inspection[] }; if (!r.ok) throw new Error("โหลดประวัติไม่สำเร็จ"); setItems(data.data ?? []); }).catch(() => setError("โหลดประวัติไม่สำเร็จ")).finally(() => setLoading(false)); }, []);
  const inspectors = useMemo(() => [...new Map(items.map((item) => [item.inspector.id, item.inspector])).values()], [items]);
  const locations = useMemo(() => [...new Map(items.map((item) => [item.extinguisher.location.id, item.extinguisher.location])).values()], [items]);
  const filtered = items.filter((item) => (!query || `${item.extinguisher.code} ${item.inspector.name} ${item.extinguisher.location.name} ${item.extinguisher.location.building}`.toLowerCase().includes(query.toLowerCase())) && (!status || item.status === status) && (!inspector || item.inspector.id === inspector) && (!location || item.extinguisher.location.id === location) && (!from || thaiDateInput(new Date(item.inspectedAt)) >= from) && (!to || thaiDateInput(new Date(item.inspectedAt)) <= to));
  return <><PageTitle title="ประวัติการตรวจ" description="ผลตรวจเรียงจากใหม่ไปเก่า และเก็บเป็นข้อมูลย้อนหลัง" />
    <div className="panel mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div><label className="label" htmlFor="history-search">ค้นหารหัสถัง / ผู้ตรวจ / สถานที่</label><input id="history-search" className="field" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div><label className="label" htmlFor="history-status">ผลตรวจ</label><select id="history-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">ทุกสถานะ</option><option value="PASS">ผ่าน</option><option value="FAIL">ไม่ผ่าน</option></select></div><div><label className="label" htmlFor="history-inspector">ผู้ตรวจ</label><select id="history-inspector" className="field" value={inspector} onChange={(e) => setInspector(e.target.value)}><option value="">ทุกคน</option>{inspectors.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div><div><label className="label" htmlFor="history-location">สถานที่</label><select id="history-location" className="field" value={location} onChange={(e) => setLocation(e.target.value)}><option value="">ทุกสถานที่</option>{locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name} · {loc.building}</option>)}</select></div><div><label className="label" htmlFor="history-from">ตั้งแต่วันที่</label><input id="history-from" className="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div><div><label className="label" htmlFor="history-to">ถึงวันที่</label><input id="history-to" className="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div></div>
    {error && <p role="alert" className="panel text-red-700">{error}</p>}{loading ? <div className="panel py-10 text-center text-slate-500">กำลังโหลดประวัติ…</div> : filtered.length ? <div className="table-wrap bg-white"><table className="table"><thead><tr><th>วันเวลาตรวจ</th><th>รหัสถัง</th><th>ตำแหน่ง</th><th>ผู้ตรวจ</th><th>ผลตรวจ</th><th>รายละเอียด</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{formatThaiDate(item.inspectedAt)}</td><td className="font-semibold">{item.extinguisher.code}</td><td>{item.extinguisher.location.name}<p className="text-xs text-slate-500">{item.extinguisher.location.building}</p></td><td>{item.inspector.name}</td><td><Badge value={item.status} /></td><td><Link className="font-semibold text-brand-700 hover:underline" href={`/inspections/${item.id}`}>ดูผลตรวจ</Link></td></tr>)}</tbody></table></div> : <EmptyState title="ไม่พบประวัติการตรวจ" description="ลองปรับตัวกรองหรือเริ่มบันทึกผลตรวจใหม่" />}
  </>;
}
