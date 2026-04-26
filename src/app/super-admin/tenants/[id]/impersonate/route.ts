import { impersonateTenant } from "@/actions/super-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await impersonateTenant(Number(id));
  // impersonateTenant redirects, so this won't be reached
}
