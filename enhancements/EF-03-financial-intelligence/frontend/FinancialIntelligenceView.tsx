import React from 'react';
import type {
  FinancialSummaryResult,
  FinancialAnomaly,
  CategorisedExpense,
} from '../backend/financial-intelligence.service.ts';

export interface FinancialIntelligenceViewProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  disabled: boolean;
  summary: FinancialSummaryResult | null;
  anomalies: FinancialAnomaly[];
  activeTab: 'overview' | 'anomalies' | 'categoriser';
  setActiveTab: (tab: 'overview' | 'anomalies' | 'categoriser') => void;
  expenseDesc: string;
  setExpenseDesc: (desc: string) => void;
  expenseAmount: string;
  setExpenseAmount: (amt: string) => void;
  expensePaidTo: string;
  setExpensePaidTo: (paidTo: string) => void;
  categorisedItems: CategorisedExpense[];
  categorising: boolean;
  onCategorise: (e: React.FormEvent) => void;
  onRefresh: () => void;
  onRetry: () => void;
}

const fmt = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/**
 * EF-03: Financial Intelligence Basic View (~130 lines)
 * Thin, unstyled, replaceable presentation layer owned by M1.
 * All test IDs preserved for contract verification.
 */
export const FinancialIntelligenceView: React.FC<FinancialIntelligenceViewProps> = ({
  loading,
  error,
  empty,
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
  onCategorise,
  onRefresh,
  onRetry,
}) => {
  if (disabled) return null;

  if (loading) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-4 border rounded">
        <div data-testid="ef03-loading" className="text-center py-6">Loading financial reconciliation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-4 border border-red-300 rounded">
        <div data-testid="ef03-error" className="text-center py-4 text-red-600">
          <p className="font-bold">Error loading financial records: {error}</p>
          <button data-testid="ef03-retry-btn" onClick={onRetry} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (empty || !summary) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-4 border rounded">
        <div data-testid="ef03-empty" className="text-center py-6 text-gray-500">
          <p className="font-semibold">No Financial Records Found</p>
          <button data-testid="ef03-refresh-btn" onClick={onRefresh} className="mt-2 px-3 py-1 border rounded text-xs">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ef03-financial-intelligence" className="p-4 border rounded space-y-3">
      <div className="flex justify-between items-center border-b pb-2 text-xs">
        <div className="flex gap-2">
          <button data-testid="ef03-tab-overview" onClick={() => setActiveTab('overview')} className={`px-2 py-1 rounded ${activeTab === 'overview' ? 'font-bold underline' : ''}`}>Overview</button>
          <button data-testid="ef03-tab-anomalies" onClick={() => setActiveTab('anomalies')} className={`px-2 py-1 rounded ${activeTab === 'anomalies' ? 'font-bold underline' : ''}`}>Anomalies ({anomalies.length})</button>
          <button data-testid="ef03-tab-categoriser" onClick={() => setActiveTab('categoriser')} className={`px-2 py-1 rounded ${activeTab === 'categoriser' ? 'font-bold underline' : ''}`}>Auto-Categoriser</button>
        </div>
        <button data-testid="ef03-refresh-btn" onClick={onRefresh} className="px-2 py-1 border rounded">Refresh</button>
      </div>

      <div data-testid="ef03-content" className="space-y-3 text-xs">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div data-testid="ef03-metric-revenue" className="p-2 border rounded">
                <span className="text-gray-500">Expected:</span> <span className="font-bold">{fmt(summary.expectedRevenueMinor)}</span>
              </div>
              <div data-testid="ef03-metric-collected" className="p-2 border rounded">
                <span className="text-gray-500">Collected:</span> <span className="font-bold text-emerald-700">{fmt(summary.collectedRevenueMinor)}</span>
              </div>
              <div data-testid="ef03-metric-outstanding" className="p-2 border rounded">
                <span className="text-gray-500">Outstanding:</span> <span className="font-bold text-amber-700">{fmt(summary.outstandingRevenueMinor)}</span>
              </div>
              <div data-testid="ef03-metric-net" className="p-2 border rounded">
                <span className="text-gray-500">Net:</span> <span className="font-bold">{fmt(summary.netSurplusDeficitMinor)}</span>
                <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {summary.isSurplus ? 'Operating Surplus' : 'Operating Deficit'}
                </span>
              </div>
            </div>
            <div className="border rounded p-2 space-y-1">
              <div className="font-bold">Expenses by Category</div>
              {summary.expensesByCategory.map((c, i) => (
                <div key={i} className="flex justify-between py-0.5 border-b">
                  <span>{c.label} ({c.count})</span>
                  <span>{fmt(c.amountMinor)} ({c.percentageOfTotal}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div data-testid="ef03-anomalies-list" className="space-y-2">
            {anomalies.map((a) => (
              <div key={a.id} data-testid="ef03-anomaly-item" className="p-2 border rounded">
                <div className="flex justify-between font-bold">
                  <span>{a.type}</span>
                  <span>[{a.severity}]</span>
                </div>
                <p>{a.description}</p>
                <p className="italic text-gray-500">{a.remediation}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'categoriser' && (
          <div className="space-y-2">
            <form data-testid="ef03-categoriser-form" onSubmit={onCategorise} className="p-2 border rounded flex gap-2 flex-wrap">
              <input type="text" placeholder="Description" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} className="p-1 border rounded text-xs" required />
              <input type="number" placeholder="Amount (₹)" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="p-1 border rounded text-xs" required />
              <input type="text" placeholder="Paid To (optional)" value={expensePaidTo} onChange={(e) => setExpensePaidTo(e.target.value)} className="p-1 border rounded text-xs" />
              <button type="submit" disabled={categorising} data-testid="ef03-categoriser-submit" className="px-3 py-1 bg-black text-white rounded text-xs font-bold">
                {categorising ? '...' : 'Categorise'}
              </button>
            </form>
            {categorisedItems.length > 0 && (
              <div data-testid="ef03-categorised-results" className="p-2 border rounded space-y-1">
                <div className="font-bold">Categorised Items</div>
                {categorisedItems.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 border-b">
                    <span>{item.description} &rarr; <b>{item.categoryLabel}</b></span>
                    <span>{fmt(item.amountMinor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
