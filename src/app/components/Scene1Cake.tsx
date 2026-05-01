import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useExperience } from "@/store/experience";
import { Confetti } from "./Confetti";

export function CakeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const flamesRef = useRef<THREE.Mesh[]>([]);
  const flameLightsRef = useRef<THREE.PointLight[]>([]);
  const smokeRef = useRef<THREE.Points | null>(null);
  const flickerRef = useRef(0);
  const blownRef = useRef(false);
  const extinguishingRef = useRef(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const sfxCtxRef = useRef<AudioContext | null>(null);
  const blowTimerRef = useRef(0);
  const blowActiveRef = useRef(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micError, setMicError] = useState(false);
  const [blowing, setBlowing] = useState(false);
  const [blowProgress, setBlowProgress] = useState(0);
  const [allExtinguished, setAllExtinguished] = useState(false);

  const setScene = useExperience((s) => s.setScene);

  // ---------- 3D scene (unchanged cake) ----------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x100008, 0.08);

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 2.2, 5);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x331122, 0.6));
    const keyLight = new THREE.PointLight(0xff5577, 2, 20);
    keyLight.position.set(2, 4, 3);
    scene.add(keyLight);
    const rim = new THREE.PointLight(0xff88aa, 1.2, 15);
    rim.position.set(-3, 2, -2);
    scene.add(rim);

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 0.08, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a0510, metalness: 0.6, roughness: 0.3 })
    );
    scene.add(plate);

    const cake = new THREE.Group();
    const tier1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.7, 64),
      new THREE.MeshStandardMaterial({ color: 0x6b1530, roughness: 0.7 })
    );
    tier1.position.y = 0.4;
    cake.add(tier1);

    const frosting1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.12, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.5 })
    );
    frosting1.rotation.x = Math.PI / 2;
    frosting1.position.y = 0.78;
    cake.add(frosting1);

    const tier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.6, 64),
      new THREE.MeshStandardMaterial({ color: 0x8b1a3a, roughness: 0.7 })
    );
    tier2.position.y = 1.1;
    cake.add(tier2);

    const frosting2 = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.1, 16, 64),
      new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.5 })
    );
    frosting2.rotation.x = Math.PI / 2;
    frosting2.position.y = 1.42;
    cake.add(frosting2);

    for (let i = 0; i < 12; i++) {
      const drip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.02, 0.25, 8),
        new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.4 })
      );
      const a = (i / 12) * Math.PI * 2;
      drip.position.set(Math.cos(a) * 1, 1.28, Math.sin(a) * 1);
      cake.add(drip);
    }

    const flames: THREE.Mesh[] = [];
    const flameLights: THREE.PointLight[] = [];
    const candleCount = 5;
    for (let i = 0; i < candleCount; i++) {
      const a = (i / candleCount) * Math.PI * 2;
      const r = 0.55;
      const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.4 })
      );
      candle.position.set(Math.cos(a) * r, 1.6, Math.sin(a) * r);
      cake.add(candle);

      const wick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.06, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      wick.position.set(Math.cos(a) * r, 1.83, Math.sin(a) * r);
      cake.add(wick);

      const flame = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.95 })
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

    const smokeCount = 60;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    const smokeData: { life: number; speed: number; ox: number; oz: number }[] = [];
    for (let i = 0; i < smokeCount; i++) {
      const ci = i % candleCount;
      const a = (ci / candleCount) * Math.PI * 2;
      const r = 0.55;
      smokePos[i * 3] = Math.cos(a) * r;
      smokePos[i * 3 + 1] = 1.92;
      smokePos[i * 3 + 2] = Math.sin(a) * r;
      smokeData.push({
        life: -Math.random() * 2,
        speed: 0.4 + Math.random() * 0.4,
        ox: Math.cos(a) * r,
        oz: Math.sin(a) * r,
      });
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
    const smoke = new THREE.Points(
      smokeGeo,
      new THREE.PointsMaterial({
        color: 0xc8c0c4,
        size: 0.18,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    scene.add(smoke);
    smokeRef.current = smoke;

    const particleCount = 80;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeom,
      new THREE.PointsMaterial({ color: 0xffb6c1, size: 0.04, transparent: true, opacity: 0.6 })
    );
    scene.add(particles);

    let raf = 0;
    let last = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const flicker = flickerRef.current;
      flames.forEach((f, i) => {
        if (!f.visible) return;
        const wobble = (1 + flicker * 3) * 0.15;
        f.scale.y = 1.6 + Math.sin(t * (8 + flicker * 20) + i) * wobble;
        f.scale.x = 1 + Math.sin(t * 12 + i) * (0.05 + flicker * 0.3);
        f.position.x =
          Math.cos((i / flames.length) * Math.PI * 2) * 0.55 +
          Math.sin(t * 9 + i) * flicker * 0.05;
        const mat = f.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.85 + Math.sin(t * 10 + i) * (0.1 + flicker * 0.2);
        const light = flameLights[i];
        if (light) light.intensity = 1 + flicker * 0.8 + Math.sin(t * 14 + i) * 0.2;
      });

      const sMat = smoke.material as THREE.PointsMaterial;
      const sPos = smoke.geometry.attributes.position as THREE.BufferAttribute;
      if (blownRef.current) {
        sMat.opacity = Math.min(0.55, sMat.opacity + dt * 0.6);
        for (let i = 0; i < smokeCount; i++) {
          const d = smokeData[i];
          d.life += dt;
          if (d.life < 0) continue;
          const y = 1.92 + d.life * d.speed;
          if (y > 5) {
            d.life = -Math.random() * 1.5;
            sPos.array[i * 3] = d.ox;
            sPos.array[i * 3 + 1] = 1.92;
            sPos.array[i * 3 + 2] = d.oz;
          } else {
            sPos.array[i * 3] = d.ox + Math.sin(t * 1.5 + i) * 0.1 * d.life;
            sPos.array[i * 3 + 1] = y;
            sPos.array[i * 3 + 2] = d.oz + Math.cos(t * 1.3 + i) * 0.1 * d.life;
          }
        }
        sPos.needsUpdate = true;
      }

      const posAttr = particles.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        posAttr.array[i * 3 + 1] += 0.005;
        if (posAttr.array[i * 3 + 1] > 6) posAttr.array[i * 3 + 1] = 0;
      }
      posAttr.needsUpdate = true;
      cake.rotation.y = Math.sin(t * 0.3) * 0.1;

      flickerRef.current = Math.max(0, flickerRef.current - dt * 1.2);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  // ---------- SFX ----------
  const getSfxContext = () => {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!sfxCtxRef.current) sfxCtxRef.current = new AudioCtx();
    return sfxCtxRef.current;
  };

  const playWooshSound = () => {
    const ctx = getSfxContext();
    if (!ctx) return;
    const duration = 0.45;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.65;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
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
    for (let i = 0; i < 16; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? "triangle" : "square";
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

  // ---------- Extinguish ----------
  const extinguishCandles = useCallback(() => {
    if (extinguishingRef.current) return;
    extinguishingRef.current = true;
    blownRef.current = true;
    playWooshSound();

    const flames = flamesRef.current;
    flames.forEach((f, i) => {
      setTimeout(() => {
        f.visible = false;
        const light = flameLightsRef.current[i];
        if (light) light.intensity = 0;
        if (i === flames.length - 1) {
          setAllExtinguished(true);
          setTimeout(() => {
            setConfetti(true);
            playConfettiBurstSound();
            setShowSuccess(true);
          }, 800);
        }
      }, i * 120);
    });
  }, []);

  // ---------- Mic ----------
  const enableMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      setMicEnabled(true);
      setMicError(false);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const checkBlow = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        flickerRef.current = Math.min(1, avg * 2.2);
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

  const handleContinue = () => setScene("rose");

  return (
    <section
      className="scene-section relative flex flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: "100vh", background: "var(--background)" }}
    >
      <div ref={mountRef} className="absolute inset-0" />
      {confetti && <Confetti />}

      {/* Cinematic overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-transparent via-transparent to-black/60" />

      <div className="relative z-20 flex min-h-screen w-full flex-col px-4 text-center">
        <h1 className="shrink-0 pt-8 md:pt-12 cursive text-5xl md:text-7xl lg:text-8xl leading-tight text-glow text-secondary px-2">
          Make a wish, Nushie...
        </h1>

        {!showSuccess && (
          <p className="mt-4 shrink-0 text-sm opacity-85 text-pink-soft">
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
                  className="mx-auto mb-4 max-w-sm rounded-full px-6 py-3 text-sm font-semibold transition hover:opacity-95"
                  style={{
                    background: "rgba(194,24,91,0.25)",
                    border: "1px solid rgba(232,160,191,0.45)",
                    color: "#fff",
                  }}
                >
                  Microphone blocked — tap to allow
                </button>
              )}

              {micEnabled && !allExtinguished && (
                <div className="mx-auto w-full max-w-xs pb-2">
                  <div
                    className="h-2 rounded-full overflow-hidden shadow-inner"
                    style={{ background: "rgba(232,160,191,0.15)" }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-100 ease-out"
                      style={{
                        width: `${blowProgress}%`,
                        background: "linear-gradient(90deg, hsl(var(--primary)), #ffd700)",
                        boxShadow: "0 0 12px rgba(255,215,0,0.35)",
                      }}
                    />
                  </div>
                </div>
              )}

              {blowing && !allExtinguished && (
                <p className="mx-auto pb-3 text-sm font-medium" style={{ color: "rgba(232,160,191,0.95)" }}>
                  Keep blowing…
                </p>
              )}

              {!allExtinguished && (
                <button
                  type="button"
                  onClick={extinguishCandles}
                  className="mx-auto mt-2 px-6 py-3 rounded-full border border-rose/40 text-secondary hover:bg-primary/30 transition-all hover:scale-[1.03] active:scale-95 text-sm md:text-base"
                >
                  Blow candles 💨
                </button>
              )}
            </>
          )}

          {showSuccess && (
            <div className="flex flex-col items-center gap-5 animate-fade-in">
              <div className="cursive text-2xl md:text-3xl text-glow text-secondary">
                ✨ Your wish is written in the stars ✨
              </div>
              <button
                type="button"
                onClick={handleContinue}
                className="relative overflow-hidden rounded-full px-8 py-3.5 text-sm font-semibold transition-all duration-500 hover:scale-105"
                style={{
                  background: "rgba(194,24,91,0.18)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: "1px solid rgba(232,160,191,0.5)",
                  color: "#fff",
                  boxShadow: "0 4px 32px rgba(194,24,91,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
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
