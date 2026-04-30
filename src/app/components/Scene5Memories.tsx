'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Scene5Props {
  openedMemories: Set<number>;
  onMemoryOpen: (id: number) => void;
  onComplete: () => void;
}

interface Memory {
  id: number;
  title: string;
  subtitle: string;
  text: string;
  mood: 'cinema' | 'dance' | 'rain';
  icon: string;
}

const MEMORIES: Memory[] = [
  {
    id: 0,
    title: '7th April Movie Date',
    subtitle: 'Rocky Grace Approves',
    text: "AMAZE AMAZE AMAZE — Rocky Grace approves Nushie 😊 ... Nushie, you should know — Nil would let his Astrophage burn just to see your pretty face that he never gets tired of.",
    mood: 'cinema',
    icon: '🎬',
  },
  {
    id: 1,
    title: '11th April Dance Night',
    subtitle: 'The Night I Fell For You',
    text: "I still remember your every move when you wore that violet saree… There has never been a single day I haven't looked at your picture in that dress… Looking like a dream come true… where all eyes were searching for you, but your eyes searched for me.",
    mood: 'dance',
    icon: '💃',
  },
  {
    id: 2,
    title: '18th April Rain Drive',
    subtitle: 'Kissing in the Rain',
    text: "The rain drummed softly on the windshield as our favorite playlist filled the car… and somewhere between the thunder and the melody, our lips met — again and again — like we had all the time in the world. The whole world outside was soaked, but inside that car, everything was warm, electric, and perfectly ours.",
    mood: 'rain',
    icon: '🌧️',
  },
];

function MemoryScene({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const [displayedText, setDisplayedText] = useState('');
  const [titleVisible, setTitleVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTimeout(() => setTitleVisible(true), 300);
    setTimeout(() => {
      let idx = 0;
      intervalRef.current = setInterval(() => {
        if (idx < memory.text.length) {
          setDisplayedText(memory.text.slice(0, idx + 1));
          idx++;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 40);
    }, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [memory.text]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    interface RainDrop { x: number; y: number; speed: number; length: number; opacity: number; }
    interface DanceParticle { x: number; y: number; vx: number; vy: number; size: number; color: string; opacity: number; life: number; }
    interface Splash { x: number; y: number; r: number; opacity: number; }

    const rainDrops: RainDrop[] = Array.from({ length: 180 }, () => ({
      x: Math.random() * 1200,
      y: Math.random() * 900,
      speed: 10 + Math.random() * 8,
      length: 18 + Math.random() * 25,
      opacity: 0.2 + Math.random() * 0.35,
    }));

    const splashes: Splash[] = [];
    const danceParticles: DanceParticle[] = [];
    const DANCE_COLORS = ['#ffd700', '#ff6b9d', '#e8a0bf', '#c2185b', '#ffffff', '#a78bfa'];

    const animate = () => {
      frameRef.current++;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      if (memory.mood === 'cinema') {
        // Cinema dark with film grain
        ctx.fillStyle = '#0a0005';
        ctx.fillRect(0, 0, w, h);

        // Spotlight
        const spotGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.5);
        spotGrad.addColorStop(0, 'rgba(255,220,150,0.08)');
        spotGrad.addColorStop(0.5, 'rgba(255,180,100,0.03)');
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, w, h);

        // Film grain
        for (let i = 0; i < 200; i++) {
          const gx = Math.random() * w;
          const gy = Math.random() * h;
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
          ctx.fillRect(gx, gy, 1, 1);
        }

        // Letterbox bars
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, w, h * 0.08);
        ctx.fillRect(0, h * 0.92, w, h * 0.08);

      } else if (memory.mood === 'dance') {
        ctx.fillStyle = '#05000f';
        ctx.fillRect(0, 0, w, h);

        // Neon lights
        const neonColors = ['rgba(255,0,100,', 'rgba(100,0,255,', 'rgba(0,200,255,', 'rgba(255,200,0,'];
        for (let i = 0; i < 4; i++) {
          const lx = (w / 5) * (i + 1);
          const alpha = 0.03 + Math.sin(frameRef.current * 0.04 + i * 1.2) * 0.02;
          const lGrad = ctx.createRadialGradient(lx, 0, 0, lx, h * 0.3, h * 0.5);
          lGrad.addColorStop(0, `${neonColors[i]}${alpha})`);
          lGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = lGrad;
          ctx.fillRect(0, 0, w, h);
        }

        // Dance particles
        if (frameRef.current % 3 === 0) {
          danceParticles.push({
            x: Math.random() * w,
            y: h + 10,
            vx: (Math.random() - 0.5) * 2,
            vy: -1.5 - Math.random() * 2,
            size: 2 + Math.random() * 4,
            color: DANCE_COLORS[Math.floor(Math.random() * DANCE_COLORS.length)],
            opacity: 1,
            life: 0,
          });
        }

        for (let i = danceParticles.length - 1; i >= 0; i--) {
          const p = danceParticles[i];
          p.x += p.vx + Math.sin(frameRef.current * 0.05 + i) * 0.5;
          p.y += p.vy;
          p.life++;
          p.opacity = Math.max(0, 1 - p.life / 80);
          if (p.opacity <= 0) { danceParticles.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

      } else if (memory.mood === 'rain') {
        // Dark stormy sky
        ctx.fillStyle = '#020810';
        ctx.fillRect(0, 0, w, h);

        // Fog/mist layers
        const fogGrad = ctx.createLinearGradient(0, 0, 0, h);
        fogGrad.addColorStop(0, 'rgba(100,140,200,0.04)');
        fogGrad.addColorStop(0.5, 'rgba(80,120,180,0.02)');
        fogGrad.addColorStop(1, 'rgba(60,100,160,0.06)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, w, h);

        // Rain streaks — heavier
        ctx.lineWidth = 0.9;
        rainDrops.forEach((drop) => {
          ctx.save();
          ctx.globalAlpha = drop.opacity;
          ctx.strokeStyle = `rgba(180,220,255,${drop.opacity})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.length * 0.25, drop.y + drop.length);
          ctx.stroke();
          ctx.restore();
          drop.y += drop.speed;
          drop.x -= drop.speed * 0.18;
          if (drop.y > h + 30) {
            // Splash on landing
            if (Math.random() < 0.15) {
              splashes.push({ x: drop.x, y: h - 5, r: 0, opacity: 0.6 });
            }
            drop.y = -30;
            drop.x = Math.random() * (w + 100);
          }
        });

        // Splashes
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          s.r += 1.5;
          s.opacity -= 0.06;
          if (s.opacity <= 0) { splashes.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = s.opacity;
          ctx.strokeStyle = 'rgba(180,220,255,0.5)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Window glass reflection effect
        const winGrad = ctx.createLinearGradient(0, 0, w, 0);
        winGrad.addColorStop(0, 'rgba(180,220,255,0.015)');
        winGrad.addColorStop(0.5, 'rgba(180,220,255,0.04)');
        winGrad.addColorStop(1, 'rgba(180,220,255,0.015)');
        ctx.fillStyle = winGrad;
        ctx.fillRect(0, 0, w, h);

        // Thunder flash — more frequent
        const thunderPhase = Math.sin(frameRef.current * 0.025);
        const thunderAlpha = thunderPhase > 0.96 ? (thunderPhase - 0.96) * 15 * 0.5 : 0;
        if (thunderAlpha > 0) {
          ctx.fillStyle = `rgba(210,230,255,${thunderAlpha})`;
          ctx.fillRect(0, 0, w, h);
          // Thunder bolt silhouette
          if (thunderAlpha > 0.15) {
            ctx.strokeStyle = `rgba(255,255,255,${thunderAlpha * 1.5})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const bx = w * 0.3 + Math.random() * w * 0.4;
            ctx.moveTo(bx, 0);
            ctx.lineTo(bx - 15, h * 0.3);
            ctx.lineTo(bx + 10, h * 0.3);
            ctx.lineTo(bx - 20, h * 0.65);
            ctx.stroke();
          }
        }

        // Ambient blue glow at bottom (puddle reflection)
        const puddleGrad = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.6);
        puddleGrad.addColorStop(0, 'rgba(100,160,255,0.06)');
        puddleGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = puddleGrad;
        ctx.fillRect(0, 0, w, h);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [memory.mood]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="cinematic-overlay absolute inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto px-6 text-center flex flex-col items-center gap-6">
        <div className="text-4xl" style={{ filter: 'drop-shadow(0 0 15px rgba(232,160,191,0.8))' }}>
          {memory.icon}
        </div>

        <div
          className="font-display text-xs tracking-[0.5em] uppercase transition-all duration-700"
          style={{
            color: 'var(--primary)',
            opacity: titleVisible ? 0.8 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(10px)',
          }}
        >
          {memory.subtitle}
        </div>

        <h3
          className="font-display text-3xl md:text-4xl font-light italic text-gradient-rose transition-all duration-700"
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(15px)',
          }}
        >
          {memory.title}
        </h3>

        <p
          className="font-display text-lg md:text-xl font-light italic leading-relaxed"
          style={{
            color: 'rgba(245,230,240,0.9)',
            textShadow: '0 0 30px rgba(232,160,191,0.3)',
            minHeight: '3em',
          }}
        >
          {displayedText}
          <span className="inline-block w-0.5 ml-0.5 align-middle" style={{ height: '0.7em', background: 'var(--primary)' }} />
        </p>

        <button
          onClick={onClose}
          className="rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 hover:scale-105 focus:outline-none mt-4"
          style={{
            background: 'rgba(232,160,191,0.08)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(232,160,191,0.3)',
            color: 'var(--foreground)',
          }}
        >
          Back to Memories
        </button>
      </div>
    </div>
  );
}

export default function Scene5Memories({ openedMemories, onMemoryOpen, onComplete }: Scene5Props) {
  const [activeMemory, setActiveMemory] = useState<Memory | null>(null);
  const [randomLove, setRandomLove] = useState('');
  const [showRandom, setShowRandom] = useState(false);

  const LOVE_LINES = [
    "You\'re the reason I smile at nothing.",
    "I fell for you before I knew what falling was.",
    "You make ordinary moments extraordinary.",
    "With you, every day is my favorite day.",
    "I love you more than words can hold.",
    "You are my person. Always.",
    "The universe had to create you just for me.",
    "I\'d choose you in every lifetime.",
  ];

  const handleMemoryClick = (mem: Memory) => {
    setActiveMemory(mem);
    onMemoryOpen(mem.id);
  };

  const handleRandomLove = () => {
    setShowRandom(false);
    setTimeout(() => {
      setRandomLove(LOVE_LINES[Math.floor(Math.random() * LOVE_LINES.length)]);
      setShowRandom(true);
    }, 150);
  };

  const moodBg: Record<string, string> = {
    cinema: 'radial-gradient(ellipse at 50% 30%, rgba(255,180,50,0.15) 0%, rgba(10,0,8,0.9) 70%)',
    dance: 'radial-gradient(ellipse at 50% 30%, rgba(100,0,255,0.15) 0%, rgba(5,0,15,0.9) 70%)',
    rain: 'radial-gradient(ellipse at 50% 30%, rgba(50,100,200,0.15) 0%, rgba(3,8,16,0.9) 70%)',
  };

  return (
    <section
      className="scene-section flex flex-col items-center justify-start relative overflow-hidden"
      style={{ minHeight: '100vh', paddingTop: '7vh', paddingBottom: '5vh' }}
    >
      <div className="absolute inset-0 z-0" style={{ background: 'var(--background)' }} />
      <div className="cinematic-overlay absolute inset-0 pointer-events-none z-10" />

      <div className="relative z-20 w-full max-w-3xl mx-auto px-4 flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="font-display text-3xl md:text-5xl font-light text-gradient-rose">
            Our Memories
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--muted-foreground)' }}>
            {openedMemories.size < 3
              ? `${3 - openedMemories.size} memor${3 - openedMemories.size !== 1 ? 'ies' : 'y'} left to unlock the secret...`
              : '✨ All memories unlocked — the secret awaits below'}
          </p>
        </div>

        {/* Memory cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {MEMORIES.map((mem) => {
            const opened = openedMemories.has(mem.id);
            return (
              <button
                key={mem.id}
                onClick={() => handleMemoryClick(mem)}
                className="memory-card rounded-2xl p-6 text-left focus:outline-none relative overflow-hidden"
                style={{
                  background: moodBg[mem.mood],
                  border: opened
                    ? '1px solid rgba(232,160,191,0.5)'
                    : '1px solid rgba(232,160,191,0.15)',
                  boxShadow: opened ? '0 0 30px rgba(232,160,191,0.2)' : 'none',
                }}
              >
                {opened && (
                  <div
                    className="absolute top-3 right-3 w-2 h-2 rounded-full"
                    style={{ background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }}
                  />
                )}
                <div className="text-3xl mb-3">{mem.icon}</div>
                <div className="font-display text-lg font-light mb-1" style={{ color: 'var(--foreground)' }}>
                  {mem.title}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {mem.subtitle}
                </div>
                {opened && (
                  <div className="mt-3 text-xs" style={{ color: 'rgba(232,160,191,0.7)' }}>
                    ✓ Relived
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Random love generator */}
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          <button
            onClick={handleRandomLove}
            className="rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 hover:scale-105 focus:outline-none heart-beat"
            style={{
              background: 'linear-gradient(135deg, var(--rose), var(--accent))',
              color: '#fff',
            }}
          >
            Tap me 💖
          </button>

          {showRandom && randomLove && (
            <div
              className="glass-dark rounded-2xl px-5 py-4 text-center animate-bloom"
              style={{ border: '1px solid rgba(232,160,191,0.25)' }}
            >
              <p className="font-display text-base italic" style={{ color: 'var(--primary)' }}>
                {randomLove}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onComplete}
          className="relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-500 hover:scale-105 focus:outline-none mt-2"
          style={{
            background: 'rgba(232,160,191,0.1)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(232,160,191,0.4)',
            color: 'var(--foreground)',
            boxShadow: '0 4px 24px rgba(232,160,191,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          Read My Love Notes
        </button>
      </div>

      {/* Memory scene overlay */}
      {activeMemory && (
        <MemoryScene
          memory={activeMemory}
          onClose={() => setActiveMemory(null)}
        />
      )}
    </section>
  );
}