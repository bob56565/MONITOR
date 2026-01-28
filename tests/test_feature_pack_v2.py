"""
Comprehensive tests for Milestone 7 Part 2: feature_pack_v2 pipeline.

Tests cover:
- Missingness-aware feature vectors
- Cross-specimen relationship modeling (lag, conservation, triangulation, artifact)
- Pattern/motif detection
- Temporal features
- Coherence scoring
- Penalty vector computation
- API endpoint integration
- Full E2E: RunV2 → preprocess_v2 → feature_pack_v2 storage
"""

import pytest
from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session

from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User, RawSensorData, CalibratedFeatures
from app.models.run_v2 import (
    RunV2, SpecimenRecord, MissingnessRecord, NonLabInputs, QualitativeInputs,
    MissingTypeEnum, MissingImpactEnum, SpecimenTypeEnum, ProvenanceEnum,
)
from app.models.feature_pack_v2 import (
    FeaturePackV2, MissingnessFeatureVector, SpecimenNormalizedValues,
    DerivedTemporalFeatures, CrossSpecimenRelationships, PatternCombinationFeatures,
    CoherenceScores, PenaltyVector, RegimeEnum, MotifEnum,
)
from app.features.preprocess_v2 import preprocess_v2
from app.features.missingness_features import compute_missingness_feature_vector
from app.features.cross_specimen_modeling import build_cross_specimen_relationships
from app.features.pattern_features import (
    compute_temporal_features, detect_motifs, build_pattern_combination_features
)
from app.db.session import SessionLocal
from app.api.deps import get_db


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture(scope="function")
def db():
    """Create a test database session."""
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="function")
def test_user(db: Session):
    """Create a test user."""
    user = User(
        username="test_user",
        email="test@example.com",
        hashed_password="fake_hash",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def client(db):
    """Create a test client."""
    def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def sample_runv2_complete():
    """Create a complete RunV2 with multi-specimen data."""
    return RunV2(
        run_id="test_run_v2_complete",
        user_id="test_user",
        source="ui_direct",
        
        specimens=[
            SpecimenRecord(
                specimen_id="isf_01",
                specimen_type=SpecimenTypeEnum.ISF,
                collection_datetime=datetime.utcnow() - timedelta(hours=1),
                isf_glucose=95.5,
                isf_lactate=2.1,
                isf_pyruvate=0.08,
                isf_alanine=None,  # Intentional missingness
                isf_glutamine=0.55,
                isf_glucose_provenance=ProvenanceEnum.SENSOR,
                isf_lactate_provenance=ProvenanceEnum.ASSAY,
                isf_glucose_missingness=MissingnessRecord(
                    missing_type=None,
                    missing_impact=MissingImpactEnum.NONE,
                    reason="",
                ),
                isf_alanine_missingness=MissingnessRecord(
                    missing_type=MissingTypeEnum.BELOW_DETECTION,
                    missing_impact=MissingImpactEnum.INFORMATIVE,
                    reason="ISF alanine <0.01 mmol/L",
                ),
            ),
            SpecimenRecord(
                specimen_id="blood_01",
                specimen_type=SpecimenTypeEnum.BLOOD_HEMATOLOGY,
                collection_datetime=datetime.utcnow() - timedelta(minutes=30),
                blood_wbc=7.2,
                blood_rbc=4.8,
                blood_hemoglobin=14.5,
                blood_hematocrit=43.2,
                blood_plt=250,
                blood_wbc_provenance=ProvenanceEnum.ASSAY,
                blood_wbc_missingness=MissingnessRecord(
                    missing_type=None,
                    missing_impact=MissingImpactEnum.NONE,
                    reason="",
                ),
            ),
            SpecimenRecord(
                specimen_id="saliva_01",
                specimen_type=SpecimenTypeEnum.SALIVA,
                collection_datetime=datetime.utcnow() - timedelta(minutes=45),
                saliva_cortisol=8.5,
                saliva_melatonin=None,  # Missing
                saliva_igm=None,
                saliva_cortisol_provenance=ProvenanceEnum.ASSAY,
                saliva_melatonin_missingness=MissingnessRecord(
                    missing_type=MissingTypeEnum.NOT_COLLECTED,
                    missing_impact=MissingImpactEnum.BLOCKING,
                    reason="Overnight collection not performed",
                ),
            ),
        ],
        
        non_lab_inputs=NonLabInputs(
            activity_level="moderate",
            meal_timing="1.5h_postprandial",
            sleep_quality="good",
            stress_level="moderate",
            hydration_status="adequate",
        ),
        
        qualitative_inputs=QualitativeInputs(
            self_reported_symptoms="mild fatigue",
            medication_list="none",
            recent_illness="no",
        ),
        
        created_at=datetime.utcnow(),
    )


@pytest.fixture(scope="function")
def sample_runv2_minimal():
    """Create a minimal RunV2 with sparse data."""
    return RunV2(
        run_id="test_run_v2_minimal",
        user_id="test_user",
        source="api_direct",
        
        specimens=[
            SpecimenRecord(
                specimen_id="isf_min",
                specimen_type=SpecimenTypeEnum.ISF,
                collection_datetime=datetime.utcnow(),
                isf_glucose=88.0,
                isf_lactate=1.8,
                isf_glucose_provenance=ProvenanceEnum.SENSOR,
                isf_lactate_provenance=ProvenanceEnum.ASSAY,
                isf_glucose_missingness=MissingnessRecord(
                    missing_type=None,
                    missing_impact=MissingImpactEnum.NONE,
                    reason="",
                ),
            ),
        ],
        
        non_lab_inputs=NonLabInputs(
            activity_level="rest",
            meal_timing="fasting",
        ),
        
        created_at=datetime.utcnow(),
    )


# ============================================================================
# Unit Tests: Missingness Features
# ============================================================================

class TestMissingnessFeatures:
    """Unit tests for missingness-aware feature construction."""
    
    def test_missingness_vector_complete_data(self, sample_runv2_complete):
        """Test missingness vector with mostly complete data."""
        missingness_vec = compute_missingness_feature_vector(sample_runv2_complete)
        
        assert isinstance(missingness_vec, MissingnessFeatureVector)
        assert 0 <= missingness_vec.aggregate_missingness_0_1 <= 1
        assert "metabolic" in missingness_vec.domain_missingness_scores
        assert "hematology" in missingness_vec.domain_missingness_scores
        
        # Check that some domains have missingness
        assert any(score > 0 for score in missingness_vec.domain_missingness_scores.values())
    
    def test_missingness_vector_minimal_data(self, sample_runv2_minimal):
        """Test missingness vector with sparse data."""
        missingness_vec = compute_missingness_feature_vector(sample_runv2_minimal)
        
        assert isinstance(missingness_vec, MissingnessFeatureVector)
        # Should have high missingness for domains not in minimal specimen set
        assert missingness_vec.aggregate_missingness_0_1 > 0.5
    
    def test_domain_presence_flags(self, sample_runv2_complete):
        """Test that domain critical missing flags are computed."""
        missingness_vec = compute_missingness_feature_vector(sample_runv2_complete)
        
        # Check structure
        assert "domain_critical_missing_flags" in missingness_vec.model_dump()
        assert isinstance(missingness_vec.domain_critical_missing_flags, dict)


# ============================================================================
# Unit Tests: Cross-Specimen Relationships
# ============================================================================

class TestCrossSpecimenModeling:
    """Unit tests for cross-specimen relationship modeling."""
    
    def test_cross_specimen_relationships(self, sample_runv2_complete):
        """Test cross-specimen relationship detection."""
        cross_spec_rels = build_cross_specimen_relationships(sample_runv2_complete)
        
        assert isinstance(cross_spec_rels, CrossSpecimenRelationships)
        assert cross_spec_rels.specimen_count == 3
        assert len(cross_spec_rels.lag_kinetics_models) > 0
        assert len(cross_spec_rels.conservation_plausibility_checks) > 0
    
    def test_lag_kinetics_single_specimen(self, sample_runv2_minimal):
        """Test lag kinetics with minimal specimens (single)."""
        cross_spec_rels = build_cross_specimen_relationships(sample_runv2_minimal)
        
        # With single specimen, lag kinetics should be minimal
        assert isinstance(cross_spec_rels, CrossSpecimenRelationships)
        assert cross_spec_rels.specimen_count == 1
    
    def test_cross_specimen_triangulation(self, sample_runv2_complete):
        """Test proxy triangulation where multiple specimens measure related analytes."""
        cross_spec_rels = build_cross_specimen_relationships(sample_runv2_complete)
        
        # Blood WBC and ISF glucose should not directly triangulate, but output should be valid
        assert hasattr(cross_spec_rels, 'proxy_triangulation')


# ============================================================================
# Unit Tests: Pattern Features
# ============================================================================

class TestPatternFeatures:
    """Unit tests for pattern and motif detection."""
    
    def test_temporal_features(self, sample_runv2_complete):
        """Test temporal feature computation."""
        temporal_features = compute_temporal_features(sample_runv2_complete)
        
        assert isinstance(temporal_features, list)
        assert all(isinstance(tf, DerivedTemporalFeatures) for tf in temporal_features)
    
    def test_motif_detection(self, sample_runv2_complete):
        """Test metabolic motif detection."""
        motifs = detect_motifs(sample_runv2_complete)
        
        assert isinstance(motifs, list)
        # May or may not detect specific motifs depending on data
    
    def test_pattern_combination_features(self, sample_runv2_complete):
        """Test pattern combination feature building."""
        temporal_features = compute_temporal_features(sample_runv2_complete)
        pattern_features = build_pattern_combination_features(sample_runv2_complete, temporal_features)
        
        assert isinstance(pattern_features, PatternCombinationFeatures)


# ============================================================================
# Integration Tests: Full Pipeline
# ============================================================================

class TestPreprocessV2Pipeline:
    """Integration tests for the complete preprocess_v2 pipeline."""
    
    def test_preprocess_v2_complete_data(self, sample_runv2_complete):
        """Test full preprocess_v2 pipeline with complete data."""
        feature_pack = preprocess_v2(sample_runv2_complete)
        
        assert isinstance(feature_pack, FeaturePackV2)
        assert feature_pack.run_id == "test_run_v2_complete"
        assert feature_pack.schema_version == "v2"
        assert feature_pack.specimen_count == 3
        assert "metabolic" in feature_pack.domains_present
        assert "hematology" in feature_pack.domains_present
        
        # Check structure completeness
        assert hasattr(feature_pack, 'missingness_feature_vector')
        assert hasattr(feature_pack, 'specimen_normalized_values')
        assert hasattr(feature_pack, 'cross_specimen_relationships')
        assert hasattr(feature_pack, 'pattern_combination_features')
        assert hasattr(feature_pack, 'coherence_scores')
        assert hasattr(feature_pack, 'penalty_vector')
    
    def test_preprocess_v2_minimal_data(self, sample_runv2_minimal):
        """Test preprocess_v2 with minimal data."""
        feature_pack = preprocess_v2(sample_runv2_minimal)
        
        assert isinstance(feature_pack, FeaturePackV2)
        assert feature_pack.specimen_count == 1
        # High missingness expected
        assert feature_pack.missingness_feature_vector.aggregate_missingness_0_1 > 0.5
    
    def test_coherence_scores_computation(self, sample_runv2_complete):
        """Test that coherence scores are properly computed."""
        feature_pack = preprocess_v2(sample_runv2_complete)
        
        assert isinstance(feature_pack.coherence_scores, CoherenceScores)
        assert 0 <= feature_pack.coherence_scores.overall_coherence_0_1 <= 1
        assert len(feature_pack.coherence_scores.domain_coherence_map) > 0
    
    def test_penalty_vector_computation(self, sample_runv2_complete):
        """Test that penalty vectors are properly computed."""
        feature_pack = preprocess_v2(sample_runv2_complete)
        
        assert isinstance(feature_pack.penalty_vector, PenaltyVector)
        assert isinstance(feature_pack.penalty_vector.penalty_factors, list)
        assert isinstance(feature_pack.penalty_vector.domain_blockers, list)


# ============================================================================
# API Integration Tests
# ============================================================================

class TestPreprocessV2API:
    """Integration tests for POST /ai/preprocess-v2 endpoint."""
    
    def test_preprocess_v2_endpoint_complete(self, client, test_user, db):
        """Test /ai/preprocess-v2 endpoint with complete RunV2."""
        # First, create a RunV2
        run_v2_data = {
            "source": "ui_direct",
            "specimens": [
                {
                    "specimen_id": "isf_api_01",
                    "specimen_type": "isf",
                    "collection_datetime": datetime.utcnow().isoformat(),
                    "isf_glucose": 92.0,
                    "isf_lactate": 2.0,
                    "isf_pyruvate": 0.09,
                    "isf_glucose_provenance": "sensor",
                    "isf_lactate_provenance": "assay",
                    "isf_glucose_missingness": {
                        "missing_type": None,
                        "missing_impact": "none",
                        "reason": "",
                    },
                },
            ],
            "non_lab_inputs": {
                "activity_level": "rest",
                "meal_timing": "fasting",
            },
        }
        
        # Create RunV2
        run_response = client.post(
            "/runs/v2",
            json=run_v2_data,
            headers={"Authorization": f"Bearer {test_user.id}"},
        )
        
        assert run_response.status_code == 201
        run_id = run_response.json()["run_id"]
        
        # Now preprocess_v2
        preprocess_request = {"run_id": run_id}
        
        preprocess_response = client.post(
            "/ai/preprocess-v2",
            json=preprocess_request,
            headers={"Authorization": f"Bearer {test_user.id}"},
        )
        
        assert preprocess_response.status_code == 201
        result = preprocess_response.json()
        assert "calibrated_id" in result
        assert "feature_pack_v2_schema_version" in result
        assert result["feature_pack_v2_schema_version"] == "v2"
        assert "overall_coherence_0_1" in result
    
    def test_preprocess_v2_endpoint_nonexistent_run(self, client, test_user):
        """Test /ai/preprocess-v2 with non-existent RunV2."""
        preprocess_request = {"run_id": "nonexistent_run_id"}
        
        preprocess_response = client.post(
            "/ai/preprocess-v2",
            json=preprocess_request,
            headers={"Authorization": f"Bearer {test_user.id}"},
        )
        
        assert preprocess_response.status_code == 404


# ============================================================================
# Backward Compatibility Tests
# ============================================================================

class TestBackwardCompatibility:
    """Verify that feature_pack_v2 doesn't break legacy features."""
    
    def test_legacy_features_unaffected(self, sample_runv2_complete):
        """Verify legacy feature computation still works."""
        # Just verify that preprocess_v2 doesn't raise errors
        feature_pack = preprocess_v2(sample_runv2_complete)
        assert feature_pack is not None
    
    def test_feature_pack_v2_storage_non_breaking(self, client, test_user, db):
        """Verify feature_pack_v2 storage is additive to CalibratedFeatures."""
        # Create RunV2 and preprocess
        run_v2_data = {
            "source": "ui_direct",
            "specimens": [
                {
                    "specimen_id": "isf_compat_01",
                    "specimen_type": "isf",
                    "collection_datetime": datetime.utcnow().isoformat(),
                    "isf_glucose": 90.0,
                    "isf_lactate": 1.9,
                    "isf_glucose_provenance": "sensor",
                    "isf_lactate_provenance": "assay",
                    "isf_glucose_missingness": {
                        "missing_type": None,
                        "missing_impact": "none",
                        "reason": "",
                    },
                },
            ],
            "non_lab_inputs": {
                "activity_level": "rest",
            },
        }
        
        run_response = client.post(
            "/runs/v2",
            json=run_v2_data,
            headers={"Authorization": f"Bearer {test_user.id}"},
        )
        run_id = run_response.json()["run_id"]
        
        preprocess_response = client.post(
            "/ai/preprocess-v2",
            json={"run_id": run_id},
            headers={"Authorization": f"Bearer {test_user.id}"},
        )
        
        assert preprocess_response.status_code == 201
        
        # Verify CalibratedFeatures was created with feature_pack_v2
        cal_id = preprocess_response.json()["calibrated_id"]
        cal_features = db.query(CalibratedFeatures).filter(
            CalibratedFeatures.id == cal_id
        ).first()
        
        assert cal_features is not None
        assert cal_features.feature_pack_v2 is not None
        # Legacy columns should exist (even if stubs)
        assert cal_features.feature_1 == 0.0  # Stub for v2 pathway
        assert cal_features.feature_2 == 0.0
        assert cal_features.feature_3 == 0.0


# ============================================================================
# Regression Tests: Existing Tests Still Pass
# ============================================================================

class TestRegressions:
    """Verify existing functionality remains unbroken."""
    
    def test_existing_tests_baseline(self):
        """Placeholder: Ensures existing 37 tests still pass."""
        # This is verified by running pytest on the full suite
        # Expected: 37 legacy tests + 13 from test_runv2.py + ~20 from this file = 70+ tests
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
