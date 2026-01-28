import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { InputPage, PreprocessingPage, AnalysisPage, InferencePage } from './pages/workflow'
import { OverviewPage, LabsPage, KeyLegendPage } from './pages/results'
import { useWorkflow } from './hooks/useWorkflow'

function Navigation() {
  const location = useLocation()
  const { workflow, reset } = useWorkflow()

  // Determine which section we're in
  const isWorkflow = location.pathname.startsWith('/workflow')
  const isResults = location.pathname.startsWith('/results') && !location.pathname.startsWith('/workflow')

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-8 py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-blue-600">🏥 MONITOR</h1>
          {isResults && workflow.results && (
            <button
              onClick={() => {
                reset()
                window.location.href = '/workflow/input'
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium transition"
            >
              🔄 Start New Analysis
            </button>
          )}
        </div>

        {isWorkflow && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">📊 Workflow Progress:</p>
            <div className="flex gap-2">
              {workflow.allStages.map((stage, idx) => (
                <div
                  key={idx}
                  className={`flex-1 px-3 py-2 rounded text-center text-sm font-medium transition-colors ${
                    workflow.currentStage.stage === idx
                      ? 'bg-blue-600 text-white'
                      : stage.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : stage.status === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                  }`}
                  title={stage.stageName}
                >
                  {stage.progress > 0 && stage.progress < 100 && <span>{stage.progress}%</span>}
                  {stage.progress === 100 && <span>✅ {stage.stageName}</span>}
                  {stage.progress === 0 && <span>{idx + 1}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {isResults && (
          <div className="flex gap-8">
            <Link to="/results" className="text-gray-700 hover:text-blue-600 font-medium transition">
              Overview
            </Link>
            <Link to="/results/labs" className="text-gray-700 hover:text-blue-600 font-medium transition">
              Labs
            </Link>
            <Link to="/results/key" className="text-gray-700 hover:text-blue-600 font-medium transition">
              Key & Legend
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="w-full min-h-screen bg-gray-50">
        <Navigation />

        <Routes>
          {/* Workflow Pages */}
          <Route path="/workflow/input" element={<InputPage />} />
          <Route path="/workflow/preprocessing" element={<PreprocessingPage />} />
          <Route path="/workflow/analysis" element={<AnalysisPage />} />
          <Route path="/workflow/inference" element={<InferencePage />} />

          {/* Results Pages */}
          <Route path="/results" element={<OverviewPage />} />
          <Route path="/results/labs" element={<LabsPage />} />
          <Route path="/results/key" element={<KeyLegendPage />} />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/workflow/input" replace />} />
          <Route path="*" element={<Navigate to="/workflow/input" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
