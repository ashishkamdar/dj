import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "dj-session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  userId: number;
  ts: number;
}

interface SessionUser {
  id: number;
  name: string;
  role: string;
}

export async function setSession(userId: number): Promise<void> {
  const payload: SessionPayload = { userId, ts: Date.now() };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8")
    );

    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, payload.userId))
      .get();

    if (!user || !user.isActive) return null;

    return { id: user.id, name: user.name, role: user.role ?? "staff" };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session as SessionUser;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/calendar");
  }
  return session;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
