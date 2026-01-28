import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { OverviewPage, LabsPage, KeyLegendPage } from './pages/results'

export default function App() {
  const [mode, setMode] = useState<'legacy' | 'v2'>('v2')

  return (
    <BrowserRouter>
      <div className="w-full min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">🏥 MONITOR</h1>
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
          </div>
        </nav>

        <Routes>
          <Route path="/results" element={<OverviewPage mode={mode} onModeChange={setMode} />} />
          <Route path="/results/labs" element={<LabsPage />} />
          <Route path="/results/key" element={<KeyLegendPage />} />
          <Route path="/" element={<Navigate to="/results" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
