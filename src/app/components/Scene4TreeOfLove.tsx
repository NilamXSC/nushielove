'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Scene4Props {
  onComplete: () => void;
}

interface PictureNode {
  id: number;
  cx: number;
  cy: number;
  label: string;
  note: string;
  color: string;
  glowColor: string;
  size: number;
  // Using placeholder image slots — replace src with real photos
  imgSrc: string;
  imgAlt: string;
}

const PICTURE_NODES: PictureNode[] = [
  {
    id: 0,
    cx: 50, cy: 22,
    label: 'First Smile',
    note: 'The first time you smiled at me, I forgot every word I ever knew. That smile is my favorite thing in the world.',
    color: '#e8a0bf',
    glowColor: 'rgba(232,160,191,0.7)',
    size: 36,
    imgSrc: '/assets/photos/img1.jpeg',
    imgAlt: 'Nushie smiling — her first smile that stole my heart',
  },
  {
    id: 1,
    cx: 25, cy: 38,
    label: 'First Laugh',
    note: 'Your laugh is the most beautiful sound I have ever heard. I would do anything just to hear it again and again.',
    color: '#ff6b9d',
    glowColor: 'rgba(255,107,157,0.7)',
    size: 30,
    imgSrc: '/assets/photos/img2.jpeg',
    imgAlt: 'Nushie laughing — pure joy captured in a moment',
  },
  {
    id: 2,
    cx: 75, cy: 38,
    label: 'First Dance',
    note: 'Dancing with you felt like the whole world slowed down just for us. Every step with you is a memory I treasure.',
    color: '#ffd700',
    glowColor: 'rgba(255,215,0,0.7)',
    size: 30,
    imgSrc: '/assets/photos/img3.jpeg',
    imgAlt: 'Nushie dancing — graceful and radiant under the lights',
  },
  {
    id: 3,
    cx: 15, cy: 55,
    label: 'Rainy Days',
    note: 'Even on the cloudiest days, you are my sunshine. Every rainy moment with you felt warm and perfect.',
    color: '#c2185b',
    glowColor: 'rgba(194,24,91,0.7)',
    size: 26,
    imgSrc: '/assets/photos/img4.jpeg',
    imgAlt: 'Nushie on a rainy day — beautiful even under grey skies',
  },
  {
    id: 4,
    cx: 38, cy: 55,
    label: 'Late Nights',
    note: 'Those late nights talking about everything and nothing, I never wanted them to end. You make time feel infinite.',
    color: '#f48fb1',
    glowColor: 'rgba(244,143,177,0.7)',
    size: 26,
    imgSrc: '/assets/photos/img5.jpeg',
    imgAlt: 'Nushie at night — glowing like the stars behind her',
  },
  {
    id: 5,
    cx: 62, cy: 55,
    label: 'Adventures',
    note: 'Every adventure is better with you by my side. You make the ordinary feel extraordinary just by being there.',
    color: '#e8a0bf',
    glowColor: 'rgba(232,160,191,0.7)',
    size: 26,
    imgSrc: '/assets/photos/img6.jpeg',
    imgAlt: 'Nushie on an adventure — fearless and full of life',
  },
  {
    id: 6,
    cx: 85, cy: 55,
    label: 'Sweet Nothings',
    note: 'The little things you say stay with me forever. Your words are the most beautiful poetry I have ever heard.',
    color: '#ff6b9d',
    glowColor: 'rgba(255,107,157,0.7)',
    size: 26,
    imgSrc: '/assets/photos/img7.jpeg',
    imgAlt: 'Nushie whispering — her words sweeter than any song',
  },
];

// DOB: 2nd May 1999 (26 years)
const DOB = new Date('2000-05-02T00:00:00');

function useTimer() {
  const [elapsed, setElapsed] = useState({ years: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const diff = now.getTime() - DOB.getTime();
      const totalSeconds = Math.floor(diff / 1000);
      const seconds = totalSeconds % 60;
      const totalMinutes = Math.floor(totalSeconds / 60);
      const minutes = totalMinutes % 60;
      const totalHours = Math.floor(totalMinutes / 60);
      const hours = totalHours % 24;
      const totalDays = Math.floor(totalHours / 24);

      // Calculate years properly
      let years = now.getFullYear() - DOB.getFullYear();
      const mDiff = now.getMonth() - DOB.getMonth();
      if (mDiff < 0 || (mDiff === 0 && now.getDate() < DOB.getDate())) {
        years--;
      }
      // Days since last birthday
      const lastBirthday = new Date(now.getFullYear(), DOB.getMonth(), DOB.getDate());
      if (lastBirthday > now) lastBirthday.setFullYear(lastBirthday.getFullYear() - 1);
      const daysSinceBirthday = Math.floor((now.getTime() - lastBirthday.getTime()) / (1000 * 60 * 60 * 24));

      setElapsed({ years, days: daysSinceBirthday, hours, minutes, seconds });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return elapsed;
}

export default function Scene4TreeOfLove({ onComplete }: Scene4Props) {
  const [activeNode, setActiveNode] = useState<PictureNode | null>(null);
  const [pulsing, setPulsing] = useState<Set<number>>(new Set([0]));
  const [ripples, setRipples] = useState<{ id: number; cx: number; cy: number; ts: number }[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const rippleId = useRef(0);
  const timer = useTimer();

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsing(new Set([Math.floor(Math.random() * PICTURE_NODES.length)]));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = (node: PictureNode) => {
    setActiveNode(node);
    rippleId.current++;
    const rid = rippleId.current;
    setRipples((prev) => [...prev, { id: rid, cx: node.cx, cy: node.cy, ts: Date.now() }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rid));
    }, 800);
  };

  const resolvePhotoFallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const imgEl = event.currentTarget;
    const tried = imgEl.dataset.fallbackTried === '1';
    if (tried) return;
    imgEl.dataset.fallbackTried = '1';
    const base = imgEl.src.replace(/\.(jpeg|jpg|png)$/i, '');
    imgEl.src = `${base}.jpg`;
  };

  return (
    <section
      className="scene-section flex flex-col items-center justify-start relative overflow-hidden"
      style={{ minHeight: '100vh', paddingTop: '5vh' }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 80%, rgba(10,60,5,0.3) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 20%, rgba(194,24,91,0.12) 0%, transparent 50%),
            #0a0008
          `,
        }}
      />
      <div className="cinematic-overlay absolute inset-0 pointer-events-none z-10" />

      {/* Header */}
      <div className="relative z-20 flex flex-col items-center gap-2 mb-3 px-4 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-light text-gradient-rose">
          Remember Who You Are
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Click the pictures to explore our moments
        </p>
      </div>

      {/* Live Timer */}
      <div className="relative z-20 mb-4 px-4">
        <div
          className="rounded-2xl px-6 py-4 text-center"
          style={{
            background: 'rgba(232,160,191,0.07)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(232,160,191,0.25)',
            boxShadow: '0 4px 24px rgba(194,24,91,0.12)',
          }}
        >
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(232,160,191,0.6)' }}>
            You have blessed this earth for
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { val: timer.years, label: 'Years' },
              { val: timer.days, label: 'Days' },
              { val: timer.hours, label: 'Hours' },
              { val: timer.minutes, label: 'Mins' },
              { val: timer.seconds, label: 'Secs' },
            ].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center">
                <span
                  className="font-display text-2xl md:text-3xl font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700, #ff6b9d)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    minWidth: '2.5ch',
                    display: 'inline-block',
                    textAlign: 'center',
                  }}
                >
                  {String(val).padStart(2, '0')}
                </span>
                <span className="text-xs mt-0.5" style={{ color: 'rgba(232,160,191,0.55)' }}>{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,215,0,0.6)' }}>
            My Precious Ardour 
          </p>
        </div>
      </div>

      {/* Tree SVG */}
      <div className="relative z-20 w-full max-w-2xl mx-auto px-4" style={{ height: 'clamp(320px, 55vw, 520px)' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="trunkGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5d3a1a" />
              <stop offset="100%" stopColor="#2d1a0a" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Ground glow */}
          <ellipse cx="50" cy="97" rx="25" ry="3" fill="rgba(45,90,27,0.3)" />

          {/* Trunk */}
          <path
            d="M50 97 C50 97 48 90 49 85 C50 80 51 75 50 70 C49 65 50 60 50 55"
            stroke="url(#trunkGrad)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Main branches */}
          <path d="M50 75 C45 70 35 65 25 62" stroke="#3d2510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M50 70 C55 65 65 60 75 57" stroke="#3d2510" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M50 65 C50 60 50 50 50 40" stroke="#3d2510" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* Sub-branches */}
          <path d="M25 62 C20 58 15 57 15 55" stroke="#4a2e15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M25 62 C28 56 35 56 38 55" stroke="#4a2e15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M75 57 C80 53 85 54 85 55" stroke="#4a2e15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M75 57 C72 52 65 53 62 55" stroke="#4a2e15" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M50 40 C45 35 28 36 25 38" stroke="#4a2e15" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M50 40 C55 35 72 36 75 38" stroke="#4a2e15" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Leaves clusters */}
          {[
            { cx: 50, cy: 22, r: 14 },
            { cx: 25, cy: 35, r: 10 },
            { cx: 75, cy: 35, r: 10 },
            { cx: 15, cy: 52, r: 8 },
            { cx: 38, cy: 52, r: 8 },
            { cx: 62, cy: 52, r: 8 },
            { cx: 85, cy: 52, r: 8 },
          ].map((leaf, i) => (
            <ellipse
              key={i}
              cx={leaf.cx}
              cy={leaf.cy}
              rx={leaf.r}
              ry={leaf.r * 0.75}
              fill={`rgba(${i % 2 === 0 ? '30,80,20' : '20,65,15'},0.45)`}
            />
          ))}

          {/* Ripple animations */}
          {ripples.map((r) => (
            <circle
              key={r.id}
              cx={r.cx}
              cy={r.cy}
              r="3"
              fill="none"
              stroke="rgba(232,160,191,0.6)"
              strokeWidth="0.5"
              style={{ animation: 'pulseRing 0.8s ease-out forwards' }}
            />
          ))}

          {/* Picture nodes */}
          {PICTURE_NODES.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.cx}, ${node.cy})`}
              className="heart-node"
              onClick={() => handleNodeClick(node)}
              style={{ cursor: 'pointer' }}
            >
              {/* Glow ring */}
              <circle
                cx="0"
                cy="0"
                r={node.size / 100 * 7.5}
                fill="none"
                stroke={node.glowColor}
                strokeWidth="0.8"
                style={{
                  animation: pulsing.has(node.id) ? 'pulseRing 1.4s ease-in-out infinite' : 'none',
                  filter: `drop-shadow(0 0 3px ${node.glowColor})`,
                }}
              />
              <foreignObject
                x={-node.size * 0.5}
                y={-node.size * 0.5}
                width={node.size}
                height={node.size}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `2px solid ${node.color}`,
                    boxShadow: `0 0 ${node.size * 0.4}px ${node.glowColor}`,
                    animation: pulsing.has(node.id) ? 'heartbeat 1.4s ease-in-out infinite' : 'none',
                    background: '#1a0515',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={node.imgSrc}
                    alt={node.imgAlt}
                    onError={resolvePhotoFallback}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>

      {/* Picture detail popup */}
      {activeNode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setActiveNode(null)}
        >
          <div
            className="relative rounded-3xl p-6 max-w-sm w-full text-center animate-bloom"
            style={{
              background: 'rgba(20,5,18,0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${activeNode.glowColor}`,
              boxShadow: `0 0 60px ${activeNode.glowColor}, inset 0 1px 0 rgba(255,255,255,0.08)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Expanded picture */}
            <div
              className="mx-auto mb-4 rounded-2xl overflow-hidden"
              style={{
                width: '160px',
                height: '160px',
                border: `2px solid ${activeNode.color}`,
                boxShadow: `0 0 30px ${activeNode.glowColor}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeNode.imgSrc}
                alt={activeNode.imgAlt}
                onError={resolvePhotoFallback}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div
              className="font-display text-xl font-light mb-3"
              style={{ color: activeNode.color }}
            >
              {activeNode.label}
            </div>
            <p
              className="font-display text-sm italic leading-relaxed"
              style={{ color: 'rgba(245,230,240,0.88)' }}
            >
              {activeNode.note}
            </p>
            <button
              onClick={() => setActiveNode(null)}
              className="mt-5 rounded-full px-5 py-2 text-xs font-medium transition-all duration-300 hover:scale-105 focus:outline-none"
              style={{
                background: 'rgba(232,160,191,0.1)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${activeNode.glowColor}`,
                color: activeNode.color,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Continue */}
      <div className="relative z-20 mt-4 mb-8">
        <button
          onClick={onComplete}
          className="relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-500 hover:scale-105 focus:outline-none"
          style={{
            background: 'rgba(194,24,91,0.15)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(232,160,191,0.5)',
            color: '#fff',
            boxShadow: '0 4px 32px rgba(194,24,91,0.28), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          Relive Our Memories
        </button>
      </div>
    </section>
  );
}
