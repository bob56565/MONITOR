/**
 * Confidence Explainer Component
 * 
 * Reusable component to display confidence score with drivers and recommendations.
 * Designed to be embedded in each report line item.
 */

import React, { useState } from 'react';

interface ConfidenceData {
  confidence_percent: number;
  top_3_drivers: Array<[string, string]>; // [driver_description, impact_level]
  what_increases_confidence: string[];
}

interface ConfidenceExplainerProps {
  confidence: ConfidenceData;
  compact?: boolean;
  showRecommendations?: boolean;
}

export const ConfidenceExplainer: React.FC<ConfidenceExplainerProps> = ({
  confidence,
  compact = false,
  showRecommendations = true
}) => {
  const [expanded, setExpanded] = useState(false);

  const getConfidenceColor = (percent: number): string => {
    if (percent >= 85) return 'text-green-600';
    if (percent >= 70) return 'text-blue-600';
    if (percent >= 55) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceBgColor = (percent: number): string => {
    if (percent >= 85) return 'bg-green-100';
    if (percent >= 70) return 'bg-blue-100';
    if (percent >= 55) return 'bg-yellow-100';
    return 'bg-orange-100';
  };

  const getImpactBadgeColor = (impact: string): string => {
    if (impact === 'high') return 'bg-green-100 text-green-800';
    if (impact === 'medium') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const confidencePercent = Math.round(confidence.confidence_percent);

  if (compact) {
    return (
      <div className="inline-flex items-center space-x-2">
        <div className={`px-2 py-1 rounded ${getConfidenceBgColor(confidencePercent)}`}>
          <span className={`text-xs font-semibold ${getConfidenceColor(confidencePercent)}`}>
            {confidencePercent}% confidence
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
          title="Show confidence details"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
      {/* Confidence score */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Confidence</h4>
        <div className={`px-3 py-1 rounded-full ${getConfidenceBgColor(confidencePercent)}`}>
          <span className={`text-sm font-bold ${getConfidenceColor(confidencePercent)}`}>
            {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Top drivers */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Top Drivers
        </p>
        <div className="space-y-1.5">
          {confidence.top_3_drivers.map(([driver, impact], idx) => (
            <div key={idx} className="flex items-start space-x-2 text-sm">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-700 flex-1">{driver}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getImpactBadgeColor(impact)}`}>
                {impact}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations (expandable) */}
      {showRecommendations && confidence.what_increases_confidence.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left py-1"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              How to Improve
            </p>
            <svg
              className={`w-4 h-4 text-gray-400 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {expanded && (
            <ul className="space-y-1 mt-2">
              {confidence.what_increases_confidence.map((rec, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfidenceExplainer;
