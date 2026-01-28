import React from 'react'
import { SkeletonLoader, EmptyState, ToastContainer, StateCard } from '../../components/results/ResultsComponents'
import { useResults, useToasts } from '../../hooks/useResults'

export const OverviewPage: React.FC<{ mode: 'legacy' | 'v2'; onModeChange: (m: 'legacy' | 'v2') => void }> = ({
  mode,
  onModeChange,
}) => {
  const { results, loading, runInference } = useResults()
  const { toasts, addToast } = useToasts()

  const handleRunInference = async () => {
    addToast('info', 'Running inference...')
    try {
      await runInference()
      addToast('success', 'Inference complete!')
    } catch (err) {
      addToast('error', 'Inference failed')
    }
  }

  if (loading) return <SkeletonLoader count={5} />

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Clinical Results Dashboard</h1>
          <EmptyState
            title="Ready to Analyze Your Health"
            description="Click the button below to run inference and see your physiological analysis."
            cta={{ label: '▶️ Run Inference', onClick: handleRunInference }}
          />
        </div>
      </div>
    )
  }

  const summary = results.summary || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Your Results</h1>
          <div className="flex gap-4">
            <select
              value={mode}
              onChange={(e) => onModeChange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="legacy">Legacy</option>
              <option value="v2">v2</option>
            </select>
            <button
              onClick={handleRunInference}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ▶️ Run Inference
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(summary).map(([key, state]: [string, any]) => (
            <StateCard
              key={key}
              title={key.replace(/_/g, ' ').toUpperCase()}
              label={state?.label || 'N/A'}
              confidence={state?.confidence || 0}
              drivers={state?.drivers || []}
            />
          ))}
        </div>

        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-900 text-sm">
            <strong>⚠️ Medical Disclaimer:</strong> This is informational only and not medical advice.
          </p>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}

export const LabsPage: React.FC = () => {
  const { results, loading } = useResults()
  const { toasts } = useToasts()

  if (loading) return <SkeletonLoader count={3} />

  if (!results?.panels) {
    return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8"><EmptyState title="No Labs" description="Run inference first." /></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Lab Results</h1>
        {results.panels.map((panel: any, idx: number) => (
          <div key={idx} className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{panel.panel_name}</h2>
            {panel.produced_outputs?.map((analyte: any, i: number) => (
              <div key={i} className="border-l-4 border-green-500 bg-green-50 p-4 rounded mb-4">
                <p className="font-bold text-gray-900">{analyte.analyte}</p>
                <p className="text-gray-700">{analyte.value} {analyte.unit}</p>
                <p className="text-sm text-gray-600 mt-2">{analyte.user_explanation}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  )
}

export const KeyLegendPage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Key & Legend</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Support Types</h2>
          <p className="text-gray-700"><strong>Direct:</strong> Measured directly</p>
          <p className="text-gray-700"><strong>Derived:</strong> Calculated from direct</p>
          <p className="text-gray-700"><strong>Proxy:</strong> Estimated indirectly</p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Confidence</h2>
          <p className="text-gray-700">🟢 67-100%: High</p>
          <p className="text-gray-700">🟡 34-66%: Moderate</p>
          <p className="text-gray-700">🔴 0-33%: Low</p>
        </div>
      </div>
    </div>
  </div>
)

export const ResultsLayout: React.FC = () => <OverviewPage mode="v2" onModeChange={() => {}} />
export const getResultsRoutes = () => [
  { path: '/results', element: <OverviewPage mode="v2" onModeChange={() => {}} /> },
  { path: '/results/labs', element: <LabsPage /> },
  { path: '/results/key', element: <KeyLegendPage /> },
]
