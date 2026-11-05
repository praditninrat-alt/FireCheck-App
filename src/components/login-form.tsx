"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setError(result.error?.message || "เข้าสู่ระบบไม่สำเร็จ"); return; }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง");
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-8 space-y-5">
    <div><label className="label" htmlFor="email">อีเมล</label><input className="field" id="email" name="email" type="email" autoComplete="username" required /></div>
    <div><label className="label" htmlFor="password">รหัสผ่าน</label><input className="field" id="password" name="password" type="password" autoComplete="current-password" required /></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button className="button-primary w-full" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
  </form>;
}
