import React, { useRef } from 'react'
import { useWorkflow, useToasts } from '../../hooks/useWorkflow'
import { SkeletonLoader, EmptyState, ToastContainer, StateCard, ConfidenceMeter } from '../../components/results/ResultsComponents'

/**
 * STAGE 0: Input Raw Data
 */
export const InputPage: React.FC = () => {
  const { workflow, inputRawData, runPreprocessing } = useWorkflow()
  const { toasts, addToast } = useToasts()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    addToast('info', 'Processing file...')
    try {
      await inputRawData(file)
      addToast('success', 'File uploaded successfully!')
    } catch (err) {
      addToast('error', 'Failed to process file')
    }
  }

  const currentStage = workflow.allStages[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">📥 Input Raw Data</h1>
        <p className="text-gray-600 text-lg mb-8">Upload your sensor data to begin the analysis pipeline</p>

        {!workflow.rawData ? (
          <div className="bg-white rounded-lg shadow-lg p-12 border-2 border-dashed border-blue-300">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Sensor Data</h2>
              <p className="text-gray-600 mb-6">Supported formats: CSV, JSON, XLSX</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv,.json,.xlsx"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={currentStage.status === 'loading'}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-bold text-lg transition-colors"
              >
                {currentStage.status === 'loading' ? 'Processing...' : '📁 Choose File'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Raw Data Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">File Name</p>
                  <p className="font-semibold text-gray-900">{workflow.rawData.filename}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data Points</p>
                  <p className="font-semibold text-gray-900">{workflow.rawData.dataPoints.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File Size</p>
                  <p className="font-semibold text-gray-900">{(workflow.rawData.fileSize / 1024).toFixed(2)} KB</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Format</p>
                  <p className="font-semibold text-gray-900">{workflow.rawData.format.toUpperCase()}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-3">Sensors Detected:</p>
                <div className="flex flex-wrap gap-2">
                  {workflow.rawData.summary.sensorTypes.map(sensor => (
                    <span key={sensor} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {sensor}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>Time Range: {workflow.rawData.summary.timeRange}</p>
                <p>Sampling Rate: {workflow.rawData.summary.samplingRate}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                📁 Choose Different File
              </button>
              <button
                onClick={async () => {
                  addToast('info', 'Starting preprocessing...')
                  await runPreprocessing()
                  addToast('success', 'Preprocessing complete!')
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex-1"
              >
                ▶️ Next: Preprocessing
              </button>
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}

/**
 * STAGE 1: Preprocessing
 */
export const PreprocessingPage: React.FC = () => {
  const { workflow, runPreprocessing, runAnalysis } = useWorkflow()
  const { toasts, addToast } = useToasts()

  const currentStage = workflow.allStages[1]
  const preprocessingData = workflow.preprocessingData

  if (!workflow.rawData) {
    return <EmptyState title="No Raw Data" description="Please upload raw data first" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">⚙️ Preprocessing</h1>
        <p className="text-gray-600 text-lg mb-8">Calibrate, clean, and normalize sensor data</p>

        {currentStage.status === 'idle' ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <p className="text-gray-600 mb-4">Ready to preprocess {workflow.rawData.filename}</p>
            <button
              onClick={runPreprocessing}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg"
            >
              ▶️ Start Preprocessing
            </button>
          </div>
        ) : currentStage.status === 'loading' ? (
          <SkeletonLoader count={3} />
        ) : preprocessingData ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">✅ Preprocessing Complete</h3>
                  <p className="text-sm text-gray-600">Quality Score</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-green-600">{preprocessingData.qualityScore}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Calibration Applied</p>
                  <p className="font-semibold text-gray-900">{preprocessingData.calibrationApplied ? '✅ Yes' : '❌ No'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Artifacts Removed</p>
                  <p className="font-semibold text-gray-900">{preprocessingData.artifactsRemoved}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Normalized Ranges:</p>
                {Object.entries(preprocessingData.normalizedRanges).map(([key, range]: [string, any]) => (
                  <div key={key} className="text-sm text-gray-600 mb-2">
                    <strong>{key}:</strong> {range.min} - {range.max}
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">📊 Recorded Values:</p>
                {Object.entries(preprocessingData.recordedValues).map(([key, value]: [string, any]) => (
                  <div key={key} className="text-sm text-gray-600 mb-2">
                    <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(2) : value}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={runPreprocessing}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                🔄 Re-run Preprocessing
              </button>
              <button
                onClick={async () => {
                  addToast('info', 'Starting analysis...')
                  await runAnalysis()
                  addToast('success', 'Analysis complete!')
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex-1"
              >
                ▶️ Next: Analysis
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}

/**
 * STAGE 2: Analysis
 */
export const AnalysisPage: React.FC = () => {
  const { workflow, runAnalysis, runInference } = useWorkflow()
  const { toasts, addToast } = useToasts()

  const currentStage = workflow.allStages[2]
  const analysisData = workflow.analysisData

  if (!workflow.preprocessingData) {
    return <EmptyState title="No Preprocessing Data" description="Please complete preprocessing first" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🔍 Analysis</h1>
        <p className="text-gray-600 text-lg mb-8">Extract features and detect patterns in preprocessed data</p>

        {currentStage.status === 'idle' ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <p className="text-gray-600 mb-4">Ready to analyze preprocessed data</p>
            <button
              onClick={runAnalysis}
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg"
            >
              ▶️ Start Analysis
            </button>
          </div>
        ) : currentStage.status === 'loading' ? (
          <SkeletonLoader count={3} />
        ) : analysisData ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h3 className="text-xl font-bold text-gray-900 mb-6">✅ Analysis Complete</h3>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Features Extracted</p>
                  <p className="text-3xl font-bold text-blue-600">{analysisData.featuresExtracted}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Anomalies Detected</p>
                  <p className="text-3xl font-bold text-orange-600">{analysisData.anomaliesDetected}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-4">🎯 Significant Patterns:</p>
                {analysisData.patterns.map((pattern, i) => (
                  <div key={i} className="mb-4 pb-4 border-b last:border-b-0">
                    <div className="flex justify-between mb-2">
                      <strong className="text-gray-900">{pattern.name}</strong>
                      <span className="text-blue-600 font-bold">{(pattern.significance * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${pattern.significance * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Value: {pattern.recordedValue}</p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded p-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">📊 Recorded Metrics:</p>
                {Object.entries(analysisData.recordedMetrics).map(([key, value]: [string, any]) => (
                  <div key={key} className="text-sm text-gray-600 mb-2">
                    <strong>{key}:</strong> {typeof value === 'number' ? value.toFixed(2) : value}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={runAnalysis}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                🔄 Re-run Analysis
              </button>
              <button
                onClick={async () => {
                  addToast('info', 'Starting inference...')
                  await runInference('v2')
                  addToast('success', 'Inference complete!')
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex-1"
              >
                ▶️ Next: Inference
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}

/**
 * STAGE 3: Inference
 */
export const InferencePage: React.FC = () => {
  const { workflow, runInference, viewResults } = useWorkflow()
  const { toasts, addToast } = useToasts()
  const [mode, setMode] = React.useState<'legacy' | 'v2'>('v2')

  const currentStage = workflow.allStages[3]
  const inferenceData = workflow.inferenceData

  if (!workflow.analysisData) {
    return <EmptyState title="No Analysis Data" description="Please complete analysis first" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🤖 Inference</h1>
        <p className="text-gray-600 text-lg mb-8">Run machine learning model on analyzed data</p>

        {currentStage.status === 'idle' ? (
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Model Mode:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="v2"
                    checked={mode === 'v2'}
                    onChange={e => setMode(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">
                    <strong>v2 (Recommended)</strong> - Latest model with improved accuracy
                  </span>
                </label>
              </div>
              <div className="flex gap-4 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="legacy"
                    checked={mode === 'legacy'}
                    onChange={e => setMode(e.target.value as any)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700">
                    <strong>Legacy</strong> - Original model for comparison
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={async () => {
                addToast('info', 'Running inference...')
                await runInference(mode)
              }}
              className="w-full px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-lg"
            >
              ▶️ Run Inference ({mode})
            </button>
          </div>
        ) : currentStage.status === 'loading' ? (
          <SkeletonLoader count={3} />
        ) : inferenceData && workflow.results ? (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <h3 className="text-xl font-bold text-gray-900 mb-6">✅ Inference Complete</h3>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Model Mode</p>
                  <p className="font-bold text-gray-900">{inferenceData.mode.toUpperCase()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Execution Time</p>
                  <p className="font-bold text-gray-900">{(inferenceData.executionTime / 1000).toFixed(2)}s</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Run ID</p>
                  <p className="font-bold text-gray-900 text-xs">{inferenceData.runId.slice(0, 12)}...</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">📊 Recorded Outputs:</p>
                {Object.entries(inferenceData.recordedOutputs).map(([key, value]: [string, any]) => (
                  <div key={key} className="text-sm text-gray-600 mb-2">
                    <strong>{key}:</strong> {String(value)}
                  </div>
                ))}
              </div>

              <div className="bg-green-50 rounded p-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">🎯 Preliminary Results:</p>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(workflow.results.summary).map(([key, state]: [string, any]) => (
                    <div key={key} className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">{key.replace(/_/g, ' ')}</p>
                      <p className="font-bold text-gray-900">{state.label}</p>
                      <ConfidenceMeter confidence={state.confidence} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={async () => {
                  addToast('info', 'Re-running inference...')
                  await runInference(mode)
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                🔄 Re-run Inference
              </button>
              <button
                onClick={() => {
                  viewResults()
                  addToast('success', 'View your detailed results!')
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex-1"
              >
                ▶️ View Results
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
