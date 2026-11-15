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

function formatINR(amountMinor: number): string {
  const rupees = amountMinor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * EF-03: Financial Intelligence Basic View (Thin, Replaceable View ~130 lines)
 * Owned by M1 to adapt/restyle using real design system tokens and components.
 * Stable test IDs preserved for contract verification.
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
        <div data-testid="ef03-loading" className="text-center py-8">
          Loading financial reconciliation and intelligence...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-4 border border-red-300 rounded">
        <div data-testid="ef03-error" className="text-center py-6 text-red-600">
          <p className="font-bold">Error loading financial records</p>
          <p className="text-sm">{error}</p>
          <button data-testid="ef03-retry-btn" onClick={onRetry} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (empty || !summary) {
    return (
      <div data-testid="ef03-financial-intelligence" className="p-4 border rounded">
        <div data-testid="ef03-empty" className="text-center py-8 text-gray-500">
          <p className="font-semibold">No Financial Records Found</p>
          <p className="text-xs">No registrations or expenses recorded yet for this programme.</p>
          <button data-testid="ef03-refresh-btn" onClick={onRefresh} className="mt-2 px-3 py-1 border rounded text-xs">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ef03-financial-intelligence" className="p-4 border rounded space-y-4">
      {/* Header and Tabs */}
      <div className="flex justify-between items-center border-b pb-2">
        <div className="flex gap-2 text-xs">
          <button
            data-testid="ef03-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded ${activeTab === 'overview' ? 'bg-black text-white font-bold' : 'bg-gray-100'}`}
          >
            Overview
          </button>
          <button
            data-testid="ef03-tab-anomalies"
            onClick={() => setActiveTab('anomalies')}
            className={`px-3 py-1.5 rounded ${activeTab === 'anomalies' ? 'bg-black text-white font-bold' : 'bg-gray-100'}`}
          >
            Anomalies ({anomalies.length})
          </button>
          <button
            data-testid="ef03-tab-categoriser"
            onClick={() => setActiveTab('categoriser')}
            className={`px-3 py-1.5 rounded ${activeTab === 'categoriser' ? 'bg-black text-white font-bold' : 'bg-gray-100'}`}
          >
            Auto-Categoriser
          </button>
        </div>
        <button data-testid="ef03-refresh-btn" onClick={onRefresh} className="px-2 py-1 text-xs border rounded">
          Refresh
        </button>
      </div>

      <div data-testid="ef03-content" className="space-y-4">
        {/* Tab 1: Financial Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div data-testid="ef03-metric-revenue" className="p-3 border rounded">
                <span className="text-gray-500">Expected Revenue</span>
                <p className="text-lg font-bold">{formatINR(summary.expectedRevenueMinor)}</p>
                <span className="text-gray-400">{summary.totalAllocatedShares} shares allocated</span>
              </div>
              <div data-testid="ef03-metric-collected" className="p-3 border rounded">
                <span className="text-gray-500">Collected</span>
                <p className="text-lg font-bold text-emerald-700">{formatINR(summary.collectedRevenueMinor)}</p>
                <span className="text-gray-400">{summary.collectionRatePercentage}% velocity</span>
              </div>
              <div data-testid="ef03-metric-outstanding" className="p-3 border rounded">
                <span className="text-gray-500">Outstanding</span>
                <p className="text-lg font-bold text-amber-700">{formatINR(summary.outstandingRevenueMinor)}</p>
                <span className="text-gray-400">pending collections</span>
              </div>
              <div data-testid="ef03-metric-net" className={`p-3 border rounded ${summary.isSurplus ? 'bg-blue-50/50' : 'bg-rose-50/50'}`}>
                <span className="text-gray-500">Net Balance</span>
                <p className={`text-lg font-bold ${summary.isSurplus ? 'text-blue-700' : 'text-rose-700'}`}>
                  {formatINR(summary.netSurplusDeficitMinor)}
                </p>
                <span className="text-gray-400">{summary.isSurplus ? 'Operating Surplus' : 'Operating Deficit'}</span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="border rounded p-3 text-xs space-y-2">
              <h4 className="font-bold text-gray-700">Expense Breakdown by Category</h4>
              {summary.expensesByCategory.length > 0 ? (
                <div className="space-y-1">
                  {summary.expensesByCategory.map((cat, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b">
                      <span>{cat.label} ({cat.count})</span>
                      <span className="font-mono">{formatINR(cat.amountMinor)} ({cat.percentageOfTotal}%)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 py-2">No expenses recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Anomalies */}
        {activeTab === 'anomalies' && (
          <div data-testid="ef03-anomalies-list" className="space-y-2 text-xs">
            {anomalies.length > 0 ? (
              anomalies.map((anomaly) => (
                <div key={anomaly.id} data-testid="ef03-anomaly-item" className="p-3 border rounded space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold">{anomaly.type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${anomaly.severity === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="text-gray-700">{anomaly.description}</p>
                  <p className="text-gray-500 italic">Action: {anomaly.remediation}</p>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">No reconciliation anomalies detected.</div>
            )}
          </div>
        )}

        {/* Tab 3: Interactive Categoriser */}
        {activeTab === 'categoriser' && (
          <div className="space-y-4 text-xs">
            <form data-testid="ef03-categoriser-form" onSubmit={onCategorise} className="p-3 border rounded space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Expense description (e.g. Hay feed, Tempo diesel)"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="p-2 border rounded"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount in ₹"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="p-2 border rounded"
                  required
                />
                <input
                  type="text"
                  placeholder="Paid to / Vendor (optional)"
                  value={expensePaidTo}
                  onChange={(e) => setExpensePaidTo(e.target.value)}
                  className="p-2 border rounded"
                />
              </div>
              <button
                type="submit"
                disabled={categorising}
                data-testid="ef03-categoriser-submit"
                className="px-4 py-2 bg-black text-white rounded font-bold"
              >
                {categorising ? 'Categorising...' : 'Auto-Categorise Expense'}
              </button>
            </form>

            {categorisedItems.length > 0 && (
              <div data-testid="ef03-categorised-results" className="p-3 border rounded space-y-2">
                <h4 className="font-bold text-gray-700">Classification Results</h4>
                {categorisedItems.map((item, idx) => (
                  <div key={idx} className="p-2 border rounded flex justify-between items-center">
                    <div>
                      <p className="font-bold">{item.description}</p>
                      <p className="text-gray-500">{item.ruleExplanation}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{item.categoryLabel}</span>
                      <p className="text-emerald-700 font-mono">{formatINR(item.amountMinor)}</p>
                    </div>
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
