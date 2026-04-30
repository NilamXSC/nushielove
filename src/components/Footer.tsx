import React from 'react';

export default function Footer() {
  return (
    <footer className="relative z-20 border-t py-8 px-6" style={{ borderColor: 'rgba(232,160,191,0.1)' }}>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex gap-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <a href="/" className="transition-colors hover:text-primary focus:outline-none" style={{ color: 'var(--muted-foreground)' }}>
            Home
          </a>
          <span style={{ color: 'rgba(232,160,191,0.3)' }}>·</span>
          <a href="#" className="transition-colors focus:outline-none" style={{ color: 'var(--muted-foreground)' }}>
            Privacy
          </a>
        </div>
        <span style={{ color: 'rgba(232,160,191,0.3)' }} className="hidden sm:inline">·</span>
        <p className="text-sm" style={{ color: 'rgba(232,160,191,0.4)' }}>
          © 2026 NushieLove ❤️
        </p>
      </div>
    </footer>
  );
}