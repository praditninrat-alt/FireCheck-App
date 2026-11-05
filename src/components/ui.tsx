import Link from "next/link";

export function PageTitle({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action && <div className="page-title-action sm:w-auto">{action}</div>}</div>;
}

export function Badge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    PASS: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    FAIL: "bg-red-50 text-red-700 ring-red-200",
    NA: "bg-slate-100 text-slate-600 ring-slate-200",
    OPEN: "bg-sky-50 text-sky-700 ring-sky-200",
    IN_PROGRESS: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    RESOLVED: "bg-violet-50 text-violet-700 ring-violet-200",
    CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
    LOW: "bg-teal-50 text-teal-700 ring-teal-200",
    MEDIUM: "bg-amber-50 text-amber-800 ring-amber-200",
    HIGH: "bg-orange-50 text-orange-800 ring-orange-200",
    CRITICAL: "bg-red-50 text-red-700 ring-red-200",
  };
  const labels: Record<string, string> = { PASS: "ผ่าน", FAIL: "ไม่ผ่าน", NA: "ไม่เกี่ยวข้อง", OPEN: "เปิด", IN_PROGRESS: "กำลังดำเนินการ", RESOLVED: "แก้ไขแล้ว", CANCELLED: "ยกเลิก", LOW: "ต่ำ", MEDIUM: "ปานกลาง", HIGH: "สูง", CRITICAL: "วิกฤต" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[value] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>{labels[value] ?? value}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">○</div><h2 className="mt-4 font-semibold text-slate-800">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>;
}

export function DataLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="font-semibold text-brand-700 hover:underline" href={href}>{children}</Link>;
}
