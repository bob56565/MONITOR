import React from 'react';

// Confidence Meter
export const ConfidenceMeter: React.FC<{ confidence: number; size?: 'sm' | 'md' | 'lg' }> = ({ confidence, size = 'md' }) => {
  const percent = Math.round(confidence * 100);
  const color = confidence >= 0.7 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
  const sizeClass = size === 'sm' ? 'h-2 w-16' : size === 'lg' ? 'h-3 w-32' : 'h-2 w-24';

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClass} rounded-full bg-gray-200 overflow-hidden`}>
        <div className={`${color} h-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-gray-600">{percent}%</span>
    </div>
  );
};

// Support Type Badge
export const SupportBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    Direct: 'bg-blue-100 text-blue-700',
    Derived: 'bg-purple-100 text-purple-700',
    Proxy: 'bg-amber-100 text-amber-700',
    Relational: 'bg-cyan-100 text-cyan-700',
    'Population-based': 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100'}`}>
      {type}
    </span>
  );
};

// Suppression Reason Badge
export const SuppressionBadge: React.FC<{ reason: string }> = ({ reason }) => {
  const colors: Record<string, string> = {
    MissingAnchors: 'bg-red-100 text-red-700',
    LowCoherence: 'bg-orange-100 text-orange-700',
    Interference: 'bg-yellow-100 text-yellow-700',
    InsufficientSignal: 'bg-gray-100 text-gray-700',
    OutOfScope: 'bg-blue-100 text-blue-700',
    SafetyFilter: 'bg-red-100 text-red-700',
    Other: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[reason] || 'bg-gray-100'}`}>
      {reason}
    </span>
  );
};

// State Card
export const StateCard: React.FC<{ title: string; label: string; confidence: number; drivers?: string[]; onExpand?: () => void }> = ({
  title,
  label,
  confidence,
  drivers = [],
  onExpand,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors" onClick={onExpand}>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-lg font-bold text-gray-900 mt-2">{label}</p>
      <div className="mt-3">
        <ConfidenceMeter confidence={confidence} size="md" />
      </div>
      {drivers.length > 0 && (
        <div className="mt-3 text-xs text-gray-600">
          <p className="font-medium">Key factors:</p>
          <ul className="list-disc list-inside">
            {drivers.slice(0, 2).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Skeleton Loader
export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-3 bg-gray-200 rounded w-full" />
        </div>
      ))}
    </div>
  );
};

// Empty State
export const EmptyState: React.FC<{ title: string; description: string; cta?: { label: string; onClick: () => void } }> = ({ title, description, cta }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-4">📊</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 mt-2">{description}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
};

// Toast Container
export const ToastContainer: React.FC<{ toasts: Array<{ id: string; message: string; type: string }> }> = ({ toasts }) => {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm animate-slide-in ${
            toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

// Analyte Row
export const AnalyteRow: React.FC<{ analyte: any; expanded?: boolean; onToggle?: () => void }> = ({ analyte, expanded = false, onToggle }) => {
  const isProduced = !('suppression_reason' in analyte);

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{analyte.analyte}</h4>
          {isProduced ? (
            <>
              <p className="text-sm text-gray-600 mt-1">
                {analyte.value} {analyte.unit}
              </p>
              <p className="text-xs text-gray-500 mt-1">{analyte.user_explanation}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mt-1">{analyte.plain_english_reason}</p>
            </>
          )}
        </div>
        <div className="text-right ml-4">
          {isProduced ? (
            <>
              <SupportBadge type={analyte.support_type} />
              <div className="mt-2">
                <ConfidenceMeter confidence={analyte.confidence} size="sm" />
              </div>
            </>
          ) : (
            <SuppressionBadge reason={analyte.suppression_reason} />
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {isProduced && (
              <>
                <div>
                  <p className="text-xs font-semibold text-gray-500">Support Type</p>
                  <p className="text-gray-900 mt-1">{analyte.support_type}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
