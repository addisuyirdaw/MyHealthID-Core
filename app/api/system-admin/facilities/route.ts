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

// GET /api/system-admin/facilities
export async function GET() {
  const guard = guardSysAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "SYSTEM_ADMINISTRATOR role required." }, { status: 403 });
  }

  try {
    const facilities = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { patients: true, users: true } },
      },
    });
    return NextResponse.json(facilities);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/system-admin/facilities
export async function POST(request: NextRequest) {
  const guard = guardSysAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: "SYSTEM_ADMINISTRATOR role required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, nameAm, code, registrationId, ownershipType, serviceType, region, zone, woreda, email, phone, website } = body;

    if (!name || !code || !registrationId || !ownershipType || !serviceType) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const facility = await prisma.organization.create({
      data: {
        name: name.trim(),
        nameLng: { en: name.trim(), am: nameAm?.trim() || name.trim() },
        code: code.trim().toUpperCase(),
        registrationId: registrationId.trim(),
        ownershipType,
        serviceType,
        region: region?.trim() || null,
        zone: zone?.trim() || null,
        woreda: woreda?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        isActive: true,
        isVerified: false,
      },
    });

    return NextResponse.json({ success: true, facility }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Facility code or registration ID already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
