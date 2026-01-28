/**
 * Inference API Service
 * 
 * Complete API layer handling:
 * 1. Authentication (login/signup)
 * 2. Raw data ingestion (sensor uploads)
 * 3. Data preprocessing & calibration
 * 4. Analysis pipeline
 * 5. Inference (v2 and legacy)
 * 6. Results retrieval & history
 */

const API_BASE = (import.meta as any).env.VITE_API_BASE || 'http://localhost:8000';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }
  try {
    return await response.json();
  } catch {
    return { status: 'success' };
  }
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const authApi = {
  /**
   * Register new user
   */
  async signup(email: string, password: string, name?: string) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await handleResponse(response);
    if (data.access_token) {
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('userId', data.user_id);
    }
    return data;
  },

  /**
   * Login user
   */
  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(response);
    if (data.access_token) {
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('userId', data.user_id);
    }
    return data;
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
  },
};

// ============================================================================
// RAW DATA INGESTION
// ============================================================================

export const dataApi = {
  /**
   * Ingest raw sensor data
   * @param runId - Unique run identifier
   * @param sensorType - Type of sensor (ISF, CGM, etc.)
   * @param rawData - Raw sensor readings as CSV or JSON
   */
  async ingestRawData(runId: string, sensorType: string, rawData: string | File) {
    const formData = new FormData();
    formData.append('run_id', runId);
    formData.append('sensor_type', sensorType);

    if (rawData instanceof File) {
      formData.append('file', rawData);
    } else {
      formData.append('data', rawData);
    }

    const response = await fetch(`${API_BASE}/data/ingest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      body: formData,
    });
    return handleResponse(response);
  },

  /**
   * Get ingested raw data for a run
   */
  async getRawData(runId: string) {
    const response = await fetch(`${API_BASE}/data/raw/${runId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * List all data runs for current user
   */
  async listRuns() {
    const response = await fetch(`${API_BASE}/data/runs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================================================
// PREPROCESSING & CALIBRATION
// ============================================================================

export const preprocessApi = {
  /**
   * Run preprocessing on raw data
   * Handles: noise filtering, outlier detection, interpolation
   */
  async preprocess(runId: string, options: any = {}) {
    const response = await fetch(`${API_BASE}/preprocess/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId, options }),
    });
    return handleResponse(response);
  },

  /**
   * Get preprocessing status and results
   */
  async getStatus(runId: string) {
    const response = await fetch(`${API_BASE}/preprocess/status/${runId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get calibration coefficients for a sensor
   */
  async getCalibration(runId: string) {
    const response = await fetch(`${API_BASE}/preprocess/calibration/${runId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Apply manual calibration
   */
  async applyCalibration(runId: string, calibrationData: any) {
    const response = await fetch(`${API_BASE}/preprocess/calibration/${runId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(calibrationData),
    });
    return handleResponse(response);
  },
};

// ============================================================================
// ANALYSIS & FEATURE EXTRACTION
// ============================================================================

export const analysisApi = {
  /**
   * Run analysis pipeline
   * Extracts features, detects patterns, calculates indices
   */
  async analyze(runId: string, options: any = {}) {
    const response = await fetch(`${API_BASE}/analysis/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId, options }),
    });
    return handleResponse(response);
  },

  /**
   * Get analysis results
   */
  async getResults(runId: string) {
    const response = await fetch(`${API_BASE}/analysis/results/${runId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get extracted features
   */
  async getFeatures(runId: string) {
    const response = await fetch(`${API_BASE}/analysis/features/${runId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get detected anomalies
   */
  async getAnomalies(runId: string) {
    const response = await fetch(`${API_BASE}/analysis/anomalies/${runId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================================================
// INFERENCE (V2 & LEGACY)
// ============================================================================

export const inferenceApi = {
  /**
   * Run inference v2 (recommended)
   * Full ML pipeline with uncertainty quantification
   */
  async runInferenceV2(runId: string) {
    const response = await fetch(`${API_BASE}/ai/inference/v2`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    });
    const data = await handleResponse(response);
    console.log('✅ Inference V2 complete:', data);
    return data;
  },

  /**
   * Run legacy inference
   * Backward compatible with older analysis
   */
  async runInferenceLegacy(runId: string) {
    const response = await fetch(`${API_BASE}/ai/inference`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId }),
    });
    const data = await handleResponse(response);
    console.log('✅ Legacy inference complete:', data);
    return data;
  },

  /**
   * Get inference status
   */
  async getStatus(runId: string) {
    const response = await fetch(`${API_BASE}/ai/inference/status/${runId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get model metadata
   */
  async getModelInfo() {
    const response = await fetch(`${API_BASE}/ai/model/info`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================================================
// RESULTS & HISTORY
// ============================================================================

export const resultsApi = {
  /**
   * Get latest results bundle
   */
  async fetchLatestResults() {
    const response = await fetch(`${API_BASE}/results/latest`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get specific result bundle
   */
  async fetchResultDetails(bundleId: string) {
    const response = await fetch(`${API_BASE}/results/${bundleId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get results history
   */
  async fetchResultsHistory(limit: number = 50) {
    const response = await fetch(`${API_BASE}/results/history?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Export results as PDF
   */
  async exportPDF(bundleId: string) {
    const response = await fetch(`${API_BASE}/results/${bundleId}/export/pdf`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('PDF export failed');
    return response.blob();
  },

  /**
   * Export results as JSON
   */
  async exportJSON(bundleId: string) {
    const response = await fetch(`${API_BASE}/results/${bundleId}/export/json`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// ============================================================================
// FORECASTING (Optional)
// ============================================================================

export const forecastApi = {
  /**
   * Generate forecast for biomarker
   */
  async generateForecast(runId: string, biomarker: string, days: number = 7) {
    const response = await fetch(`${API_BASE}/forecast/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ run_id: runId, biomarker, days }),
    });
    return handleResponse(response);
  },

  /**
   * Get forecast results
   */
  async getForecast(runId: string, biomarker: string) {
    const response = await fetch(`${API_BASE}/forecast/${runId}/${biomarker}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};
