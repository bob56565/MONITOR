/**
 * Unit Tests for metric_success_validator.js
 * 
 * Test NULL-as-bug enforcement logic
 */

import {
  validateMetricSuccess,
  checkRepresentationModes,
  hasValidRange,
  hasValidScore,
  hasValidProbability,
  hasValidClassification,
  hasValidTrend,
  validateAllMetrics
} from '../utils/metric_success_validator.js';

describe('Metric Success Validator', () => {
  
  describe('hasValidRange', () => {
    test('returns true for valid range', () => {
      const payload = {
        range_low: 4.0,
        range_high: 6.0,
        unit: '%'
      };
      expect(hasValidRange(payload)).toBe(true);
    });
    
    test('returns false when range values are identical', () => {
      const payload = {
        range_low: 5.0,
        range_high: 5.0
      };
      expect(hasValidRange(payload)).toBe(false);
    });
    
    test('returns false when range values missing', () => {
      const payload = {
        range_low: null,
        range_high: null
      };
      expect(hasValidRange(payload)).toBe(false);
    });
    
    test('returns false when only one range value present', () => {
      const payload = {
        range_low: 4.0,
        range_high: null
      };
      expect(hasValidRange(payload)).toBe(false);
    });
  });
  
  describe('hasValidScore', () => {
    test('returns true for valid score', () => {
      const payload = {
        score_value: 75,
        score_band: 'High'
      };
      expect(hasValidScore(payload)).toBe(true);
    });
    
    test('returns false for score out of range', () => {
      const payload = {
        score_value: 150
      };
      expect(hasValidScore(payload)).toBe(false);
    });
    
    test('returns false for null score', () => {
      const payload = {
        score_value: null
      };
      expect(hasValidScore(payload)).toBe(false);
    });
  });
  
  describe('hasValidProbability', () => {
    test('returns true for valid probability range', () => {
      const payload = {
        prob_low: 15,
        prob_high: 35
      };
      expect(hasValidProbability(payload)).toBe(true);
    });
    
    test('returns true for valid single probability', () => {
      const payload = {
        probability_value: 25
      };
      expect(hasValidProbability(payload)).toBe(true);
    });
    
    test('returns false for identical prob values', () => {
      const payload = {
        prob_low: 25,
        prob_high: 25
      };
      expect(hasValidProbability(payload)).toBe(false);
    });
  });
  
  describe('hasValidClassification', () => {
    test('returns true for valid classification', () => {
      const payload = {
        class_label: 'Prediabetic Range'
      };
      expect(hasValidClassification(payload)).toBe(true);
    });
    
    test('returns false for forbidden label', () => {
      const payload = {
        class_label: 'null'
      };
      expect(hasValidClassification(payload)).toBe(false);
    });
    
    test('returns false for empty classification', () => {
      const payload = {
        class_label: ''
      };
      expect(hasValidClassification(payload)).toBe(false);
    });
  });
  
  describe('hasValidTrend', () => {
    test('returns true for valid trend', () => {
      const payload = {
        trend_label: 'improving'
      };
      expect(hasValidTrend(payload)).toBe(true);
    });
    
    test('returns true for insufficient_data', () => {
      const payload = {
        trend_label: 'insufficient_data'
      };
      expect(hasValidTrend(payload)).toBe(true);
    });
    
    test('returns false for forbidden label', () => {
      const payload = {
        trend_label: 'N/A'
      };
      expect(hasValidTrend(payload)).toBe(false);
    });
  });
  
  describe('checkRepresentationModes', () => {
    test('identifies all available modes', () => {
      const payload = {
        range_low: 4.0,
        range_high: 6.0,
        score_value: 75,
        prob_low: 15,
        prob_high: 35,
        class_label: 'Prediabetic',
        trend_label: 'improving'
      };
      
      const modes = checkRepresentationModes(payload);
      
      expect(modes.hasValidRange).toBe(true);
      expect(modes.hasValidScore).toBe(true);
      expect(modes.hasValidProbability).toBe(true);
      expect(modes.hasValidClassification).toBe(true);
      expect(modes.hasValidTrend).toBe(true);
    });
    
    test('identifies no modes when all invalid', () => {
      const payload = {
        range_low: null,
        score_value: null,
        class_label: 'null'
      };
      
      const modes = checkRepresentationModes(payload);
      
      expect(modes.hasValidRange).toBe(false);
      expect(modes.hasValidScore).toBe(false);
      expect(modes.hasValidProbability).toBe(false);
      expect(modes.hasValidClassification).toBe(false);
      expect(modes.hasValidTrend).toBe(false);
    });
  });
  
  describe('validateMetricSuccess - SUCCESS cases', () => {
    test('succeeds with valid range', () => {
      const result = validateMetricSuccess({
        metric_id: 'estimated_hba1c_range',
        payload: {
          range_low: 4.0,
          range_high: 6.0
        },
        confidence: 0.85
      });
      
      expect(result.success_mode).toBe('range');
      expect(result.is_bug).toBe(false);
      expect(result.force_insufficient_fallback).toBe(false);
    });
    
    test('succeeds with valid score', () => {
      const result = validateMetricSuccess({
        metric_id: 'metabolic_syndrome_severity',
        payload: {
          score_value: 75
        },
        confidence: 0.90
      });
      
      expect(result.success_mode).toBe('score');
      expect(result.is_bug).toBe(false);
    });
    
    test('succeeds with valid classification', () => {
      const result = validateMetricSuccess({
        metric_id: 'diabetes_phenotype',
        payload: {
          class_label: 'Type 2'
        },
        confidence: 0.80
      });
      
      expect(result.success_mode).toBe('classification');
      expect(result.is_bug).toBe(false);
    });
  });
  
  describe('validateMetricSuccess - FAILURE cases (NULL-as-bug)', () => {
    test('flags BUG when confidence > 0 and no representation', () => {
      const result = validateMetricSuccess({
        metric_id: 'estimated_hba1c_range',
        payload: {
          range_low: null,
          range_high: null,
          score_value: null,
          class_label: null
        },
        confidence: 0.75  // BUG: confidence > 0 but no representation
      });
      
      expect(result.success_mode).toBe('none');
      expect(result.is_bug).toBe(true);
      expect(result.force_insufficient_fallback).toBe(true);
    });
    
    test('does NOT flag bug when confidence = 0 and no representation', () => {
      const result = validateMetricSuccess({
        metric_id: 'estimated_hba1c_range',
        payload: {
          range_low: null,
          range_high: null
        },
        confidence: 0.0  // OK: insufficient_data expected
      });
      
      expect(result.success_mode).toBe('none');
      expect(result.is_bug).toBe(false);  // NOT a bug when confidence = 0
      expect(result.force_insufficient_fallback).toBe(true);  // Still force fallback
    });
    
    test('flags BUG with minimal confidence and no representation', () => {
      const result = validateMetricSuccess({
        metric_id: 'metabolic_syndrome_severity',
        payload: {
          score_value: null
        },
        confidence: 0.01  // BUG: any confidence > 0 requires representation
      });
      
      expect(result.is_bug).toBe(true);
    });
  });
  
  describe('validateAllMetrics - Full Part B payload', () => {
    test('succeeds when all 35 metrics valid', () => {
      // Simulate full Part B response with all 35 metrics
      const partBPayload = {
        specimen_id: 'SPEC123',
        metrics: [
          // LAB_PROXY_RANGE metrics
          {
            metric_id: 'estimated_hba1c_range',
            payload: { range_low: 4.0, range_high: 6.0 },
            confidence: 0.85
          },
          {
            metric_id: 'estimated_glucose_range',
            payload: { range_low: 70, range_high: 100 },
            confidence: 0.88
          },
          // INDEX_SCORE metrics
          {
            metric_id: 'metabolic_syndrome_severity',
            payload: { score_value: 75 },
            confidence: 0.90
          },
          {
            metric_id: 'insulin_resistance_index',
            payload: { score_value: 60 },
            confidence: 0.82
          },
          // CLASSIFICATION metrics
          {
            metric_id: 'diabetes_phenotype',
            payload: { class_label: 'Type 2' },
            confidence: 0.80
          },
          // ... (28 more metrics for full 35)
        ]
      };
      
      const result = validateAllMetrics(partBPayload);
      
      expect(result.all_valid).toBe(true);
      expect(result.bug_count).toBe(0);
    });
    
    test('fails when any metric has NULL-as-bug violation', () => {
      const partBPayload = {
        specimen_id: 'SPEC123',
        metrics: [
          {
            metric_id: 'estimated_hba1c_range',
            payload: { range_low: 4.0, range_high: 6.0 },
            confidence: 0.85
          },
          {
            metric_id: 'metabolic_syndrome_severity',
            payload: { score_value: null },  // BUG
            confidence: 0.75  // confidence > 0 but no representation
          }
        ]
      };
      
      const result = validateAllMetrics(partBPayload);
      
      expect(result.all_valid).toBe(false);
      expect(result.bug_count).toBe(1);
      expect(result.bugs[0].metric_id).toBe('metabolic_syndrome_severity');
    });
  });
  
  describe('Edge cases', () => {
    test('handles missing confidence field (defaults to 1.0)', () => {
      const result = validateMetricSuccess({
        metric_id: 'estimated_hba1c_range',
        payload: {
          range_low: null,
          range_high: null
        }
        // confidence missing - should default to 1.0
      });
      
      expect(result.is_bug).toBe(true);  // Missing confidence treated as 1.0
    });
    
    test('handles forbidden labels correctly', () => {
      const forbiddenLabels = ['null', 'N/A', 'unknown', 'error', 'NULL'];
      
      forbiddenLabels.forEach(label => {
        const result = validateMetricSuccess({
          metric_id: 'diabetes_phenotype',
          payload: {
            class_label: label
          },
          confidence: 0.80
        });
        
        expect(result.success_mode).toBe('none');
        expect(result.is_bug).toBe(true);
      });
    });
    
    test('validates score band boundaries', () => {
      const validScores = [0, 25, 50, 75, 100];
      
      validScores.forEach(score => {
        const payload = { score_value: score };
        expect(hasValidScore(payload)).toBe(true);
      });
      
      const invalidScores = [-1, 101, 150];
      
      invalidScores.forEach(score => {
        const payload = { score_value: score };
        expect(hasValidScore(payload)).toBe(false);
      });
    });
  });
});
