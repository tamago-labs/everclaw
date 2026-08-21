import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface GlassDropdownProps {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}

export default function GlassDropdown({ label, value, options, onChange }: GlassDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      <span className="text-sm leading-none" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div
        className="glass relative overflow-hidden rounded-xl"
        style={{ borderColor: 'rgba(255,255,255,0.10)' }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative z-10 flex items-center gap-2 px-3 py-2 transition-all hover:bg-white/5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span className="text-sm font-medium">{selectedOption?.label || 'Select...'}</span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute top-full mt-2 min-w-[180px] rounded-xl overflow-hidden z-50"
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-default)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className="w-full px-4 py-2.5 text-left text-sm transition-colors"
              style={{
                background: option.value === value ? 'var(--color-accent-primary-dim)' : 'transparent',
                color: option.value === value ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) e.currentTarget.style.background = 'transparent'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
