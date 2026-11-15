import React from 'react';
import { OperationalIntelligencePanel } from '../frontend/OperationalIntelligencePanel.tsx';

/**
 * Sandbox for EF-04. Uses mock logic instead of real backend.
 */
export const SandboxApp = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">EF-04 Sandbox</h1>
      <OperationalIntelligencePanel programmeId={1} />
    </div>
  );
};
