/**
 * EF-03: Financial Intelligence – Controller Component
 * Owned by M3. Mounts in named slot: `financial-intelligence-slot`.
 * Flag: `VITE_FEATURE_EF_03 === 'off'` renders null; backend returns 403 when off.
 *
 * M1 Architecture:
 * - Controller (this file): owns state, API integration, and event callbacks. Stable part.
 * - View (FinancialIntelligenceView.tsx): thin basic view, easily restyled by M1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  FinancialSummaryResult,
  FinancialAnomaly,
  CategorisedExpense,
} from '../backend/financial-intelligence.service.ts';
import {
  FinancialIntelligenceView,
  type FinancialIntelligenceViewProps,
} from './FinancialIntelligenceView.tsx';

// ---------------------------------------------------------------------------
// Props Interface
// ---------------------------------------------------------------------------

export interface FinancialIntelligencePanelProps {
  programmeId: number;
  initialSummary?: FinancialSummaryResult;
  initialAnomalies?: FinancialAnomaly[];
  apiBaseUrl?: string;
  authToken?: string;
  enabled?: boolean;
  ViewComponent?: React.FC<FinancialIntelligenceViewProps>;
  mockFetch?: (url: string, options?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;
}

export const FinancialIntelligencePanel: React.FC<FinancialIntelligencePanelProps> = ({
  programmeId,
  initialSummary,
  initialAnomalies,
  apiBaseUrl = '/api/ext/EF-03',
  authToken,
  enabled = true,
  ViewComponent = FinancialIntelligenceView,
  mockFetch,
}) => {
  // -------------------------------------------------------------------------
  // Controller State (All hooks invoked unconditionally at top of component)
  // -------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'overview' | 'anomalies' | 'categoriser'>('overview');
  const [summary, setSummary] = useState<FinancialSummaryResult | null>(initialSummary || null);
  const [anomalies, setAnomalies] = useState<FinancialAnomaly[]>(initialAnomalies || []);
  const [loading, setLoading] = useState<boolean>(!initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState<boolean>(false);

  // Form input state for interactive auto-categoriser
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expensePaidTo, setExpensePaidTo] = useState<string>('');
  const [categorisedItems, setCategorisedItems] = useState<CategorisedExpense[]>([]);
  const [categorising, setCategorising] = useState<boolean>(false);

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
      const [sumRes, anomRes] = await Promise.all([
        fetchApi(`/summary?programmeId=${programmeId}`),
        fetchApi(`/anomalies?programmeId=${programmeId}`),
      ]);

      if (sumRes.status === 403 || anomRes.status === 403) {
        setDisabled(true);
        setLoading(false);
        return;
      }

      if (!sumRes.ok) {
        const errJson = await sumRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to fetch summary (status ${sumRes.status})`);
      }

      if (!anomRes.ok) {
        const errJson = await anomRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to fetch anomalies (status ${anomRes.status})`);
      }

      const summaryData: FinancialSummaryResult = await sumRes.json();
      const anomaliesData = await anomRes.json();

      setSummary(summaryData);
      setAnomalies(anomaliesData.anomalies || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with financial intelligence service.');
    } finally {
      setLoading(false);
    }
  }, [programmeId, fetchApi]);

  // Feature flag check (slot wrapper owns the flag check; evaluated after hook definitions)
  const isFlagDisabled =
    enabled === false ||
    (typeof process !== 'undefined' && process.env?.VITE_FEATURE_EF_03 === 'off');

  useEffect(() => {
    if (!initialSummary && !isFlagDisabled) {
      loadData();
    }
  }, [loadData, initialSummary, isFlagDisabled]);

  const handleCategoriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount.trim()) return;

    setCategorising(true);
    try {
      const payload = {
        expenses: [
          {
            description: expenseDesc.trim(),
            amount: parseFloat(expenseAmount),
            paidTo: expensePaidTo.trim() || undefined,
          },
        ],
      };

      const res = await fetchApi('/categorise', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Auto-categorisation failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        setCategorisedItems((prev) => [...data.items, ...prev]);
        setExpenseDesc('');
        setExpenseAmount('');
        setExpensePaidTo('');
      }
    } catch (err: any) {
      setError(err.message || 'Auto-categorisation failed.');
    } finally {
      setCategorising(false);
    }
  };

  // If slot or environment specifies flag is off, or backend returned 403, render null
  if (isFlagDisabled || disabled) {
    return null;
  }

  const isEmpty =
    Boolean(summary && summary.totalParticipants === 0 && summary.totalAllocatedShares === 0 && summary.totalExpensesMinor === 0);

  const viewProps: FinancialIntelligenceViewProps = {
    loading,
    error,
    empty: isEmpty,
    disabled,
    summary,
    anomalies,
    activeTab,
    setActiveTab,
    expenseDesc,
    setExpenseDesc,
    expenseAmount,
    setExpenseAmount,
    expensePaidTo,
    setExpensePaidTo,
    categorisedItems,
    categorising,
    onCategorise: handleCategoriseSubmit,
    onRefresh: loadData,
    onRetry: loadData,
  };

  const View = ViewComponent;
  return <View {...viewProps} />;
};
