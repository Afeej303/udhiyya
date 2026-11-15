/**
 * EF-01: Analytics Dashboard – V1 Integration Tests
 * Tests the HTTP Controller layer, flag handling, and auth guard contract.
 *
 * Verifies:
 * 1. Strict fail-closed Admin Guard (ExtensionAdminGuard):
 *    - Rejects unauthenticated requests (missing req.user -> 401).
 *    - Rejects non-admin requests (req.user.role !== 'ADMIN' -> 403).
 *    - Permits verified admin requests (req.user.role === 'ADMIN').
 * 2. Feature Flag Gating (FEATURE_EF_01):
 *    - Returns 403 when flag is 'off' or unset.
 * 3. Parameter Validation:
 *    - Rejects missing or non-numeric programmeId with 400 Bad Request.
 *    - Rejects unsupported chart types with 400 Bad Request.
 * 4. Controller Lifecycle & Responses:
 *    - Returns 404 when programme does not exist.
 *    - Returns 200 OK with expected schema for GET /summary.
 *    - Returns 200 OK with expected schema for GET /charts?type=all and specific types.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  AnalyticsController,
  ExtensionAdminGuard,
} from '../backend/analytics.controller.ts';
import {
  AnalyticsService,
  PrismaLike,
} from '../backend/analytics.service.ts';

// ---------------------------------------------------------------------------
// Mock Helpers
// ---------------------------------------------------------------------------

function createMockPrisma(): PrismaLike {
  const participants = [
    {
      id: 1,
      name: 'Ibrahim Qasim',
      ward: 'Ward 1',
      locality: 'Town Centre',
      status: 'APPROVED',
      createdAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      id: 2,
      name: 'Khadija Umar',
      ward: 'Ward 2',
      locality: 'South Gate',
      status: 'PENDING',
      createdAt: new Date('2026-11-02T11:00:00Z'),
    },
  ];

  const animals = [
    {
      id: 10,
      tagNumber: 'TAG-10',
      weight: 320,
      allocations: [{ id: 1 }],
      _count: { allocation: 1 },
    },
  ];

  const payments = [
    {
      id: 50,
      participantId: 1,
      amount: 3000,
      status: 'VERIFIED',
      createdAt: new Date('2026-11-01T12:00:00Z'),
    },
  ];

  return {
    programme: {
      findUnique: async ({ where }: { where: { id: number } }) => {
        if (where.id === 1) {
          return { id: 1, title: 'Qurbani 2026', year: 2026, sharePrice: 3000 };
        }
        return null;
      },
    },
    participant: {
      findMany: async () => participants,
    },
    animal: {
      findMany: async () => animals,
    },
    payment: {
      findMany: async () => payments,
    },
  };
}

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
}

function createMockExecutionContext(user?: { id: number | string; role?: string }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: user ? { authorization: 'Bearer mock-valid-jwt-token' } : {},
        user,
      }),
    }),
  } as any;
}

// ---------------------------------------------------------------------------
// Integration Tests Suite
// ---------------------------------------------------------------------------

describe('EF-01 V1 Integration: ExtensionAdminGuard', () => {
  const guard = new ExtensionAdminGuard();

  it('rejects request when user context is missing (upstream JwtAuthGuard did not run)', () => {
    const context = createMockExecutionContext(undefined);
    assert.throws(
      () => guard.canActivate(context),
      (err: any) => err.message.includes('Authentication required'),
    );
  });

  it('rejects request when user does not have ADMIN role (e.g. VOLUNTEER)', () => {
    const context = createMockExecutionContext({ id: 'u123', role: 'VOLUNTEER' });
    assert.throws(
      () => guard.canActivate(context),
      (err: any) => err.message.includes('Admin role required'),
    );
  });

  it('rejects request when user role is missing or empty', () => {
    const context = createMockExecutionContext({ id: 'u123' });
    assert.throws(
      () => guard.canActivate(context),
      (err: any) => err.message.includes('Admin role required'),
    );
  });

  it('allows request when user has explicit ADMIN role (case-insensitive)', () => {
    const contextUpper = createMockExecutionContext({ id: 'u1', role: 'ADMIN' });
    assert.equal(guard.canActivate(contextUpper), true);

    const contextLower = createMockExecutionContext({ id: 'u2', role: 'admin' });
    assert.equal(guard.canActivate(contextLower), true);
  });
});

describe('EF-01 V1 Integration: Feature Flag & Controller Lifecycle', () => {
  const originalFlag = process.env.FEATURE_EF_01;
  let service: AnalyticsService;
  let controller: AnalyticsController;

  before(() => {
    service = new AnalyticsService(createMockPrisma());
    controller = new AnalyticsController(service);
  });

  after(() => {
    process.env.FEATURE_EF_01 = originalFlag;
  });

  // Flag disabled tests
  it('returns 403 Forbidden for GET /summary when FEATURE_EF_01 is disabled or unset', async () => {
    process.env.FEATURE_EF_01 = 'off';
    const res = createMockResponse();

    await controller.getSummary('1', res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Feature EF-01 is disabled');
  });

  it('returns 403 Forbidden for GET /charts when FEATURE_EF_01 is disabled or unset', async () => {
    process.env.FEATURE_EF_01 = 'off';
    const res = createMockResponse();

    await controller.getCharts('1', 'all', res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'Feature EF-01 is disabled');
  });

  // Flag enabled tests
  it('returns 400 Bad Request when programmeId is missing or invalid', async () => {
    process.env.FEATURE_EF_01 = 'on';

    const res1 = createMockResponse();
    await controller.getSummary('', res1);
    assert.equal(res1.statusCode, 400);
    assert.ok(res1.body.error.includes('programmeId is required'));

    const res2 = createMockResponse();
    await controller.getSummary('invalid-nan', res2);
    assert.equal(res2.statusCode, 400);

    const res3 = createMockResponse();
    await controller.getSummary('-5', res3);
    assert.equal(res3.statusCode, 400);
  });

  it('returns 400 Bad Request when chart type is unsupported', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getCharts('1', 'unsupported-chart-type', res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error.includes('Invalid chart type'));
  });

  it('returns 404 Not Found when programme does not exist', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getSummary('999', res);
    assert.equal(res.statusCode, 404);
    assert.ok(res.body.error.includes('Programme with ID 999 not found'));
  });

  it('returns 200 OK with complete summary payload on happy path', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getSummary('1', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.programmeId, 1);
    assert.equal(res.body.programmeTitle, 'Qurbani 2026');
    assert.ok(res.body.participants);
    assert.equal(res.body.participants.total, 2);
    assert.equal(res.body.participants.approved, 1);
    assert.ok(res.body.weightMetrics);
    assert.equal(res.body.weightMetrics.totalAnimals, 1);
    assert.equal(res.body.weightMetrics.averageWeightKg, 320);
    assert.ok(res.body.paymentProgress);
    assert.equal(res.body.paymentProgress.collectedAmount, 3000);
    assert.ok(res.body.shareStatistics);
    assert.equal(res.body.shareStatistics.totalCapacity, 7);
    assert.equal(res.body.shareStatistics.allocatedShares, 1);
    assert.ok(res.body.updatedAt);
  });

  it('returns 200 OK with all charts when type="all"', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getCharts('1', 'all', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.programmeId, 1);
    assert.equal(res.body.chartType, 'all');
    assert.ok(res.body.data.participantDistribution);
    assert.ok(res.body.data.weightDistribution);
    assert.ok(res.body.data.paymentVelocity);
    assert.ok(res.body.data.registrationTrend);
    assert.ok(res.body.generatedAt);
  });

  it('returns 200 OK for specific chart type "participant-distribution"', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getCharts('1', 'participant-distribution', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.chartType, 'participant-distribution');
    assert.ok(Array.isArray(res.body.data));
  });

  it('returns 200 OK for specific chart type "weight-distribution"', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getCharts('1', 'weight-distribution', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.chartType, 'weight-distribution');
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 5);
  });

  it('returns 200 OK for specific chart type "payment-velocity"', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getCharts('1', 'payment-velocity', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.chartType, 'payment-velocity');
    assert.ok(Array.isArray(res.body.data));
  });

  it('returns 200 OK for specific chart type "registration-trend"', async () => {
    process.env.FEATURE_EF_01 = 'on';
    const res = createMockResponse();

    await controller.getCharts('1', 'registration-trend', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.chartType, 'registration-trend');
    assert.ok(Array.isArray(res.body.data));
  });
});
