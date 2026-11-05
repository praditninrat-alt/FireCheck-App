import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { isValidDefectImage } from "@/lib/defect-image";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const image = await db.defectImage.findUnique({ where: { defectId: id }, select: { mimeType: true, data: true } });
    if (!image) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบรูปภาพนี้" } }, { status: 404 });
    return new NextResponse(Buffer.from(image.data), {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(image.data.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser([Role.ADMIN, Role.MAINTENANCE]);
  if (!auth.user) return auth.response;
  try {
    const { id } = await params;
    const file = (await request.formData()).get("image");
    if (!(file instanceof File) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: { code: "INVALID_IMAGE", message: "กรุณาเลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" } }, { status: 422 });
    }
    const data = Buffer.from(await file.arrayBuffer());
    if (!isValidDefectImage(file.type, data)) {
      return NextResponse.json({ error: { code: "INVALID_IMAGE", message: "ไฟล์รูปภาพไม่ถูกต้อง รองรับ JPG, PNG หรือ WebP เท่านั้น" } }, { status: 422 });
    }
    const defect = await db.defect.findUnique({ where: { id }, select: { id: true } });
    if (!defect) return NextResponse.json({ error: { code: "NOT_FOUND", message: "ไม่พบงานแก้ไขนี้" } }, { status: 404 });
    await db.defectImage.upsert({
      where: { defectId: id },
      create: { defectId: id, mimeType: file.type, data },
      update: { mimeType: file.type, data },
    });
    return NextResponse.json({ data: { defectId: id } });
  } catch {
    return serverError();
  }
}
