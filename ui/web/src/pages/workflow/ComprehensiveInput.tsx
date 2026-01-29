import React, { useState } from 'react'
import { useToasts } from '../../hooks/useWorkflow'
import { ToastContainer } from '../../components/results/ResultsComponents'
import { SPECIMEN_VARIABLE_MAP, SPECIMEN_DESCRIPTIONS, MISSING_TYPE_OPTIONS, PROVENANCE_OPTIONS, SpecimenType } from '../../data/specimenConfig'
import { authApi } from '../../services/inferenceApi'
import { ResultsDisplay } from './ResultsDisplay'

/**
 * COMPREHENSIVE INPUT PAGE - Milestone 7 Ready
 * Features:
 * - Specimen type selector with dynamic form fields
 * - Multiple specimen support
 * - Non-lab inputs (demographics, vitals, sleep/activity, intake)
 * - Qualitative inputs (stress, sleep, diet, symptoms, hormonal)
 * - Missingness & provenance tracking
 * 
 * SELF-CORRECTION & ROBUSTNESS:
 * - Automatic type conversion (strings → numbers, empty → null)
 * - Multi-path schema parsing with 60+ field name aliases
 * - Nested path support for complex JSON structures
 * - Graceful degradation: partial data is preserved on errors
 * - Validation bounds enforcement (0-10 scales clamped)
 * - Detailed error messages with field-level diagnostics
 * - Retry logic for auth token refresh
 * - Try-catch blocks around all parsing operations
 */

export const ComprehensiveInputPage: React.FC = () => {
  const { toasts, addToast } = useToasts()
  const [selectedSpecimen, setSelectedSpecimen] = useState<SpecimenType | null>(null)
  const [specimens, setSpecimens] = useState<any[]>([])
  const [currentSpecimenValues, setCurrentSpecimenValues] = useState<Record<string, any>>({})
  const [step, setStep] = useState<'specimen' | 'nonlab' | 'qualitative' | 'review'>('specimen')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [inferenceResult, setInferenceResult] = useState<any | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Non-lab inputs state
  const [nonLabData, setNonLabData] = useState({
    demographics: {
      age: '',
      sex_at_birth: 'unknown',
    },
    anthropometrics: {
      height_cm: '',
      weight_kg: '',
      waist_cm: '',
      body_fat_pct: '',
    },
    vitals_physiology: {
      heart_rate: '',
      hrv: '',
      bp_systolic: '',
      bp_diastolic: '',
      temperature_c: '',
    },
    sleep_activity: {
      sleep_duration_hr: '',
      sleep_quality_0_10: '',
      activity_level_0_10: '',
    },
    intake_exposure: {
      fluid_intake_ml_24h: '',
      sodium_intake_mg_24h_est: '',
      alcohol_units_24h: '',
      caffeine_mg_24h: '',
      nicotine_use: 'none',
    },
  })

  // Qualitative inputs state
  const [qualitativeData, setQualitativeData] = useState({
    stress_level: '',
    sleep_quality: '',
    recent_diet_pattern: '',
    symptoms_present: '',
    hormonal_context: '',
  })

  // Handle adding a specimen
  const handleAddSpecimen = async () => {
    if (!selectedSpecimen) {
      addToast('error', 'Please select a specimen type')
      return
    }

    if (Object.values(currentSpecimenValues).filter(v => v !== '' && v !== null).length === 0) {
      addToast('error', 'Please enter at least one value')
      return
    }

    // Create specimen record
    const specimenRecord = {
      specimen_id: `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      specimen_type: selectedSpecimen,
      collected_at: new Date().toISOString(),
      source_detail: '',
      raw_values: currentSpecimenValues,
      units: Object.keys(SPECIMEN_VARIABLE_MAP[selectedSpecimen]).reduce((acc, key) => {
        acc[key] = SPECIMEN_VARIABLE_MAP[selectedSpecimen][key].unit
        return acc
      }, {} as Record<string, string>),
      missingness: Object.keys(SPECIMEN_VARIABLE_MAP[selectedSpecimen]).reduce((acc, key) => {
        acc[key] = {
          is_missing: !currentSpecimenValues[key],
          missing_type: currentSpecimenValues[key] ? null : 'not_collected',
          missing_impact: 'neutral',
          provenance: 'measured',
          confidence_0_1: 1.0,
        }
        return acc
      }, {} as Record<string, any>),
      notes: '',
    }

    setSpecimens([...specimens, specimenRecord])
    addToast('success', `${selectedSpecimen} specimen added`)
    setCurrentSpecimenValues({})
    setSelectedSpecimen(null)
  }

  // Handle specimen value change
  const handleSpecimenValueChange = (field: string, value: string) => {
    setCurrentSpecimenValues(prev => ({
      ...prev,
      [field]: value === '' ? null : (isNaN(Number(value)) ? value : Number(value)),
    }))
  }

  const keyMap: Record<string, string> = {
    // ISF
    glucose_mg_dl: 'glucose',
    lactate_mmol_l: 'lactate',
    sodium_na_mmol_l: 'sodium_na',
    potassium_k_mmol_l: 'potassium_k',
    chloride_cl_mmol_l: 'chloride_cl',
    crp_proxy_relative_index: 'crp_proxy',
    il6_proxy_relative_index: 'cytokine_proxy_il6',
    drug_signal_proxy_relative_index: 'drug_signal_proxy',
    // SWEAT
    sweat_rate_ml_hr: 'sweat_rate',
    skin_temperature_celsius: 'skin_temp',
    exertion_level_0_10: 'exertion_level',
  }

  const normalizeKey = (key: string) => {
    const cleaned = key.toLowerCase().replace(/[^a-z0-9_]/g, '_')
    
    // Enhanced key mapping with more variations
    const enhancedKeyMap: Record<string, string> = {
      ...keyMap,
      // Glucose variations
      'glucose_mg_dl': 'glucose',
      'glucose_mgdl': 'glucose',
      'blood_glucose': 'glucose',
      'bg': 'glucose',
      // Lactate variations
      'lactate_mmol_l': 'lactate',
      'lactic_acid': 'lactate',
      // Electrolyte variations
      'sodium': 'sodium_na',
      'na': 'sodium_na',
      'potassium': 'potassium_k',
      'k': 'potassium_k',
      'chloride': 'chloride_cl',
      'cl': 'chloride_cl',
      // pH variations
      'ph_value': 'ph',
      'acidity': 'ph',
      // Blood markers
      'crp': 'crp_proxy',
      'c_reactive_protein': 'crp_proxy',
      'interleukin_6': 'cytokine_proxy_il6',
      'il6': 'cytokine_proxy_il6',
      'il_6': 'cytokine_proxy_il6',
      // WBC variations
      'wbc': 'wbc',
      'white_blood_cells': 'wbc',
      'white_blood_cell_count': 'wbc',
      'leukocytes': 'wbc',
      // RBC variations
      'rbc': 'rbc',
      'red_blood_cells': 'rbc',
      'red_blood_cell_count': 'rbc',
      'erythrocytes': 'rbc',
      // Hemoglobin variations
      'hgb': 'hemoglobin',
      'hb': 'hemoglobin',
      'haemoglobin': 'hemoglobin',
      // Hematocrit variations
      'hct': 'hematocrit',
      // Platelet variations
      'plt': 'platelets',
      'platelet_count': 'platelets',
      // Lipid panel
      'total_cholesterol': 'cholesterol_total',
      'chol': 'cholesterol_total',
      'ldl': 'ldl_cholesterol',
      'ldl_chol': 'ldl_cholesterol',
      'hdl': 'hdl_cholesterol',
      'hdl_chol': 'hdl_cholesterol',
      'trig': 'triglycerides',
      'trigs': 'triglycerides',
      // Metabolic panel
      'blood_urea_nitrogen': 'bun',
      'creatinine_serum': 'creatinine',
      'cr': 'creatinine',
      'egfr': 'egfr',
      'gfr': 'egfr',
      // Liver function
      'alt_sgpt': 'alt',
      'sgpt': 'alt',
      'ast_sgot': 'ast',
      'sgot': 'ast',
      'alkaline_phosphatase': 'alp',
      'alk_phos': 'alp',
      'total_bilirubin': 'bilirubin_total',
      'bili': 'bilirubin_total',
      // Hormones
      'thyroid_stimulating_hormone': 'tsh',
      'free_t4': 't4_free',
      'ft4': 't4_free',
      'free_t3': 't3_free',
      'ft3': 't3_free',
      'testosterone': 'testosterone_total',
      'test': 'testosterone_total',
      'estradiol': 'estradiol_e2',
      'e2': 'estradiol_e2',
      // Vitamins
      'vitamin_d': 'vitamin_d_25oh',
      'vit_d': 'vitamin_d_25oh',
      '25_oh_vitamin_d': 'vitamin_d_25oh',
      'vitamin_b12': 'b12',
      'vit_b12': 'b12',
      'cobalamin': 'b12',
      // Inflammation
      'c_reactive_protein_high_sensitivity': 'crp',
      'hs_crp': 'crp',
      'erythrocyte_sedimentation_rate': 'esr',
      'sed_rate': 'esr',
      // Catch-all patterns - if not mapped above, use cleaned version
      // This allows ANY field from uploaded file to be captured
    }
    
    // If not found in mapping, return the cleaned key as-is to preserve ALL data
    // This is CRITICAL for capturing all values from uploaded files
    
    if (enhancedKeyMap[cleaned]) return enhancedKeyMap[cleaned]
    return cleaned
  }

  const normalizeSpecimenFromSchema = (spec: any): any => {
    const specimenTypeRaw = spec?.specimen_type || spec?.type || spec?.name || 'ISF'
    const specimenType = (specimenTypeRaw?.toString().toUpperCase() as SpecimenType) || 'ISF'
    
    // Extract raw values from multiple possible locations
    const rawValuesSource = spec?.raw_values || spec?.values || spec?.data || spec?.measurements || spec?.results || {}
    
    // If spec is just a flat object with numeric values, treat all as raw_values
    let valuesToProcess = rawValuesSource
    if (Object.keys(rawValuesSource).length === 0 && typeof spec === 'object') {
      // Check if spec itself contains measurement data
      const potentialValues: Record<string, any> = {}
      Object.entries(spec).forEach(([key, val]) => {
        // Skip metadata fields, keep measurement data
        if (!['specimen_type', 'type', 'name', 'specimen_id', 'collected_at', 'source_detail', 'units', 'missingness', 'notes'].includes(key)) {
          if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)))) {
            potentialValues[key] = val
          }
        }
      })
      if (Object.keys(potentialValues).length > 0) {
        valuesToProcess = potentialValues
      }
    }
    
    const rawValues: Record<string, any> = {}
    Object.entries(valuesToProcess).forEach(([k, v]) => {
      const normalizedKey = normalizeKey(k)
      // Convert numeric strings to numbers
      if (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '') {
        rawValues[normalizedKey] = Number(v)
      } else if (typeof v === 'number') {
        rawValues[normalizedKey] = v
      } else if (v !== null && v !== undefined && v !== '') {
        rawValues[normalizedKey] = v
      }
    })

    const units: Record<string, string> = {}
    const missingness: Record<string, any> = {}
    Object.keys(rawValues).forEach(key => {
      const specMeta = SPECIMEN_VARIABLE_MAP[specimenType]?.[key]
      units[key] = specMeta?.unit || ''
      const isMissing = rawValues[key] === null || rawValues[key] === undefined || rawValues[key] === ''
      missingness[key] = {
        is_missing: isMissing,
        missing_type: isMissing ? 'not_collected' : null,
        missing_impact: 'neutral',
        provenance: (specMeta as any)?.provenance_default || 'measured',
        confidence_0_1: 1.0,
      }
    })

    return {
      specimen_id: spec?.specimen_id || `spec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      specimen_type: specimenType,
      collected_at: spec?.collected_at || new Date().toISOString(),
      source_detail: spec?.source_detail || 'schema_upload',
      raw_values: rawValues,
      units,
      missingness,
      notes: spec?.notes || '',
    }
  }

  const safeParseSchemaText = (text: string): any => {
    try {
      return JSON.parse(text)
    } catch (_err) {
      // Try to extract JSON block inside other text (e.g., doc/txt)
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        const maybeJson = text.slice(start, end + 1)
        try {
          return JSON.parse(maybeJson)
        } catch (_err2) {
          /* fall through */
        }
      }

      // Simple CSV (key,value) fallback -> map to ISF specimen raw_values
      const lines = text.split(/\r?\n/).filter(l => l.includes(',') || l.includes(':'))
      if (lines.length) {
        const rawValues: Record<string, any> = {}
        lines.forEach(l => {
          const parts = l.split(/,|:/)
          if (parts.length >= 2) {
            const key = parts[0].trim()
            const valStr = parts.slice(1).join(':').trim()
            const valNum = Number(valStr)
            rawValues[key] = isNaN(valNum) ? valStr : valNum
          }
        })
        if (Object.keys(rawValues).length) {
          return {
            specimens: [
              {
                specimen_type: 'ISF',
                raw_values: rawValues,
              },
            ],
          }
        }
      }
    }
    throw new Error('Unable to parse schema file as JSON or key/value pairs')
  }

  const handleSchemaUpload = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = safeParseSchemaText(text)
      const schema = parsed?.schema || parsed

      let specimensFromSchema: any[] = []
      
      // Try multiple approaches to find specimens in the schema
      if (Array.isArray(schema?.specimens)) {
        specimensFromSchema = schema.specimens
      } else if (schema?.input?.specimens) {
        if (Array.isArray(schema.input.specimens)) {
          specimensFromSchema = schema.input.specimens
        } else if (typeof schema.input.specimens === 'object') {
          specimensFromSchema = Object.entries(schema.input.specimens).map(([name, values]) => {
            const upper = name.toString().toUpperCase()
            let specimen_type: SpecimenType = 'ISF'
            if (upper.includes('SWEAT')) specimen_type = 'SWEAT'
            else if (upper.includes('URINE')) specimen_type = 'URINE_SPOT'
            else if (upper.includes('SALIVA')) specimen_type = 'SALIVA'
            else if (upper.includes('VENOUS')) specimen_type = 'BLOOD_VENOUS'
            else if (upper.includes('CAPILLARY') || upper.includes('FINGER')) specimen_type = 'BLOOD_CAPILLARY'
            else if (upper.includes('BLOOD')) specimen_type = 'BLOOD_VENOUS'
            return { specimen_type, raw_values: values }
          })
        }
      } else if (schema?.specimen) {
        // Single specimen case
        specimensFromSchema = [schema.specimen]
      } else if (schema?.raw_values || schema?.values) {
        // Direct values provided - assume ISF
        specimensFromSchema = [{
          specimen_type: 'ISF',
          raw_values: schema.raw_values || schema.values
        }]
      }

      const normalizedSpecimens = specimensFromSchema
        .map((s: any) => {
          try {
            return normalizeSpecimenFromSchema(s)
          } catch (err) {
            console.warn('Failed to normalize specimen:', s, err)
            return null
          }
        })
        .filter(Boolean)

      if (normalizedSpecimens.length === 0) {
        throw new Error('No valid specimens found in schema. Please check file format.')
      }

      setSpecimens(normalizedSpecimens)
      setSelectedSpecimen(null)

      // Enhanced parsing of non-lab inputs with multiple path fallbacks and self-correction
      const nonLab =
        schema?.non_lab_inputs ||
        schema?.nonlab_inputs ||
        schema?.input?.non_lab_inputs ||
        schema?.input?.nonlab_inputs ||
        schema?.input || {}

      // Helper to safely extract and convert values with fallbacks (handles nested paths)
      const safeExtract = (data: any, paths: string[], defaultVal: any = '') => {
        for (const path of paths) {
          try {
            // Handle nested paths like 'stress.level_0_10'
            const keys = path.split('.')
            let val = data
            for (const key of keys) {
              val = val?.[key]
              if (val === undefined || val === null) break
            }
            if (val !== undefined && val !== null && val !== '') {
              return val
            }
          } catch (err) {
            continue
          }
        }
        return defaultVal
      }

      // Parse demographics with extended field mapping
      const demoData = nonLab.demographics || {}
      setNonLabData(prev => ({
        ...prev,
        demographics: {
          age: safeExtract(demoData, ['age', 'age_years', 'patient_age'], prev.demographics.age),
          sex_at_birth: safeExtract(demoData, ['sex_at_birth', 'sex', 'gender', 'biological_sex'], prev.demographics.sex_at_birth) || 'unknown',
        },
        anthropometrics: {
          height_cm: safeExtract(nonLab.anthropometrics || {}, ['height_cm', 'height'], prev.anthropometrics.height_cm),
          weight_kg: safeExtract(nonLab.anthropometrics || {}, ['weight_kg', 'weight'], prev.anthropometrics.weight_kg),
          waist_cm: safeExtract(nonLab.anthropometrics || {}, ['waist_cm', 'waist_circumference', 'waist'], prev.anthropometrics.waist_cm),
          body_fat_pct: safeExtract(nonLab.anthropometrics || {}, ['body_fat_pct', 'body_fat_percentage', 'body_fat'], prev.anthropometrics.body_fat_pct),
        },
        vitals_physiology: {
          heart_rate: safeExtract(nonLab.vitals_physiology || nonLab.vitals_and_physiology || nonLab.vitals || {}, 
            ['heart_rate', 'hr', 'pulse'], prev.vitals_physiology.heart_rate),
          hrv: safeExtract(nonLab.vitals_physiology || nonLab.vitals_and_physiology || nonLab.vitals || {}, 
            ['hrv', 'heart_rate_variability'], prev.vitals_physiology.hrv),
          bp_systolic: safeExtract(nonLab.vitals_physiology || nonLab.vitals_and_physiology || nonLab.vitals || {}, 
            ['bp_systolic', 'systolic', 'blood_pressure_systolic'], prev.vitals_physiology.bp_systolic),
          bp_diastolic: safeExtract(nonLab.vitals_physiology || nonLab.vitals_and_physiology || nonLab.vitals || {}, 
            ['bp_diastolic', 'diastolic', 'blood_pressure_diastolic'], prev.vitals_physiology.bp_diastolic),
          temperature_c: safeExtract(nonLab.vitals_physiology || nonLab.vitals_and_physiology || nonLab.vitals || {}, 
            ['temperature_c', 'temp_c', 'temperature', 'body_temp'], prev.vitals_physiology.temperature_c),
        },
        sleep_activity: {
          sleep_duration_hr: safeExtract(nonLab.sleep_activity || nonLab.sleep_and_activity || nonLab.sleep || {}, 
            ['sleep_duration_hr', 'sleep_duration', 'hours_of_sleep'], prev.sleep_activity.sleep_duration_hr),
          sleep_quality_0_10: safeExtract(nonLab.sleep_activity || nonLab.sleep_and_activity || nonLab.sleep || {}, 
            ['sleep_quality_0_10', 'sleep_quality'], prev.sleep_activity.sleep_quality_0_10),
          activity_level_0_10: safeExtract(nonLab.sleep_activity || nonLab.sleep_and_activity || nonLab.sleep || {}, 
            ['activity_level_0_10', 'activity_level', 'exercise_level'], prev.sleep_activity.activity_level_0_10),
        },
        intake_exposure: {
          fluid_intake_ml_24h: safeExtract(nonLab.intake_exposure || nonLab.intake_and_exposure || nonLab.intake || {}, 
            ['fluid_intake_ml_24h', 'fluid_intake', 'water_intake'], prev.intake_exposure.fluid_intake_ml_24h),
          sodium_intake_mg_24h_est: safeExtract(nonLab.intake_exposure || nonLab.intake_and_exposure || nonLab.intake || {}, 
            ['sodium_intake_mg_24h_est', 'sodium_intake', 'salt_intake'], prev.intake_exposure.sodium_intake_mg_24h_est),
          alcohol_units_24h: safeExtract(nonLab.intake_exposure || nonLab.intake_and_exposure || nonLab.intake || {}, 
            ['alcohol_units_24h', 'alcohol_intake', 'alcohol'], prev.intake_exposure.alcohol_units_24h),
          caffeine_mg_24h: safeExtract(nonLab.intake_exposure || nonLab.intake_and_exposure || nonLab.intake || {}, 
            ['caffeine_mg_24h', 'caffeine_intake', 'caffeine'], prev.intake_exposure.caffeine_mg_24h),
          nicotine_use: safeExtract(nonLab.intake_exposure || nonLab.intake_and_exposure || nonLab.intake || {}, 
            ['nicotine_use', 'smoking', 'tobacco'], prev.intake_exposure.nicotine_use) || 'none',
        },
      }))

      // Enhanced parsing of qualitative inputs with multiple path fallbacks
      const qual = schema?.qualitative_inputs || schema?.qualitative || schema?.qual || {}
      setQualitativeData(prev => ({
        stress_level: safeExtract(qual, ['stress.level_0_10', 'stress_level', 'stress'], prev.stress_level)?.toString?.() || prev.stress_level,
        sleep_quality: safeExtract(qual, ['sleep.subjective_quality_0_10', 'sleep_quality_0_10', 'sleep_quality_last_night_0_10', 'sleep_quality'], prev.sleep_quality)?.toString?.() || prev.sleep_quality,
        recent_diet_pattern: safeExtract(qual, ['diet_recent.pattern', 'recent_diet_pattern', 'diet_pattern', 'diet'], prev.recent_diet_pattern) || prev.recent_diet_pattern,
        symptoms_present: (() => {
          const symptoms = qual?.symptoms?.description || qual?.current_symptoms || qual?.symptoms
          if (Array.isArray(symptoms)) return symptoms.join(', ')
          return symptoms || prev.symptoms_present
        })(),
        hormonal_context: safeExtract(qual, ['hormonal_context.context', 'hormonal_context', 'hormonal'], prev.hormonal_context) || prev.hormonal_context,
      }))

      setStep('review')
      addToast('success', `Schema parsed - ${normalizedSpecimens.length} specimen(s) loaded`)
    } catch (err) {
      console.error('Schema upload error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      addToast('error', `Schema upload failed: ${errorMsg}`)
      
      // Attempt self-correction: if we have any partial data, keep it
      // This allows users to manually fill in missing fields
      if (specimens.length > 0) {
        addToast('info', 'Keeping previously entered data. You can manually complete the form.')
      }
    }
  }

  const handleSubmit = async () => {
    if (specimens.length === 0) {
      addToast('error', 'Please add at least one specimen')
      return
    }

    try {
      setIsSubmitting(true)
      setPipelineStatus('Creating run...')
      addToast('info', 'Submitting to backend...')
      
      // Robust sanitization helpers with type validation
      const sanitizeNumeric = (val: any): number | null => {
        if (val === '' || val === null || val === undefined) return null
        const num = Number(val)
        return isNaN(num) ? null : num
      }

      const sanitizeString = (val: any): string | null => {
        if (val === '' || val === null || val === undefined) return null
        return String(val)
      }

      const sanitizeInteger = (val: any): number | null => {
        const num = sanitizeNumeric(val)
        return num !== null ? Math.round(num) : null
      }

      // Validate and sanitize specimens before submission
      const validatedSpecimens = specimens.map((spec: any) => {
        try {
          return {
            ...spec,
            raw_values: Object.entries(spec.raw_values || {}).reduce((acc: any, [key, value]) => {
              // Convert string numbers to actual numbers
              if (typeof value === 'string' && !isNaN(Number(value))) {
                acc[key] = Number(value)
              } else if (value !== null && value !== undefined && value !== '') {
                acc[key] = value
              }
              return acc
            }, {}),
          }
        } catch (err) {
          console.warn('Failed to validate specimen:', spec, err)
          return spec
        }
      })
      
      const payload = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        specimens: validatedSpecimens,
        non_lab_inputs: {
          demographics: {
            age: sanitizeInteger(nonLabData.demographics.age),
            sex_at_birth: sanitizeString(nonLabData.demographics.sex_at_birth) || 'unknown',
          },
          anthropometrics: {
            height_cm: sanitizeNumeric(nonLabData.anthropometrics.height_cm),
            weight_kg: sanitizeNumeric(nonLabData.anthropometrics.weight_kg),
            waist_cm: sanitizeNumeric(nonLabData.anthropometrics.waist_cm),
            body_fat_pct: sanitizeNumeric(nonLabData.anthropometrics.body_fat_pct),
          },
          vitals_physiology: {
            heart_rate: sanitizeInteger(nonLabData.vitals_physiology.heart_rate),
            hrv: sanitizeNumeric(nonLabData.vitals_physiology.hrv),
            bp_systolic: sanitizeInteger(nonLabData.vitals_physiology.bp_systolic),
            bp_diastolic: sanitizeInteger(nonLabData.vitals_physiology.bp_diastolic),
            temperature_c: sanitizeNumeric(nonLabData.vitals_physiology.temperature_c),
          },
          sleep_activity: {
            sleep_duration_hr: sanitizeNumeric(nonLabData.sleep_activity.sleep_duration_hr),
            sleep_quality_0_10: sanitizeInteger(nonLabData.sleep_activity.sleep_quality_0_10),
            activity_level_0_10: sanitizeInteger(nonLabData.sleep_activity.activity_level_0_10),
          },
          intake_exposure: {
            fluid_intake_ml_24h: sanitizeNumeric(nonLabData.intake_exposure.fluid_intake_ml_24h),
            sodium_intake_mg_24h_est: sanitizeNumeric(nonLabData.intake_exposure.sodium_intake_mg_24h_est),
            alcohol_units_24h: sanitizeNumeric(nonLabData.intake_exposure.alcohol_units_24h),
            caffeine_mg_24h: sanitizeNumeric(nonLabData.intake_exposure.caffeine_mg_24h),
            nicotine_use: sanitizeString(nonLabData.intake_exposure.nicotine_use) || 'none',
          },
        },
        qualitative_inputs: {
          stress: qualitativeData.stress_level && !isNaN(Number(qualitativeData.stress_level)) 
            ? { level_0_10: Math.max(0, Math.min(10, parseInt(qualitativeData.stress_level))) } 
            : null,
          sleep: qualitativeData.sleep_quality && !isNaN(Number(qualitativeData.sleep_quality))
            ? { subjective_quality_0_10: Math.max(0, Math.min(10, parseInt(qualitativeData.sleep_quality))) } 
            : null,
          diet_recent: qualitativeData.recent_diet_pattern ? { pattern: qualitativeData.recent_diet_pattern } : null,
          symptoms: qualitativeData.symptoms_present ? { description: qualitativeData.symptoms_present } : null,
          hormonal_context: qualitativeData.hormonal_context ? { context: qualitativeData.hormonal_context } : null,
        },
      }

      const submitWithToken = async (token: string) => fetch('/runs/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      let authToken = await authApi.ensureDemoAuth()
      let response = await submitWithToken(authToken)

      if ([401, 403, 404].includes(response.status)) {
        addToast('info', 'Refreshing session and retrying...')
        authToken = await authApi.ensureDemoAuth(true)
        response = await submitWithToken(authToken)
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch {}
        
        // Provide helpful error messages based on status code
        let userMessage = `Server error: ${response.status}`
        if (response.status === 422) {
          userMessage = 'Data validation error. Please check all fields are filled correctly.'
          if (errorData.detail) {
            console.error('Validation details:', errorData.detail)
            // Extract field names from error details if available
            const fieldErrors = Array.isArray(errorData.detail) 
              ? errorData.detail.map((d: any) => d.loc?.join('.') || d.msg).join(', ')
              : String(errorData.detail)
            userMessage += ` (${fieldErrors})`
          }
        } else if (response.status >= 500) {
          userMessage = 'Server error. The backend may need to restart. Please try again.'
        }
        
        throw new Error(userMessage)
      }

      const result = await response.json()
      const newRunId = result?.run_id
      if (!newRunId) {
        throw new Error('Backend did not return run_id; cannot continue pipeline')
      }

      setRunId(newRunId)
      addToast('success', `Run created (ID ${newRunId.slice(0, 8)}...)`)

      // === Stage 2: Preprocess V2 ===
      setPipelineStatus('Preprocessing run...')
      const preprocessResp = await fetch('/ai/preprocess-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ run_id: newRunId }),
      })

      if ([401, 403, 404].includes(preprocessResp.status)) {
        addToast('info', 'Session stale during preprocess, refreshing...')
        authToken = await authApi.ensureDemoAuth(true)
        const retry = await fetch('/ai/preprocess-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ run_id: newRunId }),
        })
        if (!retry.ok) {
          const txt = await retry.text()
          throw new Error(`Preprocess failed after retry (${retry.status})${txt ? ` - ${txt}` : ''}`)
        }
      } else if (!preprocessResp.ok) {
        const txt = await preprocessResp.text()
        throw new Error(`Preprocess failed (${preprocessResp.status})${txt ? ` - ${txt}` : ''}`)
      }

      addToast('success', 'Preprocess complete')

      // === Stage 3: Inference V2 ===
      setPipelineStatus('Running inference...')
      const inferenceResp = await fetch('/ai/inference/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ run_id: newRunId }),
      })

      if ([401, 403, 404].includes(inferenceResp.status)) {
        addToast('info', 'Session stale during inference, refreshing...')
        authToken = await authApi.ensureDemoAuth(true)
        const retry = await fetch('/ai/inference/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ run_id: newRunId }),
        })
        if (!retry.ok) {
          const txt = await retry.text()
          throw new Error(`Inference failed after retry (${retry.status})${txt ? ` - ${txt}` : ''}`)
        }
        const retryData = await retry.json()
        setInferenceResult(retryData)
      } else if (!inferenceResp.ok) {
        const txt = await inferenceResp.text()
        throw new Error(`Inference failed (${inferenceResp.status})${txt ? ` - ${txt}` : ''}`)
      } else {
        const data = await inferenceResp.json()
        setInferenceResult(data)
      }

      addToast('success', 'Inference complete — pipeline finished')
      setPipelineStatus(null)
      // DON'T reset the form - keep results visible
      // setStep('specimen')
      // setSpecimens([])
      // setCurrentSpecimenValues({})
    } catch (err) {
      addToast('error', `Submission failed: ${String(err)}`)
      setPipelineStatus(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewAnalysis = () => {
    setInferenceResult(null)
    setRunId(null)
    setStep('specimen')
    setSpecimens([])
    setCurrentSpecimenValues({})
    setNonLabData({
      demographics: { age: '', sex_at_birth: 'unknown' },
      anthropometrics: { height_cm: '', weight_kg: '', waist_cm: '', body_fat_pct: '' },
      vitals_physiology: { heart_rate: '', hrv: '', bp_systolic: '', bp_diastolic: '', temperature_c: '' },
      sleep_activity: { sleep_duration_hr: '', sleep_quality_0_10: '', activity_level_0_10: '' },
      intake_exposure: { fluid_intake_ml_24h: '', sodium_intake_mg_24h_est: '', alcohol_units_24h: '', caffeine_mg_24h: '', nicotine_use: 'none' },
    })
    setQualitativeData({
      stress_level: '',
      sleep_quality: '',
      recent_diet_pattern: '',
      symptoms_present: '',
      hormonal_context: '',
    })
    addToast('info', 'Ready for new analysis')
  }

  // If we have results, show the results display
  if (inferenceResult && runId) {
    return <ResultsDisplay inferenceResult={inferenceResult} runId={runId} onNewAnalysis={handleNewAnalysis} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">📊 Comprehensive Data Input</h1>
        <p className="text-gray-600 text-lg mb-8">Enter specimen data, non-lab inputs, and qualitative information</p>

        {/* Step Indicator */}
        <div className="mb-8 flex gap-2">
          {['specimen', 'nonlab', 'qualitative', 'review'].map(s => (
            <button
              key={s}
              onClick={() => setStep(s as any)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {s === 'specimen' && '🧪 Specimens'}
              {s === 'nonlab' && '👤 Non-Lab'}
              {s === 'qualitative' && '🧠 Qualitative'}
              {s === 'review' && '✅ Review'}
            </button>
          ))}
        </div>

        {/* STEP 1: SPECIMEN INPUT */}
        {step === 'specimen' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6 border border-dashed border-blue-300">
              <h2 className="text-xl font-bold text-gray-900 mb-2">📄 Upload Schema to Auto-Fill</h2>
              <p className="text-gray-600 mb-3 text-sm">Upload a JSON schema (can be .json, .txt, .csv, or doc text containing JSON). We will parse specimens, non-lab, and qualitative inputs automatically.</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  📁 Upload Schema File
                </button>
                <span className="text-sm text-gray-500">Supported: JSON inside any text/CSV file</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt,.csv,.doc,.docx,.rtf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleSchemaUpload(file)
                    e.target.value = ''
                  }
                }}
              />
            </div>
            {/* Specimen Selector */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🧪 Select Specimen Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(Object.keys(SPECIMEN_VARIABLE_MAP) as SpecimenType[]).map(specimen => (
                  <button
                    key={specimen}
                    onClick={() => setSelectedSpecimen(specimen)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedSpecimen === specimen
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <p className="font-bold text-gray-900">{specimen.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-600 mt-1">{SPECIMEN_DESCRIPTIONS[specimen]}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Specimen Form */}
            {selectedSpecimen && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Enter {selectedSpecimen} Values
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(SPECIMEN_VARIABLE_MAP[selectedSpecimen]).map(([key, spec]) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {key.replace(/_/g, ' ').toUpperCase()}
                        <span className="text-xs text-gray-500 ml-2">({spec.unit})</span>
                      </label>
                      <input
                        type={spec.var_type === 'number' ? 'number' : 'text'}
                        value={currentSpecimenValues[key] ?? ''}
                        onChange={e => handleSpecimenValueChange(key, e.target.value)}
                        placeholder={`Enter ${spec.unit}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddSpecimen}
                  className="mt-6 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                >
                  ✅ Add {selectedSpecimen} Specimen
                </button>
              </div>
            )}

            {/* Added Specimens List */}
            {specimens.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Added Specimens ({specimens.length})</h3>
                <div className="space-y-3">
                  {specimens.map((spec, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-bold text-gray-900">{spec.specimen_type}</p>
                      <p className="text-sm text-gray-600">
                        Values: {Object.values(spec.raw_values).filter((v: any) => v !== null && v !== undefined).length} fields
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep('nonlab')}
                  className="mt-4 w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                  Next: Non-Lab Inputs ▶️
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: NON-LAB INPUTS */}
        {step === 'nonlab' && (
          <div className="space-y-6">
            {/* Demographics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Demographics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age (years)</label>
                  <input
                    type="number"
                    value={nonLabData.demographics.age}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      demographics: { ...nonLabData.demographics, age: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sex at Birth</label>
                  <select
                    value={nonLabData.demographics.sex_at_birth}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      demographics: { ...nonLabData.demographics, sex_at_birth: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="intersex">Intersex</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Anthropometrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">📏 Anthropometrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={nonLabData.anthropometrics.height_cm}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      anthropometrics: { ...nonLabData.anthropometrics, height_cm: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={nonLabData.anthropometrics.weight_kg}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      anthropometrics: { ...nonLabData.anthropometrics, weight_kg: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Waist (cm)</label>
                  <input
                    type="number"
                    value={nonLabData.anthropometrics.waist_cm}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      anthropometrics: { ...nonLabData.anthropometrics, waist_cm: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Body Fat (%)</label>
                  <input
                    type="number"
                    value={nonLabData.anthropometrics.body_fat_pct}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      anthropometrics: { ...nonLabData.anthropometrics, body_fat_pct: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Vitals & Physiology */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">❤️ Vitals & Physiology</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={nonLabData.vitals_physiology.heart_rate}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      vitals_physiology: { ...nonLabData.vitals_physiology, heart_rate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">HRV (ms)</label>
                  <input
                    type="number"
                    value={nonLabData.vitals_physiology.hrv}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      vitals_physiology: { ...nonLabData.vitals_physiology, hrv: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">BP Systolic (mmHg)</label>
                  <input
                    type="number"
                    value={nonLabData.vitals_physiology.bp_systolic}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      vitals_physiology: { ...nonLabData.vitals_physiology, bp_systolic: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">BP Diastolic (mmHg)</label>
                  <input
                    type="number"
                    value={nonLabData.vitals_physiology.bp_diastolic}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      vitals_physiology: { ...nonLabData.vitals_physiology, bp_diastolic: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Temperature (°C)</label>
                  <input
                    type="number"
                    value={nonLabData.vitals_physiology.temperature_c}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      vitals_physiology: { ...nonLabData.vitals_physiology, temperature_c: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Sleep & Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">😴 Sleep & Activity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sleep Duration (hours)</label>
                  <input
                    type="number"
                    value={nonLabData.sleep_activity.sleep_duration_hr}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      sleep_activity: { ...nonLabData.sleep_activity, sleep_duration_hr: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sleep Quality (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={nonLabData.sleep_activity.sleep_quality_0_10}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      sleep_activity: { ...nonLabData.sleep_activity, sleep_quality_0_10: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Level (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={nonLabData.sleep_activity.activity_level_0_10}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      sleep_activity: { ...nonLabData.sleep_activity, activity_level_0_10: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Intake & Exposure */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🍽️ Intake & Exposure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fluid Intake (mL/24h)</label>
                  <input
                    type="number"
                    value={nonLabData.intake_exposure.fluid_intake_ml_24h}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      intake_exposure: { ...nonLabData.intake_exposure, fluid_intake_ml_24h: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sodium Intake (mg/24h est.)</label>
                  <input
                    type="number"
                    value={nonLabData.intake_exposure.sodium_intake_mg_24h_est}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      intake_exposure: { ...nonLabData.intake_exposure, sodium_intake_mg_24h_est: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Alcohol (units/24h)</label>
                  <input
                    type="number"
                    value={nonLabData.intake_exposure.alcohol_units_24h}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      intake_exposure: { ...nonLabData.intake_exposure, alcohol_units_24h: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Caffeine (mg/24h)</label>
                  <input
                    type="number"
                    value={nonLabData.intake_exposure.caffeine_mg_24h}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      intake_exposure: { ...nonLabData.intake_exposure, caffeine_mg_24h: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nicotine Use</label>
                  <select
                    value={nonLabData.intake_exposure.nicotine_use}
                    onChange={e => setNonLabData({
                      ...nonLabData,
                      intake_exposure: { ...nonLabData.intake_exposure, nicotine_use: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="none">None</option>
                    <option value="occasional">Occasional</option>
                    <option value="daily">Daily</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('specimen')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                ◀️ Back
              </button>
              <button
                onClick={() => setStep('qualitative')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
              >
                Next: Qualitative Inputs ▶️
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: QUALITATIVE INPUTS */}
        {step === 'qualitative' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">🧠 Qualitative Information</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stress Level (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={qualitativeData.stress_level}
                    onChange={e => setQualitativeData({ ...qualitativeData, stress_level: e.target.value })}
                    placeholder="0 = Very calm, 10 = Very stressed"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sleep Quality Last Night (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={qualitativeData.sleep_quality}
                    onChange={e => setQualitativeData({ ...qualitativeData, sleep_quality: e.target.value })}
                    placeholder="0 = Terrible, 10 = Perfect"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Recent Diet Pattern</label>
                  <select
                    value={qualitativeData.recent_diet_pattern}
                    onChange={e => setQualitativeData({ ...qualitativeData, recent_diet_pattern: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select...</option>
                    <option value="high_carb">High Carb</option>
                    <option value="high_fat">High Fat</option>
                    <option value="high_protein">High Protein</option>
                    <option value="balanced">Balanced</option>
                    <option value="intermittent_fasting">Intermittent Fasting</option>
                    <option value="restricted">Calorie Restricted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Current Symptoms</label>
                  <textarea
                    value={qualitativeData.symptoms_present}
                    onChange={e => setQualitativeData({ ...qualitativeData, symptoms_present: e.target.value })}
                    placeholder="Any current symptoms or concerns (fatigue, headaches, etc.)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hormonal Context (if applicable)</label>
                  <select
                    value={qualitativeData.hormonal_context}
                    onChange={e => setQualitativeData({ ...qualitativeData, hormonal_context: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select or skip...</option>
                    <option value="menstrual_follicular">Menstrual/Follicular Phase</option>
                    <option value="ovulation">Ovulation</option>
                    <option value="luteal">Luteal Phase</option>
                    <option value="pregnant">Pregnant</option>
                    <option value="postpartum">Postpartum</option>
                    <option value="menopausal">Menopausal</option>
                    <option value="on_hrt">On HRT</option>
                    <option value="on_trt">On TRT</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('nonlab')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                ◀️ Back
              </button>
              <button
                onClick={() => setStep('review')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
              >
                Next: Review & Submit ▶️
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Review Your Data</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Specimens ({specimens.length})</h4>
                  {specimens.map((spec, idx) => (
                    <p key={idx} className="text-sm text-gray-700">
                      • {spec.specimen_type}: {Object.values(spec.raw_values).filter((v: any) => v).length} values entered
                    </p>
                  ))}
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Non-Lab Inputs</h4>
                  <p className="text-sm text-gray-700">
                    • Age: {nonLabData.demographics.age || 'Not provided'}
                  </p>
                  <p className="text-sm text-gray-700">
                    • Heart Rate: {nonLabData.vitals_physiology.heart_rate || 'Not provided'} bpm
                  </p>
                  <p className="text-sm text-gray-700">
                    • Sleep Duration: {nonLabData.sleep_activity.sleep_duration_hr || 'Not provided'} hours
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Qualitative Data</h4>
                  <p className="text-sm text-gray-700">
                    • Stress Level: {qualitativeData.stress_level || 'Not provided'}/10
                  </p>
                  <p className="text-sm text-gray-700">
                    • Diet Pattern: {qualitativeData.recent_diet_pattern || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('qualitative')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                ◀️ Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-1 px-6 py-3 rounded-lg font-bold text-lg text-white ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isSubmitting ? 'Submitting...' : '🚀 Submit to Analysis Pipeline'}
              </button>
            </div>
          </div>
        )}
      </div>

      {pipelineStatus && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white shadow-2xl rounded-lg p-6 w-96 animate-pulse">
          <div className="flex items-center mb-2">
            <div className="w-4 h-4 bg-white rounded-full mr-3 animate-ping"></div>
            <p className="font-bold text-lg">Pipeline Processing</p>
          </div>
          <p className="text-white text-sm">{pipelineStatus}</p>
          {runId && <p className="text-xs text-blue-200 mt-2 font-mono">Run ID: {runId}</p>}
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
