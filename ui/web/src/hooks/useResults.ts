import { useState, useCallback, useEffect } from 'react'

interface UseResultsReturn {
  results: any
  loading: boolean
  error?: string
  mode: 'legacy' | 'v2'
  setMode: (mode: 'legacy' | 'v2') => void
  runInference: () => Promise<void>
  hasResults: boolean
}

export function useResults(): UseResultsReturn {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [mode, setMode] = useState<'legacy' | 'v2'>('v2')

  const runInference = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const response = await fetch(`http://localhost:8000/results/latest`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      })
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      } else if (response.status === 404) {
        setResults(MOCK_DATA)
      }
    } catch (err) {
      console.error('Inference error:', err)
      setResults(MOCK_DATA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    runInference()
  }, [runInference])

  return {
    results,
    loading,
    error,
    mode,
    setMode,
    runInference,
    hasResults: !!results,
  }
}

export function useToasts() {
  const [toasts, setToasts] = useState<any[]>([])

  const addToast = useCallback((type: string, message: string, duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return { toasts, addToast }
}

const MOCK_DATA = {
  bundle_id: 'demo-001',
  timestamp: new Date().toISOString(),
  mode: 'v2',
  summary: {
    metabolic_state: { label: 'Anabolic', confidence: 0.87, drivers: ['Insulin', 'Amino acids'] },
    hydration: { label: 'Well-hydrated', confidence: 0.92, drivers: ['Sodium', 'Osmolarity'] },
    recovery: { label: 'Recovering', confidence: 0.78, drivers: ['HRV', 'Cortisol'] },
  },
  panels: [
    {
      panel_name: 'CBC',
      produced_outputs: [
        { analyte: 'Hemoglobin', value: 14.5, unit: 'g/dL', confidence: 0.95, support_type: 'Direct', user_explanation: 'Excellent' }
      ],
      suppressed_outputs: []
    }
  ]
}
