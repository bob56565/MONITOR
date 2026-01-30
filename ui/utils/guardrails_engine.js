/**
 * Part 4: Guardrails Engine
 * 
 * Implements comprehensive integrity checks for Part B outputs:
 * 1. Dependency map gating + fallback behavior
 * 2. Degradation ladder tier selection
 * 3. Provenance badge labeling
 * 4. Temporal sanity checks
 * 5. Cross-metric consistency checks
 * 
 * Integrates with Part 3 RenderRulesEngine before final card emission.
 * NO BACKEND SCHEMA CHANGES - UI/guardrails layer only.
 */

class GuardrailsEngine {
    constructor() {
        this.dependencyMap = null;
        this.degradationLadder = null;
        this.provenanceMap = null;
        this.temporalRules = null;
        this.consistencyRules = null;
        this.initialized = false;
    }

    /**
     * Load all rule files asynchronously
     */
    async initialize() {
        if (this.initialized) return;

        try {
            const [depMap, degradation, provenance, temporal, consistency] = await Promise.all([
                fetch('/ui/rules/metric_dependency_map.json').then(r => r.json()),
                fetch('/ui/rules/data_degradation_ladder.json').then(r => r.json()),
                fetch('/ui/rules/metric_provenance_map.json').then(r => r.json()),
                fetch('/ui/rules/temporal_sanity_rules.json').then(r => r.json()),
                fetch('/ui/rules/cross_metric_consistency_rules.json').then(r => r.json())
            ]);

            this.dependencyMap = depMap;
            this.degradationLadder = degradation;
            this.provenanceMap = provenance;
            this.temporalRules = temporal;
            this.consistencyRules = consistency;
            this.initialized = true;

            console.log('✅ GuardrailsEngine initialized - all rule files loaded');
        } catch (error) {
            console.error('❌ GuardrailsEngine initialization failed:', error);
            throw error;
        }
    }

    /**
     * Main entry point: Apply all guardrails to a metric output
     * 
     * @param {Object} metricOutput - Normalized Part B metric output
     * @param {Object} a2Summary - A2 summary record (stream_coverage, conflicts, etc.)
     * @param {Object} priorOutputs - Historical outputs for temporal checks (optional)
     * @param {Array} allCurrentOutputs - All metrics in current run for cross-metric checks
     * @returns {Object} - Guarded metric output with audit trace
     */
    applyGuardrails(metricOutput, a2Summary, priorOutputs = null, allCurrentOutputs = []) {
        if (!this.initialized) {
            throw new Error('GuardrailsEngine not initialized - call initialize() first');
        }

        const metricId = metricOutput.metric_id;
        const trace = {
            metric_id: metricId,
            user_id: a2Summary.user_id,
            submission_id: a2Summary.submission_id,
            a2_run_id: a2Summary.a2_run_id,
            created_at: new Date().toISOString(),
            inputs_used: [],
            derived_features_used: [],
            constraints_applied: [],
            confidence_adjustments: [],
            degradation: {},
            provenance: {},
            temporal_sanity: { checked: false, violations: [] },
            cross_metric_consistency: { checked: false, flags: [] }
        };

        let output = { ...metricOutput };
        let initialConfidence = output.confidence_percent || 50;

        // Step 1: Dependency map gating + fallback
        const gatingResult = this.applyDependencyGating(output, a2Summary);
        trace.inputs_used = gatingResult.inputs_used;
        trace.derived_features_used = gatingResult.derived_features_used;
        trace.constraints_applied.push({
            name: 'dependency_gating',
            result: gatingResult.passed ? 'pass' : 'soft_fail',
            notes: gatingResult.notes
        });

        if (!gatingResult.passed) {
            output = this.applyFallbackBehavior(output, gatingResult.fallback);
            trace.confidence_adjustments.push({
                stage: 'dependency_gating_fallback',
                before: initialConfidence,
                after: output.confidence_percent,
                reason: gatingResult.notes
            });
        }

        // Step 2: Degradation ladder tier selection
        const tier = this.selectDegradationTier(metricId, a2Summary);
        trace.degradation = {
            tier: tier.tier,
            rules_triggered: tier.forced_rules || []
        };

        output.confidence_percent *= tier.confidence_multiplier;
        if (output.range_width) {
            output.range_width *= tier.range_uncertainty_multiplier;
        }

        trace.confidence_adjustments.push({
            stage: 'degradation_ladder',
            before: initialConfidence,
            after: output.confidence_percent,
            reason: `Tier: ${tier.tier}, multiplier: ${tier.confidence_multiplier}`
        });

        // Step 3: Provenance badge labeling
        const provenance = this.getProvenanceBadge(metricId);
        output.provenance_badge = provenance;
        trace.provenance = provenance;

        // Step 4: Temporal sanity checks
        if (priorOutputs && priorOutputs[metricId]) {
            const temporalResult = this.checkTemporalSanity(output, priorOutputs[metricId]);
            trace.temporal_sanity = {
                checked: true,
                violations: temporalResult.violations
            };

            if (temporalResult.violations.length > 0) {
                output = temporalResult.adjusted_output;
                trace.confidence_adjustments.push({
                    stage: 'temporal_sanity',
                    before: output.confidence_percent,
                    after: temporalResult.adjusted_output.confidence_percent,
                    reason: `Temporal violations: ${temporalResult.violations.map(v => v.flag_code).join(', ')}`
                });
            }
        }

        // Step 5: Cross-metric consistency checks
        const consistencyResult = this.checkCrossMetricConsistency(output, allCurrentOutputs);
        trace.cross_metric_consistency = {
            checked: true,
            flags: consistencyResult.flags
        };

        if (consistencyResult.flags.length > 0) {
            output.confidence_percent -= consistencyResult.total_penalty;
            trace.confidence_adjustments.push({
                stage: 'cross_metric_consistency',
                before: output.confidence_percent + consistencyResult.total_penalty,
                after: output.confidence_percent,
                reason: `Consistency violations: ${consistencyResult.flags.map(f => f.flag_code).join(', ')}`
            });
        }

        // Ensure confidence stays within bounds
        output.confidence_percent = Math.max(0, Math.min(90, output.confidence_percent));

        // Attach trace to output (for audit)
        output._audit_trace = trace;

        return output;
    }

    /**
     * Apply dependency map gating - check if required inputs meet thresholds
     */
    applyDependencyGating(output, a2Summary) {
        const metricId = output.metric_id;
        const dependency = this.dependencyMap.metrics[metricId];

        if (!dependency) {
            return {
                passed: false,
                inputs_used: [],
                derived_features_used: [],
                fallback: { when_required_missing: 'render_exploratory_only', confidence_floor: 0.20 },
                notes: 'No dependency mapping found for metric'
            };
        }

        const inputsUsed = [];
        const derivedUsed = dependency.derived_inputs || [];
        let passed = true;
        const failedInputs = [];

        // Check required inputs
        for (const req of dependency.required_inputs || []) {
            const streamName = req.stream;
            const streamCoverage = a2Summary.stream_coverage[streamName];

            if (!streamCoverage) {
                passed = false;
                failedInputs.push(`${streamName} (missing)`);
                continue;
            }

            const metRequirements =
                streamCoverage.days_covered >= req.min_days_covered &&
                streamCoverage.missing_rate <= req.max_missing_rate &&
                streamCoverage.quality_score >= req.min_quality_score;

            inputsUsed.push({
                stream: streamName,
                days_covered: streamCoverage.days_covered,
                missing_rate: streamCoverage.missing_rate,
                quality_score: streamCoverage.quality_score,
                notes: metRequirements ? 'Requirements met' : 'Requirements NOT met'
            });

            if (!metRequirements) {
                passed = false;
                failedInputs.push(`${streamName} (insufficient)`);
            }
        }

        return {
            passed,
            inputs_used: inputsUsed,
            derived_features_used: derivedUsed,
            fallback: dependency.fallback_behavior,
            notes: passed ? 'All required inputs met' : `Failed inputs: ${failedInputs.join(', ')}`
        };
    }

    /**
     * Apply fallback behavior when dependencies not met
     */
    applyFallbackBehavior(output, fallback) {
        const adjusted = { ...output };

        // Apply confidence floor and penalty
        adjusted.confidence_percent = Math.max(
            fallback.confidence_floor * 100,
            (adjusted.confidence_percent || 50) - (fallback.confidence_penalty * 100)
        );

        // Add explainability flags
        adjusted.explainability_flags = adjusted.explainability_flags || [];
        adjusted.explainability_flags.push(...(fallback.explainability_flags || []));

        // Adjust display strategy if needed
        if (fallback.display_strategy) {
            adjusted.display_strategy_override = fallback.display_strategy;
        }

        return adjusted;
    }

    /**
     * Select degradation tier based on A2 stream coverage + conflicts
     */
    selectDegradationTier(metricId, a2Summary) {
        // Compute data adequacy from stream coverage
        const dependency = this.dependencyMap.metrics[metricId];
        const streamCoverages = [];

        for (const req of dependency?.required_inputs || []) {
            const coverage = a2Summary.stream_coverage[req.stream];
            if (coverage) {
                streamCoverages.push(coverage.quality_score);
            }
        }

        const dataAdequacy = streamCoverages.length > 0
            ? streamCoverages.reduce((a, b) => a + b, 0) / streamCoverages.length
            : 0;

        // Count conflicts
        const conflicts = a2Summary.conflict_flags?.length || 0;

        // Find max missing rate
        const missingRates = streamCoverages.map((_, idx) => {
            const req = dependency.required_inputs[idx];
            return a2Summary.stream_coverage[req.stream]?.missing_rate || 1.0;
        });
        const maxMissingRate = missingRates.length > 0 ? Math.max(...missingRates) : 1.0;

        // Match tier from highest to lowest
        for (const tier of this.degradationLadder.tiers) {
            if (
                dataAdequacy >= tier.criteria.data_adequacy_min &&
                maxMissingRate <= tier.criteria.missing_rate_max &&
                conflicts <= tier.criteria.conflicts_max
            ) {
                return tier;
            }
        }

        // Default to exploratory_only if no match
        return this.degradationLadder.tiers[this.degradationLadder.tiers.length - 1];
    }

    /**
     * Get provenance badge for metric
     */
    getProvenanceBadge(metricId) {
        const provenance = this.provenanceMap.metrics[metricId];
        if (!provenance) {
            return {
                provenance_label: 'UNKNOWN',
                measured_vs_inferred: 'UNKNOWN',
                badge_color: 'gray'
            };
        }

        const badgeInfo = this.provenanceMap.provenance_badge_values[provenance.provenance_label];
        return {
            provenance_label: provenance.provenance_label,
            measured_vs_inferred: badgeInfo.measured_vs_inferred,
            badge_color: badgeInfo.badge_color,
            rationale: provenance.rationale
        };
    }

    /**
     * Check temporal sanity - detect physiologically impossible swings
     */
    checkTemporalSanity(currentOutput, priorOutput) {
        const metricId = currentOutput.metric_id;
        const rule = this.temporalRules.metrics[metricId];

        if (!rule) {
            return { violations: [], adjusted_output: currentOutput };
        }

        const violations = [];
        let adjusted = { ...currentOutput };

        // Handle different value types
        const currentValue = this.extractNumericValue(currentOutput);
        const priorValue = this.extractNumericValue(priorOutput);

        if (currentValue === null || priorValue === null) {
            return { violations: [], adjusted_output: currentOutput };
        }

        const delta = Math.abs(currentValue - priorValue);
        const maxDelta = rule.max_daily_delta || rule.max_weekly_delta;

        if (maxDelta && delta > maxDelta) {
            violations.push({
                flag_code: rule.violation_behavior.flag_code,
                details: `Delta ${delta.toFixed(2)} exceeds max ${maxDelta} ${rule.delta_units}`,
                action: rule.violation_behavior.cap_strategy
            });

            // Apply violation behavior
            const behavior = rule.violation_behavior;

            if (behavior.cap_strategy === 'cap_to_max_delta') {
                const direction = currentValue > priorValue ? 1 : -1;
                adjusted.value = priorValue + (direction * maxDelta);
            } else if (behavior.cap_strategy === 'dampen_by_factor') {
                const dampenedDelta = delta * behavior.dampen_factor;
                const direction = currentValue > priorValue ? 1 : -1;
                adjusted.value = priorValue + (direction * dampenedDelta);
            }

            // Apply confidence penalty
            adjusted.confidence_percent -= (behavior.confidence_penalty * 100);

            // Widen bounds if applicable
            if (behavior.range_widen_multiplier && adjusted.range_width) {
                adjusted.range_width *= behavior.range_widen_multiplier;
            }
        }

        return { violations, adjusted_output: adjusted };
    }

    /**
     * Check cross-metric consistency - detect contradictions
     */
    checkCrossMetricConsistency(currentOutput, allOutputs) {
        const flags = [];
        let totalPenalty = 0;

        for (const rule of this.consistencyRules.rules) {
            const conditionsMet = rule.if.every(condition => {
                const targetMetric = allOutputs.find(m => m.metric_id === condition.metric_id);
                if (!targetMetric) return false;

                return this.evaluateCondition(targetMetric, condition);
            });

            if (conditionsMet) {
                // Check if current output is affected
                if (rule.then.affected_metrics.includes(currentOutput.metric_id)) {
                    flags.push({
                        flag_code: rule.then.flag_code,
                        details: rule.then.flag_message,
                        confidence_penalty: rule.then.confidence_penalty
                    });
                    totalPenalty += rule.then.confidence_penalty;
                }
            }
        }

        return { flags, total_penalty: totalPenalty * 100 }; // Convert to percentage points
    }

    /**
     * Evaluate a single condition for cross-metric check
     */
    evaluateCondition(metric, condition) {
        const thresholdType = condition.threshold_type;
        const threshold = condition.threshold;
        const value = this.extractNumericValue(metric);

        switch (thresholdType) {
            case 'score_or_index_above':
                return value !== null && value >= threshold;
            case 'score_or_index_below':
                return value !== null && value < threshold;
            case 'probability_above':
                return value !== null && value >= threshold;
            case 'probability_below':
                return value !== null && value < threshold;
            case 'range_midpoint_above':
                const midpoint = (metric.value_range_low + metric.value_range_high) / 2;
                return midpoint >= threshold;
            case 'range_midpoint_below':
                const mid = (metric.value_range_low + metric.value_range_high) / 2;
                return mid < threshold;
            case 'class_match':
                const classification = metric.classification || metric.value || '';
                return classification.toLowerCase() === threshold.toLowerCase();
            default:
                return false;
        }
    }

    /**
     * Extract numeric value from metric output (handles different types)
     */
    extractNumericValue(output) {
        if (output.value !== undefined) return output.value;
        if (output.score !== undefined) return output.score;
        if (output.probability !== undefined) return output.probability;
        if (output.value_range_low !== undefined && output.value_range_high !== undefined) {
            return (output.value_range_low + output.value_range_high) / 2;
        }
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GuardrailsEngine;
}
