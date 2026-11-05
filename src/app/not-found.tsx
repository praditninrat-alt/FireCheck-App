import Link from "next/link";
export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center p-6"><div className="text-center"><h1 className="text-2xl font-bold">ไม่พบข้อมูลที่ต้องการ</h1><p className="mt-2 text-slate-500">รายการอาจถูกย้ายหรือไม่มีอยู่ในระบบ</p><Link className="button-primary mt-5" href="/dashboard">กลับหน้าภาพรวม</Link></div></main>;
}
