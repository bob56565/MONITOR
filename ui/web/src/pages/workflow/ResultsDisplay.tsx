import React from 'react'

interface ResultsDisplayProps {
  inferenceResult: any
  runId: string
  onNewAnalysis: () => void
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ inferenceResult, runId, onNewAnalysis }) => {
  if (!inferenceResult || !inferenceResult.inference_pack_v2) {
    return null
  }

  const pack = inferenceResult.inference_pack_v2
  const measuredValues = pack.measured_values || []
  const inferredValues = pack.inferred_values || []
  const suppressedOutputs = pack.suppressed_outputs || []
  const physiologicalStates = pack.physiological_states || []
  const overallConfidence = pack.overall_confidence_0_1 || 0
  const overallCoherence = pack.overall_coherence_0_1 || 0
  
  const downloadReport = () => {
    const reportData = {
      run_id: runId,
      created_at: inferenceResult.created_at,
      inference_pack: pack,
      summary: {
        measured_count: measuredValues.length,
        inferred_count: inferredValues.length,
        suppressed_count: suppressedOutputs.length,
        overall_confidence: overallConfidence,
        overall_coherence: overallCoherence,
      }
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monitor-report-${runId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">✅ Analysis Complete</h1>
              <p className="text-gray-600">Run ID: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{runId}</span></p>
              <p className="text-sm text-gray-500 mt-1">Generated: {new Date(inferenceResult.created_at).toLocaleString()}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadReport}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                📥 Download Report
              </button>
              <button
                onClick={onNewAnalysis}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                ➕ New Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Overall Confidence</p>
            <p className="text-3xl font-bold text-green-600">{Math.round(overallConfidence * 100)}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Coherence Score</p>
            <p className="text-3xl font-bold text-blue-600">{Math.round(overallCoherence * 100)}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Outputs Produced</p>
            <p className="text-3xl font-bold text-gray-900">{measuredValues.length + inferredValues.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Suppressed</p>
            <p className="text-3xl font-bold text-orange-600">{suppressedOutputs.length}</p>
          </div>
        </div>

        {/* Physiological States */}
        {physiologicalStates.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🧬 Physiological State Assessment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {physiologicalStates.map((state: any, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-green-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{state.domain || 'Unknown Domain'}</h3>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {Math.round((state.confidence_0_1 || 0) * 100)}% conf
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{state.summary || 'No summary available'}</p>
                  {state.evidence && state.evidence.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">Evidence: {state.evidence.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Measured Values */}
        {measuredValues.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Directly Measured Values</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Parameter</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Range</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Confidence</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {measuredValues.map((val: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{val.key || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="font-semibold">{val.value?.toFixed(2) || 'N/A'}</span> {val.range_unit || ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {val.range_lower !== undefined && val.range_upper !== undefined 
                          ? `${val.range_lower} - ${val.range_upper}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{width: `${(val.confidence_0_1 || 0) * 100}%`}}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{Math.round((val.confidence_0_1 || 0) * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {val.source_specimen_types?.join(', ') || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inferred Values */}
        {inferredValues.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔬 Inferred Values (Computed from Data)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Parameter</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Range</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Confidence</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Support Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inferredValues.map((val: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{val.key || 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="font-semibold">{val.value?.toFixed(2) || 'N/A'}</span> {val.range_unit || ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {val.range_lower !== undefined && val.range_upper !== undefined 
                          ? `${val.range_lower} - ${val.range_upper}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{width: `${(val.confidence_0_1 || 0) * 100}%`}}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{Math.round((val.confidence_0_1 || 0) * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          val.support_type === 'direct' ? 'bg-green-100 text-green-800' :
                          val.support_type === 'proxy' ? 'bg-yellow-100 text-yellow-800' :
                          val.support_type === 'population' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {val.support_type || 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {val.engine_sources?.join(', ') || val.provenance || 'computed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Suppressed Outputs */}
        {suppressedOutputs.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Suppressed Outputs (Insufficient Data)</h2>
            <p className="text-gray-600 mb-4">These values could not be computed due to missing required inputs or low data quality.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppressedOutputs.map((output: any, idx: number) => (
                <div key={idx} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{output.key || 'Unknown Parameter'}</h3>
                      <p className="text-sm text-gray-700 mt-1">{output.reason_detail || output.reason || 'No details provided'}</p>
                      {output.missing_anchors && output.missing_anchors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 font-semibold">Missing required inputs:</p>
                          <ul className="text-xs text-gray-600 ml-4 list-disc">
                            {output.missing_anchors.map((anchor: string, i: number) => (
                              <li key={i}>{anchor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Notes */}
        {pack.processing_notes && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-2">📝 Processing Notes</h3>
            <p className="text-sm text-gray-700">{pack.processing_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
