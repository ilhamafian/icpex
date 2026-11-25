"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import "lenis/dist/lenis.css";

const SCROLL_OPTIONS = {
  // Lower lerp = longer, silkier catch-up after each wheel tick.
  lerp: 0.07,
  smoothWheel: true,
  // Fingers keep the browser's own momentum. Smoothing touch fights the gesture.
  syncTouch: false,
  autoRaf: true,
  allowNestedScroll: true,
  stopInertiaOnNavigate: true,
};

// Same easing family as the wheel, so section jumps glide instead of snapping.
const ANCHOR_SCROLL = { lerp: 0.06 };

export function LandingSmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={SCROLL_OPTIONS}>
      <LandingScrollLinks />
      {children}
    </ReactLenis>
  );
}

function scrollToHash(lenis: NonNullable<ReturnType<typeof useLenis>>, hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id || id === "top") {
    lenis.scrollTo(0, ANCHOR_SCROLL);
    return;
  }
  const node = document.getElementById(id);
  if (node) lenis.scrollTo(node, ANCHOR_SCROLL);
  else lenis.scrollTo(0, { immediate: true });
}

function LandingScrollLinks() {
  const lenis = useLenis();
  const pathname = usePathname();

  useEffect(() => {
    if (!lenis) return;

    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";

    const onHash = (hash: string) => scrollToHash(lenis, hash);

    const onClickCapture = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      const url = new URL(link.href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin || url.pathname !== here.pathname || !url.hash) return;

      event.preventDefault();
      if (url.hash !== here.hash) {
        window.history.pushState(null, "", url.hash);
      }
      onHash(url.hash);
    };

    const onPopState = () => {
      onHash(window.location.hash);
    };

    const syncLock = () => {
      if (document.body.hasAttribute("data-scroll-locked")) lenis.stop();
      else lenis.start();
    };

    document.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", onPopState);
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked"],
    });
    syncLock();

    return () => {
      history.scrollRestoration = previousRestoration;
      document.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", onPopState);
      observer.disconnect();
    };
  }, [lenis]);

  useEffect(() => {
    if (!lenis) return;
    const frame = requestAnimationFrame(() => {
      const hash = window.location.hash;
      if (hash) scrollToHash(lenis, hash);
      else lenis.scrollTo(0, { immediate: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [lenis, pathname]);

  return null;
}
