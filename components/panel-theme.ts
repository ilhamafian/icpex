import type { CSSProperties } from "react";

/**
 * Colour tokens shared by the participant panel and every staff role.
 * Muted and accent are a step deeper than the canvas so tables, tabs, and
 * hovers stay visible on the light content area.
 */
export const panelThemeVars = {
  "--background": "#e7eef5",
  "--foreground": "#10243c",
  "--card": "#ffffff",
  "--card-foreground": "#10243c",
  "--popover": "#ffffff",
  "--popover-foreground": "#10243c",
  "--primary": "#d6a11e",
  "--primary-foreground": "#1a1408",
  "--muted": "#dce6f0",
  "--muted-foreground": "#5c6e82",
  "--accent": "#dce6f0",
  "--accent-foreground": "#10243c",
  "--border": "#d5e1ec",
  "--input": "#ffffff",
  "--ring": "#c4922a",
  "--sidebar": "#0e243c",
  "--sidebar-foreground": "#ffffff",
  "--sidebar-primary": "#e8b84a",
  "--sidebar-primary-foreground": "#1a1408",
  "--sidebar-accent": "#1a3d62",
  "--sidebar-accent-foreground": "#e8b84a",
  "--sidebar-border": "rgb(255 255 255 / 0.12)",
  "--sidebar-ring": "#e8b84a",
} as const;

export const panelThemeStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
  ...panelThemeVars,
} as CSSProperties;
