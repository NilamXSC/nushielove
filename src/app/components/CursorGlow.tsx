'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const onEnterInteractive = () => setIsHovering(true);
    const onLeaveInteractive = () => setIsHovering(false);

    const interactives = document.querySelectorAll('button, a, [role="button"], input');
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', onEnterInteractive);
      el.addEventListener('mouseleave', onLeaveInteractive);
    });

    window.addEventListener('mousemove', onMove);

    const animate = () => {
      if (dotRef.current) {
        dotRef.current.style.left = `${mousePos.current.x - 4}px`;
        dotRef.current.style.top = `${mousePos.current.y - 4}px`;
      }
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.12;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.left = `${ringPos.current.x - 16}px`;
        ringRef.current.style.top = `${ringPos.current.y - 16}px`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', onEnterInteractive);
        el.removeEventListener('mouseleave', onLeaveInteractive);
      });
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{
          transform: isHovering ? 'scale(2.5)' : 'scale(1)',
          background: isHovering ? 'var(--gold)' : 'var(--primary)',
        }}
      />
      <div
        ref={ringRef}
        className="cursor-ring"
        style={{
          width: isHovering ? '48px' : '32px',
          height: isHovering ? '48px' : '32px',
          borderColor: isHovering ? 'rgba(255,215,0,0.6)' : 'rgba(232,160,191,0.5)',
        }}
      />
    </>
  );
}