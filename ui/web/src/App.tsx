import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OverviewPage, LabsPage, KeyLegendPage } from './pages/results';

export default function App() {
  return (
    <BrowserRouter>
      <div className="w-full min-h-screen bg-gray-50">
        <Routes>
          <Route path="/results" element={<OverviewPage mode="v2" onModeChange={() => {}} />} />
          <Route path="/results/labs" element={<LabsPage />} />
          <Route path="/results/key" element={<KeyLegendPage />} />
          <Route path="/" element={<Navigate to="/results" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
