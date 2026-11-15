/**
 * EF-03: Financial Intelligence – V1 Integration Tests
 * Tests Controller endpoints, flag gating, and fail-closed admin guard.
 * Run with: node --experimental-strip-types --test enhancements/EF-03-financial-intelligence/tests/integration.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  FinancialIntelligenceController,
  ExtensionAdminGuard,
} from '../backend/financial-intelligence.controller.ts';
import {
  FinancialIntelligenceService,
} from '../backend/financial-intelligence.service.ts';
import type {
  PrismaLike,
} from '../backend/financial-intelligence.service.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function createMockPrisma(): PrismaLike {
  return {
    programme: {
      findUnique: async ({ where }: any) => {
        if (where.id === 1) {
          return { id: 1, title: 'Qurbani 2026', year: 2026, sharePriceMinor: 300000, currency: 'INR' };
        }
        return null;
      },
    },
    participant: {
      findMany: async () => [
        {
          id: 1,
          name: 'Ahmad Faraz',
          status: 'APPROVED',
          programmeId: 1,
          sharesCount: 1,
          allocation: { id: 10, animalId: 5 },
          payments: [{ id: 1, amountMinor: 300000, reference: 'REF-A1' }],
        },
      ],
    },
    payment: {
      findMany: async () => [
        { id: 1, participantId: 1, amountMinor: 300000, reference: 'REF-A1' },
      ],
    },
    expense: {
      findMany: async () => [
        { id: 1, programmeId: 1, description: 'Cattle purchase at market', amountMinor: 20000000 },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('EF-03 Integration: ExtensionAdminGuard', () => {
  const guard = new ExtensionAdminGuard();

  function mockContext(user: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }

  it('fails closed when req.user is missing (throws 401 Unauthorized)', () => {
    assert.throws(
      () => guard.canActivate(mockContext(null)),
      /Authentication required/,
    );
  });

  it('fails closed when user lacks explicit ADMIN role (throws 403 Forbidden)', () => {
    assert.throws(
      () => guard.canActivate(mockContext({ id: 1, role: 'VOLUNTEER' })),
      /Admin role required/,
    );
  });

  it('passes when user has uppercase ADMIN role', () => {
    const allowed = guard.canActivate(mockContext({ id: 1, role: 'ADMIN' }));
    assert.equal(allowed, true);
  });

  it('passes when user has lowercase admin role (case-insensitive check)', () => {
    const allowed = guard.canActivate(mockContext({ id: 1, role: 'admin' }));
    assert.equal(allowed, true);
  });
});

describe('EF-03 Integration: Feature Flag Gating (FEATURE_EF_03)', () => {
  let controller: FinancialIntelligenceController;

  before(() => {
    delete process.env.FEATURE_EF_03; // Disabled
    const service = new FinancialIntelligenceService(createMockPrisma());
    controller = new FinancialIntelligenceController(service);
  });

  after(() => {
    process.env.FEATURE_EF_03 = 'on';
  });

  it('GET /summary returns 403 when flag is off', async () => {
    const res = createMockResponse();
    await controller.getSummary('1', res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
  });

  it('GET /anomalies returns 403 when flag is off', async () => {
    const res = createMockResponse();
    await controller.getAnomalies('1', res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
  });

  it('POST /categorise returns 403 when flag is off', async () => {
    const res = createMockResponse();
    await controller.categoriseExpenses({ expenses: [] }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Forbidden');
  });

  it('GET /categories returns 403 when flag is off', async () => {
    const res = createMockResponse();
    await controller.getCategories(res);
    assert.equal(res.statusCode, 403);
  });
});

describe('EF-03 Integration: Parameter Validation & Controller Responses (Flag ON)', () => {
  let controller: FinancialIntelligenceController;

  before(() => {
    process.env.FEATURE_EF_03 = 'on';
    const service = new FinancialIntelligenceService(createMockPrisma());
    controller = new FinancialIntelligenceController(service);
  });

  it('GET /summary rejects non-numeric or missing programmeId with 400 Bad Request', async () => {
    const res = createMockResponse();
    await controller.getSummary('invalid-id', res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.message.includes('valid numeric programmeId'));
  });

  it('GET /summary returns 404 when programme does not exist', async () => {
    const res = createMockResponse();
    await controller.getSummary('999', res);
    assert.equal(res.statusCode, 404);
    assert.ok(res.body.message.includes('not found'));
  });

  it('GET /summary returns 200 OK with financial reconciliation summary payload', async () => {
    const res = createMockResponse();
    await controller.getSummary('1', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.programmeId, 1);
    assert.equal(res.body.currency, 'INR');
    assert.equal(res.body.sharePriceMinor, 300000);
    assert.equal(res.body.totalAllocatedShares, 1);
    assert.equal(res.body.expectedRevenueMinor, 300000);
    assert.equal(res.body.collectedRevenueMinor, 300000);
    assert.equal(res.body.outstandingRevenueMinor, 0);
  });

  it('GET /anomalies returns 200 OK with anomaly list and count', async () => {
    const res = createMockResponse();
    await controller.getAnomalies('1', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.programmeId, 1);
    assert.ok(Array.isArray(res.body.anomalies));
  });

  it('POST /categorise rejects non-array payload with 400 Bad Request', async () => {
    const res = createMockResponse();
    await controller.categoriseExpenses({} as any, res);
    assert.equal(res.statusCode, 400);
  });

  it('POST /categorise classifies expenses and returns breakdown with 200 OK', async () => {
    const res = createMockResponse();
    const payload = {
      expenses: [
        { description: 'Butcher cutting fee', amountMinor: 200000 },
        { description: 'Straw hay feed', amountMinor: 50000 },
      ],
    };
    await controller.categoriseExpenses(payload, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.totalAmountMinor, 250000);
    assert.equal(res.body.items.length, 2);
    assert.equal(res.body.items[0].category, 'SLAUGHTER_AND_DRESSING');
    assert.equal(res.body.items[1].category, 'FEED_AND_FODDER');
  });

  it('GET /categories returns all 8 supported expense categories', async () => {
    const res = createMockResponse();
    await controller.getCategories(res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.categories.length, 8);
    const categoryKeys = res.body.categories.map((c: any) => c.category);
    assert.ok(categoryKeys.includes('ANIMAL_PURCHASE'));
    assert.ok(categoryKeys.includes('FEED_AND_FODDER'));
    assert.ok(categoryKeys.includes('SLAUGHTER_AND_DRESSING'));
    assert.ok(categoryKeys.includes('PACKAGING_AND_CONSUMABLES'));
    assert.ok(categoryKeys.includes('LOGISTICS_AND_TRANSPORT'));
    assert.ok(categoryKeys.includes('WASTE_AND_SANITATION'));
    assert.ok(categoryKeys.includes('ADMIN_AND_COMMUNICATION'));
    assert.ok(categoryKeys.includes('MISCELLANEOUS'));
  });
});
