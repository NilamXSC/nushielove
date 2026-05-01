'use client';

import React, { useState, useRef } from 'react';

interface Scene6Props {
  secretUnlocked: boolean;
  openedMemories: Set<number>;
}

interface LoveNote {
  id: number;
  title: string;
  message: string;
  color: string;
  glowColor: string;
  icon: string;
  rotation: number;
}

const LOVE_NOTES: LoveNote[] = [
  {
    id: 0,
    title: 'For Your Smile',
    message: "Your smile is the most beautiful thing I've ever had the privilege of witnessing. It rearranges my entire world every single time Aaijan.",
    color: '#e8a0bf',
    glowColor: 'rgba(232,160,191,0.4)',
    icon: '😊',
    rotation: -3,
  },
  {
    id: 1,
    title: 'For Your Kindness',
    message: "The way you love people, effortlessly, genuinely, completely - it makes me want to be a better person every day Nush.",
    color: '#ffd700',
    glowColor: 'rgba(255,215,0,0.4)',
    icon: '💛',
    rotation: 2,
  },
  {
    id: 2,
    title: 'For Your Strength',
    message: "You carry so much with such grace. I see you. I see how hard you try. I see how strong you are. And I love you endlessly for it.",
    color: '#ff6b9d',
    glowColor: 'rgba(255,107,157,0.4)',
    icon: '💪',
    rotation: -2,
  },
  {
    id: 3,
    title: 'For Your Soul',
    message: "There has never been a single day i didnt thank God for making us meet. So I promise, every single day - to be worthy of your love, My Sweet Nushie.",
    color: '#c2185b',
    glowColor: 'rgba(194,24,91,0.4)',
    icon: '🌸',
    rotation: 3,
  },
];

function RippleEffect({ x, y }: { x: number; y: number }) {
  return (
    <span
      className="absolute rounded-full pointer-events-none animate-ripple"
      style={{
        left: x - 20,
        top: y - 20,
        width: 40,
        height: 40,
        background: 'rgba(232,160,191,0.3)',
      }}
    />
  );
}

export default function Scene6LoveNotes({ secretUnlocked, openedMemories }: Scene6Props) {
  const [openNote, setOpenNote] = useState<LoveNote | null>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [secretVisible, setSecretVisible] = useState(false);
  const rippleId = useRef(0);
  const [openedNotes, setOpenedNotes] = useState<Set<number>>(new Set());

  const handleNoteClick = (note: LoveNote, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    rippleId.current++;
    const rid = rippleId.current;
    setRipples((prev) => [...prev, { id: rid, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== rid)), 600);
    setOpenNote(note);
    setOpenedNotes((prev) => new Set([...prev, note.id]));
  };

  const handleSecretReveal = () => {
    setSecretVisible(true);
  };

  return (
    <section
      className="scene-section flex flex-col items-center justify-start relative overflow-hidden"
      style={{ minHeight: '100vh', paddingTop: '7vh', paddingBottom: '6vh', background: 'var(--background)' }}
    >
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(194,24,91,0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(232,160,191,0.08) 0%, transparent 50%),
            var(--background)
          `,
        }}
      />
      <div className="cinematic-overlay absolute inset-0 pointer-events-none z-10" />

      <div className="relative z-20 w-full max-w-3xl mx-auto px-4 flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <div className="font-display text-xs tracking-[0.4em] uppercase mb-2" style={{ color: 'var(--primary)', opacity: 0.7 }}>
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-light text-gradient-rose">
            Love Notes for You
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Click each envelope to read your letter
          </p>
        </div>

        {/* Envelopes grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 w-full">
          {LOVE_NOTES.map((note) => {
            const opened = openedNotes.has(note.id);
            return (
              <button
                key={note.id}
                onClick={(e) => handleNoteClick(note, e)}
                className="love-note-envelope relative rounded-2xl p-5 md:p-6 text-left focus:outline-none overflow-hidden"
                style={{
                  transform: `rotate(${note.rotation}deg)`,
                  background: `radial-gradient(ellipse at 30% 30%, ${note.color}18, transparent 60%), var(--card)`,
                  border: `1px solid ${opened ? note.color + '60' : 'rgba(232,160,191,0.12)'}`,
                  boxShadow: opened ? `0 0 25px ${note.glowColor}` : '0 4px 20px rgba(0,0,0,0.3)',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                {/* Envelope flap */}
                <div
                  className="absolute top-0 left-0 right-0 h-8 z-0"
                  style={{
                    background: `linear-gradient(to bottom, ${note.color}20, transparent)`,
                    clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                  }}
                />

                {ripples
                  .filter((r) => openedNotes.has(note.id))
                  .map((r) => (
                    <RippleEffect key={r.id} x={r.x} y={r.y} />
                  ))}

                <div className="relative z-10 flex flex-col gap-2">
                  <div className="text-2xl envelope-float" style={{ animationDelay: `${note.id * 0.3}s` }}>
                    {opened ? '💌' : '✉️'}
                  </div>
                  <div
                    className="font-display text-sm md:text-base font-light"
                    style={{ color: opened ? note.color : 'var(--foreground)' }}
                  >
                    {note.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {opened ? 'Read ✓' : 'Click to open'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Secret message section */}
        {secretUnlocked && (
          <div
            className="w-full rounded-2xl p-6 md:p-8 text-center relative overflow-hidden"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(194,24,91,0.2) 0%, rgba(10,0,8,0.95) 70%)',
              border: '1px solid rgba(194,24,91,0.4)',
              boxShadow: '0 0 60px rgba(194,24,91,0.2)',
            }}
          >
            <div className="font-display text-xs tracking-[0.5em] uppercase mb-4" style={{ color: 'var(--primary)', opacity: 0.8 }}>
              ✦ Secret Unlocked ✦
            </div>

            {!secretVisible ? (
              <button
                onClick={handleSecretReveal}
                className="rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-500 hover:scale-110 focus:outline-none glow-rose heart-beat"
                style={{
                  background: 'linear-gradient(135deg, var(--rose), var(--accent))',
                  color: '#fff',
                }}
              >
                Click To Reveal
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="text-4xl heart-beat" style={{ filter: 'drop-shadow(0 0 20px rgba(194,24,91,0.8))' }}>
                  ❤️
                </div>
                <p
                  className="font-display text-lg md:text-2xl font-light italic leading-relaxed max-w-lg"
                  style={{
                    color: 'var(--foreground)',
                    textShadow: '0 0 30px rgba(232,160,191,0.5)',
                    animation: 'secretReveal 1.5s ease-out forwards',
                  }}
                >
                  "No matter where life takes us… I'll always choose you, If you make me wait, I will Wait. Happy Birthday, Nushie ❤️"
                </p>
                <div className="flex gap-2 mt-2">
                  {['✨', '💖', '🌹', '💖', '✨'].map((e, i) => (
                    <span
                      key={i}
                      className="text-xl"
                      style={{
                        animation: `heartbeat ${1.2 + i * 0.2}s ease-in-out infinite`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!secretUnlocked && (
          <div
            className="glass-dark rounded-2xl px-6 py-4 text-center"
            style={{ border: '1px solid rgba(232,160,191,0.1)' }}
          >
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              🔒 Open all {3 - openedMemories.size} remaining memories to unlock the secret message...
            </p>
          </div>
        )}
      </div>

      {/* Note popup */}
      {openNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpenNote(null)}
        >
          <div
            className="relative max-w-md w-full rounded-3xl p-8 text-center animate-bloom"
            style={{
              background: `radial-gradient(ellipse at 50% 0%, ${openNote.color}25, var(--card) 60%)`,
              border: `1px solid ${openNote.color}50`,
              boxShadow: `0 0 60px ${openNote.glowColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-4">{openNote.icon}</div>
            <h3
              className="font-display text-2xl font-light italic mb-4"
              style={{ color: openNote.color }}
            >
              {openNote.title}
            </h3>
            <p
              className="font-display text-base font-light italic leading-relaxed"
              style={{ color: 'rgba(245,230,240,0.9)' }}
            >
              {openNote.message}
            </p>
            <div
              className="w-12 h-0.5 mx-auto my-5 rounded-full"
              style={{ background: openNote.color }}
            />
            <button
              onClick={() => setOpenNote(null)}
              className="text-xs font-medium transition-all hover:opacity-70 focus:outline-none"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Close ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
