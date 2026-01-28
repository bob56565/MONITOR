# Results UI Integration Guide

This guide explains how to integrate the new Results UI with your existing React application.

## 📋 Overview

The Results UI consists of:
- **8 core files** across 5 directories
- **3 main pages**: Overview, Labs, Key/Legend
- **9 reusable components**: ConfidenceMeter, SupportBadge, StateCard, etc.
- **3 custom hooks**: useResults, useResultsFilters, useToasts
- **API service layer**: Handles all backend communication with auth

## 🗂️ File Structure

```
src/
├── types/
│   └── results.ts              # TypeScript type definitions
├── services/
│   └── inferenceApi.ts         # API layer + backend calls
├── components/
│   └── results/
│       └── ResultsComponents.tsx   # Reusable UI components
├── pages/
│   └── results/
│       ├── index.tsx               # Main layout + router helper
│       ├── OverviewPage.tsx        # Physiological state summary
│       ├── LabsPage.tsx            # Detailed results with filters
│       └── KeyLegendPage.tsx       # Legend + FAQ
└── hooks/
    └── useResults.ts           # State management hooks
```

## 🔌 Integration Steps

### 1. Import Router Helper

In your main app router file (e.g., `src/App.tsx` or `src/routes.ts`):

```typescript
import { getResultsRoutes } from './pages/results';

// In your router configuration:
const routes = [
  // ... your existing routes ...
  ...getResultsRoutes(), // Add results routes
];
```

### 2. Add Results Route

The helper exports a route structure like:

```typescript
[
  {
    path: '/results',
    element: <ResultsLayout />,
    children: [
      { path: '', element: <ResultsOverviewPage /> },
      { path: 'overview', element: <ResultsOverviewPage /> },
      { path: 'labs', element: <LabsPage /> },
      { path: 'trends', element: <TrendsPage /> },
      { path: 'details', element: <DetailsPage /> },
      { path: 'key', element: <KeyLegendPage /> },
    ]
  }
]
```

### 3. Update Navigation Menu

Add a link to Results in your main navigation:

```typescript
<nav>
  {/* ... existing nav items ... */}
  <a href="/results" className="nav-item">
    📊 Results
  </a>
</nav>
```

### 4. Configure Auth Token Storage

The API service expects the Bearer token in `localStorage` or `sessionStorage`:

```typescript
// After user logs in, store token:
localStorage.setItem('authToken', 'Bearer YOUR_TOKEN_HERE');

// Or use sessionStorage for session-only auth:
sessionStorage.setItem('authToken', 'Bearer YOUR_TOKEN_HERE');
```

The service will automatically use it for all API calls.

### 5. Ensure Backend Endpoints Are Available

The Results UI requires these backend endpoints (already implemented):

- ✅ `POST /ai/inference/v2` — Run v2 inference
- ✅ `POST /ai/inference` — Run legacy inference  
- ✅ `GET /results/latest` — Fetch latest results
- ✅ `GET /results/history?limit=50` — Fetch result history

Verify these are accessible from your frontend domain (consider CORS settings).

## 🎨 Styling

All styling uses **Tailwind CSS** embedded in component JSX.

### Tailwind Configuration

A `tailwind.config.js` file is provided with:
- Clinical-themed color palette
- Custom component utilities (.card, .badge, .btn, etc.)
- Accessibility utilities (.sr-only, .focus-ring)
- Animations (fade-in, slide-in)

### Custom Components Defined

The following utility classes are pre-defined:

```css
.card          /* Rounded card with border + shadow */
.card-hover    /* Card with hover effects */
.badge-*       /* Colored badges (primary, success, warning, etc.) */
.btn-*         /* Styled buttons */
.input         /* Form input styling */
.text-heading-* /* Typography helpers */
.state-*       /* State-specific backgrounds (success, warning, etc.) */
```

## 🪝 Using Custom Hooks

### useResults

Main hook for results state management:

```typescript
import { useResults } from './hooks/useResults';

function MyComponent() {
  const {
    results,           // ResultBundle | null
    loading,           // boolean
    error,             // Error | null
    mode,              // 'v2' | 'legacy'
    setMode,           // (mode: 'v2' | 'legacy') => void
    runInference,      // (runId: string) => Promise<void>
    refresh,           // () => Promise<void>
    clear,             // () => void
    hasResults,        // boolean (derived)
    totalProduced,     // number (derived)
    totalSuppressed,   // number (derived)
  } = useResults({ autoLoad: true, cacheMs: 0 });

  return (
    <div>
      {loading && <p>Loading...</p>}
      {results && <ResultsDisplay results={results} />}
    </div>
  );
}
```

### useResultsFilters

Filter state management:

```typescript
import { useResultsFilters } from './hooks/useResults';

function FilterPanel() {
  const {
    filters,           // FiltersState
    updateFilter,      // (key: string, value: any) => void
    resetFilters,      // () => void
    toggleSupportType, // (type: SupportType) => void
  } = useResultsFilters();

  return (
    <input
      onChange={(e) => updateFilter('search_query', e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### useToasts

Toast notification management:

```typescript
import { useToasts } from './hooks/useResults';

function MyComponent() {
  const { addToast, removeToast, toasts } = useToasts();

  const handleSuccess = () => {
    addToast('success', 'Inference complete!', 5000);
  };

  return (
    <div>
      <button onClick={handleSuccess}>Run</button>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
```

## 🔐 Authentication

The API service handles Bearer token auth automatically:

```typescript
// Tokens are read from:
1. localStorage.getItem('authToken')
2. sessionStorage.getItem('authToken')

// All requests include:
Authorization: "Bearer <token>"

// If 401 Unauthorized:
1. localStorage is cleared
2. User is redirected to login
3. Error toast is shown
```

## 🧪 Testing

### Component Testing

All components can be tested with Vitest/Jest:

```typescript
import { render, screen } from '@testing-library/react';
import { ConfidenceMeter } from './components/results/ResultsComponents';

test('renders confidence meter', () => {
  render(<ConfidenceMeter value={0.85} size="md" />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### Hook Testing

Custom hooks can be tested with `@testing-library/react`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useResults } from './hooks/useResults';

test('runInference updates state', async () => {
  const { result } = renderHook(() => useResults());
  
  act(() => {
    result.current.runInference('run-123');
  });

  expect(result.current.loading).toBe(true);
});
```

## 📊 Data Model

### ResultBundle

The main data structure returned from inference:

```typescript
interface ResultBundle {
  bundle_id: string;              // Unique ID
  timestamp: string;              // ISO 8601 timestamp
  mode: 'v2' | 'legacy';         // Inference mode
  summary: PhysiologicalSummary;  // 5 physiological states
  panels: PanelData[];            // Lab panels with produced/suppressed
  disclaimers: string[];          // Medical disclaimers
}

interface PhysiologicalSummary {
  metabolic_state: PhysiologicalState;
  hydration_status: PhysiologicalState;
  stress_recovery: PhysiologicalState;
  inflammatory_tone: PhysiologicalState;
  renal_stress: PhysiologicalState;
}

interface ProducedOutput {
  analyte: string;
  value: number;
  unit: string;
  reference_range: string;
  confidence: number;              // 0-1 scale
  range_estimate: 'low' | 'normal' | 'high';
  support_type: SupportType;
  user_explanation: string;
  clinical_notes?: string;
  evidence: {
    specimen_sources: string[];
    signals_used: string[];
    coherence: number;
    disagreement: number;
    interference_flags: string[];
  };
}

interface SuppressedOutput {
  analyte: string;
  suppression_reason: SuppressionReason;
  plain_english_reason: string;
  details: {
    failed_dependencies: string[];
  };
  notes?: string;
}
```

## 🎯 Common Tasks

### Add New Physiological State to Overview

1. Add type to `PhysiologicalSummary` in `types/results.ts`
2. Add `<StateCard>` in `OverviewPage.tsx` grid
3. Update legend in `KeyLegendPage.tsx`

### Customize Component Styling

All components use Tailwind classes. To override:

```typescript
// In ResultsComponents.tsx, modify className props:
<div className="card p-6 bg-blue-50"> {/* Custom background */}
  ...
</div>
```

### Add New Filter Type

1. Add to `FiltersState` in `types/results.ts`
2. Add UI control in `LabsPage.tsx`
3. Apply filter in `applyFilters()` function

### Extend API Service

Add new endpoints to `inferenceApi.ts`:

```typescript
export async function fetchCustomData() {
  const token = getAuthToken();
  const response = await authFetch('/api/custom', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

## ⚠️ Common Issues

### Issue: "Cannot find module 'results.ts'"

**Solution**: Ensure all 8 files are in correct locations:
```
src/types/results.ts
src/services/inferenceApi.ts
src/components/results/ResultsComponents.tsx
src/pages/results/OverviewPage.tsx
src/pages/results/LabsPage.tsx
src/pages/results/KeyLegendPage.tsx
src/pages/results/index.tsx
src/hooks/useResults.ts
```

### Issue: "401 Unauthorized on API calls"

**Solution**: Verify token is stored:
```typescript
console.log('Token:', localStorage.getItem('authToken'));
```

### Issue: "Routes not appearing in navigation"

**Solution**: Ensure `getResultsRoutes()` is imported and used in router config

### Issue: "Styling not applied (Tailwind)"

**Solution**: Verify `tailwind.config.js` content paths include `./src/**/*.{js,ts,jsx,tsx}`

## 🚀 Performance Tips

1. **Lazy Load Pages**: Use React's `lazy()` and `Suspense`
   ```typescript
   const LabsPage = lazy(() => import('./pages/results/LabsPage'));
   ```

2. **Memoize Components**: Prevent unnecessary re-renders
   ```typescript
   export const AnalyteRow = memo(AnalyteRowComponent);
   ```

3. **Cache Results**: Set `cacheMs` in `useResults` hook
   ```typescript
   useResults({ cacheMs: 5 * 60 * 1000 }) // 5 min cache
   ```

4. **Paginate Large Lists**: Add pagination to `LabsPage`

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Router Documentation](https://reactrouter.com)

## ✅ Integration Checklist

- [ ] All 8 files created in correct locations
- [ ] `tailwind.config.js` configured
- [ ] Router helper imported in main app
- [ ] Routes added to app router
- [ ] "Results" nav item added
- [ ] Auth token storage configured
- [ ] Backend endpoints verified accessible
- [ ] Test run inference workflow
- [ ] Check responsive design on mobile
- [ ] Verify accessibility (keyboard nav, ARIA labels)
- [ ] Test error handling (401, network errors)
- [ ] Performance tested (no unnecessary re-renders)

---

**Questions?** Refer to individual file JSDoc comments and TypeScript definitions for detailed API documentation.
