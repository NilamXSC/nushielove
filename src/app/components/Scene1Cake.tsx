'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface Scene1CakeProps {
  onComplete: () => void;
  /** Fires when candles are fully blown out — use to start ambient music etc. */
  onCandlesBlown?: () => void;
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

const CANDLE_HEX = [0xff6b9d, 0xffd700, 0xe8a0bf];
const CONFETTI_COLORS = ['#ffd700', '#ff6b9d', '#e8a0bf', '#c2185b', '#ffffff', '#ff9a56', '#a8edea'];

export default function Scene1Cake({ onComplete, onCandlesBlown }: Scene1CakeProps) {
  const threeMountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cakePivotRef = useRef<THREE.Group | null>(null);
  const flamesRef = useRef<THREE.Group[]>([]);
  const pointLightsRef = useRef<THREE.PointLight[]>([]);

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
  const disposedRef = useRef(false);

  const CANDLE_COUNT = 3;

  useEffect(() => {
    const mount = threeMountRef.current;
    const overlay = canvasRef.current;
    if (!mount || !overlay) return;

    disposedRef.current = false;

    candlesRef.current = Array.from({ length: CANDLE_COUNT }, () => ({
      x: 0,
      y: 0,
      lit: true,
      extinguishing: false,
      smokeParticles: [],
    }));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0010);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 1.85, 5.85);
    camera.lookAt(0, 1.95, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xfff0f8, 0.35));

    const key = new THREE.DirectionalLight(0xffcce0, 0.85);
    key.position.set(-3.8, 6.8, 4.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.00035;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8844aa, 0.42);
    fill.position.set(4.8, 2.5, -2);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffdda0, 0.28);
    rim.position.set(0.5, -1.2, -4);
    scene.add(rim);

    const cakePivot = new THREE.Group();
    cakePivot.position.set(0, 0.35, 0);
    cakePivotRef.current = cakePivot;
    scene.add(cakePivot);

    const chocolate = (hex: number) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.38,
        metalness: 0.08,
      });

    const icingMat = () =>
      new THREE.MeshStandardMaterial({
        color: 0xe86a52,
        roughness: 0.34,
        metalness: 0.12,
        emissive: 0x3a1610,
        emissiveIntensity: 0.12,
      });

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.58, 1.72, 0.13, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a0814, roughness: 0.62, metalness: 0.22 }),
    );
    plate.position.y = 0.94;
    plate.receiveShadow = true;
    plate.castShadow = true;
    cakePivot.add(plate);

    const baseTier = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.22, 0.62, 64), chocolate(0x3a1625));
    baseTier.position.y = 1.34;
    baseTier.castShadow = true;
    baseTier.receiveShadow = true;
    cakePivot.add(baseTier);

    const baseIcing = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.065, 64), icingMat());
    baseIcing.position.y = 1.68;
    baseIcing.castShadow = false;
    cakePivot.add(baseIcing);

    const topTier = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.78, 0.38, 48), chocolate(0x4a1730));
    topTier.position.y = 2.06;
    topTier.castShadow = true;
    topTier.receiveShadow = true;
    cakePivot.add(topTier);

    const topIcing = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.046, 48), icingMat());
    topIcing.position.y = 2.28;
    cakePivot.add(topIcing);

    const cherry = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xc4123a, roughness: 0.22, metalness: 0.18 }),
    );
    cherry.position.set(0, 2.4, 0);
    cherry.castShadow = true;
    cakePivot.add(cherry);

    const flameMeshes: THREE.Group[] = [];
    const plights: THREE.PointLight[] = [];

    const candleStemGeom = new THREE.CylinderGeometry(0.036, 0.042, 0.11, 16);
    for (let i = 0; i < CANDLE_COUNT; i++) {
      const a = (-Math.PI / 8 + (Math.PI * 2 * i) / CANDLE_COUNT) as number;
      const r = 0.36;
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;

      const stem = new THREE.Mesh(candleStemGeom, new THREE.MeshStandardMaterial({
        color: CANDLE_HEX[i % CANDLE_HEX.length],
        roughness: 0.45,
        metalness: 0.06,
      }));
      stem.position.set(cx, 2.355, cz);
      stem.castShadow = true;
      cakePivot.add(stem);

      const flameGroup = new THREE.Group();
      flameGroup.position.set(cx, 2.46, cz);

      const outer = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.16, 12, 1, false),
        new THREE.MeshStandardMaterial({
          color: 0xff7200,
          emissive: 0xffab30,
          emissiveIntensity: 1.85,
          roughness: 0.42,
          transparent: true,
          opacity: 0.96,
        }),
      );
      outer.position.y = 0.05;
      outer.rotation.x = Math.PI;
      flameGroup.add(outer);

      const inner = new THREE.Mesh(
        new THREE.ConeGeometry(0.026, 0.09, 10, 1, false),
        new THREE.MeshStandardMaterial({
          color: 0xffee88,
          emissive: 0xffeeb0,
          emissiveIntensity: 2.45,
          roughness: 0.38,
          transparent: true,
          opacity: 0.98,
        }),
      );
      inner.position.y = 0.08;
      inner.rotation.x = Math.PI;
      flameGroup.add(inner);

      const pl = new THREE.PointLight(0xffaa44, 0.55, 0.65, 1.85);
      pl.position.set(0, 0.1, 0);
      flameGroup.add(pl);

      flameMeshes.push(flameGroup);
      plights.push(pl);
      cakePivot.add(flameGroup);
    }

    flamesRef.current = flameMeshes;
    pointLightsRef.current = plights;

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.92, 1.92, 0.035, 64),
      new THREE.MeshStandardMaterial({ color: 0x10060c, roughness: 0.74, metalness: 0.15 }),
    );
    pedestal.position.y = 0.84;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const resizeThree = () => {
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeOverlay = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = overlay.offsetWidth;
      const h = overlay.offsetHeight;
      overlay.width = w * dpr;
      overlay.height = h * dpr;
      const ctx = overlay.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeThree();
    resizeOverlay();
    window.addEventListener('resize', resizeThree);
    window.addEventListener('resize', resizeOverlay);

    const overlayCtx = overlay.getContext('2d');
    if (!overlayCtx) return;

    const drawBackgroundStars = (w: number, h: number) => {
      overlayCtx.save();
      const bgGrad = overlayCtx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, w * 0.85);
      bgGrad.addColorStop(0, 'rgba(26, 0, 21, 0)');
      bgGrad.addColorStop(0.45, 'rgba(12, 0, 14, 0)');
      bgGrad.addColorStop(1, 'rgba(6, 0, 10, 0)');
      overlayCtx.fillStyle = bgGrad;
      overlayCtx.fillRect(0, 0, w, h);

      overlayCtx.restore();
      for (let i = 0; i < 72; i++) {
        const sx = (i * 137 + 50) % w;
        const sy = (i * 97 + 30) % (h * 0.48);
        const alpha = 0.2 + Math.sin(frameRef.current * 0.02 + i) * 0.16;
        overlayCtx.fillStyle = `rgba(255,215,0,${alpha})`;
        overlayCtx.beginPath();
        overlayCtx.arc(sx, sy, i % 3 === 0 ? 1.1 : 0.65, 0, Math.PI * 2);
        overlayCtx.fill();
      }
    };

    const updateConfetti = () => {
      const w = overlay.offsetWidth;
      const h = overlay.offsetHeight;
      confettiRef.current = confettiRef.current.filter((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.15;
        c.vx *= 0.99;
        c.rotation += c.rotationSpeed;
        c.life++;
        c.opacity = Math.max(0, 1 - c.life / c.maxLife);
        return c.life < c.maxLife && c.y < h + 20 && c.opacity > 0;
      });
    };

    const drawConfetti = () => {
      confettiRef.current.forEach((c) => {
        overlayCtx.save();
        overlayCtx.globalAlpha = c.opacity;
        overlayCtx.translate(c.x, c.y);
        overlayCtx.rotate(c.rotation);
        overlayCtx.fillStyle = c.color;
        overlayCtx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        overlayCtx.restore();
      });
    };

    let celebrationNotifiedRef = false;

    const animate = () => {
      if (disposedRef.current) return;
      frameRef.current++;

      const t = frameRef.current * 0.0045;
      cakePivot.rotation.y = t;
      cakePivot.rotation.x = Math.sin(frameRef.current * 0.008) * 0.038;

      candlesRef.current.forEach((candle, idx) => {
        const fg = flamesRef.current[idx];
        const pl = pointLightsRef.current[idx];
        if (!fg || !pl) return;
        const alive = candle.lit;
        fg.visible = alive;
        pl.visible = alive;
        if (alive) {
          const fk = 0.88 + Math.sin(frameRef.current * 0.18 + idx * 2.4) * 0.12;
          fg.scale.set(fk * 1.04, fk, fk * 1.04);
          pl.intensity = 0.4 + fk * 0.35;
        }
      });

      renderer.render(scene, camera);

      const w = overlay.offsetWidth;
      const h = overlay.offsetHeight;
      overlayCtx.clearRect(0, 0, w, h);
      drawBackgroundStars(w, h);
      updateConfetti();
      drawConfetti();

      const litCount = candlesRef.current.filter((c) => c.lit).length;

      if (litCount === 0 && !extinguishingRef.current) {
        extinguishingRef.current = true;
        setAllExtinguished(true);
        setTimeout(() => {
          spawnConfetti();
          playConfettiBurstSound();
          if (!celebrationNotifiedRef) {
            celebrationNotifiedRef = true;
            onCandlesBlown?.();
          }
          setShowSuccess(true);
        }, 680);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      disposedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeThree);
      window.removeEventListener('resize', resizeOverlay);
      flamesRef.current = [];
      pointLightsRef.current = [];
      cakePivotRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
        rendererRef.current = null;
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) {
            m.forEach((mat) => mat.dispose());
          } else {
            m.dispose();
          }
        }
      });
    };
  }, [onCandlesBlown]);

  const spawnConfetti = () => {
    const overlay = canvasRef.current;
    if (!overlay) return;
    const w = overlay.offsetWidth;
    const h = overlay.offsetHeight;
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
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtor();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const src = audioCtx.createMediaStreamSource(stream);
      src.connect(analyser);
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
    <section className="scene-section relative flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <div ref={threeMountRef} className="absolute inset-0 z-0" aria-hidden />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-[1] w-full h-full"
        aria-label="Stars and confetti"
      />

      <div className="cinematic-overlay absolute inset-0 pointer-events-none z-[2]" />

      <div className="relative z-20 flex min-h-screen w-full flex-col px-4 text-center">
        <h1 className="shrink-0 px-2 pt-8 font-script text-5xl leading-tight text-gradient-rose glow-text-rose md:pt-12 md:text-7xl lg:text-8xl">
          Make a wish, Nushie...
        </h1>
        {!showSuccess && (
          <p className="mt-4 shrink-0 text-sm opacity-85" style={{ color: 'var(--muted-foreground)' }}>
            blow out the candles Nush
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
                  <div className="h-2 overflow-hidden rounded-full shadow-inner" style={{ background: 'rgba(232,160,191,0.15)' }}>
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
