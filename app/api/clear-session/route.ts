import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  cookieStore.delete("userRole");
  cookieStore.delete("organizationId");
  return NextResponse.json({ cleared: true });
}
