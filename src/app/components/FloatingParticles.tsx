'use client';

import React, { useEffect, useRef } from 'react';

const WORDS = ['love', 'you', 'forever', '♥', 'always', 'mine', '✨', 'nushie'];

interface Particle {
  word: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  drift: number;
  life: number;
  maxLife: number;
  color: string;
}

const COLORS = ['rgba(232,160,191,', 'rgba(255,215,0,', 'rgba(255,107,157,', 'rgba(194,24,91,'];

export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnParticle = () => {
      const maxLife = 200 + Math.random() * 200;
      particles.current.push({
        word: WORDS[Math.floor(Math.random() * WORDS.length)],
        x: Math.random() * canvas.width,
        y: canvas.height + 20,
        size: 10 + Math.random() * 10,
        opacity: 0,
        speed: 0.3 + Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 0.4,
        life: 0,
        maxLife,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    };

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      if (frame % 90 === 0) spawnParticle();

      particles.current = particles.current.filter((p) => {
        p.life++;
        p.y -= p.speed;
        p.x += p.drift;
        const progress = p.life / p.maxLife;
        p.opacity = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;

        ctx.save();
        ctx.font = `${p.size}px var(--font-dm-sans), sans-serif`;
        ctx.fillStyle = `${p.color}${p.opacity * 0.35})`;
        ctx.fillText(p.word, p.x, p.y);
        ctx.restore();

        return p.life < p.maxLife;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      aria-hidden="true"
    />
  );
}