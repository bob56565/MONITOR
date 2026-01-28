/**
 * Type definitions for Inference Results Bundle
 * 
 * Matches backend API contract for both legacy and v2 inference modes.
 * Handles partial/missing fields gracefully with sensible fallbacks.
 */

// ============================================================================
// SUPPORT TYPES
// ============================================================================

export type SupportType = 'Direct' | 'Derived' | 'Proxy' | 'Relational' | 'Population-based';

export type SuppressionReason = 
  | 'MissingAnchors' 
  | 'LowCoherence' 
  | 'Interference' 
  | 'InsufficientSignal' 
  | 'OutOfScope' 
  | 'SafetyFilter' 
  | 'Other';

export type InferenceMode = 'legacy' | 'v2';

export type CoherenceStatus = 'High' | 'Medium' | 'Low';

// ============================================================================
// PHYSIOLOGICAL STATES
// ============================================================================

export interface PhysiologicalState {
  label: string;
  confidence: number; // 0-1
  drivers: string[];
  notes?: string;
}

export interface PhysiologicalSummary {
  metabolic_state?: PhysiologicalState;
  hydration_status?: PhysiologicalState;
  stress_recovery?: PhysiologicalState;
  inflammatory_tone?: PhysiologicalState;
  renal_stress?: PhysiologicalState;
}

// ============================================================================
// LAB ANALYTES & PANELS
// ============================================================================

export interface ReferenceRange {
  low?: number;
  high?: number;
  text?: string;
}

export interface RangeEstimate {
  low?: number;
  high?: number;
}

export interface EvidenceData {
  specimen_sources: string[];
  signals_used: string[];
  coherence?: {
    status: CoherenceStatus;
    notes?: string;
  };
  disagreement?: {
    present: boolean;
    notes?: string;
  };
  interference_flags?: string[];
}

export interface ProducedOutput {
  analyte: string;
  value: number | string;
  unit?: string;
  reference_range?: ReferenceRange;
  confidence: number; // 0-1
  range_estimate?: RangeEstimate;
  support_type: SupportType;
  user_explanation: string;
  clinical_notes?: string;
  evidence?: EvidenceData;
}

export interface SuppressedOutput {
  analyte: string;
  suppression_reason: SuppressionReason;
  plain_english_reason: string;
  details?: {
    failed_dependencies?: string[];
    interference_flags?: string[];
    notes?: string;
  };
}

export interface PanelData {
  panel_name: string;
  produced_outputs: ProducedOutput[];
  suppressed_outputs: SuppressedOutput[];
}

// ============================================================================
// RESULT BUNDLE
// ============================================================================

export interface ResultBundle {
  bundle_id: string;
  timestamp: string; // ISO-8601
  mode: InferenceMode;
  summary: PhysiologicalSummary;
  panels: PanelData[];
  disclaimers: string[];
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface InferenceRequest {
  run_id: string;
}

export interface InferenceResponse {
  run_id: string;
  inference_pack_v2: any; // Backend response; we transform to ResultBundle
  created_at: string;
}

export interface HistoryItem {
  bundle_id: string;
  timestamp: string;
  mode: InferenceMode;
  summary_snippet: string; // Short summary for list
}

export interface HistoryResponse {
  items: HistoryItem[];
  total_count: number;
}

// ============================================================================
// UI STATE
// ============================================================================

export interface RequestState {
  loading: boolean;
  error?: string;
  data?: ResultBundle;
  lastFetch?: string;
}

export interface FiltersState {
  show_produced: boolean;
  show_suppressed: boolean;
  low_confidence_only: boolean;
  interference_flagged_only: boolean;
  support_type_filter?: SupportType[];
  search_query?: string;
}
