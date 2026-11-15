/**
 * M1 Frontend — Unified API Service Layer
 *
 * Dispatches to dual-mode API client (Mock / Live NestJS)
 * with Supabase Bearer token support.
 *
 * Baseline: docs/API-CONTRACT.md (commit 33a7555)
 * Field conventions confirmed: Decision D-003 (commit d432451)
 */

import * as client from "../mocks/api-client.mock";
import { getAuthToken } from "./auth";
import type {
  RegistrationDecisionPayload,
  DistributionTransitionPayload,
  ExportFormat,
  ReportKind,
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";
const IS_MOCK = import.meta.env.VITE_USE_MOCK_API === "true" || !import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({
      statusCode: response.status,
      error: response.statusText,
      message: `HTTP error ${response.status}`,
    }));
    throw body;
  }

  return response.json();
}

export const platformApi = {
  listOrganisations: client.listOrganisations,
  getOrganisation: client.getOrganisation,
  createOrganisation: client.createOrganisation,
  updateOrganisation: client.updateOrganisation,
  listInvitations: client.listInvitations,
  createInvitation: client.createInvitation,
  revokeInvitation: client.revokeInvitation,
  getFeatures: client.getOrgFeatures,
  updateFeatures: client.updateOrgFeatures,
};

export const programmeApi = {
  list: client.listProgrammes,
  get: client.getProgramme,
  create: client.createProgramme,
  update: client.updateProgramme,
  publish: client.publishProgramme,

  /** POST /organisations/:orgId/programmes/:programmeId/registrations/:id/decision */
  async decideRegistration(
    orgId: string,
    programmeId: string,
    registrationId: string,
    payload: RegistrationDecisionPayload,
  ) {
    if (IS_MOCK) {
      return { id: registrationId, status: payload.action === "approve" ? "approved" : payload.action === "reject" ? "rejected" : "cancelled" };
    }
    return request(`/organisations/${orgId}/programmes/${programmeId}/registrations/${registrationId}/decision`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** POST /organisations/:orgId/programmes/:programmeId/distribution/allocations/:id/transition */
  async transitionDistribution(
    orgId: string,
    programmeId: string,
    allocationId: string,
    payload: DistributionTransitionPayload,
  ) {
    if (IS_MOCK) {
      return { id: allocationId, status: payload.action === "confirm" ? "confirmed" : payload.action === "pack" ? "packed" : "draft" };
    }
    return request(`/organisations/${orgId}/programmes/${programmeId}/distribution/allocations/${allocationId}/transition`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
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

export const publicApi = {
  getProgramme: client.getPublicProgramme,
  submitEnquiry: client.submitEnquiry,
};

export { client as apiClient };
