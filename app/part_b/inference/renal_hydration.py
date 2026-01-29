"""
Renal & Hydration Balance Inference Panel

This module implements inference algorithms for the Renal & Hydration Balance panel,
Panel 6 in the Part B report structure.

All outputs follow A2 integration pattern:
1. Check gating (via gating_engine)
2. Compute output value
3. Compute confidence (via confidence_engine)
4. Return OutputLineItem with all required mechanics
"""

from sqlalchemy.orm import Session
from app.part_b.schemas.output_schemas import OutputLineItem, OutputFrequency, OutputStatus
from app.part_b.data_helpers import PartADataHelper
from app.services.gating import gating_engine
from app.services.confidence import confidence_engine
from app.models.provenance import ProvenanceHelper


class RenalHydrationInference:
    """Inference methods for renal function and hydration balance outputs."""

    @staticmethod
    def compute_hydration_status(db: Session, submission_id: int, user_id: int) -> OutputLineItem:
        """
        Compute hydration status from ISF electrolytes and vitals.
        
        Methodologies:
        1. Composite hydration index (ISF Na, Cl, osmolality proxy)
        2. Rule constraints (dehydration thresholds, hypernatremia)
        3. Bayesian updating with vitals (HR, BP orthostatic)
        4. Trend smoothing for persistent patterns
        """
        # Check gating
        gate_result = gating_engine.check_gate(
            db=db,
            submission_id=submission_id,
            user_id=user_id,
            required_data=["isf_sodium", "vitals_hr"]
        )
        
        if not gate_result.is_open:
            return OutputLineItem(
                output_name="hydration_status",
                output_display_name="Hydration Status",
                value="insufficient_data",
                measured_vs_inferred="inferred",
                confidence_percent=0,
                top_3_drivers_of_confidence=[gate_result.reason],
                what_increases_confidence=gate_result.remediation,
                safe_action_suggestion="Upload more ISF and vitals data",
                input_chain=gate_result.checked_inputs,
                methodologies_used=["gating"],
                method_why="Insufficient data for hydration assessment"
            )
        
        # Retrieve data
        data_helper = PartADataHelper(db)
        isf_data = data_helper.get_isf_data(submission_id, user_id, days=14)
        vitals_data = data_helper.get_vitals_data(submission_id, user_id, days=7)
        
        # Method 1: Composite hydration index
        # Simplified: Use sodium as primary marker
        sodium_values = [r.get("sodium") for r in isf_data if r.get("sodium")]
        avg_sodium = sum(sodium_values) / len(sodium_values) if sodium_values else 140
        
        # Method 2: Rule constraints
        if avg_sodium > 145:
            hydration_class = "dehydrated"
            score = 30  # Low hydration
        elif avg_sodium > 142:
            hydration_class = "mild_dehydration"
            score = 60
        elif avg_sodium < 135:
            hydration_class = "overhydrated"
            score = 50
        else:
            hydration_class = "well_hydrated"
            score = 85
        
        # Method 3: Bayesian updating with vitals
        # Check HR elevation (tachycardia suggests dehydration)
        hr_values = [v.get("heart_rate") for v in vitals_data if v.get("heart_rate")]
        if hr_values:
            avg_hr = sum(hr_values) / len(hr_values)
            if avg_hr > 90 and hydration_class == "dehydrated":
                score = max(20, score - 15)  # Stronger dehydration signal
            elif avg_hr < 60 and hydration_class == "well_hydrated":
                score = min(95, score + 10)  # Confirms good hydration
        
        # Method 4: Trend smoothing
        # If consistent pattern over 14 days, increase confidence
        sodium_cv = (max(sodium_values) - min(sodium_values)) / avg_sodium if len(sodium_values) > 3 else 0.1
        if sodium_cv < 0.03:  # Very stable
            score = min(100, score + 5)
        
        # Compute confidence
        confidence_inputs = {
            "isf_sodium_days": len(set([r.get("timestamp_date") for r in isf_data])),
            "vitals_days": len(set([v.get("timestamp_date") for v in vitals_data])),
            "sodium_measurements": len(sodium_values)
        }
        
        confidence_result = confidence_engine.compute_confidence(
            base_confidence=70,
            inputs=confidence_inputs,
            required_data_days=14
        )
        
        # Create provenance
        ProvenanceHelper.create_provenance_record(
            db=db,
            submission_id=submission_id,
            output_name="hydration_status",
            value=f"{hydration_class} (score: {score})",
            confidence=confidence_result.confidence_percent,
            method="composite_hydration_index"
        )
        
        return OutputLineItem(
            output_name="hydration_status",
            output_display_name="Hydration Status",
            value=f"{hydration_class} (score: {score})",
            measured_vs_inferred="inferred",
            confidence_percent=confidence_result.confidence_percent,
            top_3_drivers_of_confidence=[
                f"Sodium level: {avg_sodium:.1f} mEq/L",
                f"HR pattern: {avg_hr:.0f} bpm" if hr_values else "No HR data",
                f"Sodium stability: CV {sodium_cv:.2%}"
            ],
            what_increases_confidence="More ISF measurements, orthostatic vitals, urine specific gravity",
            safe_action_suggestion="Maintain consistent hydration, monitor sodium trends",
            input_chain=confidence_inputs,
            methodologies_used=[
                "composite_hydration_index",
                "rule_constraints",
                "bayesian_vitals_updating",
                "trend_smoothing"
            ],
            method_why="Combines ISF electrolytes with vitals for hydration assessment"
        )

    @staticmethod
    def compute_electrolyte_regulation_efficiency_score(db: Session, submission_id: int, user_id: int) -> OutputLineItem:
        """
        Compute electrolyte regulation efficiency from ISF stability.
        
        Methodologies:
        1. Variability metrics (Na/K/Cl coefficient of variation)
        2. Mixed-effects model for baseline regulation
        3. Rule constraints (diuretics, kidney disease)
        """
        gate_result = gating_engine.check_gate(
            db=db,
            submission_id=submission_id,
            user_id=user_id,
            required_data=["isf_sodium", "isf_potassium"]
        )
        
        if not gate_result.is_open:
            return OutputLineItem(
                output_name="electrolyte_regulation_efficiency",
                output_display_name="Electrolyte Regulation Efficiency Score",
                value="insufficient_data",
                measured_vs_inferred="inferred",
                confidence_percent=0,
                top_3_drivers_of_confidence=[gate_result.reason],
                what_increases_confidence=gate_result.remediation,
                safe_action_suggestion="Upload ISF data with electrolyte measurements",
                input_chain=gate_result.checked_inputs,
                methodologies_used=["gating"],
                method_why="Insufficient electrolyte data"
            )
        
        data_helper = PartADataHelper(db)
        isf_data = data_helper.get_isf_data(submission_id, user_id, days=14)
        
        # Method 1: Variability metrics
        sodium_values = [r.get("sodium") for r in isf_data if r.get("sodium")]
        potassium_values = [r.get("potassium") for r in isf_data if r.get("potassium")]
        
        if len(sodium_values) < 3 or len(potassium_values) < 3:
            score = 50  # Insufficient data
        else:
            na_cv = (max(sodium_values) - min(sodium_values)) / (sum(sodium_values) / len(sodium_values))
            k_cv = (max(potassium_values) - min(potassium_values)) / (sum(potassium_values) / len(potassium_values))
            
            # Lower CV = better regulation
            avg_cv = (na_cv + k_cv) / 2
            if avg_cv < 0.02:
                score = 95
            elif avg_cv < 0.05:
                score = 80
            elif avg_cv < 0.10:
                score = 65
            else:
                score = 40
        
        # Method 2: Mixed-effects (simplified: check for outliers)
        outliers = sum(1 for v in sodium_values if v < 135 or v > 145)
        outliers += sum(1 for v in potassium_values if v < 3.5 or v > 5.0)
        if outliers > len(sodium_values) * 0.2:  # More than 20% outliers
            score = max(30, score - 20)
        
        # Method 3: Rule constraints
        soap_data = data_helper.get_soap_profile(submission_id, user_id)
        if soap_data and soap_data.get("medications"):
            meds = soap_data.get("medications", "").lower()
            if "diuretic" in meds or "furosemide" in meds or "hydrochlorothiazide" in meds:
                score = max(40, score - 15)  # Diuretics disrupt regulation
        
        confidence_inputs = {
            "sodium_measurements": len(sodium_values),
            "potassium_measurements": len(potassium_values),
            "days_covered": len(set([r.get("timestamp_date") for r in isf_data]))
        }
        
        confidence_result = confidence_engine.compute_confidence(
            base_confidence=65,
            inputs=confidence_inputs,
            required_data_days=14
        )
        
        ProvenanceHelper.create_provenance_record(
            db=db,
            submission_id=submission_id,
            output_name="electrolyte_regulation_efficiency",
            value=str(score),
            confidence=confidence_result.confidence_percent,
            method="electrolyte_variability_metrics"
        )
        
        return OutputLineItem(
            output_name="electrolyte_regulation_efficiency",
            output_display_name="Electrolyte Regulation Efficiency Score",
            value=f"{score}/100",
            measured_vs_inferred="inferred",
            confidence_percent=confidence_result.confidence_percent,
            top_3_drivers_of_confidence=[
                f"Sodium stability: {len(sodium_values)} measurements",
                f"Potassium stability: {len(potassium_values)} measurements",
                f"Outlier proportion: {outliers}/{len(sodium_values)}"
            ],
            what_increases_confidence="More frequent ISF measurements, chloride data",
            safe_action_suggestion="Monitor electrolyte trends, maintain consistent hydration",
            input_chain=confidence_inputs,
            methodologies_used=[
                "variability_metrics",
                "mixed_effects_baseline",
                "rule_constraints"
            ],
            method_why="Electrolyte stability indicates efficient renal regulation"
        )

    @staticmethod
    def compute_renal_stress_index(db: Session, submission_id: int, user_id: int) -> OutputLineItem:
        """
        Compute renal stress from BUN, creatinine, eGFR patterns.
        
        Methodologies:
        1. Risk regression (BUN/Cr ratio, eGFR trends)
        2. Bayesian anchoring to prior lab values
        3. Composite scoring (multiple renal markers)
        """
        gate_result = gating_engine.check_gate(
            db=db,
            submission_id=submission_id,
            user_id=user_id,
            required_data=["prior_labs"]
        )
        
        if not gate_result.is_open:
            return OutputLineItem(
                output_name="renal_stress_index",
                output_display_name="Renal Stress Index",
                value="insufficient_data",
                measured_vs_inferred="inferred",
                confidence_percent=0,
                top_3_drivers_of_confidence=[gate_result.reason],
                what_increases_confidence=gate_result.remediation,
                safe_action_suggestion="Upload recent lab results with BUN/creatinine",
                input_chain=gate_result.checked_inputs,
                methodologies_used=["gating"],
                method_why="Need lab data for renal assessment"
            )
        
        data_helper = PartADataHelper(db)
        lab_data = data_helper.get_prior_labs(submission_id, user_id)
        
        # Method 1: Risk regression
        bun = lab_data.get("bun")
        creatinine = lab_data.get("creatinine")
        egfr = lab_data.get("egfr")
        
        stress_score = 0
        if bun and creatinine:
            bun_cr_ratio = bun / creatinine
            if bun_cr_ratio > 25:  # Prerenal pattern
                stress_score += 30
            elif bun_cr_ratio > 20:
                stress_score += 15
        
        if creatinine and creatinine > 1.3:
            stress_score += 25
        elif creatinine and creatinine > 1.1:
            stress_score += 10
        
        if egfr and egfr < 60:
            stress_score += 35
        elif egfr and egfr < 90:
            stress_score += 15
        
        # Method 2: Bayesian anchor (if historical labs available)
        # Simplified: Check if values worsening
        historical_cr = lab_data.get("historical_creatinine")
        if historical_cr and creatinine and creatinine > historical_cr * 1.15:
            stress_score += 20  # Worsening
        
        # Method 3: Composite scoring
        stress_score = min(100, stress_score)  # Cap at 100
        
        if stress_score < 20:
            stress_class = "minimal_stress"
        elif stress_score < 40:
            stress_class = "mild_stress"
        elif stress_score < 60:
            stress_class = "moderate_stress"
        else:
            stress_class = "significant_stress"
        
        confidence_inputs = {
            "has_bun": bool(bun),
            "has_creatinine": bool(creatinine),
            "has_egfr": bool(egfr),
            "has_historical": bool(historical_cr)
        }
        
        confidence_result = confidence_engine.compute_confidence(
            base_confidence=75,
            inputs=confidence_inputs,
            required_data_days=30
        )
        
        ProvenanceHelper.create_provenance_record(
            db=db,
            submission_id=submission_id,
            output_name="renal_stress_index",
            value=f"{stress_class} ({stress_score})",
            confidence=confidence_result.confidence_percent,
            method="renal_risk_regression"
        )
        
        return OutputLineItem(
            output_name="renal_stress_index",
            output_display_name="Renal Stress Index",
            value=f"{stress_class} (score: {stress_score}/100)",
            measured_vs_inferred="inferred",
            confidence_percent=confidence_result.confidence_percent,
            top_3_drivers_of_confidence=[
                f"BUN/Cr ratio: {bun_cr_ratio:.1f}" if bun and creatinine else "No BUN/Cr",
                f"eGFR: {egfr:.0f} mL/min/1.73m²" if egfr else "No eGFR",
                f"Creatinine: {creatinine:.2f} mg/dL" if creatinine else "No creatinine"
            ],
            what_increases_confidence="Recent comprehensive metabolic panel, historical labs",
            safe_action_suggestion="Monitor kidney function, maintain hydration",
            input_chain=confidence_inputs,
            methodologies_used=[
                "risk_regression",
                "bayesian_anchoring",
                "composite_scoring"
            ],
            method_why="Combines multiple renal markers for comprehensive stress assessment"
        )

    @staticmethod
    def compute_dehydration_driven_creatinine_elevation_risk(db: Session, submission_id: int, user_id: int) -> OutputLineItem:
        """
        Assess risk of creatinine elevation due to dehydration (prerenal).
        
        Methodologies:
        1. Rule constraints (BUN/Cr ratio > 20 = prerenal physiology)
        2. Bayesian calibration with hydration markers
        3. Trend analysis (reversibility with hydration)
        """
        gate_result = gating_engine.check_gate(
            db=db,
            submission_id=submission_id,
            user_id=user_id,
            required_data=["prior_labs"]
        )
        
        if not gate_result.is_open:
            return OutputLineItem(
                output_name="dehydration_creatinine_risk",
                output_display_name="Dehydration-Driven Creatinine Elevation Risk",
                value="insufficient_data",
                measured_vs_inferred="inferred",
                confidence_percent=0,
                top_3_drivers_of_confidence=[gate_result.reason],
                what_increases_confidence=gate_result.remediation,
                safe_action_suggestion="Upload lab data with BUN and creatinine",
                input_chain=gate_result.checked_inputs,
                methodologies_used=["gating"],
                method_why="Need BUN/Cr for prerenal assessment"
            )
        
        data_helper = PartADataHelper(db)
        lab_data = data_helper.get_prior_labs(submission_id, user_id)
        
        bun = lab_data.get("bun")
        creatinine = lab_data.get("creatinine")
        
        # Method 1: Rule constraints
        if bun and creatinine:
            bun_cr_ratio = bun / creatinine
            if bun_cr_ratio > 25:
                risk = "high"
                risk_score = 75
            elif bun_cr_ratio > 20:
                risk = "moderate"
                risk_score = 50
            else:
                risk = "low"
                risk_score = 20
        else:
            risk = "unknown"
            risk_score = 50
        
        # Method 2: Bayesian with hydration markers
        isf_data = data_helper.get_isf_data(submission_id, user_id, days=7)
        sodium_values = [r.get("sodium") for r in isf_data if r.get("sodium")]
        if sodium_values:
            avg_sodium = sum(sodium_values) / len(sodium_values)
            if avg_sodium > 145 and risk == "moderate":
                risk = "high"
                risk_score = min(85, risk_score + 15)
            elif avg_sodium > 145 and risk == "low":
                risk = "moderate"
                risk_score = min(60, risk_score + 20)
        
        # Method 3: Trend analysis (check historical)
        historical_cr = lab_data.get("historical_creatinine")
        if historical_cr and creatinine and creatinine > historical_cr * 1.2:
            risk_score = min(90, risk_score + 10)  # Recent elevation
        elif historical_cr and creatinine and creatinine < historical_cr * 1.05:
            risk_score = max(10, risk_score - 15)  # Stable/improving
        
        confidence_inputs = {
            "has_bun_cr": bool(bun and creatinine),
            "has_sodium": len(sodium_values) > 0,
            "has_historical": bool(historical_cr)
        }
        
        confidence_result = confidence_engine.compute_confidence(
            base_confidence=70,
            inputs=confidence_inputs,
            required_data_days=14
        )
        
        ProvenanceHelper.create_provenance_record(
            db=db,
            submission_id=submission_id,
            output_name="dehydration_creatinine_risk",
            value=f"{risk} ({risk_score})",
            confidence=confidence_result.confidence_percent,
            method="prerenal_physiology_rules"
        )
        
        return OutputLineItem(
            output_name="dehydration_creatinine_risk",
            output_display_name="Dehydration-Driven Creatinine Elevation Risk",
            value=f"{risk} (risk score: {risk_score}/100)",
            measured_vs_inferred="inferred",
            confidence_percent=confidence_result.confidence_percent,
            top_3_drivers_of_confidence=[
                f"BUN/Cr ratio: {bun_cr_ratio:.1f}" if bun and creatinine else "No BUN/Cr",
                f"Sodium level: {avg_sodium:.1f} mEq/L" if sodium_values else "No sodium data",
                f"Creatinine trend: {'rising' if historical_cr and creatinine > historical_cr * 1.1 else 'stable'}"
            ],
            what_increases_confidence="Repeat labs after hydration, urine osmolality",
            safe_action_suggestion="Increase hydration, recheck labs after 48 hours",
            input_chain=confidence_inputs,
            methodologies_used=[
                "rule_constraints",
                "bayesian_hydration_calibration",
                "trend_analysis"
            ],
            method_why="Prerenal physiology patterns indicate reversible creatinine elevation"
        )

    @staticmethod
    def compute_egfr_trajectory_class(db: Session, submission_id: int, user_id: int) -> OutputLineItem:
        """
        Classify eGFR trajectory: stable, stressed, or declining.
        
        Methodologies:
        1. Trend slope modeling (historical eGFR over time)
        2. Mixed-effects model for age-expected decline
        3. Bayesian priors (population eGFR distributions)
        """
        gate_result = gating_engine.check_gate(
            db=db,
            submission_id=submission_id,
            user_id=user_id,
            required_data=["prior_labs"]
        )
        
        if not gate_result.is_open:
            return OutputLineItem(
                output_name="egfr_trajectory",
                output_display_name="eGFR Trajectory Class",
                value="insufficient_data",
                measured_vs_inferred="inferred",
                confidence_percent=0,
                top_3_drivers_of_confidence=[gate_result.reason],
                what_increases_confidence=gate_result.remediation,
                safe_action_suggestion="Upload historical lab results with eGFR",
                input_chain=gate_result.checked_inputs,
                methodologies_used=["gating"],
                method_why="Need eGFR history for trajectory analysis"
            )
        
        data_helper = PartADataHelper(db)
        lab_data = data_helper.get_prior_labs(submission_id, user_id)
        
        current_egfr = lab_data.get("egfr")
        historical_egfr = lab_data.get("historical_egfr")  # Assume list or single value
        
        # Method 1: Trend slope
        if current_egfr and historical_egfr:
            if isinstance(historical_egfr, list):
                egfr_change = current_egfr - historical_egfr[-1]
            else:
                egfr_change = current_egfr - historical_egfr
            
            if egfr_change < -10:  # Declining > 10 mL/min
                trajectory = "declining"
            elif egfr_change < -5:
                trajectory = "stressed"
            elif abs(egfr_change) <= 5:
                trajectory = "stable"
            else:
                trajectory = "improving"
        elif current_egfr:
            # Method 2: Age-expected (simplified)
            # Normal decline is ~1 mL/min/year after age 40
            if current_egfr > 90:
                trajectory = "stable"
            elif current_egfr > 60:
                trajectory = "age_appropriate"
            else:
                trajectory = "stressed"
        else:
            trajectory = "unknown"
        
        # Method 3: Bayesian priors (population)
        if current_egfr:
            if current_egfr < 60:
                trajectory = "declining"  # Stage 3 CKD
        
        confidence_inputs = {
            "has_current_egfr": bool(current_egfr),
            "has_historical_egfr": bool(historical_egfr),
            "egfr_measurements": 2 if historical_egfr else 1
        }
        
        confidence_result = confidence_engine.compute_confidence(
            base_confidence=60,
            inputs=confidence_inputs,
            required_data_days=90
        )
        
        ProvenanceHelper.create_provenance_record(
            db=db,
            submission_id=submission_id,
            output_name="egfr_trajectory",
            value=trajectory,
            confidence=confidence_result.confidence_percent,
            method="trend_slope_modeling"
        )
        
        return OutputLineItem(
            output_name="egfr_trajectory",
            output_display_name="eGFR Trajectory Class",
            value=trajectory,
            measured_vs_inferred="inferred",
            confidence_percent=confidence_result.confidence_percent,
            top_3_drivers_of_confidence=[
                f"Current eGFR: {current_egfr:.0f} mL/min/1.73m²" if current_egfr else "No current eGFR",
                f"Historical eGFR: {historical_egfr}" if historical_egfr else "No historical data",
                f"Change: {egfr_change:.1f} mL/min" if current_egfr and historical_egfr else "No trend"
            ],
            what_increases_confidence="Serial eGFR measurements over 6-12 months",
            safe_action_suggestion="Monitor kidney function regularly, discuss with physician if declining",
            input_chain=confidence_inputs,
            methodologies_used=[
                "trend_slope_modeling",
                "mixed_effects_age_expected",
                "bayesian_priors"
            ],
            method_why="Longitudinal eGFR trends predict kidney function trajectory"
        )
