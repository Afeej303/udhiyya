/**
 * EF-04: Operational Intelligence – V0 Service Unit Tests
 * Unit tests covering:
 * 1. Programme resolution and 404 behavior
 * 2. Department status aggregation (slaughter / processing / distribution)
 * 3. Issue detection: overdue tasks, stalled departments, workload imbalance, SLA delays
 * 4. Empty / zero-division safety
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OperationalIntelligenceService, PrismaLike } from '../backend/operational-intelligence.service.ts';

// ---------------------------------------------------------------------------
// Mock Data Helpers
// ---------------------------------------------------------------------------

function createMockPrisma(overrides?: Partial<PrismaLike>): PrismaLike {
  const base: PrismaLike = {
    programme: {
      findUnique: async () => null,
    },
    department: {
      findMany: async () => [],
    },
    task: {
      findMany: async () => [],
    },
    distribution: {
      findMany: async () => [],
    },
  };
  return { ...base, ...overrides };
}

const now = new Date();
const yesterday = new Date(now.getTime() - 86400000);
const tomorrow = new Date(now.getTime() + 86400000);

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('EF-04 V0: OperationalIntelligenceService.getStatus', () => {
  it('throws NOT_FOUND when programme does not exist', async () => {
    const service = new OperationalIntelligenceService(createMockPrisma());
    await assert.rejects(() => service.getStatus(999), /not found/i);
  });

  it('returns zeroed metrics and empty departments when no data exists', async () => {
    const service = new OperationalIntelligenceService(
      createMockPrisma({
        programme: { findUnique: async () => ({ id: 1, title: 'Eid Qurbani 2026' }) },
      }),
    );
    const result = await service.getStatus(1);
    assert.equal(result.programmeId, 1);
    assert.equal(result.programmeTitle, 'Eid Qurbani 2026');
    assert.deepEqual(result.departments, []);
    assert.equal(result.slaughterProgress, 0);
    assert.equal(result.processingCompletion, 0);
    assert.equal(result.packagesDistributed, 0);
  });

  it('aggregates slaughter and processing completion percentages', async () => {
    const service = new OperationalIntelligenceService(
      createMockPrisma({
        programme: { findUnique: async () => ({ id: 1, title: 'Eid Qurbani 2026' }) },
        department: {
          findMany: async () => [
            { id: 10, name: 'Slaughter', volunteers: 5, expectedProgress: 50 },
            { id: 20, name: 'Processing', volunteers: 2, expectedProgress: 30 },
          ],
        },
        task: {
          findMany: async () => [
            { id: 1, departmentId: 10, status: 'completed', dueDate: yesterday.toISOString() },
            { id: 2, departmentId: 10, status: 'completed', dueDate: yesterday.toISOString() },
            { id: 3, departmentId: 10, status: 'pending', dueDate: tomorrow.toISOString() },
            { id: 4, departmentId: 20, status: 'completed' },
            { id: 5, departmentId: 20, status: 'pending' },
            { id: 6, departmentId: 20, status: 'pending' },
          ],
        },
        distribution: {
          findMany: async () => [
            { id: 1, status: 'delivered' },
            { id: 2, status: 'delivered' },
            { id: 3, status: 'pending' },
          ],
        },
      }),
    );
    const result = await service.getStatus(1);
    assert.equal(result.departments.length, 2);
    assert.equal(result.slaughterProgress, Math.round((2 / 3) * 100));
    assert.equal(result.processingCompletion, Math.round((1 / 3) * 100));
    assert.equal(result.packagesDistributed, 2);
  });
});

describe('EF-04 V0: OperationalIntelligenceService.getIssues', () => {
  it('returns empty array when programme has no departments', async () => {
    const service = new OperationalIntelligenceService(
      createMockPrisma({
        programme: { findUnique: async () => ({ id: 1, title: 'Eid Qurbani 2026' }) },
      }),
    );
    const issues = await service.getIssues(1);
    assert.deepEqual(issues, []);
  });

  it('detects overdue tasks per department with day-based severity', async () => {
    const service = new OperationalIntelligenceService(
      createMockPrisma({
        programme: { findUnique: async () => ({ id: 1, title: 'Eid Qurbani 2026' }) },
        department: {
          findMany: async () => [{ id: 10, name: 'Slaughter', volunteers: 5, expectedProgress: 100 }],
        },
        task: {
          findMany: async () => [
            { id: 1, departmentId: 10, status: 'pending', dueDate: yesterday.toISOString() },
            { id: 2, departmentId: 10, status: 'pending', dueDate: yesterday.toISOString() },
            { id: 3, departmentId: 10, status: 'completed', dueDate: yesterday.toISOString() },
          ],
        },
      }),
    );
    const issues = await service.getIssues(1);
    const overdue = issues.filter((i) => i.type === 'overdue');
    assert.equal(overdue.length, 1);
    assert.equal(overdue[0].department, 'Slaughter');
    assert.equal(overdue[0].metric, 2); // completed task excluded
    assert.equal(overdue[0].severity, 'medium'); // 2 overdue >= 2 => medium
  });

  it('detects stalled department when tasks exist but none completed', async () => {
    const service = new OperationalIntelligenceService(
      createMockPrisma({
        programme: { findUnique: async () => ({ id: 1, title: 'Eid Qurbani 2026' }) },
        department: {
          findMany: async () => [{ id: 20, name: 'Processing', volunteers: 2, expectedProgress: 30 }],
        },
        task: {
          findMany: async () => [
            { id: 1, departmentId: 20, status: 'pending' },
            { id: 2, departmentId: 20, status: 'in-progress' },
          ],
        },
      }),
    );
    const issues = await service.getIssues(1);
    const stall = issues.find((i) => i.type === 'stall');
    assert.ok(stall, 'expected stall issue');
    assert.equal(stall.severity, 'high');
  });

  it('detects workload imbalance when department load exceeds 1.5x average', async () => {
    const service = new OperationalIntelligenceService(
      createMockPrisma({
        programme: { findUnique: async () => ({ id: 1, title: 'Eid Qurbani 2026' }) },
        department: {
          findMany: async () => [
            { id: 10, name: 'Slaughter', volunteers: 1, expectedProgress: 50 },
            { id: 20, name: 'Processing', volunteers: 9, expectedProgress: 30 },
          ],
        },
        task: {
          findMany: async () => [
            { id: 1, departmentId: 10, status: 'pending' },
            { id: 2, departmentId: 10, status: 'pending' },
            { id: 3, departmentId: 10, status: 'pending' },
            { id: 4, departmentId: 20, status: 'pending' },
            { id: 5, departmentId: 20, status: 'pending' },
          ],
        },
      }),
    );
    const issues = await service.getIssues(1);
    const imbalance = issues.find((i) => i.type === 'workload_imbalance');
    assert.ok(imbalance, 'expected workload imbalance issue');
    assert.equal(imbalance.department, 'Slaughter');
    assert.equal(imbalance.severity, 'medium');
  });

  it('detects SLA delay when actual progress is 20+ points below expected', async () => {
    const service = new OperationalIntelligenceService(
      createMockPrisma({
        programme: { findUnique: async () => ({ id: 1, title: 'Eid Qurbani 2026' }) },
        department: {
          findMany: async () => [
            { id: 10, name: 'Slaughter', volunteers: 5, expectedProgress: 80 },
          ],
        },
        task: {
          findMany: async () => [
            { id: 1, departmentId: 10, status: 'completed' },
            { id: 2, departmentId: 10, status: 'pending' },
            { id: 3, departmentId: 10, status: 'pending' },
            { id: 4, departmentId: 10, status: 'pending' },
          ],
        },
      }),
    );
    const issues = await service.getIssues(1);
    const delay = issues.find((i) => i.type === 'delay');
    assert.ok(delay, 'expected delay issue');
    // actual 25% vs expected 80% => gap 55 > 40 => high severity
    assert.equal(delay.severity, 'high');
  });

  it('throws NOT_FOUND when programme does not exist', async () => {
    const service = new OperationalIntelligenceService(createMockPrisma());
    await assert.rejects(() => service.getIssues(999), /not found/i);
  });
});
