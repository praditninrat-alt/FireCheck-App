import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
      <section className="hidden bg-gradient-to-br from-brand-700 to-brand-600 p-12 text-white md:flex md:flex-col md:justify-between">
        <div><p className="text-sm font-bold uppercase tracking-[.2em] text-white/75">FireCheck</p><h1 className="mt-8 text-4xl font-bold leading-tight">บันทึกการตรวจ<br />ติดตามงานได้ง่ายขึ้น</h1><p className="mt-5 text-white/80">เครื่องมือช่วยบันทึกและติดตามงานตรวจถังดับเพลิงของบริษัท</p></div>
        <p className="text-sm text-white/70">ระบบนี้ไม่ใช่การรับรองความปลอดภัยหรือทดแทนการตรวจโดยผู้เชี่ยวชาญ</p>
      </section>
      <section className="p-7 sm:p-12"><p className="text-sm font-bold text-brand-700 md:hidden">FireCheck</p><h2 className="mt-2 text-2xl font-bold">เข้าสู่ระบบ</h2><p className="mt-2 text-sm text-slate-500">กรุณาใช้อีเมลและรหัสผ่านของบริษัท</p><LoginForm /></section>
    </div>
  </main>;
}
