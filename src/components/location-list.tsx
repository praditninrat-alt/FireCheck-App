"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState, PageTitle } from "@/components/ui";

type Location = { id: string; name: string; building: string; floor: string | null; department: string | null; details: string | null; active: boolean; _count: { extinguishers: number } };
const blank = { name: "", building: "", floor: "", department: "", details: "" };
export function LocationList({ canManage }: { canManage: boolean }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/locations");
    const json = await response.json() as { data?: Location[] };
    if (!response.ok) { setError("โหลดตำแหน่งไม่สำเร็จ"); return; }
    setLocations(json.data ?? []);
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/locations").then(async (response) => {
      const json = await response.json() as { data?: Location[] };
      if (!response.ok) throw new Error("โหลดตำแหน่งไม่สำเร็จ");
      if (active) setLocations(json.data ?? []);
    }).catch(() => { if (active) setError("โหลดตำแหน่งไม่สำเร็จ"); });
    return () => { active = false; };
  }, []);
  function edit(location: Location) {
    setEditing(location.id);
    setForm({ name: location.name, building: location.building, floor: location.floor ?? "", department: location.department ?? "", details: location.details ?? "" });
    setShow(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch(editing ? `/api/locations/${editing}` : "/api/locations", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setError(result.error?.message ?? "บันทึกตำแหน่งไม่สำเร็จ"); return; }
    setShow(false); setEditing(null); setForm(blank); await load();
  }
  async function deactivate(location: Location) {
    if (!window.confirm(`ปิดใช้งานตำแหน่ง “${location.name}” หรือไม่?`)) return;
    const response = await fetch(`/api/locations/${location.id}`, { method: "DELETE" });
    const result = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setError(result.error?.message ?? "ปิดใช้งานตำแหน่งไม่สำเร็จ"); return; }
    await load();
  }
  return <>
    <PageTitle title="ตำแหน่งติดตั้ง" description="จัดการอาคาร ชั้น และพื้นที่ติดตั้งถังดับเพลิง" action={canManage ? <button className="button-primary" onClick={() => { setEditing(null); setForm(blank); setShow(true); }}>＋ เพิ่มตำแหน่ง</button> : undefined} />
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {locations.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{locations.map((loc) => <section key={loc.id} className="panel"><div className="flex items-start justify-between"><div><h2 className="font-bold">{loc.name}</h2><p className="mt-1 text-sm text-slate-500">{loc.building}{loc.floor ? ` · ชั้น ${loc.floor}` : ""}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{loc._count.extinguishers} ถัง</span></div>{loc.department && <p className="mt-3 text-sm text-slate-600">{loc.department}</p>}{loc.details && <p className="mt-2 text-sm text-slate-500">{loc.details}</p>}{canManage && <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3"><button className="text-sm font-semibold text-brand-700" onClick={() => edit(loc)}>แก้ไข</button>{loc.active && <button className="text-sm text-slate-600" onClick={() => void deactivate(loc)}>ปิดใช้งาน</button>}</div>}</section>)}</div> : <EmptyState title="ยังไม่มีตำแหน่งติดตั้ง" description="เพิ่มตำแหน่งเพื่อระบุจุดติดตั้งถังดับเพลิง" />}
    {show && <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={save} className="dialog-content w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="mb-5 text-xl font-bold">{editing ? "แก้ไขตำแหน่ง" : "เพิ่มตำแหน่ง"}</h2><div className="space-y-4">{([["name", "ชื่อสถานที่ *"], ["building", "อาคาร *"], ["floor", "ชั้น"], ["department", "พื้นที่ / แผนก"]] as [keyof typeof form, string][]).map(([key, label]) => <div key={key}><label className="label" htmlFor={`loc-${key}`}>{label}</label><input required={label.endsWith("*")} id={`loc-${key}`} className="field" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></div>)}<div><label className="label" htmlFor="loc-details">รายละเอียดเพิ่มเติม</label><textarea id="loc-details" className="field min-h-20" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div></div><div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" className="button-secondary" onClick={() => setShow(false)}>ยกเลิก</button><button className="button-primary">บันทึก</button></div></form></div>}
  </>;
}
