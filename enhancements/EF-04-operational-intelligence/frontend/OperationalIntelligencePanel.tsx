/**
 * EF-04: Operational Intelligence – Controller Component
 * Owned by M3. Mounts in named slot: `operational-intelligence-slot`.
 * Flag: `VITE_FEATURE_EF_04 === 'off'` renders null; backend returns 403 when off.
 *
 * M1 Architecture:
 * - Controller (this file): owns state, API integration, and event callbacks. Stable part.
 * - View (OperationalIntelligenceView.tsx): thin basic view, easily restyled by M1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  OperationalStatusResult,
  OperationalIssue,
} from '../backend/operational-intelligence.service.ts';
import {
  OperationalIntelligenceView,
  type OperationalIntelligenceViewProps,
} from './OperationalIntelligenceView.tsx';

// ---------------------------------------------------------------------------
// Props Interface
// ---------------------------------------------------------------------------

export interface OperationalIntelligencePanelProps {
  programmeId: number;
  apiBaseUrl?: string;
  authToken?: string;
  enabled?: boolean;
  mockFetch?: (url: string, options?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;
}

// ---------------------------------------------------------------------------
// Controller Component
// ---------------------------------------------------------------------------

export const OperationalIntelligencePanel: React.FC<OperationalIntelligencePanelProps> = ({
  programmeId,
  apiBaseUrl = '/api/ext/EF-04',
  authToken,
  enabled = true,
  mockFetch,
}) => {
  // -------------------------------------------------------------------------
  // Controller State (All hooks invoked unconditionally at top of component)
  // -------------------------------------------------------------------------
  const [data, setData] = useState<{
    status: OperationalStatusResult | null;
    issues: OperationalIssue[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState<boolean>(false);

  const fetchApi = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const url = `${apiBaseUrl}${endpoint}`;
      if (mockFetch) {
        return mockFetch(url, options);
      }
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };
      return fetch(url, { ...options, headers: { ...headers, ...(options.headers as any) } });
    },
    [apiBaseUrl, authToken, mockFetch],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, issuesRes] = await Promise.all([
        fetchApi(`/status?programmeId=${programmeId}`),
        fetchApi(`/issues?programmeId=${programmeId}`),
      ]);

      if (statusRes.status === 403 || issuesRes.status === 403) {
        setDisabled(true);
        setLoading(false);
        return;
      }

      if (!statusRes.ok) {
        const errJson = await statusRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to fetch status (status ${statusRes.status})`);
      }

      if (!issuesRes.ok) {
        const errJson = await issuesRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to fetch issues (status ${issuesRes.status})`);
      }

      const statusData: OperationalStatusResult = await statusRes.json();
      const issuesData = await issuesRes.json();

      setData({ status: statusData, issues: issuesData.issues || [] });
    } catch (err: any) {
      setError(err.message || 'Error communicating with operational intelligence service.');
    } finally {
      setLoading(false);
    }
  }, [programmeId, fetchApi]);

  // Feature flag check (slot wrapper owns the flag check; evaluated after hook definitions)
  const isFlagDisabled =
    enabled === false ||
    (typeof process !== 'undefined' && process.env?.VITE_FEATURE_EF_04 === 'off');

  useEffect(() => {
    if (!isFlagDisabled) {
      loadData();
    }
  }, [loadData, isFlagDisabled]);

  // If slot or environment specifies flag is off, or backend returned 403, render null
  if (isFlagDisabled || disabled) {
    return null;
  }

  const viewProps: OperationalIntelligenceViewProps = {
    loading,
    error,
    data,
  };

  return <OperationalIntelligenceView {...viewProps} />;
};
