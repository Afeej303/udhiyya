/**
 * EF-05: Household Intelligence – Sandbox App
 */
import React, { useState } from 'react';
import { HouseholdIntelligencePanel } from '../frontend/HouseholdIntelligencePanel.tsx';
import type { DetectionResult } from '../backend/household-intelligence.service.ts';

const MOCK: DetectionResult = {
  programmeId: 'p1', totalHouseholds: 2, totalClusters: 1, generatedAt: new Date().toISOString(),
  clusters: [{
    clusterId: 'dup-1-2', clusterScore: 90, confidenceLevel: 'HIGH', matchingReasons: ['PHONE_EXACT'],
    householdIds: ['1', '2'], households: [{ id: '1', programmeId: 'p1', name: 'Ahmed', address: 'Addr', contactPhone: '123' }, { id: '2', programmeId: 'p1', name: 'Ahmed', address: 'Addr', contactPhone: '123' }],
    status: 'open', resolvedAt: null, resolvedNote: null,
  }],
};

export const SandboxApp: React.FC = () => {
  const [state, setState] = useState<'success' | 'empty' | 'error' | 'loading'>('success');
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        {['success', 'empty', 'error', 'loading'].map(s => <button key={s} onClick={() => setState(s)} className="px-2 py-1">{s}</button>)}
      </div>
      {state === 'success' && <HouseholdIntelligencePanel programmeId={1} initialData={MOCK} />}
      {state === 'empty' && <HouseholdIntelligencePanel programmeId={2} initialData={{ programmeId: 'p2', totalHouseholds: 0, totalClusters: 0, clusters: [], generatedAt: '' }} />}
      {state === 'error' && <HouseholdIntelligencePanel programmeId={99} apiBaseUrl="/error" />}
      {state === 'loading' && <HouseholdIntelligencePanel programmeId={1} />}
    </div>
  );
};