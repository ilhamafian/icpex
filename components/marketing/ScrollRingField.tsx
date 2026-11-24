"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { RingField } from "@/components/ring-field";

/** Pose behind the hero, before the page has moved. */
const START = {
  centerX: 0.62,
  centerY: 0,
  scale: 1.2,
  tilt: 0,
  twist: 0.4,
  morph: 0.13,
  aspect: 1,
  outerRadius: 1.3,
  rotation: 0.01,
};

/** Pose at the bottom of the landing page. */
const END = {
  centerX: -0.55,
  centerY: 0.48,
  scale: 1.75,
  tilt: 64,
  twist: 1.85,
  morph: 0.42,
  aspect: 1.6,
  outerRadius: 1.9,
  rotation: 0.07,
};

type Pose = typeof START;

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function poseAt(progress: number): Pose {
  return {
    centerX: mix(START.centerX, END.centerX, progress),
    centerY: mix(START.centerY, END.centerY, progress),
    scale: mix(START.scale, END.scale, progress),
    tilt: mix(START.tilt, END.tilt, progress),
    twist: mix(START.twist, END.twist, progress),
    morph: mix(START.morph, END.morph, progress),
    aspect: mix(START.aspect, END.aspect, progress),
    outerRadius: mix(START.outerRadius, END.outerRadius, progress),
    rotation: mix(START.rotation, END.rotation, progress),
  };
}

export function ScrollRingField() {
  const pathname = usePathname();
  const onLanding = pathname === "/";
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!onLanding) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const next = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      setProgress((current) => (Math.abs(current - next) < 0.002 ? current : next));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [onLanding]);

  const pose = onLanding ? poseAt(progress) : START;

  return (
    <RingField
      className="h-full min-h-full"
      backgroundColor="#07111d"
      colors={["#9ec8e0", "#f0d078"]}
      glow={1.05}
      intensity={1.45}
      particleSize={1.7}
      sparkle={0.16}
      interactive={false}
      {...pose}
    />
  );
}
