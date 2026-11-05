"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CHECKLIST, SEVERITIES } from "@/lib/constants";
import { DEFECT_IMAGE_MIME_TYPES, MAX_DEFECT_IMAGE_BYTES } from "@/lib/defect-image-constants";
import { PageTitle } from "@/components/ui";

type Extinguisher = { id: string; code: string; agentType: string; location: { name: string; building: string } };
type Assignee = { id: string; name: string; role: string };
type FormItem = { status: "PASS" | "FAIL" | "NA"; note: string; createDefect: boolean; description: string; severity: string; assigneeId: string; dueAt: string; imageDataUrl: string };
const initialItems = (): FormItem[] => CHECKLIST.map(() => ({ status: "PASS", note: "", createDefect: false, description: "", severity: "MEDIUM", assigneeId: "", dueAt: "", imageDataUrl: "" }));

function readImageFile(file: File): Promise<string> {
  if (!(DEFECT_IMAGE_MIME_TYPES as readonly string[]).includes(file.type) || file.size > MAX_DEFECT_IMAGE_BYTES) {
    return Promise.reject(new Error("เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB"));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("อ่านไฟล์รูปภาพไม่สำเร็จ"));
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปภาพไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

export function InspectionForm({ initialExtinguisherId = "" }: { initialExtinguisherId?: string }) {
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [extinguisherId, setExtinguisherId] = useState("");
  const [items, setItems] = useState<FormItem[]>(initialItems);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void Promise.all([fetch("/api/extinguishers").then((r) => r.json()), fetch("/api/users?for=assignee").then((r) => r.json())]).then(([ext, users]) => {
      setExtinguishers(ext.data ?? []); setAssignees(users.data ?? []);
      if (initialExtinguisherId && (ext.data ?? []).some((item: Extinguisher) => item.id === initialExtinguisherId)) setExtinguisherId(initialExtinguisherId);
    }).catch(() => setError("โหลดรายการถังหรือผู้รับผิดชอบไม่สำเร็จ"));
  }, [initialExtinguisherId]);
  function update(index: number, patch: Partial<FormItem>) {
    setItems((current) => current.map((item, i) => {
      if (i !== index) return item;
      const next = { ...item, ...patch };
      if (patch.status === "FAIL" && !item.createDefect) { next.createDefect = true; next.description = item.note || CHECKLIST[index]; }
      if (patch.status && patch.status !== "FAIL") next.createDefect = false;
      return next;
    }));
  }
  async function setImage(index: number, file?: File) {
    if (!file) { update(index, { imageDataUrl: "" }); return; }
    try {
      update(index, { imageDataUrl: await readImageFile(file) });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "อ่านไฟล์รูปภาพไม่สำเร็จ");
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const failed = items.filter((item) => item.status === "FAIL");
    if (!extinguisherId) { setError("กรุณาเลือกถังที่ต้องการตรวจ"); return; }
    if (failed.length && !window.confirm(`พบรายการไม่ผ่าน ${failed.length} ข้อ ต้องการบันทึกผลตรวจ${items.some((item) => item.status === "FAIL" && item.createDefect) ? " และเปิดงานแก้ไขตามที่เลือก" : ""}หรือไม่?`)) return;
    if (failed.some((item) => !item.note.trim() && (!item.createDefect || !item.description.trim()))) { setError("กรุณาระบุหมายเหตุหรือรายละเอียดข้อบกพร่องในทุกรายการที่ไม่ผ่าน"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/inspections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extinguisherId, notes,
          items: items.map((item, index) => ({
            criterion: CHECKLIST[index], status: item.status, note: item.note || null,
            ...(item.status === "FAIL" && item.createDefect ? { defect: { description: item.description, severity: item.severity, assigneeId: item.assigneeId || null, dueAt: item.dueAt ? new Date(`${item.dueAt}T00:00:00`).toISOString() : null, ...(item.imageDataUrl ? { imageDataUrl: item.imageDataUrl } : {}) } } : {}),
          })),
        }),
      });
      const json = await response.json() as { data?: { id: string }; error?: { message?: string } };
      if (!response.ok || !json.data) throw new Error(json.error?.message || "บันทึกผลตรวจไม่สำเร็จ");
      setSavedId(json.data.id);
    } catch (e) { setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  }
  if (savedId) return <div className="panel mx-auto max-w-2xl py-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h1 className="mt-4 text-2xl font-bold">บันทึกผลตรวจสำเร็จ</h1><p className="mt-2 text-sm text-slate-500">ผลตรวจและรายการตรวจย่อยถูกบันทึกเป็นประวัติแล้ว</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link className="button-primary" href={`/inspections/${savedId}`}>ดูรายละเอียดผลตรวจ</Link><Link className="button-secondary" href="/inspections">ดูประวัติทั้งหมด</Link></div></div>;
  return <>
    <PageTitle title="ตรวจถังดับเพลิง" description="เลือกถังและบันทึกรายการตรวจตามข้อกำหนดของบริษัท" />
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <form onSubmit={submit} className="space-y-5">
      <section className="panel grid gap-4 sm:grid-cols-2"><div><label className="label" htmlFor="extinguisher">ถังดับเพลิง *</label><select required className="field" id="extinguisher" value={extinguisherId} onChange={(e) => setExtinguisherId(e.target.value)}><option value="">เลือกถัง</option>{extinguishers.map((ext) => <option key={ext.id} value={ext.id}>{ext.code} · {ext.agentType} · {ext.location.name}</option>)}</select></div><div><span className="label">วันที่ตรวจ</span><p className="field flex items-center bg-slate-50 text-slate-600">ใช้วันและเวลาปัจจุบันเมื่อบันทึกผล</p></div><div className="sm:col-span-2"><label className="label" htmlFor="inspection-notes">หมายเหตุรวม</label><textarea id="inspection-notes" className="field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ระบุข้อมูลเพิ่มเติม (ถ้ามี)" /></div></section>
      <section className="space-y-3">
        <h2 className="px-1 text-lg font-bold">รายการตรวจ</h2>
        {CHECKLIST.map((criterion, index) => (
          <article key={criterion} className={`panel ${items[index].status === "FAIL" ? "border-red-200" : ""}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">{index + 1}</span>
                <div>
                  <h3 className="font-semibold leading-6">{criterion}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {([["PASS", "ผ่าน"], ["FAIL", "ไม่ผ่าน"], ["NA", "ไม่เกี่ยวข้อง"]] as const).map(([status, title]) => (
                      <label key={status} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${items[index].status === status ? status === "FAIL" ? "border-red-300 bg-red-50 text-red-700" : status === "PASS" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100" : "border-slate-200"}`}>
                        <input className="accent-brand-600" type="radio" name={`status-${index}`} checked={items[index].status === status} onChange={() => update(index, { status })} />{title}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-full sm:max-w-xs">
                <label className="label" htmlFor={`item-note-${index}`}>หมายเหตุรายการ</label>
                <input id={`item-note-${index}`} className="field" value={items[index].note} onChange={(e) => update(index, { note: e.target.value, ...(items[index].status === "FAIL" && items[index].createDefect && !items[index].description ? { description: e.target.value } : {}) })} placeholder="ระบุเพิ่มเติม (ถ้ามี)" />
              </div>
            </div>
            {items[index].status === "FAIL" && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50/60 p-4">
                <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-red-800">
                  <input type="checkbox" checked={items[index].createDefect} onChange={(e) => update(index, { createDefect: e.target.checked, description: e.target.checked && !items[index].description ? items[index].note || criterion : items[index].description })} />สร้างงานแก้ไขจากข้อนี้
                </label>
                {items[index].createDefect && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`defect-description-${index}`}>รายละเอียดปัญหา *</label>
                      <textarea required className="field min-h-20" id={`defect-description-${index}`} value={items[index].description} onChange={(e) => update(index, { description: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`severity-${index}`}>ความเร่งด่วน</label>
                      <select className="field" id={`severity-${index}`} value={items[index].severity} onChange={(e) => update(index, { severity: e.target.value })}>{SEVERITIES.map((level) => <option key={level} value={level}>{{ LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง", CRITICAL: "วิกฤต" }[level]}</option>)}</select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`assignee-${index}`}>ผู้รับผิดชอบ</label>
                      <select className="field" id={`assignee-${index}`} value={items[index].assigneeId} onChange={(e) => update(index, { assigneeId: e.target.value })}><option value="">ยังไม่ระบุ</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role === "MAINTENANCE" ? "ช่าง/ผู้ดูแลงาน" : person.role === "INSPECTOR" ? "ผู้ตรวจ" : "ผู้ดูแลระบบ"}</option>)}</select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`due-${index}`}>วันครบกำหนด</label>
                      <input className="field" id={`due-${index}`} type="date" value={items[index].dueAt} onChange={(e) => update(index, { dueAt: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label" htmlFor={`defect-image-${index}`}>รูปภาพประกอบ (1 รูป, JPG/PNG/WebP ไม่เกิน 5 MB)</label>
                      <input className="field" id={`defect-image-${index}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void setImage(index, e.target.files?.[0])} />
                      {items[index].imageDataUrl && <div className="mt-3 flex items-start gap-3"><Image unoptimized width={320} height={240} className="max-h-40 rounded-lg border border-slate-200 object-contain" src={items[index].imageDataUrl} alt="ตัวอย่างรูปภาพงานแก้ไข" /><button type="button" className="text-sm font-semibold text-red-700 hover:underline" onClick={() => update(index, { imageDataUrl: "" })}>นำรูปออก</button></div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </section>
      <div className="sticky bottom-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg sm:flex-row sm:justify-end"><Link className="button-secondary" href="/dashboard">ยกเลิก</Link><button className="button-primary" disabled={busy || !extinguishers.length}>{busy ? "กำลังบันทึก…" : "บันทึกผลตรวจ"}</button></div>
    </form>
  </>;
}
