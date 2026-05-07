export default function AboutTab() {
  return (
     <div className="space-y-6">
      <div className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent-primary flex items-center justify-center shadow-[0_0_30px_var(--color-glow-green)]">
            <span className="text-2xl font-black text-[#0F1117]" style={{ fontFamily: 'var(--font-brand)' }}>E</span>
          </div>
          <div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-brand)' }}>
              EVERCLAW
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">AI-Powered Multi-Chain Agent Wallet</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-[var(--color-border-subtle)]">
            <span className="text-sm text-[var(--color-text-muted)]">Version</span>
            <span className="text-sm text-[var(--color-text-primary)]">0.1.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--color-border-subtle)]">
            <span className="text-sm text-[var(--color-text-muted)]">Wallet Engine</span>
            <span className="text-sm text-[var(--color-text-primary)]">WDK (Wallet Development Kit)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--color-border-subtle)]">
            <span className="text-sm text-[var(--color-text-muted)]">Chains Supported</span>
            <span className="text-sm text-[var(--color-text-primary)]">2 (EVM, Solana)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-[var(--color-text-muted)]">Framework</span>
            <span className="text-sm text-[var(--color-text-primary)]">Electron + React</span>
          </div>
        </div>
      </div>
    </div>
  );
}