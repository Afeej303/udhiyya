/**
 * EF-03: Financial Intelligence – Sandbox App
 * Run standalone to verify all 4 UI states and user flows without a live backend.
 */

import React, { useState } from 'react';
import { FinancialIntelligencePanel } from '../frontend/FinancialIntelligencePanel.tsx';
import type {
  FinancialSummaryResult,
  FinancialAnomaly,
} from '../backend/financial-intelligence.service.ts';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_SUMMARY: FinancialSummaryResult = {
  programmeId: 1,
  programmeTitle: 'Qurbani Annual Programme 2026',
  currency: 'INR',
  sharePriceMinor: 300000, // ₹3,000.00
  totalParticipants: 140,
  totalAllocatedShares: 126,
  expectedRevenueMinor: 37800000, // ₹3,78,000.00
  collectedRevenueMinor: 31500000, // ₹3,15,000.00
  outstandingRevenueMinor: 6300000, // ₹63,000.00
  collectionRatePercentage: 83.33,
  totalExpensesMinor: 24200000, // ₹2,42,000.00
  expensesByCategory: [
    { category: 'ANIMAL_PURCHASE', label: 'Animal Purchase & Procurement', amountMinor: 18000000, count: 18, percentageOfTotal: 74.38 },
    { category: 'FEED_AND_FODDER', label: 'Feed & Fodder', amountMinor: 1800000, count: 6, percentageOfTotal: 7.44 },
    { category: 'SLAUGHTER_AND_DRESSING', label: 'Slaughter & Dressing Services', amountMinor: 2100000, count: 4, percentageOfTotal: 8.68 },
    { category: 'LOGISTICS_AND_TRANSPORT', label: 'Logistics & Transport', amountMinor: 1100000, count: 3, percentageOfTotal: 4.55 },
    { category: 'PACKAGING_AND_CONSUMABLES', label: 'Packaging & Consumables', amountMinor: 800000, count: 2, percentageOfTotal: 3.31 },
    { category: 'WASTE_AND_SANITATION', label: 'Waste Management & Sanitation', amountMinor: 400000, count: 1, percentageOfTotal: 1.65 },
  ],
  netSurplusDeficitMinor: 7300000, // ₹73,000.00
  isSurplus: true,
  anomalySummary: {
    totalAnomalies: 3,
    highSeverity: 2,
    mediumSeverity: 1,
    lowSeverity: 0,
  },
  generatedAt: new Date().toISOString(),
};

const MOCK_ANOMALIES: FinancialAnomaly[] = [
  {
    id: 'anomaly-1',
    type: 'DUPLICATE_PAYMENT_REF',
    severity: 'HIGH',
    paymentReference: 'UPI-REF-998822',
    description: 'Duplicate payment reference "UPI-REF-998822" detected across 2 payment records.',
    remediation: 'Inspect bank receipt/voucher and merge or void duplicate entry.',
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'anomaly-2',
    type: 'UNDERPAYMENT_WITH_ALLOCATION',
    severity: 'HIGH',
    participantId: 14,
    participantName: 'Farooq Abdullah',
    amountMinor: 150000,
    expectedAmountMinor: 300000,
    description: 'Participant "Farooq Abdullah" is allocated to animal Bull #3 but has outstanding balance of ₹1,500.00.',
    remediation: 'Follow up with participant to collect remaining balance prior to animal slaughter.',
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'anomaly-3',
    type: 'OVERPAYMENT',
    severity: 'MEDIUM',
    participantId: 29,
    participantName: 'Sufiyan Mansoor',
    amountMinor: 350000,
    expectedAmountMinor: 300000,
    description: 'Participant "Sufiyan Mansoor" paid ₹3,500.00, exceeding required ₹3,000.00 by ₹500.00.',
    remediation: 'Verify if extra funds are general charity/Sadaqah, or issue refund for excess contribution.',
    detectedAt: new Date().toISOString(),
  },
];

const EMPTY_SUMMARY: FinancialSummaryResult = {
  programmeId: 2,
  programmeTitle: 'Empty Programme 2026',
  currency: 'INR',
  sharePriceMinor: 300000,
  totalParticipants: 0,
  totalAllocatedShares: 0,
  expectedRevenueMinor: 0,
  collectedRevenueMinor: 0,
  outstandingRevenueMinor: 0,
  collectionRatePercentage: 0,
  totalExpensesMinor: 0,
  expensesByCategory: [],
  netSurplusDeficitMinor: 0,
  isSurplus: true,
  anomalySummary: { totalAnomalies: 0, highSeverity: 0, mediumSeverity: 0, lowSeverity: 0 },
  generatedAt: new Date().toISOString(),
};

export const SandboxApp: React.FC = () => {
  const [viewState, setViewState] = useState<'success' | 'empty' | 'error' | 'loading'>('success');

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Sandbox State Controller Toolbar */}
        <div className="p-4 bg-white border border-slate-300 rounded-lg shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              EF-03 Sandbox State Switcher
            </h2>
            <p className="text-xs text-slate-500">Toggle component states for testing & visual verification</p>
          </div>
          <div className="flex gap-2">
            {(['success', 'empty', 'error', 'loading'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setViewState(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded capitalize transition ${
                  viewState === st
                    ? 'bg-emerald-700 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Financial Intelligence Component Mounted in Slot */}
        <div>
          {viewState === 'success' && (
            <FinancialIntelligencePanel
              programmeId={1}
              initialSummary={MOCK_SUMMARY}
              initialAnomalies={MOCK_ANOMALIES}
            />
          )}

          {viewState === 'empty' && (
            <FinancialIntelligencePanel
              programmeId={2}
              initialSummary={EMPTY_SUMMARY}
              initialAnomalies={[]}
            />
          )}

          {viewState === 'error' && (
            <FinancialIntelligencePanel
              programmeId={999}
              apiBaseUrl="/api/invalid-endpoint-triggering-error"
            />
          )}

          {viewState === 'loading' && (
            <FinancialIntelligencePanel
              programmeId={1}
              // Omit initialSummary and use slow simulated endpoint to demonstrate loading state
              apiBaseUrl="/api/simulated-delay"
            />
          )}
        </div>
      </div>
    </div>
  );
};
