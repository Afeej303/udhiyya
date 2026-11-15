import React, { useState } from 'react';
import {
  AnalyticsDashboard,
  AnalyticsSummaryResult,
  AllChartsData,
} from '../frontend/AnalyticsDashboard';

// ---------------------------------------------------------------------------
// Synthetic Mock Datasets for Sandbox Testing
// ---------------------------------------------------------------------------

const MOCK_SUMMARY_NORMAL: AnalyticsSummaryResult = {
  programmeId: 101,
  programmeTitle: 'Qurbani 2026 – Central Mahallu',
  participants: {
    total: 42,
    approved: 35,
    pending: 5,
    rejected: 1,
    cancelled: 1,
  },
  weightMetrics: {
    totalAnimals: 6,
    totalWeightKg: 2070,
    averageWeightKg: 345,
    minWeightKg: 290,
    maxWeightKg: 410,
    medianWeightKg: 342.5,
  },
  shareStatistics: {
    totalCapacity: 42, // 6 cattle * 7 shares
    allocatedShares: 35,
    unallocatedShares: 7,
    utilizationRate: 83.33,
  },
  paymentProgress: {
    expectedTotalAmount: 105000,
    collectedAmount: 87500,
    pendingAmount: 17500,
    completionRate: 83.33,
    verifiedCount: 35,
    pendingCount: 5,
  },
  updatedAt: new Date().toISOString(),
};

const MOCK_CHARTS_NORMAL: AllChartsData = {
  participantDistribution: [
    { ward: 'Ward 1 - North Gate', count: 14, percentage: 33.33 },
    { ward: 'Ward 2 - Market Road', count: 12, percentage: 28.57 },
    { ward: 'Ward 3 - River Bank', count: 9, percentage: 21.43 },
    { ward: 'Ward 4 - Hill Top', count: 7, percentage: 16.67 },
  ],
  weightDistribution: [
    { bin: '< 250 kg', min: 0, max: 249.99, count: 0, percentage: 0 },
    { bin: '250 – 299 kg', min: 250, max: 299.99, count: 1, percentage: 16.67 },
    { bin: '300 – 349 kg', min: 300, max: 349.99, count: 3, percentage: 50 },
    { bin: '350 – 399 kg', min: 350, max: 399.99, count: 1, percentage: 16.67 },
    { bin: '≥ 400 kg', min: 400, max: 9999, count: 1, percentage: 16.67 },
  ],
  paymentVelocity: [
    { date: '2026-11-01', dailyAmount: 25000, cumulativeAmount: 25000, transactionCount: 10 },
    { date: '2026-11-03', dailyAmount: 30000, cumulativeAmount: 55000, transactionCount: 12 },
    { date: '2026-11-07', dailyAmount: 20000, cumulativeAmount: 75000, transactionCount: 8 },
    { date: '2026-11-12', dailyAmount: 12500, cumulativeAmount: 87500, transactionCount: 5 },
  ],
  registrationTrend: [
    { date: '2026-10-25', dailyRegistrations: 10, cumulativeRegistrations: 10 },
    { date: '2026-10-28', dailyRegistrations: 15, cumulativeRegistrations: 25 },
    { date: '2026-11-02', dailyRegistrations: 12, cumulativeRegistrations: 37 },
    { date: '2026-11-05', dailyRegistrations: 5, cumulativeRegistrations: 42 },
  ],
};

const MOCK_SUMMARY_EMPTY: AnalyticsSummaryResult = {
  programmeId: 102,
  programmeTitle: 'Qurbani 2026 – Newly Initialized Mahallu',
  participants: {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    cancelled: 0,
  },
  weightMetrics: {
    totalAnimals: 0,
    totalWeightKg: 0,
    averageWeightKg: 0,
    minWeightKg: 0,
    maxWeightKg: 0,
    medianWeightKg: 0,
  },
  shareStatistics: {
    totalCapacity: 0,
    allocatedShares: 0,
    unallocatedShares: 0,
    utilizationRate: 0,
  },
  paymentProgress: {
    expectedTotalAmount: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    completionRate: 0,
    verifiedCount: 0,
    pendingCount: 0,
  },
  updatedAt: new Date().toISOString(),
};

const MOCK_CHARTS_EMPTY: AllChartsData = {
  participantDistribution: [],
  weightDistribution: [
    { bin: '< 250 kg', min: 0, max: 249.99, count: 0, percentage: 0 },
    { bin: '250 – 299 kg', min: 250, max: 299.99, count: 0, percentage: 0 },
    { bin: '300 – 349 kg', min: 300, max: 349.99, count: 0, percentage: 0 },
    { bin: '350 – 399 kg', min: 350, max: 399.99, count: 0, percentage: 0 },
    { bin: '≥ 400 kg', min: 400, max: 9999, count: 0, percentage: 0 },
  ],
  paymentVelocity: [],
  registrationTrend: [],
};

// ---------------------------------------------------------------------------
// Sandbox Application
// ---------------------------------------------------------------------------

export const SandboxApp: React.FC = () => {
  const [scenario, setScenario] = useState<'normal' | 'empty' | 'error' | 'flag_off'>('normal');

  // Custom fetch mock based on scenario
  const mockFetch = async (url: string) => {
    if (scenario === 'flag_off') {
      return {
        ok: false,
        status: 403,
        json: async () => ({ error: 'Feature EF-01 is disabled' }),
      };
    }

    if (scenario === 'error') {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database connection failed: replica timeout' }),
      };
    }

    if (scenario === 'empty') {
      if (url.includes('/summary')) {
        return {
          ok: true,
          status: 200,
          json: async () => MOCK_SUMMARY_EMPTY,
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: MOCK_CHARTS_EMPTY }),
      };
    }

    // Normal scenario
    if (url.includes('/summary')) {
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_SUMMARY_NORMAL,
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: MOCK_CHARTS_NORMAL }),
    };
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 font-sans">
      <div className="bg-slate-900 text-white p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🧪 EF-01 Analytics Dashboard Sandbox</h1>
            <p className="text-xs text-slate-400 mt-1">
              Testbench for slot <code className="text-emerald-400 font-mono">analytics-dashboard-slot</code>
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-mono rounded border border-indigo-500/30">
            Scenario: {scenario.toUpperCase()}
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setScenario('normal')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              scenario === 'normal'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🟢 Normal Active (Success State)
          </button>
          <button
            onClick={() => setScenario('empty')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              scenario === 'empty'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🟡 Empty Dataset (Empty State)
          </button>
          <button
            onClick={() => setScenario('error')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              scenario === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🔴 Network/DB Error (Error State)
          </button>
          <button
            onClick={() => setScenario('flag_off')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
              scenario === 'flag_off'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⚪ Flag FEATURE_EF_01=off (Unmounted)
          </button>
        </div>
      </div>

      {/* Component Mounting Slot */}
      <div className="border-2 border-dashed border-indigo-200 p-4 rounded-xl bg-slate-50">
        <div className="text-[11px] font-mono text-indigo-700 font-semibold mb-3 flex items-center justify-between">
          <span>&lt;slot: analytics-dashboard-slot&gt;</span>
          {scenario === 'flag_off' && (
            <span className="text-amber-600 font-bold">
              [Flag is OFF: Component renders null]
            </span>
          )}
        </div>
        <AnalyticsDashboard
          key={scenario}
          programmeId={101}
          mockFetch={mockFetch}
        />
      </div>
    </div>
  );
};

export default SandboxApp;
