/**
 * Data Completeness Widget
 * 
 * Displays user's data completeness score and missing critical items.
 * Collapsible, non-intrusive component that can be embedded in dashboard.
 */

import React, { useState, useEffect } from 'react';

interface CompletenessScore {
  overall_score: number;
  component_scores: {
    specimens: number;
    isf_monitor: number;
    vitals: number;
    soap_profile: number;
  };
  missing_critical: string[];
}

interface DataCompletenessWidgetProps {
  apiBaseUrl?: string;
  authToken?: string;
  defaultCollapsed?: boolean;
}

export const DataCompletenessWidget: React.FC<DataCompletenessWidgetProps> = ({
  apiBaseUrl = '',
  authToken = '',
  defaultCollapsed = false
}) => {
  const [completeness, setCompleteness] = useState<CompletenessScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    fetchCompleteness();
  }, []);

  const fetchCompleteness = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/data-quality/completeness`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch completeness data');
      }

      const data = await response.json();
      setCompleteness(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-100';
    if (score >= 0.5) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (error || !completeness) {
    return null; // Fail silently - widget is optional
  }

  const overallPercent = Math.round(completeness.overall_score * 100);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getScoreBgColor(completeness.overall_score)}`}>
            <svg
              className={`w-5 h-5 ${getScoreColor(completeness.overall_score)}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Data Completeness</h3>
            <p className={`text-2xl font-bold ${getScoreColor(completeness.overall_score)}`}>
              {overallPercent}%
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transform transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expandable content */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
          {/* Component breakdown */}
          <div className="space-y-2 pt-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Breakdown</h4>
            {Object.entries(completeness.component_scores).map(([component, score]) => (
              <div key={component} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">
                  {component.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getScoreBgColor(score)} opacity-60`}
                      style={{ width: `${score * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${getScoreColor(score)}`}>
                    {Math.round(score * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Missing critical items */}
          {completeness.missing_critical.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Missing Critical Data
              </h4>
              <ul className="space-y-1">
                {completeness.missing_critical.map((item, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-700">
                    <svg
                      className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={() => window.location.href = '/upload'}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Upload Data
          </button>
        </div>
      )}
    </div>
  );
};

export default DataCompletenessWidget;
