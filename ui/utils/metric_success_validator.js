/**
 * Metric Success Validator
 * 
 * Treats NULL as a bug when confidence > 0. Enforces success criteria
 * deterministically for every metric before UI card emission.
 * 
 * SUCCESS CRITERIA: At least one valid primary representation:
 * - (range_low && range_high) OR
 * - score_value OR
 * - (prob_low && prob_high) OR probability_value OR
 * - class_label OR
 * - trend_label
 * 
 * FAILURE: None of the above present
 * BUG: confidence > 0 AND failure
 */

export const REPRESENTATION_MODES = {
  RANGE: 'range',
  SCORE: 'score',
  PROBABILITY: 'probability',
  CLASSIFICATION: 'classification',
  TREND: 'trend',
  NONE: 'none'
};

/**
 * Validate metric success criteria
 * 
 * @param {Object} params
 * @param {string} params.submission_id
 * @param {string} params.a2_run_id
 * @param {string} params.metric_id
 * @param {number} params.confidence - Normalized 0..1
 * @param {Object} params.normalized_payload - Post-normalization, post-guardrails
 * @param {string} params.category - Template category
 * @param {string} params.metric_type - From metric_type_map
 * @returns {Object} Validation result
 */
export function validateMetricSuccess({
  submission_id,
  a2_run_id,
  metric_id,
  confidence,
  normalized_payload,
  category,
  metric_type
}) {
  // Normalize confidence (treat null as 0.0)
  const conf = confidence ?? 0.0;
  
  const result = {
    is_success: false,
    success_mode: REPRESENTATION_MODES.NONE,
    failure_reasons: [],
    bug: false,
    warnings: []
  };
  
  // Check each representation mode in priority order
  const modes = checkRepresentationModes(normalized_payload);
  
  // Select first available mode
  if (modes.range) {
    result.is_success = true;
    result.success_mode = REPRESENTATION_MODES.RANGE;
  } else if (modes.score) {
    result.is_success = true;
    result.success_mode = REPRESENTATION_MODES.SCORE;
  } else if (modes.probability) {
    result.is_success = true;
    result.success_mode = REPRESENTATION_MODES.PROBABILITY;
  } else if (modes.classification) {
    result.is_success = true;
    result.success_mode = REPRESENTATION_MODES.CLASSIFICATION;
  } else if (modes.trend) {
    result.is_success = true;
    result.success_mode = REPRESENTATION_MODES.TREND;
  }
  
  // Collect failure reasons
  if (!result.is_success) {
    result.failure_reasons.push('No valid primary representation found');
    
    if (!modes.range) result.failure_reasons.push('Missing or invalid range (range_low/range_high)');
    if (!modes.score) result.failure_reasons.push('Missing or invalid score (score_value)');
    if (!modes.probability) result.failure_reasons.push('Missing or invalid probability (prob_low/prob_high or probability_value)');
    if (!modes.classification) result.failure_reasons.push('Missing or invalid classification (class_label)');
    if (!modes.trend) result.failure_reasons.push('Missing or invalid trend (trend_label)');
  }
  
  // BUG DETECTION: confidence > 0 AND no representation
  if (conf > 0.0 && !result.is_success) {
    result.bug = true;
    result.warnings.push('BUG: confidence > 0 but no valid representation - this should never happen');
  }
  
  // Edge case: confidence == 0 and no representation -> not a bug, but should force fallback
  if (conf === 0.0 && !result.is_success) {
    result.warnings.push('Zero confidence with no representation - will force insufficient_fallback rendering');
  }
  
  return result;
}

/**
 * Check which representation modes are available in payload
 */
function checkRepresentationModes(payload) {
  return {
    range: hasValidRange(payload),
    score: hasValidScore(payload),
    probability: hasValidProbability(payload),
    classification: hasValidClassification(payload),
    trend: hasValidTrend(payload)
  };
}

/**
 * Check if payload has valid range representation
 */
function hasValidRange(payload) {
  const { range_low, range_high, value_range_low, value_range_high } = payload;
  
  // Check both possible field names (normalized vs raw)
  const low = range_low ?? value_range_low;
  const high = range_high ?? value_range_high;
  
  if (low == null || high == null) return false;
  if (typeof low !== 'number' || typeof high !== 'number') return false;
  if (low === high) return false; // Single point not a range
  if (low > high) return false; // Invalid ordering
  
  return true;
}

/**
 * Check if payload has valid score representation
 */
function hasValidScore(payload) {
  const { score_value, index_score, composite_score } = payload;
  
  // Check possible field names
  const score = score_value ?? index_score ?? composite_score;
  
  if (score == null) return false;
  if (typeof score !== 'number') return false;
  if (score < 0 || score > 100) return false;
  
  return true;
}

/**
 * Check if payload has valid probability representation
 */
function hasValidProbability(payload) {
  const { prob_low, prob_high, probability_value, probability } = payload;
  
  // Prefer range representation
  if (prob_low != null && prob_high != null) {
    if (typeof prob_low !== 'number' || typeof prob_high !== 'number') return false;
    if (prob_low < 0 || prob_high > 100) return false;
    if (prob_low > prob_high) return false;
    return true;
  }
  
  // Fallback to single probability
  const prob = probability_value ?? probability;
  if (prob == null) return false;
  if (typeof prob !== 'number') return false;
  if (prob < 0 || prob > 100) return false;
  
  return true;
}

/**
 * Check if payload has valid classification representation
 */
function hasValidClassification(payload) {
  const { class_label, classification, phenotype_label, pattern_label } = payload;
  
  // Check possible field names
  const label = class_label ?? classification ?? phenotype_label ?? pattern_label;
  
  if (!label) return false;
  if (typeof label !== 'string') return false;
  if (label.trim() === '') return false;
  
  // Forbidden labels
  const forbidden = ['null', 'n/a', 'unknown', 'error', 'undefined', 'none'];
  if (forbidden.includes(label.toLowerCase().trim())) return false;
  
  return true;
}

/**
 * Check if payload has valid trend representation
 */
function hasValidTrend(payload) {
  const { trend_label, trend, trajectory_label, trajectory } = payload;
  
  // Check possible field names
  const label = trend_label ?? trend ?? trajectory_label ?? trajectory;
  
  if (!label) return false;
  if (typeof label !== 'string') return false;
  if (label.trim() === '') return false;
  
  // Allowed trend patterns
  const allowed = ['improving', 'stable', 'worsening', 'insufficient_data'];
  const normalized = label.toLowerCase().trim();
  
  // Check if contains allowed pattern
  const hasAllowedPattern = allowed.some(pattern => normalized.includes(pattern));
  if (!hasAllowedPattern) return false;
  
  return true;
}

/**
 * Log validation failure in dev mode (runtime assertions)
 */
export function logValidationFailure(validationResult, context) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const logData = {
    timestamp: new Date().toISOString(),
    metric_id: context.metric_id,
    submission_id: context.submission_id,
    a2_run_id: context.a2_run_id,
    confidence: context.confidence,
    category: context.category,
    metric_type: context.metric_type,
    is_success: validationResult.is_success,
    success_mode: validationResult.success_mode,
    failure_reasons: validationResult.failure_reasons,
    bug: validationResult.bug,
    warnings: validationResult.warnings
  };
  
  if (validationResult.bug) {
    console.error('🐛 METRIC VALIDATION BUG:', logData);
  } else {
    console.warn('⚠️  Metric validation warning:', logData);
  }
  
  return logData;
}

/**
 * Force insufficient fallback rendering when validation fails
 * 
 * Returns a minimal valid payload that will render as exploratory card
 */
export function forceInsufficientFallback(metric_id, originalPayload, category) {
  return {
    ...originalPayload,
    _forced_fallback: true,
    _fallback_reason: 'validation_failure',
    render_mode: 'insufficient_fallback',
    
    // Ensure exploratory mode fields
    confidence_percent: Math.min(originalPayload.confidence_percent ?? 30, 30),
    confidence_band: '0-54.9%: Exploratory signal only',
    
    // Force what_to_measure_next
    what_to_measure_next: originalPayload.what_to_measure_next ?? 
      'Direct laboratory measurement would significantly improve estimate precision',
    
    // Force qualitative label if nothing else exists
    class_label: originalPayload.class_label ?? 
      `${metric_id.replace(/_/g, ' ')} - Insufficient data for precise estimate`,
    
    explainability_flags: [
      ...(originalPayload.explainability_flags ?? []),
      'FORCED_INSUFFICIENT_FALLBACK_RENDERING',
      'VALIDATION_FAILURE_DETECTED'
    ]
  };
}

/**
 * Validate all 35 metrics in a Part B payload
 * 
 * @param {Object} partBPayload - Full Part B output
 * @param {Object} a2Summary - A2 canonical summary
 * @returns {Object} Validation summary
 */
export function validateAllMetrics(partBPayload, a2Summary) {
  const results = [];
  const bugs = [];
  
  const metrics = partBPayload.outputs ?? partBPayload.metrics ?? [];
  
  metrics.forEach(metric => {
    const validation = validateMetricSuccess({
      submission_id: partBPayload.submission_id,
      a2_run_id: a2Summary?.a2_run_id,
      metric_id: metric.metric_id,
      confidence: metric.confidence ?? metric.confidence_percent / 100,
      normalized_payload: metric,
      category: metric.category,
      metric_type: metric.metric_type
    });
    
    results.push({
      metric_id: metric.metric_id,
      ...validation
    });
    
    if (validation.bug) {
      bugs.push({
        metric_id: metric.metric_id,
        validation
      });
    }
  });
  
  return {
    total_metrics: results.length,
    successful: results.filter(r => r.is_success).length,
    failed: results.filter(r => !r.is_success).length,
    bugs: bugs.length,
    results,
    bug_details: bugs,
    ci_should_fail: bugs.length > 0
  };
}
