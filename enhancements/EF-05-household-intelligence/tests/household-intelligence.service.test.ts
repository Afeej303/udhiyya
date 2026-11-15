/**
 * EF-05: Household Intelligence – V0 Service Unit Tests
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HouseholdIntelligenceService, normalizePhone, scorePair } from '../backend/household-intelligence.service.ts';

describe('EF-05 V0: Detection Logic', () => {
  it('normalizes phones', () => {
    assert.strictEqual(normalizePhone('+919847122334'), '9847122334');
    assert.strictEqual(normalizePhone('09847122334'), '9847122334');
  });

  it('scores duplicate pair correctly', () => {
    const h1 = { id: '1', programmeId: 'p1', name: 'Ahmad Khan', address: '12 Masjid Rd', contactPhone: '9847122334' };
    const h2 = { id: '2', programmeId: 'p1', name: 'Ahmed Khan', address: '12 Masjid Road', contactPhone: '9847122334' };
    const res = scorePair(h1, h2);
    assert.ok(res.score >= 60);
    assert.ok(res.reasons.includes('PHONE_EXACT'));
  });
});

describe('EF-05 V0: Service Engine', () => {
  it('detects duplicate clusters', async () => {
    const mockPrisma = {
      programme: { findUnique: async () => ({ id: 'p1' }) },
      applicantHousehold: {
        findMany: async () => [
          { id: '1', programmeId: 'p1', name: 'A', address: 'Addr', contactPhone: '123' },
          { id: '2', programmeId: 'p1', name: 'A', address: 'Addr', contactPhone: '123' },
        ],
      },
    };
    const svc = new HouseholdIntelligenceService(mockPrisma as any);
    const result = await svc.detectDuplicates('p1');
    assert.strictEqual(result.totalClusters, 1);
  });
});
