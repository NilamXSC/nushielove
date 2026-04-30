'use client';

import React from 'react';
import AppLogo from './ui/AppLogo';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 z-50 w-full px-6 py-4 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        <AppLogo size={32} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        <span className="font-display text-base tracking-wide hidden sm:block" style={{ color: 'var(--primary)' }}>
          NushieLove
        </span>
      </div>
    </header>
  );
}