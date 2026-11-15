/**
 * EF-05: Household Intelligence – V1 Integration Tests
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { HouseholdIntelligenceController, ExtensionAdminGuard } from '../backend/household-intelligence.controller.ts';
import { HouseholdIntelligenceService } from '../backend/household-intelligence.service.ts';

function createMockResponse() {
  return {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
}

function createMockPrisma() {
  return {
    programme: { findUnique: async () => ({ id: 'p1' }) },
    applicantHousehold: {
      findMany: async () => [
        { id: '1', programmeId: 'p1', name: 'A', address: 'Addr', contactPhone: '123', contactEmail: 'a@b.com' },
        { id: '2', programmeId: 'p1', name: 'A', address: 'Addr', contactPhone: '123', contactEmail: 'a@b.com' },
      ],
    },
  };
}

describe('EF-05 V1: ExtensionAdminGuard', () => {
  const guard = new ExtensionAdminGuard();
  it('fails closed when no user', () => assert.throws(() => guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({}) }) } as any)));
  it('fails closed when not admin', () => assert.throws(() => guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ user: { role: 'VOLUNTEER' } }) }) } as any)));
  it('passes for admin', () => assert.strictEqual(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }) } as any), true));
});

describe('EF-05 V1: Controller Flag & Validation', () => {
  let controller: HouseholdIntelligenceController;
  before(() => { process.env.FEATURE_EF_05 = 'on'; controller = new HouseholdIntelligenceController(new HouseholdIntelligenceService(createMockPrisma() as any)); });
  after(() => { delete process.env.FEATURE_EF_05; });

  it('GET /duplicates returns 200 with clusters', async () => {
    const res = createMockResponse();
    await controller.getDuplicates('p1', res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.totalClusters, 1);
  });

  it('POST /resolve works', async () => {
    const res = createMockResponse();
    await controller.resolveDuplicate({ clusterId: 'dup-1-2', action: 'dismiss', programmeId: 'p1' }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.cluster.status, 'dismissed');
  });
});

describe('EF-05 V1: Flag off returns 403', () => {
  let controller: HouseholdIntelligenceController;
  before(() => { delete process.env.FEATURE_EF_05; controller = new HouseholdIntelligenceController(new HouseholdIntelligenceService(createMockPrisma() as any)); });
  it('GET /duplicates returns 403', async () => {
    const res = createMockResponse();
    await controller.getDuplicates('p1', res);
    assert.strictEqual(res.statusCode, 403);
  });
});
