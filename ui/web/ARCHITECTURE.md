# Results UI - Architecture & Data Flow

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Application                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    App Router                                │ │
│  │  ├─ /results                      [ResultsLayout]           │ │
│  │  │  ├─ /results/overview          [ResultsOverviewPage]    │ │
│  │  │  ├─ /results/labs              [LabsPage]               │ │
│  │  │  ├─ /results/trends            [TrendsPage]             │ │
│  │  │  ├─ /results/details           [DetailsPage]            │ │
│  │  │  └─ /results/key               [KeyLegendPage]          │ │
│  │  └─ ... (other app routes)                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              State Management Layer (Hooks)                  │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ useResults   │  │useResultsF.. │  │ useToasts    │     │ │
│  │  │              │  │              │  │              │     │ │
│  │  │ • State      │  │ • Filters    │  │ • Toasts[]   │     │ │
│  │  │ • API calls  │  │ • Search     │  │ • Add/Remove │     │ │
│  │  │ • Mode       │  │ • Toggle     │  │ • Auto-dismiss     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Component Layer (Reusable)                      │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ ConfidenceMet│  │ SupportBadge │  │SuppressionBa│     │ │
│  │  │ eter         │  │ (emoji+label)│  │ dge          │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ StateCard    │  │LegendTooltip │  │ EmptyState   │     │ │
│  │  │(expandable)  │  │ (hover tips) │  │ (no data)    │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  │  ┌──────────────┐  ┌──────────────────────────────────┐   │ │
│  │  │ Toast        │  │ Skeleton Components              │   │ │
│  │  │Notification  │  │ (loading placeholders)           │   │ │
│  │  └──────────────┘  └──────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │           Service Layer (API & Type Safety)                  │ │
│  │                                                              │ │
│  │  ┌──────────────────────┐     ┌──────────────────────┐     │ │
│  │  │ inferenceApi.ts      │     │ types/results.ts     │     │ │
│  │  │                      │     │                      │     │ │
│  │  │ • getAuthToken()     │     │ TypeScript           │     │ │
│  │  │ • authFetch()        │────▶│ Interfaces:          │     │ │
│  │  │ • runInferenceV2()   │     │                      │     │ │
│  │  │ • runInferenceLegacy │     │ • ResultBundle       │     │ │
│  │  │ • fetchLatestResults │     │ • SupportType enum   │     │ │
│  │  │ • fetchResultsHistory│     │ • ProducedOutput     │     │ │
│  │  │ • transformResponse()│     │ • SuppressedOutput   │     │ │
│  │  └──────────────────────┘     │ • ... + 9 more       │     │ │
│  │           ▲                    └──────────────────────┘     │ │
│  │           │                                                 │ │
│  └───────────┼──────────────────────────────────────────────────┘ │
│              │                                                     │
│              │ HTTP + Bearer Token                                │
│              ▼                                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│              FastAPI Backend (Already Implemented)                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Endpoints                         │   │
│  │                                                          │   │
│  │  POST /ai/inference/v2      ──▶ Run v2 inference        │   │
│  │  POST /ai/inference         ──▶ Run legacy inference    │   │
│  │  GET /results/latest        ──▶ Fetch latest results    │   │
│  │  GET /results/history?limit ──▶ Fetch history          │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Database (Persisted Results)                │   │
│  │                                                          │   │
│  │  • User inference history                               │   │
│  │  • Result bundles                                       │   │
│  │  • Physiological summaries                              │   │
│  │  • Lab panels (produced + suppressed)                   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### User Views Results (Happy Path)

```
User Clicks "Results" Nav Item
        ▼
   /results Route
        ▼
ResultsLayout Component Mounted
        ▼
useResults Hook Triggered (autoLoad: true)
        ▼
inferenceApi.fetchLatestResults()
        ▼
HTTP GET /results/latest + Bearer Token
        ▼
Backend Returns ResultBundle
        ▼
transformInferenceResponse() Parses Response
        ▼
State Updated: { results: ResultBundle, loading: false }
        ▼
ResultsOverviewPage Re-renders
        ▼
5 StateCard Components Display
        ▼
User Sees:
  • Metabolic State (with confidence meter)
  • Hydration Status (with drivers)
  • Stress & Recovery
  • Inflammatory Tone
  • Renal Stress
        ▼
User Can:
  • Click StateCard to expand (see drivers + notes)
  • Click "View Lab Details" button
  • Click "View Legend/Key" button
  • Click Mode Toggle to switch to legacy
  • Click "Run Inference" button
```

### User Runs Inference

```
User Clicks "Run Inference" Button
        ▼
handleRunInference() Handler Called
        ▼
Select Mode: v2 (recommended) vs Legacy
        ▼
Get run_id from Input (or use latest)
        ▼
Set loading: true, Show Skeleton Cards
        ▼
Call runInferenceV2(run_id) or runInferenceLegacy(run_id)
        ▼
HTTP POST /ai/inference/v2 + Bearer Token
        ▼
Backend Executes Inference
  • Runs eligibility gate (v2 mode)
  • Evaluates output coherence
  • Detects interference patterns
  • Suppresses low-confidence outputs
        ▼
Backend Returns ResultBundle
        ▼
transformInferenceResponse() Parses
        ▼
State Updated: { results: new_bundle, loading: false }
        ▼
All Components Re-render with New Data
        ▼
Toast: "Inference complete!" (green success)
        ▼
User Sees Updated Results
```

### User Filters Lab Results

```
User Types in Search Input (LabsPage)
        ▼
debounce 300ms
        ▼
updateFilter('search_query', value)
        ▼
FiltersState Updated: { search_query: 'LDL' }
        ▼
LabsPage Re-renders
        ▼
applyFilters() Function Called
  • Filter analytes by search_query (case-insensitive)
  • Filter by show_produced
  • Filter by show_suppressed
  • Filter by support_type_filter
  • Filter by low_confidence_only
  • Filter by interference_flagged_only
        ▼
Filtered Results Displayed in Real-Time
        ▼
User Sees Only Matching Analytes
```

### User Clicks on Analyte (Labs Page)

```
User Clicks ProducedAnalyteRow
        ▼
expandedAnalytes Toggle Triggered
        ▼
Show 3-Tab Panel:
  • Explain Tab (default): user_explanation + reference_range
  • Evidence Tab: specimen_sources, signals_used, coherence
  • Clinical Tab: clinical_notes (if present)
        ▼
User Clicks Again
        ▼
Panel Collapses
```

---

## 🔄 Component Composition Tree

```
ResultsLayout (Main Container)
├─ Header (sticky)
├─ TabNavigation (sticky)
│  ├─ Overview Tab
│  ├─ Labs Tab
│  ├─ Trends Tab
│  ├─ Details Tab
│  └─ Key Tab
├─ ContentArea
│  │
│  ├─ [Overview Tab Active]
│  │  └─ ResultsOverviewPage
│  │     ├─ HeaderSection
│  │     │  ├─ Title + Subtitle
│  │     │  ├─ ModeToggle (v2 vs legacy)
│  │     │  └─ RunInferenceButton
│  │     ├─ InfoCallout
│  │     ├─ PhysiologicalSummaryGrid
│  │     │  ├─ StateCard (Metabolic) ◄─ ConfidenceMeter
│  │     │  ├─ StateCard (Hydration)
│  │     │  ├─ StateCard (Stress)
│  │     │  ├─ StateCard (Inflammatory)
│  │     │  └─ StateCard (Renal)
│  │     ├─ DisclaimersSection
│  │     └─ NavigationButtons
│  │     [OR Loading State]
│  │     └─ SkeletonStateCard × 5
│  │     [OR Empty State]
│  │     └─ EmptyState Component
│  │
│  ├─ [Labs Tab Active]
│  │  └─ LabsPage
│  │     ├─ StickyControlsHeader
│  │     │  ├─ SearchInput
│  │     │  ├─ FilterChips
│  │     │  │  ├─ Produced
│  │     │  │  ├─ Suppressed
│  │     │  │  ├─ LowConfidence
│  │     │  │  └─ Interference
│  │     │  └─ SupportTypeFilter
│  │     │     ├─ Direct
│  │     │     ├─ Derived
│  │     │     ├─ Proxy
│  │     │     ├─ Relational
│  │     │     └─ Population
│  │     ├─ PanelAccordionList
│  │     │  ├─ Panel (Chemistry)
│  │     │  │  ├─ ProducedSection (green)
│  │     │  │  │  ├─ ProducedAnalyteRow (LDL)
│  │     │  │  │  │  ├─ AnalyteName + SupportBadge + ConfidenceMeter
│  │     │  │  │  │  ├─ MetaInfo (value, unit, ref range)
│  │     │  │  │  │  └─ [Expanded Tabs]
│  │     │  │  │  │     ├─ Explain
│  │     │  │  │  │     ├─ Evidence
│  │     │  │  │  │     └─ Clinical
│  │     │  │  │  └─ ProducedAnalyteRow (HDL)
│  │     │  │  └─ SuppressedSection (gray)
│  │     │  │     ├─ SuppressedAnalyteRow (Apo-B)
│  │     │  │     │  ├─ AnalyteName + SuppressionBadge
│  │     │  │     │  └─ [Expanded Details]
│  │     │  │     │     ├─ FailedDependencies
│  │     │  │     │     └─ HowToResolve
│  │     │  │     └─ SuppressedAnalyteRow (Lipoprotein(a))
│  │     │  │
│  │     │  └─ Panel (Hematology)
│  │     │     ├─ ProducedAnalyteRow (Hemoglobin)
│  │     │     ├─ SuppressedAnalyteRow (...)
│  │     │     └─ ...
│  │     │
│  │     [OR Loading State]
│  │     └─ SkeletonAnalyteRow × 10
│  │     [OR Empty State]
│  │     └─ EmptyState ("No Matching Results")
│  │
│  ├─ [Trends Tab Active]
│  │  └─ TrendsPage (Placeholder)
│  │
│  ├─ [Details Tab Active]
│  │  └─ DetailsPage
│  │     └─ JSONViewer (expandable ResultBundle)
│  │
│  └─ [Key Tab Active]
│     └─ KeyLegendPage
│        ├─ SafetyDisclaimer
│        ├─ VisualGuides
│        │  ├─ ConfidenceMeterGuide
│        │  ├─ SupportTypeGuide
│        │  └─ SuppressionGuide
│        ├─ LegendSections × 5
│        │  ├─ CoreConcepts
│        │  ├─ SupportTypes
│        │  ├─ SuppressionReasons
│        │  ├─ QualitySignals
│        │  └─ PhysiologicalStates
│        ├─ FAQSection
│        └─ TipsSection
│
└─ ToastContainer (always present)
   ├─ Toast (success)
   └─ Toast (error)
```

---

## 🔐 Authentication Flow

```
User Logs In (Somewhere in App)
        ▼
Backend Returns Auth Token
        ▼
App Stores Token:
  localStorage.setItem('authToken', 'Bearer YOUR_TOKEN')
        ▼
User Navigates to /results
        ▼
useResults Hook Mounted
        ▼
fetchLatestResults() Called
        ▼
getAuthToken() Retrieves Token from localStorage
        ▼
authFetch() Adds Header:
  Authorization: Bearer YOUR_TOKEN
        ▼
HTTP GET /results/latest [with Authorization header]
        ▼
Backend Validates Token
  ├─ Valid ────▶ Returns ResultBundle
  └─ Invalid ──▶ Returns 401 Unauthorized
        ▼
authFetch() Handles Response:
  ├─ 200 ──────▶ Return data
  ├─ 401 ──────▶ localStorage.clear() + redirect to /login
  └─ Other ────▶ throw error (show toast)
        ▼
UI Updates with Results
```

---

## 📊 State Management Architecture

```
Global State (URL + localStorage)
    ├─ currentTab (URL param: /results/overview)
    ├─ authToken (localStorage)
    └─ userPreferences (localStorage)
            ▼
Component Level State (Hooks)
    │
    ├─ useResults(autoLoad: true)
    │  ├─ results ────────────────────▶ ResultBundle
    │  ├─ loading ─────────────────────▶ boolean
    │  ├─ error ───────────────────────▶ Error | null
    │  ├─ mode ───────────────────────▶ 'v2' | 'legacy'
    │  └─ functions
    │     ├─ runInference(runId)
    │     ├─ refresh()
    │     ├─ clear()
    │     └─ setMode(mode)
    │
    ├─ useResultsFilters()
    │  ├─ search_query ────────────────▶ string
    │  ├─ show_produced ───────────────▶ boolean
    │  ├─ show_suppressed ─────────────▶ boolean
    │  ├─ low_confidence_only ────────▶ boolean
    │  ├─ interference_flagged_only ──▶ boolean
    │  ├─ support_type_filter ────────▶ SupportType[]
    │  └─ functions
    │     ├─ updateFilter(key, value)
    │     ├─ resetFilters()
    │     └─ toggleSupportType(type)
    │
    └─ useToasts()
       ├─ toasts ────────────────────▶ Toast[]
       ├─ addToast(type, msg, duration)
       └─ removeToast(id)
```

---

## 🎯 Data Model Hierarchy

```
ResultBundle (Top Level)
├─ bundle_id: string
├─ timestamp: ISO8601
├─ mode: 'v2' | 'legacy'
│
├─ summary: PhysiologicalSummary (5 key states)
│  ├─ metabolic_state: PhysiologicalState
│  │  ├─ label: string
│  │  ├─ confidence: 0-1
│  │  ├─ drivers: string[]
│  │  └─ notes: string
│  ├─ hydration_status
│  ├─ stress_recovery
│  ├─ inflammatory_tone
│  └─ renal_stress
│
├─ panels: PanelData[] (Lab panels)
│  ├─ panel_name: string
│  ├─ produced_outputs: ProducedOutput[] (shown)
│  │  ├─ analyte: string
│  │  ├─ value: number
│  │  ├─ unit: string
│  │  ├─ reference_range: string
│  │  ├─ confidence: 0-1
│  │  ├─ support_type: SupportType
│  │  ├─ user_explanation: string
│  │  ├─ clinical_notes?: string
│  │  └─ evidence
│  │     ├─ specimen_sources: string[]
│  │     ├─ signals_used: string[]
│  │     ├─ coherence: number
│  │     ├─ disagreement: number
│  │     └─ interference_flags: string[]
│  │
│  └─ suppressed_outputs: SuppressedOutput[] (hidden)
│     ├─ analyte: string
│     ├─ suppression_reason: enum
│     ├─ plain_english_reason: string
│     ├─ details
│     │  └─ failed_dependencies: string[]
│     └─ notes?: string
│
└─ disclaimers: string[] (Medical warnings)
```

---

## 🚀 Type Safety Cascade

```
TypeScript Strict Mode
        ▼
types/results.ts (Type Definitions)
├─ SupportType enum
├─ SuppressionReason enum
├─ PhysiologicalState interface
├─ ProducedOutput interface
├─ SuppressedOutput interface
├─ ResultBundle interface
└─ 9 more types...
        ▼
inferenceApi.ts (API Layer)
├─ getAuthToken(): string
├─ authFetch(url, options): Promise<Response>
├─ runInferenceV2(runId): Promise<ResultBundle>
├─ runInferenceLegacy(runId): Promise<ResultBundle>
├─ fetchLatestResults(): Promise<ResultBundle>
└─ transformInferenceResponse(): ResultBundle
        ▼
useResults.ts (Hooks)
├─ useResults(options): UseResultsReturn
├─ useResultsFilters(): UseResultsFiltersReturn
└─ useToasts(): UseToastsReturn
        ▼
Components (React)
├─ StateCard<T extends PhysiologicalState>
├─ ProducedAnalyteRow<ProducedOutput>
├─ SuppressedAnalyteRow<SuppressedOutput>
├─ LabsPage<ResultBundle>
└─ ResultsOverviewPage<ResultBundle>
        ▼
Zero `any` Types (Except Intentional Stubs)
✅ Full Type Safety Throughout
```

---

## 🔗 External Dependencies

```
React 18+
├─ React (core)
├─ React Router (navigation)
├─ TypeScript (type safety)
└─ Tailwind CSS (styling)

Backend API
├─ POST /ai/inference/v2
├─ POST /ai/inference
├─ GET /results/latest
└─ GET /results/history

localStorage API (Browser)
└─ Store auth token + preferences

Browser APIs
├─ fetch (HTTP)
├─ localStorage/sessionStorage
├─ setTimeout (auto-dismiss toasts)
└─ keyboard events (accessibility)

Third-Party Services
└─ None (fully self-contained)
```

---

## ✨ Key Design Patterns

### 1. Component Composition
```typescript
// Small, reusable pieces
<StateCard>
  <ConfidenceMeter />
  <DriversList />
</StateCard>

// Composes into pages
<OverviewPage>
  <StateCard /> × 5
</OverviewPage>
```

### 2. Custom Hooks for Logic
```typescript
// Separate logic from presentation
const { results, loading } = useResults();
const { filters, updateFilter } = useResultsFilters();

// Components just render
<div>{results && <ResultsDisplay />}</div>
```

### 3. Service Layer for API
```typescript
// Centralized API calls
const results = await runInferenceV2(runId);

// Easy to mock, test, swap implementations
```

### 4. Type Safety First
```typescript
// Every function has types
function runInference(runId: string): Promise<ResultBundle> {}

// Props are typed
interface StateCardProps {
  state: PhysiologicalState;
  expanded: boolean;
}
```

### 5. Accessibility Built-In
```typescript
// ARIA labels on all interactive elements
<button aria-label="Expand state details">

// Semantic HTML
<nav>
  <main>
    <section role="tablist">
```

---

## 🎯 Design Decisions

| Decision | Rationale |
|----------|-----------|
| Component-based | Reusability, testability, maintainability |
| Custom hooks | Logic separation, composition, easier testing |
| Service layer | Centralized API, easy mocking, consistency |
| TypeScript strict | Catch errors at compile time, better DX |
| Tailwind CSS | Utility-first, consistent design system, fast |
| Non-breaking | Additive only, existing UI untouched |
| Stub data | Demo without backend dependency |
| Accessibility first | Inclusive design, legal compliance, better UX |

---

## 📈 Scalability Path

```
Current State (MVP ✅)
├─ 8 core files
├─ 11 reusable components
├─ 3 main pages
└─ Full type safety

Phase 1 (Add Features)
├─ Trends page with charts
├─ Export/Print functionality
├─ Result sharing (email, link)
├─ User annotations
└─ Advanced filters

Phase 2 (Enhancements)
├─ Real-time updates (WebSocket)
├─ Multi-user support
├─ Collaborative annotations
├─ AI-powered insights
└─ Historical comparisons

Phase 3 (Optimization)
├─ Virtual scrolling (huge lists)
├─ Server-side pagination
├─ Caching strategy
├─ Performance monitoring
└─ Analytics dashboard

Phase 4 (Scale)
├─ Mobile app (React Native)
├─ Offline support (IndexedDB)
├─ Sync across devices
├─ Internationalization (i18n)
└─ Dark mode support
```

---

This architecture is designed to be:
✅ **Maintainable** - Clear separation of concerns  
✅ **Testable** - Components, hooks, services all independently testable  
✅ **Scalable** - Easy to add new pages, components, API endpoints  
✅ **Accessible** - Built-in ARIA labels, keyboard navigation  
✅ **User-Friendly** - Non-technical language, polished UI  
✅ **Developer-Friendly** - Full type safety, clear patterns, well-documented
