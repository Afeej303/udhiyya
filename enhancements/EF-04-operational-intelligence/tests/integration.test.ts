/**
 * EF-04: Operational Intelligence – V1 Integration Tests
 * Tests Controller endpoints, flag gating, and fail-closed admin guard.
 * Run with: node --experimental-strip-types --test enhancements/EF-04-operational-intelligence/tests/integration.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  OperationalIntelligenceController,
  ExtensionAdminGuard,
} from '../backend/operational-intelligence.controller.ts';
import { OperationalIntelligenceService } from '../backend/operational-intelligence.service.ts';
import type { PrismaLike } from '../backend/operational-intelligence.service.ts';

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
          return { id: 1, title: 'Eid Qurbani 2026' };
        }
        return null;
      },
    },
    department: {
      findMany: async () => [
        { id: 10, name: 'Slaughter', volunteers: 5, expectedProgress: 50 },
        { id: 20, name: 'Processing', volunteers: 2, expectedProgress: 30 },
      ],
    },
    task: {
      findMany: async () => [
        { id: 1, departmentId: 10, status: 'completed', dueDate: new Date(Date.now() - 86400000).toISOString() },
        { id: 2, departmentId: 10, status: 'pending', dueDate: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, departmentId: 20, status: 'pending' },
      ],
    },
    distribution: {
      findMany: async () => [
        { id: 1, status: 'delivered' },
        { id: 2, status: 'delivered' },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('EF-04 Integration: ExtensionAdminGuard', () => {
  let guard: ExtensionAdminGuard;

  before(() => {
    guard = new ExtensionAdminGuard();
  });

  it('should reject unauthenticated requests (401)', () => {
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };
    assert.throws(() => guard.canActivate(ctx), /Authentication required/);
  });

  it('should reject non-Admin users (403)', () => {
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'VOLUNTEER' } }) }),
    };
    assert.throws(() => guard.canActivate(ctx), /Admin role required/);
  });

  it('should allow Admin users', () => {
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }),
    };
    assert.equal(guard.canActivate(ctx), true);
  });
});

describe('EF-04 Integration: Flag Gating (FEATURE_EF_04)', () => {
  let controller: OperationalIntelligenceController;
  const originalFlag = process.env.FEATURE_EF_04;

  after(() => {
    if (originalFlag === undefined) delete process.env.FEATURE_EF_04;
    else process.env.FEATURE_EF_04 = originalFlag;
  });

  it('should return 403 when flag is off', async () => {
    process.env.FEATURE_EF_04 = 'off';
    const service = new OperationalIntelligenceService(createMockPrisma());
    controller = new OperationalIntelligenceController(service);
    const res = createMockResponse();
    await controller.getStatus('1', res);
    assert.equal(res.statusCode, 403);
  });

  it('should return 200 when flag is on', async () => {
    process.env.FEATURE_EF_04 = 'on';
    const service = new OperationalIntelligenceService(createMockPrisma());
    controller = new OperationalIntelligenceController(service);
    const res = createMockResponse();
    await controller.getStatus('1', res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.programmeId, 1);
    assert.ok(Array.isArray(res.body.departments));
  });

  it('should return 400 for invalid programmeId', async () => {
    process.env.FEATURE_EF_04 = 'on';
    const service = new OperationalIntelligenceService(createMockPrisma());
    controller = new OperationalIntelligenceController(service);
    const res = createMockResponse();
    await controller.getStatus('abc', res);
    assert.equal(res.statusCode, 400);
  });

  it('should return 404 for missing programme', async () => {
    process.env.FEATURE_EF_04 = 'on';
    const service = new OperationalIntelligenceService(createMockPrisma());
    controller = new OperationalIntelligenceController(service);
    const res = createMockResponse();
    await controller.getStatus('999', res);
    assert.equal(res.statusCode, 404);
  });
});

describe('EF-04 Integration: Issues Endpoint', () => {
  let controller: OperationalIntelligenceController;
  const originalFlag = process.env.FEATURE_EF_04;

  after(() => {
    if (originalFlag === undefined) delete process.env.FEATURE_EF_04;
    else process.env.FEATURE_EF_04 = originalFlag;
  });

  it('should detect overdue and stall issues', async () => {
    process.env.FEATURE_EF_04 = 'on';
    const service = new OperationalIntelligenceService(createMockPrisma());
    controller = new OperationalIntelligenceController(service);
    const res = createMockResponse();
    await controller.getIssues('1', res);
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.issues));
    assert.ok(res.body.issues.length > 0);
    const types = res.body.issues.map((i: any) => i.type);
    assert.ok(types.includes('overdue'));
    assert.ok(types.includes('stall'));
  });
});
