/**
 * EF-02: Smart Allocation Engine – Sandbox Page
 * Standalone page using mock data to demonstrate the SmartAllocationPanel.
 * Run with: npx vite enhancements/EF-02-smart-allocation/sandbox/
 */

import React, { useState } from 'react';
import { SmartAllocationPanel } from '../frontend/SmartAllocationPanel';

// ---------------------------------------------------------------------------
// Mock API interceptor (sandbox only)
// ---------------------------------------------------------------------------

const MOCK_PREVIEW = {
  programmeId: 1,
  policy: 'default',
  proposedAllocations: [
    { participantId: 1, participantName: 'Ahmad bin Ali', householdId: 1, slot: { animalId: 1, animalTag: 'TAG-001', animalSpecies: 'Cattle', animalWeight: 450, slotIndex: 1 } },
    { participantId: 2, participantName: 'Fatimah binti Hassan', householdId: 2, slot: { animalId: 1, animalTag: 'TAG-001', animalSpecies: 'Cattle', animalWeight: 450, slotIndex: 2 } },
    { participantId: 3, participantName: 'Muhammad bin Yusuf', householdId: 1, slot: { animalId: 1, animalTag: 'TAG-001', animalSpecies: 'Cattle', animalWeight: 450, slotIndex: 3 } },
    { participantId: 4, participantName: 'Siti binti Omar', householdId: 3, slot: { animalId: 1, animalTag: 'TAG-001', animalSpecies: 'Cattle', animalWeight: 450, slotIndex: 4 } },
    { participantId: 5, participantName: 'Ibrahim bin Idris', householdId: 4, slot: { animalId: 1, animalTag: 'TAG-001', animalSpecies: 'Cattle', animalWeight: 450, slotIndex: 5 } },
    { participantId: 6, participantName: 'Nor Aziah binti Daud', householdId: 5, slot: { animalId: 1, animalTag: 'TAG-001', animalSpecies: 'Cattle', animalWeight: 450, slotIndex: 6 } },
    { participantId: 7, participantName: 'Zakaria bin Mahmud', householdId: 6, slot: { animalId: 1, animalTag: 'TAG-001', animalSpecies: 'Cattle', animalWeight: 450, slotIndex: 7 } },
  ],
  unmatched: [8, 9],
  unfilledSlots: 0,
  generatedAt: new Date().toISOString(),
  previewToken: btoa('1:' + Date.now()),
};

// Patch fetch for sandbox
const originalFetch = window.fetch;
window.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
  const path = url.toString();
  if (path.includes('/api/ext/EF-02/optimize')) {
    await new Promise((r) => setTimeout(r, 800)); // simulate network
    return new Response(JSON.stringify(MOCK_PREVIEW), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (path.includes('/api/ext/EF-02/commit')) {
    await new Promise((r) => setTimeout(r, 600));
    return new Response(
      JSON.stringify({ committed: MOCK_PREVIEW.proposedAllocations.length, skipped: 0, programmeId: 1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return originalFetch(url, init);
};

// ---------------------------------------------------------------------------
// Sandbox App
// ---------------------------------------------------------------------------

export default function SandboxApp() {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>EF-02 Smart Allocation Engine – Sandbox</h1>
      <p style={{ color: '#666' }}>
        This page uses mock data. The API calls are intercepted locally.
      </p>
      <SmartAllocationPanel
        programmeId={1}
        onAllocate={() => addLog('onAllocate fired')}
        onAllocateComplete={(r) =>
          addLog(`onAllocateComplete: committed=${r.committed}, skipped=${r.skipped}`)
        }
      />
      {log.length > 0 && (
        <div style={{ marginTop: 24, background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
          <strong>Event log</strong>
          <ul>
            {log.map((entry, i) => <li key={i}><code>{entry}</code></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
