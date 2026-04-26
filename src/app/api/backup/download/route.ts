import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Database backups are managed by the system administrator. Contact support for data export.",
    },
    { status: 410 }
  );
}
