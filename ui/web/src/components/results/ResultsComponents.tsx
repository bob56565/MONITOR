import React from 'react'

export const ConfidenceMeter: React.FC<{ confidence: number; size?: 'sm' | 'md' | 'lg' }> = ({ confidence, size = 'md' }) => {
  const percent = Math.round(confidence * 100)
  const color = confidence >= 0.7 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
  const sizeClass = size === 'sm' ? 'h-2 w-16' : size === 'lg' ? 'h-3 w-32' : 'h-2 w-24'

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClass} rounded-full bg-gray-200 overflow-hidden`}>
        <div className={`${color} h-full transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-gray-600">{percent}%</span>
    </div>
  )
}

export const StateCard: React.FC<{ title: string; label: string; confidence: number; drivers?: string[] }> = ({
  title,
  label,
  confidence,
  drivers = [],
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-lg font-bold text-gray-900 mt-2">{label}</p>
      <div className="mt-3">
        <ConfidenceMeter confidence={confidence} size="md" />
      </div>
      {drivers.length > 0 && (
        <div className="mt-3 text-xs text-gray-600">
          <p className="font-medium">Key factors:</p>
          <ul className="list-disc list-inside">
            {drivers.slice(0, 2).map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

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
  )
}

export const EmptyState: React.FC<{ title: string; description: string; cta?: { label: string; onClick: () => void } }> = ({
  title,
  description,
  cta,
}) => {
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
  )
}

export const ToastContainer: React.FC<{ toasts: any[] }> = ({ toasts }) => {
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
  )
}
