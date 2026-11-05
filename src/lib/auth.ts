import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";

export type AuthUser = { id: string; name: string; email: string; role: Role };
const cookieName = process.env.SESSION_COOKIE_NAME || "firecheck_session";
const ttlDays = Math.min(30, Math.max(1, Number(process.env.SESSION_TTL_DAYS) || 7));
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlDays * 86400000);
  await db.session.create({ data: { tokenHash: hash(token), userId, expiresAt } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email, role: session.user.role };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(cookieName);
}
