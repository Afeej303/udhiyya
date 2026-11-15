/**
 * EF-01: Analytics Dashboard – Service
 * Owned by M3. Lives in enhancements/ and is mounted via M2's extension hook.
 * Flag: FEATURE_EF_01 (default off)
 *
 * Provides analytical aggregations:
 * 1. Summary KPIs: participant counts by status, animal yield metrics,
 *    payment collection progress, and share capacity utilization.
 * 2. Visual Chart Datasets:
 *    - participant-distribution: counts and percentages grouped by ward/locality.
 *    - weight-distribution: yield histogram across standardized weight brackets.
 *    - payment-velocity: daily and cumulative payment collection timeseries.
 *    - registration-trend: daily and cumulative participant registration growth.
 */

// ---------------------------------------------------------------------------
// Domain & DTO Interfaces
// ---------------------------------------------------------------------------

export interface ParticipantSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
}

export interface WeightMetrics {
  totalAnimals: number;
  totalWeightKg: number;
  averageWeightKg: number;
  minWeightKg: number;
  maxWeightKg: number;
  medianWeightKg: number;
}

export interface ShareStatistics {
  totalCapacity: number;
  allocatedShares: number;
  unallocatedShares: number;
  utilizationRate: number; // percentage 0 - 100
}

export interface PaymentProgress {
  expectedTotalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  completionRate: number; // percentage 0 - 100
  verifiedCount: number;
  pendingCount: number;
}

export interface AnalyticsSummaryResult {
  programmeId: number;
  programmeTitle: string;
  participants: ParticipantSummary;
  weightMetrics: WeightMetrics;
  shareStatistics: ShareStatistics;
  paymentProgress: PaymentProgress;
  updatedAt: string;
}

export interface WardDistributionItem {
  ward: string;
  count: number;
  percentage: number;
}

export interface WeightBinItem {
  bin: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface PaymentVelocityItem {
  date: string;
  dailyAmount: number;
  cumulativeAmount: number;
  transactionCount: number;
}

export interface RegistrationTrendItem {
  date: string;
  dailyRegistrations: number;
  cumulativeRegistrations: number;
}

export interface AllChartsResult {
  participantDistribution: WardDistributionItem[];
  weightDistribution: WeightBinItem[];
  paymentVelocity: PaymentVelocityItem[];
  registrationTrend: RegistrationTrendItem[];
}

export type ChartType =
  | 'participant-distribution'
  | 'weight-distribution'
  | 'payment-velocity'
  | 'registration-trend'
  | 'all';

export const SUPPORTED_CHART_TYPES: ChartType[] = [
  'participant-distribution',
  'weight-distribution',
  'payment-velocity',
  'registration-trend',
  'all',
];

// ---------------------------------------------------------------------------
// Prisma-Compatible Database Abstraction
// ---------------------------------------------------------------------------

export interface PrismaLike {
  programme: {
    findUnique: (args: { where: { id: number } }) => Promise<{
      id: number;
      title?: string;
      year?: number;
      sharePrice?: number;
    } | null>;
  };
  participant: {
    findMany: (args: {
      where: { programmeId: number };
      select?: any;
    }) => Promise<
      Array<{
        id: number;
        name: string;
        ward?: string | null;
        locality?: string | null;
        status: string;
        shareCount?: number;
        createdAt: Date;
      }>
    >;
  };
  animal: {
    findMany: (args: {
      where: { programmeId?: number; group?: { programmeId: number } };
      select?: any;
    }) => Promise<
      Array<{
        id: number;
        tagNumber: string;
        weight: number;
        species?: string;
        _count?: { allocation: number };
        allocations?: Array<{ id: number }>;
      }>
    >;
  };
  payment?: {
    findMany: (args: {
      where: { programmeId: number };
      select?: any;
    }) => Promise<
      Array<{
        id: number;
        participantId: number;
        amount: number;
        status: string;
        createdAt: Date;
      }>
    >;
  };
}

// Standard cattle/buffalo capacity constant
const SHARES_PER_LARGE_ANIMAL = 7;

// ---------------------------------------------------------------------------
// Service Implementation
// ---------------------------------------------------------------------------

export class AnalyticsService {
  private readonly prisma: PrismaLike;

  constructor(prisma: PrismaLike) {
    this.prisma = prisma;
  }

  /**
   * Helper: compute median of an array of numbers
   */
  private computeMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
    }
    return Number(sorted[mid].toFixed(2));
  }

  /**
   * Helper: round number to 2 decimal places
   */
  private round(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  /**
   * Retrieves summary analytics for a given programme
   */
  async getSummary(programmeId: number): Promise<AnalyticsSummaryResult> {
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
    });

    if (!programme) {
      throw new Error(`NOT_FOUND: Programme with ID ${programmeId} not found`);
    }

    const participants = await this.prisma.participant.findMany({
      where: { programmeId },
    });

    const animals = await this.prisma.animal.findMany({
      where: { programmeId },
    });

    const payments = this.prisma.payment
      ? await this.prisma.payment.findMany({ where: { programmeId } })
      : [];

    // 1. Participant counts
    const participantSummary: ParticipantSummary = {
      total: participants.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
    };

    for (const p of participants) {
      const s = (p.status || '').toUpperCase();
      if (s === 'APPROVED' || s === 'CONFIRMED') participantSummary.approved++;
      else if (s === 'PENDING') participantSummary.pending++;
      else if (s === 'REJECTED') participantSummary.rejected++;
      else if (s === 'CANCELLED') participantSummary.cancelled++;
      else participantSummary.pending++;
    }

    // 2. Animal weight statistics
    const weights = animals
      .map((a) => Number(a.weight))
      .filter((w) => !isNaN(w) && w > 0);

    const totalWeightKg = this.round(weights.reduce((sum, w) => sum + w, 0));
    const averageWeightKg =
      weights.length > 0 ? this.round(totalWeightKg / weights.length) : 0;
    const minWeightKg = weights.length > 0 ? Math.min(...weights) : 0;
    const maxWeightKg = weights.length > 0 ? Math.max(...weights) : 0;
    const medianWeightKg = this.computeMedian(weights);

    const weightMetrics: WeightMetrics = {
      totalAnimals: animals.length,
      totalWeightKg,
      averageWeightKg,
      minWeightKg,
      maxWeightKg,
      medianWeightKg,
    };

    // 3. Share statistics
    const totalCapacity = animals.length * SHARES_PER_LARGE_ANIMAL;
    let allocatedShares = 0;
    for (const a of animals) {
      const count =
        a._count?.allocation ??
        (Array.isArray(a.allocations) ? a.allocations.length : 0);
      allocatedShares += count;
    }
    const unallocatedShares = Math.max(0, totalCapacity - allocatedShares);
    const utilizationRate =
      totalCapacity > 0
        ? this.round((allocatedShares / totalCapacity) * 100)
        : 0;

    const shareStatistics: ShareStatistics = {
      totalCapacity,
      allocatedShares,
      unallocatedShares,
      utilizationRate,
    };

    // 4. Payment progress
    const sharePrice = programme.sharePrice ?? 3000;
    // Expected total is based on approved participants or total allocated shares
    const expectedParticipantCount =
      participantSummary.approved > 0
        ? participantSummary.approved
        : participantSummary.total;
    const expectedTotalAmount = expectedParticipantCount * sharePrice;

    let collectedAmount = 0;
    let verifiedCount = 0;
    let pendingCount = 0;

    if (payments.length > 0) {
      for (const pay of payments) {
        const s = (pay.status || '').toUpperCase();
        if (s === 'VERIFIED' || s === 'PAID' || s === 'COMPLETED') {
          collectedAmount += Number(pay.amount) || 0;
          verifiedCount++;
        } else if (s === 'PENDING') {
          pendingCount++;
        }
      }
    } else {
      // In absence of explicit payment records, derive from approved participants
      collectedAmount = participantSummary.approved * sharePrice;
      verifiedCount = participantSummary.approved;
      pendingCount = participantSummary.pending;
    }

    collectedAmount = this.round(collectedAmount);
    const pendingAmount = Math.max(
      0,
      this.round(expectedTotalAmount - collectedAmount),
    );
    const completionRate =
      expectedTotalAmount > 0
        ? Math.min(100, this.round((collectedAmount / expectedTotalAmount) * 100))
        : 0;

    const paymentProgress: PaymentProgress = {
      expectedTotalAmount,
      collectedAmount,
      pendingAmount,
      completionRate,
      verifiedCount,
      pendingCount,
    };

    return {
      programmeId,
      programmeTitle: programme.title || `Programme ${programme.year || programmeId}`,
      participants: participantSummary,
      weightMetrics,
      shareStatistics,
      paymentProgress,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves visual chart datasets
   */
  async getCharts(
    programmeId: number,
    type: ChartType,
  ): Promise<
    | WardDistributionItem[]
    | WeightBinItem[]
    | PaymentVelocityItem[]
    | RegistrationTrendItem[]
    | AllChartsResult
  > {
    const programme = await this.prisma.programme.findUnique({
      where: { id: programmeId },
    });

    if (!programme) {
      throw new Error(`NOT_FOUND: Programme with ID ${programmeId} not found`);
    }

    switch (type) {
      case 'participant-distribution':
        return this.getParticipantDistribution(programmeId);
      case 'weight-distribution':
        return this.getWeightDistribution(programmeId);
      case 'payment-velocity':
        return this.getPaymentVelocity(programmeId);
      case 'registration-trend':
        return this.getRegistrationTrend(programmeId);
      case 'all':
      default: {
        const [
          participantDistribution,
          weightDistribution,
          paymentVelocity,
          registrationTrend,
        ] = await Promise.all([
          this.getParticipantDistribution(programmeId),
          this.getWeightDistribution(programmeId),
          this.getPaymentVelocity(programmeId),
          this.getRegistrationTrend(programmeId),
        ]);
        return {
          participantDistribution,
          weightDistribution,
          paymentVelocity,
          registrationTrend,
        };
      }
    }
  }

  /**
   * Chart: Participant distribution by Ward/Locality
   */
  private async getParticipantDistribution(
    programmeId: number,
  ): Promise<WardDistributionItem[]> {
    const participants = await this.prisma.participant.findMany({
      where: { programmeId },
    });

    if (participants.length === 0) return [];

    const wardCounts = new Map<string, number>();
    for (const p of participants) {
      const ward = p.ward?.trim() || p.locality?.trim() || 'Unassigned';
      wardCounts.set(ward, (wardCounts.get(ward) || 0) + 1);
    }

    const total = participants.length;
    const items: WardDistributionItem[] = [];

    // Sort by count descending
    const sorted = Array.from(wardCounts.entries()).sort((a, b) => b[1] - a[1]);

    for (const [ward, count] of sorted) {
      items.push({
        ward,
        count,
        percentage: this.round((count / total) * 100),
      });
    }

    return items;
  }

  /**
   * Chart: Animal weight distribution histogram
   */
  private async getWeightDistribution(
    programmeId: number,
  ): Promise<WeightBinItem[]> {
    const animals = await this.prisma.animal.findMany({
      where: { programmeId },
    });

    const bins: WeightBinItem[] = [
      { bin: '< 250 kg', min: 0, max: 249.99, count: 0, percentage: 0 },
      { bin: '250 – 299 kg', min: 250, max: 299.99, count: 0, percentage: 0 },
      { bin: '300 – 349 kg', min: 300, max: 349.99, count: 0, percentage: 0 },
      { bin: '350 – 399 kg', min: 350, max: 399.99, count: 0, percentage: 0 },
      { bin: '≥ 400 kg', min: 400, max: 9999, count: 0, percentage: 0 },
    ];

    if (animals.length === 0) return bins;

    const weights = animals
      .map((a) => Number(a.weight))
      .filter((w) => !isNaN(w) && w > 0);

    for (const w of weights) {
      if (w < 250) bins[0].count++;
      else if (w < 300) bins[1].count++;
      else if (w < 350) bins[2].count++;
      else if (w < 400) bins[3].count++;
      else bins[4].count++;
    }

    const total = weights.length;
    if (total > 0) {
      for (const b of bins) {
        b.percentage = this.round((b.count / total) * 100);
      }
    }

    return bins;
  }

  /**
   * Chart: Payment collection velocity over time
   */
  private async getPaymentVelocity(
    programmeId: number,
  ): Promise<PaymentVelocityItem[]> {
    const payments = this.prisma.payment
      ? await this.prisma.payment.findMany({ where: { programmeId } })
      : [];

    if (payments.length === 0) return [];

    // Group verified payments by date YYYY-MM-DD
    const dateMap = new Map<string, { amount: number; count: number }>();

    for (const pay of payments) {
      const s = (pay.status || '').toUpperCase();
      if (s === 'VERIFIED' || s === 'PAID' || s === 'COMPLETED') {
        const d = new Date(pay.createdAt);
        const dateKey = isNaN(d.getTime())
          ? 'Unknown Date'
          : d.toISOString().split('T')[0];

        const current = dateMap.get(dateKey) || { amount: 0, count: 0 };
        current.amount += Number(pay.amount) || 0;
        current.count += 1;
        dateMap.set(dateKey, current);
      }
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    let cumulative = 0;
    const velocityItems: PaymentVelocityItem[] = [];

    for (const d of sortedDates) {
      const item = dateMap.get(d)!;
      cumulative += item.amount;
      velocityItems.push({
        date: d,
        dailyAmount: this.round(item.amount),
        cumulativeAmount: this.round(cumulative),
        transactionCount: item.count,
      });
    }

    return velocityItems;
  }

  /**
   * Chart: Participant registration growth trend
   */
  private async getRegistrationTrend(
    programmeId: number,
  ): Promise<RegistrationTrendItem[]> {
    const participants = await this.prisma.participant.findMany({
      where: { programmeId },
    });

    if (participants.length === 0) return [];

    const dateMap = new Map<string, number>();

    for (const p of participants) {
      const d = new Date(p.createdAt);
      const dateKey = isNaN(d.getTime())
        ? 'Unknown Date'
        : d.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    }

    const sortedDates = Array.from(dateMap.keys()).sort();
    let cumulative = 0;
    const trendItems: RegistrationTrendItem[] = [];

    for (const d of sortedDates) {
      const count = dateMap.get(d)!;
      cumulative += count;
      trendItems.push({
        date: d,
        dailyRegistrations: count,
        cumulativeRegistrations: cumulative,
      });
    }

    return trendItems;
  }
}
