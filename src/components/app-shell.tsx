"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthUser } from "@/lib/auth";

const links = [
  { href: "/dashboard", title: "ภาพรวม", icon: "▦" },
  { href: "/extinguishers", title: "ถังดับเพลิง", icon: "◉" },
  { href: "/locations", title: "ตำแหน่งติดตั้ง", icon: "⌖" },
  { href: "/inspections", title: "ประวัติการตรวจ", icon: "✓" },
  { href: "/defects", title: "งานแก้ไข", icon: "!" },
  { href: "/reports", title: "รายงาน", icon: "▤" },
];
const roleTitle: Record<AuthUser["role"], string> = { ADMIN: "ผู้ดูแลระบบ", INSPECTOR: "ผู้ตรวจ", MAINTENANCE: "ผู้ดูแลงานแก้ไข" };

export function AppShell({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const visibleLinks = links.filter((link) =>
    link.href !== "/locations" || user.role !== "MAINTENANCE",
  ).filter((link) => link.href !== "/defects" || user.role !== "INSPECTOR");
  async function logout() {
    if (!window.confirm("ต้องการออกจากระบบหรือไม่?")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return <div className="min-h-screen md:flex">
    {open && <button aria-label="ปิดเมนู" className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-950 px-4 py-5 text-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2" onClick={() => setOpen(false)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold">F</span><span><b className="block text-lg">FireCheck</b><small className="text-slate-400">บันทึกการตรวจถังดับเพลิง</small></span>
      </Link>
      <nav className="mt-8 flex-1 space-y-1">
        {visibleLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium ${path === link.href || (link.href !== "/dashboard" && path.startsWith(`${link.href}/`)) ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span className="w-6 text-center text-lg">{link.icon}</span>{link.title}</Link>)}
        {(user.role === "ADMIN" || user.role === "INSPECTOR") && <Link href="/inspections/new" onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium ${path === "/inspections/new" ? "bg-brand-600 text-white" : "text-brand-300 hover:bg-white/5"}`}><span className="w-6 text-center text-lg">＋</span>เริ่มตรวจถัง</Link>}
        {user.role === "ADMIN" && <Link href="/users" onClick={() => setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium ${path === "/users" ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span className="w-6 text-center text-lg">♙</span>จัดการผู้ใช้</Link>}
      </nav>
      <div className="rounded-2xl bg-white/5 p-3"><p className="truncate text-sm font-semibold">{user.name}</p><p className="mt-1 text-xs text-slate-400">{roleTitle[user.role]}</p><button className="mt-3 min-h-10 w-full rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5" onClick={logout}>ออกจากระบบ</button></div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
        <button aria-label="เปิดเมนู" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xl md:hidden" onClick={() => setOpen(true)}>☰</button>
        <div className="text-sm text-slate-500">FireCheck <span className="mx-1">/</span> {links.find((item) => item.href === path)?.title ?? (path === "/inspections/new" ? "เริ่มตรวจถัง" : path === "/users" ? "จัดการผู้ใช้" : "รายละเอียด")}</div>
      </header>
      <div className="mx-auto max-w-7xl p-4 pb-10 md:p-8">{children}<p className="mt-10 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">ระบบนี้ใช้สำหรับบันทึกและติดตามงานเท่านั้น รายการตรวจควรปรับให้ตรงกับข้อกำหนดของบริษัทและผู้รับผิดชอบด้านความปลอดภัย ไม่ใช่การรับรองความปลอดภัยหรือใช้แทนการตรวจโดยผู้เชี่ยวชาญ</p></div>
    </main>
  </div>;
}
