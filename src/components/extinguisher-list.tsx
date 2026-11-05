"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle, Badge, EmptyState } from "@/components/ui";
import { formatThaiDate } from "@/lib/format";

type Location = { id: string; name: string; building: string; floor: string | null };
type Extinguisher = { id: string; code: string; agentType: string; capacity: string; brand: string | null; serialNumber: string | null; installedAt: string | null; nextMaintenanceAt: string | null; locationId: string; active: boolean; notes: string | null; location: Location; _count: { inspections: number } };
const emptyForm = { code: "", agentType: "", capacity: "", brand: "", serialNumber: "", installedAt: "", nextMaintenanceAt: "", locationId: "", notes: "" };

export function ExtinguisherList({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Extinguisher[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Extinguisher | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [extResponse, locResponse] = await Promise.all([fetch(`/api/extinguishers?q=${encodeURIComponent(query)}${canManage ? "&active=all" : ""}`), fetch("/api/locations")]);
      const extJson = await extResponse.json() as { data?: Extinguisher[]; error?: { message?: string } };
      const locJson = await locResponse.json() as { data?: Location[] };
      if (!extResponse.ok) throw new Error(extJson.error?.message || "โหลดข้อมูลไม่สำเร็จ");
      setItems(extJson.data ?? []);
      setLocations(locJson.data ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }, [query, canManage]);
  const visibleItems = items.filter((item) => statusFilter === "all" || (statusFilter === "active" ? item.active : !item.active));
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/extinguishers?q=${encodeURIComponent(query)}${canManage ? "&active=all" : ""}`).then(async (response) => {
        const json = await response.json() as { data?: Extinguisher[]; error?: { message?: string } };
        if (!response.ok) throw new Error(json.error?.message || "โหลดข้อมูลไม่สำเร็จ");
        return json.data ?? [];
      }),
      fetch("/api/locations").then(async (response) => {
        const json = await response.json() as { data?: Location[] };
        if (!response.ok) throw new Error("โหลดตำแหน่งไม่สำเร็จ");
        return json.data ?? [];
      }),
    ]).then(([extinguishersData, locationsData]) => {
      if (active) { setItems(extinguishersData); setLocations(locationsData); }
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, canManage]);
  function startEdit(item: Extinguisher) {
    setEditing(item);
    setForm({ code: item.code, agentType: item.agentType, capacity: item.capacity, brand: item.brand ?? "", serialNumber: item.serialNumber ?? "", installedAt: item.installedAt?.slice(0, 10) ?? "", nextMaintenanceAt: item.nextMaintenanceAt?.slice(0, 10) ?? "", locationId: item.locationId, notes: item.notes ?? "" });
    setShowForm(true);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    try {
      const response = await fetch(editing ? `/api/extinguishers/${editing.id}` : "/api/extinguishers", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(editing ? { active: editing.active } : {}), installedAt: form.installedAt ? new Date(`${form.installedAt}T00:00:00`).toISOString() : null, nextMaintenanceAt: form.nextMaintenanceAt ? new Date(`${form.nextMaintenanceAt}T00:00:00`).toISOString() : null }),
      });
      const json = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(json.error?.message || "บันทึกไม่สำเร็จ");
      setShowForm(false); setEditing(null); setForm(emptyForm); setSuccess("บันทึกข้อมูลถังแล้ว"); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"); }
  }
  async function toggleActive(item: Extinguisher) {
    if (!window.confirm(`${item.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}ถัง ${item.code} หรือไม่? ประวัติการตรวจจะยังคงอยู่`)) return;
    const response = await fetch(`/api/extinguishers/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !item.active }) });
    if (!response.ok) { setError("เปลี่ยนสถานะถังไม่สำเร็จ"); return; }
    await load();
  }
  return <>
    <PageTitle title="ถังดับเพลิง" description="ค้นหาและจัดการถัง พร้อมดูประวัติการตรวจแต่ละรายการ" action={canManage ? <button className="button-primary" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>＋ เพิ่มถัง</button> : undefined} />
    <div className="panel mb-5 grid gap-3 sm:grid-cols-[1fr_220px]"><div><label className="label" htmlFor="ext-search">ค้นหารหัสถัง ประเภท อาคาร ชั้น หรือสถานที่</label><input id="ext-search" className="field" placeholder="เช่น FC-001 หรือ อาคาร A" value={query} onChange={(e) => { setLoading(true); setQuery(e.target.value); }} /></div><div><label className="label" htmlFor="ext-status">สถานะใช้งาน</label><select id="ext-status" className="field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="active">ใช้งานอยู่</option>{canManage && <><option value="inactive">ปิดใช้งาน</option><option value="all">ทุกสถานะ</option></>}</select></div></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
    {loading ? <div className="panel animate-pulse py-10 text-center text-slate-500">กำลังโหลดข้อมูล…</div> : visibleItems.length ? <div className="table-wrap bg-white"><table className="table"><thead><tr><th>รหัสถัง</th><th>ประเภท / ขนาด</th><th>ตำแหน่ง</th><th>บำรุงรักษาครั้งถัดไป</th><th>สถานะ</th><th>ประวัติ</th>{canManage && <th>จัดการ</th>}</tr></thead><tbody>{visibleItems.map((item) => <tr key={item.id}><td data-label="รหัสถัง"><Link className="font-bold text-brand-700 hover:underline" href={`/extinguishers/${item.id}`}>{item.code}</Link><p className="mt-1 text-xs text-slate-500">{item.brand || "ไม่ระบุยี่ห้อ"}</p></td><td data-label="ประเภท / ขนาด">{item.agentType}<p className="mt-1 text-xs text-slate-500">{item.capacity}</p></td><td data-label="ตำแหน่ง">{item.location.name}<p className="mt-1 text-xs text-slate-500">{item.location.building}{item.location.floor ? ` · ชั้น ${item.location.floor}` : ""}</p></td><td data-label="บำรุงรักษาครั้งถัดไป">{formatThaiDate(item.nextMaintenanceAt)}</td><td data-label="สถานะ"><Badge value={item.active ? "เปิดใช้งาน" : "ปิดใช้งาน"} /></td><td data-label="ประวัติ">{item._count.inspections} ครั้ง</td>{canManage && <td data-label="จัดการ"><button className="text-sm font-semibold text-brand-700" onClick={() => startEdit(item)}>แก้ไข</button><button className="ml-3 text-sm text-slate-600" onClick={() => void toggleActive(item)}>{item.active ? "ปิดใช้" : "เปิดใช้"}</button></td>}</tr>)}</tbody></table></div> : <EmptyState title="ไม่พบข้อมูลถัง" description="ปรับคำค้นหาหรือตัวกรองสถานะ แล้วลองอีกครั้ง" />}
    {showForm && <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-labelledby="ext-form-title"><form onSubmit={submit} className="dialog-content w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-7"><div className="mb-5 flex justify-between"><div><h2 id="ext-form-title" className="text-xl font-bold">{editing ? "แก้ไขข้อมูลถัง" : "เพิ่มถังดับเพลิง"}</h2><p className="mt-1 text-sm text-slate-500">กรอกข้อมูลตามข้อมูลอุปกรณ์จริง</p></div><button type="button" aria-label="ปิด" className="h-10 w-10 rounded-lg hover:bg-slate-100" onClick={() => setShowForm(false)}>×</button></div>
      <div className="grid gap-4 sm:grid-cols-2">{([["code", "รหัสถัง *"], ["agentType", "ประเภทสารดับเพลิง *"], ["capacity", "ขนาด / ความจุ *"], ["brand", "ยี่ห้อ"], ["serialNumber", "หมายเลขเครื่อง"], ["installedAt", "วันที่ติดตั้ง"], ["nextMaintenanceAt", "กำหนดบำรุงรักษาครั้งถัดไป"]] as [keyof typeof form, string][]).map(([key, title]) => <div key={key}><label className="label" htmlFor={key}>{title}</label><input id={key} className="field" type={key.endsWith("At") ? "date" : "text"} required={title.endsWith("*")} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}
      <div><label className="label" htmlFor="locationId">ตำแหน่งติดตั้ง *</label><select className="field" id="locationId" required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}><option value="">เลือกตำแหน่ง</option>{locations.filter((loc) => loc.id === editing?.locationId || !("active" in loc) || loc.active).map((location) => <option key={location.id} value={location.id}>{location.name} · {location.building}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="notes">หมายเหตุ</label><textarea className="field min-h-20" id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div></div>
      {editing && <label className="mt-4 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />ใช้งานอยู่</label>}
      <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" className="button-secondary" onClick={() => setShowForm(false)}>ยกเลิก</button><button className="button-primary">บันทึกข้อมูล</button></div></form></div>}
  </>;
}
