'use client';

import React, { useRef, useEffect, useState } from 'react';

interface Scene2RoseProps {
  onComplete: () => void;
}

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

const PETAL_COLORS = ['#e8a0bf', '#c2185b', '#ff6b9d', '#f48fb1', '#fce4ec', '#ff8a80'];

export default function Scene2Rose({ onComplete }: Scene2RoseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<Petal[]>([]);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const [bloomed, setBloomed] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const bloomingRef = useRef(false);
  const bloomProgressRef = useRef(0);

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

    const drawBackground = (w: number, h: number) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8);
      grad.addColorStop(0, '#1a0515');
      grad.addColorStop(0.5, '#0f000d');
      grad.addColorStop(1, '#0a0008');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle bokeh
      for (let i = 0; i < 25; i++) {
        const bx = ((i * 173 + 80) % w);
        const by = ((i * 113 + 60) % h);
        const alpha = 0.04 + Math.sin(frameRef.current * 0.01 + i) * 0.02;
        const bokehGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 20 + i * 3);
        bokehGrad.addColorStop(0, `rgba(232,160,191,${alpha})`);
        bokehGrad.addColorStop(1, 'rgba(232,160,191,0)');
        ctx.fillStyle = bokehGrad;
        ctx.beginPath();
        ctx.arc(bx, by, 20 + i * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawRoseBud = (cx: number, cy: number, scale: number, sway: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.rotate(sway * 0.03);

      const budGrad = ctx.createRadialGradient(0, -16, 2, 0, -12, 24);
      budGrad.addColorStop(0, 'rgba(255,170,205,0.95)');
      budGrad.addColorStop(0.45, 'rgba(232,110,165,0.95)');
      budGrad.addColorStop(1, 'rgba(145,25,80,0.95)');
      ctx.fillStyle = budGrad;
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.bezierCurveTo(22, -26, 24, -2, 0, 8);
      ctx.bezierCurveTo(-24, -2, -22, -26, 0, -35);
      ctx.fill();

      ctx.strokeStyle = '#2d5a1b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(-4, 35, 4, 60, 2, 82);
      ctx.stroke();

      ctx.restore();
    };

    // Draw a single rose at given position, scale, bloom progress
    const drawRose = (cx: number, cy: number, scale: number, bloomP: number, stemDown: boolean = true) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const petalCount = 7 + Math.floor(bloomP * 11);
      const baseR = 34 + bloomP * 22;

      // Outer petals with tighter rose-like fold
      for (let layer = 0; layer < 4; layer++) {
        const layerBloom = Math.max(0, bloomP - layer * 0.18);
        const r = (baseR - layer * 9) * (0.55 + layerBloom * 0.45);
        const count = petalCount - layer;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + layer * 0.45 + frameRef.current * 0.002;
          const petalX = Math.cos(angle) * r * (0.35 + layer * 0.06);
          const petalY = Math.sin(angle) * r * (0.3 + layer * 0.07);

          ctx.save();
          ctx.translate(petalX, petalY);
          ctx.rotate(angle + Math.PI / 2.4);

          const pGrad = ctx.createRadialGradient(0, 0, 0, 0, r * 0.3, r * 0.6);
          const alpha = 0.7 + layerBloom * 0.3;
          if (layer === 0) {
            pGrad.addColorStop(0, `rgba(255,150,180,${alpha})`);
            pGrad.addColorStop(0.5, `rgba(220,80,130,${alpha})`);
            pGrad.addColorStop(1, `rgba(180,30,80,${alpha})`);
          } else if (layer === 1) {
            pGrad.addColorStop(0, `rgba(240,130,160,${alpha})`);
            pGrad.addColorStop(0.5, `rgba(200,60,110,${alpha})`);
            pGrad.addColorStop(1, `rgba(160,20,60,${alpha})`);
          } else {
            pGrad.addColorStop(0, `rgba(220,100,140,${alpha})`);
            pGrad.addColorStop(0.5, `rgba(180,40,90,${alpha})`);
            pGrad.addColorStop(1, `rgba(140,10,50,${alpha})`);
          }

          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(r * 0.22, -r * 0.34, r * 0.44, -r * 0.02, 0, r * 0.52);
          ctx.bezierCurveTo(-r * 0.44, -r * 0.02, -r * 0.22, -r * 0.34, 0, 0);
          ctx.fill();
          ctx.restore();
        }
      }

      // Rose spiral center
      ctx.strokeStyle = 'rgba(255,210,225,0.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4.8; a += 0.2) {
        const rr = (a / (Math.PI * 4.8)) * (14 + bloomP * 4);
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr * 0.86;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (stemDown) {
        // Stem
        ctx.strokeStyle = '#2d5a1b';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.bezierCurveTo(10, 60, -5, 100, 5, 130);
        ctx.stroke();

        // Leaves
        ctx.fillStyle = 'rgba(45,90,27,0.8)';
        ctx.beginPath();
        ctx.moveTo(5, 80);
        ctx.bezierCurveTo(30, 60, 45, 85, 20, 95);
        ctx.bezierCurveTo(10, 90, 5, 85, 5, 80);
        ctx.fill();
      }

      ctx.restore();
    };

    const updatePetals = () => {
      petalsRef.current = petalsRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.life++;
        p.opacity = Math.max(0, 1 - p.life / p.maxLife);
        return p.life < p.maxLife;
      });
    };

    const drawPetals = () => {
      petalsRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(p.size * 0.4, -p.size * 0.5, p.size * 0.6, p.size * 0.3, 0, p.size * 0.8);
        ctx.bezierCurveTo(-p.size * 0.6, p.size * 0.3, -p.size * 0.4, -p.size * 0.5, 0, 0);
        ctx.fill();
        ctx.restore();
      });
    };

    const animate = () => {
      frameRef.current++;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      drawBackground(w, h);

      if (bloomingRef.current && bloomProgressRef.current < 1) {
        bloomProgressRef.current = Math.min(1, bloomProgressRef.current + 0.018);

        // Spawn petals during bloom
        if (bloomProgressRef.current > 0.3 && Math.random() < 0.4) {
          const cx = w / 2;
          const cy = h * 0.42;
          petalsRef.current.push({
            x: cx + (Math.random() - 0.5) * 120,
            y: cy + (Math.random() - 0.5) * 120,
            vx: (Math.random() - 0.5) * 5,
            vy: -2 - Math.random() * 4,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.12,
            size: 10 + Math.random() * 18,
            opacity: 1,
            color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
            life: 0,
            maxLife: 100 + Math.random() * 80,
          });
        }

        if (bloomProgressRef.current >= 1) {
          setBloomed(true);
          setTimeout(() => setShowContinue(true), 600);
        }
      }

      // Ambient floating petals always
      if (Math.random() < 0.06) {
        petalsRef.current.push({
          x: Math.random() * w,
          y: -10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 0.5 + Math.random() * 1,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.06,
          size: 6 + Math.random() * 10,
          opacity: 0.5 + Math.random() * 0.4,
          color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
          life: 0,
          maxLife: 200 + Math.random() * 100,
        });
      }

      // Main center rose — much bigger
      const mainScale = bloomingRef.current
        ? (1.4 + bloomProgressRef.current * 0.8)
        : (1.4 + Math.sin(frameRef.current * 0.02) * 0.04);
      drawRose(w / 2, h * 0.42, mainScale, bloomProgressRef.current, true);

      // Side roses — smaller, decorative
      const sideBloom = bloomProgressRef.current * 0.7;
      const sideScale = 0.55 + Math.sin(frameRef.current * 0.015) * 0.03;

      // Left rose
      ctx.save();
      ctx.globalAlpha = 0.65;
      drawRose(w * 0.18, h * 0.52, sideScale, sideBloom, false);
      ctx.restore();

      // Right rose
      ctx.save();
      ctx.globalAlpha = 0.65;
      drawRose(w * 0.82, h * 0.52, sideScale, sideBloom, false);
      ctx.restore();

      // Far left rose
      ctx.save();
      ctx.globalAlpha = 0.4;
      drawRose(w * 0.05, h * 0.62, sideScale * 0.75, sideBloom * 0.8, false);
      ctx.restore();

      // Far right rose
      ctx.save();
      ctx.globalAlpha = 0.4;
      drawRose(w * 0.95, h * 0.62, sideScale * 0.75, sideBloom * 0.8, false);
      ctx.restore();

      // Top left small rose
      ctx.save();
      ctx.globalAlpha = 0.35;
      drawRose(w * 0.12, h * 0.25, sideScale * 0.5, sideBloom * 0.6, false);
      ctx.restore();

      // Top right small rose
      ctx.save();
      ctx.globalAlpha = 0.35;
      drawRose(w * 0.88, h * 0.25, sideScale * 0.5, sideBloom * 0.6, false);
      ctx.restore();

      // Flower garden line near bottom
      for (let i = 0; i < 13; i++) {
        const ratio = i / 12;
        const x = w * (0.04 + ratio * 0.92);
        const waveY = Math.sin(frameRef.current * 0.015 + i) * 5;
        const y = h * (0.78 + (i % 3) * 0.045) + waveY;
        if (i % 2 === 0) {
          ctx.save();
          ctx.globalAlpha = 0.62;
          drawRoseBud(x, y, 0.4 + (i % 4) * 0.06, Math.sin(frameRef.current * 0.03 + i));
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = 0.45;
          drawRose(x, y, 0.26 + (i % 3) * 0.05, 0.6 + sideBloom * 0.3, true);
          ctx.restore();
        }
      }

      updatePetals();
      drawPetals();

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleRoseClick = () => {
    if (!bloomingRef.current) {
      bloomingRef.current = true;
    }
  };

  return (
    <section className="scene-section flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-pointer"
        onClick={handleRoseClick}
        aria-label="3D Rose - click to bloom"
      />
      <div className="cinematic-overlay absolute inset-0 pointer-events-none z-10" />

      <div className="relative z-20 flex flex-col items-center gap-5 px-4 text-center mt-auto mb-16">
        {!bloomed ? (
          <>
            <h2 className="font-display text-3xl md:text-5xl font-light text-gradient-rose">
              A Pink Rose for You
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Click the rose to make it bloom ✨
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display text-3xl md:text-5xl font-light text-gradient-gold glow-text-gold">
              Just like you, it blooms beautifully 🌹
            </h2>
          </>
        )}

        {showContinue && (
          <button
            onClick={onComplete}
            className="mt-2 relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-500 hover:scale-105 focus:outline-none"
            style={{
              background: 'rgba(194,24,91,0.15)',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(232,160,191,0.5)',
              color: '#fff',
              boxShadow: '0 4px 32px rgba(194,24,91,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            Continue
          </button>
        )}
      </div>
    </section>
  );
}
