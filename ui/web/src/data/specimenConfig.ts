/**
 * Specimen Variable Definitions from Backend
 * Maps specimen types to their available fields
 */

export type SpecimenType = 'ISF' | 'BLOOD_CAPILLARY' | 'BLOOD_VENOUS' | 'SALIVA' | 'SWEAT' | 'URINE_SPOT'

export interface VariableSpec {
  unit: string
  var_type: string // "number", "string", "boolean", "string|number"
  notes?: string
}

export const SPECIMEN_VARIABLE_MAP: Record<SpecimenType, Record<string, VariableSpec>> = {
  ISF: {
    glucose: { unit: 'mg/dL', var_type: 'number' },
    lactate: { unit: 'mmol/L', var_type: 'number' },
    sodium_na: { unit: 'mmol/L', var_type: 'number' },
    potassium_k: { unit: 'mmol/L', var_type: 'number' },
    chloride_cl: { unit: 'mmol/L', var_type: 'number' },
    ph: { unit: 'pH', var_type: 'number' },
    crp_proxy: { unit: 'relative_index', var_type: 'number' },
    cytokine_proxy_il6: { unit: 'relative_index', var_type: 'number' },
    drug_signal_proxy: { unit: 'relative_index', var_type: 'number' },
  },

  BLOOD_CAPILLARY: {
    // CMP/BMP
    glucose: { unit: 'mg/dL', var_type: 'number' },
    bun: { unit: 'mg/dL', var_type: 'number' },
    creatinine: { unit: 'mg/dL', var_type: 'number' },
    sodium_na: { unit: 'mmol/L', var_type: 'number' },
    potassium_k: { unit: 'mmol/L', var_type: 'number' },
    chloride_cl: { unit: 'mmol/L', var_type: 'number' },
    co2_bicarb: { unit: 'mmol/L', var_type: 'number' },
    calcium: { unit: 'mg/dL', var_type: 'number' },
    total_protein: { unit: 'g/dL', var_type: 'number' },
    albumin: { unit: 'g/dL', var_type: 'number' },
    bilirubin_total: { unit: 'mg/dL', var_type: 'number' },
    alk_phos: { unit: 'U/L', var_type: 'number' },
    ast: { unit: 'U/L', var_type: 'number' },
    alt: { unit: 'U/L', var_type: 'number' },
    // CBC
    wbc: { unit: '10^3/uL', var_type: 'number' },
    rbc: { unit: '10^6/uL', var_type: 'number' },
    hgb: { unit: 'g/dL', var_type: 'number' },
    hct: { unit: '%', var_type: 'number' },
    mcv: { unit: 'fL', var_type: 'number' },
    mch: { unit: 'pg', var_type: 'number' },
    mchc: { unit: 'g/dL', var_type: 'number' },
    rdw: { unit: '%', var_type: 'number' },
    platelets: { unit: '10^3/uL', var_type: 'number' },
    neutrophils_pct: { unit: '%', var_type: 'number' },
    lymphocytes_pct: { unit: '%', var_type: 'number' },
    // Lipids
    chol_total: { unit: 'mg/dL', var_type: 'number' },
    ldl: { unit: 'mg/dL', var_type: 'number' },
    hdl: { unit: 'mg/dL', var_type: 'number' },
    triglycerides: { unit: 'mg/dL', var_type: 'number' },
    // Endocrine
    a1c: { unit: '%', var_type: 'number' },
    fasting_insulin: { unit: 'uIU/mL', var_type: 'number' },
    tsh: { unit: 'uIU/mL', var_type: 'number' },
    free_t4: { unit: 'ng/dL', var_type: 'number' },
    free_t3: { unit: 'pg/mL', var_type: 'number' },
    // Vitamins/Nutrition
    vitamin_d_25oh: { unit: 'ng/mL', var_type: 'number' },
    b12: { unit: 'pg/mL', var_type: 'number' },
    folate: { unit: 'ng/mL', var_type: 'number' },
    ferritin: { unit: 'ng/mL', var_type: 'number' },
    iron: { unit: 'ug/dL', var_type: 'number' },
    tibc: { unit: 'ug/dL', var_type: 'number' },
    transferrin_sat: { unit: '%', var_type: 'number' },
    // Inflammation
    crp: { unit: 'mg/L', var_type: 'number' },
    esr: { unit: 'mm/hr', var_type: 'number' },
    uric_acid: { unit: 'mg/dL', var_type: 'number' },
    // Autoimmune
    ana: { unit: 'titer_or_posneg', var_type: 'string|number' },
    rf: { unit: 'IU/mL', var_type: 'number' },
    anti_ccp: { unit: 'U/mL', var_type: 'number' },
    dsdna: { unit: 'IU/mL', var_type: 'number' },
  },

  BLOOD_VENOUS: {
    // Same as BLOOD_CAPILLARY (venous collection)
    glucose: { unit: 'mg/dL', var_type: 'number' },
    bun: { unit: 'mg/dL', var_type: 'number' },
    creatinine: { unit: 'mg/dL', var_type: 'number' },
    sodium_na: { unit: 'mmol/L', var_type: 'number' },
    potassium_k: { unit: 'mmol/L', var_type: 'number' },
    chloride_cl: { unit: 'mmol/L', var_type: 'number' },
    co2_bicarb: { unit: 'mmol/L', var_type: 'number' },
    calcium: { unit: 'mg/dL', var_type: 'number' },
    total_protein: { unit: 'g/dL', var_type: 'number' },
    albumin: { unit: 'g/dL', var_type: 'number' },
    bilirubin_total: { unit: 'mg/dL', var_type: 'number' },
    alk_phos: { unit: 'U/L', var_type: 'number' },
    ast: { unit: 'U/L', var_type: 'number' },
    alt: { unit: 'U/L', var_type: 'number' },
    wbc: { unit: '10^3/uL', var_type: 'number' },
    rbc: { unit: '10^6/uL', var_type: 'number' },
    hgb: { unit: 'g/dL', var_type: 'number' },
    hct: { unit: '%', var_type: 'number' },
    mcv: { unit: 'fL', var_type: 'number' },
    mch: { unit: 'pg', var_type: 'number' },
    mchc: { unit: 'g/dL', var_type: 'number' },
    rdw: { unit: '%', var_type: 'number' },
    platelets: { unit: '10^3/uL', var_type: 'number' },
    neutrophils_pct: { unit: '%', var_type: 'number' },
    lymphocytes_pct: { unit: '%', var_type: 'number' },
    chol_total: { unit: 'mg/dL', var_type: 'number' },
    ldl: { unit: 'mg/dL', var_type: 'number' },
    hdl: { unit: 'mg/dL', var_type: 'number' },
    triglycerides: { unit: 'mg/dL', var_type: 'number' },
    a1c: { unit: '%', var_type: 'number' },
    fasting_insulin: { unit: 'uIU/mL', var_type: 'number' },
    tsh: { unit: 'uIU/mL', var_type: 'number' },
    free_t4: { unit: 'ng/dL', var_type: 'number' },
    free_t3: { unit: 'pg/mL', var_type: 'number' },
    vitamin_d_25oh: { unit: 'ng/mL', var_type: 'number' },
    b12: { unit: 'pg/mL', var_type: 'number' },
    folate: { unit: 'ng/mL', var_type: 'number' },
    ferritin: { unit: 'ng/mL', var_type: 'number' },
    iron: { unit: 'ug/dL', var_type: 'number' },
    tibc: { unit: 'ug/dL', var_type: 'number' },
    transferrin_sat: { unit: '%', var_type: 'number' },
    crp: { unit: 'mg/L', var_type: 'number' },
    esr: { unit: 'mm/hr', var_type: 'number' },
    uric_acid: { unit: 'mg/dL', var_type: 'number' },
    ana: { unit: 'titer_or_posneg', var_type: 'string|number' },
    rf: { unit: 'IU/mL', var_type: 'number' },
    anti_ccp: { unit: 'U/mL', var_type: 'number' },
    dsdna: { unit: 'IU/mL', var_type: 'number' },
  },

  SALIVA: {
    cortisol_morning: { unit: 'ug/dL_or_relative', var_type: 'number' },
    cortisol_evening: { unit: 'ug/dL_or_relative', var_type: 'number' },
    alpha_amylase: { unit: 'relative_index', var_type: 'number' },
    ph: { unit: 'pH', var_type: 'number' },
    flow_rate: { unit: 'mL/min', var_type: 'number' },
    dryness_score: { unit: '0_10', var_type: 'number' },
    recent_alcohol_flag: { unit: 'boolean', var_type: 'boolean' },
    recent_nicotine_flag: { unit: 'boolean', var_type: 'boolean' },
  },

  SWEAT: {
    sodium_na: { unit: 'mmol/L', var_type: 'number' },
    chloride_cl: { unit: 'mmol/L', var_type: 'number' },
    potassium_k: { unit: 'mmol/L', var_type: 'number' },
    sweat_rate: { unit: 'mL/hr', var_type: 'number' },
    skin_temp: { unit: 'C', var_type: 'number' },
    exertion_level: { unit: '0_10', var_type: 'number' },
  },

  URINE_SPOT: {
    specific_gravity: { unit: 'unitless', var_type: 'number' },
    ph: { unit: 'pH', var_type: 'number' },
    protein: { unit: 'mg/dL_or_posneg', var_type: 'string|number' },
    glucose: { unit: 'mg/dL_or_posneg', var_type: 'string|number' },
    ketones: { unit: 'posneg_or_mgdl', var_type: 'string|number' },
    blood: { unit: 'posneg', var_type: 'string' },
    leukocyte_esterase: { unit: 'posneg', var_type: 'string' },
    nitrite: { unit: 'posneg', var_type: 'string' },
    uacr: { unit: 'mg/g', var_type: 'number' },
    microalbumin: { unit: 'mg/L', var_type: 'number' },
  },
}

export const SPECIMEN_DESCRIPTIONS: Record<SpecimenType, string> = {
  ISF: 'Interstitial Fluid - Continuous sensor readings',
  BLOOD_CAPILLARY: 'Blood (Capillary) - Fingerstick collection',
  BLOOD_VENOUS: 'Blood (Venous) - Venipuncture collection',
  SALIVA: 'Saliva - Non-invasive collection',
  SWEAT: 'Sweat - Activity or induced collection',
  URINE_SPOT: 'Urine Spot - Point-in-time collection',
}

// Missing Type Options
export const MISSING_TYPE_OPTIONS = [
  { value: 'not_collected', label: 'Not Collected' },
  { value: 'user_skipped', label: 'User Skipped' },
  { value: 'biologically_unavailable', label: 'Biologically Unavailable' },
  { value: 'temporarily_unavailable', label: 'Temporarily Unavailable' },
  { value: 'sensor_unavailable', label: 'Sensor Unavailable' },
  { value: 'not_applicable', label: 'Not Applicable' },
]

// Provenance Options
export const PROVENANCE_OPTIONS = [
  { value: 'measured', label: 'Measured - Direct measurement' },
  { value: 'direct', label: 'Direct - Confirmed direct' },
  { value: 'proxy', label: 'Proxy - Indirect measurement' },
  { value: 'inferred', label: 'Inferred - Calculated' },
  { value: 'population', label: 'Population - Population average' },
  { value: 'relational', label: 'Relational - From other variables' },
]
