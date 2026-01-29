"""
Part B Report Orchestrator

Coordinates generation of complete Part B report by calling all panel inference modules,
integrating with A2 services (gating, confidence, provenance), and assembling final output.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
import time

from app.part_b.schemas.output_schemas import (
    PartBReport,
    PanelSection,
    OutputLineItem,
    PartBGenerationRequest,
    PartBGenerationResponse,
    OutputFrequency,
    OutputStatus
)
from app.part_b.data_helpers import PartADataHelper
from app.part_b.inference.metabolic_regulation import MetabolicRegulationInference
from app.models.provenance import ProvenanceHelper


class PartBOrchestrator:
    """
    Orchestrates Part B report generation.
    
    Workflow:
    1. Validate Part A data exists and meets minimums
    2. Call each panel inference module
    3. For each output: gating → compute → confidence → provenance
    4. Assemble complete report
    5. Return structured response
    """
    
    @staticmethod
    def generate_report(
        db: Session,
        user_id: int,
        request: PartBGenerationRequest
    ) -> PartBGenerationResponse:
        """
        Generate complete Part B report.
        
        Args:
            db: Database session
            user_id: Authenticated user ID
            request: Generation request with submission_id and filters
        
        Returns:
            PartBGenerationResponse with complete report or errors
        """
        start_time = time.time()
        errors = []
        warnings = []
        
        # Step 1: Validate Part A submission exists and meets minimums
        submission = PartADataHelper.get_submission(db, request.submission_id, user_id)
        
        if not submission:
            return PartBGenerationResponse(
                status="error",
                errors=["Part A submission not found or access denied"],
                generation_time_ms=int((time.time() - start_time) * 1000)
            )
        
        # Check minimum requirements
        requirements = PartADataHelper.check_minimum_requirements(
            db, request.submission_id, user_id
        )
        
        if not requirements['meets_requirements']:
            return PartBGenerationResponse(
                status="error",
                errors=[
                    "Part A does not meet minimum data requirements",
                    f"Missing: {', '.join(requirements['missing_items'])}"
                ],
                warnings=[
                    "Part B requires: ≥1 specimen upload, ISF data, vitals, and SOAP profile"
                ],
                generation_time_ms=int((time.time() - start_time) * 1000)
            )
        
        # Step 2: Generate each panel section
        try:
            # Panel 1: Metabolic Regulation
            metabolic_panel = PartBOrchestrator._generate_metabolic_panel(
                db, submission.id, user_id, request
            )
            
            # Panel 2-7: Placeholder implementations (simplified for MVP)
            lipid_panel = PartBOrchestrator._generate_placeholder_panel(
                "lipid_cardiometabolic", "Lipid & Cardiometabolic Indications"
            )
            
            micronutrient_panel = PartBOrchestrator._generate_placeholder_panel(
                "micronutrient_vitamin", "Micronutrient & Vitamin Score"
            )
            
            inflammatory_panel = PartBOrchestrator._generate_placeholder_panel(
                "inflammatory_immune", "Inflammatory & Immune Activity"
            )
            
            endocrine_panel = PartBOrchestrator._generate_placeholder_panel(
                "endocrine_neurohormonal", "Endocrine & Neurohormonal Balance"
            )
            
            renal_panel = PartBOrchestrator._generate_placeholder_panel(
                "renal_hydration", "Renal & Hydration Balance"
            )
            
            comprehensive_panel = PartBOrchestrator._generate_placeholder_panel(
                "comprehensive_integrated", "Comprehensive Integrated Physiological State"
            )
            
        except Exception as e:
            errors.append(f"Error generating panels: {str(e)}")
            return PartBGenerationResponse(
                status="error",
                errors=errors,
                generation_time_ms=int((time.time() - start_time) * 1000)
            )
        
        # Step 3: Aggregate statistics
        all_outputs = (
            metabolic_panel.outputs +
            lipid_panel.outputs +
            micronutrient_panel.outputs +
            inflammatory_panel.outputs +
            endocrine_panel.outputs +
            renal_panel.outputs +
            comprehensive_panel.outputs
        )
        
        total_outputs = len(all_outputs)
        successful_outputs = sum(1 for o in all_outputs if o.status == OutputStatus.SUCCESS)
        insufficient_outputs = sum(1 for o in all_outputs if o.status == OutputStatus.INSUFFICIENT_DATA)
        
        # Average confidence (only successful outputs)
        successful_confidences = [o.confidence_percent for o in all_outputs if o.status == OutputStatus.SUCCESS]
        avg_confidence = sum(successful_confidences) / len(successful_confidences) if successful_confidences else 0
        
        # Step 4: Build report
        report = PartBReport(
            report_id=f"partb_{user_id}_{int(datetime.utcnow().timestamp())}",
            user_id=user_id,
            submission_id=request.submission_id,
            report_generated_at=datetime.utcnow(),
            data_window_start=datetime.utcnow() - timedelta(days=request.time_window_days),
            data_window_end=datetime.utcnow(),
            metabolic_regulation=metabolic_panel,
            lipid_cardiometabolic=lipid_panel,
            micronutrient_vitamin=micronutrient_panel,
            inflammatory_immune=inflammatory_panel,
            endocrine_neurohormonal=endocrine_panel,
            renal_hydration=renal_panel,
            comprehensive_integrated=comprehensive_panel,
            total_outputs=total_outputs,
            successful_outputs=successful_outputs,
            insufficient_data_outputs=insufficient_outputs,
            average_confidence=round(avg_confidence, 1),
            data_quality_summary=requirements
        )
        
        # Step 5: Persist provenance records for successful outputs
        for output in all_outputs:
            if output.status == OutputStatus.SUCCESS:
                try:
                    provenance = ProvenanceHelper.create_provenance_record(
                        session=db,
                        user_id=user_id,
                        output_id=output.output_id,
                        panel_name=output.panel_name,
                        metric_name=output.metric_name,
                        output_type=output.measured_vs_inferred,
                        input_chain=output.input_chain,
                        raw_input_refs=output.input_references,
                        methodologies_used=output.methodologies_used,
                        method_why=" | ".join(output.method_why),
                        confidence_payload=output.confidence_payload,
                        confidence_percent=output.confidence_percent,
                        gating_payload=output.gating_payload,
                        gating_allowed="yes",
                        output_value=output.value_score,
                        output_range_low=output.value_range_low,
                        output_range_high=output.value_range_high,
                        output_units=output.units,
                        time_window_days=request.time_window_days
                    )
                    output.provenance_id = provenance.id
                except Exception as e:
                    warnings.append(f"Failed to create provenance for {output.metric_name}: {str(e)}")
        
        generation_time_ms = int((time.time() - start_time) * 1000)
        
        return PartBGenerationResponse(
            status="success" if successful_outputs == total_outputs else "partial",
            report=report,
            errors=errors,
            warnings=warnings,
            generation_time_ms=generation_time_ms
        )
    
    @staticmethod
    def _generate_metabolic_panel(
        db: Session,
        submission_id: int,
        user_id: int,
        request: PartBGenerationRequest
    ) -> PanelSection:
        """Generate metabolic regulation panel outputs."""
        outputs = []
        
        # 1. Estimated HbA1c Range
        outputs.append(
            MetabolicRegulationInference.estimate_hba1c_range(db, submission_id, user_id)
        )
        
        # 2. Insulin Resistance Probability
        outputs.append(
            MetabolicRegulationInference.compute_insulin_resistance_score(db, submission_id, user_id)
        )
        
        # 3. Metabolic Flexibility Score
        outputs.append(
            MetabolicRegulationInference.compute_metabolic_flexibility_score(db, submission_id, user_id)
        )
        
        # 4. Postprandial Dysregulation (placeholder for now)
        # 5. Prediabetes Trajectory (placeholder for now)
        
        return PanelSection(
            panel_name="metabolic_regulation",
            panel_display_name="Metabolic Regulation",
            outputs=outputs,
            summary_notes="Glucose metabolism and insulin resistance indicators"
        )
    
    @staticmethod
    def _generate_placeholder_panel(
        panel_name: str,
        panel_display_name: str
    ) -> PanelSection:
        """Generate placeholder panel for panels not yet fully implemented."""
        return PanelSection(
            panel_name=panel_name,
            panel_display_name=panel_display_name,
            outputs=[],
            summary_notes="Panel implementation in progress"
        )
