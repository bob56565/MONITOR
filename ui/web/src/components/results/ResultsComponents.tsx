/**
 * Reusable Result Components
 * 
 * Premium, polished components for displaying inference results.
 * Designed for both clinical professionals and general users.
 */

import React from 'react';
import { SupportType, SuppressionReason } from '../../types/results';

// ============================================================================
// CONFIDENCE METER
// ============================================================================

export interface ConfidenceMeterProps {
  confidence: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  confidence,
  size = 'md',
  showLabel = true,
  showPercentage = true,
}) => {
  const percentage = Math.round(confidence * 100);
  
  // Determine color based on confidence
  let colorClass = 'bg-green-500';
  let labelText = 'High confidence';
  if (confidence < 0.6) {
    colorClass = 'bg-amber-500';
    labelText = 'Low confidence';
  } else if (confidence < 0.75) {
    colorClass = 'bg-yellow-500';
    labelText = 'Medium confidence';
  }

  // Size variants
  const heightClass = size === 'sm' ? 'h-1' : size === 'lg' ? 'h-3' : 'h-2';
  const containerWidth = size === 'sm' ? 'w-24' : size === 'lg' ? 'w-full' : 'w-32';

  return (
    <div className="flex items-center gap-2">
      <div className={`${containerWidth} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${colorClass} ${heightClass} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-600">{labelText}</span>
          {showPercentage && <span className="text-xs font-semibold text-gray-800">{percentage}%</span>}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUPPORT TYPE BADGE
// ============================================================================

export interface SupportBadgeProps {
  supportType: SupportType;
  size?: 'sm' | 'md';
}

export const SupportBadge: React.FC<SupportBadgeProps> = ({ supportType, size = 'md' }) => {
  const badgeConfig: Record<SupportType, { bg: string; text: string; label: string }> = {
    'Direct': { bg: 'bg-blue-100', text: 'text-blue-800', label: '📍 Direct' },
    'Derived': { bg: 'bg-purple-100', text: 'text-purple-800', label: '📐 Derived' },
    'Proxy': { bg: 'bg-orange-100', text: 'text-orange-800', label: '🔗 Proxy' },
    'Relational': { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '🔄 Relational' },
    'Population-based': { bg: 'bg-gray-100', text: 'text-gray-800', label: '📊 Population' },
  };

  const config = badgeConfig[supportType];
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-block ${config.bg} ${config.text} ${textSize} px-3 py-1 rounded-full font-medium`}>
      {config.label}
    </span>
  );
};

// ============================================================================
// SUPPRESSION BADGE
// ============================================================================

export interface SuppressionBadgeProps {
  reason: SuppressionReason;
  size?: 'sm' | 'md';
}

export const SuppressionBadge: React.FC<SuppressionBadgeProps> = ({ reason, size = 'md' }) => {
  const reasonConfig: Record<SuppressionReason, { emoji: string; label: string }> = {
    'MissingAnchors': { emoji: '📭', label: 'Missing data' },
    'LowCoherence': { emoji: '⚠️', label: 'Low confidence' },
    'Interference': { emoji: '📢', label: 'Signal interference' },
    'InsufficientSignal': { emoji: '📉', label: 'Insufficient signal' },
    'OutOfScope': { emoji: '🚫', label: 'Out of scope' },
    'SafetyFilter': { emoji: '🛡️', label: 'Safety filter' },
    'Other': { emoji: '❓', label: 'Other reason' },
  };

  const config = reasonConfig[reason];
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-block bg-gray-100 text-gray-700 ${textSize} px-3 py-1 rounded-full font-medium`}>
      {config.emoji} {config.label}
    </span>
  );
};

// ============================================================================
// LEGEND TOOLTIP
// ============================================================================

export interface LegendTooltipProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export const LegendTooltip: React.FC<LegendTooltipProps> = ({ term, definition, children }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className="relative inline-block group">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help border-b-2 border-dashed border-gray-400"
      >
        {children}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max bg-gray-900 text-white text-sm rounded-lg px-3 py-2 z-50 pointer-events-none">
          <div className="font-semibold">{term}</div>
          <div className="text-gray-200">{definition}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STATE CARD (Physiological State)
// ============================================================================

export interface StateCardProps {
  title: string;
  label: string;
  confidence: number;
  drivers: string[];
  notes?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const StateCard: React.FC<StateCardProps> = ({
  title,
  label,
  confidence,
  drivers,
  notes,
  isExpanded = false,
  onToggle,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <span className="text-2xl">{isExpanded ? '−' : '+'}</span>
        </div>
        <div className="mb-3">
          <span className="inline-block bg-blue-50 text-blue-900 px-3 py-1 rounded-full font-medium text-sm">
            {label}
          </span>
        </div>
        <div className="mb-3">
          <ConfidenceMeter confidence={confidence} size="md" showLabel={false} showPercentage={true} />
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in duration-200">
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Based on:</strong>
            </p>
            <div className="flex flex-wrap gap-1">
              {drivers.map((driver, idx) => (
                <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {driver}
                </span>
              ))}
            </div>
          </div>
          {notes && (
            <div className="mt-3">
              <p className="text-sm text-gray-700">{notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SKELETON LOADERS
// ============================================================================

export const SkeletonStateCard: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
    <div className="h-8 bg-gray-200 rounded w-24 mb-3" />
    <div className="h-2 bg-gray-200 rounded w-40 mb-4" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  </div>
);

export const SkeletonAnalyteRow: React.FC = () => (
  <div className="p-4 border-b border-gray-100 animate-pulse">
    <div className="flex justify-between items-start mb-3">
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-64" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-20" />
    </div>
    <div className="flex gap-2">
      <div className="h-6 bg-gray-200 rounded w-24" />
      <div className="h-6 bg-gray-200 rounded w-32" />
    </div>
  </div>
);

// ============================================================================
// EMPTY STATE
// ============================================================================

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon = '📊',
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 text-center mb-6 max-w-md">{description}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ id, type, message, onClose, duration = 5000 }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  const typeConfig = {
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '✓', textColor: 'text-green-800' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: '✕', textColor: 'text-red-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'ℹ', textColor: 'text-blue-800' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠', textColor: 'text-yellow-800' },
  };

  const config = typeConfig[type];

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-right`}>
      <span className={`text-lg font-bold ${config.textColor}`}>{config.icon}</span>
      <span className={`${config.textColor} font-medium`}>{message}</span>
      <button onClick={() => onClose(id)} className="ml-auto text-gray-400 hover:text-gray-600">
        ✕
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastProps[] }> = ({ toasts }) => (
  <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-auto">
    {toasts.map((toast) => (
      <Toast key={toast.id} {...toast} />
    ))}
  </div>
);
