# 🚀 Specimen-Aware Demo Mode - Quick Start

## TL;DR
**Demo Mode now auto-populates specimen fields (Blood/Saliva/Sweat/Urine) with scenario-realistic values.**

---

## 3-Step Demo Flow

### 1️⃣ Enable + Generate
```
1. Check "Demo Mode" toggle
2. Select scenario (Healthy/Prediabetes/HTN/Dehydration/Poor Sleep)
3. Click "Generate Demo Patient"
```

### 2️⃣ Select Specimens
```
Click any specimen checkbox:
- 🩸 Blood → Auto-fills CMP, CBC, Lipids
- 💧 Saliva → Auto-fills Cortisol, DHEA-S, pH
- 💦 Sweat → Auto-fills Na, Cl, K, Lactate
- 🧪 Urine → Auto-fills SG, pH, Protein
```

### 3️⃣ Submit
```
Click "Submit Part A Data" → Full pipeline runs
```

---

## Scenario Cheat Sheet

| Scenario | Blood | Saliva | Sweat | Urine |
|----------|-------|--------|-------|-------|
| **Healthy** | Glucose 88, HbA1c 5.2 | Cortisol normal | Na 42 | SG 1.015 |
| **Prediabetes** | Glucose 108, HbA1c 5.9 | Cortisol flat | Na 45 | SG 1.018 |
| **Hypertension** | Na 142, Cr 1.05 | Cortisol high | Na 52 | Protein trace |
| **Dehydration** | BUN 24, Na 144 | pH 6.7 | Na 68 | SG 1.028 |
| **Poor Sleep** | Glucose 96, Lipids ↑ | Cortisol flat | Na 44 | SG 1.017 |

---

## Key Features

✅ **Auto-population**: Select specimen → fields fill instantly  
✅ **Multi-specimen**: Select all 4 → all populate  
✅ **Scenario-aligned**: Values match clinical presentation  
✅ **Randomize**: Regenerates patient + specimens  
✅ **Reset**: Clears everything including specimens  
✅ **Manual mode**: Demo Mode OFF = normal entry  

---

## URLs

- **Frontend**: `http://localhost:8000/`
- **Backend API**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

---

## Testing Commands

```bash
# Backend tests (should pass 37/37)
cd /workspaces/MONITOR && python3 -m pytest tests/test_api.py -v

# Scenario validation
cd /workspaces/MONITOR && python3 test_specimen_scenarios.py

# Backend health
curl http://localhost:8000/health
```

---

## Troubleshooting

**Specimens not auto-filling?**  
→ Check Demo Mode toggle is ON  
→ Click "Generate Demo Patient" first  

**Values look wrong?**  
→ Check scenario selector matches expectations  
→ Values are deterministic per scenario  

**Can't submit?**  
→ ISF Monitor data (Glucose/Lactate) required  
→ Specimens are optional additional context  

---

## What Changed

**Single file modified**: `ui/demo/production_platform.html`

**New functions**:
- `generateDemoSpecimenPayload()` - Scenario-based value generator
- `populateSpecimenFields()` - UI field population

**Enhanced functions**:
- `toggleSpecimen()` - Auto-fill when Demo Mode ON
- `generateDemoPatient()` - Also populates specimens
- `resetForm()` - Clears specimen containers

**Backend changes**: ✅ ZERO (no API/DB/logic changes)

---

## Technical Details

**Specimens supported**: 4 (Blood, Saliva, Sweat, Urine)  
**Scenarios supported**: 5 (Healthy, Prediabetes, HTN, Dehydration, Poor Sleep)  
**Total combinations**: 20 (all validated)  
**Backend compatibility**: 100% (all tests pass)  
**Clinical plausibility**: ✅ Verified  

---

**Full Documentation**: `SPECIMEN_DEMO_IMPLEMENTATION_REPORT.md`

**Status**: ✅ PRODUCTION READY
