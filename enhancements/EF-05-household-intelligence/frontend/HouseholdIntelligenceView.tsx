import React from 'react';
import type { DetectionResult, DuplicateCluster } from '../backend/household-intelligence.service.ts';

export interface HouseholdIntelligenceViewProps {
  loading: boolean;
  error: string | null;
  empty: boolean;
  data: DetectionResult | null;
  resolving: string | null;
  onResolve: (clusterId: string, action: 'dismiss' | 'flag_for_review') => void;
  onRefresh: () => void;
  onRetry: () => void;
}

export const HouseholdIntelligenceView: React.FC<HouseholdIntelligenceViewProps> = ({
  loading, error, empty, data, resolving, onResolve, onRefresh, onRetry,
}) => {
  if (loading) return <div data-testid="ef05-household-intelligence"><div data-testid="ef05-loading">Scanning...</div></div>;
  if (error) return <div data-testid="ef05-household-intelligence"><div data-testid="ef05-error">{error}<button data-testid="ef05-retry-btn" onClick={onRetry}>Retry</button></div></div>;
  if (empty || !data) return <div data-testid="ef05-household-intelligence"><div data-testid="ef05-empty">No duplicates detected.</div></div>;

  return (
    <div data-testid="ef05-household-intelligence">
      <div data-testid="ef05-content">
        {data.clusters.map((c: DuplicateCluster) => (
          <div key={c.clusterId} data-testid="ef05-cluster-item">
            <span>{c.matchingReasons.join(', ')}</span>
            <span>{c.confidenceScore}</span>
            {c.status === 'open' && (
              <button data-testid="ef05-dismiss-btn" disabled={resolving === c.clusterId} onClick={() => onResolve(c.clusterId, 'dismiss')}>Dismiss</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
