/**
 * Part 2: Clinical Communication UI Renderer
 * 
 * Renders all 35 Part B metrics with Lab-Analog Explanation Blocks.
 * NEVER shows NULL values when confidence > 0.
 * Communicates like a clinical lab report, not a database.
 */

// ============================================================================
// METRIC RENDERER (Generic - iterates over all 35 metrics)
// ============================================================================

function renderPartBReport(report) {
    console.log('Rendering Part B report with clinical communication layer...');
    
    // Validate report has all 35 metrics
    const totalMetrics = Object.values(report.panels || {}).reduce((sum, panel) => {
        return sum + (panel.outputs || []).length;
    }, 0);
    
    if (totalMetrics !== 35) {
        console.warn(`⚠️ Expected 35 metrics, found ${totalMetrics}`);
    }
    
    const container = document.getElementById('partBContent');
    if (!container) {
        console.error('Part B container not found');
        return;
    }
    
    // Render A2 header block first (phase-awareness)
    let html = renderA2HeaderBlock(report.a2_header_block);
    
    // Render each panel
    const panels = [
        { key: 'metabolic_regulation', name: 'Metabolic Regulation', icon: '🔬' },
        { key: 'lipid_cardiometabolic', name: 'Lipid + Cardiometabolic', icon: '❤️' },
        { key: 'micronutrient_vitamin', name: 'Micronutrient + Vitamin', icon: '💊' },
        { key: 'inflammatory_immune', name: 'Inflammatory + Immune', icon: '🛡️' },
        { key: 'endocrine_neurohormonal', name: 'Endocrine + Neurohormonal', icon: '⚡' },
        { key: 'renal_hydration', name: 'Renal + Hydration', icon: '💧' },
        { key: 'comprehensive_integrated', name: 'Comprehensive + Integrated', icon: '🌐' }
    ];
    
    panels.forEach(panel => {
        const panelData = report[panel.key] || report.panels?.[panel.key];
        if (panelData && panelData.outputs && panelData.outputs.length > 0) {
            html += renderPanel(panel, panelData);
        }
    });
    
    container.innerHTML = html;
}

function renderA2HeaderBlock(headerBlock) {
    if (!headerBlock) return '';
    
    return `
        <div class="a2-header-block" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
            <h3 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">✓</span>
                <span>A2 Data Quality Analysis Complete</span>
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 0.9em;">
                <div>
                    <strong>A2 Run ID:</strong><br>
                    <code style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px;">${headerBlock.a2_run_id?.substring(0, 8)}...</code>
                </div>
                <div>
                    <strong>Conflicts Detected:</strong><br>
                    ${headerBlock.a2_conflicts_count || 0} data conflicts
                </div>
                <div>
                    <strong>Completed:</strong><br>
                    ${new Date(headerBlock.a2_completed_at).toLocaleString()}
                </div>
            </div>
            <p style="margin: 15px 0 0 0; font-size: 0.85em; opacity: 0.9;">
                ℹ️ The estimates below are based on this A2 analysis snapshot. All inferences reference this specific data quality assessment.
            </p>
        </div>
    `;
}

function renderPanel(panelInfo, panelData) {
    const outputs = panelData.outputs || [];
    
    let html = `
        <div class="part-b-panel" style="margin-bottom: 40px;">
            <h2 style="display: flex; align-items: center; gap: 10px; color: #2d3748; border-bottom: 3px solid #e2e8f0; padding-bottom: 10px;">
                <span style="font-size: 28px;">${panelInfo.icon}</span>
                <span>${panelInfo.name}</span>
                <span style="font-size: 0.7em; color: #718096; margin-left: auto;">${outputs.length} metrics</span>
            </h2>
            <div class="panel-outputs" style="display: grid; gap: 20px; margin-top: 20px;">
    `;
    
    outputs.forEach(output => {
        html += renderMetricCard(output);
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function renderMetricCard(output) {
    // CRITICAL: Never show NULL if confidence > 0
    const primaryValue = formatPrimaryValue(output);
    const confidence = output.confidence_percent || 0;
    const confidenceLabel = getConfidenceLabel(confidence);
    const confidenceColor = getConfidenceColor(confidence);
    
    // Generate lab-analog explanation
    const explanation = generateLabAnalogExplanation(output);
    
    // Determine analog type badge
    const analogType = getAnalogType(output.metric_name);
    const analogBadge = renderAnalogTypeBadge(analogType);
    
    return `
        <div class="metric-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <!-- Metric Header -->
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div>
                    <h3 style="margin: 0; color: #2d3748; font-size: 1.1em;">${output.metric_name.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}</h3>
                    ${analogBadge}
                </div>
                <div style="text-align: right;">
                    <div style="background: ${confidenceColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600; display: inline-block;">
                        ${confidenceLabel}
                    </div>
                </div>
            </div>
            
            <!-- Primary Value -->
            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="font-size: 0.8em; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">
                    ${output.measured_vs_inferred === 'measured' ? '📊 Measured' : '🔍 Estimated'}
                </div>
                <div style="font-size: 1.8em; font-weight: 700; color: #2d3748;">
                    ${primaryValue}
                </div>
            </div>
            
            <!-- Lab-Analog Explanation Block -->
            ${renderLabAnalogExplanation(explanation, output)}
            
            <!-- Confidence Drivers -->
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <div style="font-size: 0.85em; color: #4a5568; margin-bottom: 8px;">
                    <strong>💡 Why we believe this:</strong>
                </div>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.85em; color: #718096;">
                    ${(output.confidence_top_3_drivers || []).map(driver => {
                        const [desc, impact] = driver;
                        const impactIcon = impact === 'high' ? '🔥' : impact === 'medium' ? '⚡' : '💫';
                        return `<li style="margin-bottom: 4px;">${impactIcon} ${desc}</li>`;
                    }).join('')}
                </ul>
            </div>
            
            <!-- What Increases Confidence -->
            <div style="margin-top: 12px;">
                <div style="font-size: 0.85em; color: #4a5568; margin-bottom: 8px;">
                    <strong>📈 To increase confidence:</strong>
                </div>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.85em; color: #718096;">
                    ${(output.what_increases_confidence || []).map(item => 
                        `<li style="margin-bottom: 4px;">${item}</li>`
                    ).join('')}
                </ul>
            </div>
            
            <!-- Safe Action Suggestion -->
            <div style="margin-top: 15px; padding: 12px; background: #e6fffa; border-left: 4px solid #38b2ac; border-radius: 4px;">
                <div style="font-size: 0.85em; color: #234e52;">
                    <strong>✓ Safe Action:</strong> ${output.safe_action_suggestion}
                </div>
            </div>
            
            <!-- Input Chain -->
            <div style="margin-top: 12px; font-size: 0.8em; color: #a0aec0;">
                <strong>Data Sources:</strong> ${output.input_chain}
            </div>
        </div>
    `;
}

function formatPrimaryValue(output) {
    // Priority 1: Range
    if (output.value_range_low != null && output.value_range_high != null) {
        const units = output.units || '';
        return `${output.value_range_low.toFixed(1)}-${output.value_range_high.toFixed(1)} ${units}`.trim();
    }
    
    // Priority 2: Score
    if (output.value_score != null) {
        const units = output.units || '';
        return `${output.value_score.toFixed(1)} ${units}`.trim();
    }
    
    // Priority 3: Classification
    if (output.value_class != null) {
        return output.value_class;
    }
    
    // Priority 4: Fallback (NEVER NULL if confidence > 0)
    if (output.confidence_percent > 0) {
        return 'Estimate Pending (See Recommendations)';
    }
    
    return 'Insufficient Data';
}

function getConfidenceLabel(confidence) {
    if (confidence >= 85) return `High (${confidence}%)`;
    if (confidence >= 75) return `Moderate-High (${confidence}%)`;
    if (confidence >= 60) return `Moderate (${confidence}%)`;
    if (confidence >= 40) return `Moderate-Low (${confidence}%)`;
    return `Low (${confidence}%)`;
}

function getConfidenceColor(confidence) {
    if (confidence >= 85) return '#38a169';
    if (confidence >= 75) return '#48bb78';
    if (confidence >= 60) return '#ecc94b';
    if (confidence >= 40) return '#ed8936';
    return '#e53e3e';
}

function generateLabAnalogExplanation(output) {
    // This would ideally come from backend, but we can generate client-side
    const metricId = output.metric_name;
    
    // Default explanation structure
    return {
        what_this_represents: getWhatThisRepresents(metricId),
        lab_correspondence: getLabCorrespondence(metricId, output),
        what_would_tighten: getWhatWouldTighten(metricId)
    };
}

function getWhatThisRepresents(metricId) {
    const trueLabAnalogs = [
        'estimated_hba1c_range',
        'ldl_pattern_risk_proxy',
        'hdl_functional_likelihood',
        'triglyceride_elevation_probability',
        'vitamin_d_sufficiency_likelihood',
        'b12_functional_adequacy_score',
        'iron_utilization_status_class',
        'magnesium_adequacy_proxy',
        'chronic_inflammation_index',
        'cortisol_rhythm_integrity_score',
        'thyroid_functional_pattern',
        'hydration_status',
        'electrolyte_regulation_efficiency_score',
        'egfr_trajectory_class'
    ];
    
    if (trueLabAnalogs.includes(metricId)) {
        return 'Not a direct blood draw. This is an estimated value inferred from signals known to correlate with serum levels. Analogous to how calculated LDL uses the Friedewald equation rather than direct measurement.';
    } else {
        return 'Not a direct lab measurement. This is a clinician-synthesis estimate based on multiple physiologic signals and patterns.';
    }
}

function getLabCorrespondence(metricId, output) {
    const analogMap = {
        'estimated_hba1c_range': 'Hemoglobin A1c (%)',
        'insulin_resistance_probability': 'HOMA-IR (fasting insulin + glucose)',
        'ldl_pattern_risk_proxy': 'Calculated LDL-C (Friedewald equation)',
        'hdl_functional_likelihood': 'HDL-C + HDL particle count',
        'triglyceride_elevation_probability': 'Fasting triglycerides',
        'vitamin_d_sufficiency_likelihood': 'Serum 25-OH Vitamin D',
        'chronic_inflammation_index': 'hs-CRP (high-sensitivity C-reactive protein)',
        'egfr_trajectory_class': 'Estimated GFR from creatinine (CKD-EPI equation)'
    };
    
    const analog = analogMap[metricId] || 'Clinical synthesis metric';
    return `Closest clinical analog: ${analog}. Here's what it would likely look like on a lab slip.`;
}

function getWhatWouldTighten(metricId) {
    const testMap = {
        'estimated_hba1c_range': 'A serum HbA1c test',
        'insulin_resistance_probability': 'A fasting insulin + glucose test (HOMA-IR)',
        'ldl_pattern_risk_proxy': 'A standard lipid panel',
        'vitamin_d_sufficiency_likelihood': 'A serum 25-OH vitamin D test',
        'chronic_inflammation_index': 'A high-sensitivity CRP (hs-CRP) test',
        'egfr_trajectory_class': 'A serum creatinine with calculated eGFR'
    };
    
    const test = testMap[metricId] || 'A relevant blood test';
    return `${test} would significantly tighten this estimate.`;
}

function getAnalogType(metricId) {
    const trueLabAnalogs = [
        'estimated_hba1c_range',
        'insulin_resistance_probability',
        'ldl_pattern_risk_proxy',
        'hdl_functional_likelihood',
        'triglyceride_elevation_probability',
        'vitamin_d_sufficiency_likelihood',
        'b12_functional_adequacy_score',
        'iron_utilization_status_class',
        'magnesium_adequacy_proxy',
        'chronic_inflammation_index',
        'cortisol_rhythm_integrity_score',
        'thyroid_functional_pattern',
        'hydration_status',
        'electrolyte_regulation_efficiency_score',
        'egfr_trajectory_class'
    ];
    
    return trueLabAnalogs.includes(metricId) ? 'true_lab_analog' : 'clinician_synthesis_analog';
}

function renderAnalogTypeBadge(analogType) {
    if (analogType === 'true_lab_analog') {
        return `<span style="display: inline-block; background: #bee3f8; color: #2c5282; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: 600; margin-top: 4px;">🔬 True Lab Analog</span>`;
    } else {
        return `<span style="display: inline-block; background: #feebc8; color: #7c2d12; padding: 2px 8px; border-radius: 12px; font-size: 0.75em; font-weight: 600; margin-top: 4px;">🧠 Clinician-Synthesis Analog</span>`;
    }
}

function renderLabAnalogExplanation(explanation, output) {
    return `
        <div class="lab-analog-explanation" style="background: #f7fafc; border: 1px solid #cbd5e0; border-radius: 8px; padding: 15px; margin-top: 15px;">
            <div style="font-weight: 600; color: #2d3748; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2em;">📋</span>
                <span>Clinical Context</span>
            </div>
            
            <div style="font-size: 0.85em; color: #4a5568; line-height: 1.6;">
                <p style="margin: 8px 0;"><strong>What this represents:</strong> ${explanation.what_this_represents}</p>
                <p style="margin: 8px 0;"><strong>Lab correspondence:</strong> ${explanation.lab_correspondence}</p>
                <p style="margin: 8px 0;"><strong>To tighten estimate:</strong> ${explanation.what_would_tighten}</p>
            </div>
            
            <div style="margin-top: 12px; padding: 10px; background: #fff5f5; border-left: 3px solid #fc8181; border-radius: 4px; font-size: 0.8em; color: #742a2a;">
                ⚠️ <strong>Important:</strong> This is an estimate, not a diagnostic value. Interpret in clinical context with your healthcare provider.
            </div>
        </div>
    `;
}

// ============================================================================
// VALIDATION & ERROR CHECKING
// ============================================================================

function validatePartBReport(report) {
    const issues = [];
    
    // Check for 35 metrics
    const totalMetrics = Object.values(report.panels || {}).reduce((sum, panel) => {
        return sum + (panel.outputs || []).length;
    }, 0);
    
    if (totalMetrics !== 35) {
        issues.push(`Expected 35 metrics, found ${totalMetrics}`);
    }
    
    // Check for NULL values where confidence > 0
    Object.values(report.panels || {}).forEach(panel => {
        (panel.outputs || []).forEach(output => {
            if (output.confidence_percent > 0) {
                const hasValue = output.value_score != null || 
                               output.value_range_low != null || 
                               output.value_class != null;
                if (!hasValue) {
                    issues.push(`Metric ${output.metric_name} has confidence ${output.confidence_percent}% but no value (NULL not allowed)`);
                }
            }
        });
    });
    
    return issues;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderPartBReport,
        validatePartBReport,
        formatPrimaryValue,
        getConfidenceLabel
    };
}
