import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ResultsLayout, getResultsRoutes } from './pages/results';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/results/*" element={<ResultsLayout />} />
        <Route path="/" element={<Navigate to="/results" />} />
      </Routes>
    </Router>
  );
}

export default App;
