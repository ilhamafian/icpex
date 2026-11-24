"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Fade and rise. `load` plays on the hero. `scroll` plays the first time a
 * block below the fold enters the viewport. The transform is cleared when the
 * animation ends so liquid-glass backdrop filters keep refracting the page.
 */
export function Rise({
  children,
  className,
  delay = 0,
  when = "scroll",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  when?: "load" | "scroll";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    if (when === "scroll") {
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      if (inView) return;
    }
    setActive(true);
  }, [when]);

  useEffect(() => {
    if (!active || when !== "scroll") return;
    const el = ref.current;
    if (!el) return;

    // A fast flick can jump past the element before Motion starts, which would
    // leave it at the hidden pose. Once it has cleared the top, show it.
    const revealIfPassed = () => {
      if (el.getBoundingClientRect().bottom < 64) {
        el.style.setProperty("transform", "none", "important");
        el.style.opacity = "1";
      }
    };

    revealIfPassed();
    window.addEventListener("scroll", revealIfPassed, { passive: true });
    window.addEventListener("resize", revealIfPassed);
    return () => {
      window.removeEventListener("scroll", revealIfPassed);
      window.removeEventListener("resize", revealIfPassed);
    };
  }, [active, when]);

  if (!active) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 36 }}
      animate={when === "load" ? { opacity: 1, y: 0 } : undefined}
      whileInView={when === "scroll" ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      onAnimationComplete={() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("transform", "none", "important");
        el.style.opacity = "1";
      }}
    >
      {children}
    </motion.div>
  );
}
