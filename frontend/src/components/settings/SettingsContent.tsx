import type { ReactNode } from 'react'

export default function SettingsContent({ children }: { children: ReactNode }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="relative z-10">{children}</div>
    </div>
  )
}
