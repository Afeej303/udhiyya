import React, { useState, useEffect, useCallback } from 'react';
import { AnalyticsView } from './AnalyticsView.tsx';

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

  const isEmpty =
    !summary ||
    (summary.participants.total === 0 && summary.weightMetrics.totalAnimals === 0);

  return (
    <AnalyticsView
      loading={loading}
      error={error}
      empty={isEmpty}
      disabled={disabled}
      summary={summary}
      charts={charts}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onRefresh={loadData}
      onRetry={loadData}
    />
  );
};
