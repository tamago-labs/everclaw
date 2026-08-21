import type { ReactNode } from 'react'

interface GlassButtonProps {
  icon?: ReactNode
  onClick?: () => void
  title?: string
  label?: string
  className?: string
  variant?: 'default' | 'danger' | 'success'
  iconOnly?: boolean
}

export default function GlassButton({ icon, onClick, title, label, className = '', variant = 'default', iconOnly }: GlassButtonProps) {
  const showLabel = label ?? (!iconOnly ? title : undefined)
  const variantCls =
    variant === 'danger'
      ? 'hover:bg-red-500/10 text-red-400 hover:text-red-300'
      : variant === 'success'
        ? 'hover:bg-green-500/10 text-green-400 hover:text-green-300'
        : 'hover:bg-white/5 text-gray-400 hover:text-white'

  return (
    <div
      className={`glass relative overflow-hidden rounded-xl ${className}`}
      style={{ borderColor: 'rgba(255,255,255,0.10)' }}
    >
      <button
        onClick={onClick}
        title={title}
        className={`relative z-10 px-3 py-2 flex items-center gap-2 transition-all ${variantCls}`}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {showLabel && <span className="text-sm font-medium whitespace-nowrap">{showLabel}</span>}
      </button>
    </div>
  )
}
