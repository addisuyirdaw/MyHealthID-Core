"use server";

import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { dispatchExternalOrder } from "@/lib/services/referral.service";

/**
 * Server action wrapper for dispatching external diagnostic orders
 * Called from client components during clinical workflows
 */
export async function sendDiagnosticOrderAction(params: {
  patientId: string;
  destinationOrganizationId?: string | null;
  diagnosticType: string;
  clinicalIndication?: string;
  priority?: string;
  expectedTurnaroundTime?: string;
  orderDetails?: Record<string, any>;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const cookieStore = cookies();

    // Extract context from cookies
    const referredByUserId = cookieStore.get("userId")?.value;
    const referredByRole = cookieStore.get("userRole")?.value;
    const originOrganizationId = cookieStore.get("organizationId")?.value;

    // Validate session context
    if (!referredByUserId || !referredByRole || !originOrganizationId) {
      return {
        success: false,
        error: "Invalid session context. Please log in again.",
      };
    }

    const {
      patientId,
      destinationOrganizationId,
      diagnosticType,
      clinicalIndication,
      priority,
      expectedTurnaroundTime,
      orderDetails,
    } = params;

    // Validate required parameters
    if (!patientId || !diagnosticType) {
      return {
        success: false,
        error: "Patient ID and diagnostic type are required",
      };
    }

    // Call the service
    const result = await dispatchExternalOrder({
      patientId,
      originOrganizationId,
      destinationOrganizationId,
      referredByUserId,
      referredByRole: referredByRole as Role,
      diagnosticType,
      clinicalIndication,
      priority,
      expectedTurnaroundTime,
      orderDetails,
    });

    return result;
  } catch (error: any) {
    console.error("[sendDiagnosticOrderAction] error:", error);
    return {
      success: false,
      error: error.message || "Failed to send diagnostic order",
    };
  }
}
