import { useState, useEffect } from 'react';
import { Mouse } from 'lucide-react';


function LoadingScreen() {
    return (
        <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center">
            <div className="text-center">
                {/* Logo */}
                <div className="w-20 h-20 rounded-2xl bg-accent-primary flex items-center justify-center mx-auto mb-6 shadow-[0_0_60px_var(--color-glow-green)] animate-pulse">
                    <Mouse size={40} className="text-[#0F1117] -scale-x-100" strokeWidth={2} />
                </div>

                {/* Brand */}
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2" style={{ fontFamily: 'var(--font-brand)' }}>
                    EVERCLAW
                </h1>

                {/* Loading */}
                <div className="flex items-center justify-center gap-3 mt-6">
                    <div className="w-5 h-5 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[var(--color-text-muted)]">Initializing secure storage...</span>
                </div>
            </div>
        </div>
    );
}


function AppContent() { 
    
  return <LoadingScreen />;
}

export default function App() {
  return ( 
      <AppContent /> 
  );
}