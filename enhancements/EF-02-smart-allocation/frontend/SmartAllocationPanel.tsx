import React, { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types (mirror backend types)
// ---------------------------------------------------------------------------

interface ShareSlot {
  animalId: number;
  animalTag: string;
  animalSpecies: string;
  animalWeight: number;
  slotIndex: number;
}

interface ProposedAllocation {
  participantId: number;
  participantName: string;
  householdId: number;
  slot: ShareSlot;
}

interface OptimizeResult {
  programmeId: number;
  policy: string;
  proposedAllocations: ProposedAllocation[];
  unmatched: number[];
  unfilledSlots: number;
  generatedAt: string;
  previewToken: string;
}

interface CommitResult {
  committed: number;
  skipped: number;
  programmeId: number;
}

// ---------------------------------------------------------------------------
// Props (from smart-allocation-slot host)
// ---------------------------------------------------------------------------

export interface SmartAllocationPanelProps {
  programmeId: number;
  onAllocate?: () => void;
  onAllocateComplete?: (result: CommitResult) => void;
}

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type PanelState = 'idle' | 'processing' | 'review_preview' | 'committing' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Component (Controller – do not restyle this logic layer)
// ---------------------------------------------------------------------------

export const SmartAllocationPanel: React.FC<SmartAllocationPanelProps> = ({
  programmeId,
  onAllocate,
  onAllocateComplete,
}) => {
  const [state, setState] = useState<PanelState>('idle');
  const [policy, setPolicy] = useState<string>('default');
  const [preview, setPreview] = useState<OptimizeResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run optimization
  const handleOptimize = useCallback(async () => {
    setState('processing');
    setError(null);
    setPreview(null);
    onAllocate?.();
    try {
      const res = await fetch('/api/ext/EF-02/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programmeId, policy }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Server error ${res.status}`);
      }
      const data: OptimizeResult = await res.json();
      setPreview(data);
      setState('review_preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setState('error');
    }
  }, [programmeId, policy, onAllocate]);

  // Commit the previewed allocations
  const handleCommit = useCallback(async () => {
    if (!preview) return;
    setState('committing');
    try {
      const res = await fetch('/api/ext/EF-02/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          previewToken: preview.previewToken,
          proposedAllocations: preview.proposedAllocations,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Server error ${res.status}`);
      }
      const data: CommitResult = await res.json();
      setCommitResult(data);
      setState('success');
      onAllocateComplete?.(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setState('error');
    }
  }, [preview, programmeId, onAllocateComplete]);

  const handleReset = () => {
    setState('idle');
    setPreview(null);
    setCommitResult(null);
    setError(null);
  };

  // ---------------------------------------------------------------------------
  // Render (thin basic view – M1 replaces this with the design system)
  // ---------------------------------------------------------------------------

  return (
    <div data-testid="ef02-smart-allocation-panel" style={{ padding: 16, border: '1px solid #ccc', borderRadius: 8 }}>
      <h3>Smart Allocation Engine</h3>

      {/* IDLE */}
      {state === 'idle' && (
        <div>
          <label htmlFor="ef02-policy-select">Allocation policy: </label>
          <select
            id="ef02-policy-select"
            data-testid="ef02-policy-select"
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
          >
            <option value="default">Default (FIFO)</option>
            <option value="household_first">Household grouping first</option>
            <option value="fifo">Strict FIFO</option>
          </select>
          <br /><br />
          <button
            data-testid="ef02-smart-allocation-btn"
            onClick={handleOptimize}
          >
            Run Smart Allocation
          </button>
        </div>
      )}

      {/* PROCESSING */}
      {state === 'processing' && (
        <p data-testid="ef02-loading">Computing allocation plan…</p>
      )}

      {/* REVIEW PREVIEW */}
      {state === 'review_preview' && preview && (
        <div data-testid="ef02-preview">
          <p>
            <strong>Preview ready</strong> — {preview.proposedAllocations.length} allocation(s) proposed.
            {preview.unmatched.length > 0 && (
              <span> {preview.unmatched.length} participant(s) could not be matched.</span>
            )}
            {preview.unfilledSlots > 0 && (
              <span> {preview.unfilledSlots} share slot(s) left unfilled.</span>
            )}
          </p>
          <table data-testid="ef02-preview-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Participant</th>
                <th>Animal</th>
                <th>Species</th>
                <th>Weight (kg)</th>
                <th>Share #</th>
              </tr>
            </thead>
            <tbody>
              {preview.proposedAllocations.map((pa) => (
                <tr key={`${pa.participantId}-${pa.slot.animalId}-${pa.slot.slotIndex}`}>
                  <td>{pa.participantName}</td>
                  <td>{pa.slot.animalTag}</td>
                  <td>{pa.slot.animalSpecies}</td>
                  <td>{pa.slot.animalWeight}</td>
                  <td>{pa.slot.slotIndex}/7</td>
                </tr>
              ))}
            </tbody>
          </table>
          <br />
          <button data-testid="ef02-commit-btn" onClick={handleCommit}>
            Confirm &amp; Commit
          </button>
          &nbsp;
          <button data-testid="ef02-cancel-btn" onClick={handleReset}>
            Cancel
          </button>
        </div>
      )}

      {/* COMMITTING */}
      {state === 'committing' && (
        <p data-testid="ef02-committing">Saving allocations…</p>
      )}

      {/* SUCCESS */}
      {state === 'success' && commitResult && (
        <div data-testid="ef02-success">
          <p>
            ✅ Done — <strong>{commitResult.committed}</strong> allocation(s) committed.
            {commitResult.skipped > 0 && ` (${commitResult.skipped} already allocated, skipped)`}
          </p>
          <button data-testid="ef02-reset-btn" onClick={handleReset}>
            Run Again
          </button>
        </div>
      )}

      {/* ERROR */}
      {state === 'error' && (
        <div data-testid="ef02-error">
          <p style={{ color: 'red' }}>Error: {error}</p>
          <button data-testid="ef02-retry-btn" onClick={handleReset}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default SmartAllocationPanel;
