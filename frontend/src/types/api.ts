/**
 * M1 Frontend — TypeScript API Models
 *
 * Baseline: docs/API-CONTRACT.md (commit 33a7555)
 * Conventions confirmed in commit d432451 (Decision D-003):
 *   - Opaque string IDs (id, orgId, programmeId, etc.)
 *   - ISO 8601 dates (registrationOpensAt, registrationClosesAt)
 *   - Money structure { amountMinor, currency: "INR" } in minor units (paise, ÷100 = ₹)
 *   - Integer gram quantities (quantityGrams, recordedGrams, etc.)
 *   - Distribution lifecycle: draft | confirmed | packed | collected | delivered
 *   - Documented committee cancellation action
 *   - Report exports format: xlsx | pdf
 *   - Batch allocation is proposed only; single allocation used
 */

export type {
  OrgStatus,
  InvitationStatus,
  Organisation,
  InvitationItem,
  PaginatedList,
  FeatureKey,
  OrgFeatures,
} from "../mocks/organisations.mock";

export type {
  ProgrammeStatus,
  Money,
  Programme,
  PublicProgramme,
} from "../mocks/programmes.mock";

export type { ApiError } from "../mocks/api-client.mock";

// ─── Enquiry Types (PUB08 / BEN07) ──────────────────────────────────────────

export interface EnquiryPayload {
  name: string;
  replyEmail: string;
  message: string;
}

export interface EnquiryResponse {
  id: string;
}

// ─── Registration & Decision Types (ADM04–ADM05) ────────────────────────────

export type RegistrationStatus = "submitted" | "approved" | "rejected" | "cancelled";

export interface RegistrationDecisionPayload {
  action: "approve" | "reject" | "cancel";
  reason?: string;
}

// ─── Distribution Lifecycle Types (ADM15 / VOL03) ───────────────────────────

export type DistributionStatus = "draft" | "confirmed" | "packed" | "collected" | "delivered";

export interface DistributionInventory {
  recordedGrams: number;
  allocatedGrams: number;
  availableGrams: number;
}

export interface DistributionAllocation {
  id: string; // opaque string
  recipientType: "household" | "beneficiary";
  recipientId: string; // opaque string
  quantityGrams: number; // integer grams
  collectionWindowId?: string; // opaque string
  status: DistributionStatus;
}

export interface DistributionTransitionPayload {
  action: "confirm" | "pack" | "cancel";
}

// ─── Reports & Exports Types (ADM17) ────────────────────────────────────────

export type ReportKind =
  | "registration"
  | "participant"
  | "animal"
  | "allocation"
  | "payment"
  | "expense"
  | "financial-summary";

export type ExportFormat = "xlsx" | "pdf";
