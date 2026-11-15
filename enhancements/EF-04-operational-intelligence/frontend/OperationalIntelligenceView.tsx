import React from 'react';

export interface OperationalIntelligenceViewProps {
  loading: boolean;
  error: string | null;
  data: { status: any; issues: any[] } | null;
}

export const OperationalIntelligenceView: React.FC<OperationalIntelligenceViewProps> = ({
  loading,
  error,
  data,
}) => {
  return (
    <div data-testid="ef04-operational-intelligence" className="p-4">
      <h2 className="font-bold">Operational Intelligence</h2>
      <h3 className="mt-4 font-semibold">Detected Issues</h3>
      {loading ? (
        <div data-testid="ef04-loading">Loading...</div>
      ) : error ? (
        <div data-testid="ef04-error">Error: {error}</div>
      ) : !data ? (
        <div data-testid="ef04-empty">No data.</div>
      ) : (
        <ul data-testid="ef04-content">
          {data.issues.map((i: any) => (
            <li key={i.id} data-testid="ef04-issue-item" className="text-red-600">
              {i.title}: {i.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
