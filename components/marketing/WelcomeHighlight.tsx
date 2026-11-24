"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";

const DIM = "rgba(255, 255, 255, 0.28)";
const LIT = "rgba(255, 255, 255, 1)";
const DURATION = 5;

const TEXT =
  "“The International Competition for Research, Innovation & Value Excellence (I-CRIVE 2027), organised by the Research & Innovation Section, UniKL MIIT, brings together undergraduate innovators and postgraduate researchers from around the world to showcase creative ideas, share research discoveries and develop impactful solutions to real-world challenges.”";

const WORDS = TEXT.split(/\s+/).filter(Boolean);

function HighlightWord({
  word,
  trailingSpace,
  progress,
  start,
  end,
}: {
  word: string;
  trailingSpace: boolean;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const color = useTransform(progress, [start, end], [DIM, LIT]);

  return (
    <motion.span style={{ color }}>
      {word}
      {trailingSpace ? " " : ""}
    </motion.span>
  );
}

export function WelcomeHighlight({ className }: { className?: string }) {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const progress = useMotionValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (reduced) {
      progress.set(1);
      return;
    }
    if (reduced === null) return;

    let controls: { stop: () => void } | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || controls) return;
        controls = animate(progress, 1, { duration: DURATION, ease: "linear" });
        observer.disconnect();
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      controls?.stop();
    };
  }, [progress, reduced]);

  return (
    <p ref={rootRef} className={className}>
      {WORDS.map((word, index) => (
        <HighlightWord
          key={`${word}-${index}`}
          word={word}
          trailingSpace={index < WORDS.length - 1}
          progress={progress}
          start={index / WORDS.length}
          end={(index + 1) / WORDS.length}
        />
      ))}
    </p>
  );
}
