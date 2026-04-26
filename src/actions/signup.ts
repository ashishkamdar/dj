"use server";

import { adminDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function signupAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const slug = (formData.get("slug") as string).toLowerCase().trim();
  const name = formData.get("name") as string;
  const ownerName = formData.get("ownerName") as string;
  const ownerEmail = formData.get("ownerEmail") as string;
  const ownerPhone = (formData.get("ownerPhone") as string) || "";

  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return { error: "Subdomain must be 3-30 chars, lowercase letters, numbers, hyphens" };
  }
  const reserved = ["admin", "www", "api", "super-admin", "signup", "login"];
  if (reserved.includes(slug)) {
    return { error: "This subdomain is not available" };
  }

  const existing = await adminDb
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, slug));
  if (existing.length > 0) {
    return { error: "This subdomain is already taken" };
  }

  await adminDb.insert(schema.tenants).values({
    slug,
    name,
    ownerName,
    ownerEmail: ownerEmail.toLowerCase(),
    ownerPhone,
    status: "pending",
    subscriptionPlan: "free",
  });

  redirect("/signup?success=true");
}
