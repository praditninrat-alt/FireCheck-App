import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireUser, invalidInput, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { extinguisherQuerySchema, extinguisherSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;
  try {
    const parsedQuery = extinguisherQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    if (!parsedQuery.success) return invalidInput();
    const { q: search, active } = parsedQuery.data;
    const where = {
      ...(auth.user.role === Role.ADMIN && active === "all" ? {} : { active: true }),
      ...(search ? {
        OR: [
          { code: { contains: search } },
          { agentType: { contains: search } },
          { location: { building: { contains: search } } },
          { location: { name: { contains: search } } },
          { location: { floor: { contains: search } } },
        ],
      } : {}),
    };
    const items = await db.extinguisher.findMany({
      where,
      include: { location: true, _count: { select: { inspections: true } } },
      orderBy: { code: "asc" },
      take: 500,
    });
    return NextResponse.json({ data: items });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const auth = await requireUser([Role.ADMIN]);
  if (!auth.user) return auth.response;
  try {
    const parsed = extinguisherSchema.safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const location = await db.location.findUnique({ where: { id: parsed.data.locationId } });
    if (!location?.active) return NextResponse.json({ error: { code: "INVALID_LOCATION", message: "ไม่พบตำแหน่งที่ใช้งานได้" } }, { status: 422 });
    const item = await db.extinguisher.create({ data: { ...parsed.data, createdById: auth.user.id }, include: { location: true } });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: { code: "CODE_IN_USE", message: "รหัสถังนี้ถูกใช้งานแล้ว" } }, { status: 409 });
    }
    return serverError();
  }
}
