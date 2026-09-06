'use client';

/**
 * Composition root.
 *
 * The 3D world is loaded client-side only — it has no server-renderable
 * representation — but the noscript/fallback path still needs to carry the
 * actual content, so an accessible outline of the whole portfolio is rendered
 * underneath and hidden from sighted users once the canvas is up.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Cursor } from '@/components/ui/Cursor';
import { Hud } from '@/components/ui/Hud';
import { Loader } from '@/components/ui/Loader';
import { ReadingPanel } from '@/components/ui/ReadingPanel';
import { TouchControls } from '@/components/ui/TouchControls';
import { TextOutline } from '@/components/ui/TextOutline';
import { installDevBridge } from '@/lib/devBridge';
import { useWorld } from '@/lib/store';

const Experience = dynamic(() => import('@/components/experience/Experience').then((m) => m.Experience), {
  ssr: false,
});

export default function Page() {
  const phase = useWorld((s) => s.phase);
  const setReducedMotion = useWorld((s) => s.setReducedMotion);
  const setIsTouch = useWorld((s) => s.setIsTouch);
  const [quality, setQuality] = useState<'high' | 'low'>('high');

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(motionQuery.matches);
    apply();
    motionQuery.addEventListener('change', apply);

    const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    setIsTouch(touch);

    /* Quality is chosen from the device rather than measured, so the first
       frame is already correct. Touch devices and low core counts get the
       cheaper pipeline. */
    const cores = navigator.hardwareConcurrency ?? 4;
    setQuality(touch || cores <= 4 || window.innerWidth < 720 ? 'low' : 'high');

    void installDevBridge();

    return () => motionQuery.removeEventListener('change', apply);
  }, [setReducedMotion, setIsTouch]);

  const worldMounted = phase !== 'drawing';

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-paper">
      {worldMounted && <Experience quality={quality} />}
      <Hud />
      <TouchControls />
      <ReadingPanel />
      <Cursor />
      <Loader />
      <TextOutline />
    </main>
  );
}
