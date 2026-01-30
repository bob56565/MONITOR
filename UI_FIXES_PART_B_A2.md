# UI Fixes: Part B Display + A2 Auto-Run + Export Options

## Summary of Changes Needed

### 1. Fix Part B Report Display (CRITICAL)
**Problem**: Report shows as raw JSON instead of organized panels
**Solution**: Update `displayPartBReport()` to handle actual data structure with panels like `metabolic_regulation`, `lipid_cardiometabolic`, etc.

### 2. Add Export Options for Part B
**Add two functions**:
- `exportPartBJSON()` - Downloads JSON/CSV format
- `exportPartBPDF()` - Downloads professional PDF

### 3. Auto-Run A2 After Part A Submission
**Change**: After Part A submission succeeds, automatically call A2 completeness check
**Benefits**: User sees data quality analysis immediately

### 4. Improve A2 Display with Explanations
**Add**: User-friendly descriptions of what each metric means and why it matters

### 5. Expand Qualitative Encoding Rules
**Add more encoding rules** for fields like:
- Work schedule (shift work affects cortisol, sleep)
- Exercise type (strength vs cardio affects recovery markers)
- Smoking/vaping (affects inflammatory markers)
- Climate exposure (affects hydration needs)

## Files Requiring Manual Updates

### File: `app/api/part_b.py`
Add PDF export endpoint:

```python
@router.get("/export-pdf/{submission_id}")
async def export_part_b_pdf(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export Part B report as professional PDF."""
    from app.services.pdf_generator import generate_part_b_pdf
    
    request = PartBGenerationRequest(submission_id=submission_id)
    response = PartBOrchestrator.generate_report(
        db=db,
        user_id=current_user.id,
        request=request
    )
    
    if response.status == "error":
        raise HTTPException(status_code=404, detail="Report generation failed")
    
    pdf_bytes = generate_part_b_pdf(response.report)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=partb_report_{submission_id}.pdf"
        }
    )
```

### File: `encoding/qualitative_to_quantitative/encoding_registry.py`
Add more rules in `_initialize_builtin_rules()`:

```python
# Work schedule encodings
self.register_rule(
    input_field="activity_lifestyle.shift_work",
    input_value=True,
    rule=QualitativeEncodingRule(
        input_field="activity_lifestyle.shift_work",
        input_value="true",
        standardized_code="LIFESTYLE_SHIFT_WORK",
        numeric_weight=1.25,
        time_window="chronic",
        direction_of_effect={
            "cortisol_pattern_disruption": 0.40,
            "sleep_quality_modifier": -0.30,
            "glucose_variability": 0.20
        },
        notes="Shift work disrupts circadian rhythm"
    )
)

# Smoking/vaping
self.register_rule(
    input_field="activity_lifestyle.smoking_vaping",
    input_value="current_smoker",
    rule=QualitativeEncodingRule(
        input_field="activity_lifestyle.smoking_vaping",
        input_value="current_smoker",
        standardized_code="LIFESTYLE_SMOKING_ACTIVE",
        numeric_weight=1.50,
        time_window="chronic",
        direction_of_effect={
            "inflammatory_markers": 0.45,
            "oxidative_stress": 0.50,
            "cardiovascular_risk": 0.35,
            "vitamin_c_depletion": 0.30
        },
        notes="Active smoking increases inflammation and oxidative stress"
    )
)

# Exercise type
self.register_rule(
    input_field="activity_lifestyle.exercise_type",
    input_value="endurance",
    rule=QualitativeEncodingRule(
        input_field="activity_lifestyle.exercise_type",
        input_value="endurance",
        standardized_code="EXERCISE_TYPE_ENDURANCE",
        numeric_weight=1.10,
        time_window="acute",
        direction_of_effect={
            "lactate_clearance_rate": 0.25,
            "mitochondrial_efficiency": 0.20,
            "glycogen_utilization": 0.30
        },
        notes="Endurance training improves metabolic efficiency"
    )
)
```

## Testing Steps

1. **Test Part B Display**:
   - Submit Part A data
   - Generate Part B report
   - Verify panels display with organized sections
   - Check export buttons appear

2. **Test Exports**:
   - Click "Export JSON" - should download JSON file
   - Click "Export PDF" - should download formatted PDF

3. **Test A2 Auto-Run**:
   - Submit Part A data
   - Check that A2 completeness results appear automatically below submission message

4. **Test Qualitative Encoding**:
   - Generate demo patient with Hypertension scenario
   - Submit Part A
   - Verify "Qualitative encodings applied: 2+" (not 0)

## Current Status

- Part B display function updated (needs backend to return correct structure)
- Export button placeholders added (needs backend PDF endpoint)
- A2 auto-run logic needs to be integrated
- Encoding rules expansion pending

## Next Steps

1. Restart backend after making Python file changes
2. Test each feature systematically
3. Check browser console for any errors
4. Verify data flows correctly through entire pipeline
