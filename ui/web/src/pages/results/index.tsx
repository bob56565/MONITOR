import React, { useState } from 'react'
import { SkeletonLoader, EmptyState, ToastContainer, StateCard } from '../../components/results/ResultsComponents'
import { useWorkflow, useToasts } from '../../hooks/useWorkflow'

export const OverviewPage: React.FC = () => {
  const { workflow } = useWorkflow()
  const { toasts } = useToasts()
  const [mode, setMode] = useState<'legacy' | 'v2'>('v2')

  if (!workflow.results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <EmptyState
            title="No Results Yet"
            description="Complete the full analysis workflow to see your results."
            cta={{ label: '🚀 Start Analysis', onClick: () => (window.location.href = '/workflow/input') }}
          />
        </div>
      </div>
    )
  }

  const summary = workflow.results.summary || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Your Results</h1>
          <div className="flex gap-4">
            <select
              value={mode}
              onChange={e => setMode(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="legacy">Legacy</option>
              <option value="v2">v2 (Recommended)</option>
            </select>
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
  const [searchTerm, setSearchTerm] = useState('')
  const { workflow } = useWorkflow()
  const { toasts } = useToasts()

  if (!workflow.results?.panels) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto">
          <EmptyState title="No Labs Loaded" description="Complete the full analysis workflow to see your results." />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Lab Results</h1>
        <div className="sticky top-20 bg-white p-4 border-b z-10 rounded-lg mb-6 shadow">
          <input
            type="text"
            placeholder="Search analyte..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        {workflow.results.panels.map((panel: any, idx: number) => (
          <div key={idx} className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{panel.panel_name}</h2>

            {panel.produced_outputs?.map((analyte: any, i: number) => (
              <div key={i} className="border-l-4 border-green-500 bg-green-50 p-4 rounded mb-4">
                <p className="font-bold text-gray-900">{analyte.analyte}</p>
                <p className="text-gray-700">{analyte.value} {analyte.unit}</p>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-gray-600">{analyte.support_type}</span>
                  <span className="font-semibold text-blue-600">{(analyte.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}

            {panel.suppressed_outputs?.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Suppressed Outputs</h3>
                {panel.suppressed_outputs.map((analyte: any, i: number) => (
                  <div key={i} className="border-l-4 border-gray-300 bg-gray-50 p-4 rounded mb-4 opacity-70">
                    <p className="font-bold text-gray-700">{analyte.analyte}</p>
                    <p className="text-sm text-gray-600">{analyte.suppression_reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}

export const KeyLegendPage: React.FC = () => {
  const { toasts } = useToasts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Key & Legend</h1>
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Support Types</h2>
            <p className="text-gray-700 mb-2">
              <strong>🟢 Direct:</strong> Measured directly from sensor data
            </p>
            <p className="text-gray-700 mb-2">
              <strong>🔵 Derived:</strong> Calculated from direct measurements
            </p>
            <p className="text-gray-700">
              <strong>🟡 Proxy:</strong> Estimated indirectly from available data
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confidence Levels</h2>
            <p className="text-gray-700 mb-2">🟢 67-100%: High confidence in the measurement</p>
            <p className="text-gray-700 mb-2">🟡 34-66%: Moderate confidence</p>
            <p className="text-gray-700">🔴 0-33%: Low confidence - use with caution</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Workflow Stages</h2>
            <div className="space-y-2">
              <p className="text-gray-700"><strong>📥 Input:</strong> Upload raw sensor data</p>
              <p className="text-gray-700"><strong>⚙️ Preprocessing:</strong> Calibrate and clean data</p>
              <p className="text-gray-700"><strong>🔍 Analysis:</strong> Extract features and patterns</p>
              <p className="text-gray-700"><strong>🤖 Inference:</strong> Run ML model on analyzed data</p>
              <p className="text-gray-700"><strong>📊 Results:</strong> View detailed results and reports</p>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}

export const ResultsLayout: React.FC = () => <OverviewPage />
export const getResultsRoutes = () => [
  { path: '/results', element: <OverviewPage /> },
  { path: '/results/labs', element: <LabsPage /> },
  { path: '/results/key', element: <KeyLegendPage /> },
]
