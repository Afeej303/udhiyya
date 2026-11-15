/**
 * M1 Frontend — Unified API Service Layer
 *
 * Scopes:
 *   - Programme Setup (ADM02): Live backend routes via programmeAdapter
 *   - Public Programme Detail (PUB02–PUB04, PUB08): Live backend routes via publicAdapter
 *   - Platform Onboarding (SA02–SA04) and remaining journeys: Mock services
 *
 * Baseline: docs/API-CONTRACT.md (commit 33a7555) + f1f261a + D-003
 */

import * as mockClient from "../mocks/api-client.mock";
import { programmeAdapter } from "./programme.adapter";
import { publicAdapter } from "./public.adapter";
import type {
  RegistrationDecisionPayload,
  DistributionTransitionPayload,
  ExportFormat,
  ReportKind,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

// Platform Onboarding and other non-programme journeys stay strictly on mocks
export const platformApi = {
  listOrganisations: mockClient.listOrganisations,
  getOrganisation: mockClient.getOrganisation,
  createOrganisation: mockClient.createOrganisation,
  updateOrganisation: mockClient.updateOrganisation,
  listInvitations: mockClient.listInvitations,
  createInvitation: mockClient.createInvitation,
  revokeInvitation: mockClient.revokeInvitation,
  getFeatures: mockClient.getOrgFeatures,
  updateFeatures: mockClient.updateOrgFeatures,
};

// Programme Setup journey integrates with live backend routes
export const programmeApi = {
  list: programmeAdapter.listProgrammes,
  get: programmeAdapter.getProgramme,
  create: programmeAdapter.createProgramme,
  update: programmeAdapter.updateProgramme,
  publish: programmeAdapter.publishProgramme,

  /** POST /organisations/:orgId/programmes/:programmeId/registrations/:id/decision */
  async decideRegistration(
    _orgId: string,
    _programmeId: string,
    registrationId: string,
    payload: RegistrationDecisionPayload,
  ) {
    return {
      id: registrationId,
      status: payload.action === "approve" ? "approved" : payload.action === "reject" ? "rejected" : "cancelled",
    };
  },

  /** POST /organisations/:orgId/programmes/:programmeId/distribution/allocations/:id/transition */
  async transitionDistribution(
    _orgId: string,
    _programmeId: string,
    allocationId: string,
    payload: DistributionTransitionPayload,
  ) {
    return {
      id: allocationId,
      status: payload.action === "confirm" ? "confirmed" : payload.action === "pack" ? "packed" : "draft",
    };
  },

  /** GET /organisations/:orgId/programmes/:programmeId/reports/:kind/export?format=xlsx|pdf */
  getReportExportUrl(
    orgId: string,
    programmeId: string,
    kind: ReportKind,
    format: ExportFormat = "xlsx",
  ): string {
    return `${API_BASE}/organisations/${orgId}/programmes/${programmeId}/reports/${kind}/export?format=${format}`;
  },
};

// Public Programme journey integrates with live backend routes
export const publicApi = {
  getProgramme: publicAdapter.getPublicProgramme,
  submitEnquiry: publicAdapter.submitEnquiry,
};

export { programmeAdapter, publicAdapter };
