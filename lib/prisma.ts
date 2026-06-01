/**
 * lib/prisma.ts
 *
 * Global Prisma Client singleton with multi-tenant row isolation engine.
 *
 * The client is extended with `prisma.$extends({ query: { ... } })` to
 * intercept reads, writes, and deletes on every tenant-bound model and
 * automatically scope them to the active session's organizationId.
 *
 * ─── Tenant-Bound Models ────────────────────────────────────────────────────
 *   Patient             — organizationId
 *   Vitals              — organizationId
 *   ClinicalExamination — organizationId
 *   Investigation       — organizationId
 *   Prescription        — organizationId
 *   DiagnosticOrder     — OR(originOrganizationId, destinationOrganizationId)
 *
 * ─── Bypass Flag ────────────────────────────────────────────────────────────
 * Attach `__bypassTenantFilter: true` (via the CROSS_FACILITY spread from
 * tenantContext.ts) to any `where` clause to skip org injection entirely.
 * The extension strips this private key before forwarding to the DB driver.
 *
 * ─── Intercepted Operations ─────────────────────────────────────────────────
 *   findMany · findFirst · findFirstOrThrow · count
 *   update   · updateMany
 *   delete   · deleteMany
 *   create   — stamps organizationId on new records automatically
 *
 * Connection Timeout: 5 s connect / 8 s socket — fail fast instead of hanging.
 */

import { PrismaClient } from "@prisma/client";
import { getTenantContextOrNull } from "@/lib/utils/tenantContext";

// ─── Connection Timeouts ─────────────────────────────────────────────────────

const CONNECT_TIMEOUT_MS = 5_000;
const SOCKET_TIMEOUT_MS = 8_000;

/** Append timeout query params preserving any existing query string. */
function buildDatasourceUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Add a value to `.env` or `.env.local` in the project root (must start with "mongodb://" or "mongodb+srv://").'
    );
  }
  if (!raw.startsWith("mongodb://") && !raw.startsWith("mongodb+srv://")) {
    throw new Error(
      'DATABASE_URL must start with "mongodb://" or "mongodb+srv://". Prisma MongoDB does not accept other providers.'
    );
  }
  const joiner = raw.includes("?") ? "&" : "?";
  return `${raw}${joiner}connectTimeoutMS=${CONNECT_TIMEOUT_MS}&socketTimeoutMS=${SOCKET_TIMEOUT_MS}&serverSelectionTimeoutMS=${CONNECT_TIMEOUT_MS}`;
}

// ─── Base Client ─────────────────────────────────────────────────────────────

function buildBaseClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: buildDatasourceUrl() } },
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

// ─── Bypass Flag ─────────────────────────────────────────────────────────────

const BYPASS_FLAG = "__bypassTenantFilter";

/**
 * Extracts the bypass flag from a where object.
 * Returns { bypass: boolean, cleanWhere: Record } with the flag stripped.
 */
function extractBypass(where: Record<string, unknown> | undefined): {
  bypass: boolean;
  cleanWhere: Record<string, unknown>;
} {
  if (!where) return { bypass: false, cleanWhere: {} };
  const { [BYPASS_FLAG]: flag, ...rest } = where;
  return { bypass: flag === true, cleanWhere: rest };
}

// ─── Core Org Filter Logic ───────────────────────────────────────────────────
//
// IMPORTANT: In Prisma $extends query hooks, the function receives:
//   { model, operation, args, query }
// where `args` is the QUERY's argument object (where, data, select, …),
// and `query` is the next function in the pipeline to call with modified args.
// Do NOT spread the hook params into query() — only pass `args`.

/**
 * applyStandardOrgFilter
 *
 * Used for: Patient, Vitals, ClinicalExamination, Investigation, Prescription.
 * Injects `organizationId` into where (reads/updates/deletes) or data (create).
 */
async function applyStandardOrgFilter(
  operation: string,
  args: any,
  query: (a: any) => Promise<unknown>,
  modelName: string = "patient"
): Promise<unknown> {
  const ctx = await getTenantContextOrNull();

  // No session context (public route, build-time SSG, system task) — pass through
  if (!ctx) {
    const where = args.where as Record<string, unknown> | undefined;
    const { cleanWhere } = extractBypass(where);
    return query({ ...args, where: cleanWhere });
  }

  const { organizationId } = ctx;

  // ── Bypass: strip the private flag and execute globally ───────────────────
  const where = args.where as Record<string, unknown> | undefined;
  const { bypass, cleanWhere } = extractBypass(where);
  if (bypass) return query({ ...args, where: cleanWhere });

  // ── Create: stamp organizationId on new records ───────────────────────────
  if (operation === "create") {
    const existingData = (args.data as Record<string, unknown>) ?? {};
    // Only stamp if not already explicitly provided by the caller
    if (!existingData.organizationId) {
      return query({ ...args, data: { organizationId, ...existingData } });
    }
    return query(args);
  }

  // ── Scoped unique reads fallback: convert to findFirst/findFirstOrThrow ───
  if (operation === "findUnique") {
    return (prisma as any)[modelName].findFirst({ ...args, where: { ...cleanWhere, organizationId } });
  }
  if (operation === "findUniqueOrThrow") {
    return (prisma as any)[modelName].findFirstOrThrow({ ...args, where: { ...cleanWhere, organizationId } });
  }

  // ── Reads & scoped writes: inject organizationId into where ───────────────
  return query({ ...args, where: { ...cleanWhere, organizationId } });
}

/**
 * applyDiagnosticOrderOrgFilter
 *
 * DiagnosticOrder uses dual-org fields: a facility may be the origin (sender)
 * OR the destination (receiver) of a cross-facility order.
 * Reads and updates scope to OR(originOrganizationId, destinationOrganizationId).
 * Creates stamp originOrganizationId.
 */
async function applyDiagnosticOrderOrgFilter(
  operation: string,
  args: any,
  query: (a: any) => Promise<unknown>
): Promise<unknown> {
  const ctx = await getTenantContextOrNull();
  if (!ctx) {
    const where = args.where as Record<string, unknown> | undefined;
    const { cleanWhere } = extractBypass(where);
    return query({ ...args, where: cleanWhere });
  }

  const { organizationId } = ctx;

  const where = args.where as Record<string, unknown> | undefined;
  const { bypass, cleanWhere } = extractBypass(where);
  if (bypass) return query({ ...args, where: cleanWhere });

  if (operation === "create") {
    const existingData = (args.data as Record<string, unknown>) ?? {};
    if (!existingData.originOrganizationId) {
      return query({
        ...args,
        data: { originOrganizationId: organizationId, ...existingData },
      });
    }
    return query(args);
  }

  // For reads and writes: facility is origin OR destination
  return query({
    ...args,
    where: {
      ...cleanWhere,
      OR: [
        { originOrganizationId: organizationId },
        { destinationOrganizationId: organizationId },
      ],
    },
  });
}

// ─── Extension Builder ────────────────────────────────────────────────────────

function buildExtension(base: PrismaClient) {
  return base.$extends({
    query: {
      // ── Patient ────────────────────────────────────────────────────────────
      patient: {
        findMany:          async ({ args, query }) => applyStandardOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyStandardOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyStandardOrgFilter("findFirstOrThrow", args, query),
        findUnique:        async ({ args, query }) => applyStandardOrgFilter("findUnique",        args, query, "patient"),
        findUniqueOrThrow: async ({ args, query }) => applyStandardOrgFilter("findUniqueOrThrow", args, query, "patient"),
        count:             async ({ args, query }) => applyStandardOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyStandardOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyStandardOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyStandardOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyStandardOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyStandardOrgFilter("deleteMany",       args, query),
      },

      // ── Vitals ─────────────────────────────────────────────────────────────
      vitals: {
        findMany:          async ({ args, query }) => applyStandardOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyStandardOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyStandardOrgFilter("findFirstOrThrow", args, query),
        count:             async ({ args, query }) => applyStandardOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyStandardOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyStandardOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyStandardOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyStandardOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyStandardOrgFilter("deleteMany",       args, query),
      },

      // ── ClinicalExamination ────────────────────────────────────────────────
      clinicalExamination: {
        findMany:          async ({ args, query }) => applyStandardOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyStandardOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyStandardOrgFilter("findFirstOrThrow", args, query),
        count:             async ({ args, query }) => applyStandardOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyStandardOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyStandardOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyStandardOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyStandardOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyStandardOrgFilter("deleteMany",       args, query),
      },

      // ── Investigation ──────────────────────────────────────────────────────
      investigation: {
        findMany:          async ({ args, query }) => applyStandardOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyStandardOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyStandardOrgFilter("findFirstOrThrow", args, query),
        count:             async ({ args, query }) => applyStandardOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyStandardOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyStandardOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyStandardOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyStandardOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyStandardOrgFilter("deleteMany",       args, query),
      },

      // ── Prescription ───────────────────────────────────────────────────────
      prescription: {
        findMany:          async ({ args, query }) => applyStandardOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyStandardOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyStandardOrgFilter("findFirstOrThrow", args, query),
        count:             async ({ args, query }) => applyStandardOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyStandardOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyStandardOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyStandardOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyStandardOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyStandardOrgFilter("deleteMany",       args, query),
      },

      // ── DiagnosticOrder (dual-org OR clause) ───────────────────────────────
      diagnosticOrder: {
        findMany:          async ({ args, query }) => applyDiagnosticOrderOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyDiagnosticOrderOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyDiagnosticOrderOrgFilter("findFirstOrThrow", args, query),
        count:             async ({ args, query }) => applyDiagnosticOrderOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyDiagnosticOrderOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyDiagnosticOrderOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyDiagnosticOrderOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyDiagnosticOrderOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyDiagnosticOrderOrgFilter("deleteMany",       args, query),
      },

      // ── LabRequest ─────────────────────────────────────────────────────────
      labRequest: {
        findMany:          async ({ args, query }) => applyStandardOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyStandardOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyStandardOrgFilter("findFirstOrThrow", args, query),
        findUnique:        async ({ args, query }) => applyStandardOrgFilter("findUnique",        args, query, "labRequest"),
        findUniqueOrThrow: async ({ args, query }) => applyStandardOrgFilter("findUniqueOrThrow", args, query, "labRequest"),
        count:             async ({ args, query }) => applyStandardOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyStandardOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyStandardOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyStandardOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyStandardOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyStandardOrgFilter("deleteMany",       args, query),
      },

      // ── LabTestTemplate ────────────────────────────────────────────────────
      labTestTemplate: {
        findMany:          async ({ args, query }) => applyStandardOrgFilter("findMany",         args, query),
        findFirst:         async ({ args, query }) => applyStandardOrgFilter("findFirst",        args, query),
        findFirstOrThrow:  async ({ args, query }) => applyStandardOrgFilter("findFirstOrThrow", args, query),
        findUnique:        async ({ args, query }) => applyStandardOrgFilter("findUnique",        args, query, "labTestTemplate"),
        findUniqueOrThrow: async ({ args, query }) => applyStandardOrgFilter("findUniqueOrThrow", args, query, "labTestTemplate"),
        count:             async ({ args, query }) => applyStandardOrgFilter("count",            args, query),
        create:            async ({ args, query }) => applyStandardOrgFilter("create",           args, query),
        update:            async ({ args, query }) => applyStandardOrgFilter("update",           args, query),
        updateMany:        async ({ args, query }) => applyStandardOrgFilter("updateMany",       args, query),
        delete:            async ({ args, query }) => applyStandardOrgFilter("delete",           args, query),
        deleteMany:        async ({ args, query }) => applyStandardOrgFilter("deleteMany",       args, query),
      },
    },
  });
}

// ─── Singleton ────────────────────────────────────────────────────────────────

type ExtendedPrismaClient = ReturnType<typeof buildExtension>;

declare global {
  // eslint-disable-next-line no-var
  var _prismaGlobal: ExtendedPrismaClient | undefined;
}

function createExtendedClient(): ExtendedPrismaClient {
  return buildExtension(buildBaseClient());
}

export const prisma: ExtendedPrismaClient =
  globalThis._prismaGlobal ?? createExtendedClient();

if (process.env.NODE_ENV !== "production") {
  globalThis._prismaGlobal = prisma;
}

export default prisma;
