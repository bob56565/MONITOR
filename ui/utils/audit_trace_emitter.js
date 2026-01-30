/**
 * Part 4: Audit Trace Emitter
 * 
 * Creates machine-readable audit/explainability traces per metric per run.
 * Traces are persisted for debugging, clinician review, and future validation.
 * 
 * NO NEW DB SCHEMA - writes to structured file store or existing artifact storage.
 * Keyed by: user_id, submission_id, a2_run_id, metric_id, created_at
 */

class AuditTraceEmitter {
    constructor() {
        this.traces = []; // In-memory buffer
        this.persistenceMode = 'local_storage'; // 'local_storage' | 'api_post' | 'file_download'
    }

    /**
     * Emit audit trace for a single metric
     * 
     * @param {Object} trace - Complete audit trace from GuardrailsEngine
     * @returns {Promise<void>}
     */
    async emitTrace(trace) {
        // Validate trace structure
        if (!this.validateTrace(trace)) {
            console.error('Invalid trace structure - skipping:', trace);
            return;
        }

        // Add to buffer
        this.traces.push(trace);

        // Persist based on mode
        switch (this.persistenceMode) {
            case 'local_storage':
                await this.persistToLocalStorage(trace);
                break;
            case 'api_post':
                await this.persistToAPI(trace);
                break;
            case 'file_download':
                // Batch download triggered separately
                break;
            default:
                console.warn('Unknown persistence mode:', this.persistenceMode);
        }

        console.log(`✅ Audit trace emitted for ${trace.metric_id} (run: ${trace.a2_run_id})`);
    }

    /**
     * Emit traces for all metrics in a batch
     * 
     * @param {Array} traces - Array of audit traces
     * @returns {Promise<void>}
     */
    async emitBatch(traces) {
        for (const trace of traces) {
            await this.emitTrace(trace);
        }

        console.log(`✅ Batch of ${traces.length} audit traces emitted`);
    }

    /**
     * Validate trace structure
     */
    validateTrace(trace) {
        const required = [
            'user_id',
            'submission_id',
            'a2_run_id',
            'metric_id',
            'created_at',
            'inputs_used',
            'confidence_adjustments',
            'degradation',
            'provenance'
        ];

        return required.every(field => trace.hasOwnProperty(field));
    }

    /**
     * Persist trace to localStorage (browser-based)
     */
    async persistToLocalStorage(trace) {
        const key = this.buildTraceKey(trace);
        const existing = localStorage.getItem('audit_traces') || '[]';
        const traces = JSON.parse(existing);

        traces.push({
            key,
            trace,
            timestamp: new Date().toISOString()
        });

        // Keep only last 1000 traces to avoid storage overflow
        if (traces.length > 1000) {
            traces.shift();
        }

        localStorage.setItem('audit_traces', JSON.stringify(traces));
    }

    /**
     * Persist trace to backend API (if endpoint exists)
     */
    async persistToAPI(trace) {
        try {
            const response = await fetch('/api/audit_traces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trace)
            });

            if (!response.ok) {
                console.error('Failed to persist trace to API:', response.status);
            }
        } catch (error) {
            console.error('API persistence error:', error);
            // Fallback to localStorage
            await this.persistToLocalStorage(trace);
        }
    }

    /**
     * Build deterministic trace key
     */
    buildTraceKey(trace) {
        return `${trace.user_id}_${trace.submission_id}_${trace.a2_run_id}_${trace.metric_id}`;
    }

    /**
     * Retrieve trace by key
     * 
     * @param {string} key - Trace key (from buildTraceKey)
     * @returns {Object|null} - Trace or null if not found
     */
    getTrace(key) {
        const existing = localStorage.getItem('audit_traces') || '[]';
        const traces = JSON.parse(existing);
        const match = traces.find(t => t.key === key);
        return match ? match.trace : null;
    }

    /**
     * Retrieve all traces for a specific run
     * 
     * @param {string} a2RunId - A2 run ID
     * @returns {Array} - Array of traces
     */
    getTracesForRun(a2RunId) {
        const existing = localStorage.getItem('audit_traces') || '[]';
        const traces = JSON.parse(existing);
        return traces
            .filter(t => t.trace.a2_run_id === a2RunId)
            .map(t => t.trace);
    }

    /**
     * Download all traces as JSON file
     */
    downloadAllTraces() {
        const existing = localStorage.getItem('audit_traces') || '[]';
        const traces = JSON.parse(existing);

        const blob = new Blob([JSON.stringify(traces, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_traces_${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`✅ Downloaded ${traces.length} audit traces`);
    }

    /**
     * Clear all traces (use with caution)
     */
    clearAllTraces() {
        localStorage.removeItem('audit_traces');
        this.traces = [];
        console.log('✅ All audit traces cleared');
    }

    /**
     * Get trace statistics
     */
    getStatistics() {
        const existing = localStorage.getItem('audit_traces') || '[]';
        const traces = JSON.parse(existing);

        const stats = {
            total_traces: traces.length,
            unique_runs: new Set(traces.map(t => t.trace.a2_run_id)).size,
            unique_metrics: new Set(traces.map(t => t.trace.metric_id)).size,
            avg_confidence_adjustments: 0,
            degradation_tier_distribution: {},
            provenance_distribution: {},
            temporal_violations: 0,
            cross_metric_flags: 0
        };

        traces.forEach(({ trace }) => {
            // Confidence adjustments
            stats.avg_confidence_adjustments += trace.confidence_adjustments.length;

            // Degradation tiers
            const tier = trace.degradation.tier;
            stats.degradation_tier_distribution[tier] = (stats.degradation_tier_distribution[tier] || 0) + 1;

            // Provenance
            const prov = trace.provenance.provenance_label;
            stats.provenance_distribution[prov] = (stats.provenance_distribution[prov] || 0) + 1;

            // Violations
            if (trace.temporal_sanity.violations && trace.temporal_sanity.violations.length > 0) {
                stats.temporal_violations += trace.temporal_sanity.violations.length;
            }

            if (trace.cross_metric_consistency.flags && trace.cross_metric_consistency.flags.length > 0) {
                stats.cross_metric_flags += trace.cross_metric_consistency.flags.length;
            }
        });

        if (traces.length > 0) {
            stats.avg_confidence_adjustments /= traces.length;
        }

        return stats;
    }

    /**
     * Generate human-readable trace summary for a metric
     * 
     * @param {Object} trace - Audit trace
     * @returns {string} - Formatted summary
     */
    generateTraceSummary(trace) {
        let summary = `# Audit Trace: ${trace.metric_id}\n`;
        summary += `Run: ${trace.a2_run_id} | Created: ${trace.created_at}\n\n`;

        summary += `## Inputs Used\n`;
        trace.inputs_used.forEach(input => {
            summary += `- ${input.stream}: ${input.days_covered} days, ${(input.quality_score * 100).toFixed(0)}% quality\n`;
        });

        summary += `\n## Provenance\n`;
        summary += `- Label: ${trace.provenance.provenance_label}\n`;
        summary += `- Type: ${trace.provenance.measured_vs_inferred}\n`;

        summary += `\n## Degradation\n`;
        summary += `- Tier: ${trace.degradation.tier}\n`;
        if (trace.degradation.rules_triggered.length > 0) {
            summary += `- Rules: ${trace.degradation.rules_triggered.join(', ')}\n`;
        }

        summary += `\n## Confidence Adjustments\n`;
        trace.confidence_adjustments.forEach(adj => {
            summary += `- ${adj.stage}: ${adj.before.toFixed(0)}% → ${adj.after.toFixed(0)}% (${adj.reason})\n`;
        });

        if (trace.temporal_sanity.checked) {
            summary += `\n## Temporal Sanity\n`;
            if (trace.temporal_sanity.violations.length > 0) {
                trace.temporal_sanity.violations.forEach(v => {
                    summary += `- ⚠️ ${v.flag_code}: ${v.details}\n`;
                });
            } else {
                summary += `- ✅ No temporal violations\n`;
            }
        }

        if (trace.cross_metric_consistency.checked) {
            summary += `\n## Cross-Metric Consistency\n`;
            if (trace.cross_metric_consistency.flags.length > 0) {
                trace.cross_metric_consistency.flags.forEach(f => {
                    summary += `- ⚠️ ${f.flag_code}: ${f.details}\n`;
                });
            } else {
                summary += `- ✅ No consistency violations\n`;
            }
        }

        return summary;
    }

    /**
     * Render trace viewer UI (developer tool)
     * 
     * @param {string} containerId - ID of container element
     */
    renderTraceViewer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return;
        }

        const existing = localStorage.getItem('audit_traces') || '[]';
        const traces = JSON.parse(existing);

        container.innerHTML = `
            <div style="padding: 20px; font-family: monospace;">
                <h2>Audit Trace Viewer</h2>
                <p>Total traces: ${traces.length}</p>
                <button onclick="auditTraceEmitter.downloadAllTraces()">Download All</button>
                <button onclick="auditTraceEmitter.clearAllTraces(); location.reload();">Clear All</button>
                <hr>
                <div id="trace-list"></div>
            </div>
        `;

        const traceList = document.getElementById('trace-list');
        traces.slice(-50).reverse().forEach(({ trace }) => {
            const summary = this.generateTraceSummary(trace);
            const div = document.createElement('div');
            div.style.border = '1px solid #ccc';
            div.style.margin = '10px 0';
            div.style.padding = '10px';
            div.innerHTML = `<pre>${summary}</pre>`;
            traceList.appendChild(div);
        });
    }
}

// Create singleton instance
const auditTraceEmitter = new AuditTraceEmitter();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuditTraceEmitter, auditTraceEmitter };
} else {
    window.auditTraceEmitter = auditTraceEmitter;
}
