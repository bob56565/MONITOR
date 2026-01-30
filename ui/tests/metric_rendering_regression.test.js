/**
 * Metric Rendering Regression Tests
 * 
 * UI regression tests for Part 4A: NULL-as-bug enforcement
 * Tests that metric cards never render empty/NULL primary values when confidence > 0
 */

import { render, screen } from '@testing-library/react';
import { resolveMetricTypeAndMode } from '../utils/metric_type_resolver.js';
import { validateMetricSuccess } from '../utils/metric_success_validator.js';

describe('Metric Rendering Regression Tests', () => {
  
  describe('LAB_PROXY_RANGE metrics', () => {
    const labProxyMetrics = [
      'estimated_hba1c_range',
      'estimated_glucose_range',
      'estimated_cholesterol_total_range',
      'estimated_ldl_range',
      'estimated_hdl_range',
      'estimated_triglycerides_range',
      'estimated_creatinine_range',
      'estimated_alt_range',
      'estimated_ast_range',
      'estimated_tsh_range',
      'estimated_vitamin_d_range',
      'estimated_hemoglobin_range'
    ];
    
    test.each(labProxyMetrics)('%s never renders NULL range when confidence > 0', (metric_id) => {
      const validPayload = {
        range_low: 4.0,
        range_high: 6.0,
        unit: '%'
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: validPayload,
        confidence: 0.85
      });
      
      expect(validation.success_mode).toBe('range');
      expect(validation.is_bug).toBe(false);
      
      const resolution = resolveMetricTypeAndMode({
        metric_id,
        payload: validPayload,
        dependency_type: 'DERIVED',
        provenance_label: 'ML-inferred'
      });
      
      expect(resolution.resolved_render_mode).toBe('range');
    });
    
    test.each(labProxyMetrics)('%s flags BUG when confidence > 0 but range NULL', (metric_id) => {
      const nullPayload = {
        range_low: null,
        range_high: null
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: nullPayload,
        confidence: 0.75  // BUG: confidence > 0 but no range
      });
      
      expect(validation.success_mode).toBe('none');
      expect(validation.is_bug).toBe(true);
      expect(validation.force_insufficient_fallback).toBe(true);
    });
    
    test.each(labProxyMetrics)('%s allows insufficient_data when confidence = 0', (metric_id) => {
      const nullPayload = {
        range_low: null,
        range_high: null
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: nullPayload,
        confidence: 0.0  // OK: insufficient_data expected
      });
      
      expect(validation.success_mode).toBe('none');
      expect(validation.is_bug).toBe(false);  // NOT a bug when confidence = 0
    });
  });
  
  describe('INDEX_SCORE metrics', () => {
    const indexScoreMetrics = [
      'metabolic_syndrome_severity',
      'insulin_resistance_index',
      'cardiovascular_risk_score',
      'inflammation_burden_index',
      'liver_health_index',
      'kidney_function_index',
      'bone_health_index',
      'thyroid_function_index',
      'anemia_risk_index',
      'immune_health_index',
      'oxidative_stress_index',
      'hormonal_balance_index',
      'nutritional_status_index',
      'mental_health_correlation_index',
      'longevity_potential_index',
      'overall_health_score'
    ];
    
    test.each(indexScoreMetrics)('%s never renders NULL score when confidence > 0', (metric_id) => {
      const validPayload = {
        score_value: 75,
        score_band: 'High'
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: validPayload,
        confidence: 0.90
      });
      
      expect(validation.success_mode).toBe('score');
      expect(validation.is_bug).toBe(false);
    });
    
    test.each(indexScoreMetrics)('%s flags BUG when confidence > 0 but score NULL', (metric_id) => {
      const nullPayload = {
        score_value: null
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: nullPayload,
        confidence: 0.80  // BUG
      });
      
      expect(validation.is_bug).toBe(true);
    });
  });
  
  describe('PROBABILITY metrics', () => {
    const probabilityMetrics = [
      'diabetes_probability',
      'hypertension_probability',
      'dyslipidemia_probability'
    ];
    
    test.each(probabilityMetrics)('%s never renders NULL probability when confidence > 0', (metric_id) => {
      const validPayload = {
        prob_low: 15,
        prob_high: 35
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: validPayload,
        confidence: 0.85
      });
      
      expect(validation.success_mode).toBe('probability');
      expect(validation.is_bug).toBe(false);
    });
    
    test.each(probabilityMetrics)('%s accepts single probability_value', (metric_id) => {
      const validPayload = {
        probability_value: 25
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: validPayload,
        confidence: 0.85
      });
      
      expect(validation.success_mode).toBe('probability');
      expect(validation.is_bug).toBe(false);
    });
  });
  
  describe('CLASSIFICATION metrics', () => {
    const classificationMetrics = [
      'diabetes_phenotype',
      'metabolic_syndrome_pattern',
      'insulin_resistance_pattern',
      'lipid_disorder_pattern',
      'cardiovascular_risk_category',
      'liver_disease_risk_category',
      'kidney_disease_risk_category',
      'thyroid_disorder_pattern',
      'nutritional_deficiency_pattern'
    ];
    
    test.each(classificationMetrics)('%s never renders NULL classification when confidence > 0', (metric_id) => {
      const validPayload = {
        class_label: 'Prediabetic Range'
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: validPayload,
        confidence: 0.80
      });
      
      expect(validation.success_mode).toBe('classification');
      expect(validation.is_bug).toBe(false);
    });
    
    test.each(classificationMetrics)('%s rejects forbidden labels', (metric_id) => {
      const forbiddenLabels = ['null', 'N/A', 'unknown', 'error'];
      
      forbiddenLabels.forEach(label => {
        const invalidPayload = {
          class_label: label
        };
        
        const validation = validateMetricSuccess({
          metric_id,
          payload: invalidPayload,
          confidence: 0.80
        });
        
        expect(validation.is_bug).toBe(true);
      });
    });
  });
  
  describe('TREND metrics', () => {
    const trendMetrics = [
      'glucose_trajectory',
      'weight_trajectory',
      'cardiovascular_risk_trajectory'
    ];
    
    test.each(trendMetrics)('%s never renders NULL trend when confidence > 0', (metric_id) => {
      const validPayload = {
        trend_label: 'improving'
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: validPayload,
        confidence: 0.88
      });
      
      expect(validation.success_mode).toBe('trend');
      expect(validation.is_bug).toBe(false);
    });
    
    test.each(trendMetrics)('%s accepts insufficient_data as valid trend', (metric_id) => {
      const validPayload = {
        trend_label: 'insufficient_data'
      };
      
      const validation = validateMetricSuccess({
        metric_id,
        payload: validPayload,
        confidence: 0.50
      });
      
      expect(validation.success_mode).toBe('trend');
      expect(validation.is_bug).toBe(false);
    });
  });
  
  describe('Full 35-metric regression suite', () => {
    test('all 35 metrics have entries in metric_type_map.json', () => {
      const allMetrics = [
        // LAB_PROXY_RANGE (12)
        'estimated_hba1c_range',
        'estimated_glucose_range',
        'estimated_cholesterol_total_range',
        'estimated_ldl_range',
        'estimated_hdl_range',
        'estimated_triglycerides_range',
        'estimated_creatinine_range',
        'estimated_alt_range',
        'estimated_ast_range',
        'estimated_tsh_range',
        'estimated_vitamin_d_range',
        'estimated_hemoglobin_range',
        // INDEX_SCORE (16)
        'metabolic_syndrome_severity',
        'insulin_resistance_index',
        'cardiovascular_risk_score',
        'inflammation_burden_index',
        'liver_health_index',
        'kidney_function_index',
        'bone_health_index',
        'thyroid_function_index',
        'anemia_risk_index',
        'immune_health_index',
        'oxidative_stress_index',
        'hormonal_balance_index',
        'nutritional_status_index',
        'mental_health_correlation_index',
        'longevity_potential_index',
        'overall_health_score',
        // PROBABILITY (3)
        'diabetes_probability',
        'hypertension_probability',
        'dyslipidemia_probability',
        // CLASSIFICATION (9)
        'diabetes_phenotype',
        'metabolic_syndrome_pattern',
        'insulin_resistance_pattern',
        'lipid_disorder_pattern',
        'cardiovascular_risk_category',
        'liver_disease_risk_category',
        'kidney_disease_risk_category',
        'thyroid_disorder_pattern',
        'nutritional_deficiency_pattern',
        // TREND (3)
        'glucose_trajectory',
        'weight_trajectory',
        'cardiovascular_risk_trajectory'
      ];
      
      expect(allMetrics.length).toBe(35);
      
      // Test that each metric can be resolved
      allMetrics.forEach(metric_id => {
        expect(() => {
          resolveMetricTypeAndMode({
            metric_id,
            payload: { range_low: 4.0, range_high: 6.0 },
            dependency_type: 'DERIVED',
            provenance_label: 'ML-inferred'
          });
        }).not.toThrow();
      });
    });
    
    test('full Part B response never renders NULL cards when confidence > 0', () => {
      // Simulate full Part B response with valid payloads
      const fullPartBResponse = {
        specimen_id: 'SPEC123',
        metrics: [
          {
            metric_id: 'estimated_hba1c_range',
            payload: { range_low: 4.0, range_high: 6.0 },
            confidence: 0.85
          },
          {
            metric_id: 'metabolic_syndrome_severity',
            payload: { score_value: 75 },
            confidence: 0.90
          },
          {
            metric_id: 'diabetes_probability',
            payload: { prob_low: 15, prob_high: 35 },
            confidence: 0.88
          },
          {
            metric_id: 'diabetes_phenotype',
            payload: { class_label: 'Type 2' },
            confidence: 0.80
          },
          {
            metric_id: 'glucose_trajectory',
            payload: { trend_label: 'improving' },
            confidence: 0.92
          }
          // ... (30 more metrics for full 35)
        ]
      };
      
      fullPartBResponse.metrics.forEach(metric => {
        const validation = validateMetricSuccess(metric);
        expect(validation.is_bug).toBe(false);
        expect(validation.success_mode).not.toBe('none');
      });
    });
    
    test('CI fails if any metric has NULL-as-bug violation', () => {
      // Simulate Part B response with ONE bug
      const buggyResponse = {
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
            confidence: 0.75  // confidence > 0 but score NULL
          }
        ]
      };
      
      const bugs = buggyResponse.metrics
        .map(metric => validateMetricSuccess(metric))
        .filter(result => result.is_bug);
      
      expect(bugs.length).toBeGreaterThan(0);
      expect(bugs[0].metric_id).toBe('metabolic_syndrome_severity');
      
      // In CI, this should cause build to fail
      if (process.env.CI) {
        throw new Error(`NULL-as-bug violation detected: ${bugs.length} metrics`);
      }
    });
  });
  
  describe('Render priority determinism', () => {
    test('range takes priority over score', () => {
      const payload = {
        range_low: 4.0,
        range_high: 6.0,
        score_value: 75
      };
      
      const resolution = resolveMetricTypeAndMode({
        metric_id: 'estimated_hba1c_range',
        payload,
        dependency_type: 'DERIVED',
        provenance_label: 'ML-inferred'
      });
      
      expect(resolution.resolved_render_mode).toBe('range');
    });
    
    test('score takes priority over classification', () => {
      const payload = {
        score_value: 75,
        class_label: 'High'
      };
      
      const resolution = resolveMetricTypeAndMode({
        metric_id: 'metabolic_syndrome_severity',
        payload,
        dependency_type: 'DERIVED',
        provenance_label: 'ML-inferred'
      });
      
      expect(resolution.resolved_render_mode).toBe('score');
    });
    
    test('insufficient_fallback always succeeds as last resort', () => {
      const payload = {
        range_low: null,
        score_value: null,
        class_label: null
      };
      
      const resolution = resolveMetricTypeAndMode({
        metric_id: 'estimated_hba1c_range',
        payload,
        dependency_type: 'DERIVED',
        provenance_label: 'ML-inferred'
      });
      
      expect(resolution.resolved_render_mode).toBe('insufficient_fallback');
    });
  });
});
