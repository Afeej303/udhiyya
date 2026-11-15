import React from 'react';
import type {
  AnalyticsSummaryResult,
  AllChartsData,
  ViewTab,
} from './AnalyticsDashboard.tsx';

export interface AnalyticsViewProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  disabled: boolean;
  summary: AnalyticsSummaryResult | null;
  charts: AllChartsData | null;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  onRefresh: () => void;
  onRetry: () => void;
}

/**
 * EF-01: Analytics Basic View (Thin, Replaceable View ~100 lines)
 * Owned by M1 to adapt/restyle using real design system.
 * Stable test IDs preserved for verification.
 */
export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  loading,
  error,
  empty,
  disabled,
  summary,
  charts,
  activeTab,
  setActiveTab,
  onRefresh,
  onRetry,
}) => {
  if (disabled) return null;

  if (loading) {
    return (
      <div data-testid="ef01-analytics-dashboard" className="p-4 border rounded">
        <div data-testid="ef01-loading" className="text-center py-8">
          Loading analytics and telemetry...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="ef01-analytics-dashboard" className="p-4 border border-red-300 rounded">
        <div data-testid="ef01-error" className="text-center py-6 text-red-600">
          <p className="font-bold">Error loading analytics</p>
          <p className="text-sm">{error}</p>
          <button data-testid="ef01-retry-btn" onClick={onRetry} className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (empty || !summary) {
    return (
      <div data-testid="ef01-analytics-dashboard" className="p-4 border rounded">
        <div data-testid="ef01-empty" className="text-center py-8 text-gray-500">
          <p className="font-semibold">No Analytics Available Yet</p>
          <p className="text-xs">No registered participants or animals found for this programme.</p>
          <button data-testid="ef01-refresh-btn" onClick={onRefresh} className="mt-2 px-3 py-1 border rounded text-xs">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ef01-analytics-dashboard" className="p-4 border rounded space-y-4">
      <div data-testid="ef01-content" className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-2">
          <div>
            <h3 className="font-bold text-lg">{summary.programmeTitle} Analytics</h3>
            <span className="text-xs text-gray-500">Updated: {new Date(summary.updatedAt).toLocaleTimeString()}</span>
          </div>
          <button data-testid="ef01-refresh-btn" onClick={onRefresh} className="px-2 py-1 text-xs border rounded">
            Refresh
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div data-testid="ef01-metric-participants" className="p-3 border rounded">
            <div className="text-xs text-gray-500">Participants</div>
            <div className="text-xl font-bold">{summary.participants.total}</div>
            <div className="text-xs text-gray-600">{summary.participants.approved} approved · {summary.participants.pending} pending</div>
          </div>
          <div data-testid="ef01-metric-weight" className="p-3 border rounded">
            <div className="text-xs text-gray-500">Animal Yield</div>
            <div className="text-xl font-bold">{summary.weightMetrics.averageWeightKg} kg avg</div>
            <div className="text-xs text-gray-600">{summary.weightMetrics.totalAnimals} animals · {summary.weightMetrics.totalWeightKg} kg</div>
          </div>
          <div data-testid="ef01-metric-payments" className="p-3 border rounded">
            <div className="text-xs text-gray-500">Payment Velocity</div>
            <div className="text-xl font-bold">{summary.paymentProgress.completionRate}%</div>
            <div className="text-xs text-gray-600">₹{summary.paymentProgress.collectedAmount} / ₹{summary.paymentProgress.expectedTotalAmount}</div>
          </div>
          <div data-testid="ef01-metric-shares" className="p-3 border rounded">
            <div className="text-xs text-gray-500">Share Capacity</div>
            <div className="text-xl font-bold">{summary.shareStatistics.allocatedShares} / {summary.shareStatistics.totalCapacity}</div>
            <div className="text-xs text-gray-600">{summary.shareStatistics.utilizationRate}% utilized</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 border-b text-xs pb-1">
          <button onClick={() => setActiveTab('participants')} className={`px-2 py-1 ${activeTab === 'participants' ? 'font-bold border-b-2 border-black' : ''}`}>Wards</button>
          <button onClick={() => setActiveTab('weights')} className={`px-2 py-1 ${activeTab === 'weights' ? 'font-bold border-b-2 border-black' : ''}`}>Weight Yield</button>
          <button onClick={() => setActiveTab('payments')} className={`px-2 py-1 ${activeTab === 'payments' ? 'font-bold border-b-2 border-black' : ''}`}>Payments</button>
          <button onClick={() => setActiveTab('trends')} className={`px-2 py-1 ${activeTab === 'trends' ? 'font-bold border-b-2 border-black' : ''}`}>Registrations</button>
        </div>

        {/* Chart View Content */}
        {activeTab === 'participants' && (
          <div data-testid="ef01-chart-participants" className="space-y-1 text-xs">
            {charts?.participantDistribution.map((item, idx) => (
              <div key={idx} className="flex justify-between py-1 border-b">
                <span>{item.ward}</span>
                <span>{item.count} ({item.percentage}%)</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'weights' && (
          <div data-testid="ef01-chart-weights" className="space-y-1 text-xs">
            {charts?.weightDistribution.map((bin, idx) => (
              <div key={idx} className="flex justify-between py-1 border-b">
                <span>{bin.bin}</span>
                <span>{bin.count} animals ({bin.percentage}%)</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payments' && (
          <div data-testid="ef01-chart-payments" className="text-xs">
            {charts?.paymentVelocity.map((v, idx) => (
              <div key={idx} className="flex justify-between py-1 border-b">
                <span>{v.date}</span>
                <span>₹{v.dailyAmount} (Cum: ₹{v.cumulativeAmount})</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'trends' && (
          <div data-testid="ef01-chart-trend" className="text-xs">
            {charts?.registrationTrend.map((t, idx) => (
              <div key={idx} className="flex justify-between py-1 border-b">
                <span>{t.date}</span>
                <span>+{t.dailyRegistrations} (Total: {t.cumulativeRegistrations})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
