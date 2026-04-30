'use client';

import React, { useEffect, useState, useRef } from 'react';

interface Scene3Props {
  onComplete: () => void;
}

const MESSAGE = "Happy Birthday, My Nushie ❤️";
const SUB_MESSAGES = [
  "You are my favorite adventure.",
  "My heart found its home in you.",
  "Every day with you is a gift.",
];

export default function Scene3BirthdayReveal({ onComplete }: Scene3Props) {
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState(0);
  const [subIdx, setSubIdx] = useState(0);
  const [subText, setSubText] = useState('');
  const [showContinue, setShowContinue] = useState(false);
  const [bgScale, setBgScale] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);

  useEffect(() => {
    // Cinematic zoom
    const animateBg = () => {
      frameRef.current++;
      setBgScale(1 + frameRef.current * 0.00008);
      rafRef.current = requestAnimationFrame(animateBg);
    };
    rafRef.current = requestAnimationFrame(animateBg);

    // Phase 0: main text
    let charIdx = 0;
    intervalRef.current = setInterval(() => {
      if (charIdx < MESSAGE.length) {
        setDisplayedText(MESSAGE.slice(0, charIdx + 1));
        charIdx++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => setPhase(1), 600);
      }
    }, 70);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== 1) return;
    let charIdx = 0;
    const currentSub = SUB_MESSAGES[subIdx];
    intervalRef.current = setInterval(() => {
      if (charIdx < currentSub.length) {
        setSubText(currentSub.slice(0, charIdx + 1));
        charIdx++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (subIdx < SUB_MESSAGES.length - 1) {
          setTimeout(() => {
            setSubText('');
            setSubIdx((i) => i + 1);
          }, 1200);
        } else {
          setTimeout(() => setShowContinue(true), 800);
        }
      }
    }, 55);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, subIdx]);

  return (
    <section
      className="scene-section flex flex-col items-center justify-center relative overflow-hidden"
      style={{ minHeight: '100vh' }}
    >
      {/* Animated background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          transform: `scale(${bgScale})`,
          transformOrigin: 'center center',
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(194,24,91,0.25) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(232,160,191,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255,215,0,0.08) 0%, transparent 60%),
            #0a0008
          `,
        }}
      />

      {/* Soft glow overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(232,160,191,0.12) 0%, transparent 65%)',
        }}
      />

      {/* Particle stars */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              left: `${(i * 137 + 20) % 100}%`,
              top: `${(i * 97 + 15) % 85}%`,
              background: i % 3 === 0 ? 'var(--gold)' : 'var(--primary)',
              opacity: 0.3 + (i % 4) * 0.12,
              animation: `heartbeat ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>

      <div className="cinematic-overlay absolute inset-0 pointer-events-none z-10" />

      <div className="relative z-20 flex flex-col items-center gap-8 px-6 text-center max-w-3xl mx-auto">
        {/* Main headline */}
        <h1
          className="font-display font-semibold leading-tight glow-text-rose"
          style={{
            fontSize: 'clamp(2rem, 6vw, 4.5rem)',
            background: 'linear-gradient(135deg, #ffd700 0%, #ff6b9d 40%, #e8a0bf 70%, #c2185b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            minHeight: '1.2em',
          }}
        >
          {displayedText}
          <span
            className="inline-block w-0.5 ml-1 align-middle"
            style={{
              height: '0.8em',
              background: 'var(--primary)',
              opacity: phase === 0 ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
        </h1>

        {/* Sub messages */}
        {phase >= 1 && (
          <p
            className="font-display text-xl md:text-2xl font-light italic"
            style={{ color: 'rgba(232,160,191,0.9)', minHeight: '2em' }}
          >
            {subText}
            <span
              className="inline-block w-0.5 ml-0.5 align-middle"
              style={{
                height: '0.7em',
                background: 'var(--primary)',
                opacity: subIdx < SUB_MESSAGES.length - 1 || !showContinue ? 1 : 0,
              }}
            />
          </p>
        )}

        {/* Heart */}
        <div
          className="text-5xl heart-beat"
          style={{ filter: 'drop-shadow(0 0 20px rgba(194,24,91,0.7))' }}
        >
          ❤️
        </div>

        {showContinue && (
          <button
            onClick={onComplete}
            className="relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-500 hover:scale-105 focus:outline-none mt-2"
            style={{
              background: 'rgba(194,24,91,0.15)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(232,160,191,0.5)',
              color: '#fff',
              boxShadow: '0 4px 32px rgba(194,24,91,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            I coded more, click here
          </button>
        )}
      </div>
    </section>
  );
}