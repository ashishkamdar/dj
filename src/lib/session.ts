import { cookies } from "next/headers";
import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "kp-session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionPayload {
  tenantId: number;
  userId: number;
  impersonating?: boolean;
  ts: number;
}

export interface SessionUser {
  tenantId: number;
  id: number;
  name: string;
  role: string;
  impersonating?: boolean;
}

export async function setSession(
  tenantId: number,
  userId: number,
  impersonating = false,
): Promise<void> {
  const payload: SessionPayload = {
    tenantId,
    userId,
    impersonating: impersonating || undefined,
    ts: Date.now(),
  };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: impersonating ? 60 * 60 : MAX_AGE, // 1hr for impersonation
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8"),
    );

    const user = await withTenantDb(payload.tenantId, async (db) => {
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, payload.userId));
      return rows[0] ?? null;
    });

    if (!user || !user.isActive) return null;

    return {
      tenantId: payload.tenantId,
      id: user.id,
      name: user.name,
      role: user.role ?? "staff",
      impersonating: payload.impersonating,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
    throw new Error("Unauthorized"); // unreachable, helps TS
  }
  return session;
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
