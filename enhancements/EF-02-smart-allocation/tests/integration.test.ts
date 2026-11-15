/**
 * EF-02: Smart Allocation Engine – V1 Integration Tests
 * Tests the HTTP Controller layer, flag handling, and auth guard contract.
 */

import { SmartAllocationController, ExtensionAdminGuard } from '../backend/smart-allocation.controller';
import { SmartAllocationService, PrismaLike } from '../backend/smart-allocation.service';

const TEST_SECRET = 'test-hmac-secret-integration-test-key-32-chars!!';

function createMockPrisma(): PrismaLike {
  const participants = [
    {
      id: 1,
      name: 'Test Participant 1',
      householdId: 10,
      status: 'APPROVED',
      programmeId: 1,
      allocation: null,
      createdAt: new Date(),
    },
  ];
  const animals = [
    {
      id: 1,
      tagNumber: 'TAG-INT-1',
      weight: 350,
      allocation: null,
      group: { programmeId: 1, species: 'Cattle' },
    },
  ];
  return {
    programme: { findUnique: async () => ({ id: 1 }) },
    participant: { findMany: async () => participants as any },
    animal: { findMany: async () => animals as any },
    allocation: {
      createMany: async ({ data }: any) => ({ count: data.length }),
      findMany: async () => [],
      count: async () => 0,
    },
    $transaction: async (fn: any) => fn(createMockPrisma()),
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

function createMockExecutionContext(user?: { id: number; role?: string }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: user ? { authorization: 'Bearer mock-valid-jwt-token' } : {},
        user,
      }),
    }),
  } as any;
}

describe('EF-02 V1 Integration: Auth Guard', () => {
  const guard = new ExtensionAdminGuard();

  test('rejects request when user context is missing (upstream JwtAuthGuard did not run)', () => {
    const context = createMockExecutionContext(undefined);
    expect(() => guard.canActivate(context)).toThrow('Authentication required');
  });

  test('rejects request when user is not an ADMIN', () => {
    const context = createMockExecutionContext({ id: 123, role: 'VOLUNTEER' });
    expect(() => guard.canActivate(context)).toThrow('Admin role required');
  });

  test('allows request when user has ADMIN role', () => {
    const context = createMockExecutionContext({ id: 1, role: 'ADMIN' });
    expect(guard.canActivate(context)).toBe(true);
  });
});

describe('EF-02 V1 Integration: Feature Flag & Controller Lifecycle', () => {
  const originalFlag = process.env.FEATURE_EF_02;
  const originalSecret = process.env.EF02_PREVIEW_SECRET;

  beforeAll(() => {
    process.env.EF02_PREVIEW_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    process.env.FEATURE_EF_02 = originalFlag;
    process.env.EF02_PREVIEW_SECRET = originalSecret;
  });

  test('returns 403 Forbidden when FEATURE_EF_02 is off', async () => {
    process.env.FEATURE_EF_02 = 'off';
    const controller = new SmartAllocationController(new SmartAllocationService(createMockPrisma()));
    const res = createMockResponse();

    await controller.optimize({ programmeId: 1 }, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('disabled');
  });

  test('returns 400 Bad Request when programmeId is missing', async () => {
    process.env.FEATURE_EF_02 = 'on';
    const controller = new SmartAllocationController(new SmartAllocationService(createMockPrisma()));
    const res = createMockResponse();

    await controller.optimize({} as any, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('programmeId is required');
  });

  test('returns 200 OK with HMAC signed previewToken when flag is on', async () => {
    process.env.FEATURE_EF_02 = 'on';
    const controller = new SmartAllocationController(new SmartAllocationService(createMockPrisma()));
    const res = createMockResponse();

    await controller.optimize({ programmeId: 1, policy: 'default' }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.previewToken).toBeTruthy();
    expect(res.body.proposedAllocations.length).toBeGreaterThan(0);
  });

  test('commit returns 400 when previewToken is forged or missing', async () => {
    process.env.FEATURE_EF_02 = 'on';
    const controller = new SmartAllocationController(new SmartAllocationService(createMockPrisma()));
    const res = createMockResponse();

    await controller.commit({ programmeId: 1, previewToken: 'forged-tampered-token' }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid or forged preview token');
  });

  test('successful commit cycle: optimize -> commit succeeds', async () => {
    process.env.FEATURE_EF_02 = 'on';
    const controller = new SmartAllocationController(new SmartAllocationService(createMockPrisma()));
    const optRes = createMockResponse();

    await controller.optimize({ programmeId: 1 }, optRes);
    expect(optRes.statusCode).toBe(200);

    const token = optRes.body.previewToken;
    const commitRes = createMockResponse();

    await controller.commit({ programmeId: 1, previewToken: token }, commitRes);
    expect(commitRes.statusCode).toBe(200);
    expect(commitRes.body.committed).toBe(1);

    // Replay attempt fails with 410 Gone (consumed token)
    const replayRes = createMockResponse();
    await controller.commit({ programmeId: 1, previewToken: token }, replayRes);
    expect(replayRes.statusCode).toBe(410);
  });
});
