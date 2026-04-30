'use client';

import React from 'react';

interface MusicToggleProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function MusicToggle({ isPlaying, onToggle }: MusicToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={isPlaying ? 'Mute music' : 'Play music'}
      className="fixed top-5 right-5 z-50 glass-dark rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none"
      style={{
        boxShadow: isPlaying
          ? '0 0 20px rgba(232,160,191,0.5), 0 0 40px rgba(194,24,91,0.25)'
          : '0 0 10px rgba(232,160,191,0.2)',
        border: `1px solid ${isPlaying ? 'rgba(232,160,191,0.4)' : 'rgba(232,160,191,0.15)'}`,
      }}
    >
      <span className="text-xl select-none">{isPlaying ? '🔊' : '🔇'}</span>
    </button>
  );
}