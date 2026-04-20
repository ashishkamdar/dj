import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
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
  db.update(schema.firms)
    .set({ signature: relativePath, updatedAt: new Date().toISOString() })
    .where(eq(schema.firms.id, firmId))
    .run();

  return NextResponse.json({ success: true, path: relativePath });
}
