"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle, EmptyState } from "@/components/ui";

type User = { id: string; name: string; email: string; role: string; active: boolean };
export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [show, setShow] = useState(false);
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
  return <>
    <PageTitle title="จัดการผู้ใช้" description="เพิ่มบัญชีผู้ใช้และกำหนดบทบาทการทำงาน" action={<button className="button-primary" onClick={() => setShow(true)}>＋ เพิ่มผู้ใช้</button>} />
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">ตั้งรหัสผ่านเริ่มต้นที่คาดเดายาก และแจ้งให้ผู้ใช้เปลี่ยนรหัสผ่านด้วยวิธีที่องค์กรกำหนด</div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
    {loading ? <div className="panel py-10 text-center text-slate-500">กำลังโหลด…</div> : users.length ? <div className="table-wrap bg-white"><table className="table"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td className="font-semibold">{user.name}</td><td>{user.email}</td><td><select aria-label={`บทบาทของ ${user.name}`} className="field min-h-9 py-1" value={user.role} onChange={(e) => void changeRole(user, e.target.value)}><option value="ADMIN">ผู้ดูแลระบบ</option><option value="INSPECTOR">ผู้ตรวจ</option><option value="MAINTENANCE">ผู้ดูแลงานแก้ไข</option></select></td><td>{user.active ? "ใช้งาน" : "ปิดใช้งาน"}</td><td><button className="text-sm font-semibold text-brand-700" onClick={() => void toggleActive(user)}>{user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button></td></tr>)}</tbody></table></div> : <EmptyState title="ยังไม่มีผู้ใช้" description="เพิ่มผู้ใช้เพื่อเริ่มมอบหมายบทบาทในระบบ" />}
    {show && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6"><h2 className="mb-5 text-xl font-bold">เพิ่มผู้ใช้</h2><div className="space-y-4"><div><label className="label" htmlFor="user-name">ชื่อที่แสดง *</label><input id="user-name" name="name" className="field" required maxLength={100} /></div><div><label className="label" htmlFor="user-email">อีเมล *</label><input id="user-email" name="email" type="email" className="field" required /></div><div><label className="label" htmlFor="user-password">รหัสผ่าน *</label><input id="user-password" name="password" type="password" className="field" minLength={12} required aria-describedby="password-hint" /><p id="password-hint" className="mt-1 text-xs text-slate-500">อย่างน้อย 12 ตัวอักษร</p></div><div><label className="label" htmlFor="user-role">บทบาท *</label><select className="field" id="user-role" name="role"><option value="INSPECTOR">ผู้ตรวจ</option><option value="MAINTENANCE">ผู้ดูแลงานแก้ไข</option><option value="ADMIN">ผู้ดูแลระบบ</option></select></div></div><div className="mt-5 flex justify-end gap-3"><button type="button" className="button-secondary" onClick={() => setShow(false)}>ยกเลิก</button><button className="button-primary">เพิ่มผู้ใช้</button></div></form></div>}
  </>;
}
