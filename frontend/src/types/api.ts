/**
 * M1 Frontend — TypeScript API Models
 *
 * Baseline: docs/API-CONTRACT.md (commit 33a7555)
 * Reference: docs/FRONTEND-NEEDS.md
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

export interface EnquiryPayload {
  name: string;
  replyEmail: string;
  message: string;
}

export interface EnquiryResponse {
  id: string;
}

export type { ApiError } from "../mocks/api-client.mock";
