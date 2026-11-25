"use client";

import { useEffect } from "react";

import { panelThemeVars } from "@/components/panel-theme";

/** Applies the panel palette to the document so portaled menus and sheets match. */
export function PanelTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = new Map<string, string>();

    for (const [key, value] of Object.entries(panelThemeVars)) {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, value);
    }

    return () => {
      for (const [key, value] of previous) {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      }
    };
  }, []);

  return null;
}
