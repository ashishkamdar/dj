import { NextResponse } from "next/server";
import path from "path";
import { existsSync, readFileSync } from "fs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  const filePath = path.join(
    process.cwd(),
    "data",
    "uploads",
    "signatures",
    filename,
  );

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = readFileSync(filePath);
  const ext = filename.split(".").pop()?.toLowerCase() || "png";
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  const contentType = mimeTypes[ext] || "image/png";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
