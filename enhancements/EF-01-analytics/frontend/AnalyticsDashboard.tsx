import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types (mirrors backend API contracts)
// ---------------------------------------------------------------------------

export interface ParticipantSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  cancelled: number;
}

export interface WeightMetrics {
  totalAnimals: number;
  totalWeightKg: number;
  averageWeightKg: number;
  minWeightKg: number;
  maxWeightKg: number;
  medianWeightKg: number;
}

export interface ShareStatistics {
  totalCapacity: number;
  allocatedShares: number;
  unallocatedShares: number;
  utilizationRate: number;
}

export interface PaymentProgress {
  expectedTotalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  completionRate: number;
  verifiedCount: number;
  pendingCount: number;
}

export interface AnalyticsSummaryResult {
  programmeId: number;
  programmeTitle: string;
  participants: ParticipantSummary;
  weightMetrics: WeightMetrics;
  shareStatistics: ShareStatistics;
  paymentProgress: PaymentProgress;
  updatedAt: string;
}

export interface WardDistributionItem {
  ward: string;
  count: number;
  percentage: number;
}

export interface WeightBinItem {
  bin: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface PaymentVelocityItem {
  date: string;
  dailyAmount: number;
  cumulativeAmount: number;
  transactionCount: number;
}

export interface RegistrationTrendItem {
  date: string;
  dailyRegistrations: number;
  cumulativeRegistrations: number;
}

export interface AllChartsData {
  participantDistribution: WardDistributionItem[];
  weightDistribution: WeightBinItem[];
  paymentVelocity: PaymentVelocityItem[];
  registrationTrend: RegistrationTrendItem[];
}

export interface AnalyticsDashboardProps {
  programmeId: number;
  initialSummary?: AnalyticsSummaryResult;
  initialCharts?: AllChartsData;
  mockFetch?: (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>;
}

export type ViewTab = 'participants' | 'weights' | 'payments' | 'trends';

// ---------------------------------------------------------------------------
// Controller & Component
// ---------------------------------------------------------------------------

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  programmeId,
  initialSummary,
  initialCharts,
  mockFetch,
}) => {
  const [loading, setLoading] = useState<boolean>(!initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [summary, setSummary] = useState<AnalyticsSummaryResult | null>(initialSummary || null);
  const [charts, setCharts] = useState<AllChartsData | null>(initialCharts || null);
  const [activeTab, setActiveTab] = useState<ViewTab>('participants');

  const fetchJson = useCallback(
    async (url: string) => {
      if (mockFetch) {
        return mockFetch(url);
      }
      return fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
    },
    [mockFetch],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, chartRes] = await Promise.all([
        fetchJson(`/api/ext/EF-01/summary?programmeId=${programmeId}`),
        fetchJson(`/api/ext/EF-01/charts?type=all&programmeId=${programmeId}`),
      ]);

      if (sumRes.status === 403 || chartRes.status === 403) {
        setDisabled(true);
        setLoading(false);
        return;
      }

      if (!sumRes.ok) {
        const errData = await sumRes.json().catch(() => ({}));
        throw new Error(errData?.error || `HTTP ${sumRes.status}: Failed to fetch analytics summary`);
      }

      if (!chartRes.ok) {
        const errData = await chartRes.json().catch(() => ({}));
        throw new Error(errData?.error || `HTTP ${chartRes.status}: Failed to fetch analytics charts`);
      }

      const sumData: AnalyticsSummaryResult = await sumRes.json();
      const chartEnvelope = await chartRes.json();
      const chartData: AllChartsData = chartEnvelope.data || chartEnvelope;

      setSummary(sumData);
      setCharts(chartData);
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [programmeId, fetchJson]);

  useEffect(() => {
    if (!initialSummary || !initialCharts) {
      loadData();
    }
  }, [loadData, initialSummary, initialCharts]);

  // If feature is disabled by flag, render null or quiet fallback
  if (disabled) {
    return null;
  }

  // 1. Loading State
  if (loading) {
    return (
      <div data-testid="ef01-analytics-dashboard" className="p-6 bg-white rounded-lg shadow border border-slate-200">
        <div data-testid="ef01-loading" className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading analytics and telemetry...</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div data-testid="ef01-analytics-dashboard" className="p-6 bg-white rounded-lg shadow border border-red-200">
        <div data-testid="ef01-error" className="flex flex-col items-center justify-center py-8 space-y-3">
          <div className="text-red-500 text-3xl font-bold">⚠️</div>
          <p className="text-base font-semibold text-red-700">Analytics Error</p>
          <p className="text-sm text-red-600 max-w-md text-center">{error}</p>
          <button
            data-testid="ef01-retry-btn"
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty State (Zero participants and Zero animals)
  const isEmpty =
    !summary ||
    (summary.participants.total === 0 && summary.weightMetrics.totalAnimals === 0);

  if (isEmpty) {
    return (
      <div data-testid="ef01-analytics-dashboard" className="p-6 bg-white rounded-lg shadow border border-slate-200">
        <div data-testid="ef01-empty" className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="text-slate-400 text-4xl">📊</div>
          <h3 className="text-lg font-semibold text-slate-800">No Analytics Available Yet</h3>
          <p className="text-sm text-slate-500 max-w-md text-center">
            This programme does not have registered participants or animals yet.
            Telemetry metrics will automatically populate once registrations begin.
          </p>
          <button
            data-testid="ef01-refresh-btn"
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded text-sm hover:bg-slate-200 transition"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // 4. Success State – Full Analytics Dashboard
  return (
    <div
      data-testid="ef01-analytics-dashboard"
      className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 space-y-6"
    >
      <div data-testid="ef01-content" className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h2 className="text-xl font-bold text-slate-900">
                {summary.programmeTitle} Analytics
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Live Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Updated: {new Date(summary.updatedAt).toLocaleTimeString()} · Programme #{summary.programmeId}
            </p>
          </div>
          <button
            data-testid="ef01-refresh-btn"
            onClick={loadData}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            🔄 Refresh Metrics
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Participants Metric */}
          <div
            data-testid="ef01-metric-participants"
            className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 space-y-2"
          >
            <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Total Participants
            </div>
            <div className="text-2xl font-black text-blue-900">
              {summary.participants.total}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="text-emerald-700 font-medium">
                ✓ {summary.participants.approved} Approved
              </span>
              <span className="text-amber-700 font-medium">
                ⏳ {summary.participants.pending} Pending
              </span>
            </div>
          </div>

          {/* 2. Weight / Animal Metric */}
          <div
            data-testid="ef01-metric-weight"
            className="p-4 rounded-lg bg-amber-50/50 border border-amber-100 space-y-2"
          >
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Animal Yield & Weight
            </div>
            <div className="text-2xl font-black text-amber-900">
              {summary.weightMetrics.averageWeightKg} <span className="text-sm font-semibold">kg avg</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{summary.weightMetrics.totalAnimals} Animals</span>
              <span>Total: {summary.weightMetrics.totalWeightKg} kg</span>
            </div>
          </div>

          {/* 3. Payments Metric */}
          <div
            data-testid="ef01-metric-payments"
            className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2"
          >
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Payment Velocity
            </div>
            <div className="text-2xl font-black text-emerald-900">
              {summary.paymentProgress.completionRate}%
            </div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, summary.paymentProgress.completionRate)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>₹{summary.paymentProgress.collectedAmount.toLocaleString()}</span>
              <span className="text-slate-400">/ ₹{summary.paymentProgress.expectedTotalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* 4. Share Capacity Metric */}
          <div
            data-testid="ef01-metric-shares"
            className="p-4 rounded-lg bg-purple-50/50 border border-purple-100 space-y-2"
          >
            <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
              Share Allocation
            </div>
            <div className="text-2xl font-black text-purple-900">
              {summary.shareStatistics.allocatedShares}{' '}
              <span className="text-sm font-semibold text-purple-600">
                / {summary.shareStatistics.totalCapacity}
              </span>
            </div>
            <div className="w-full bg-purple-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, summary.shareStatistics.utilizationRate)}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{summary.shareStatistics.unallocatedShares} Remaining</span>
              <span>{summary.shareStatistics.utilizationRate}% Utilized</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('participants')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'participants'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Participant Distribution
            </button>
            <button
              onClick={() => setActiveTab('weights')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'weights'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Weight Yield Histogram
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'payments'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Payment Velocity
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'trends'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Registration Trend
            </button>
          </nav>
        </div>

        {/* Chart View Content */}
        <div>
          {/* Tab 1: Ward Distribution */}
          {activeTab === 'participants' && (
            <div data-testid="ef01-chart-participants" className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800">
                Participant Geographic Spread (Wards / Localities)
              </h4>
              {charts && charts.participantDistribution.length > 0 ? (
                <div className="space-y-3">
                  {charts.participantDistribution.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-700">
                        <span>{item.ward}</span>
                        <span>
                          {item.count} participants ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">No ward breakdown data available.</p>
              )}
            </div>
          )}

          {/* Tab 2: Animal Weight Histogram */}
          {activeTab === 'weights' && (
            <div data-testid="ef01-chart-weights" className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800">
                Animal Weight Distribution Curve
              </h4>
              {charts && charts.weightDistribution.length > 0 ? (
                <div className="grid grid-cols-5 gap-3 pt-4 pb-2 items-end h-44 bg-slate-50/60 p-4 rounded-lg border border-slate-100">
                  {charts.weightDistribution.map((bin, idx) => (
                    <div key={idx} className="flex flex-col items-center h-full justify-end group">
                      <span className="text-[11px] font-bold text-slate-700 mb-1">
                        {bin.count}
                      </span>
                      <div
                        className="w-full bg-amber-500 rounded-t transition-all hover:bg-amber-600"
                        style={{ height: `${Math.max(8, bin.percentage)}%` }}
                      ></div>
                      <span className="text-[10px] text-slate-500 mt-2 text-center truncate w-full">
                        {bin.bin}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">No animal weights recorded yet.</p>
              )}
            </div>
          )}

          {/* Tab 3: Payment Velocity */}
          {activeTab === 'payments' && (
            <div data-testid="ef01-chart-payments" className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800">
                Daily & Cumulative Payment Collections (₹)
              </h4>
              {charts && charts.paymentVelocity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Transactions</th>
                        <th className="px-3 py-2">Daily Total</th>
                        <th className="px-3 py-2">Cumulative Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {charts.paymentVelocity.map((v, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono font-medium text-slate-800">{v.date}</td>
                          <td className="px-3 py-2">{v.transactionCount}</td>
                          <td className="px-3 py-2 text-emerald-700 font-semibold">₹{v.dailyAmount.toLocaleString()}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">₹{v.cumulativeAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">No payment transactions recorded yet.</p>
              )}
            </div>
          )}

          {/* Tab 4: Registration Trend */}
          {activeTab === 'trends' && (
            <div data-testid="ef01-chart-trend" className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800">
                Participant Registration Inflow Rate
              </h4>
              {charts && charts.registrationTrend.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2">Registration Date</th>
                        <th className="px-3 py-2">New Registrations</th>
                        <th className="px-3 py-2">Cumulative Participants</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {charts.registrationTrend.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono font-medium text-slate-800">{t.date}</td>
                          <td className="px-3 py-2 font-semibold text-blue-700">+{t.dailyRegistrations}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{t.cumulativeRegistrations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">No registration timeline data available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
