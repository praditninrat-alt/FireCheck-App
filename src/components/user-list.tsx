"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle, EmptyState } from "@/components/ui";

type User = { id: string; name: string; email: string; role: string; active: boolean };
export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/users"); const json = await response.json() as { data?: User[] }; if (!response.ok) throw new Error("โหลดผู้ใช้ไม่สำเร็จ"); setUsers(json.data ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : "โหลดผู้ใช้ไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/users").then(async (response) => {
      const json = await response.json() as { data?: User[] };
      if (!response.ok) throw new Error("โหลดผู้ใช้ไม่สำเร็จ");
      if (active) setUsers(json.data ?? []);
    }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "โหลดผู้ใช้ไม่สำเร็จ"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password"), role: form.get("role") }) });
    const json = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setError(json.error?.message ?? "เพิ่มผู้ใช้ไม่สำเร็จ"); return; }
    setShow(false); setSuccess("เพิ่มผู้ใช้แล้ว"); await load();
  }
  async function toggleActive(user: User) {
    if (!window.confirm(`${user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}บัญชี ${user.name} หรือไม่?`)) return;
    const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !user.active }) });
    const json = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setError(json.error?.message ?? "อัปเดตบัญชีไม่สำเร็จ"); return; }
    await load();
  }
  async function changeRole(user: User, role: string) {
    const response = await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    const json = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setError(json.error?.message ?? "เปลี่ยนบทบาทไม่สำเร็จ"); return; }
    await load();
  }
  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError(""); setSuccess("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email") }),
      });
      const json = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(json.error?.message ?? "แก้ไขข้อมูลผู้ใช้ไม่สำเร็จ");
      setEditing(null); setSuccess("บันทึกข้อมูลผู้ใช้แล้ว"); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "แก้ไขข้อมูลผู้ใช้ไม่สำเร็จ");
    }
  }
  async function deleteUser(user: User) {
    if (!window.confirm(`ยืนยันลบบัญชี ${user.name} หรือไม่? ประวัติที่เกี่ยวข้องจะยังอยู่ โดยแสดงชื่อเป็น “บัญชีถูกลบ”`)) return;
    setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const json = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(json.error?.message ?? "ลบบัญชีไม่สำเร็จ");
      setSuccess("ลบบัญชีแล้วและเก็บประวัติที่เกี่ยวข้องไว้"); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบบัญชีไม่สำเร็จ");
    }
  }
  return <>
    <PageTitle title="จัดการผู้ใช้" description="เพิ่มบัญชีผู้ใช้และกำหนดบทบาทการทำงาน" action={<button className="button-primary" onClick={() => setShow(true)}>＋ เพิ่มผู้ใช้</button>} />
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">ตั้งรหัสผ่านเริ่มต้นที่คาดเดายาก และแจ้งให้ผู้ใช้เปลี่ยนรหัสผ่านด้วยวิธีที่บริษัทกำหนด</div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
    {loading ? <div className="panel py-10 text-center text-slate-500">กำลังโหลด…</div> : users.length ? <div className="table-wrap bg-white"><table className="table"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td data-label="ชื่อ" className="font-semibold">{user.name}</td><td data-label="อีเมล">{user.email}</td><td data-label="บทบาท"><select aria-label={`บทบาทของ ${user.name}`} className="field min-h-9 py-1" value={user.role} onChange={(e) => void changeRole(user, e.target.value)}><option value="ADMIN">ผู้ดูแลระบบ</option><option value="INSPECTOR">ผู้ตรวจ</option><option value="MAINTENANCE">ผู้ดูแลงานแก้ไข</option></select></td><td data-label="สถานะ">{user.active ? "ใช้งาน" : "ปิดใช้งาน"}</td><td data-label="จัดการ"><div className="flex flex-wrap gap-2"><button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={() => setEditing(user)}>แก้ไข</button><button className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${user.active ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 focus-visible:ring-amber-400" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:ring-emerald-400"}`} onClick={() => void toggleActive(user)}>{user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button><button className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400" onClick={() => void deleteUser(user)}>ลบ</button></div></td></tr>)}</tbody></table></div> : <EmptyState title="ยังไม่มีผู้ใช้" description="เพิ่มผู้ใช้เพื่อเริ่มมอบหมายบทบาทในระบบ" />}
    {show && <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={submit} className="dialog-content w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="mb-5 text-xl font-bold">เพิ่มผู้ใช้</h2><div className="space-y-4"><div><label className="label" htmlFor="user-name">ชื่อที่แสดง *</label><input id="user-name" name="name" className="field" required maxLength={100} /></div><div><label className="label" htmlFor="user-email">อีเมล *</label><input id="user-email" name="email" type="email" className="field" required /></div><div><label className="label" htmlFor="user-password">รหัสผ่าน *</label><input id="user-password" name="password" type="password" className="field" minLength={12} required aria-describedby="password-hint" /><p id="password-hint" className="mt-1 text-xs text-slate-500">อย่างน้อย 12 ตัวอักษร</p></div><div><label className="label" htmlFor="user-role">บทบาท *</label><select className="field" id="user-role" name="role"><option value="INSPECTOR">ผู้ตรวจ</option><option value="MAINTENANCE">ผู้ดูแลงานแก้ไข</option><option value="ADMIN">ผู้ดูแลระบบ</option></select></div></div><div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" className="button-secondary" onClick={() => setShow(false)}>ยกเลิก</button><button className="button-primary">เพิ่มผู้ใช้</button></div></form></div>}
    {editing && <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={saveUser} className="dialog-content w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="mb-5 text-xl font-bold">แก้ไขข้อมูลผู้ใช้</h2><div className="space-y-4"><div><label className="label" htmlFor="edit-user-name">ชื่อที่แสดง *</label><input id="edit-user-name" name="name" className="field" required maxLength={100} defaultValue={editing.name} /></div><div><label className="label" htmlFor="edit-user-email">อีเมล *</label><input id="edit-user-email" name="email" type="email" className="field" required maxLength={254} defaultValue={editing.email} /></div></div><div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" className="button-secondary" onClick={() => setEditing(null)}>ยกเลิก</button><button className="button-primary">บันทึก</button></div></form></div>}
  </>;
}
