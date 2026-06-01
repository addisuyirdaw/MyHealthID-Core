import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIncomingOrders } from "@/lib/services/referral.service";
import { RoutingStatus } from "@prisma/client";

/**
 * GET /api/interop/orders/incoming
 * 
 * Retrieve incoming external diagnostic orders for a destination facility.
 * Only accessible to ADMIN_ROLES or LAB_ROLES users at the destination facility.
 * 
 * Query parameters:
 * - patientNationalId (optional): Filter by specific patient's national ID
 * - routingStatus (optional): Filter by RoutingStatus (PENDING_EXTERNAL_DISPATCH, ACCEPTED_BY_EXTERNAL, etc.)
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();

    // Extract requester context from cookies
    const requesterUserId = cookieStore.get("userId")?.value;
    const requesterRole = cookieStore.get("userRole")?.value;
    const destinationOrganizationId = cookieStore.get("organizationId")?.value;

    // Validate required fields
    if (!requesterUserId) {
      return NextResponse.json(
        { success: false, error: "User ID not found in session" },
        { status: 401 }
      );
    }

    if (!requesterRole) {
      return NextResponse.json(
        { success: false, error: "User role not found in session" },
        { status: 401 }
      );
    }

    if (!destinationOrganizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID not found in session" },
        { status: 401 }
      );
    }

    // Parse optional query parameters
    const { searchParams } = new URL(req.url);
    const patientNationalId = searchParams.get("patientNationalId") || undefined;
    const routingStatusParam = searchParams.get("routingStatus") as RoutingStatus | undefined;

    // Fetch incoming orders
    const orders = await getIncomingOrders({
      destinationOrganizationId,
      requesterUserId,
      requesterRole,
      patientNationalId,
      routingStatus: routingStatusParam,
    });

    return NextResponse.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error: any) {
    console.error("[incoming orders GET] error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve incoming diagnostic orders",
      },
      { status: 403 }
    );
  }
}

/**
 * POST /api/interop/orders/incoming
 * 
 * Accept or reject an incoming diagnostic order at the destination facility.
 * 
 * Request body:
 * {
 *   "action": "accept" | "reject",
 *   "diagnosticOrderId": string,
 *   "notes": string (optional for accept),
 *   "rejectionReason": string (required for reject)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const body = await req.json();

    // Extract requester context from cookies
    const acceptedByUserId = cookieStore.get("userId")?.value;
    const acceptedByRole = cookieStore.get("userRole")?.value;
    const destinationOrganizationId = cookieStore.get("organizationId")?.value;

    // Validate required fields
    if (!acceptedByUserId || !acceptedByRole || !destinationOrganizationId) {
      return NextResponse.json(
        { success: false, error: "Missing session context" },
        { status: 401 }
      );
    }

    const { action, diagnosticOrderId, notes, rejectionReason } = body;

    if (!action || !diagnosticOrderId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: action and diagnosticOrderId" },
        { status: 400 }
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Import functions dynamically to avoid circular dependencies
    const { acceptExternalOrder, rejectExternalOrder } = await import(
      "@/lib/services/referral.service"
    );

    let result;

    if (action === "accept") {
      result = await acceptExternalOrder({
        diagnosticOrderId,
        destinationOrganizationId,
        acceptedByUserId,
        acceptedByRole,
        notes: notes || undefined,
      });
    } else {
      if (!rejectionReason) {
        return NextResponse.json(
          { success: false, error: "rejectionReason is required when rejecting an order" },
          { status: 400 }
        );
      }

      result = await rejectExternalOrder({
        diagnosticOrderId,
        destinationOrganizationId,
        rejectedByUserId: acceptedByUserId,
        rejectedByRole: acceptedByRole,
        rejectionReason,
      });
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Diagnostic order ${action === "accept" ? "accepted" : "rejected"} successfully`,
    });
  } catch (error: any) {
    console.error("[incoming orders POST] error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process diagnostic order action",
      },
      { status: 500 }
    );
  }
}
