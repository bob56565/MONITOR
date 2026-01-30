/**
 * Metric Type Resolver
 * 
 * Resolves metric_type and render_mode deterministically before template selection.
 * Implements strict priority order from render_priority_rules.json.
 * 
 * Primary source of truth: metric_type_map.json
 * Fallback: Infer from payload fields and dependency/provenance maps
 */

import metricTypeMap from '../rules/metric_type_map.json';
import renderPriorityRules from '../rules/render_priority_rules.json';

export const METRIC_TYPES = {
  LAB_PROXY_RANGE: 'LAB_PROXY_RANGE',
  INDEX_SCORE: 'INDEX_SCORE',
  PROBABILITY: 'PROBABILITY',
  CLASSIFICATION: 'CLASSIFICATION',
  TREND: 'TREND',
  INSUFFICIENT_DATA_FALLBACK: 'INSUFFICIENT_DATA_FALLBACK'
};

export const RENDER_MODES = {
  RANGE: 'range',
  SCORE: 'score',
  PROBABILITY: 'probability',
  CLASSIFICATION: 'classification',
  TREND: 'trend',
  INSUFFICIENT_FALLBACK: 'insufficient_fallback'
};

/**
 * Resolve metric type and render mode
 * 
 * @param {Object} params
 * @param {string} params.metric_id
 * @param {Object} params.payload - Normalized metric payload
 * @param {string} params.dependency_type - From dependency_map
 * @param {string} params.provenance_label - From provenance_map
 * @returns {Object} Resolution result
 */
export function resolveMetricTypeAndMode({
  metric_id,
  payload,
  dependency_type,
  provenance_label
}) {
  const result = {
    resolved_metric_type: null,
    resolved_render_mode: RENDER_MODES.INSUFFICIENT_FALLBACK,
    template_category_selected: null,
    warnings: [],
    resolution_path: []
  };
  
  // Step 1: Load metric_type from metric_type_map.json (PRIMARY SOURCE OF TRUTH)
  const metricTypeEntry = metricTypeMap.metrics.find(m => m.metric_id === metric_id);
  
  if (!metricTypeEntry) {
    result.warnings.push(`CRITICAL: metric_id '${metric_id}' not found in metric_type_map.json - this should fail build`);
    // Hard fail in production - this should never happen
    throw new Error(`metric_type_map.json missing entry for metric_id: ${metric_id}`);
  }
  
  result.resolved_metric_type = metricTypeEntry.metric_type;
  result.template_category_selected = metricTypeEntry.default_category;
  result.resolution_path.push(`metric_type_map: ${metricTypeEntry.metric_type}`);
  
  // Step 2: Inspect payload for available fields
  const availableFields = inspectPayloadFields(payload);
  result.resolution_path.push(`available_fields: ${availableFields.join(', ')}`);
  
  // Step 3: Apply render priority order
  const priorityOrder = renderPriorityRules.priority_order;
  
  for (const priorityLevel of priorityOrder) {
    const matches = checkPriorityMatch(priorityLevel, {
      metric_type: result.resolved_metric_type,
      available_fields: availableFields,
      payload
    });
    
    if (matches) {
      result.resolved_render_mode = priorityLevel.mode;
      result.template_category_selected = priorityLevel.template_category;
      result.resolution_path.push(`priority_${priorityLevel.priority}: matched ${priorityLevel.mode}`);
      
      // Validate success criteria
      const criteriaValid = validateSuccessCriteria(priorityLevel, payload);
      if (!criteriaValid) {
        result.warnings.push(`Priority ${priorityLevel.priority} matched but success_criteria failed - trying next`);
        continue; // Try next priority
      }
      
      break; // Found valid match
    }
  }
  
  // Step 4: Conflict detection
  if (hasMultipleRepresentations(availableFields)) {
    result.warnings.push(`Multiple representations available - following priority order: ${result.resolved_render_mode} selected`);
  }
  
  return result;
}

/**
 * Inspect payload to determine available field types
 */
function inspectPayloadFields(payload) {
  const fields = [];
  
  // Check range fields
  if (hasRangeFields(payload)) fields.push('range');
  
  // Check score fields
  if (hasScoreFields(payload)) fields.push('score');
  
  // Check probability fields
  if (hasProbabilityFields(payload)) fields.push('probability');
  
  // Check classification fields
  if (hasClassificationFields(payload)) fields.push('classification');
  
  // Check trend fields
  if (hasTrendFields(payload)) fields.push('trend');
  
  return fields;
}

/**
 * Check if payload has range fields
 */
function hasRangeFields(payload) {
  const { range_low, range_high, value_range_low, value_range_high } = payload;
  return (range_low != null && range_high != null) || 
         (value_range_low != null && value_range_high != null);
}

/**
 * Check if payload has score fields
 */
function hasScoreFields(payload) {
  const { score_value, index_score, composite_score } = payload;
  return score_value != null || index_score != null || composite_score != null;
}

/**
 * Check if payload has probability fields
 */
function hasProbabilityFields(payload) {
  const { prob_low, prob_high, probability_value, probability } = payload;
  return (prob_low != null && prob_high != null) || 
         probability_value != null || 
         probability != null;
}

/**
 * Check if payload has classification fields
 */
function hasClassificationFields(payload) {
  const { class_label, classification, phenotype_label, pattern_label } = payload;
  return class_label != null || classification != null || 
         phenotype_label != null || pattern_label != null;
}

/**
 * Check if payload has trend fields
 */
function hasTrendFields(payload) {
  const { trend_label, trend, trajectory_label, trajectory } = payload;
  return trend_label != null || trend != null || 
         trajectory_label != null || trajectory != null;
}

/**
 * Check if priority level matches current metric state
 */
function checkPriorityMatch(priorityLevel, context) {
  const { metric_type, available_fields, payload } = context;
  const when = priorityLevel.when;
  
  // Check metric_type match
  if (when.or_metric_type && metric_type === when.or_metric_type) {
    return true;
  }
  
  // Check field requirements
  if (when.fields_required) {
    const allFieldsPresent = when.fields_required.every(field => {
      return payload[field] != null;
    });
    if (allFieldsPresent) return true;
  }
  
  // Check single probability fallback
  if (when.or_single_probability && payload[when.or_single_probability] != null) {
    return true;
  }
  
  // Check condition (for insufficient_fallback)
  if (when.condition === 'none of the above modes satisfied') {
    // This always matches as last resort
    return true;
  }
  
  return false;
}

/**
 * Validate success criteria for selected priority level
 */
function validateSuccessCriteria(priorityLevel, payload) {
  const criteria = priorityLevel.success_criteria;
  
  if (!criteria) return true; // No criteria = always valid
  
  // Parse criteria string (simple eval - in production use proper parser)
  try {
    // Create a safe evaluation context
    const context = {
      range_low: payload.range_low ?? payload.value_range_low,
      range_high: payload.range_high ?? payload.value_range_high,
      score_value: payload.score_value ?? payload.index_score,
      prob_low: payload.prob_low,
      prob_high: payload.prob_high,
      probability_value: payload.probability_value ?? payload.probability,
      class_label: payload.class_label ?? payload.classification,
      trend_label: payload.trend_label ?? payload.trend
    };
    
    // Simple validation logic (expand as needed)
    if (criteria.includes('range_low') && criteria.includes('range_high')) {
      return context.range_low != null && context.range_high != null && 
             context.range_low !== context.range_high;
    }
    
    if (criteria.includes('score_value')) {
      return context.score_value != null && 
             context.score_value >= 0 && context.score_value <= 100;
    }
    
    if (criteria.includes('prob_low') && criteria.includes('prob_high')) {
      return context.prob_low != null && context.prob_high != null;
    }
    
    if (criteria.includes('probability_value')) {
      return context.probability_value != null;
    }
    
    if (criteria.includes('class_label')) {
      return context.class_label != null && context.class_label !== '';
    }
    
    if (criteria.includes('trend_label')) {
      return context.trend_label != null && context.trend_label !== '';
    }
    
    // Default: assume valid
    return true;
    
  } catch (err) {
    console.warn('Error validating success_criteria:', err);
    return false;
  }
}

/**
 * Check if multiple representations available (conflict detection)
 */
function hasMultipleRepresentations(availableFields) {
  return availableFields.length > 1;
}

/**
 * Get metric type from map (without full resolution)
 */
export function getMetricType(metric_id) {
  const entry = metricTypeMap.metrics.find(m => m.metric_id === metric_id);
  if (!entry) {
    throw new Error(`metric_type_map.json missing entry for metric_id: ${metric_id}`);
  }
  return entry.metric_type;
}

/**
 * Get default category from map
 */
export function getDefaultCategory(metric_id) {
  const entry = metricTypeMap.metrics.find(m => m.metric_id === metric_id);
  if (!entry) {
    throw new Error(`metric_type_map.json missing entry for metric_id: ${metric_id}`);
  }
  return entry.default_category;
}

/**
 * Resolve render mode for single-probability fallback
 * 
 * If only probability_value exists (no prob_low/prob_high), compute band:
 * [probability_value - 5, probability_value + 5] capped at [0, 100]
 */
export function resolveProbabilityBand(probability_value) {
  if (probability_value == null) return null;
  
  const low = Math.max(0, probability_value - 5);
  const high = Math.min(100, probability_value + 5);
  
  return {
    prob_low: low,
    prob_high: high,
    _computed_from_single_probability: true
  };
}

/**
 * Get score band label for index scores
 */
export function getScoreBand(score_value) {
  if (score_value == null) return 'Unknown';
  
  if (score_value >= 0 && score_value <= 24) return 'Low';
  if (score_value >= 25 && score_value <= 49) return 'Moderate-Low';
  if (score_value >= 50 && score_value <= 74) return 'Moderate-High';
  if (score_value >= 75 && score_value <= 100) return 'High';
  
  return 'Out of Range';
}

/**
 * Validate metric_type_map completeness (build-time check)
 */
export function validateMetricTypeMapCompleteness(canonicalMetricIds) {
  const mapMetricIds = metricTypeMap.metrics.map(m => m.metric_id);
  
  if (mapMetricIds.length !== 35) {
    throw new Error(`metric_type_map.json must have exactly 35 entries, found ${mapMetricIds.length}`);
  }
  
  const missing = canonicalMetricIds.filter(id => !mapMetricIds.includes(id));
  const extra = mapMetricIds.filter(id => !canonicalMetricIds.includes(id));
  
  if (missing.length > 0) {
    throw new Error(`metric_type_map.json missing metric_ids: ${missing.join(', ')}`);
  }
  
  if (extra.length > 0) {
    throw new Error(`metric_type_map.json has unknown metric_ids: ${extra.join(', ')}`);
  }
  
  return true;
}
