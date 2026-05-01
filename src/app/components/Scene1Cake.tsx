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
  const flamesRef = useRef<THREE.Mesh[]>([]);
  const flameLightsRef = useRef<THREE.PointLight[]>([]);

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

  // smoke data lives outside React state so the animate loop can mutate it freely
  const smokeDataRef = useRef<{ life: number; speed: number; ox: number; oz: number }[]>([]);
  const smokeRef = useRef<THREE.Points | null>(null);
  const blownRef = useRef(false); // mirrors allExtinguished for the animation loop

  const CANDLE_COUNT = 5;

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

    // ─── Scene / camera / renderer ────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0010);
    scene.fog = new THREE.FogExp2(0x100008, 0.08);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 2.2, 5);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ─── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x331122, 0.6));
    const keyLight = new THREE.PointLight(0xff5577, 2, 20);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);
    const rim = new THREE.PointLight(0xff88aa, 1.2, 15);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    // ─── Cake group ───────────────────────────────────────────────────────────
    const cake = new THREE.Group();
    cakePivotRef.current = cake;

    // Plate
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a0510, metalness: 0.6, roughness: 0.3 }),
    );
    cake.add(plate);

    // Tier 1
    const tier1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.7, 64),
      new THREE.MeshStandardMaterial({ color: 0x6b1530, roughness: 0.7 }),
    );
    tier1.position.y = 0.4;
    cake.add(tier1);

    const frosting1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.12, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.5 }),
    );
    frosting1.rotation.x = Math.PI / 2;
    frosting1.position.y = 0.78;
    cake.add(frosting1);

    // Tier 2
    const tier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.6, 64),
      new THREE.MeshStandardMaterial({ color: 0x8b1a3a, roughness: 0.7 }),
    );
    tier2.position.y = 1.1;
    cake.add(tier2);

    const frosting2 = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.1, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.5 }),
    );
    frosting2.rotation.x = Math.PI / 2;
    frosting2.position.y = 1.42;
    cake.add(frosting2);

    // Drip decorations
    for (let i = 0; i < 12; i++) {
      const drip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.02, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.4 }),
      );
      const a = (i / 12) * Math.PI * 2;
      drip.position.set(Math.cos(a) * 1, 1.28, Math.sin(a) * 1);
      cake.add(drip);
    }

    // ─── Candles + flames ─────────────────────────────────────────────────────
    const flames: THREE.Mesh[] = [];
    const flameLights: THREE.PointLight[] = [];

    for (let i = 0; i < CANDLE_COUNT; i++) {
      const a = (i / CANDLE_COUNT) * Math.PI * 2;
      const r = 0.55;

      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16),
        new THREE.MeshStandardMaterial({
          color: CANDLE_HEX[i % CANDLE_HEX.length],
          roughness: 0.4,
        }),
      );
      candle.position.set(Math.cos(a) * r, 1.6, Math.sin(a) * r);
      cake.add(candle);

      const wick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 }),
      );
      wick.position.set(Math.cos(a) * r, 1.83, Math.sin(a) * r);
      cake.add(wick);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.95 }),
      );
      flame.scale.set(1, 1.6, 1);
      flame.position.set(Math.cos(a) * r, 1.92, Math.sin(a) * r);
      cake.add(flame);
      flames.push(flame);

      const flameLight = new THREE.PointLight(0xffaa55, 1, 3);
      flameLight.position.copy(flame.position);
      scene.add(flameLight);
      flameLights.push(flameLight);
    }

    scene.add(cake);
    flamesRef.current = flames;
    flameLightsRef.current = flameLights;

    // ─── Smoke particle system (activates after blow) ─────────────────────────
    const smokeCount = 60;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeData: { life: number; speed: number; ox: number; oz: number }[] = [];

    for (let i = 0; i < smokeCount; i++) {
      const ci = i % CANDLE_COUNT;
      const a = (ci / CANDLE_COUNT) * Math.PI * 2;
      const r = 0.55;
      smokePos[i * 3]     = Math.cos(a) * r;
      smokePos[i * 3 + 1] = 1.92;
      smokePos[i * 3 + 2] = Math.sin(a) * r;
      smokeData.push({
        life:  -Math.random() * 2,
        speed:  0.4 + Math.random() * 0.4,
        ox:     Math.cos(a) * r,
        oz:     Math.sin(a) * r,
      });
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smoke = new THREE.Points(
      smokeGeo,
      new THREE.PointsMaterial({
        color: 0xc8c0c4,
        size: 0.18,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    scene.add(smoke);
    smokeRef.current = smoke;
    smokeDataRef.current = smokeData;

    // ─── Floating ambient particles ───────────────────────────────────────────
    const particleCount = 80;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeom,
      new THREE.PointsMaterial({ color: 0xffb6c1, size: 0.04, transparent: true, opacity: 0.6 }),
    );
    scene.add(particles);

    // ─── Canvas overlay helpers ───────────────────────────────────────────────
    const resizeThree = () => {
      const w = mount.clientWidth;
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeOverlay = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      overlay.width  = overlay.offsetWidth  * dpr;
      overlay.height = overlay.offsetHeight * dpr;
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
      confettiRef.current = confettiRef.current.filter((c) => {
        c.x  += c.vx;
        c.y  += c.vy;
        c.vy += 0.15;
        c.vx *= 0.99;
        c.rotation += c.rotationSpeed;
        c.life++;
        c.opacity = Math.max(0, 1 - c.life / c.maxLife);
        return c.life < c.maxLife && c.y < overlay.offsetHeight + 20 && c.opacity > 0;
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

    // ─── Animation loop ───────────────────────────────────────────────────────
    let last = performance.now();
    let celebrationNotified = false;

    const animate = () => {
      if (disposedRef.current) return;
      frameRef.current++;

      const now = performance.now();
      const dt  = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // Gentle cake sway
      cake.rotation.y = Math.sin(t * 0.3) * 0.1;

      // Flame flicker & smoke
      flames.forEach((f, i) => {
        if (!f.visible) return;
        f.scale.y = 1.6 + Math.sin(t * 8 + i) * 0.15;
        f.scale.x = 1   + Math.sin(t * 12 + i) * 0.05;
        (f.material as THREE.MeshBasicMaterial).opacity = 0.85 + Math.sin(t * 10 + i) * 0.1;
        const pl = flameLights[i];
        if (pl) pl.intensity = 1 + Math.sin(t * 14 + i) * 0.2;
      });

      // Sync candle data → flame visibility
      candlesRef.current.forEach((candle, idx) => {
        const f  = flames[idx];
        const pl = flameLights[idx];
        if (!f || !pl) return;
        f.visible  = candle.lit;
        pl.visible = candle.lit;
      });

      // Smoke (post-blow)
      const sMat = smoke.material as THREE.PointsMaterial;
      const sPos = smoke.geometry.attributes.position as THREE.BufferAttribute;
      if (blownRef.current) {
        sMat.opacity = Math.min(0.55, sMat.opacity + dt * 0.6);
        for (let i = 0; i < smokeCount; i++) {
          const d = smokeDataRef.current[i];
          d.life += dt;
          if (d.life < 0) continue;
          const y = 1.92 + d.life * d.speed;
          if (y > 5) {
            d.life = -Math.random() * 1.5;
            sPos.array[i * 3]     = d.ox;
            sPos.array[i * 3 + 1] = 1.92;
            sPos.array[i * 3 + 2] = d.oz;
          } else {
            sPos.array[i * 3]     = d.ox + Math.sin(t * 1.5 + i) * 0.1 * d.life;
            sPos.array[i * 3 + 1] = y;
            sPos.array[i * 3 + 2] = d.oz + Math.cos(t * 1.3 + i) * 0.1 * d.life;
          }
        }
        sPos.needsUpdate = true;
      }

      // Ambient floating particles drift upward
      const posAttr = particles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3 + 1] += 0.005;
        if (posAttr.array[i * 3 + 1] > 6) posAttr.array[i * 3 + 1] = 0;
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);

      // Canvas overlay
      const w = overlay.offsetWidth;
      const h = overlay.offsetHeight;
      overlayCtx.clearRect(0, 0, w, h);
      drawBackgroundStars(w, h);
      updateConfetti();
      drawConfetti();

      // Check all-extinguished
      const litCount = candlesRef.current.filter((c) => c.lit).length;
      if (litCount === 0 && !extinguishingRef.current) {
        extinguishingRef.current = true;
        blownRef.current = true;
        setAllExtinguished(true);
        setTimeout(() => {
          spawnConfetti();
          playConfettiBurstSound();
          if (!celebrationNotified) {
            celebrationNotified = true;
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
      flamesRef.current    = [];
      flameLightsRef.current = [];
      cakePivotRef.current = null;
      sceneRef.current     = null;
      cameraRef.current    = null;
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
          if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
          else m.dispose();
        }
      });
    };
  }, [onCandlesBlown]);

  // ─── Confetti spawn ──────────────────────────────────────────────────────────
  const spawnConfetti = () => {
    const ol = canvasRef.current;
    if (!ol) return;
    const w = ol.offsetWidth;
    const h = ol.offsetHeight;
    for (let i = 0; i < 180; i++) {
      confettiRef.current.push({
        x:             w / 2 + (Math.random() - 0.5) * w * 0.6,
        y:             h * 0.3 + Math.random() * h * 0.2,
        vx:            (Math.random() - 0.5) * 8,
        vy:            -6 - Math.random() * 8,
        color:         CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size:          6 + Math.random() * 8,
        rotation:      Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity:       1,
        life:          0,
        maxLife:       120 + Math.random() * 80,
      });
    }
  };

  // ─── SFX ─────────────────────────────────────────────────────────────────────
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
    const duration   = 0.45;
    const sampleRate = ctx.sampleRate;
    const buffer     = ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data       = buffer.getChannelData(0);
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
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'square';
      const base  = 520 + Math.random() * 1600;
      const start = now + i * 0.012;
      const end   = start + 0.08 + Math.random() * 0.08;
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

  // ─── Candle extinguish ───────────────────────────────────────────────────────
  const extinguishCandles = useCallback(() => {
    if (extinguishingRef.current) return;
    playWooshSound();
    const candles    = candlesRef.current;
    const litCandles = candles.filter((c) => c.lit);
    litCandles.forEach((candle, i) => {
      setTimeout(() => {
        candle.extinguishing = true;
        setTimeout(() => {
          candle.lit           = false;
          candle.extinguishing = false;
        }, 600);
      }, i * 120);
    });
  }, []);

  // ─── Mic ──────────────────────────────────────────────────────────────────────
  const enableMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx  = new AudioCtor();
      audioCtxRef.current  = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current  = analyser;
      analyser.fftSize     = 256;
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

  // ─── Render ───────────────────────────────────────────────────────────────────
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
