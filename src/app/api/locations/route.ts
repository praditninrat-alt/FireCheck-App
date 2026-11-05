import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireUser, invalidInput, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { locationSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const locations = await db.location.findMany({
      where: auth.user.role === Role.ADMIN ? {} : { active: true },
      include: { _count: { select: { extinguishers: true } } },
      orderBy: [{ building: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ data: locations });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const parsed = locationSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const location = await db.location.create({ data: { ...parsed.data, createdById: auth.user.id } });
    return NextResponse.json({ data: location }, { status: 201 });
  } catch {
    return serverError();
  }
}
