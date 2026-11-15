/**
 * M1 Frontend Mock — Organisations
 *
 * Derived from API contract commit 33a7555:
 *   GET /platform/organisations → { items: Organisation[], nextCursor }
 *   GET /platform/organisations/:orgId → Organisation
 *   GET /platform/organisations/:orgId/invitations → { items: InvitationItem[], nextCursor }
 *
 * Owner: M1 — do not edit M2-owned API-CONTRACT.md.
 * Keep in sync with docs/API-CONTRACT.md payload examples.
 *
 * OPEN GAPS (see FRONTEND-NEEDS.md Section 6):
 *   GAP-01 — Re-send invitation endpoint not defined
 *   GAP-02 — Status transition table not provided
 *   GAP-04 — Feature key casing not confirmed (using title-case from canvas-saas-suite prototype)
 *   GAP-07 — frontend-auth.md not yet provided
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrgStatus = "onboarding" | "active" | "suspended" | "closed";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type Organisation = {
  id: string;
  name: string;
  locality: string;
  contact: { email: string };
  status: OrgStatus;
};

export type InvitationItem = {
  id: string;
  name: string;
  email: string;
  status: InvitationStatus;
};

export type PaginatedList<T> = {
  items: T[];
  nextCursor: string | null;
};

// Agreed feature keys — ASSUMED title-case pending GAP-04 confirmation from M2
export const FEATURE_KEYS = [
  "Registration",
  "Households",
  "Finance",
  "Volunteers",
  "Distribution",
  "Reports",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type OrgFeatures = {
  enabledFeatures: FeatureKey[];
};

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** GET /platform/organisations → PaginatedList<Organisation> */
export const mockOrganisationsList: PaginatedList<Organisation> = {
  items: [
    {
      id: "org_noor",
      name: "Noor Mahallu",
      locality: "Kozhikode, Kerala",
      contact: { email: "office@noor.example" },
      status: "active",
    },
    {
      id: "org_alhuda",
      name: "Al Huda Mosque",
      locality: "Malappuram, Kerala",
      contact: { email: "office@alhuda.example" },
      status: "onboarding",
    },
    {
      id: "org_rahma",
      name: "Rahma Aḍḥiyah Committee",
      locality: "Kannur, Kerala",
      contact: { email: "office@rahma.example" },
      status: "active",
    },
    {
      id: "org_eastward",
      name: "East Ward Mahallu",
      locality: "Thrissur, Kerala",
      contact: { email: "office@eastward.example" },
      status: "suspended",
    },
  ],
  nextCursor: null,
};

/** GET /platform/organisations/:orgId → Organisation (detail includes contact) */
export const mockOrganisationDetail: Record<string, Organisation> = {
  org_noor: {
    id: "org_noor",
    name: "Noor Mahallu",
    locality: "Kozhikode, Kerala",
    contact: { email: "office@noor.example" },
    status: "active",
  },
  org_alhuda: {
    id: "org_alhuda",
    name: "Al Huda Mosque",
    locality: "Malappuram, Kerala",
    contact: { email: "office@alhuda.example" },
    status: "onboarding",
  },
  org_rahma: {
    id: "org_rahma",
    name: "Rahma Aḍḥiyah Committee",
    locality: "Kannur, Kerala",
    contact: { email: "office@rahma.example" },
    status: "active",
  },
  org_eastward: {
    id: "org_eastward",
    name: "East Ward Mahallu",
    locality: "Thrissur, Kerala",
    contact: { email: "office@eastward.example" },
    status: "suspended",
  },
};

/** GET /platform/organisations/:orgId/invitations → PaginatedList<InvitationItem> */
export const mockInvitations: Record<string, PaginatedList<InvitationItem>> = {
  org_noor: {
    items: [
      { id: "inv_001", name: "Amina Rahman", email: "amina@noor.example", status: "accepted" },
    ],
    nextCursor: null,
  },
  org_alhuda: {
    items: [
      { id: "inv_002", name: "Faisal Ali", email: "faisal@alhuda.example", status: "pending" },
    ],
    nextCursor: null,
  },
  org_rahma: {
    items: [
      { id: "inv_003", name: "Sara Nizar", email: "sara@rahma.example", status: "accepted" },
    ],
    nextCursor: null,
  },
  org_eastward: {
    items: [
      { id: "inv_004", name: "Nabeel Hassan", email: "nabeel@eastward.example", status: "accepted" },
    ],
    nextCursor: null,
  },
};

/** GET /platform/organisations/:orgId/features → OrgFeatures */
export const mockOrgFeatures: Record<string, OrgFeatures> = {
  org_noor: { enabledFeatures: [...FEATURE_KEYS] },
  org_alhuda: { enabledFeatures: ["Registration", "Households", "Distribution"] },
  org_rahma: { enabledFeatures: [...FEATURE_KEYS] },
  org_eastward: { enabledFeatures: ["Registration", "Households"] },
};

// ─── Error responses (mirror API contract error shape) ─────────────────────────

/** Example 409 from POST /platform/organisations (org already exists — not applicable here but pattern shows error shape) */
export const mockConflictError = {
  statusCode: 409,
  error: "Conflict",
  message: "An organisation with this name already exists in this locality",
  code: "ORGANISATION_CONFLICT",
  timestamp: "2027-01-01T00:00:00.000Z",
  path: "/platform/organisations",
};

/** Example 400 from POST /platform/organisations/:orgId/invitations */
export const mockInvitationConflictError = {
  statusCode: 409,
  error: "Conflict",
  message: "An invitation is already pending for this address",
  code: "INVITATION_PENDING",
  timestamp: "2027-01-01T00:00:00.000Z",
  path: "/platform/organisations/org_alhuda/invitations",
};
