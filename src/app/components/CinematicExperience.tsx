'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CursorGlow from './CursorGlow';
import MusicToggle from './MusicToggle';
import Scene1Cake from './Scene1Cake';
import Scene2Rose from './Scene2Rose';
import Scene3BirthdayReveal from './Scene3BirthdayReveal';
import Scene4TreeOfLove from './Scene4TreeOfLove';
import Scene5Memories from './Scene5Memories';
import Scene6LoveNotes from './Scene6LoveNotes';
import FloatingParticles from './FloatingParticles';

export default function CinematicExperience() {
  const [currentScene, setCurrentScene] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [openedMemories, setOpenedMemories] = useState<Set<number>>(new Set());
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [transitionActive, setTransitionActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const candlesBlownMusicStartedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0;
    audio.src = '/assets/audio/bgaudio.mp3';
    audioRef.current = audio;
    return () => {
      audio.pause();
    };
  }, []);

  const startMusicAfterCandlesBlown = useCallback(() => {
    if (candlesBlownMusicStartedRef.current) return;
    candlesBlownMusicStartedRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => {});
    setIsMusicPlaying(true);
    if (audio.volume >= 0.24) return;
    audio.volume = 0;
    const fadeIn = setInterval(() => {
      if (audio.volume < 0.28) {
        audio.volume = Math.min(0.3, audio.volume + 0.03);
      } else {
        clearInterval(fadeIn);
      }
    }, 80);
  }, []);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMusicPlaying) {
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.05) {
          audio.volume = Math.max(0, audio.volume - 0.05);
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeOut);
        }
      }, 80);
    } else {
      audio.volume = 0;
      audio.play().catch(() => {});
      const fadeIn = setInterval(() => {
        if (audio.volume < 0.28) {
          audio.volume = Math.min(0.3, audio.volume + 0.03);
        } else {
          clearInterval(fadeIn);
        }
      }, 80);
    }
    setIsMusicPlaying((prev) => !prev);
  }, [isMusicPlaying]);

  const goToScene = useCallback((scene: number) => {
    setTransitionActive(true);
    setTimeout(() => {
      setCurrentScene(scene);
      setTransitionActive(false);
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 600);
  }, []);

  const handleMemoryOpen = useCallback((id: number) => {
    setOpenedMemories((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (next.size >= 3) {
        setTimeout(() => setSecretUnlocked(true), 1200);
      }
      return next;
    });
  }, []);

  const scenes = [
    <Scene1Cake key="cake" onCandlesBlown={startMusicAfterCandlesBlown} onComplete={() => goToScene(1)} />,
    <Scene2Rose key="rose" onComplete={() => goToScene(2)} />,
    <Scene3BirthdayReveal key="reveal" onComplete={() => goToScene(3)} />,
    <Scene4TreeOfLove key="tree" onComplete={() => goToScene(4)} />,
    <Scene5Memories
      key="memories"
      openedMemories={openedMemories}
      onMemoryOpen={handleMemoryOpen}
      onComplete={() => goToScene(5)}
    />,
    <Scene6LoveNotes
      key="notes"
      secretUnlocked={secretUnlocked}
      openedMemories={openedMemories}
    />,
  ];

  return (
    <div ref={containerRef} className="relative w-full min-h-screen overflow-x-hidden" style={{ background: 'var(--background)' }}>
      <CursorGlow />
      <MusicToggle isPlaying={isMusicPlaying} onToggle={toggleMusic} />
      <FloatingParticles />

      {/* Scene Navigation Dots */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {scenes.map((_, i) => (
          <button
            key={i}
            onClick={() => goToScene(i)}
            aria-label={`Go to scene ${i + 1}`}
            className="w-2 h-2 rounded-full transition-all duration-300 focus:outline-none"
            style={{
              background: currentScene === i ? 'var(--primary)' : 'rgba(232,160,191,0.3)',
              transform: currentScene === i ? 'scale(1.5)' : 'scale(1)',
              boxShadow: currentScene === i ? '0 0 8px var(--primary)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Scene Transition Overlay */}
      <div
        className="fixed inset-0 z-40 pointer-events-none transition-opacity duration-600"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(194,24,91,0.3) 0%, rgba(10,0,8,1) 70%)',
          opacity: transitionActive ? 1 : 0,
        }}
      />

      {/* Current Scene */}
      <div
        className="scene-transition"
        style={{ opacity: transitionActive ? 0 : 1, transform: transitionActive ? 'scale(0.97)' : 'scale(1)' }}
      >
        {scenes[currentScene]}
      </div>
    </div>
  );
}
