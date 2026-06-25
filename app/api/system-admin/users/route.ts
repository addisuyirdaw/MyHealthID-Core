import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SYSTEM_ADMIN_ROLES } from "@/lib/locales/enums";

function guardSysAdmin() {
  const cookieStore = cookies();
  const role = cookieStore.get("userRole")?.value;
  const userId = cookieStore.get("userId")?.value;
  if (!role || !userId || !SYSTEM_ADMIN_ROLES.includes(role as any)) {
    return { ok: false as const };
  }
  return { ok: true as const, userId, role };
}

// GET /api/system-admin/users?search=
export async function GET(request: NextRequest) {
  const guard = guardSysAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "SYSTEM_ADMINISTRATOR role required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("search")?.trim();

  try {
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        fullName: true,
        isActive: true,
        isTempPassword: true,
        createdAt: true,
        lastLoginAt: true,
        organizationId: true,
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
