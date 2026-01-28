/**
 * useResults Hook
 * 
 * Custom React hook for managing inference results state, API calls, and caching.
 * Encapsulates all results-related logic for easy reuse across components.
 */

import { useState, useCallback, useEffect } from 'react';
import { ResultBundle, InferenceMode, RequestState } from '../types/results';
import { runInferenceV2, runInferenceLegacy, fetchLatestResults } from '../services/inferenceApi';

export interface UseResultsOptions {
  autoLoad?: boolean;
  cacheMs?: number;
}

export interface UseResultsReturn {
  // State
  results: ResultBundle | undefined;
  loading: boolean;
  error?: string;
  mode: InferenceMode;

  // Actions
  setMode: (mode: InferenceMode) => void;
  runInference: (runId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;

  // Derived
  hasResults: boolean;
  totalProduced: number;
  totalSuppressed: number;
  lastFetchTime?: Date;
}

/**
 * Main hook for results management
 */
export function useResults(options: UseResultsOptions = {}): UseResultsReturn {
  const { autoLoad = true } = options;

  const [state, setState] = useState<RequestState>({
    loading: autoLoad,
    error: undefined,
    data: undefined,
    lastFetch: undefined,
  });

  const [mode, setMode] = useState<InferenceMode>('v2');

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad]);

  // Refresh latest results
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const data = await fetchLatestResults();
      setState({
        loading: false,
        error: undefined,
        data: data || undefined,
        lastFetch: new Date().toISOString(),
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: (error as Error).message,
      }));
    }
  }, []);

  // Run inference and fetch results
  const runInference = useCallback(
    async (runId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const data = mode === 'v2' ? await runInferenceV2(runId) : await runInferenceLegacy(runId);
        setState({
          loading: false,
          error: undefined,
          data,
          lastFetch: new Date().toISOString(),
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: (error as Error).message,
        }));
        throw error;
      }
    },
    [mode]
  );

  // Clear state
  const clear = useCallback(() => {
    setState({
      loading: false,
      error: undefined,
      data: undefined,
      lastFetch: undefined,
    });
  }, []);

  // Derived state
  const hasResults = state.data !== undefined;
  const totalProduced = state.data?.panels.reduce((sum, p) => sum + p.produced_outputs.length, 0) || 0;
  const totalSuppressed = state.data?.panels.reduce((sum, p) => sum + p.suppressed_outputs.length, 0) || 0;
  const lastFetchTime = state.lastFetch ? new Date(state.lastFetch) : undefined;

  return {
    results: state.data,
    loading: state.loading,
    error: state.error,
    mode,
    setMode,
    runInference,
    refresh,
    clear,
    hasResults,
    totalProduced,
    totalSuppressed,
    lastFetchTime,
  };
}

// ============================================================================
// FILTER HOOK
// ============================================================================

/**
 * Hook for managing results filter state
 */
import { FiltersState, SupportType } from '../types/results';

export function useResultsFilters() {
  const [filters, setFilters] = useState<FiltersState>({
    show_produced: true,
    show_suppressed: true,
    low_confidence_only: false,
    interference_flagged_only: false,
    support_type_filter: undefined,
    search_query: '',
  });

  const updateFilter = useCallback((key: keyof FiltersState, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      show_produced: true,
      show_suppressed: true,
      low_confidence_only: false,
      interference_flagged_only: false,
      support_type_filter: undefined,
      search_query: '',
    });
  }, []);

  const toggleSupportType = useCallback((type: SupportType) => {
    setFilters((prev) => {
      const current = prev.support_type_filter || [];
      if (current.includes(type)) {
        return {
          ...prev,
          support_type_filter: current.filter((t) => t !== type),
        };
      } else {
        return {
          ...prev,
          support_type_filter: [...current, type],
        };
      }
    });
  }, []);

  return {
    filters,
    updateFilter,
    resetFilters,
    toggleSupportType,
  };
}

// ============================================================================
// TOAST HOOK
// ============================================================================

/**
 * Hook for managing toast notifications
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: Toast['type'], message: string, duration: number = 5000) => {
      const id = `toast_${Date.now()}_${Math.random()}`;
      const newToast: Toast = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration
      setTimeout(() => {
        removeToast(id);
      }, duration);

      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
  };
}
