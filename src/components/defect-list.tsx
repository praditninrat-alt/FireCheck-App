"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Badge, EmptyState, PageTitle } from "@/components/ui";
import { formatThaiDate, thaiDateInput } from "@/lib/format";
import { DEFECT_IMAGE_MIME_TYPES, MAX_DEFECT_IMAGE_BYTES } from "@/lib/defect-image-constants";

type Defect = { id: string; description: string; severity: string; status: string; dueAt: string | null; closedAt: string | null; image: { id: string } | null; extinguisher: { code: string; location: { name: string; building: string } }; assignee: { id: string; name: string } | null; notes: { id: string; body: string; createdAt: string; author: { name: string } }[] };
type User = { id: string; name: string };
export function DefectList({ canManage }: { canManage: boolean }) {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [assignees, setAssignees] = useState<User[]>([]);
  const [filter, setFilter] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [d, u] = await Promise.all([fetch("/api/defects").then((r) => r.json()), fetch("/api/users?for=assignee").then((r) => r.json())]);
      setDefects(d.data ?? []); setAssignees(u.data ?? []);
    } catch { setError("โหลดงานแก้ไขไม่สำเร็จ"); }
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/defects").then((response) => response.json()), fetch("/api/users?for=assignee").then((response) => response.json())])
      .then(([defectResult, userResult]) => {
        if (active) { setDefects(defectResult.data ?? []); setAssignees(userResult.data ?? []); }
      })
      .catch(() => { if (active) setError("โหลดงานแก้ไขไม่สำเร็จ"); });
    return () => { active = false; };
  }, []);
  const visible = defects.filter((item) => (filter === "ALL" || item.status === filter || (filter === "OPEN" && item.status === "IN_PROGRESS")) && (!search || `${item.description} ${item.extinguisher.code} ${item.extinguisher.location.name}`.toLowerCase().includes(search.toLowerCase())));
  async function update(id: string, data: Record<string, string>) {
    setBusy(id); setError("");
    try {
      const response = await fetch("/api/defects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
      const json = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(json.error?.message || "อัปเดตงานไม่สำเร็จ");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "อัปเดตไม่สำเร็จ"); }
    finally { setBusy(""); }
  }
  async function uploadImage(id: string, file?: File) {
    if (!file) return;
    if (!(DEFECT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type) || file.size > MAX_DEFECT_IMAGE_BYTES) {
      setError("เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB");
      return;
    }
    setBusy(id); setError("");
    try {
      const formData = new FormData();
      formData.set("image", file);
      const response = await fetch(`/api/defects/${id}/image`, { method: "POST", body: formData });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "อัปโหลดรูปไม่สำเร็จ");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }
  return <>
    <PageTitle title="งานแก้ไขข้อบกพร่อง" description="ติดตามผู้รับผิดชอบ กำหนดส่ง และสถานะการแก้ไข" />
    <div className="panel mb-5 grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="defect-search">ค้นหาปัญหา / รหัสถัง / สถานที่</label><input id="defect-search" className="field" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div><label className="label" htmlFor="defect-filter">สถานะงาน</label><select id="defect-filter" className="field" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="OPEN">งานค้าง</option><option value="ALL">ทุกสถานะ</option><option value="IN_PROGRESS">กำลังดำเนินการ</option><option value="RESOLVED">แก้ไขแล้ว</option><option value="CANCELLED">ยกเลิก</option></select></div></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {visible.length ? <div className="space-y-4">{visible.map((defect) => <article key={defect.id} className="panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="text-sm font-bold text-brand-700">{defect.extinguisher.code} · {defect.extinguisher.location.name} ({defect.extinguisher.location.building})</p><p className="mt-2 leading-6">{defect.description}</p><div className="mt-3 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>ความเร่งด่วน:</span><Badge value={defect.severity} /></span><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span>สถานะ:</span><Badge value={defect.status} /></span></div></div>
        <div className="text-sm text-slate-600"><p><span className="font-semibold text-slate-700">ผู้รับผิดชอบ:</span> {defect.assignee?.name ?? "ยังไม่มอบหมาย"}</p><p className="mt-1"><span className="font-semibold text-slate-700">กำหนดส่ง:</span> {formatThaiDate(defect.dueAt)}</p>{defect.closedAt && <p className="mt-1">ปิดงาน {formatThaiDate(defect.closedAt)}</p>}</div>
      </div>
      {defect.image && <Image unoptimized width={640} height={480} className="mt-4 max-h-80 rounded-xl border border-slate-200 object-contain" src={`/api/defects/${defect.id}/image`} alt="รูปประกอบงานแก้ไข" />}
      {canManage && <div className="mt-4 border-t border-slate-100 pt-4">
        {!["RESOLVED", "CANCELLED"].includes(defect.status) && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div><label className="label" htmlFor={`assignee-${defect.id}`}>ผู้รับผิดชอบ</label><select id={`assignee-${defect.id}`} className="field" defaultValue={defect.assignee?.id ?? ""} onChange={(e) => void update(defect.id, { assigneeId: e.target.value })}><option value="">ยังไม่ระบุ</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
          <div><label className="label" htmlFor={`due-${defect.id}`}>กำหนดส่ง</label><input id={`due-${defect.id}`} className="field" type="date" value={defect.dueAt ? thaiDateInput(new Date(defect.dueAt)) : ""} onChange={(e) => void update(defect.id, { dueAt: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : "" })} /></div>
          <div><label className="label" htmlFor={`note-${defect.id}`}>หมายเหตุการแก้ไข</label><input id={`note-${defect.id}`} className="field" placeholder="เพิ่มบันทึกความคืบหน้า" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const input = e.currentTarget; if (input.value.trim()) { void update(defect.id, { note: input.value }); input.value = ""; } } }} /></div>
          <div className="flex items-end gap-2"><button type="button" disabled={busy === defect.id} className="button-secondary flex-1" onClick={() => void update(defect.id, { status: defect.status === "OPEN" ? "IN_PROGRESS" : "OPEN" })}>{defect.status === "OPEN" ? "เริ่มดำเนินการ" : "กลับเป็นงานเปิด"}</button><button type="button" disabled={busy === defect.id} className="button-primary flex-1" onClick={() => { if (window.confirm("ยืนยันว่าดำเนินการแก้ไขเสร็จแล้วหรือไม่?")) void update(defect.id, { status: "RESOLVED" }); }}>ปิดงาน</button></div>
        </div>}
        <div className="mt-3"><label className="label" htmlFor={`defect-image-${defect.id}`}>{defect.image ? "เปลี่ยนรูปประกอบ" : "เพิ่มรูปประกอบ (1 รูป, JPG/PNG/WebP ไม่เกิน 5 MB)"}</label><input id={`defect-image-${defect.id}`} className="field" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy === defect.id} onChange={(e) => { const input = e.currentTarget; void uploadImage(defect.id, input.files?.[0]).finally(() => { input.value = ""; }); }} /></div>
      </div>}
      {!!defect.notes.length && <details className="mt-4 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-sm font-semibold text-slate-600">ประวัติหมายเหตุ ({defect.notes.length})</summary><div className="mt-3 space-y-2">{defect.notes.map((note) => <p key={note.id} className="rounded-lg bg-slate-50 p-3 text-sm">{note.body}<span className="mt-1 block text-xs text-slate-500">{note.author.name} · {formatThaiDate(note.createdAt)}</span></p>)}</div></details>}
    </article>)}</div> : <EmptyState title="ไม่พบงานแก้ไข" description="งานที่เกิดจากผลตรวจไม่ผ่านจะแสดงอยู่ที่นี่" />}
  </>;
}
