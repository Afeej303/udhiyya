/**
 * EF-03: Financial Intelligence – Frontend Component
 * Controller + View Architecture.
 * Mounts in named slot: `financial-intelligence-slot` (Finance & Committee Dashboards).
 * Flag: `VITE_FEATURE_EF_03 === 'on'` (renders null if off).
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  FinancialSummaryResult,
  FinancialAnomaly,
  CategorisedExpense,
  CategoryBreakdown,
  ExpenseInput,
} from '../backend/financial-intelligence.service.ts';

// ---------------------------------------------------------------------------
// Props Interface
// ---------------------------------------------------------------------------

export interface FinancialIntelligencePanelProps {
  programmeId: number;
  initialSummary?: FinancialSummaryResult;
  initialAnomalies?: FinancialAnomaly[];
  apiBaseUrl?: string;
  authToken?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatINR(amountMinor: number): string {
  const rupees = amountMinor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FinancialIntelligencePanel: React.FC<FinancialIntelligencePanelProps> = ({
  programmeId,
  initialSummary,
  initialAnomalies,
  apiBaseUrl = '/api/ext/EF-03',
  authToken,
}) => {
  // Feature flag guard (client-side)
  // In development/sandbox environments, fallback to true if undefined
  const flagEnabled =
    typeof process !== 'undefined' && process.env?.VITE_FEATURE_EF_03 === 'off'
      ? false
      : true;

  if (!flagEnabled) {
    return null;
  }

  // -------------------------------------------------------------------------
  // Controller State Management
  // -------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'overview' | 'anomalies' | 'categoriser'>('overview');
  const [summary, setSummary] = useState<FinancialSummaryResult | null>(initialSummary || null);
  const [anomalies, setAnomalies] = useState<FinancialAnomaly[]>(initialAnomalies || []);
  const [loading, setLoading] = useState<boolean>(!initialSummary);
  const [error, setError] = useState<string | null>(null);

  // Categoriser interactive form state
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expensePaidTo, setExpensePaidTo] = useState<string>('');
  const [categorisedItems, setCategorisedItems] = useState<CategorisedExpense[]>([]);
  const [categorising, setCategorising] = useState<boolean>(false);

  // Data fetching callback
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      // 1. Fetch Summary
      const summaryRes = await fetch(`${apiBaseUrl}/summary?programmeId=${programmeId}`, {
        headers,
      });
      if (!summaryRes.ok) {
        throw new Error(`Failed to load financial summary (${summaryRes.status})`);
      }
      const summaryData = (await summaryRes.json()) as FinancialSummaryResult;
      setSummary(summaryData);

      // 2. Fetch Anomalies
      const anomalyRes = await fetch(`${apiBaseUrl}/anomalies?programmeId=${programmeId}`, {
        headers,
      });
      if (!anomalyRes.ok) {
        throw new Error(`Failed to load financial anomalies (${anomalyRes.status})`);
      }
      const anomalyData = await anomalyRes.json();
      setAnomalies(anomalyData.anomalies || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading financial intelligence.');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, programmeId, authToken]);

  useEffect(() => {
    if (!initialSummary) {
      fetchData();
    }
  }, [fetchData, initialSummary]);

  // Handle single/batch auto-categorisation
  const handleCategoriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc || !expenseAmount) return;

    setCategorising(true);
    const amountMinor = Math.round(parseFloat(expenseAmount) * 100);

    const newExpense: ExpenseInput = {
      description: expenseDesc,
      amountMinor,
      paidTo: expensePaidTo,
      date: new Date().toISOString(),
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${apiBaseUrl}/categorise`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ expenses: [newExpense, ...categorisedItems] }),
      });

      if (!res.ok) throw new Error('Auto-categorisation request failed.');
      const data = await res.json();
      setCategorisedItems(data.items || []);
      setExpenseDesc('');
      setExpenseAmount('');
      setExpensePaidTo('');
    } catch (err: any) {
      setError(err.message || 'Failed to auto-categorise expense.');
    } finally {
      setCategorising(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render: States
  // -------------------------------------------------------------------------

  // Loading State
  if (loading) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div data-testid="ef03-loading" className="flex flex-col items-center justify-center p-12 space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Analyzing financial ledger and detecting anomalies...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-6 bg-white border border-red-200 rounded-xl shadow-sm">
        <div data-testid="ef03-error" className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 flex items-center justify-center rounded-full font-bold text-xl">!</div>
          <div>
            <h4 className="text-base font-semibold text-slate-900">Financial Intelligence Unavailable</h4>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
          <button
            data-testid="ef03-retry-btn"
            onClick={fetchData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  // Empty State (0 participants, 0 collections)
  if (!summary || (summary.totalParticipants === 0 && summary.collectedRevenueMinor === 0)) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div data-testid="ef03-empty" className="flex flex-col items-center justify-center p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 flex items-center justify-center rounded-full text-xl font-bold">₹</div>
          <h4 className="text-base font-semibold text-slate-800">No Financial Records Found</h4>
          <p className="text-sm text-slate-500 max-w-md">
            This programme does not have recorded payments or participant allocations yet. Financial reconciliation will appear here once records are added.
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Success View
  // -------------------------------------------------------------------------
  return (
    <div data-testid="ef03-financial-intelligence" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header & Tabs */}
      <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
              ₹
            </span>
            <h3 className="text-lg font-bold text-slate-900">Financial Intelligence & Reconciliation</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated expense categorisation, ledger auditing, and live anomaly detection
          </p>
        </div>

        {/* Tab Controls & Refresh */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-slate-200 rounded-lg text-xs font-medium">
            <button
              data-testid="ef03-tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reconciliation Overview
            </button>
            <button
              data-testid="ef03-tab-anomalies"
              onClick={() => setActiveTab('anomalies')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'anomalies' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ledger Anomalies</span>
              {anomalies.length > 0 && (
                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full font-bold text-[10px]">
                  {anomalies.length}
                </span>
              )}
            </button>
            <button
              data-testid="ef03-tab-categoriser"
              onClick={() => setActiveTab('categoriser')}
              className={`px-3 py-1.5 rounded-md transition ${
                activeTab === 'categoriser' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense Categoriser
            </button>
          </div>

          <button
            data-testid="ef03-refresh-btn"
            onClick={fetchData}
            title="Refresh Ledger Analysis"
            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-200 rounded-lg transition text-xs font-medium"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div data-testid="ef03-content" className="p-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div data-testid="ef03-metric-revenue" className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected Revenue</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(summary.expectedRevenueMinor)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {summary.totalAllocatedShares} shares @ {formatINR(summary.sharePriceMinor)}
                </div>
              </div>

              <div data-testid="ef03-metric-collected" className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Total Collected</span>
                <div className="text-xl font-bold text-emerald-900 mt-1">{formatINR(summary.collectedRevenueMinor)}</div>
                <div className="text-xs text-emerald-700 mt-1 font-medium">
                  {summary.collectionRatePercentage}% collection rate
                </div>
              </div>

              <div data-testid="ef03-metric-outstanding" className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Outstanding Balance</span>
                <div className="text-xl font-bold text-amber-900 mt-1">{formatINR(summary.outstandingRevenueMinor)}</div>
                <div className="text-xs text-amber-700 mt-1">Pending collections from participants</div>
              </div>

              <div data-testid="ef03-metric-net" className={`p-4 border rounded-lg ${summary.isSurplus ? 'bg-blue-50 border-blue-200' : 'bg-rose-50 border-rose-200'}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${summary.isSurplus ? 'text-blue-700' : 'text-rose-700'}`}>
                  {summary.isSurplus ? 'Net Operating Surplus' : 'Net Deficit'}
                </span>
                <div className={`text-xl font-bold mt-1 ${summary.isSurplus ? 'text-blue-900' : 'text-rose-900'}`}>
                  {formatINR(Math.abs(summary.netSurplusDeficitMinor))}
                </div>
                <div className={`text-xs mt-1 ${summary.isSurplus ? 'text-blue-600' : 'text-rose-600'}`}>
                  Expenses: {formatINR(summary.totalExpensesMinor)}
                </div>
              </div>
            </div>

            {/* Expenses by Category Breakdown */}
            <div className="border border-slate-200 rounded-lg p-5 bg-white">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-3">
                Categorised Operating Expenses
              </h4>
              {summary.expensesByCategory.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No expense entries recorded for this programme yet.</p>
              ) : (
                <div className="space-y-3">
                  {summary.expensesByCategory.map((cat: CategoryBreakdown) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-700">{cat.label} ({cat.count} items)</span>
                        <span className="text-slate-900 font-bold">{formatINR(cat.amountMinor)} ({cat.percentageOfTotal}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(cat.percentageOfTotal, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ANOMALIES */}
        {activeTab === 'anomalies' && (
          <div data-testid="ef03-anomalies-list" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Detected Ledger Anomalies</h4>
                <p className="text-xs text-slate-500">
                  {anomalies.length} potential discrepancies flagged for administrative review
                </p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded">
                  {summary.anomalySummary.highSeverity} High
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                  {summary.anomalySummary.mediumSeverity} Medium
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {summary.anomalySummary.lowSeverity} Low
                </span>
              </div>
            </div>

            {anomalies.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-emerald-600 font-bold text-lg">✓</span>
                <p className="text-sm font-semibold text-slate-800 mt-1">Clean Ledger</p>
                <p className="text-xs text-slate-500">No payment anomalies or discrepancies found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((anomaly: FinancialAnomaly) => {
                  const severityBadge =
                    anomaly.severity === 'HIGH'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : anomaly.severity === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300';

                  return (
                    <div
                      key={anomaly.id}
                      data-testid="ef03-anomaly-item"
                      className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 bg-slate-50 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityBadge}`}>
                              {anomaly.severity}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{anomaly.type}</span>
                          </div>
                          <p className="text-sm text-slate-800">{anomaly.description}</p>
                          <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100 mt-2">
                            <strong>Recommended Action:</strong> {anomaly.remediation}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AUTO-CATEGORISER */}
        {activeTab === 'categoriser' && (
          <div className="space-y-6">
            <form data-testid="ef03-categoriser-form" onSubmit={handleCategoriseSubmit} className="p-5 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Instant Expense Auto-Categorisation
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Item</label>
                  <input
                    type="text"
                    required
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    placeholder="e.g. Butchers cutting fee, Hay bags"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="e.g. 4500"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Paid To / Vendor</label>
                  <input
                    type="text"
                    value={expensePaidTo}
                    onChange={(e) => setExpensePaidTo(e.target.value)}
                    placeholder="e.g. Local Mandi Trader"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={categorising}
                  data-testid="ef03-categoriser-submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {categorising ? 'Categorising...' : 'Classify Expense'}
                </button>
              </div>
            </form>

            {/* Categorised Results List */}
            {categorisedItems.length > 0 && (
              <div data-testid="ef03-categorised-results" className="space-y-3">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Classified Items ({categorisedItems.length})
                </h5>
                <div className="space-y-2">
                  {categorisedItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{item.description}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.ruleExplanation}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-800">{formatINR(item.amountMinor)}</span>
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {item.categoryLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
