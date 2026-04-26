import { adminDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export interface TenantInfo {
  id: number;
  slug: string;
  name: string;
  status: string;
  subscriptionPlan: string;
  subscriptionExpiresAt: Date | null;
}

export async function resolveTenant(
  hostname: string,
): Promise<TenantInfo | null> {
  // 1. Check tenant_domains for exact match
  const domainRows = await adminDb
    .select({ tenantId: schema.tenantDomains.tenantId })
    .from(schema.tenantDomains)
    .where(eq(schema.tenantDomains.domain, hostname));
  const domainMapping = domainRows[0];

  if (domainMapping) {
    return getTenantById(domainMapping.tenantId);
  }

  // 2. Try subdomain from SAAS_DOMAIN
  const saasDomain = process.env.SAAS_DOMAIN;
  if (saasDomain && hostname.endsWith(`.${saasDomain}`)) {
    const slug = hostname.replace(`.${saasDomain}`, "");
    if (slug && !slug.includes(".")) {
      return getTenantBySlug(slug);
    }
  }

  return null;
}

async function getTenantById(id: number): Promise<TenantInfo | null> {
  const rows = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, id));
  const tenant = rows[0];
  if (!tenant) return null;

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    subscriptionPlan: tenant.subscriptionPlan,
    subscriptionExpiresAt: tenant.subscriptionExpiresAt,
  };
}

async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  const rows = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug));
  const tenant = rows[0];
  if (!tenant) return null;

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    status: tenant.status,
    subscriptionPlan: tenant.subscriptionPlan,
    subscriptionExpiresAt: tenant.subscriptionExpiresAt,
  };
}

export function isTenantExpired(tenant: TenantInfo): boolean {
  if (!tenant.subscriptionExpiresAt) return false;
  return new Date() > tenant.subscriptionExpiresAt;
}
