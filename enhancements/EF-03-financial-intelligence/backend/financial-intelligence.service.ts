/**
 * EF-03: Financial Intelligence – Service Layer
 * Owned by M3. Loaded via M2's flag-guarded extension hook.
 * Flag: FEATURE_EF_03 (default off)
 *
 * Capabilities:
 * 1. Automatic Expense Categorisation with confidence scoring and keyword matching.
 * 2. Financial Anomaly Detection (duplicate payments, duplicate references, unexpected amounts,
 *    overpayments, unallocated/underpaid shares, orphan payments).
 * 3. End-to-end Financial Reconciliation Summary (expected revenue, actual collections,
 *    categorised expense breakdown, net surplus/deficit, collection rates).
 *
 * Financial amounts adhere to standard integer minor units ({ amountMinor, currency: 'INR' }).
 */

// ---------------------------------------------------------------------------
// Types & Enums
// ---------------------------------------------------------------------------

export type ExpenseCategory =
  | 'ANIMAL_PURCHASE'
  | 'FEED_AND_FODDER'
  | 'SLAUGHTER_AND_DRESSING'
  | 'PACKAGING_AND_CONSUMABLES'
  | 'LOGISTICS_AND_TRANSPORT'
  | 'WASTE_AND_SANITATION'
  | 'ADMIN_AND_COMMUNICATION'
  | 'MISCELLANEOUS';

export interface ExpenseCategoryMeta {
  category: ExpenseCategory;
  label: string;
  description: string;
}

export const EXPENSE_CATEGORIES_META: Record<ExpenseCategory, ExpenseCategoryMeta> = {
  ANIMAL_PURCHASE: {
    category: 'ANIMAL_PURCHASE',
    label: 'Animal Purchase & Procurement',
    description: 'Procurement of cattle, buffalo, goats, sheep, mandi broker fees',
  },
  FEED_AND_FODDER: {
    category: 'FEED_AND_FODDER',
    label: 'Feed & Fodder',
    description: 'Hay, green grass, bran, water tankers, animal shed maintenance',
  },
  SLAUGHTER_AND_DRESSING: {
    category: 'SLAUGHTER_AND_DRESSING',
    label: 'Slaughter & Dressing Services',
    description: 'Butcher fees, slaughter facility charges, knife sharpening, dressing staff',
  },
  PACKAGING_AND_CONSUMABLES: {
    category: 'PACKAGING_AND_CONSUMABLES',
    label: 'Packaging & Consumables',
    description: 'Food-grade polythene bags, packaging cartons, seals, tagging labels, ice',
  },
  LOGISTICS_AND_TRANSPORT: {
    category: 'LOGISTICS_AND_TRANSPORT',
    label: 'Logistics & Transport',
    description: 'Truck freight, animal loading/unloading, fuel, tempo rental, driver allowances',
  },
  WASTE_AND_SANITATION: {
    category: 'WASTE_AND_SANITATION',
    label: 'Waste Management & Sanitation',
    description: 'Offal and hide disposal, municipal fees, bleaching powder, sanitizers',
  },
  ADMIN_AND_COMMUNICATION: {
    category: 'ADMIN_AND_COMMUNICATION',
    label: 'Admin, Tokens & Volunteer Support',
    description: 'Token printing, banners, receipt vouchers, volunteer food and tea',
  },
  MISCELLANEOUS: {
    category: 'MISCELLANEOUS',
    label: 'Miscellaneous Expenses',
    description: 'General incidental or uncategorised expenses',
  },
};

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExpenseInput {
  id?: string;
  description: string;
  amountMinor: number;
  date?: string;
  reference?: string;
  paidTo?: string;
  notes?: string;
}

export interface CategorisedExpense extends ExpenseInput {
  category: ExpenseCategory;
  categoryLabel: string;
  confidence: ConfidenceLevel;
  matchKeyword?: string;
  ruleExplanation: string;
}

export type AnomalyType =
  | 'DUPLICATE_PAYMENT'
  | 'DUPLICATE_PAYMENT_REF'
  | 'OVERPAYMENT'
  | 'UNDERPAYMENT_WITH_ALLOCATION'
  | 'UNEXPECTED_AMOUNT'
  | 'ORPHAN_PAYMENT'
  | 'DISCREPANCY';

export type AnomalySeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface FinancialAnomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  participantId?: number;
  participantName?: string;
  paymentId?: number;
  paymentReference?: string;
  amountMinor?: number;
  expectedAmountMinor?: number;
  description: string;
  remediation: string;
  detectedAt: string;
}

export interface CategoryBreakdown {
  category: ExpenseCategory;
  label: string;
  amountMinor: number;
  count: number;
  percentageOfTotal: number;
}

export interface FinancialSummaryResult {
  programmeId: number;
  programmeTitle: string;
  currency: string;
  sharePriceMinor: number;
  totalParticipants: number;
  totalAllocatedShares: number;
  expectedRevenueMinor: number;
  collectedRevenueMinor: number;
  outstandingRevenueMinor: number;
  collectionRatePercentage: number;
  totalExpensesMinor: number;
  expensesByCategory: CategoryBreakdown[];
  netSurplusDeficitMinor: number;
  isSurplus: boolean;
  anomalySummary: {
    totalAnomalies: number;
    highSeverity: number;
    mediumSeverity: number;
    lowSeverity: number;
  };
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Prisma Compatibility Interface
// ---------------------------------------------------------------------------

export interface PrismaLike {
  programme: {
    findUnique: (args: { where: { id: number } }) => Promise<{
      id: number;
      title?: string;
      year?: number;
      sharePriceMinor?: number;
      pricePerAnimalMinor?: number;
      priceMinor?: number;
      currency?: string;
    } | null>;
  };
  participant: {
    findMany: (args?: any) => Promise<Array<{
      id: number;
      name: string;
      status: string;
      programmeId: number;
      householdId?: number;
      sharesCount?: number;
      allocation?: { id: number; animalId?: number } | null;
      payments?: Array<{
        id: number;
        amount?: number;
        amountMinor?: number;
        amountCents?: number;
        reference?: string;
        method?: string;
        paidAt?: Date | string;
      }>;
    }>>;
  };
  payment: {
    findMany: (args?: any) => Promise<Array<{
      id: number;
      participantId: number;
      amount?: number;
      amountMinor?: number;
      amountCents?: number;
      reference?: string;
      method?: string;
      paidAt?: Date | string;
    }>>;
  };
  allocation?: {
    findMany?: (args?: any) => Promise<Array<{
      id: number;
      participantId: number;
      animalId?: number;
    }>>;
  };
  expense?: {
    findMany?: (args?: any) => Promise<Array<{
      id: string | number;
      programmeId: number;
      description: string;
      amountMinor: number;
      category?: string;
      date?: Date | string;
      reference?: string;
    }>>;
  };
}

// ---------------------------------------------------------------------------
// Rule Dictionary for Auto-Categorisation
// ---------------------------------------------------------------------------

interface CategoryRule {
  category: ExpenseCategory;
  patterns: Array<{ regex: RegExp; confidence: ConfidenceLevel; keyword: string }>;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'ANIMAL_PURCHASE',
    patterns: [
      { regex: /\b(cattle|cows?|bulls?|ox|oxen|buffalo(es)?|heifers?)\b/i, confidence: 'HIGH', keyword: 'cattle/cow/bull' },
      { regex: /\b(goats?|sheeps?|rams?|lambs?)\b/i, confidence: 'HIGH', keyword: 'goat/sheep' },
      { regex: /\b(mandi|livestock market|broker fees?|animal purchase|dalal)\b/i, confidence: 'HIGH', keyword: 'mandi/procurement' },
      { regex: /\b(procurement|purchase of animals?|bought)\b/i, confidence: 'MEDIUM', keyword: 'procurement' },
    ],
  },
  {
    category: 'FEED_AND_FODDER',
    patterns: [
      { regex: /\b(hay|fodder|straw|grass|silage|chaff|green feed)\b/i, confidence: 'HIGH', keyword: 'hay/fodder' },
      { regex: /\b(cattle feed|bran|grain|salt lick|feed pellets?)\b/i, confidence: 'HIGH', keyword: 'feed/grain' },
      { regex: /\b(water tankers?|water supply|drinking water for animals?)\b/i, confidence: 'HIGH', keyword: 'water tanker' },
      { regex: /\b(barn rent|shed maintenance|caretakers?|grazing)\b/i, confidence: 'MEDIUM', keyword: 'barn/caretaker' },
    ],
  },
  {
    category: 'SLAUGHTER_AND_DRESSING',
    patterns: [
      { regex: /\b(butchers?|qasab|kasab|slaughterers?|kasai)\b/i, confidence: 'HIGH', keyword: 'butcher' },
      { regex: /\b(slaughter(ing)? fees?|cutting charges?|dressing charges?|skinning)\b/i, confidence: 'HIGH', keyword: 'slaughter/dressing fee' },
      { regex: /\b(knives|knife|blades?|sharpening|chopping blocks?|axes?)\b/i, confidence: 'HIGH', keyword: 'knives/sharpening' },
      { regex: /\b(butchery|dressing labou?r|carcass prep)\b/i, confidence: 'MEDIUM', keyword: 'dressing labor' },
    ],
  },
  {
    category: 'PACKAGING_AND_CONSUMABLES',
    patterns: [
      { regex: /\b(plastic bags?|polythene|poly bags?|meat bags?|packaging bags?)\b/i, confidence: 'HIGH', keyword: 'meat bags' },
      { regex: /\b(cartons?|corrugated box(es)?|packing box(es)?|packaging)\b/i, confidence: 'HIGH', keyword: 'boxes/packaging' },
      { regex: /\b(ice blocks?|dry ice|crushed ice|cooling ice|ice)\b/i, confidence: 'HIGH', keyword: 'ice' },
      { regex: /\b(tags?|seals?|cable ties?|stickers?|marker pens?|weight tags?)\b/i, confidence: 'HIGH', keyword: 'tags/seals' },
      { regex: /\b(weighing scales?|scale batter(y|ies)|gloves?|aprons?)\b/i, confidence: 'MEDIUM', keyword: 'scale/gloves' },
    ],
  },
  {
    category: 'LOGISTICS_AND_TRANSPORT',
    patterns: [
      { regex: /\b(trucks?|tempos?|lorr(y|ies)|pickups?|mini trucks?|tata ace)\b/i, confidence: 'HIGH', keyword: 'truck/tempo' },
      { regex: /\b(transport(ation)?|freight|carriage|cartage|transit)\b/i, confidence: 'HIGH', keyword: 'freight/transport' },
      { regex: /\b(diesel|petrol|fuels?|tolls?|fastag)\b/i, confidence: 'HIGH', keyword: 'fuel/toll' },
      { regex: /\b(driver allowances?|loading|unloading|porter charges?|hamali)\b/i, confidence: 'HIGH', keyword: 'loading/hamali' },
    ],
  },
  {
    category: 'WASTE_AND_SANITATION',
    patterns: [
      { regex: /\b(waste disposal|offal|dung|manure removal|carcass waste)\b/i, confidence: 'HIGH', keyword: 'offal/waste removal' },
      { regex: /\b(bleaching powder|lime|disinfectants?|sanitizers?|phenyl)\b/i, confidence: 'HIGH', keyword: 'bleaching powder/disinfectant' },
      { regex: /\b(cleaning labou?r|washing site|pressure washers?|site cleaning)\b/i, confidence: 'HIGH', keyword: 'cleaning labor' },
      { regex: /\b(municipal(ity)? fees?|dumping fees?|panchayat fees?)\b/i, confidence: 'HIGH', keyword: 'municipal fee' },
    ],
  },
  {
    category: 'ADMIN_AND_COMMUNICATION',
    patterns: [
      { regex: /\b(tokens?|receipt books?|vouchers?|print(ing|ed)?|lanyards?|id cards?)\b/i, confidence: 'HIGH', keyword: 'printing/tokens' },
      { regex: /\b(banners?|flex|posters?|announcements?|mikes?|sound systems?)\b/i, confidence: 'HIGH', keyword: 'banner/sound' },
      { regex: /\b(volunteer food|refreshments?|tea|breakfast|lunch for volunteers?)\b/i, confidence: 'HIGH', keyword: 'volunteer refreshment' },
      { regex: /\b(sms packs?|whatsapp api|mobile recharge|stationer(y|ies))\b/i, confidence: 'MEDIUM', keyword: 'sms/stationery' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Service Implementation
// ---------------------------------------------------------------------------

export class FinancialIntelligenceService {
  private readonly prisma: PrismaLike;

  constructor(prisma?: PrismaLike) {
    this.prisma = prisma || {
      programme: { findUnique: async () => null },
      participant: { findMany: async () => [] },
      payment: { findMany: async () => [] },
    };
  }

  // -------------------------------------------------------------------------
  // 1. Auto-Categorisation Engine
  // -------------------------------------------------------------------------

  /**
   * Categorises a single expense input based on description and payment notes.
   */
  public categoriseExpense(input: ExpenseInput): CategorisedExpense {
    const textToMatch = `${input.description} ${input.notes || ''} ${input.paidTo || ''}`.trim();

    for (const rule of CATEGORY_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.regex.test(textToMatch)) {
          return {
            ...input,
            category: rule.category,
            categoryLabel: EXPENSE_CATEGORIES_META[rule.category].label,
            confidence: pattern.confidence,
            matchKeyword: pattern.keyword,
            ruleExplanation: `Matched rule for "${pattern.keyword}" with ${pattern.confidence} confidence.`,
          };
        }
      }
    }

    return {
      ...input,
      category: 'MISCELLANEOUS',
      categoryLabel: EXPENSE_CATEGORIES_META.MISCELLANEOUS.label,
      confidence: 'LOW',
      ruleExplanation: 'No specific operational keyword detected; classified as Miscellaneous.',
    };
  }

  /**
   * Categorises a batch of expense inputs and computes aggregated category breakdown.
   */
  public categoriseBatch(expenses: ExpenseInput[]): {
    items: CategorisedExpense[];
    totalAmountMinor: number;
    breakdown: CategoryBreakdown[];
  } {
    const items = expenses.map((exp) => this.categoriseExpense(exp));
    const totalAmountMinor = items.reduce((sum, item) => sum + item.amountMinor, 0);

    const categoryMap = new Map<ExpenseCategory, { count: number; amountMinor: number }>();
    for (const cat of Object.keys(EXPENSE_CATEGORIES_META) as ExpenseCategory[]) {
      categoryMap.set(cat, { count: 0, amountMinor: 0 });
    }

    for (const item of items) {
      const current = categoryMap.get(item.category) || { count: 0, amountMinor: 0 };
      categoryMap.set(item.category, {
        count: current.count + 1,
        amountMinor: current.amountMinor + item.amountMinor,
      });
    }

    const breakdown: CategoryBreakdown[] = (Object.keys(EXPENSE_CATEGORIES_META) as ExpenseCategory[])
      .map((cat) => {
        const stats = categoryMap.get(cat) || { count: 0, amountMinor: 0 };
        return {
          category: cat,
          label: EXPENSE_CATEGORIES_META[cat].label,
          amountMinor: stats.amountMinor,
          count: stats.count,
          percentageOfTotal:
            totalAmountMinor > 0
              ? Math.round((stats.amountMinor / totalAmountMinor) * 10000) / 100
              : 0,
        };
      })
      .filter((b) => b.count > 0 || b.amountMinor > 0);

    return { items, totalAmountMinor, breakdown };
  }

  // -------------------------------------------------------------------------
  // 2. Anomaly Detection Engine
  // -------------------------------------------------------------------------

  /**
   * Scans programme participants, allocations, and payments for reconciliation anomalies.
   */
  public async detectAnomalies(programmeId: number): Promise<FinancialAnomaly[]> {
    const programme = await this.prisma.programme.findUnique({ where: { id: programmeId } });
    if (!programme) {
      throw new Error(`Programme with ID ${programmeId} not found`);
    }

    const sharePrice =
      programme.sharePriceMinor ??
      programme.priceMinor ??
      (programme.pricePerAnimalMinor ? Math.round(programme.pricePerAnimalMinor / 7) : 300000); // 3,000 INR default

    const participants = await this.prisma.participant.findMany({
      where: { programmeId },
      include: { allocation: true, payments: true },
    });

    let allPayments: Array<any> = [];
    try {
      allPayments = await this.prisma.payment.findMany({
        where: { participant: { programmeId } },
      });
    } catch {
      allPayments = await this.prisma.payment.findMany({
        where: { programmeId },
      }).catch(() => []);
    }

    // If payments weren't returned by direct query but were included in participants, collect them
    if (allPayments.length === 0) {
      for (const p of participants) {
        for (const pay of p.payments || []) {
          allPayments.push({ ...pay, participantId: p.id });
        }
      }
    }

    const anomalies: FinancialAnomaly[] = [];
    const now = new Date().toISOString();

    // 1. Check for duplicate payment references
    const referenceMap = new Map<string, number[]>();
    for (const pay of allPayments) {
      const ref = (pay.reference || '').trim();
      if (ref && ref.length > 3) {
        const list = referenceMap.get(ref) || [];
        list.push(pay.id);
        referenceMap.set(ref, list);
      }
    }

    for (const [ref, paymentIds] of referenceMap.entries()) {
      if (paymentIds.length > 1) {
        anomalies.push({
          id: `anomaly-dup-ref-${ref}`,
          type: 'DUPLICATE_PAYMENT_REF',
          severity: 'HIGH',
          paymentReference: ref,
          description: `Duplicate payment reference "${ref}" detected across ${paymentIds.length} payment records (IDs: ${paymentIds.join(', ')}).`,
          remediation: 'Inspect bank receipt/voucher and merge or void duplicate entry.',
          detectedAt: now,
        });
      }
    }

    // 2. Check for duplicate payments (same participant, same payment amount)
    const participantPaymentGroups = new Map<string, number[]>();
    for (const pay of allPayments) {
      const amt = pay.amountMinor ?? pay.amountCents ?? (pay.amount ? pay.amount * 100 : 0);
      if (amt > 0 && pay.participantId) {
        const key = `${pay.participantId}:${amt}`;
        const list = participantPaymentGroups.get(key) || [];
        list.push(pay.id);
        participantPaymentGroups.set(key, list);
      }
    }

    for (const [key, payIds] of participantPaymentGroups.entries()) {
      if (payIds.length > 1) {
        const [pIdStr, amtStr] = key.split(':');
        const pId = Number(pIdStr);
        const amt = Number(amtStr);
        const pName = participants.find((p) => p.id === pId)?.name || `Participant #${pId}`;
        anomalies.push({
          id: `anomaly-dup-payment-${pId}-${amt}`,
          type: 'DUPLICATE_PAYMENT',
          severity: 'HIGH',
          participantId: pId,
          participantName: pName,
          amountMinor: amt,
          description: `Duplicate payment of ₹${(amt / 100).toFixed(2)} detected for ${pName} across ${payIds.length} records (IDs: ${payIds.join(', ')}).`,
          remediation: 'Inspect bank statement to verify if participant submitted multiple contributions or if entry was recorded twice.',
          detectedAt: now,
        });
      }
    }

    // 3. Check participant balances, allocations, and amounts
    const validParticipantIds = new Set(participants.map((p) => p.id));

    for (const p of participants) {
      const participantShares = p.sharesCount || 1;
      const expectedContribution = participantShares * sharePrice;

      const pPayments = (p.payments || []).map((pay) => ({
        id: pay.id,
        amount: pay.amountMinor ?? pay.amountCents ?? (pay.amount ? pay.amount * 100 : 0),
        reference: pay.reference,
        method: pay.method,
      }));

      const totalPaid = pPayments.reduce((sum, pay) => sum + pay.amount, 0);

      // A. Overpayment
      if (totalPaid > expectedContribution) {
        anomalies.push({
          id: `anomaly-overpay-${p.id}`,
          type: 'OVERPAYMENT',
          severity: 'MEDIUM',
          participantId: p.id,
          participantName: p.name,
          amountMinor: totalPaid,
          expectedAmountMinor: expectedContribution,
          description: `Participant "${p.name}" (ID ${p.id}) paid ₹${(totalPaid / 100).toFixed(2)}, exceeding required ₹${(expectedContribution / 100).toFixed(2)} by ₹${((totalPaid - expectedContribution) / 100).toFixed(2)}.`,
          remediation: 'Verify if extra funds are general charity/Sadaqah, or issue refund for excess contribution.',
          detectedAt: now,
        });
      }

      // B. Underpayment with active animal allocation
      const isAllocated = Boolean(p.allocation && (p.allocation.animalId || p.allocation.id));
      if (isAllocated && totalPaid < expectedContribution) {
        const deficit = expectedContribution - totalPaid;
        anomalies.push({
          id: `anomaly-underpay-alloc-${p.id}`,
          type: 'UNDERPAYMENT_WITH_ALLOCATION',
          severity: 'HIGH',
          participantId: p.id,
          participantName: p.name,
          amountMinor: totalPaid,
          expectedAmountMinor: expectedContribution,
          description: `Participant "${p.name}" is allocated to an animal but has outstanding balance of ₹${(deficit / 100).toFixed(2)} (paid ₹${(totalPaid / 100).toFixed(2)} of ₹${(expectedContribution / 100).toFixed(2)}).`,
          remediation: 'Follow up with participant to collect remaining balance prior to animal slaughter.',
          detectedAt: now,
        });
      }

      // C. Unexpected single payment amount (neither full share nor standard 50% / 25% installment)
      for (const pay of pPayments) {
        const amt = pay.amount;
        if (
          amt > 0 &&
          amt !== sharePrice &&
          amt !== Math.round(sharePrice / 2) &&
          amt !== Math.round(sharePrice / 4)
        ) {
          anomalies.push({
            id: `anomaly-unexp-amt-${pay.id}`,
            type: 'UNEXPECTED_AMOUNT',
            severity: 'LOW',
            participantId: p.id,
            participantName: p.name,
            paymentId: pay.id,
            amountMinor: amt,
            expectedAmountMinor: sharePrice,
            description: `Payment ID ${pay.id} for "${p.name}" has non-standard amount ₹${(amt / 100).toFixed(2)} (expected ₹${(sharePrice / 100).toFixed(2)} or standard installment).`,
            remediation: 'Check for manual clerical error or unrecorded cash discount.',
            detectedAt: now,
          });
        }
      }
    }

    // 4. Check for orphan payments (payments referencing non-existent participant)
    for (const pay of allPayments) {
      if (pay.participantId && !validParticipantIds.has(pay.participantId)) {
        anomalies.push({
          id: `anomaly-orphan-${pay.id}`,
          type: 'ORPHAN_PAYMENT',
          severity: 'HIGH',
          paymentId: pay.id,
          participantId: pay.participantId,
          amountMinor: pay.amountMinor ?? pay.amountCents ?? 0,
          description: `Payment ID ${pay.id} references participant ID ${pay.participantId} which is missing or unlinked.`,
          remediation: 'Re-associate payment with correct participant record or refund unlinked contribution.',
          detectedAt: now,
        });
      }
    }

    // Sort by severity: HIGH > MEDIUM > LOW
    const severityScore: Record<AnomalySeverity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return anomalies.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);
  }

  // -------------------------------------------------------------------------
  // 3. Financial Summary & Reconciliation Engine
  // -------------------------------------------------------------------------

  /**
   * Produces a complete financial reconciliation report for committee administrators.
   */
  public async getSummary(
    programmeId: number,
    customExpenses?: ExpenseInput[],
  ): Promise<FinancialSummaryResult> {
    const programme = await this.prisma.programme.findUnique({ where: { id: programmeId } });
    if (!programme) {
      throw new Error(`Programme with ID ${programmeId} not found`);
    }

    const currency = programme.currency || 'INR';
    const sharePrice =
      programme.sharePriceMinor ??
      programme.priceMinor ??
      (programme.pricePerAnimalMinor ? Math.round(programme.pricePerAnimalMinor / 7) : 300000);

    const participants = await this.prisma.participant.findMany({
      where: { programmeId },
      include: { allocation: true, payments: true },
    });

    const totalParticipants = participants.length;
    const allocatedParticipants = participants.filter(
      (p) => p.allocation && (p.allocation.animalId || p.allocation.id),
    );
    const totalAllocatedShares = allocatedParticipants.reduce(
      (sum, p) => sum + (p.sharesCount || 1),
      0,
    );

    // Expected revenue: allocated shares * share price
    const expectedRevenueMinor = totalAllocatedShares * sharePrice;

    // Actual collected revenue
    let collectedRevenueMinor = 0;
    for (const p of participants) {
      for (const pay of p.payments || []) {
        collectedRevenueMinor +=
          pay.amountMinor ?? pay.amountCents ?? (pay.amount ? pay.amount * 100 : 0);
      }
    }

    const outstandingRevenueMinor = Math.max(0, expectedRevenueMinor - collectedRevenueMinor);
    const collectionRatePercentage =
      expectedRevenueMinor > 0
        ? Math.round((collectedRevenueMinor / expectedRevenueMinor) * 10000) / 100
        : 0;

    // Collect expenses: either from custom array or database
    let rawExpenses: ExpenseInput[] = customExpenses || [];
    if (!customExpenses && this.prisma.expense?.findMany) {
      const dbExpenses = await this.prisma.expense.findMany({ where: { programmeId } });
      rawExpenses = dbExpenses.map((e) => ({
        id: String(e.id),
        description: e.description,
        amountMinor: e.amountMinor,
        date: e.date ? String(e.date) : undefined,
        reference: e.reference,
      }));
    }

    const categorisedResult = this.categoriseBatch(rawExpenses);
    const totalExpensesMinor = categorisedResult.totalAmountMinor;
    const netSurplusDeficitMinor = collectedRevenueMinor - totalExpensesMinor;

    // Anomalies
    const anomalies = await this.detectAnomalies(programmeId);
    const highSeverity = anomalies.filter((a) => a.severity === 'HIGH').length;
    const mediumSeverity = anomalies.filter((a) => a.severity === 'MEDIUM').length;
    const lowSeverity = anomalies.filter((a) => a.severity === 'LOW').length;

    return {
      programmeId,
      programmeTitle: programme.title || `Qurbani Programme ${programme.year || 2026}`,
      currency,
      sharePriceMinor: sharePrice,
      totalParticipants,
      totalAllocatedShares,
      expectedRevenueMinor,
      collectedRevenueMinor,
      outstandingRevenueMinor,
      collectionRatePercentage,
      totalExpensesMinor,
      expensesByCategory: categorisedResult.breakdown,
      netSurplusDeficitMinor,
      isSurplus: netSurplusDeficitMinor >= 0,
      anomalySummary: {
        totalAnomalies: anomalies.length,
        highSeverity,
        mediumSeverity,
        lowSeverity,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
