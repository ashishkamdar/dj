import { NextResponse } from "next/server";
import { writeFile, copyFile } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("backup") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const dbPath = path.join(process.cwd(), "data", "dj.db");
  const backupDir = path.join(process.cwd(), "data", "backups");

  // Auto-backup current DB first
  const { mkdirSync, existsSync } = await import("fs");
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await copyFile(dbPath, path.join(backupDir, `pre-restore-${timestamp}.db`));

  // Write uploaded file as new DB
  const bytes = await file.arrayBuffer();
  await writeFile(dbPath, Buffer.from(bytes));

  return NextResponse.json({
    success: true,
    message: "Database restored. Please restart the application.",
  });
}
