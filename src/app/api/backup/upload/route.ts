import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Database restores are managed by the system administrator. Contact support for data import.",
    },
    { status: 410 }
  );
}
