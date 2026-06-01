"use server";

import prisma from "@/lib/prisma";
import { Role, RoutingStatus, FacilityServiceType, MedicalAuditLogAction } from "@prisma/client";
import { normalizeHealthcareRole, CLINICAL_ROLES } from "@/lib/locales/enums";
import { auditCrossFacilityAccess } from "./audit.service";

/**
 * Facility tier hierarchy: lower tiers can refer to higher tiers
 * HEALTH_POST (0) -> HEALTH_CENTER (1) -> PRIMARY_HOSPITAL (2) -> GENERAL_HOSPITAL (3) -> SPECIALIZED_HOSPITAL (4) -> REFERRAL_HOSPITAL (5)
 * PRIMARY_CLINIC (1.5) -> SPECIALTY_CLINIC (3.5)
 */
const FACILITY_TIER_MAP: Record<FacilityServiceType, number> = {
  HEALTH_POST: 0,
  HEALTH_CENTER: 1,
  PRIMARY_CLINIC: 1.5,
  PRIMARY_HOSPITAL: 2,
  GENERAL_HOSPITAL: 3,
  SPECIALTY_CLINIC: 3.5,
  SPECIALIZED_HOSPITAL: 4,
  REFERRAL_HOSPITAL: 5,
};

/**
 * Validates if a referral from sourceOrgId to destinationOrgId is valid
 * (only lower-tier facilities can refer to equal/higher-tier facilities)
 */
export async function validateFacilityReferralEligibility(
  sourceOrgId: string,
  destinationOrgId?: string | null
): Promise<{ valid: boolean; reason?: string }> {
  if (!destinationOrgId) {
    // Open referral is allowed
    return { valid: true };
  }

  const [sourceOrg, destOrg] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: sourceOrgId },
      select: { serviceType: true },
    }),
    prisma.organization.findUnique({
      where: { id: destinationOrgId },
      select: { serviceType: true },
    }),
  ]);

  if (!sourceOrg) return { valid: false, reason: "Source facility not found" };
  if (!destOrg) return { valid: false, reason: "Destination facility not found" };

  const sourceTier = FACILITY_TIER_MAP[sourceOrg.serviceType];
  const destTier = FACILITY_TIER_MAP[destOrg.serviceType];

  if (sourceTier >= destTier) {
    return {
      valid: false,
      reason: `Referrals must be to higher-tier facilities. Source tier: ${sourceTier}, Destination tier: ${destTier}`,
    };
  }

  return { valid: true };
}

/**
 * Dispatch an external diagnostic order from a clinical provider to another facility
 * Validates that actor belongs to CLINICAL_ROLES and sets appropriate routing status
 */
export async function dispatchExternalOrder(params: {
  patientId: string;
  originOrganizationId: string;
  destinationOrganizationId?: string | null;
  referredByUserId: string;
  referredByRole: Role | string;
  diagnosticType: string;
  clinicalIndication?: string;
  priority?: string;
  expectedTurnaroundTime?: string;
  orderDetails?: Record<string, any>;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const {
      patientId,
      originOrganizationId,
      destinationOrganizationId,
      referredByUserId,
      referredByRole,
      diagnosticType,
      clinicalIndication,
      priority = "ROUTINE",
      expectedTurnaroundTime,
      orderDetails,
    } = params;

    // Validate actor role is CLINICAL_ROLES
    const normalizedRole = normalizeHealthcareRole(referredByRole);
    if (
      !CLINICAL_ROLES.includes(normalizedRole as (typeof CLINICAL_ROLES)[number])
    ) {
      return {
        success: false,
        error: `Role ${normalizedRole} is not authorized to dispatch external diagnostic orders. Only clinical roles can dispatch referrals.`,
      };
    }

    // Validate facility referral eligibility
    if (destinationOrganizationId) {
      const eligibility = await validateFacilityReferralEligibility(
        originOrganizationId,
        destinationOrganizationId
      );
      if (!eligibility.valid) {
        return { success: false, error: eligibility.reason };
      }
    }

    // Verify patient exists and belongs to origin facility
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, organizationId: true },
    });

    if (!patient) {
      return { success: false, error: "Patient not found" };
    }

    if (patient.organizationId !== originOrganizationId) {
      return {
        success: false,
        error: "Patient does not belong to the origin facility",
      };
    }

    // Verify referrer exists and belongs to origin facility
    const referrer = await prisma.user.findUnique({
      where: { id: referredByUserId },
      select: { id: true, organizationId: true, role: true },
    });

    if (!referrer) {
      return { success: false, error: "Referrer user not found" };
    }

    if (referrer.organizationId !== originOrganizationId) {
      return { success: false, error: "Referrer does not belong to origin facility" };
    }

    // Determine routing status
    let routingStatus: RoutingStatus = "INTERNAL";
    if (destinationOrganizationId) {
      routingStatus = "PENDING_EXTERNAL_DISPATCH";
    }

    // Create diagnostic order
    const order = await prisma.diagnosticOrder.create({
      data: {
        patientId,
        originOrganizationId,
        destinationOrganizationId: destinationOrganizationId || undefined,
        referredByUserId,
        routingStatus,
        diagnosticType,
        clinicalIndication: clinicalIndication || null,
        priority,
        expectedTurnaroundTime: expectedTurnaroundTime || null,
        orderDetails: orderDetails || null,
      },
    });

    // Audit log: cross-facility dispatch
    if (destinationOrganizationId) {
      const originOrg = await prisma.organization.findUnique({
        where: { id: originOrganizationId },
        select: { serviceType: true },
      });

      const destOrg = await prisma.organization.findUnique({
        where: { id: destinationOrganizationId },
        select: { serviceType: true },
      });

      await auditCrossFacilityAccess({
        userId: referredByUserId,
        employeeName: referrer.fullName || "Unknown",
        organizationId: originOrganizationId,
        patientId,
        userRole: normalizedRole as Role,
        facilityServiceType: originOrg?.serviceType,
        actionType: "CROSS_FACILITY_ACCESS" as MedicalAuditLogAction,
        emergency: false,
        metadata: {
          orderType: "DIAGNOSTIC_DISPATCH",
          destinationOrgId: destinationOrganizationId,
          destinationFacilityType: destOrg?.serviceType,
          diagnosticType,
        },
      });
    }

    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error("[dispatchExternalOrder] error:", error);
    return { success: false, error: error.message || "Failed to dispatch external order" };
  }
}

/**
 * Retrieve incoming external diagnostic orders for a destination facility
 * Only accessible to ADMIN_ROLES or LAB_ROLES users at the destination
 */
export async function getIncomingOrders(params: {
  destinationOrganizationId: string;
  requesterUserId: string;
  requesterRole: Role | string;
  patientNationalId?: string | null;
  routingStatus?: RoutingStatus;
}): Promise<any[]> {
  const {
    destinationOrganizationId,
    requesterUserId,
    requesterRole,
    patientNationalId,
    routingStatus,
  } = params;

  // Verify requester is authorized (ADMIN or LAB roles)
  const normalizedRole = normalizeHealthcareRole(requesterRole);
  const isAuthorized =
    normalizedRole === "IT_HIS_ADMIN" ||
    normalizedRole === "HOSPITAL_CEO" ||
    normalizedRole === "LABORATORY_TECHNICIAN" ||
    normalizedRole === "LABORATORY_TECHNOLOGIST";

  if (!isAuthorized) {
    throw new Error(
      `Role ${normalizedRole} is not authorized to view incoming diagnostic orders. Only admins and lab staff can access.`
    );
  }

  // Verify requester belongs to destination organization
  const requester = await prisma.user.findUnique({
    where: { id: requesterUserId },
    select: { organizationId: true },
  });

  if (!requester || requester.organizationId !== destinationOrganizationId) {
    throw new Error("Requester does not belong to the destination facility");
  }

  // Build query filters
  const where: any = {
    OR: [
      { destinationOrganizationId },
      { destinationOrganizationId: null }, // Open-routed orders
    ],
  };

  if (routingStatus) {
    where.routingStatus = routingStatus;
  }

  if (patientNationalId) {
    where.patient = { nationalId: patientNationalId };
  }

  // Fetch matching orders
  const orders = await prisma.diagnosticOrder.findMany({
    where,
    include: {
      patient: {
        select: {
          id: true,
          healthId: true,
          nationalId: true,
          fullName: true,
          age: true,
          sex: true,
          organizationId: true,
        },
      },
      originOrganization: {
        select: { id: true, name: true, serviceType: true },
      },
      referredByUser: {
        select: { id: true, fullName: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Audit log: incoming order access
  if (orders.length > 0) {
    const destOrg = await prisma.organization.findUnique({
      where: { id: destinationOrganizationId },
      select: { serviceType: true },
    });

    // Aggregate origins for audit log
    const originOrgIds = new Set(
      orders
        .map((o) => o.originOrganization?.id)
        .filter(Boolean)
    );

    for (const originOrgId of originOrgIds) {
      const originOrg = await prisma.organization.findUnique({
        where: { id: originOrgId! },
        select: { serviceType: true },
      });

      await auditCrossFacilityAccess({
        userId: requesterUserId,
        employeeName: requester ? "Lab/Admin User" : "Unknown",
        organizationId: destinationOrganizationId,
        patientId: orders[0]?.patientId || "BATCH_QUERY",
        userRole: normalizedRole as Role,
        facilityServiceType: destOrg?.serviceType,
        actionType: "VIEW_RECORD" as MedicalAuditLogAction,
        emergency: false,
        metadata: {
          queryType: "INCOMING_ORDERS",
          originFacilityId: originOrgId,
          originFacilityType: originOrg?.serviceType,
          ordersCount: orders.length,
        },
      });
    }
  }

  return orders;
}

/**
 * Accept an incoming diagnostic order at the destination facility
 */
export async function acceptExternalOrder(params: {
  diagnosticOrderId: string;
  destinationOrganizationId: string;
  acceptedByUserId: string;
  acceptedByRole: Role | string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      diagnosticOrderId,
      destinationOrganizationId,
      acceptedByUserId,
      acceptedByRole,
      notes,
    } = params;

    // Verify order exists and belongs to destination
    const order = await prisma.diagnosticOrder.findUnique({
      where: { id: diagnosticOrderId },
      include: {
        patient: true,
        originOrganization: { select: { serviceType: true } },
      },
    });

    if (!order) {
      return { success: false, error: "Diagnostic order not found" };
    }

    if (
      order.destinationOrganizationId &&
      order.destinationOrganizationId !== destinationOrganizationId
    ) {
      return { success: false, error: "Order is not designated for this facility" };
    }

    // Verify accepter is authorized
    const normalizedRole = normalizeHealthcareRole(acceptedByRole);
    const isAuthorized =
      normalizedRole === "IT_HIS_ADMIN" ||
      normalizedRole === "HOSPITAL_CEO" ||
      normalizedRole === "LABORATORY_TECHNICIAN" ||
      normalizedRole === "LABORATORY_TECHNOLOGIST";

    if (!isAuthorized) {
      return {
        success: false,
        error: `Role ${normalizedRole} is not authorized to accept external orders`,
      };
    }

    // Update order status
    const updatedOrder = await prisma.diagnosticOrder.update({
      where: { id: diagnosticOrderId },
      data: {
        routingStatus: "ACCEPTED_BY_EXTERNAL",
        acceptedAt: new Date(),
        destinationNotes: notes || null,
        destinationOrganizationId, // Ensure destination is set
      },
    });

    // Audit log: order acceptance
    const destOrg = await prisma.organization.findUnique({
      where: { id: destinationOrganizationId },
      select: { serviceType: true },
    });

    await auditCrossFacilityAccess({
      userId: acceptedByUserId,
      employeeName: "Lab/Admin Staff",
      organizationId: destinationOrganizationId,
      patientId: order.patientId,
      userRole: normalizedRole as Role,
      facilityServiceType: destOrg?.serviceType,
      actionType: "CROSS_FACILITY_ACCESS" as MedicalAuditLogAction,
      emergency: false,
      metadata: {
        orderType: "DIAGNOSTIC_ACCEPT",
        originFacilityId: order.originOrganizationId,
        originFacilityType: order.originOrganization?.serviceType,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("[acceptExternalOrder] error:", error);
    return { success: false, error: error.message || "Failed to accept external order" };
  }
}

/**
 * Reject an incoming diagnostic order at the destination facility
 */
export async function rejectExternalOrder(params: {
  diagnosticOrderId: string;
  destinationOrganizationId: string;
  rejectedByUserId: string;
  rejectedByRole: Role | string;
  rejectionReason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      diagnosticOrderId,
      destinationOrganizationId,
      rejectedByUserId,
      rejectedByRole,
      rejectionReason,
    } = params;

    // Verify order exists
    const order = await prisma.diagnosticOrder.findUnique({
      where: { id: diagnosticOrderId },
    });

    if (!order) {
      return { success: false, error: "Diagnostic order not found" };
    }

    // Verify requester is authorized
    const normalizedRole = normalizeHealthcareRole(rejectedByRole);
    const isAuthorized =
      normalizedRole === "IT_HIS_ADMIN" ||
      normalizedRole === "HOSPITAL_CEO" ||
      normalizedRole === "LABORATORY_TECHNICIAN" ||
      normalizedRole === "LABORATORY_TECHNOLOGIST";

    if (!isAuthorized) {
      return {
        success: false,
        error: `Role ${normalizedRole} is not authorized to reject external orders`,
      };
    }

    // Update order status
    await prisma.diagnosticOrder.update({
      where: { id: diagnosticOrderId },
      data: {
        routingStatus: "REJECTED_BY_EXTERNAL",
        destinationNotes: rejectionReason,
      },
    });

    // Audit log: order rejection
    const destOrg = await prisma.organization.findUnique({
      where: { id: destinationOrganizationId },
      select: { serviceType: true },
    });

    await auditCrossFacilityAccess({
      userId: rejectedByUserId,
      employeeName: "Lab/Admin Staff",
      organizationId: destinationOrganizationId,
      patientId: order.patientId,
      userRole: normalizedRole as Role,
      facilityServiceType: destOrg?.serviceType,
      actionType: "CROSS_FACILITY_ACCESS" as MedicalAuditLogAction,
      emergency: false,
      metadata: {
        orderType: "DIAGNOSTIC_REJECT",
        originFacilityId: order.originOrganizationId,
        rejectionReason,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("[rejectExternalOrder] error:", error);
    return { success: false, error: error.message || "Failed to reject external order" };
  }
}
