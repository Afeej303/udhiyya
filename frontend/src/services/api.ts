/**
 * M1 Frontend — Unified API Service Layer
 *
 * Dispatches to dual-mode API client (Mock / Live NestJS)
 * with Supabase Bearer token support.
 *
 * Baseline: docs/API-CONTRACT.md (commit 33a7555)
 */

import * as client from "../mocks/api-client.mock";

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
};

export const publicApi = {
  getProgramme: client.getPublicProgramme,
  submitEnquiry: client.submitEnquiry,
};

export { client as apiClient };
