/**
 * EF-01: Analytics Dashboard – Service Unit Tests (V0)
 * Run with: node --experimental-strip-types --test enhancements/EF-01-analytics/tests/analytics.service.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AnalyticsService,
} from '../backend/analytics.service.ts';
import type {
  PrismaLike,
} from '../backend/analytics.service.ts';

// ---------------------------------------------------------------------------
// Mock Data Helpers
// ---------------------------------------------------------------------------

function createMockPrisma(overrides?: {
  programme?: any;
  participants?: any[];
  animals?: any[];
  payments?: any[];
}): PrismaLike {
  const programmeData =
    overrides?.programme !== undefined
      ? overrides.programme
      : { id: 1, title: 'Qurbani 2026', year: 2026, sharePrice: 3000 };

  const participantsData = overrides?.participants ?? [
    {
      id: 1,
      name: 'Ali Khan',
      ward: 'Ward 1',
      locality: 'Town Centre',
      status: 'APPROVED',
      createdAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      id: 2,
      name: 'Fatima Zahra',
      ward: 'Ward 1',
      locality: 'Town Centre',
      status: 'APPROVED',
      createdAt: new Date('2026-11-01T11:00:00Z'),
    },
    {
      id: 3,
      name: 'Hassan Basri',
      ward: 'Ward 2',
      locality: 'North Colony',
      status: 'PENDING',
      createdAt: new Date('2026-11-02T09:30:00Z'),
    },
    {
      id: 4,
      name: 'Zayd Malik',
      ward: 'Ward 2',
      locality: 'North Colony',
      status: 'REJECTED',
      createdAt: new Date('2026-11-02T14:00:00Z'),
    },
    {
      id: 5,
      name: 'Maryam Noor',
      ward: 'Ward 3',
      locality: 'South Gate',
      status: 'CANCELLED',
      createdAt: new Date('2026-11-03T16:00:00Z'),
    },
  ];

  const animalsData = overrides?.animals ?? [
    {
      id: 101,
      tagNumber: 'TAG-101',
      weight: 240, // < 250
      allocations: [{ id: 1 }, { id: 2 }],
      _count: { allocation: 2 },
    },
    {
      id: 102,
      tagNumber: 'TAG-102',
      weight: 280, // 250 - 299
      allocations: [{ id: 3 }],
      _count: { allocation: 1 },
    },
    {
      id: 103,
      tagNumber: 'TAG-103',
      weight: 320, // 300 - 349
      allocations: [],
      _count: { allocation: 0 },
    },
    {
      id: 104,
      tagNumber: 'TAG-104',
      weight: 370, // 350 - 399
      allocations: [],
      _count: { allocation: 0 },
    },
    {
      id: 105,
      tagNumber: 'TAG-105',
      weight: 420, // >= 400
      allocations: [],
      _count: { allocation: 0 },
    },
  ];

  const paymentsData = overrides?.payments ?? [
    {
      id: 201,
      participantId: 1,
      amount: 3000,
      status: 'VERIFIED',
      createdAt: new Date('2026-11-01T12:00:00Z'),
    },
    {
      id: 202,
      participantId: 2,
      amount: 3000,
      status: 'VERIFIED',
      createdAt: new Date('2026-11-02T15:00:00Z'),
    },
    {
      id: 203,
      participantId: 3,
      amount: 3000,
      status: 'PENDING',
      createdAt: new Date('2026-11-03T11:00:00Z'),
    },
  ];

  return {
    programme: {
      findUnique: async ({ where }) =>
        where.id === programmeData?.id ? programmeData : null,
    },
    participant: {
      findMany: async () => participantsData,
    },
    animal: {
      findMany: async () => animalsData,
    },
    payment: {
      findMany: async () => paymentsData,
    },
  };
}

// ---------------------------------------------------------------------------
// Unit Tests Suite
// ---------------------------------------------------------------------------

describe('EF-01 AnalyticsService: getSummary()', () => {
  it('aggregates participant counts correctly by status', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const summary = await service.getSummary(1);

    assert.equal(summary.programmeId, 1);
    assert.equal(summary.programmeTitle, 'Qurbani 2026');
    assert.equal(summary.participants.total, 5);
    assert.equal(summary.participants.approved, 2);
    assert.equal(summary.participants.pending, 1);
    assert.equal(summary.participants.rejected, 1);
    assert.equal(summary.participants.cancelled, 1);
  });

  it('calculates animal weight yield statistics correctly (min, max, avg, median)', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const summary = await service.getSummary(1);

    // Weights: 240, 280, 320, 370, 420. Sum = 1630. Count = 5.
    assert.equal(summary.weightMetrics.totalAnimals, 5);
    assert.equal(summary.weightMetrics.totalWeightKg, 1630);
    assert.equal(summary.weightMetrics.averageWeightKg, 326);
    assert.equal(summary.weightMetrics.minWeightKg, 240);
    assert.equal(summary.weightMetrics.maxWeightKg, 420);
    assert.equal(summary.weightMetrics.medianWeightKg, 320); // 5 elements -> middle is 320
  });

  it('calculates even-count median correctly', async () => {
    const fourAnimals = [
      { id: 1, tagNumber: 'T1', weight: 200, allocations: [] },
      { id: 2, tagNumber: 'T2', weight: 300, allocations: [] },
      { id: 3, tagNumber: 'T3', weight: 400, allocations: [] },
      { id: 4, tagNumber: 'T4', weight: 500, allocations: [] },
    ];
    const prisma = createMockPrisma({ animals: fourAnimals });
    const service = new AnalyticsService(prisma);
    const summary = await service.getSummary(1);

    // Median of [200, 300, 400, 500] is (300 + 400) / 2 = 350
    assert.equal(summary.weightMetrics.medianWeightKg, 350);
  });

  it('calculates share capacity and utilization rate accurately', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const summary = await service.getSummary(1);

    // 5 animals * 7 = 35 total capacity
    // Animal 101 has 2, Animal 102 has 1 -> 3 allocated
    assert.equal(summary.shareStatistics.totalCapacity, 35);
    assert.equal(summary.shareStatistics.allocatedShares, 3);
    assert.equal(summary.shareStatistics.unallocatedShares, 32);
    // 3 / 35 = 8.57%
    assert.equal(summary.shareStatistics.utilizationRate, 8.57);
  });

  it('calculates payment progress and collection percentage', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const summary = await service.getSummary(1);

    // 2 approved participants * 3000 sharePrice = 6000 expected
    // 2 verified payments * 3000 = 6000 collected
    assert.equal(summary.paymentProgress.expectedTotalAmount, 6000);
    assert.equal(summary.paymentProgress.collectedAmount, 6000);
    assert.equal(summary.paymentProgress.pendingAmount, 0);
    assert.equal(summary.paymentProgress.completionRate, 100);
    assert.equal(summary.paymentProgress.verifiedCount, 2);
    assert.equal(summary.paymentProgress.pendingCount, 1);
  });

  it('handles empty dataset safely without NaN or crashes', async () => {
    const emptyPrisma = createMockPrisma({
      participants: [],
      animals: [],
      payments: [],
    });
    const service = new AnalyticsService(emptyPrisma);
    const summary = await service.getSummary(1);

    assert.equal(summary.participants.total, 0);
    assert.equal(summary.participants.approved, 0);
    assert.equal(summary.weightMetrics.totalAnimals, 0);
    assert.equal(summary.weightMetrics.totalWeightKg, 0);
    assert.equal(summary.weightMetrics.averageWeightKg, 0);
    assert.equal(summary.weightMetrics.minWeightKg, 0);
    assert.equal(summary.weightMetrics.maxWeightKg, 0);
    assert.equal(summary.weightMetrics.medianWeightKg, 0);
    assert.equal(summary.shareStatistics.totalCapacity, 0);
    assert.equal(summary.shareStatistics.allocatedShares, 0);
    assert.equal(summary.shareStatistics.utilizationRate, 0);
    assert.equal(summary.paymentProgress.completionRate, 0);
    assert.equal(summary.paymentProgress.expectedTotalAmount, 0);
    assert.equal(summary.paymentProgress.collectedAmount, 0);
  });

  it('throws NOT_FOUND error when programme does not exist', async () => {
    const prisma = createMockPrisma({ programme: null });
    const service = new AnalyticsService(prisma);

    await assert.rejects(
      async () => {
        await service.getSummary(999);
      },
      (err: any) => {
        return err.message.includes('NOT_FOUND') && err.message.includes('999');
      },
    );
  });
});

describe('EF-01 AnalyticsService: getCharts()', () => {
  it('returns participant geographic distribution grouped and sorted descending', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const data = (await service.getCharts(1, 'participant-distribution')) as any[];

    assert.ok(Array.isArray(data));
    assert.equal(data.length, 3);
    // Ward 1 has 2, Ward 2 has 2, Ward 3 has 1
    assert.equal(data[0].count, 2);
    assert.equal(data[0].percentage, 40); // 2/5 = 40%
    assert.equal(data[1].count, 2);
    assert.equal(data[2].count, 1);
    assert.equal(data[2].percentage, 20); // 1/5 = 20%
  });

  it('generates 5 weight distribution histogram bins accurately', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const bins = (await service.getCharts(1, 'weight-distribution')) as any[];

    assert.equal(bins.length, 5);
    // 1 animal in each bucket
    assert.equal(bins[0].bin, '< 250 kg');
    assert.equal(bins[0].count, 1);
    assert.equal(bins[0].percentage, 20);

    assert.equal(bins[1].bin, '250 – 299 kg');
    assert.equal(bins[1].count, 1);
    assert.equal(bins[1].percentage, 20);

    assert.equal(bins[2].bin, '300 – 349 kg');
    assert.equal(bins[2].count, 1);

    assert.equal(bins[3].bin, '350 – 399 kg');
    assert.equal(bins[3].count, 1);

    assert.equal(bins[4].bin, '≥ 400 kg');
    assert.equal(bins[4].count, 1);
    assert.equal(bins[4].percentage, 20);
  });

  it('computes chronological payment velocity with daily and cumulative figures', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const velocity = (await service.getCharts(1, 'payment-velocity')) as any[];

    assert.equal(velocity.length, 2);
    assert.equal(velocity[0].date, '2026-11-01');
    assert.equal(velocity[0].dailyAmount, 3000);
    assert.equal(velocity[0].cumulativeAmount, 3000);

    assert.equal(velocity[1].date, '2026-11-02');
    assert.equal(velocity[1].dailyAmount, 3000);
    assert.equal(velocity[1].cumulativeAmount, 6000);
  });

  it('computes registration trend timeseries accurately', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const trend = (await service.getCharts(1, 'registration-trend')) as any[];

    assert.equal(trend.length, 3);
    assert.equal(trend[0].date, '2026-11-01');
    assert.equal(trend[0].dailyRegistrations, 2);
    assert.equal(trend[0].cumulativeRegistrations, 2);

    assert.equal(trend[1].date, '2026-11-02');
    assert.equal(trend[1].dailyRegistrations, 2);
    assert.equal(trend[1].cumulativeRegistrations, 4);

    assert.equal(trend[2].date, '2026-11-03');
    assert.equal(trend[2].dailyRegistrations, 1);
    assert.equal(trend[2].cumulativeRegistrations, 5);
  });

  it('returns combined chart payload when type is "all"', async () => {
    const prisma = createMockPrisma();
    const service = new AnalyticsService(prisma);
    const all = (await service.getCharts(1, 'all')) as any;

    assert.ok(all.participantDistribution);
    assert.ok(all.weightDistribution);
    assert.ok(all.paymentVelocity);
    assert.ok(all.registrationTrend);
    assert.equal(all.participantDistribution.length, 3);
    assert.equal(all.weightDistribution.length, 5);
  });
});
