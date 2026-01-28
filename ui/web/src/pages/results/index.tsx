import React, { useState } from 'react';
import { SkeletonLoader, EmptyState, ToastContainer, StateCard } from '../../components/results/ResultsComponents';
import { useResults, useToasts } from '../../hooks/useResults';

export const OverviewPage: React.FC<{ mode: 'legacy' | 'v2'; onModeChange: (m: 'legacy' | 'v2') => void }> = ({ mode, onModeChange }) => {
  const { results, loading } = useResults();
  const { toasts, addToast } = useToasts();

  if (loading) return <SkeletonLoader count={5} />;
  if (!results) return <EmptyState title="No Results Yet" description="Run inference to start." cta={{ label: 'Run Inference', onClick: () => addToast('info', 'Starting...') }} />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Results</h1>
        <div className="flex gap-4">
          <select value={mode} onChange={(e) => onModeChange(e.target.value as any)} className="px-3 py-2 border rounded">
            <option value="legacy">Legacy</option>
            <option value="v2">v2 (Recommended)</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Run Inference</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(results.summary || {}).map(([key, state]: [string, any]) => (
          <StateCard key={key} title={key.replace(/_/g, ' ')} label={state.label} confidence={state.confidence} drivers={state.drivers} />
        ))}
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
};

export const LabsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { toasts } = useToasts();

  return (
    <div>
      <div className="sticky top-0 bg-white p-4 border-b z-10">
        <input type="text" placeholder="Search analyte..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border rounded mb-3" />
      </div>
      <EmptyState title="No labs loaded" description="Load results first." />
      <ToastContainer toasts={toasts} />
    </div>
  );
};

export const KeyLegendPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-6">Key / Legend</h1>
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Support Types</h2>
        <div className="space-y-2">
          <p><strong>Direct:</strong> Measured directly</p>
          <p><strong>Derived:</strong> Computed from measurements</p>
          <p><strong>Proxy:</strong> Estimated indirectly</p>
        </div>
      </div>
    </div>
  </div>
);

export const ResultsLayout: React.FC = () => (
  <div className="w-full h-full bg-gray-50">
    <OverviewPage mode="v2" onModeChange={() => {}} />
  </div>
);

export const getResultsRoutes = () => [
  { path: '/results', element: <OverviewPage mode="v2" onModeChange={() => {}} /> },
  { path: '/results/labs', element: <LabsPage /> },
  { path: '/results/key', element: <KeyLegendPage /> },
];
