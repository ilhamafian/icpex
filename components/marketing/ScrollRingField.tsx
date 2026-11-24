"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { RingField } from "@/components/ring-field";

const SECTION_SELECTOR = "[data-ring-section]";
/** A section becomes the active pose once its top crosses this share of the viewport. */
const ACTIVATION = 0.46;
const TRANSITION_MS = 900;

/** Pose behind the hero, the first landing section. */
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

/** Pose once the last landing section is active. */
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

function landingSections() {
  return Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR));
}

/** Index of the section the viewport has entered, not a continuous scroll amount. */
function activeSectionIndex(sections: HTMLElement[]) {
  const count = sections.length;
  if (count === 0) return 0;
  const marker = window.innerHeight * ACTIVATION;
  const atEnd =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atEnd) return count - 1;
  let index = 0;
  for (let i = 0; i < count; i++) {
    if (sections[i].getBoundingClientRect().top <= marker) index = i;
  }
  return index;
}

export function ScrollRingField() {
  const pathname = usePathname();
  const onLanding = pathname === "/";
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!onLanding) {
      progressRef.current = 0;
      setProgress(0);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let active = -1;

    const write = (value: number) => {
      progressRef.current = value;
      setProgress((current) => (Math.abs(current - value) < 0.001 ? current : value));
    };

    const go = (index: number, immediate: boolean) => {
      const count = landingSections().length;
      const target = count <= 1 ? 0 : index / (count - 1);
      if (index === active && !immediate) return;
      active = index;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (immediate || reduced.matches) {
        write(target);
        return;
      }
      const from = progressRef.current;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / TRANSITION_MS);
        const eased = 1 - (1 - t) ** 3;
        write(from + (target - from) * eased);
        frame = t < 1 ? requestAnimationFrame(tick) : 0;
      };
      frame = requestAnimationFrame(tick);
    };

    const sync = (immediate: boolean) => {
      const sections = landingSections();
      if (sections.length === 0) return;
      go(activeSectionIndex(sections), immediate);
    };

    sync(true);
    const onScroll = () => sync(false);
    const onPreference = () => sync(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reduced.addEventListener("change", onPreference);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduced.removeEventListener("change", onPreference);
      if (frame) cancelAnimationFrame(frame);
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
