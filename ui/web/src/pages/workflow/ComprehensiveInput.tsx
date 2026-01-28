import React, { useState } from 'react'
import { useWorkflow, useToasts } from '../../hooks/useWorkflow'
import { EmptyState, ToastContainer } from '../../components/results/ResultsComponents'
import { SPECIMEN_VARIABLE_MAP, SPECIMEN_DESCRIPTIONS, MISSING_TYPE_OPTIONS, PROVENANCE_OPTIONS, SpecimenType } from '../../data/specimenConfig'

/**
 * COMPREHENSIVE INPUT PAGE - Milestone 7 Ready
 * Features:
 * - Specimen type selector with dynamic form fields
 * - Multiple specimen support
 * - Non-lab inputs (demographics, vitals, sleep/activity, intake)
 * - Qualitative inputs (stress, sleep, diet, symptoms, hormonal)
 * - Missingness & provenance tracking
 */

export const ComprehensiveInputPage: React.FC = () => {
  const { toasts, addToast } = useToasts()
  const [selectedSpecimen, setSelectedSpecimen] = useState<SpecimenType | null>(null)
  const [specimens, setSpecimens] = useState<any[]>([])
  const [currentSpecimenValues, setCurrentSpecimenValues] = useState<Record<string, any>>({})
  const [step, setStep] = useState<'specimen' | 'nonlab' | 'qualitative' | 'review'>('specimen')

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

  const handleSubmit = async () => {
    if (specimens.length === 0) {
      addToast('error', 'Please add at least one specimen')
      return
    }

    try {
      addToast('info', 'Submitting to backend...')
      
      const payload = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        specimens,
        non_lab_inputs: {
          demographics: nonLabData.demographics,
          anthropometrics: nonLabData.anthropometrics,
          vitals_physiology: nonLabData.vitals_physiology,
          sleep_activity: nonLabData.sleep_activity,
          intake_exposure: nonLabData.intake_exposure,
        },
        qualitative_inputs: {
          stress: qualitativeData.stress_level ? { level_0_10: parseInt(qualitativeData.stress_level) } : null,
          sleep: qualitativeData.sleep_quality ? { subjective_quality_0_10: parseInt(qualitativeData.sleep_quality) } : null,
          diet_recent: qualitativeData.recent_diet_pattern ? { pattern: qualitativeData.recent_diet_pattern } : null,
          symptoms: qualitativeData.symptoms_present ? { description: qualitativeData.symptoms_present } : null,
          hormonal_context: qualitativeData.hormonal_context ? { context: qualitativeData.hormonal_context } : null,
        },
      }

      // Send to backend
      const response = await fetch('/runs/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()
      addToast('success', 'Data submitted successfully!')
      setStep('specimen')
      setSpecimens([])
      setCurrentSpecimenValues({})
    } catch (err) {
      addToast('error', `Submission failed: ${String(err)}`)
    }
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
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg"
              >
                🚀 Submit to Analysis Pipeline
              </button>
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
