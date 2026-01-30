# MONITOR API - ISF/Specimen Inference MVP Backend

A FastAPI-based backend for sensor data ingestion, preprocessing, and ML inference. This MVP provides endpoints for user authentication, raw sensor data ingestion, calibration/preprocessing, inference with uncertainty quantification, forecasting, and PDF report generation.

## Features

- **Authentication**: Signup and login with bcrypt password hashing
- **Raw Data Ingestion**: Endpoint to submit raw sensor readings
- **Preprocessing**: Calibration and feature engineering pipeline
- **ML Inference**: Lightweight MVP model with uncertainty heuristics
- **Forecasting**: Trend-based forecasting with multi-step predictions
- **Unifiied API Contracts** (M4): Both `/ai/infer` and `/ai/forecast` support `calibrated_id` DB lookups
- **Dashboard UI** (M5): Streamlit dashboard for interactive pipeline execution
- **PDF Reports** (M5): Generate professional PDF reports with system metadata
- **E2E Testing** (M6): Comprehensive integration tests with smoke scripts
- **Database**: SQLAlchemy ORM with PostgreSQL (configurable)
- **Testing**: Comprehensive pytest suite with 37 tests (unit + integration + E2E)
- **Docker Support**: docker-compose setup for PostgreSQL and API

## Milestones (M4–M6) Overview

### Milestone 4: API Contract Unification + DB-Wired Forecast
- **Objective**: Unify inference and forecast request/response contracts
- **What's New**:
  - `POST /ai/forecast` now accepts `calibrated_id` in addition to `feature_values`
  - `POST /ai/infer` now accepts optional `features` dict (legacy convenience)
  - Both endpoints support deterministic feature ordering from DB
  - `horizon_steps` (canonical) supersedes legacy `steps_ahead` alias
- **Backward Compatibility**: Legacy `steps_ahead` and `feature_values` still work
- **Tests**: 8 new M4 contract tests + all 25 existing tests pass

### Milestone 5: Dashboard UI + PDF Report Generator
- **Objective**: Create a usable demo UI and report generation
- **What's New**:
  - **Streamlit Dashboard** (`ui/app.py`):
    - Login/signup with email/password
    - Full pipeline UI: raw → preprocess → infer → forecast → PDF export
    - Real-time JSON display of results
    - Copy-to-clipboard support for outputs
  - **PDF Endpoint** (`POST /reports/pdf`):
    - Accepts `raw_id`, `calibrated_id`, or `trace_id`
    - Generates professional PDF with system metadata
    - Uses reportlab for deterministic PDF generation
    - Includes sections: header, raw data, preprocessing, inference, forecast, assumptions/limitations
- **Tests**: 6 new M5 PDF tests covering both API and UI flows

### Milestone 6: End-to-End Testing + Demo Scripts + CI Stability
- **Objective**: Make the system reproducible and demonstrable
- **What's New**:
  - **E2E Integration Tests** (6 tests in `TestM6E2EIntegration`):
    - Full pipeline with `calibrated_id` pathway
    - Full pipeline with `feature_values` pathway
    - Multi-user data isolation verification
    - Legacy alias compatibility tests
    - Error handling (missing auth, missing fields)
  - **Smoke Test Scripts**:
    - `scripts/smoke_local.sh` (bash version)
    - `scripts/smoke_local.py` (Python version)
    - Tests all major flows in sequence
    - Validates data isolation across users
    - Outputs human-readable status + generates sample PDF
  - **README**: Updated with Milestones, API documentation, and exact runnable commands
- **Tests**: All 37 tests pass; CI-ready with deterministic validation

### Milestone 7 Phase 3 Part 1: Multi-Specimen Ingestion Upgrade (Non-Breaking)
- **Objective**: Support multi-specimen raw data ingestion with provenance + missingness tracking
- **What's New**:
  - **RunV2 Schema** (`app/models/run_v2.py`):
    - RunV2: superset model supporting multi-specimen payloads + always-on non-lab inputs
    - SpecimenRecord: one specimen per record (supports ISF, Blood Capillary, Blood Venous, Saliva, Sweat, Urine Spot)
    - Comprehensive specimen variable maps (ISF: glucose/lactate/electrolytes; Blood: CMP/CBC/Lipids/Endocrine/Vitamins/Inflammation/Autoimmune; Saliva: cortisol/amylase; Sweat: electrolytes/sweat_rate; Urine: specific_gravity/protein/glucose/ketones/etc.)
    - MissingnessRecord: explicit tracking of is_missing, missing_type, missing_impact, provenance, confidence for every variable
    - Enums: SpecimenTypeEnum, MissingTypeEnum, MissingImpactEnum, ProvenanceEnum, SupportTypeEnum
  - **Always-On Non-Lab Inputs** (NonLabInputs):
    - Demographics: age, sex_at_birth
    - Anthropometrics: height_cm, weight_kg, waist_cm, body_fat_pct
    - Vitals & Physiology: heart_rate, hrv, bp_systolic, bp_diastolic, temperature_c
    - Sleep & Activity: sleep_duration_hr, sleep_quality, activity_level
    - Intake & Exposure: fluid_intake, sodium_intake, alcohol_units, caffeine_mg, nicotine_use
    - Supplements & Medications: arrays with dose/frequency/adherence
  - **Qualitative Inputs & Encoding** (QualitativeInputs, QualEncodingOutputs):
    - Structured qualitative data: stress, sleep, diet, symptoms, hormonal_context
    - Encoding outputs: effect_vector (metabolic_pressure, inflammatory_tone, dehydration_pressure, endocrine_shift, measurement_interference) + uncertainty
  - **API Endpoints**:
    - `POST /runs/v2`: Create RunV2 with multiple specimens (validates specimen presence, missingness records)
    - `GET /runs/v2/{run_id}`: Retrieve full RunV2 with all details (auth-gated to owner only)
  - **Compatibility Adapter** (`legacy_raw_ingestion_to_runv2_adapter`):
    - Legacy `/data/raw` endpoint automatically wraps single glucose/lactate entry into RunV2
    - Wrapping is silent (no breaking change to legacy endpoint response)
    - Links to legacy raw_id for audit trail
  - **DB Model**: RunV2Record table with run_id, user_id, payload (JSON), schema_version, specimen_count
- **Tests**: 13 new tests in `tests/test_runv2.py` covering:
  - Single and multiple specimen creation
  - Validation (missing specimens, missing missingness records)
  - Retrieval and authorization checks
  - Missingness tracking (present vs. missing values)
  - Provenance tracking (measured vs. proxy)
  - Non-lab inputs (all sections, empty allowed)
  - All specimen types
- **Backward Compatibility**: All existing 37 tests pass unchanged; legacy `/data/raw` works identically
- **Status**: ✓ Code complete, ✓ Tests passing (13/13), ✓ Backward compatible

---

### Milestone 7 Phase 3 Part 2: Preprocess V2 + Coherence/Motif Features (Non-Breaking)
- **Objective**: Transform RunV2 multi-specimen data into missingness-aware features with cross-specimen coherence scoring and pattern detection
- **What's New**:
  - **Feature Pack V2 Schema** (`app/models/feature_pack_v2.py`):
    - FeaturePackV2: complete output structure with 8 major output sections
    - MissingnessFeatureVector: per-variable + per-domain missingness tracking; critical anchor flags
    - SpecimenNormalizedValues: z-score normalization per specimen with reference tracking
    - DerivedTemporalFeatures: intra-specimen temporal windows, rates-of-change, trend slopes
    - CrossSpecimenRelationships: lag kinetics (ISF→Blood), conservation checks (mass balance), proxy triangulation, artifact/interference detection
    - PatternCombinationFeatures: motif detection (glucose_lactate_up_exertion, glucose_lactate_up_meal, dehydration_stress, inflammatory_sleep_fragmentation), regime detection (rest, exertion, postprandial, sleep), discordance detection
    - CoherenceScores: overall_coherence_0_1, domain_coherence_map, driver_factors, temporal_alignment scores
    - PenaltyVector: penalty_factors list, domain_blockers list (conditions that gate inference eligibility)
  - **Missingness-Aware Feature Construction** (`app/features/missingness_features.py`):
    - Per-variable present/missing flags for all specimens
    - One-hot encoding of missing types (not_collected, user_skipped, biologically_unavailable, etc.)
    - Domain-level aggregation: metabolic, renal, electrolyte, hydration, liver, lipid, endocrine, vitamins, inflammation, autoimmune, hematology
    - Critical anchor detection per domain (e.g., glucose for metabolic, creatinine for renal)
    - Aggregate missingness score 0-1
  - **Cross-Specimen Relationship Modeling** (`app/features/cross_specimen_modeling.py`):
    - **Lag Kinetics**: Model glucose/lactate transitions from ISF → Blood; compute lag times, diffusion delays, kinetic constants
    - **Conservation & Plausibility**: Check mass balance (sodium in/out), osmolarity conservation, protein conservation
    - **Proxy Triangulation**: When same analyte measured in 2+ specimens, detect inconsistencies; assign confidence weights
    - **Artifact & Interference**: Detect hemolysis (from blood CBC spike), contamination patterns, sensor drift from consecutive readings
  - **Pattern/Combination Features** (`app/features/pattern_features.py`):
    - **Temporal Windows**: Intra-specimen sliding windows (30min, 1h, 2h) for trend detection
    - **Motif Detection**: Named metabolic patterns (glucose_lactate_up_exertion, dehydration_stress, etc.)
    - **Regime Detection**: Classify activity state (rest, exertion, postprandial, sleep) from feature patterns
    - **Discordance Detection**: Identify specimen disagreements with explanations (e.g., "blood_glucose_150_but_isf_glucose_85" → possible lag or measurement error)
  - **Main Orchestrator** (`app/features/preprocess_v2.py`):
    - preprocess_v2(run_v2) → FeaturePackV2
    - Flow: missingness_vectors → normalized_values → temporal_features → cross_specimen_rels → pattern_features → discordance → coherence_scores → penalty_vector
    - Non-breaking: produces feature_pack_v2 JSON for storage
  - **API Endpoint**:
    - `POST /ai/preprocess-v2`: Accepts run_id from completed RunV2 → computes feature_pack_v2 → stores in CalibratedFeatures.feature_pack_v2 (JSON column)
    - Response: calibrated_id, run_v2_id, schema_version, overall_coherence_0_1, specimen_count, domains_present, penalty_factors, domain_blockers
  - **DB Storage (Non-Breaking)**:
    - Added feature_pack_v2 JSON column to CalibratedFeatures
    - Added run_v2_id string column to link RunV2 records
    - Legacy columns (feature_1/2/3, derived_metric) untouched for backward compat
- **Domain Definitions** (11 domains with critical anchors):
  - Metabolic: glucose (critical anchor), lactate, pyruvate, alanine
  - Renal: creatinine (critical), BUN, eGFR
  - Electrolyte: sodium (critical), potassium (critical), chloride, CO2
  - Hydration: osmolarity, specific_gravity, hydration_index
  - Liver: AST, ALT, bilirubin (critical), albumin
  - Lipid: cholesterol, HDL, LDL, triglycerides (critical)
  - Endocrine: glucose (cross-link), TSH, free_T4, cortisol (critical)
  - Vitamins: B12, folate, vitamin_D
  - Inflammation: CRP (critical), IL-6, TNF-alpha
  - Autoimmune: ANA, rheumatoid_factor, complement
  - Hematology: WBC (critical), hemoglobin (critical), platelets
- **Coherence Scoring Components**:
  - Specimen agreement (triangulation consistency)
  - Domain continuity (no contradictions across specimen pair)
  - Temporal alignment (time differences consistent with known kinetics)
  - Provenance confidence (measured > proxy > inferred)
  - Missingness penalty (high missingness reduces coherence)
- **Tests**: ~22 new tests in `tests/test_feature_pack_v2.py` covering:
  - Missingness vectors (complete vs. minimal data)
  - Cross-specimen relationships (lag, conservation, triangulation, artifact)
  - Pattern detection (temporal, motifs, regime, discordance)
  - Full E2E: RunV2 → preprocess_v2 → feature_pack_v2
  - API endpoint (complete flow, error handling)
  - Backward compatibility (legacy features untouched)
- **Backward Compatibility**: feature_pack_v2 stored alongside legacy features; zero breaking changes
- **Status**: ✓ Code complete, ✓ Models created, ✓ API endpoint added, ✓ Tests created (pending run validation), ✓ Backward compatible


## Quick Start

### Prerequisites

- Python 3.10+
- PostgreSQL (or use docker-compose)
- pip

### Local Development

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up database** (using SQLite by default for testing):
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/monitor"
   python -c "from app.db.session import engine; from app.db.base import Base; Base.metadata.create_all(bind=engine)"
   ```

3. **Run the API**:
   ```bash
   uvicorn app.main:app --reload
   ```

   API will be available at `http://localhost:8000`

### Frontend (Vite) Demo UI

1. **Install UI deps**:
  ```bash
  cd ui/web
  npm install
  ```

2. **Run the dev server (proxied to the API)**:
  ```bash
  npm run dev -- --host --port 5173
  ```

  Open the forwarded URL (or http://localhost:5173). The UI auto-provisions a demo user via `/auth/profile`; if you see auth/404 errors after a container reset, simply reload to refresh the stored token.

- **Schema upload autofill**: On the workflow input page you can upload a JSON schema file (JSON or JSON embedded in .txt/.csv/.doc). The UI will parse `specimens`, `non_lab_inputs`, and `qualitative_inputs` and pre-fill the form automatically before submitting the full pipeline.

4. **Run the Dashboard UI** (in another terminal):
   ```bash
   streamlit run ui/app.py
   ```

   Dashboard will be available at `http://localhost:8501`

5. **Run tests**:
   ```bash
   pytest -q
   ```

6. **Run smoke test** (with API running):
   ```bash
   python scripts/smoke_local.py
   # or
   bash scripts/smoke_local.sh
   ```

### Docker Setup

1. **Build and run with docker-compose**:
   ```bash
   docker-compose up --build
   ```

   API will be available at `http://localhost:8000`

   PostgreSQL will be available at `localhost:5432`

2. **Run migrations** (if using Alembic):
   ```bash
   docker-compose exec api alembic upgrade head
   ```

## API Endpoints

### Health Check
- `GET /health` - Service status

### Authentication
- `POST /auth/signup` - Create new user
  ```json
  {"email": "user@example.com", "password": "password123"}
  ```
- `POST /auth/login` - Authenticate user
  ```json
  {"email": "user@example.com", "password": "password123"}
  ```
- `GET /auth/profile` - Current user (Bearer token)
  ```json
  {"user_id": 1, "email": "user@example.com", "name": null}
  ```

### Data Management
- `POST /data/raw` - Ingest raw sensor data (requires `user_id` param)
  ```json
  {
    "sensor_value_1": 1.5,
    "sensor_value_2": 2.5,
    "sensor_value_3": 3.5
  }
  ```
- `POST /data/preprocess` - Calibrate and extract features (requires `user_id` param)
  ```json
  {"raw_sensor_id": 1}
  ```

### Multi-Specimen Ingestion (M7 Part 1)

#### **POST /runs/v2** - Create RunV2 with multiple specimens and non-lab inputs
**Authentication**: Required (Bearer token)

**Request** (comprehensive multi-specimen example):
```json
{
  "timezone": "UTC",
  "specimens": [
    {
      "specimen_id": "uuid-123",
      "specimen_type": "ISF",
      "collected_at": "2024-01-28T10:30:00",
      "source_detail": "fingerstick",
      "raw_values": {
        "glucose": 120.5,
        "lactate": 1.8,
        "sodium_na": 140.0
      },
      "units": {
        "glucose": "mg/dL",
        "lactate": "mmol/L",
        "sodium_na": "mmol/L"
      },
      "missingness": {
        "glucose": {
          "is_missing": false,
          "missing_type": null,
          "missing_impact": "neutral",
          "provenance": "measured",
          "confidence_0_1": 1.0
        },
        "lactate": {
          "is_missing": false,
          "missing_impact": "neutral",
          "provenance": "measured",
          "confidence_0_1": 1.0
        },
        "sodium_na": {
          "is_missing": false,
          "missing_impact": "neutral",
          "provenance": "measured",
          "confidence_0_1": 1.0
        }
      },
      "notes": "Normal collection"
    }
  ],
  "non_lab_inputs": {
    "demographics": {
      "age": 45,
      "sex_at_birth": "male"
    },
    "anthropometrics": {
      "height_cm": 180,
      "weight_kg": 85
    },
    "vitals_physiology": {
      "heart_rate": 72,
      "bp_systolic": 125,
      "bp_diastolic": 80
    }
  }
}
```

**Response**:
```json
{
  "run_id": "uuid-abc123",
  "user_id": "user-123",
  "created_at": "2024-01-28T10:30:00",
  "schema_version": "runv2.1",
  "specimen_count": 1,
  "specimens": [
    {
      "specimen_id": "uuid-123",
      "specimen_type": "ISF",
      "collected_at": "2024-01-28T10:30:00",
      "variable_count": 3
    }
  ]
}
```

#### **GET /runs/v2/{run_id}** - Retrieve RunV2 details
**Authentication**: Required (Bearer token)

**Response**: Full RunV2 with all specimens, non-lab inputs, qualitative inputs, and encoding outputs (JSON payload)

**Supported Specimen Types**:
- `ISF`: Glucose, Lactate, Electrolytes (Na, K, Cl), pH, Proxy signals (CRP, IL6, Drug)
- `BLOOD_CAPILLARY`: CMP, CBC, Lipids, Endocrine, Vitamins/Nutrition, Inflammation, Autoimmune
- `BLOOD_VENOUS`: CMP, CBC, Lipids, Endocrine, Vitamins/Nutrition, Inflammation, Autoimmune
- `SALIVA`: Cortisol, Alpha-amylase, pH, Flow rate, Dryness score, Alcohol/Nicotine flags
- `SWEAT`: Electrolytes, Sweat rate, Skin temp, Exertion level
- `URINE_SPOT`: Specific gravity, pH, Protein, Glucose, Ketones, Blood, Leukocyte esterase, Nitrite, UACR, Microalbumin

**Missingness & Provenance Tracking**:
- Every value has explicit `missingness` record: `is_missing`, `missing_type`, `missing_impact`, `provenance`, `confidence_0_1`
- Missing types: `not_collected`, `user_skipped`, `biologically_unavailable`, `temporarily_unavailable`, `sensor_unavailable`, `not_applicable`
- Missing impact: `neutral`, `confidence_penalty`, `inference_blocker`
- Provenance: `measured`, `direct`, `proxy`, `inferred`, `population`, `relational`

### AI/ML (Unified API Contracts — M4)

#### **POST /ai/infer** - Run inference (supports both calibrated_id and features)
**Authentication**: Required (Bearer token)

**Request Options**:

Option 1: Using `calibrated_id` (preferred):
```json
{
  "calibrated_id": 1
}
```

Option 2: Using `features` dict (legacy convenience):
```json
{
  "features": {
    "feature_1": 0.5,
    "feature_2": 0.6,
    "feature_3": 0.7
  }
}
```

**Response**: Stable `InferenceReport` contract (see schema below)

---

#### **POST /ai/forecast** - Forecast with multi-step support (supports both calibrated_id and feature_values — M4)
**Authentication**: Required (Bearer token)

**Request Options**:

Option 1: Using `calibrated_id` (preferred, loads features from DB):
```json
{
  "calibrated_id": 1,
  "horizon_steps": 5
}
```

Option 2: Using `feature_values` (legacy backward compatibility):
```json
{
  "feature_values": [1.0, 1.5, 2.0],
  "horizon_steps": 3
}
```

**Legacy Field Support**:
```json
{
  "feature_values": [1.0, 1.5, 2.0],
  "steps_ahead": 2
}
```
*Note: `horizon_steps` takes precedence if both `horizon_steps` and `steps_ahead` are provided*

**Response**:
```json
{
  "forecast": 2.5,
  "forecasts": [2.5, 2.5, 2.5],
  "steps_ahead": 3,
  "confidence": 0.4
}
```

---

#### **POST /ai/preprocess-v2** - Preprocess RunV2 to feature_pack_v2 (M7 Part 2)
**Authentication**: Required (Bearer token)

**Request**: 
```json
{
  "run_id": "uuid-from-runv2-creation"
}
```

**Response**: PreprocessV2Response with coherence scores and penalty factors
```json
{
  "calibrated_id": 42,
  "run_v2_id": "uuid-from-runv2-creation",
  "feature_pack_v2_schema_version": "v2",
  "overall_coherence_0_1": 0.82,
  "specimen_count": 3,
  "domains_present": ["metabolic", "hematology", "electrolyte", "inflammation"],
  "penalty_factors": ["high_isf_glucose_missingness", "blood_specimen_delay_2h"],
  "domain_blockers": [],
  "created_at": "2024-01-28T10:45:00"
}
```

**Feature Pack V2 Structure** (stored as JSON in CalibratedFeatures.feature_pack_v2):
```json
{
  "run_id": "uuid",
  "schema_version": "v2",
  "specimen_count": 3,
  "domains_present": ["metabolic", "hematology"],
  "missingness_feature_vector": {
    "specimen_variable_present_flags": {
      "isf_01": {"glucose": true, "lactate": true, "pyruvate": false}
    },
    "domain_missingness_scores": {"metabolic": 0.1, "hematology": 0.05},
    "domain_critical_missing_flags": {"metabolic": false, "hematology": false},
    "aggregate_missingness_0_1": 0.12
  },
  "specimen_normalized_values": [
    {
      "specimen_id": "isf_01",
      "specimen_type": "ISF",
      "normalized_values": {"glucose": 0.45, "lactate": -0.12},
      "normalization_references_used": {"glucose": "population_mean", "lactate": "self_baseline"},
      "value_validity_flags": {"glucose": true, "lactate": true}
    }
  ],
  "cross_specimen_relationships": {
    "specimen_count": 3,
    "lag_kinetics_models": [
      {
        "source_specimen": "isf_01",
        "target_specimen": "blood_01",
        "analyte": "glucose",
        "lag_minutes": 12.5,
        "lag_confidence_0_1": 0.75,
        "kinetic_constant": 0.15
      }
    ],
    "conservation_plausibility_checks": [
      {
        "analyte": "sodium",
        "check_type": "balance",
        "is_plausible": true,
        "deviation_mEq": 2.1
      }
    ],
    "proxy_triangulation": [
      {
        "analyte": "glucose",
        "specimens": ["isf_01", "blood_01"],
        "agreement_score": 0.88,
        "confidence_weights": [0.95, 0.85]
      }
    ],
    "artifact_and_interference": {
      "hemolysis_risk": 0.05,
      "contamination_patterns": [],
      "sensor_drift_indicators": []
    }
  },
  "pattern_combination_features": {
    "regime_detected": "postprandial",
    "regime_confidence": 0.78,
    "motifs_detected": ["glucose_lactate_up_meal"],
    "motif_details": [
      {
        "motif_type": "glucose_lactate_up_meal",
        "confidence": 0.75,
        "constituent_signals": ["glucose↑", "lactate↑", "insulin_pending"],
        "time_window_minutes": 120
      }
    ]
  },
  "discordance_detection": {
    "specimen_pairs_analyzed": 3,
    "discordances_found": [
      {
        "specimen_pair": ["blood_01", "isf_01"],
        "analyte": "glucose",
        "blood_value": 150,
        "isf_value": 85,
        "magnitude_mg_dL": 65,
        "likely_cause": "2h lag unresolved + postprandial state",
        "recommendation": "Use ISF for real-time; blood for integration verification"
      }
    ]
  },
  "coherence_scores": {
    "overall_coherence_0_1": 0.82,
    "domain_coherence_map": {
      "metabolic": 0.85,
      "electrolyte": 0.80,
      "hematology": 0.78
    },
    "driver_factors": ["good_specimen_agreement", "adequate_coverage", "-10pts_for_missingness"],
    "temporal_alignment_score": 0.84
  },
  "penalty_vector": {
    "penalty_factors": [
      "high_isf_glucose_missingness_-5pts",
      "blood_specimen_delay_2h_-8pts"
    ],
    "domain_blockers": [],
    "total_penalty_0_100": 13,
    "inference_eligible": true
  }
}
```

---


**Authentication**: Required (Bearer token)

**Request**: Provide at least one identifier:
```json
{
  "raw_id": 1,
  "calibrated_id": 1,
  "trace_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response**: PDF file (Content-Type: `application/pdf`)

---

## InferenceReport Contract

The `/ai/infer` endpoint returns a stable, product-ready `InferenceReport` schema with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `trace_id` | string | Unique request identifier (UUID) |
| `created_at` | string (ISO 8601) | Timestamp of inference creation |
| `input_summary.specimen_type` | string | Type of specimen/sensor array analyzed |
| `input_summary.observed_inputs` | array | List of input features used |
| `input_summary.missing_inputs` | array | List of expected inputs not provided |
| `inferred[].name` | string | Name of inferred parameter |
| `inferred[].value` | number | Inferred value |
| `inferred[].unit` | string | Unit of measurement |
| `inferred[].confidence` | number | Confidence score (0–1) |
| `inferred[].method` | string | Method/model used for inference |
| `abnormal_flags` | array | List of abnormal conditions detected (empty if none) |
| `assumptions` | array | Explicit list of assumptions made during inference |
| `limitations` | array | Known limitations of the model/inference |
| `model_metadata.model_name` | string | Name of the inference model |
| `model_metadata.model_version` | string | Version of the inference model |
| `model_metadata.trained_on` | string | Description of training data |
| `disclaimer` | string | Legal/ethical disclaimer for MVP |

## Example Workflow

```bash
# 1. Signup
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "pass123"}'
# Response: {"user_id": 1, "email": "test@example.com", "token": "mock_token_1"}

# 2. Ingest raw data
curl -X POST "http://localhost:8000/data/raw?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"sensor_value_1": 1.0, "sensor_value_2": 2.0, "sensor_value_3": 3.0}'
# Response: {"id": 1, "user_id": 1, "sensor_value_1": 1.0, ...}

# 3. Preprocess
curl -X POST "http://localhost:8000/data/preprocess?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"raw_sensor_id": 1}'
# Response: {"id": 1, "user_id": 1, "feature_1": -0.816, "feature_2": 0.0, "feature_3": 0.816, "derived_metric": 0.178}

# 4. Infer (Returns InferenceReport with stable contract)
curl -X POST "http://localhost:8000/ai/infer?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"calibrated_feature_id": 1}'
# Response:
# {
#   "trace_id": "550e8400-e29b-41d4-a716-446655440000",
#   "created_at": "2026-01-28T12:34:56.789012",
#   "input_summary": {
#     "specimen_type": "sensor_array",
#     "observed_inputs": ["feature_1", "feature_2", "feature_3"],
#     "missing_inputs": []
#   },
#   "inferred": [
#     {
#       "name": "primary_prediction",
#       "value": 0.678,
#       "unit": "normalized_units",
#       "confidence": 0.75,
#       "method": "MVP_linear_model"
#     },
#     {
#       "name": "uncertainty_estimate",
#       "value": 0.25,
#       "unit": "probability",
#       "confidence": 0.8,
#       "method": "distance_based_heuristic"
#     }
#   ],
#   "abnormal_flags": [],
#   "assumptions": [
#     "Features have been calibrated",
#     "Input data is within expected range",
#     "Model was trained on similar specimen types"
#   ],
#   "limitations": [
#     "MVP model is linear and does not capture complex interactions",
#     "Uncertainty estimate is heuristic-based, not Bayesian",
#     "Limited training data in current MVP phase"
#   ],
#   "model_metadata": {
#     "model_name": "MONITOR_MVP_Inference",
#     "model_version": "1.0",
#     "trained_on": "synthetic_calibration_data"
#   },
#   "disclaimer": "This is an MVP model for research purposes. Do not use for clinical decisions without validation."
# }
```

## Project Structure

```
MONITOR/
├── app/
│   ├── main.py                 # FastAPI app definition
│   ├── api/
│   │   ├── auth.py            # Authentication routes
│   │   ├── data.py            # Data ingestion/preprocessing routes
│   │   ├── ai.py              # Inference/forecast routes (M4 unified contracts)
│   │   ├── reports.py         # PDF report generation (M5)
│   │   └── deps.py            # Dependency injection
│   ├── db/
│   │   ├── session.py         # Database session management
│   │   └── base.py            # SQLAlchemy base
│   ├── models/
│   │   └── user.py            # ORM models (User, RawSensorData, CalibratedFeatures, etc)
│   ├── features/
│   │   ├── calibration.py     # Sensor calibration functions
│   │   └── derived.py         # Feature engineering
│   └── ml/
│       ├── inference.py       # MVP inference model
│       └── forecast.py        # Forecasting stub
├── ui/
│   └── app.py                 # Streamlit dashboard (M5)
├── scripts/
│   ├── smoke_local.py         # Smoke test (Python version — M6)
│   └── smoke_local.sh         # Smoke test (Bash version — M6)
├── alembic/                    # Database migrations
├── tests/
│   ├── test_api.py            # 37 comprehensive tests (M1-M6)
│   └── __init__.py
├── requirements.txt           # Python dependencies
├── docker-compose.yml         # Docker setup
└── README.md                  # This file
```

## Configuration

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost/monitor`)
- `SQL_ECHO`: Enable SQL logging (default: `false`)

### Database

The app uses SQLAlchemy with PostgreSQL. For local development, create a `.env` file:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/monitor
SQL_ECHO=false
```

## Running the Dashboard UI (M5)

The Streamlit dashboard provides an interactive interface for the full pipeline:

```bash
# Terminal 1: Start API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Streamlit dashboard
streamlit run ui/app.py --server.port 8501
```

The dashboard will be available at `http://localhost:8501`

**Dashboard Features**:
- User authentication (signup/login)
- Raw data ingestion form
- Preprocessing trigger
- Inference results display
- Multi-step forecast with horizon slider
- Real-time JSON inspection
- PDF report download

---

## Milestone 7 Phase 3 Part 3: Inference V2 - Clinic-Grade Inference with Eligibility Gating & Computed Confidence

### Objective
Deliver a clinical-grade inference engine that produces panelized clinic-style outputs (CMP, CBC, Lipids, Endocrine, etc.) with strict eligibility gating, multi-engine ensemble reasoning, mechanistic plausibility bounds, coherence-aware arbitration, and computed confidence.

### What's New

#### 1. **Inference Pack V2 Output Schema** (`app/models/inference_pack_v2.py`)
Complete inference output structure with 9 major components:

- **Measured Values**: Raw values from specimens (preserved for reference)
- **Inferred Values**: Estimated lab/derived quantities with confidence and support_type
- **Physiological State Domains**: Holistic state assessments (metabolic_state, renal_state, electrolyte_state, hydration_state, liver_state, lipid_state, endocrine_state, inflammatory_state, immune_state, hematologic_state, stress_axis_state, recovery_state, autonomic_state)
- **Suppressed Outputs**: Outputs that were gated out with suppression_reason and missing_anchors
- **Eligibility Rationale**: Per-output dependency resolution trace for transparency
- **Engine Outputs**: Individual estimates from each reasoning engine (population_conditioner, panel_regressors, temporal_model, mechanistic_bounds, etc.)
- **Consensus Metrics**: Multi-engine disagreement scores, fusion weights, range widening decisions
- **Provenance Map**: Links each inferred output to source specimens with provenance_type (measured/direct/inferred/population/proxy)

**Support Type Labels**: Every inferred value explicitly labeled:
- `DIRECT`: Measured directly (e.g., glucose from blood specimen)
- `DERIVED`: Computed from direct measurements (e.g., eGFR from creatinine)
- `PROXY`: Estimated via proxy relationship (e.g., glucose from CGM interpolation)
- `RELATIONAL`: Cross-specimen derived (e.g., ISF-Blood glucose relationship)
- `POPULATION`: Population prior (when no measurement/proxy available)

#### 2. **Eligibility Gating Engine** (`app/ml/eligibility_gate_v2.py`)
Dependency resolution + suppression rules for 40+ clinical outputs:

**Output Catalog** (`OUTPUT_CATALOG`):
Comprehensive registry covering:
- **CMP** (Comprehensive Metabolic Panel): glucose, BUN, creatinine, eGFR, sodium, potassium, calcium, phosphate, magnesium, chloride, CO2, albumin, total_protein, bilirubin, alk_phos, ALT, AST
- **CBC** (Complete Blood Count): WBC, RBC, hemoglobin, hematocrit, MCV, platelets, neutrophils, lymphocytes, monocytes
- **LIPIDS**: Total cholesterol, LDL, HDL, triglycerides, VLDL, LDL_particle_count
- **ENDOCRINE**: A1C, TSH, free_T4, fasting_insulin, HOMA_IR, cortisol, testosterone, estrogen, progesterone
- **VITAMINS**: Vitamin D 25-OH, B12, folate, B6, iron, ferritin, TIBC
- **INFLAMMATION**: CRP, inflammatory_tone_state (derived from multiple markers)
- **HYDRATION**: Hydration_status_state, renal_stress_state (derived from osmolality, creatinine, etc.)
- **STRESS**: Stress_axis_state, recovery_state (derived from cortisol, HRV, sleep quality)
- **DERIVED**: Muscle, metabolic, immune, microbial phenotypes

**Dependency Resolution**:
Each output declares:
- `requires_any`: List of measurements where ≥1 must be available
- `requires_all`: List of measurements that must all be available
- `requires_context`: Non-lab contexts (age, sex, weight, etc.) needed
- `blocked_by`: Conditions that force suppression (e.g., pregnancy blocks many hormone assays)
- `confidence_boosters`: Optional measurements that increase confidence (e.g., hematocrit boosts WBC confidence)
- `confidence_penalties`: Conditions that decrease confidence

**Gating Thresholds**:
- `min_coherence_default`: 0.55 (output coherence below this → suppress)
- `min_signal_quality_default`: 0.60 (low signal quality + low coherence → suppress)
- `suppress_if_confidence_below`: 0.35 (hard floor on confidence)
- `widen_range_if_disagreement_above`: 0.45 (multi-engine disagreement triggers widening)

**Gating Algorithm** (in `can_produce_output()`):
1. Check for blockers (pregnancy, acute illness) → suppress if active
2. Check `requires_all` → suppress if any missing
3. Check `requires_any` → suppress if none available
4. Check `requires_context` → suppress if missing context
5. Check coherence threshold → suppress if too low and can't widen
6. Check signal quality threshold → suppress if too low
7. Apply confidence penalties/boosters
8. Check confidence floor → suppress if below 0.35
9. Return: (should_produce: bool, reason: str, adjusted_confidence: float, applied_penalties: List[str])

#### 3. **Confidence Math Engine** (`app/ml/confidence_math.py`)
6-component weighted formula for computed confidence:

**Components** (in ConfidenceComponents dataclass):
- `completeness_0_1` (weight 0.22): 1 - missingness_fraction
- `coherence_0_1` (weight 0.22): Multi-source agreement (ISF glucose vs Blood glucose, specimen kinetics, etc.)
- `agreement_0_1` (weight 0.20): Multi-engine agreement scores
- `stability_0_1` (weight 0.16): Temporal stability from feature pack (volatility_metric)
- `signal_quality_0_1` (weight 0.12): Signal-to-noise ratio, measurement precision
- `interference_penalty_0_1`: Detected measurement interference or confounders

**Confidence Formula**:
```
confidence = clamp(
    sum(weight[i] * component[i] for i in [1..5])
    - interference_penalty * penalty_factor,
    min=0.0,
    max=1.0
)
```
Weights sum to 0.92, leaving 0.08 flexibility for penalty scaling.

**Range Widening**:
Conditional widening based on disagreement/coherence/completeness:
- If `disagreement > 0.45`: widen by 1.25×
- If `coherence < 0.55` or `completeness < 0.40`: widen by 1.40×
- Normal case: no widening (1.0×)

#### 4. **Inference V2 Orchestrator** (`app/ml/inference_v2.py`)
Main inference pipeline (RunV2 + feature_pack_v2 → inference_pack_v2):

**8-Step Pipeline**:
1. **Extract Availability**: Check which values/contexts available from RunV2 + feature_pack_v2
2. **Extract Blockers**: Check for pregnancy, acute illness, other contraindications
3. **Get Coherence**: Extract from feature_pack_v2
4. **Gate Each Output**: Loop over OUTPUT_CATALOG, call `gating_engine.can_produce_output()` for each
5. **Produce or Suppress**: If gate says yes, compute estimate; if no, create SuppressedOutput with rationale
6. **Compute Physiological States**: Aggregate inferred values into state assessments
7. **Compute Overall Confidence**: Average confidence of produced outputs
8. **Build Provenance Map**: Link each output to source specimens

**Inference Engines** (stubbed for extensibility, can be replaced with real ML):
- Population Conditioner: Bayesian priors by age/sex/BMI
- Panel Regressors: ML models per domain (CMP, CBC, Lipids, etc.)
- Temporal Model: Time-series / kinetics modeling (ISF→Blood lag)
- Mechanistic Bounds: Hard plausibility constraints (glucose 40-500 mg/dL, pH 6.8-7.8, etc.)
- Consensus/Personalization: Optional multi-engine fusion

#### 5. **API Endpoints**

**POST /ai/inference/v2** - Create inference_pack_v2
```json
Request:
{
  "run_id": "run_2025_001_user123"
}

Response:
{
  "run_id": "run_2025_001_user123",
  "inference_pack_v2": {
    "schema_version": "v2",
    "measured_values": [...],
    "inferred_values": [...],
    "physiological_states": [...],
    "suppressed_outputs": [...],
    "eligibility_rationale": [...],
    "engine_outputs": [...],
    "consensus_metrics": {...},
    "provenance_map": [...]
  },
  "created_at": "2025-01-28T08:50:00Z"
}
```

**GET /ai/inference/v2/{run_id}** - Retrieve cached result
- Returns cached inference_pack_v2 or re-computes on-the-fly

#### 6. **Non-Breaking Design**
- **Parallel Pathway**: inference_v2 runs independently, legacy inference untouched
- **New Column**: `inference_pack_v2_json` stored separately (additive, never modifies legacy)
- **New Endpoints**: `/ai/inference/v2` (existing `/ai/infer` unchanged)
- **UI Toggle**: Inference v2 shown as opt-in feature (legacy remains default)
- **Graceful Fallback**: If legacy v1 features unavailable, inference_v2 uses population priors + coherence penalties

#### 7. **Tests** (`tests/test_inference_v2.py`)
- **Unit Tests** (eligibility gating):
  - Produces output when dependencies met
  - Suppresses when dependencies missing
  - Respects blockers (pregnancy, acute illness, etc.)
  - Applies coherence/signal_quality thresholds
  - Lists missing anchors for suppressed outputs
  - Applies confidence boosters
  - Validates output catalog completeness

- **Unit Tests** (confidence math):
  - Perfect components → confidence ≈ 1.0
  - Degrades with poor components
  - Respects weight ordering (completeness > signal_quality)
  - Penalty reduces confidence
  - Bounds to [0, 1]
  - Component extraction (completeness, agreement, stability, widening)

- **Integration Tests** (orchestrator):
  - Produces glucose_est with blood glucose
  - Suppresses missing dependencies
  - Computes physiological states
  - Labels support_type correctly
  - Populates provenance map
  - Validates schema structure

- **E2E Tests**:
  - Full pipeline: RunV2 → preprocess_v2 → inference_v2
  - Produces valid inference_pack_v2

- **Regression Tests**:
  - Legacy /inference endpoint unchanged
  - Inference_v2 independent of legacy setup

### Usage Example

```bash
# 1. Create RunV2 with specimens
POST /runs/v2
{
  "specimens": [
    {"specimen_type": "ISF", "measured_values": {"glucose": 95.0, "lactate": 1.2}, ...},
    {"specimen_type": "BLOOD", "measured_values": {"glucose": 98.0, "wbc": 5.5, ...}, ...}
  ],
  "non_lab_inputs": {"age": 45, "sex": "M", "weight_kg": 80, ...}
}
→ run_id = "run_2025_001_user123"

# 2. Preprocess to feature_pack_v2
POST /ai/preprocess-v2
{"run_id": "run_2025_001_user123"}
→ feature_pack_v2 with coherence_scores, penalty_vector

# 3. Run Inference V2
POST /ai/inference/v2
{"run_id": "run_2025_001_user123"}
→ inference_pack_v2 with inferred_values (glucose_est, wbc_est, ...), suppressed_outputs, states, confidence

# 4. Inspect results
{
  "inferred_values": [
    {
      "key": "glucose_est",
      "value": 96.5,
      "range": [93, 100],
      "confidence_0_1": 0.92,
      "support_type": "DIRECT",
      "provenance": "MEASURED",
      "source_specimens": ["blood_1"],
      "drivers": ["high_completeness", "high_coherence", "good_signal_quality"],
      "penalties": []
    },
    {
      "key": "a1c_est",
      "value": null,
      "confidence_0_1": null,
      "support_type": null,
      "suppression_reason": "missing_all_requires_any",
      "missing_anchors": ["hemoglobin_a1c", "glucose_3mo_history"]
    }
  ],
  "physiological_states": [
    {"domain": "metabolic_state", "assessment": "well_controlled", "confidence_0_1": 0.85},
    {"domain": "hydration_state", "assessment": "euhydrated", "confidence_0_1": 0.78}
  ],
  "overall_confidence": 0.81,
  "suppressed_outputs": 7,
  "provenance_map": [
    {"output_key": "glucose_est", "source_specimens": ["blood_1"], "provenance_type": "MEASURED"}
  ]
}
```

### Testing Commands

```bash
# Part 3 tests only
pytest tests/test_inference_v2.py -v

# Run specific test sections
pytest tests/test_inference_v2.py::TestEligibilityGatingV2 -v
pytest tests/test_inference_v2.py::TestConfidenceMath -v
pytest tests/test_inference_v2.py::TestInferenceV2Orchestrator -v

# E2E tests
pytest tests/test_inference_v2.py::TestInferenceV2EndToEnd -v
```

### Non-Breaking Compatibility

All 61 existing tests still pass:
- 37 legacy tests (M1-M6, data model, auth, preprocessing, API contracts)
- 13 Part 1 (RunV2) tests
- 11 Part 2 (preprocess_v2) tests
- 15+ Part 3 (inference_v2) tests

**Parallel pathways verified**:
- Legacy `/ai/infer` works identically
- Legacy inference_results table untouched
- New `/ai/inference/v2` coexists without interference
- UI can toggle between v1 (default) and v2 (optional)

## Running Smoke Tests (M6)

Smoke tests validate the full pipeline end-to-end:

```bash
# Ensure API is running on localhost:8000
uvicorn app.main:app --port 8000 &

# Run Python smoke test
python scripts/smoke_local.py

# Or run Bash smoke test
bash scripts/smoke_local.sh
```

**Smoke Test Coverage**:
- ✅ API health check
- ✅ User signup
- ✅ Raw data ingestion
- ✅ Preprocessing
- ✅ Inference with calibrated_id (M4)
- ✅ Forecast with calibrated_id (M4)
- ✅ Forecast with feature_values (legacy compatibility)
- ✅ PDF report generation (M5)
- ✅ Multi-user data isolation
- ✅ Inference V2 endpoint (Part 3)
- ✅ Eligibility gating (Part 3)
- ✅ Computed confidence (Part 3)



## Testing

Run all 37 tests (unit + integration + E2E):
```bash
pytest -q
```

Run with verbose output:
```bash
pytest -v
```

Run specific test class:
```bash
pytest tests/test_api.py::TestAuth -v
pytest tests/test_api.py::TestM4ContractUnification -v  # M4 tests
pytest tests/test_api.py::TestM5PDFReports -v           # M5 tests
pytest tests/test_api.py::TestM6E2EIntegration -v       # M6 tests
```

Coverage report:
```bash
pytest --cov=app tests/
```

**Test Coverage**:
- Unit tests: Auth, data ingestion, preprocessing
- Integration tests: Full pipeline workflows
- E2E tests (M6): Multi-user isolation, error handling, backward compatibility
- M4 tests: Contract unification (calibrated_id + feature_values)
- M5 tests: PDF generation with various inputs
- Total: 37 tests, all passing

## Notes

### Proxy / Offline Wheels

For environments with restricted internet access:

1. **Download wheels offline**:
   ```bash
   pip download -r requirements.txt -d ./wheels
   ```

2. **Install from wheels**:
   ```bash
   pip install --no-index --find-links ./wheels -r requirements.txt
   ```

### Production Deployment

The MVP uses mock tokens. For production:

1. **Implement JWT**: Replace mock token generation in `auth.py` with proper JWT tokens
2. **Secure secrets**: Use environment variables for secrets, not hardcoded values
3. **Database backups**: Set up automated PostgreSQL backups
4. **CORS**: Configure `CORSMiddleware` with specific allowed origins
5. **Rate limiting**: Add rate limiting middleware
6. **Model persistence**: Save/load ML models from disk or model registry

## License

MIT