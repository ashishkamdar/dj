import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { withTenantDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/session";

export async function POST(request: Request) {
  const { tenantId } = await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("signature") as File;
  const firmId = parseInt(formData.get("firmId") as string);

  if (!file || !firmId) {
    return NextResponse.json(
      { error: "File and firmId required" },
      { status: 400 },
    );
  }

  // Create upload directory
  const uploadDir = path.join(process.cwd(), "data", "uploads", "signatures");
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Save file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `signature-${firmId}-${Date.now()}.png`;
  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  // Update firm
  const relativePath = `/api/settings/signature/${filename}`;
  await withTenantDb(tenantId, async (db) => {
    await db.update(schema.firms)
      .set({ signature: relativePath, updatedAt: new Date() })
      .where(eq(schema.firms.id, firmId));
  });

  return NextResponse.json({ success: true, path: relativePath });
}
