/**
 * EF-05: Household Intelligence – Service Layer
 * Owned by M3. Loaded via M2's flag-guarded extension hook.
 * Flag: FEATURE_EF_05 (default off)
 *
 * Capabilities:
 * 1. Detects duplicate household clusters for a programme using:
 *    - PHONE_EXACT: identical normalized contact phone
 *    - EMAIL_EXACT: identical lower-cased contact email
 *    - NAME_FUZZY: Levenshtein-similar contact names (MEDIUM)
 *    - ADDRESS_FUZZY: token-overlap-similar addresses (MEDIUM)
 * 2. Union-find clustering with confidence scores and reasons.
 * 3. Ephemeral resolution state (dismiss or flag).
 */

export interface ApplicantHousehold {
  id: string;
  programmeId: string;
  name: string;
  address: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface PrismaLike {
  programme: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string } | null>;
  };
  applicantHousehold: {
    findMany: (args: { where: { programmeId: string } }) => Promise<ApplicantHousehold[]>;
  };
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DuplicateCluster {
  clusterId: string;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  matchingReasons: string[];
  householdIds: string[];
  households: ApplicantHousehold[];
  status: 'open' | 'dismissed' | 'flagged_for_review';
  resolvedAt: string | null;
  resolvedNote: string | null;
}

export interface DetectionResult {
  programmeId: string;
  totalHouseholds: number;
  totalClusters: number;
  clusters: DuplicateCluster[];
  generatedAt: string;
}

export interface ResolveInput {
  clusterId: string;
  action: 'dismiss' | 'flag_for_review';
  note?: string;
  programmeId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEIGHTS: Record<string, number> = {
  PHONE_EXACT: 60,
  EMAIL_EXACT: 55,
  NAME_FUZZY: 30,
  ADDRESS_FUZZY: 20,
};

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function normalizeText(raw: string | null | undefined): string {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[m][n];
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeText(a), nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const tokensA = new Set(na.split(' ')), tokensB = new Set(nb.split(' '));
  let shared = 0;
  for (const t of tokensA) if (tokensB.has(t)) shared++;
  const tokenRatio = shared / Math.max(tokensA.size, tokensB.size);
  const maxLen = Math.max(na.length, nb.length);
  const editRatio = 1 - levenshtein(na, nb) / maxLen;
  return Math.max(tokenRatio, editRatio);
}

export function addressSimilarity(a: string, b: string): number {
  const ta = normalizeText(a).split(' ').filter(Boolean);
  const tb = normalizeText(b).split(' ').filter(Boolean);
  if (ta.length === 0 || tb.length === 0) return 0;
  const setA = new Set(ta), setB = new Set(tb);
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : shared / union;
}

export function scorePair(a: ApplicantHousehold, b: ApplicantHousehold): { score: number; reasons: string[] } {
  let score = 0, reasons: string[] = [];
  const phoneA = normalizePhone(a.contactPhone), phoneB = normalizePhone(b.contactPhone);
  if (phoneA && phoneB && phoneA.length >= 8 && phoneA === phoneB) { score += WEIGHTS.PHONE_EXACT; reasons.push('PHONE_EXACT'); }
  const emailA = String(a.contactEmail || '').trim().toLowerCase();
  const emailB = String(b.contactEmail || '').trim().toLowerCase();
  if (emailA && emailB && emailA === emailB) { score += WEIGHTS.EMAIL_EXACT; reasons.push('EMAIL_EXACT'); }
  if (nameSimilarity(a.name, b.name) >= 0.75) { score += WEIGHTS.NAME_FUZZY; reasons.push('NAME_FUZZY'); }
  if (addressSimilarity(a.address, b.address) >= 0.5) { score += WEIGHTS.ADDRESS_FUZZY; reasons.push('ADDRESS_FUZZY'); }
  return score < 30 ? { score: 0, reasons: [] } : { score: Math.min(score, 99), reasons };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class HouseholdIntelligenceService {
  private readonly prisma: PrismaLike;
  private readonly resolutions = new Map<string, { action: 'dismiss' | 'flag_for_review'; note: string; resolvedAt: string }>();
  private lastProgrammeId: string | null = null;

  constructor(prisma?: PrismaLike) {
    this.prisma = prisma || {
      programme: { findUnique: async () => null },
      applicantHousehold: { findMany: async () => [] },
    };
  }

  public async detectDuplicates(programmeId: string): Promise<DetectionResult> {
    this.lastProgrammeId = programmeId;
    const programme = await this.prisma.programme.findUnique({ where: { id: programmeId } });
    if (!programme) throw new Error(`Programme with ID ${programmeId} not found`);
    const households = await this.prisma.applicantHousehold.findMany({ where: { programmeId } });
    const edges: Array<{ a: string; b: string; score: number; reasons: string[] }> = [];
    for (let i = 0; i < households.length; i++) {
      for (let j = i + 1; j < households.length; j++) {
        const { score, reasons } = scorePair(households[i], households[j]);
        if (score > 0) edges.push({ a: households[i].id, b: households[j].id, score, reasons });
      }
    }
    const parent = new Map<string, string>();
    const findRoot = (x: string): string => {
      const root = parent.get(x) ?? x;
      if (root !== x) parent.set(x, findRoot(root));
      return root;
    };
    const union = (x: string, y: string) => { const rx = findRoot(x), ry = findRoot(y); if (rx !== ry) parent.set(rx, ry); };
    for (const e of edges) union(e.a, e.b);
    const groups = new Map<string, ApplicantHousehold[]>();
    for (const h of households) {
      const root = findRoot(h.id);
      const list = groups.get(root) || []; list.push(h); groups.set(root, list);
    }
    const clusters: DuplicateCluster[] = [];
    for (const members of groups.values()) {
      if (members.length < 2) continue;
      let best = 0; const reasonSet = new Set<string>();
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const edge = edges.find(e => (e.a === members[i].id && e.b === members[j].id) || (e.a === members[j].id && e.b === members[i].id));
          if (edge) { best = Math.max(best, edge.score); for (const r of edge.reasons) reasonSet.add(r); }
        }
      }
      const ids = members.map(m => m.id).sort();
      clusters.push({
        clusterId: `dup-${ids.join('-')}`,
        confidenceScore: best,
        confidenceLevel: best >= 70 ? 'HIGH' : best >= 40 ? 'MEDIUM' : 'LOW',
        matchingReasons: Array.from(reasonSet),
        householdIds: ids,
        households: members,
        status: 'open',
        resolvedAt: null,
        resolvedNote: null,
      });
    }
    clusters.sort((x, y) => y.confidenceScore - x.confidenceScore);
    for (const c of clusters) {
      const r = this.resolutions.get(c.clusterId);
      if (r) { c.status = r.action === 'dismiss' ? 'dismissed' : 'flagged_for_review'; c.resolvedNote = r.note || null; c.resolvedAt = r.resolvedAt; }
    }
    return { programmeId, totalHouseholds: households.length, totalClusters: clusters.length, clusters, generatedAt: new Date().toISOString() };
  }

  public async resolveDuplicate(input: ResolveInput): Promise<DuplicateCluster> {
    const { clusterId, action, note, programmeId } = input;
    if (action !== 'dismiss' && action !== 'flag_for_review') throw new Error('INVALID_ACTION');
    const pid = programmeId || this.lastProgrammeId;
    if (!pid) throw new Error('NO_PROGRAMME_CONTEXT');
    const res = await this.detectDuplicates(pid);
    const target = res.clusters.find(c => c.clusterId === clusterId);
    if (!target) throw new Error(`Duplicate cluster ${clusterId} not found`);
    this.resolutions.set(clusterId, { action, note: note || '', resolvedAt: new Date().toISOString() });
    target.status = action === 'dismiss' ? 'dismissed' : 'flagged_for_review';
    target.resolvedNote = note || null;
    target.resolvedAt = this.resolutions.get(clusterId)!.resolvedAt;
    return target;
  }
}
