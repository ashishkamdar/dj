import { cookies } from "next/headers";
import { adminDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";

const COOKIE_NAME = "kp-super-session";
const MAX_AGE = 60 * 60 * 24; // 24 hours

interface SuperAdminPayload {
  adminId: number;
  ts: number;
}

export interface SuperAdmin {
  id: number;
  name: string;
  email: string;
}

export async function superAdminLogin(
  email: string,
  password: string,
): Promise<SuperAdmin | null> {
  const rows = await adminDb
    .select()
    .from(schema.superAdmins)
    .where(eq(schema.superAdmins.email, email.toLowerCase()));
  const admin = rows[0];

  if (!admin || !compareSync(password, admin.password)) return null;

  const payload: SuperAdminPayload = { adminId: admin.id, ts: Date.now() };
  const value = Buffer.from(JSON.stringify(payload)).toString("base64");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/super-admin",
    maxAge: MAX_AGE,
  });

  return { id: admin.id, name: admin.name, email: admin.email };
}

export async function getSuperAdminSession(): Promise<SuperAdmin | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const payload: SuperAdminPayload = JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8"),
    );

    const rows = await adminDb
      .select()
      .from(schema.superAdmins)
      .where(eq(schema.superAdmins.id, payload.adminId));
    const admin = rows[0];

    if (!admin) return null;
    return { id: admin.id, name: admin.name, email: admin.email };
  } catch {
    return null;
  }
}

export async function requireSuperAdmin(): Promise<SuperAdmin> {
  const session = await getSuperAdminSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/super-admin/login");
    throw new Error("Unauthorized"); // unreachable, helps TS
  }
  return session;
}

export async function clearSuperAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
