/**
 * Measured vs Inferred Badge
 * 
 * Small badge component to indicate whether a value is directly measured
 * or inferred/estimated. Includes tooltip for explanation.
 */

import React, { useState } from 'react';

interface MeasuredInferredBadgeProps {
  type: 'measured' | 'inferred' | 'inferred_tight' | 'inferred_wide';
  showTooltip?: boolean;
}

export const MeasuredInferredBadge: React.FC<MeasuredInferredBadgeProps> = ({
  type,
  showTooltip = true
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const getConfig = (type: string) => {
    switch (type) {
      case 'measured':
        return {
          label: 'Measured',
          icon: '📊',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          tooltip: 'Directly measured from uploaded lab results or device readings'
        };
      case 'inferred_tight':
        return {
          label: 'Estimated',
          icon: '🎯',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
          tooltip: 'Estimated with high confidence using recent anchor data and continuous monitoring'
        };
      case 'inferred_wide':
        return {
          label: 'Estimated',
          icon: '📈',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
          tooltip: 'Estimated with moderate confidence using available data (wider range)'
        };
      case 'inferred':
      default:
        return {
          label: 'Estimated',
          icon: '📊',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
          tooltip: 'Estimated from continuous monitoring and available health data'
        };
    }
  };

  const config = getConfig(type);

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
        onMouseEnter={() => showTooltip && setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <span className="text-xs">{config.icon}</span>
        <span className="text-xs font-medium">{config.label}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && tooltipVisible && (
        <div className="absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-gray-900 rounded shadow-lg -left-1/2 transform -translate-x-1/4">
          {config.tooltip}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -top-1 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
};

/**
 * Legend Component
 * 
 * Shows explanation of measured vs inferred badges.
 * Can be displayed once at top of report panel.
 */
export const MeasuredInferredLegend: React.FC = () => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
      <p className="font-medium text-gray-700 mb-2">Data Source Legend:</p>
      <div className="space-y-1.5">
        <div className="flex items-center space-x-2">
          <MeasuredInferredBadge type="measured" showTooltip={false} />
          <span className="text-gray-600">Direct measurement from uploaded results</span>
        </div>
        <div className="flex items-center space-x-2">
          <MeasuredInferredBadge type="inferred_tight" showTooltip={false} />
          <span className="text-gray-600">High-confidence estimate with recent anchors</span>
        </div>
        <div className="flex items-center space-x-2">
          <MeasuredInferredBadge type="inferred_wide" showTooltip={false} />
          <span className="text-gray-600">Moderate-confidence estimate (wider range)</span>
        </div>
      </div>
    </div>
  );
};

export default MeasuredInferredBadge;
