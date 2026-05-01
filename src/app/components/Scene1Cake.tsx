'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Scene1CakeProps {
  onComplete: () => void;
}

interface Candle {
  x: number;
  y: number;
  lit: boolean;
  extinguishing: boolean;
  smokeParticles: SmokeParticle[];
}

interface SmokeParticle {
  x: number;
  y: number;
  opacity: number;
  size: number;
  vx: number;
  vy: number;
  life: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  life: number;
  maxLife: number;
}

const CANDLE_COLORS = ['#ff6b9d', '#ffd700', '#e8a0bf', '#c2185b', '#ff9a56'];
const CONFETTI_COLORS = ['#ffd700', '#ff6b9d', '#e8a0bf', '#c2185b', '#ffffff', '#ff9a56', '#a8edea'];

export default function Scene1Cake({ onComplete }: Scene1CakeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const candlesRef = useRef<Candle[]>([]);
  const confettiRef = useRef<Confetti[]>([]);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const blowTimerRef = useRef<number>(0);
  const blowActiveRef = useRef(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micError, setMicError] = useState(false);
  const [blowing, setBlowing] = useState(false);
  const [blowProgress, setBlowProgress] = useState(0);
  const [allExtinguished, setAllExtinguished] = useState(false);
  const extinguishingRef = useRef(false);
  const frameRef = useRef(0);
  const sfxCtxRef = useRef<AudioContext | null>(null);

  const CANDLE_COUNT = 3;

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

    // Init candles
    const initCandles = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cakeTopY = h * 0.64 - 96 - 56;
      const topW = Math.min(w * 0.7, 430) * 0.62;
      const startX = w / 2 - topW / 2 + topW / (CANDLE_COUNT + 1);
      const spacing = topW / (CANDLE_COUNT + 1);

      candlesRef.current = Array.from({ length: CANDLE_COUNT }, (_, i) => ({
        x: startX + i * spacing,
        y: cakeTopY + 10,
        lit: true,
        extinguishing: false,
        smokeParticles: [],
      }));
    };
    initCandles();

    const drawCake = (lightT: number) => {
      const lightBias = lightT - 0.5;
      const w2 = canvas.offsetWidth;
      const h2 = canvas.offsetHeight;
      const cx = w2 / 2;
      const cy = h2 * 0.64;
      const baseW = Math.min(w2 * 0.7, 430);
      const baseH = 96;
      const upperW = baseW * 0.62;
      const upperH = 56;
      const baseTop = cy - baseH * 0.35;
      const upperTop = baseTop - upperH + 4;

      // Ambient glow — bigger
      const ambGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseW * 1.1);
      ambGrad.addColorStop(0, 'rgba(232,160,191,0.14)');
      ambGrad.addColorStop(0.5, 'rgba(194,24,91,0.06)');
      ambGrad.addColorStop(1, 'rgba(10,0,8,0)');
      ctx.fillStyle = ambGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, baseW * 0.95, baseW * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Base plate shadow
      const shadowGrad = ctx.createRadialGradient(cx, cy + 72, 0, cx, cy + 72, baseW * 0.7);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.65)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 72, baseW * 0.7, 44, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bottom platform ring
      const platformGrad = ctx.createLinearGradient(cx - baseW * 0.68, cy + 46, cx + baseW * 0.68, cy + 78);
      platformGrad.addColorStop(0, '#13030f');
      platformGrad.addColorStop(0.5, '#2b071f');
      platformGrad.addColorStop(1, '#10020b');
      ctx.fillStyle = platformGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 58, baseW * 0.7, 54, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main lower cake body
      const baseBodyGrad = ctx.createLinearGradient(cx - baseW / 2, baseTop, cx + baseW / 2, baseTop + baseH);
      baseBodyGrad.addColorStop(0, '#300312');
      baseBodyGrad.addColorStop(0.5, '#170108');
      baseBodyGrad.addColorStop(1, '#2a030f');
      ctx.fillStyle = baseBodyGrad;
      ctx.beginPath();
      ctx.roundRect(cx - baseW / 2, baseTop, baseW, baseH, [18, 18, 12, 12]);
      ctx.fill();
      // Side depth / 3D edge
      ctx.fillStyle = `rgba(${20 + lightT * 50}, ${4 + lightT * 20}, ${14 + lightT * 40}, 0.55)`;
      ctx.fillRect(cx + baseW / 2 - 10, baseTop + 14, 8, baseH - 26);

      // Lower cake top rim
      const lowerRimGrad = ctx.createLinearGradient(cx - baseW / 2, baseTop - 14, cx + baseW / 2, baseTop + 12);
      lowerRimGrad.addColorStop(0, '#ff9a56');
      lowerRimGrad.addColorStop(0.5, '#d55d30');
      lowerRimGrad.addColorStop(1, '#a23524');
      ctx.fillStyle = lowerRimGrad;
      ctx.beginPath();
      ctx.ellipse(cx, baseTop, baseW * 0.5, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6a1b14';
      ctx.beginPath();
      ctx.ellipse(cx, baseTop + 1, baseW * 0.42, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper cake body
      const upperBodyGrad = ctx.createLinearGradient(cx - upperW / 2, upperTop, cx + upperW / 2, upperTop + upperH);
      upperBodyGrad.addColorStop(0, '#3a071b');
      upperBodyGrad.addColorStop(0.5, '#1a010a');
      upperBodyGrad.addColorStop(1, '#360616');
      ctx.fillStyle = upperBodyGrad;
      ctx.beginPath();
      ctx.roundRect(cx - upperW / 2, upperTop, upperW, upperH, [14, 14, 8, 8]);
      ctx.fill();
      ctx.fillStyle = `rgba(${38 + lightT * 55}, ${10 + lightT * 25}, ${22 + lightT * 35}, 0.5)`;
      ctx.fillRect(cx + upperW / 2 - 8, upperTop + 10, 6, upperH - 18);

      // Upper cake rim + top
      const upperRimGrad = ctx.createLinearGradient(cx - upperW / 2, upperTop - 10, cx + upperW / 2, upperTop + 8);
      upperRimGrad.addColorStop(0, '#ffb36b');
      upperRimGrad.addColorStop(0.5, '#ef6f35');
      upperRimGrad.addColorStop(1, '#ba4427');
      ctx.fillStyle = upperRimGrad;
      ctx.beginPath();
      ctx.ellipse(cx, upperTop, upperW * 0.5, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ba4a2e';
      ctx.beginPath();
      ctx.ellipse(cx, upperTop + 1, upperW * 0.4, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front highlight ring
      const plateGrad = ctx.createLinearGradient(cx - baseW * 0.65, cy + 55, cx + baseW * 0.65, cy + 70);
      plateGrad.addColorStop(0, '#2a1025');
      plateGrad.addColorStop(0.5, '#3d1535');
      plateGrad.addColorStop(1, '#1a0815');
      ctx.fillStyle = plateGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 58, baseW * 0.58, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232,160,191,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Gloss highlight (moves with “rotation”)
      const glossAlpha = 0.12 + lightT * 0.22;
      const glossGrad = ctx.createLinearGradient(cx - baseW * 0.4, upperTop - 28, cx + baseW * 0.2, cy + 20);
      glossGrad.addColorStop(0, `rgba(255,255,255,${glossAlpha})`);
      glossGrad.addColorStop(0.45, `rgba(255,220,235,${glossAlpha * 0.4})`);
      glossGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.ellipse(cx + lightBias * 36, cy - upperH * 0.55, upperW * 0.52, upperH + baseH * 0.52, lightBias * 0.12, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawCandle = (candle: Candle, idx: number, time: number) => {
      const w2 = canvas.offsetWidth;
      const h2 = canvas.offsetHeight;
      const baseW = Math.min(w2 * 0.7, 430);
      const upperW = baseW * 0.62;
      const cakeTopY = h2 * 0.64 - 96 - 56;
      const cX = w2 / 2 - upperW / 2 + upperW / (CANDLE_COUNT + 1) + idx * (upperW / (CANDLE_COUNT + 1));
      const cY = cakeTopY + 10;

      // Candle body — taller
      const candleH = 32;
      const candleW = 9;
      const color = CANDLE_COLORS[idx % CANDLE_COLORS.length];
      const bodyGrad = ctx.createLinearGradient(cX - candleW, cY - candleH, cX + candleW, cY);
      bodyGrad.addColorStop(0, color);
      bodyGrad.addColorStop(0.4, '#ffffff33');
      bodyGrad.addColorStop(1, color);
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(cX - candleW / 2, cY - candleH, candleW, candleH, 4);
      ctx.fill();

      // Wick
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cX, cY - candleH);
      ctx.lineTo(cX, cY - candleH - 6);
      ctx.stroke();

      if (candle.lit) {
        const flicker = Math.sin(time * 0.015 + idx * 1.3) * 2;
        const flicker2 = Math.cos(time * 0.022 + idx * 0.9) * 1.5;
        const flickerScale = 0.85 + Math.sin(time * 0.02 + idx) * 0.15;

        // Flame glow
        const glowGrad = ctx.createRadialGradient(cX, cY - candleH - 12, 0, cX, cY - candleH - 10, 22);
        glowGrad.addColorStop(0, `rgba(255,215,0,${0.3 * flickerScale})`);
        glowGrad.addColorStop(0.5, `rgba(255,100,0,${0.15 * flickerScale})`);
        glowGrad.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.ellipse(cX + flicker2, cY - candleH - 10, 22, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer flame
        ctx.fillStyle = `rgba(255,140,0,${0.85 * flickerScale})`;
        ctx.beginPath();
        ctx.moveTo(cX + flicker, cY - candleH - 22 * flickerScale);
        ctx.bezierCurveTo(cX + 7 + flicker2, cY - candleH - 12, cX + 6, cY - candleH, cX, cY - candleH);
        ctx.bezierCurveTo(cX - 6, cY - candleH, cX - 7 + flicker2, cY - candleH - 12, cX + flicker, cY - candleH - 22 * flickerScale);
        ctx.fill();

        // Inner flame
        ctx.fillStyle = `rgba(255,230,100,${0.95 * flickerScale})`;
        ctx.beginPath();
        ctx.moveTo(cX + flicker * 0.5, cY - candleH - 16 * flickerScale);
        ctx.bezierCurveTo(cX + 3.5, cY - candleH - 10, cX + 3.5, cY - candleH - 2, cX, cY - candleH);
        ctx.bezierCurveTo(cX - 3.5, cY - candleH - 2, cX - 3.5, cY - candleH - 10, cX + flicker * 0.5, cY - candleH - 16 * flickerScale);
        ctx.fill();

        // Core flame
        ctx.fillStyle = 'rgba(255,255,200,0.9)';
        ctx.beginPath();
        ctx.ellipse(cX, cY - candleH - 5, 2.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Smoke particles
      candle.smokeParticles.forEach((sp) => {
        ctx.save();
        ctx.globalAlpha = sp.opacity;
        ctx.fillStyle = 'rgba(200,180,200,1)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    const updateSmoke = () => {
      candlesRef.current.forEach((c) => {
        if (c.extinguishing) {
          c.smokeParticles.push({
            x: c.x + (Math.random() - 0.5) * 4,
            y: c.y - 30,
            opacity: 0.5,
            size: 2 + Math.random() * 3,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.8 - Math.random() * 0.5,
            life: 0,
          });
        }
        c.smokeParticles = c.smokeParticles.filter((sp) => {
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.size += 0.08;
          sp.opacity -= 0.012;
          sp.life++;
          return sp.opacity > 0;
        });
      });
    };

    const updateConfetti = () => {
      confettiRef.current = confettiRef.current.filter((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.15;
        c.vx *= 0.99;
        c.rotation += c.rotationSpeed;
        c.life++;
        c.opacity = Math.max(0, 1 - c.life / c.maxLife);
        return c.life < c.maxLife && c.y < canvas.offsetHeight + 20;
      });
    };

    const drawConfetti = () => {
      confettiRef.current.forEach((c) => {
        ctx.save();
        ctx.globalAlpha = c.opacity;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        ctx.restore();
      });
    };

    const drawBackground = () => {
      const w2 = canvas.offsetWidth;
      const h2 = canvas.offsetHeight;
      ctx.clearRect(0, 0, w2, h2);

      const bgGrad = ctx.createRadialGradient(w2 / 2, h2 * 0.4, 0, w2 / 2, h2 * 0.4, w2 * 0.8);
      bgGrad.addColorStop(0, '#1a0015');
      bgGrad.addColorStop(0.5, '#0f0010');
      bgGrad.addColorStop(1, '#0a0008');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w2, h2);

      // Stars
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137 + 50) % w2);
        const sy = ((i * 97 + 30) % (h2 * 0.45));
        const alpha = 0.2 + Math.sin(frameRef.current * 0.02 + i) * 0.15;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.fill();
      }
    };

    const animate = () => {
      frameRef.current++;
      const w2 = canvas.offsetWidth;
      const h2 = canvas.offsetHeight;

      drawBackground();

      const baseW = Math.min(w2 * 0.7, 430);
      const upperW = baseW * 0.62;
      const cakeTopY = h2 * 0.64 - 96 - 56;
      const cx = w2 / 2;
      const cy = h2 * 0.64;
      const spin = frameRef.current * 0.007;
      const scaleX = 0.5 + Math.abs(Math.cos(spin)) * 0.5;
      const lightT = (Math.sin(spin) + 1) / 2;

      ctx.save();
      ctx.translate(cx, cy + Math.sin(spin * 2) * 6);
      ctx.scale(scaleX, 1 + Math.sin(spin) * 0.04);
      ctx.translate(-cx, -cy);
      drawCake(lightT);

      candlesRef.current.forEach((candle, idx) => {
        const cX = w2 / 2 - upperW / 2 + upperW / (CANDLE_COUNT + 1) + idx * (upperW / (CANDLE_COUNT + 1));
        candle.x = cX;
        candle.y = cakeTopY + 10;
        drawCandle(candle, idx, frameRef.current);
      });
      ctx.restore();

      updateSmoke();
      updateConfetti();
      drawConfetti();

      const litCount = candlesRef.current.filter((c) => c.lit).length;

      if (litCount === 0 && !extinguishingRef.current) {
        extinguishingRef.current = true;
        setAllExtinguished(true);
        setTimeout(() => {
          spawnConfetti();
          playConfettiBurstSound();
          setShowSuccess(true);
        }, 800);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const spawnConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    for (let i = 0; i < 180; i++) {
      confettiRef.current.push({
        x: w / 2 + (Math.random() - 0.5) * w * 0.6,
        y: h * 0.3 + Math.random() * h * 0.2,
        vx: (Math.random() - 0.5) * 8,
        vy: -6 - Math.random() * 8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        life: 0,
        maxLife: 120 + Math.random() * 80,
      });
    }
  };

  const getSfxContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!sfxCtxRef.current) {
      sfxCtxRef.current = new AudioCtx();
    }
    return sfxCtxRef.current;
  };

  const playWooshSound = () => {
    const ctx = getSfxContext();
    if (!ctx) return;
    const duration = 0.45;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.65;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + duration);
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
  };

  const playConfettiBurstSound = () => {
    const ctx = getSfxContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const burstCount = 16;
    for (let i = 0; i < burstCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'square';
      const base = 520 + Math.random() * 1600;
      const start = now + i * 0.012;
      const end = start + 0.08 + Math.random() * 0.08;
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(120, base * 0.38), end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.08, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.01);
    }
  };

  const extinguishCandles = useCallback(() => {
    if (extinguishingRef.current) return;
    playWooshSound();
    const candles = candlesRef.current;
    const litCandles = candles.filter((c) => c.lit);
    litCandles.forEach((candle, i) => {
      setTimeout(() => {
        candle.extinguishing = true;
        setTimeout(() => {
          candle.lit = false;
          candle.extinguishing = false;
        }, 600);
      }, i * 120);
    });
  }, []);

  const enableMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      setMicEnabled(true);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const checkBlow = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        if (avg > 0.18) {
          setBlowing(true);
          blowTimerRef.current += 16;
          setBlowProgress(Math.min(100, (blowTimerRef.current / 400) * 100));
          if (blowTimerRef.current > 400 && !blowActiveRef.current) {
            blowActiveRef.current = true;
            extinguishCandles();
          }
        } else {
          setBlowing(false);
          blowTimerRef.current = Math.max(0, blowTimerRef.current - 8);
          setBlowProgress(Math.min(100, (blowTimerRef.current / 400) * 100));
        }
        if (!extinguishingRef.current) {
          requestAnimationFrame(checkBlow);
        }
      };
      requestAnimationFrame(checkBlow);
    } catch {
      setMicError(true);
    }
  }, [extinguishCandles]);

  useEffect(() => {
    void enableMic();
  }, [enableMic]);

  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <section className="scene-section flex flex-col items-center justify-center relative" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
        aria-label="Birthday cake with candles"
      />

      {/* Cinematic overlay */}
      <div className="cinematic-overlay absolute inset-0 pointer-events-none z-10" />

      {/* Content overlay — title top, controls anchored very low */}
      <div className="relative z-20 flex min-h-screen w-full flex-col px-4 text-center">
        <h1 className="shrink-0 pt-8 md:pt-12 font-script text-5xl md:text-7xl lg:text-8xl leading-tight text-gradient-rose glow-text-rose px-2">
          Make a wish, Nushie...
        </h1>
        {!showSuccess && (
          <p className="mt-4 shrink-0 text-sm opacity-85" style={{ color: 'var(--muted-foreground)' }}>
            Blow out the candles — the mic turns on when you open this page ✨
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col justify-end pb-32 sm:pb-36 md:pb-44 lg:pb-52">
          {!showSuccess && (
            <>
              {micError && !allExtinguished && (
                <button
                  type="button"
                  onClick={() => {
                    setMicError(false);
                    void enableMic();
                  }}
                  className="mx-auto mb-4 max-w-sm rounded-full px-6 py-3 text-sm font-semibold outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-pink-300"
                  style={{
                    background: 'rgba(194,24,91,0.25)',
                    border: '1px solid rgba(232,160,191,0.45)',
                    color: '#fff',
                  }}
                >
                  Microphone blocked — tap to allow
                </button>
              )}

              {micEnabled && !allExtinguished && (
                <div className="mx-auto w-full max-w-xs pb-2">
                  <div className="h-2 rounded-full overflow-hidden shadow-inner" style={{ background: 'rgba(232,160,191,0.15)' }}>
                    <div
                      className="h-full rounded-full transition-[width] duration-100 ease-out"
                      style={{
                        width: `${blowProgress}%`,
                        background: 'linear-gradient(90deg, var(--primary), var(--gold))',
                        boxShadow: '0 0 12px rgba(255,215,0,0.35)',
                      }}
                    />
                  </div>
                </div>
              )}

              {blowing && !allExtinguished && (
                <p className="mx-auto pb-3 text-sm font-medium" style={{ color: 'rgba(232,160,191,0.95)' }}>
                  Keep blowing…
                </p>
              )}
            </>
          )}

          {showSuccess && (
            <div className="flex flex-col items-center gap-5">
              <div className="font-display text-2xl md:text-3xl text-gradient-gold glow-text-gold">
                ✨ Your wish is written in the stars ✨
              </div>
              <button
                type="button"
                onClick={onComplete}
                className="relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-500 hover:scale-105 focus:outline-none"
                style={{
                  background: 'rgba(194,24,91,0.18)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  border: '1px solid rgba(232,160,191,0.5)',
                  color: '#fff',
                  boxShadow: '0 4px 32px rgba(194,24,91,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                Continue the journey
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
