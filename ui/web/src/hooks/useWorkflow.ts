import { useState, useCallback, useEffect } from 'react'

/**
 * COMPLETE WORKFLOW STATE MACHINE
 * Stages: 0 (input) -> 1 (preprocessing) -> 2 (analysis) -> 3 (inference) -> 4 (results)
 */

export interface WorkflowStage {
  stage: 0 | 1 | 2 | 3 | 4 // input, preprocessing, analysis, inference, results
  stageName: string
  progress: number // 0-100
  data: any
  status: 'idle' | 'loading' | 'success' | 'error'
  error?: string
}

export interface RawDataInput {
  filename: string
  uploadedAt: string
  fileSize: number
  dataPoints: number
  format: 'csv' | 'json' | 'xlsx'
  summary: {
    sensorTypes: string[]
    timeRange: string
    samplingRate: string
  }
}

export interface PreprocessingData {
  calibrationApplied: boolean
  artifactsRemoved: number
  normalizedRanges: Record<string, { min: number; max: number }>
  qualityScore: number // 0-100
  recordedValues: Record<string, any>
}

export interface AnalysisData {
  featuresExtracted: number
  patterns: {
    name: string
    significance: number
    recordedValue: any
  }[]
  anomaliesDetected: number
  recordedMetrics: Record<string, any>
}

export interface InferenceData {
  mode: 'legacy' | 'v2'
  runId: string
  executionTime: number // ms
  recordedOutputs: Record<string, any>
}

export interface WorkflowState {
  currentStage: WorkflowStage
  allStages: WorkflowStage[]
  rawData: RawDataInput | null
  preprocessingData: PreprocessingData | null
  analysisData: AnalysisData | null
  inferenceData: InferenceData | null
  results: any | null
}

const INITIAL_WORKFLOW_STATE: WorkflowState = {
  currentStage: {
    stage: 0,
    stageName: 'Input Raw Data',
    progress: 0,
    data: null,
    status: 'idle',
  },
  allStages: [
    { stage: 0, stageName: 'Input Raw Data', progress: 0, data: null, status: 'idle' },
    { stage: 1, stageName: 'Preprocessing', progress: 0, data: null, status: 'idle' },
    { stage: 2, stageName: 'Analysis', progress: 0, data: null, status: 'idle' },
    { stage: 3, stageName: 'Inference', progress: 0, data: null, status: 'idle' },
    { stage: 4, stageName: 'Results', progress: 0, data: null, status: 'idle' },
  ],
  rawData: null,
  preprocessingData: null,
  analysisData: null,
  inferenceData: null,
  results: null,
}

export function useWorkflow() {
  const [workflow, setWorkflow] = useState<WorkflowState>(() => {
    const saved = localStorage.getItem('workflowState')
    return saved ? JSON.parse(saved) : INITIAL_WORKFLOW_STATE
  })

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('workflowState', JSON.stringify(workflow))
  }, [workflow])

  const moveToStage = useCallback((stage: 0 | 1 | 2 | 3 | 4) => {
    setWorkflow(prev => ({
      ...prev,
      currentStage: prev.allStages[stage],
    }))
  }, [])

  const inputRawData = useCallback(async (file: File) => {
    setWorkflow(prev => ({
      ...prev,
      currentStage: { ...prev.currentStage, status: 'loading', progress: 10 },
    }))

    try {
      // Simulate file reading and summary
      const text = await file.text()
      const lines = text.split('\n')
      const dataPoints = lines.length - 1

      const rawData: RawDataInput = {
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        dataPoints,
        format: file.name.endsWith('.csv') ? 'csv' : file.name.endsWith('.json') ? 'json' : 'xlsx',
        summary: {
          sensorTypes: ['Heart Rate', 'Blood Oxygen', 'Temperature', 'Blood Pressure'],
          timeRange: '2024-01-28 08:00 - 18:00',
          samplingRate: '1Hz',
        },
      }

      setWorkflow(prev => ({
        ...prev,
        rawData,
        currentStage: { ...prev.currentStage, status: 'success', progress: 100, data: rawData },
      }))
    } catch (err) {
      setWorkflow(prev => ({
        ...prev,
        currentStage: { ...prev.currentStage, status: 'error', error: String(err) },
      }))
    }
  }, [])

  const runPreprocessing = useCallback(async () => {
    if (!workflow.rawData) return

    setWorkflow(prev => ({
      ...prev,
      allStages: prev.allStages.map(s => (s.stage === 1 ? { ...s, status: 'loading', progress: 20 } : s)),
    }))

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate processing

      const preprocessingData: PreprocessingData = {
        calibrationApplied: true,
        artifactsRemoved: 234,
        normalizedRanges: {
          'Heart Rate': { min: 60, max: 100 },
          'Blood Oxygen': { min: 95, max: 99 },
          'Temperature': { min: 36.5, max: 37.5 },
        },
        qualityScore: 94,
        recordedValues: {
          'Calibration Points Used': 12,
          'Signal-to-Noise Ratio': 18.5,
          'Missing Values Imputed': 3,
        },
      }

      setWorkflow(prev => ({
        ...prev,
        preprocessingData,
        allStages: prev.allStages.map(s => (s.stage === 1 ? { ...s, status: 'success', progress: 100, data: preprocessingData } : s)),
      }))
    } catch (err) {
      setWorkflow(prev => ({
        ...prev,
        allStages: prev.allStages.map(s => (s.stage === 1 ? { ...s, status: 'error', error: String(err) } : s)),
      }))
    }
  }, [workflow.rawData])

  const runAnalysis = useCallback(async () => {
    setWorkflow(prev => ({
      ...prev,
      allStages: prev.allStages.map(s => (s.stage === 2 ? { ...s, status: 'loading', progress: 30 } : s)),
    }))

    try {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate analysis

      const analysisData: AnalysisData = {
        featuresExtracted: 156,
        patterns: [
          { name: 'Heart Rate Variability', significance: 0.92, recordedValue: 45.3 },
          { name: 'Oxygen Saturation Trend', significance: 0.87, recordedValue: 98.2 },
          { name: 'Temperature Stability', significance: 0.79, recordedValue: 36.8 },
        ],
        anomaliesDetected: 2,
        recordedMetrics: {
          'Total Features': 156,
          'Significant Patterns': 47,
          'Correlation Strength': 0.84,
          'Anomaly Score': 0.15,
        },
      }

      setWorkflow(prev => ({
        ...prev,
        analysisData,
        allStages: prev.allStages.map(s => (s.stage === 2 ? { ...s, status: 'success', progress: 100, data: analysisData } : s)),
      }))
    } catch (err) {
      setWorkflow(prev => ({
        ...prev,
        allStages: prev.allStages.map(s => (s.stage === 2 ? { ...s, status: 'error', error: String(err) } : s)),
      }))
    }
  }, [])

  const runInference = useCallback(async (mode: 'legacy' | 'v2' = 'v2') => {
    setWorkflow(prev => ({
      ...prev,
      allStages: prev.allStages.map(s => (s.stage === 3 ? { ...s, status: 'loading', progress: 40 } : s)),
    }))

    try {
      await new Promise(resolve => setTimeout(resolve, 2500)) // Simulate inference

      const inferenceData: InferenceData = {
        mode,
        runId: `run_${Date.now()}`,
        executionTime: 2500,
        recordedOutputs: {
          'Model Version': mode === 'v2' ? 'v2.1.0' : 'legacy-1.0',
          'Execution Time': '2.5s',
          'Confidence Score': 0.88,
        },
      }

      // Mock results
      const results = {
        bundle_id: `bundle_${Date.now()}`,
        timestamp: new Date().toISOString(),
        mode,
        summary: {
          metabolic_state: { label: 'Anabolic', confidence: 0.87, drivers: ['Insulin', 'Amino acids'] },
          hydration: { label: 'Well-hydrated', confidence: 0.92, drivers: ['Sodium', 'Osmolarity'] },
          recovery: { label: 'Recovering', confidence: 0.78, drivers: ['HRV', 'Cortisol'] },
          inflammatory_tone: { label: 'Balanced', confidence: 0.81, drivers: ['CRP', 'IL-6'] },
          renal_stress: { label: 'Normal', confidence: 0.89, drivers: ['Creatinine', 'BUN'] },
        },
        panels: [
          {
            panel_name: 'CBC',
            produced_outputs: [
              { analyte: 'WBC', value: 7.2, unit: 'K/uL', confidence: 0.96, support_type: 'Direct' },
              { analyte: 'RBC', value: 4.8, unit: 'M/uL', confidence: 0.95, support_type: 'Direct' },
              { analyte: 'Hemoglobin', value: 14.5, unit: 'g/dL', confidence: 0.95, support_type: 'Direct' },
            ],
            suppressed_outputs: [],
          },
        ],
      }

      setWorkflow(prev => ({
        ...prev,
        inferenceData,
        results,
        allStages: prev.allStages.map(s => (s.stage === 3 ? { ...s, status: 'success', progress: 100, data: inferenceData } : s)),
      }))
    } catch (err) {
      setWorkflow(prev => ({
        ...prev,
        allStages: prev.allStages.map(s => (s.stage === 3 ? { ...s, status: 'error', error: String(err) } : s)),
      }))
    }
  }, [])

  const viewResults = useCallback(() => {
    if (workflow.results) {
      setWorkflow(prev => ({
        ...prev,
        currentStage: prev.allStages[4],
        allStages: prev.allStages.map(s => (s.stage === 4 ? { ...s, status: 'success', progress: 100, data: workflow.results } : s)),
      }))
    }
  }, [workflow.results])

  const reset = useCallback(() => {
    setWorkflow(INITIAL_WORKFLOW_STATE)
    localStorage.removeItem('workflowState')
  }, [])

  return {
    workflow,
    moveToStage,
    inputRawData,
    runPreprocessing,
    runAnalysis,
    runInference,
    viewResults,
    reset,
  }
}

// Toasts hook
export function useToasts() {
  const [toasts, setToasts] = useState<any[]>([])

  const addToast = useCallback((type: string, message: string, duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return { toasts, addToast }
}
