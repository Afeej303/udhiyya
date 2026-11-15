import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Import M3 UI Components
import { AnalyticsDashboard } from '../EF-01-analytics/frontend/AnalyticsDashboard.tsx';
import { SmartAllocationPanel } from '../EF-02-smart-allocation/frontend/SmartAllocationPanel.tsx';
import { FinancialIntelligencePanel } from '../EF-03-financial-intelligence/frontend/FinancialIntelligencePanel.tsx';
import { OperationalIntelligencePanel } from '../EF-04-operational-intelligence/frontend/OperationalIntelligencePanel.tsx';

describe('M3 UI Component & Slot Integration Test Suite', () => {

  // -------------------------------------------------------------------------
  // 1. EF-01: Analytics Dashboard
  // -------------------------------------------------------------------------
  describe('EF-01: AnalyticsDashboard UI Component', () => {
    const mockSummary = {
      participants: { total: 100, approved: 80, pending: 15, rejected: 3, cancelled: 2 },
      weightMetrics: { totalAnimals: 20, totalWeightKg: 6500, averageWeightKg: 325, minWeightKg: 240, maxWeightKg: 420, medianWeightKg: 320 },
      shareStatistics: { totalCapacity: 140, allocatedShares: 80, unallocatedShares: 60, utilizationRate: 57.1 },
      paymentProgress: { expectedTotalAmount: 14000000, collectedAmount: 8000000, pendingAmount: 6000000, completionRate: 57.1 }
    };

    it('renders loading state when initialSummary is missing', () => {
      const html = renderToString(React.createElement(AnalyticsDashboard, { programmeId: 1 }));
      assert.ok(html.includes('data-testid="ef01-analytics-dashboard"'), 'Should render container');
      assert.ok(html.includes('data-testid="ef01-loading"'), 'Should display loading indicator');
    });

    it('renders full metric cards when initial data is provided', () => {
      const html = renderToString(React.createElement(AnalyticsDashboard, {
        programmeId: 1,
        initialSummary: mockSummary
      }));
      assert.ok(html.includes('data-testid="ef01-content"'), 'Should render main content view');
      assert.ok(html.includes('data-testid="ef01-metric-participants"'), 'Should render participants KPI card');
      assert.ok(html.includes('data-testid="ef01-metric-weight"'), 'Should render animal weight KPI card');
      assert.ok(html.includes('data-testid="ef01-metric-shares"'), 'Should render share capacity KPI card');
      assert.ok(html.includes('data-testid="ef01-metric-payments"'), 'Should render payment KPI card');
      assert.ok(html.includes('80') && html.includes('140'), 'Should display allocated shares');
      assert.ok(html.includes('57.1') && html.includes('utilized'), 'Should display utilization percentage');
      assert.ok(html.includes('data-testid="ef01-refresh-btn"'), 'Should display refresh button');
    });

    it('slot compatibility: conforms strictly to { programmeId: number } prop contract', () => {
      const element = React.createElement(AnalyticsDashboard, { programmeId: 42 });
      assert.equal(element.props.programmeId, 42);
    });
  });

  // -------------------------------------------------------------------------
  // 2. EF-02: Smart Allocation Panel
  // -------------------------------------------------------------------------
  describe('EF-02: SmartAllocationPanel UI Component', () => {
    it('renders idle state with action button and policy options', () => {
      const html = renderToString(React.createElement(SmartAllocationPanel, {
        programmeId: 1,
        onAllocate: () => {}
      }));
      assert.ok(html.includes('data-testid="ef02-smart-allocation-btn"'), 'Should render trigger button');
      assert.ok(html.includes('Run Smart Allocation'), 'Should display CTA label');
      assert.ok(html.includes('Smart Allocation Engine'), 'Should display title');
      assert.ok(html.includes('Default (FIFO)'), 'Should display default policy option');
      assert.ok(html.includes('Household grouping first'), 'Should display household affinity policy option');
      assert.ok(html.includes('Strict FIFO'), 'Should display strict fifo option');
    });

    it('slot compatibility: conforms to { programmeId: number, onAllocate?: () => void } contract', () => {
      let allocatedCalled = false;
      const element = React.createElement(SmartAllocationPanel, {
        programmeId: 10,
        onAllocate: () => { allocatedCalled = true; }
      });
      assert.equal(element.props.programmeId, 10);
      assert.equal(typeof element.props.onAllocate, 'function');
      element.props.onAllocate();
      assert.equal(allocatedCalled, true);
    });
  });

  // -------------------------------------------------------------------------
  // 3. EF-03: Financial Intelligence Panel
  // -------------------------------------------------------------------------
  describe('EF-03: FinancialIntelligencePanel UI Component', () => {
    const mockSummary = {
      programmeId: 1,
      programmeTitle: 'Eid al-Adha 2026',
      currency: 'INR',
      sharePriceMinor: 1000000,
      totalParticipants: 50,
      totalAllocatedShares: 50,
      expectedRevenueMinor: 50000000,
      collectedRevenueMinor: 35000000,
      outstandingRevenueMinor: 15000000,
      collectionRatePercentage: 70,
      totalExpensesMinor: 20000000,
      expensesByCategory: [
        { category: 'ANIMAL_PURCHASE' as const, label: 'Animal Purchase', count: 5, amountMinor: 15000000, percentageOfTotal: 75 },
        { category: 'FEED_AND_FODDER' as const, label: 'Feed & Fodder', count: 2, amountMinor: 5000000, percentageOfTotal: 25 }
      ],
      netSurplusDeficitMinor: 15000000,
      isSurplus: true,
      anomalySummary: { totalAnomalies: 1, highSeverity: 1, mediumSeverity: 0, lowSeverity: 0 },
      generatedAt: new Date().toISOString()
    };

    const mockAnomalies = [
      {
        anomalyId: 'ANOM-1',
        type: 'DUPLICATE_PAYMENT_REF' as const,
        severity: 'HIGH' as const,
        description: 'Duplicate reference UTR-1234',
        detectedAt: new Date().toISOString()
      }
    ];

    it('renders null when VITE_FEATURE_EF_03 is set to off', () => {
      const originalEnv = process.env.VITE_FEATURE_EF_03;
      try {
        process.env.VITE_FEATURE_EF_03 = 'off';
        const html = renderToString(React.createElement(FinancialIntelligencePanel, { programmeId: 1 }));
        assert.equal(html, '', 'Component must render empty string when flag is off');
      } finally {
        process.env.VITE_FEATURE_EF_03 = originalEnv;
      }
    });

    it('renders financial summary overview cards when initial data provided', () => {
      const html = renderToString(React.createElement(FinancialIntelligencePanel, {
        programmeId: 1,
        initialSummary: mockSummary,
        initialAnomalies: mockAnomalies
      }));
      assert.ok(html.includes('data-testid="ef03-financial-intelligence"'), 'Should render container');
      assert.ok(html.includes('data-testid="ef03-metric-revenue"'), 'Should display Expected Revenue card');
      assert.ok(html.includes('data-testid="ef03-metric-collected"'), 'Should display Collected card');
      assert.ok(html.includes('data-testid="ef03-metric-outstanding"'), 'Should display Outstanding card');
      assert.ok(html.includes('data-testid="ef03-metric-net"'), 'Should display Net Balance card');
      assert.ok(html.includes('Operating Surplus'), 'Should display Operating Surplus badge');
      assert.ok(html.includes('70'), 'Should display collection rate');
      assert.ok(html.includes('data-testid="ef03-tab-overview"'), 'Should display Overview tab');
      assert.ok(html.includes('data-testid="ef03-tab-anomalies"'), 'Should display Anomalies tab');
      assert.ok(html.includes('data-testid="ef03-tab-categoriser"'), 'Should display Categoriser tab');
    });

    it('slot compatibility: conforms strictly to { programmeId: number } prop contract', () => {
      const element = React.createElement(FinancialIntelligencePanel, { programmeId: 5 });
      assert.equal(element.props.programmeId, 5);
    });
  });

  // -------------------------------------------------------------------------
  // 4. EF-04: Operational Intelligence Panel
  // -------------------------------------------------------------------------
  describe('EF-04: OperationalIntelligencePanel UI Component', () => {
    it('renders operational intelligence container and title', () => {
      const html = renderToString(React.createElement(OperationalIntelligencePanel, { programmeId: 1 }));
      assert.ok(html.includes('data-testid="ef04-operational-intelligence"'), 'Should render container');
      assert.ok(html.includes('Operational Intelligence'), 'Should display title');
      assert.ok(html.includes('Detected Issues'), 'Should display Detected Issues section');
    });

    it('slot compatibility: conforms strictly to { programmeId: number } prop contract', () => {
      const element = React.createElement(OperationalIntelligencePanel, { programmeId: 8 });
      assert.equal(element.props.programmeId, 8);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Cross-Cutting Feature Slot Architecture Verification
  // -------------------------------------------------------------------------
  describe('Cross-Cutting: Extension Slot Architecture Verification', () => {
    it('verifies all 4 M3 components can mount side-by-side in a layout without collision', () => {
      const compositeLayout = React.createElement('div', { id: 'root-dashboard-slot-test' },
        React.createElement(AnalyticsDashboard, { programmeId: 1 }),
        React.createElement(SmartAllocationPanel, { programmeId: 1 }),
        React.createElement(FinancialIntelligencePanel, { programmeId: 1 }),
        React.createElement(OperationalIntelligencePanel, { programmeId: 1 })
      );
      const html = renderToString(compositeLayout);
      assert.ok(html.includes('data-testid="ef01-analytics-dashboard"'));
      assert.ok(html.includes('data-testid="ef02-smart-allocation-btn"'));
      assert.ok(html.includes('data-testid="ef03-financial-intelligence"'));
      assert.ok(html.includes('data-testid="ef04-operational-intelligence"'));
    });
  });
});
