"use server";

import { adminDb, withTenantDb, schema } from "@/db";
import { eq, sql, desc } from "drizzle-orm";
import {
  requireSuperAdmin,
  superAdminLogin,
  clearSuperAdminSession,
} from "@/lib/super-admin-session";
import { setSession } from "@/lib/session";
import { hashSync } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const RESERVED_SLUGS = ["admin", "www", "api", "super-admin", "signup", "login"];

// ── Auth ─────────────────────────────────────────────────────────────────

export async function superAdminLoginAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const email = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";

  const admin = await superAdminLogin(email, password);
  if (!admin) {
    return { error: "Invalid email or password" };
  }

  redirect("/super-admin");
}

export async function superAdminLogoutAction(): Promise<void> {
  await clearSuperAdminSession();
  redirect("/super-admin/login");
}

// ── Tenants ──────────────────────────────────────────────────────────────

export async function getTenants() {
  await requireSuperAdmin();
  return adminDb
    .select()
    .from(schema.tenants)
    .orderBy(desc(schema.tenants.createdAt));
}

export async function getTenant(id: number) {
  await requireSuperAdmin();
  const rows = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, id));
  return rows[0] ?? null;
}

export async function getTenantDomains(tenantId: number) {
  await requireSuperAdmin();
  return adminDb
    .select()
    .from(schema.tenantDomains)
    .where(eq(schema.tenantDomains.tenantId, tenantId));
}

// ── Usage Stats ──────────────────────────────────────────────────────────

export async function getTenantUsageStats(tenantId: number) {
  await requireSuperAdmin();

  const [productsCount] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.products)
    .where(eq(schema.products.tenantId, tenantId));

  const [clientsCount] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.clients)
    .where(eq(schema.clients.tenantId, tenantId));

  const [ordersCount] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(eq(schema.orders.tenantId, tenantId));

  const [invoicesCount] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.invoices)
    .where(eq(schema.invoices.tenantId, tenantId));

  return {
    products: productsCount.count,
    clients: clientsCount.count,
    orders: ordersCount.count,
    invoices: invoicesCount.count,
  };
}

// ── Subscription Payments ────────────────────────────────────────────────

export async function getSubscriptionPayments(tenantId: number) {
  await requireSuperAdmin();
  return adminDb
    .select()
    .from(schema.subscriptionPayments)
    .where(eq(schema.subscriptionPayments.tenantId, tenantId))
    .orderBy(desc(schema.subscriptionPayments.createdAt));
}

// ── Tenant Lifecycle ─────────────────────────────────────────────────────

export async function approveTenant(tenantId: number) {
  await requireSuperAdmin();

  // Activate tenant
  await adminDb
    .update(schema.tenants)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(schema.tenants.id, tenantId));

  // Fetch tenant info for defaults
  const [tenant] = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));

  if (!tenant) throw new Error("Tenant not found");

  // Create default admin user and firm (via withTenantDb for RLS)
  await withTenantDb(tenantId, async (db) => {
    await db.insert(schema.users).values({
      tenantId,
      name: tenant.ownerName,
      pin: hashSync("1234", 10),
      role: "admin",
      isActive: true,
    });

    await db.insert(schema.firms).values({
      tenantId,
      name: tenant.name,
      email: tenant.ownerEmail,
      phone: tenant.ownerPhone ?? "",
      isActive: true,
    });
  });

  revalidatePath("/super-admin");
}

export async function suspendTenant(tenantId: number) {
  await requireSuperAdmin();
  await adminDb
    .update(schema.tenants)
    .set({ status: "suspended", updatedAt: new Date() })
    .where(eq(schema.tenants.id, tenantId));
  revalidatePath("/super-admin");
}

export async function reactivateTenant(tenantId: number) {
  await requireSuperAdmin();
  await adminDb
    .update(schema.tenants)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(schema.tenants.id, tenantId));
  revalidatePath("/super-admin");
}

// ── Subscription Management ──────────────────────────────────────────────

export async function updateTenantSubscription(
  tenantId: number,
  formData: FormData,
) {
  await requireSuperAdmin();

  const plan = formData.get("plan") as string;
  const expiresAt = formData.get("expiresAt") as string;

  await adminDb
    .update(schema.tenants)
    .set({
      subscriptionPlan: plan as "free" | "monthly" | "yearly",
      subscriptionExpiresAt: expiresAt ? new Date(expiresAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));

  revalidatePath("/super-admin");
}

export async function recordSubscriptionPayment(
  tenantId: number,
  formData: FormData,
) {
  const admin = await requireSuperAdmin();

  const amount = formData.get("amount") as string;
  const date = formData.get("date") as string;
  const mode = (formData.get("mode") as string) || "cash";
  const notes = (formData.get("notes") as string) || "";

  await adminDb.insert(schema.subscriptionPayments).values({
    tenantId,
    amount,
    date,
    mode: mode as "cash" | "upi" | "bank",
    notes: notes || null,
    recordedBy: admin.id,
  });

  revalidatePath("/super-admin");
}

// ── Manual Tenant Creation ───────────────────────────────────────────────

export async function createTenantManually(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireSuperAdmin();

  const slug = (formData.get("slug") as string).toLowerCase().trim();
  const name = formData.get("name") as string;
  const ownerName = formData.get("ownerName") as string;
  const ownerEmail = (formData.get("ownerEmail") as string) || "";
  const ownerPhone = (formData.get("ownerPhone") as string) || "";

  // Validate slug: 3-30 chars, lowercase alphanumeric + hyphens
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return {
      error: "Subdomain must be 3-30 chars, lowercase letters, numbers, hyphens",
    };
  }
  if (RESERVED_SLUGS.includes(slug)) {
    return { error: "This subdomain is reserved" };
  }

  // Check uniqueness
  const existing = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug));
  if (existing.length > 0) {
    return { error: "This subdomain is already taken" };
  }

  // Create tenant as active
  const [tenant] = await adminDb
    .insert(schema.tenants)
    .values({
      slug,
      name,
      ownerName,
      ownerEmail: ownerEmail.toLowerCase(),
      ownerPhone,
      status: "active",
      subscriptionPlan: "free",
    })
    .returning();

  // Create default admin user and firm (via withTenantDb for RLS)
  await withTenantDb(tenant.id, async (db) => {
    await db.insert(schema.users).values({
      tenantId: tenant.id,
      name: ownerName,
      pin: hashSync("1234", 10),
      role: "admin",
      isActive: true,
    });

    await db.insert(schema.firms).values({
      tenantId: tenant.id,
      name,
      email: ownerEmail.toLowerCase(),
      phone: ownerPhone,
      isActive: true,
    });
  });

  revalidatePath("/super-admin");
  redirect("/super-admin/tenants");
}

// ── Impersonation ────────────────────────────────────────────────────────

export async function impersonateTenant(tenantId: number) {
  await requireSuperAdmin();

  // Find admin user for the tenant
  const rows = await adminDb
    .select()
    .from(schema.users)
    .where(eq(schema.users.tenantId, tenantId));
  const adminUser = rows.find((u) => u.role === "admin" && u.isActive) ?? null;

  if (!adminUser) {
    throw new Error("No user found for this tenant");
  }

  await setSession(tenantId, adminUser.id, true);
  redirect("/calendar");
}

// ── Dashboard Stats ──────────────────────────────────────────────────────

export async function getDashboardStats() {
  await requireSuperAdmin();

  const [totalTenants] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tenants);

  const [activeTenants] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "active"));

  const [pendingTenants] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "pending"));

  const [suspendedTenants] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "suspended"));

  const [expiredTenants] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "expired"));

  const [totalOrders] = await adminDb
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders);

  const pendingTenantsList = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.status, "pending"))
    .orderBy(desc(schema.tenants.createdAt));

  return {
    tenants: {
      total: totalTenants.count,
      active: activeTenants.count,
      pending: pendingTenants.count,
      suspended: suspendedTenants.count,
      expired: expiredTenants.count,
    },
    totalOrders: totalOrders.count,
    pendingTenants: pendingTenantsList,
  };
}
