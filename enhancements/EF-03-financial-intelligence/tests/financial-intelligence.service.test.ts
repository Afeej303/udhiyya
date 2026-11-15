/**
 * EF-03: Financial Intelligence – V0 Service Unit Tests
 * Unit tests covering:
 * 1. Heuristic-based Expense Auto-Categorisation (confidence scores, keyword rules, breakdown aggregation)
 * 2. Financial Anomaly Detection (duplicate references, duplicate payments, underpayments with allocation,
 *    overpayments, unexpected non-standard installments, orphan payments)
 * 3. End-to-end Financial Reconciliation & Summary (expected vs actual revenue, net surplus/deficit, zero division safety)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FinancialIntelligenceService,
  PrismaLike,
  ExpenseInput,
} from '../backend/financial-intelligence.service.ts';

// ---------------------------------------------------------------------------
// Mock Data Helpers
// ---------------------------------------------------------------------------

function createMockPrisma(overrides?: Partial<PrismaLike>): PrismaLike {
  const programme = {
    id: 1,
    title: 'Qurbani Eid-ul-Adha 2026',
    year: 2026,
    sharePriceMinor: 300000, // ₹3,000.00
    currency: 'INR',
  };

  const participants = [
    {
      id: 101,
      name: 'Ahmed Khan',
      status: 'APPROVED',
      programmeId: 1,
      sharesCount: 1,
      allocation: { id: 1, animalId: 10 },
      payments: [
        {
          id: 501,
          participantId: 101,
          amountMinor: 300000,
          reference: 'TXN-001',
          method: 'UPI',
          paidAt: new Date('2026-11-01T10:00:00Z'),
        },
      ],
    },
    {
      id: 102,
      name: 'Bilal Siddiqui',
      status: 'APPROVED',
      programmeId: 1,
      sharesCount: 1,
      allocation: { id: 2, animalId: 10 },
      payments: [
        {
          id: 502,
          participantId: 102,
          amountMinor: 150000, // Underpaid (half)
          reference: 'TXN-002',
          method: 'CASH',
          paidAt: new Date('2026-11-02T11:00:00Z'),
        },
      ],
    },
    {
      id: 103,
      name: 'Zainab Fatima',
      status: 'APPROVED',
      programmeId: 1,
      sharesCount: 1,
      allocation: { id: 3, animalId: 10 },
      payments: [
        {
          id: 503,
          participantId: 103,
          amountMinor: 350000, // Overpaid by ₹500
          reference: 'TXN-003',
          method: 'BANK_TRANSFER',
          paidAt: new Date('2026-11-03T12:00:00Z'),
        },
      ],
    },
  ];

  const payments = [
    {
      id: 501,
      participantId: 101,
      amountMinor: 300000,
      reference: 'TXN-001',
      method: 'UPI',
      paidAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      id: 502,
      participantId: 102,
      amountMinor: 150000,
      reference: 'TXN-002',
      method: 'CASH',
      paidAt: new Date('2026-11-02T11:00:00Z'),
    },
    {
      id: 503,
      participantId: 103,
      amountMinor: 350000,
      reference: 'TXN-003',
      method: 'BANK_TRANSFER',
      paidAt: new Date('2026-11-03T12:00:00Z'),
    },
  ];

  const expenses = [
    {
      id: 'e1',
      programmeId: 1,
      description: 'Purchased 2 healthy bulls from Mandi',
      amountMinor: 5000000,
      reference: 'EXP-BULL-01',
    },
    {
      id: 'e2',
      programmeId: 1,
      description: 'Hay and green fodder feed for animals',
      amountMinor: 400000,
      reference: 'EXP-FEED-01',
    },
  ];

  return {
    programme: {
      findUnique: async ({ where }: { where: { id: number } }) => {
        if (where.id === 1) return programme;
        return null;
      },
    },
    participant: {
      findMany: async () => participants,
    },
    payment: {
      findMany: async () => payments,
    },
    expense: {
      findMany: async () => expenses,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Unit Tests Suite
// ---------------------------------------------------------------------------

describe('EF-03 V0: Expense Auto-Categorisation Engine', () => {
  const service = new FinancialIntelligenceService();

  it('correctly categorises ANIMAL_PURCHASE keywords with HIGH confidence', () => {
    const res1 = service.categoriseExpense({
      description: 'Payment for 5 large cattle bulls from livestock market',
      amountMinor: 15000000,
    });
    assert.equal(res1.category, 'ANIMAL_PURCHASE');
    assert.equal(res1.confidence, 'HIGH');
    assert.ok(res1.ruleExplanation.includes('cattle/cow/bull'));

    const res2 = service.categoriseExpense({
      description: 'Paid mandi dalal broker fee for buffalo procurement',
      amountMinor: 250000,
    });
    assert.equal(res2.category, 'ANIMAL_PURCHASE');
    assert.equal(res2.confidence, 'HIGH');
  });

  it('correctly categorises FEED_AND_FODDER expenses', () => {
    const res = service.categoriseExpense({
      description: 'Purchased 10 bales of dry hay and wheat straw fodder',
      amountMinor: 350000,
    });
    assert.equal(res.category, 'FEED_AND_FODDER');
    assert.equal(res.confidence, 'HIGH');

    const resWater = service.categoriseExpense({
      description: 'Water tanker for livestock drinking supply',
      amountMinor: 120000,
    });
    assert.equal(resWater.category, 'FEED_AND_FODDER');
  });

  it('correctly categorises SLAUGHTER_AND_DRESSING with butcher and kasai terms', () => {
    const res1 = service.categoriseExpense({
      description: 'Paid advance to chief butcher kasab for Day 1 slaughter',
      amountMinor: 800000,
    });
    assert.equal(res1.category, 'SLAUGHTER_AND_DRESSING');
    assert.equal(res1.confidence, 'HIGH');

    const res2 = service.categoriseExpense({
      description: 'Skinning and dressing staff cutting charges',
      amountMinor: 600000,
    });
    assert.equal(res2.category, 'SLAUGHTER_AND_DRESSING');

    const res3 = service.categoriseExpense({
      description: 'Butchery knife and cleaver blade sharpening',
      amountMinor: 15000,
    });
    assert.equal(res3.category, 'SLAUGHTER_AND_DRESSING');
  });

  it('correctly categorises PACKAGING_AND_CONSUMABLES', () => {
    const res = service.categoriseExpense({
      description: 'Food grade polythene meat bags and packing cartons',
      amountMinor: 180000,
    });
    assert.equal(res.category, 'PACKAGING_AND_CONSUMABLES');
    assert.equal(res.confidence, 'HIGH');

    const resIce = service.categoriseExpense({
      description: 'Ice blocks for meat chilling preservation',
      amountMinor: 90000,
    });
    assert.equal(resIce.category, 'PACKAGING_AND_CONSUMABLES');
  });

  it('correctly categorises LOGISTICS_AND_TRANSPORT', () => {
    const res = service.categoriseExpense({
      description: 'Tata Ace tempo transport rental and diesel fuel',
      amountMinor: 450000,
    });
    assert.equal(res.category, 'LOGISTICS_AND_TRANSPORT');
    assert.equal(res.confidence, 'HIGH');

    const resPorter = service.categoriseExpense({
      description: 'Porter charge for animal unloading and hamali',
      amountMinor: 100000,
    });
    assert.equal(resPorter.category, 'LOGISTICS_AND_TRANSPORT');
  });

  it('correctly categorises WASTE_AND_SANITATION', () => {
    const res = service.categoriseExpense({
      description: 'Disposal of offal carcass waste and municipal dumping fee',
      amountMinor: 250000,
    });
    assert.equal(res.category, 'WASTE_AND_SANITATION');
    assert.equal(res.confidence, 'HIGH');

    const resSan = service.categoriseExpense({
      description: 'Bleaching powder and disinfectant for site cleaning',
      amountMinor: 65000,
    });
    assert.equal(resSan.category, 'WASTE_AND_SANITATION');
  });

  it('correctly categorises ADMIN_AND_COMMUNICATION', () => {
    const res = service.categoriseExpense({
      description: 'Printed registration tokens, receipt books and directional banners',
      amountMinor: 150000,
    });
    assert.equal(res.category, 'ADMIN_AND_COMMUNICATION');
    assert.equal(res.confidence, 'HIGH');

    const resTea = service.categoriseExpense({
      description: 'Volunteer refreshment, tea and lunch during distribution',
      amountMinor: 120000,
    });
    assert.equal(resTea.category, 'ADMIN_AND_COMMUNICATION');
  });

  it('falls back to MISCELLANEOUS with LOW confidence for unrecognised items', () => {
    const res = service.categoriseExpense({
      description: 'Unspecified emergency sundry expense 99',
      amountMinor: 50000,
    });
    assert.equal(res.category, 'MISCELLANEOUS');
    assert.equal(res.confidence, 'LOW');
  });

  it('batches expenses and calculates category totals and percentages accurately', () => {
    const batchInput: ExpenseInput[] = [
      { description: 'Bull purchase', amountMinor: 6000000 },
      { description: 'Fodder grass', amountMinor: 2000000 },
      { description: 'Slaughter butcher', amountMinor: 2000000 },
    ];
    const result = service.categoriseBatch(batchInput);

    assert.equal(result.items.length, 3);
    assert.equal(result.totalAmountMinor, 10000000); // ₹1,00,000.00
    assert.equal(result.breakdown.length, 3);

    const animalPurchase = result.breakdown.find((b) => b.category === 'ANIMAL_PURCHASE');
    assert.ok(animalPurchase);
    assert.equal(animalPurchase.amountMinor, 6000000);
    assert.equal(animalPurchase.percentageOfTotal, 60);

    const feed = result.breakdown.find((b) => b.category === 'FEED_AND_FODDER');
    assert.ok(feed);
    assert.equal(feed.percentageOfTotal, 20);
  });
});

describe('EF-03 V0: Financial Anomaly Detection Engine', () => {
  it('throws an error when programme does not exist', async () => {
    const prisma = createMockPrisma();
    const service = new FinancialIntelligenceService(prisma);

    await assert.rejects(
      () => service.detectAnomalies(999),
      (err: any) => err.message.includes('Programme with ID 999 not found'),
    );
  });

  it('flags duplicate payment reference numbers across different records', async () => {
    const duplicatePaymentsPrisma = createMockPrisma({
      payment: {
        findMany: async () => [
          { id: 1, participantId: 101, amountMinor: 300000, reference: 'DUP-UTR-9988' },
          { id: 2, participantId: 102, amountMinor: 300000, reference: 'DUP-UTR-9988' }, // Identical reference!
        ],
      },
    });
    const service = new FinancialIntelligenceService(duplicatePaymentsPrisma);
    const anomalies = await service.detectAnomalies(1);

    const dupRef = anomalies.find((a) => a.type === 'DUPLICATE_PAYMENT_REF');
    assert.ok(dupRef, 'Should detect DUPLICATE_PAYMENT_REF');
    assert.equal(dupRef.severity, 'HIGH');
    assert.equal(dupRef.paymentReference, 'DUP-UTR-9988');
    assert.ok(dupRef.description.includes('Duplicate payment reference'));
  });

  it('flags duplicate payments for the same participant with identical amount', async () => {
    const duplicatePayPrisma = createMockPrisma({
      participant: {
        findMany: async () => [
          {
            id: 101,
            name: 'Rashid Ali',
            status: 'APPROVED',
            programmeId: 1,
            sharesCount: 1,
            allocation: { id: 1, animalId: 5 },
            payments: [
              { id: 11, amountMinor: 300000, reference: 'TXN-A' },
              { id: 12, amountMinor: 300000, reference: 'TXN-B' }, // Double charged!
            ],
          },
        ],
      },
      payment: {
        findMany: async () => [
          { id: 11, participantId: 101, amountMinor: 300000, reference: 'TXN-A' },
          { id: 12, participantId: 101, amountMinor: 300000, reference: 'TXN-B' },
        ],
      },
    });
    const service = new FinancialIntelligenceService(duplicatePayPrisma);
    const anomalies = await service.detectAnomalies(1);

    const dupPay = anomalies.find((a) => a.type === 'DUPLICATE_PAYMENT');
    assert.ok(dupPay, 'Should detect DUPLICATE_PAYMENT');
    assert.equal(dupPay.severity, 'HIGH');
    assert.equal(dupPay.participantId, 101);
  });

  it('flags underpayment when participant has an active animal allocation', async () => {
    const prisma = createMockPrisma();
    const service = new FinancialIntelligenceService(prisma);
    const anomalies = await service.detectAnomalies(1);

    // In mock data: Bilal Siddiqui (102) is allocated to animal 10 but only paid ₹1,500 of ₹3,000
    const underpaidAlloc = anomalies.find((a) => a.type === 'UNDERPAYMENT_WITH_ALLOCATION');
    assert.ok(underpaidAlloc, 'Should detect UNDERPAYMENT_WITH_ALLOCATION');
    assert.equal(underpaidAlloc.severity, 'HIGH');
    assert.equal(underpaidAlloc.participantId, 102);
    assert.equal(underpaidAlloc.amountMinor, 150000);
    assert.equal(underpaidAlloc.expectedAmountMinor, 300000);
  });

  it('flags overpayment when participant paid more than share price', async () => {
    const prisma = createMockPrisma();
    const service = new FinancialIntelligenceService(prisma);
    const anomalies = await service.detectAnomalies(1);

    // In mock data: Zainab Fatima (103) paid ₹3,500 for a ₹3,000 share
    const overpayment = anomalies.find((a) => a.type === 'OVERPAYMENT');
    assert.ok(overpayment, 'Should detect OVERPAYMENT');
    assert.equal(overpayment.severity, 'MEDIUM');
    assert.equal(overpayment.participantId, 103);
    assert.equal(overpayment.amountMinor, 350000);
  });

  it('flags orphan payment referencing an unlinked/cancelled participant ID', async () => {
    const orphanPrisma = createMockPrisma({
      participant: {
        findMany: async () => [
          { id: 101, name: 'Ahmed Khan', status: 'APPROVED', programmeId: 1, payments: [] },
        ],
      },
      payment: {
        findMany: async () => [
          { id: 999, participantId: 9999, amountMinor: 300000, reference: 'ORPHAN-REF' },
        ],
      },
    });
    const service = new FinancialIntelligenceService(orphanPrisma);
    const anomalies = await service.detectAnomalies(1);

    const orphan = anomalies.find((a) => a.type === 'ORPHAN_PAYMENT');
    assert.ok(orphan, 'Should detect ORPHAN_PAYMENT');
    assert.equal(orphan.severity, 'HIGH');
    assert.equal(orphan.participantId, 9999);
  });

  it('returns empty anomalies when all accounts are balanced and reconciled', async () => {
    const cleanPrisma = createMockPrisma({
      participant: {
        findMany: async () => [
          {
            id: 101,
            name: 'Tahir Ali',
            status: 'APPROVED',
            programmeId: 1,
            sharesCount: 1,
            allocation: { id: 1, animalId: 10 },
            payments: [{ id: 1, amountMinor: 300000, reference: 'CLEAN-01' }],
          },
        ],
      },
      payment: {
        findMany: async () => [
          { id: 1, participantId: 101, amountMinor: 300000, reference: 'CLEAN-01' },
        ],
      },
    });
    const service = new FinancialIntelligenceService(cleanPrisma);
    const anomalies = await service.detectAnomalies(1);
    assert.equal(anomalies.length, 0);
  });
});

describe('EF-03 V0: Financial Summary & Reconciliation Engine', () => {
  it('computes accurate expected revenue, collected revenue, deficit and surplus', async () => {
    const prisma = createMockPrisma();
    const service = new FinancialIntelligenceService(prisma);
    const summary = await service.getSummary(1);

    assert.equal(summary.programmeId, 1);
    assert.equal(summary.currency, 'INR');
    assert.equal(summary.sharePriceMinor, 300000); // ₹3,000
    assert.equal(summary.totalParticipants, 3);
    assert.equal(summary.totalAllocatedShares, 3);

    // Expected revenue: 3 allocated shares * 300000 = 900000 (₹9,000)
    assert.equal(summary.expectedRevenueMinor, 900000);

    // Collected revenue: 300000 + 150000 + 350000 = 800000 (₹8,000)
    assert.equal(summary.collectedRevenueMinor, 800000);

    // Outstanding revenue: 900000 - 800000 = 100000 (₹1,000)
    assert.equal(summary.outstandingRevenueMinor, 100000);

    // Collection rate: (800000 / 900000) * 100 = 88.89%
    assert.equal(summary.collectionRatePercentage, 88.89);

    // Expenses: 5000000 (bulls) + 400000 (fodder) = 5400000
    assert.equal(summary.totalExpensesMinor, 5400000);

    // Net surplus/deficit: 800000 (revenue) - 5400000 (expenses) = -4600000 (deficit)
    assert.equal(summary.netSurplusDeficitMinor, -4600000);
    assert.equal(summary.isSurplus, false);

    // Anomaly summary
    assert.ok(summary.anomalySummary.totalAnomalies >= 2);
    assert.ok(summary.generatedAt);
  });

  it('handles empty programme safely with zero division protection', async () => {
    const emptyPrisma = createMockPrisma({
      participant: { findMany: async () => [] },
      payment: { findMany: async () => [] },
      expense: { findMany: async () => [] },
    });
    const service = new FinancialIntelligenceService(emptyPrisma);
    const summary = await service.getSummary(1);

    assert.equal(summary.totalParticipants, 0);
    assert.equal(summary.totalAllocatedShares, 0);
    assert.equal(summary.expectedRevenueMinor, 0);
    assert.equal(summary.collectedRevenueMinor, 0);
    assert.equal(summary.outstandingRevenueMinor, 0);
    assert.equal(summary.collectionRatePercentage, 0);
    assert.equal(summary.totalExpensesMinor, 0);
    assert.equal(summary.netSurplusDeficitMinor, 0);
    assert.equal(summary.isSurplus, true);
    assert.equal(summary.anomalySummary.totalAnomalies, 0);
  });
});
