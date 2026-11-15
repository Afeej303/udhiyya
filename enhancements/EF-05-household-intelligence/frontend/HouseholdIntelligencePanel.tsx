/**
 * EF-05: Household Intelligence – Controller Component
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { DetectionResult } from '../backend/household-intelligence.service.ts';
import { HouseholdIntelligenceView } from './HouseholdIntelligenceView.tsx';

export interface HouseholdIntelligencePanelProps {
  programmeId: number;
  initialData?: DetectionResult;
  apiBaseUrl?: string;
  authToken?: string;
  mockFetch?: (url: string, options?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;
}

export const HouseholdIntelligencePanel: React.FC<HouseholdIntelligencePanelProps> = ({
  programmeId,
  initialData,
  apiBaseUrl = '/api/ext/EF-05',
  authToken,
  mockFetch,
}) => {
  const [data, setData] = useState<DetectionResult | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${apiBaseUrl}${endpoint}`;
    if (mockFetch) return mockFetch(url, options);
    const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };
    return fetch(url, { ...options, headers: { ...headers, ...(options.headers as any) } });
  }, [apiBaseUrl, authToken, mockFetch]);

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetchApi(`/duplicates?programmeId=${programmeId}`);
      if (res.status === 403) { setData(null); setLoading(false); return; }
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `Failed (${res.status})`); }
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Error loading');
    } finally { setLoading(false); }
  }, [programmeId, fetchApi]);

  useEffect(() => { if (!initialData) loadData(); }, [loadData, initialData]);

  const handleResolve = async (clusterId: string, action: 'dismiss' | 'flag_for_review') => {
    setResolving(clusterId);
    try {
      const res = await fetchApi('/resolve', { method: 'POST', body: JSON.stringify({ clusterId, action, programmeId: String(programmeId) }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Resolve failed'); }
      await loadData();
    } catch (err: any) { setError(err.message || 'Resolve error'); } finally { setResolving(null); }
  };

  const isEmpty = Boolean(data && data.totalClusters === 0);
  return <HouseholdIntelligenceView loading={loading} error={error} empty={isEmpty} data={data} resolving={resolving} onResolve={handleResolve} onRefresh={loadData} onRetry={loadData} />;
};
