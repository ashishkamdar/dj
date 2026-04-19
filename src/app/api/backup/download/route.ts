import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const dbPath = path.join(process.cwd(), "data", "dj.db");

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json(
      { error: "Database file not found" },
      { status: 404 }
    );
  }

  const buffer = fs.readFileSync(dbPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="dj-backup-${timestamp}.db"`,
    },
  });
}
