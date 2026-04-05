/**
 * Theme resolution helpers shared by editor, player, and preview.
 *
 * Import these wherever effective token resolution is needed so the logic
 * lives in exactly one place.
 */

import { THEME_TOKEN_DEFAULTS } from "./themeSchema.js";

/**
 * Resolve the effective token set for a slide.
 *
 * Resolution order:
 *   1. If slide has themeOverride.enabled === true and non-empty tokens,
 *      merge those tokens on top of the tutorial-level theme tokens.
 *   2. Otherwise, use the tutorial-level theme tokens (or built-in defaults).
 *
 * This mirrors the backend logic in gots_resolve_tutorial_theme() +
 * gots_get_builtin_fallback_theme() — keep the two in sync.
 *
 * @param {object|null} tutorialThemeTokens  config_json from the resolved tutorial theme (may be null/undefined)
 * @param {object|null} slideThemeOverride   slide.themeOverride (may be null/undefined)
 * @returns {object}  Fully resolved token object — always non-null.
 */
export function resolveEffectiveTokens(tutorialThemeTokens, slideThemeOverride) {
  // Base: tutorial theme tokens or built-in defaults if no theme is assigned/loaded
  const base = (tutorialThemeTokens && typeof tutorialThemeTokens === "object")
    ? { ...THEME_TOKEN_DEFAULTS, ...tutorialThemeTokens }
    : { ...THEME_TOKEN_DEFAULTS };

  // Apply slide override if enabled and non-empty
  if (
    slideThemeOverride &&
    slideThemeOverride.enabled === true &&
    slideThemeOverride.tokens &&
    typeof slideThemeOverride.tokens === "object" &&
    Object.keys(slideThemeOverride.tokens).length > 0
  ) {
    return { ...base, ...slideThemeOverride.tokens };
  }

  return base;
}

/**
 * Map resolved theme tokens to an inline style object for the outer playback
 * shell (the background area surrounding the content card).
 *
 * Scope boundary: these styles apply ONLY to the outer wrapper/shell element.
 * The inner white content card and its panes must remain visually stable and
 * must NOT receive these styles.
 *
 * @param {object} tokens  Resolved tokens from resolveEffectiveTokens().
 * @returns {object}  React inline style object.
 */
export function tokensToShellStyle(tokens) {
  return {
    backgroundColor: tokens.backgroundColor || "#f3f4f6",
    fontFamily:      tokens.fontFamily      || "Arial",
  };
}

/**
 * Map resolved tokens to a style object for primary action buttons.
 *
 * @param {object} tokens
 * @returns {object}
 */
export function tokensToButtonStyle(tokens) {
  const primaryColor = tokens.primaryColor || "#7B2D26";

  if (tokens.buttonStyle === "outline") {
    return {
      backgroundColor: "transparent",
      color:           primaryColor,
      border:          `2px solid ${primaryColor}`,
    };
  }

  // filled (default)
  return {
    backgroundColor: primaryColor,
    color:           "#ffffff",
    border:          "none",
  };
}

/**
 * Map resolved tokens to a style object for the progress bar fill.
 *
 * @param {object} tokens
 * @returns {object}
 */
export function tokensToProgressBarStyle(tokens) {
  return {
    backgroundColor: tokens.primaryColor || "#7B2D26",
  };
}

// The system default left-pane ratio when no tutorial or slide value is configured.
// Matches the previous hardcoded "30% 70%" split in StudentApp.jsx.
export const LAYOUT_DEFAULT_LEFT_RATIO = 30;
export const LAYOUT_MIN_LEFT_RATIO = 10;
export const LAYOUT_MAX_LEFT_RATIO = 50;

/**
 * Resolve the effective left-pane width percentage for a slide.
 *
 * Resolution order (mirrors resolveEffectiveTokens):
 *   1. Slide layoutOverride if enabled and value is in valid range (10–50)
 *   2. Tutorial-wide layoutSettings if value is in valid range (10–50)
 *   3. System default (LAYOUT_DEFAULT_LEFT_RATIO)
 *
 * Always returns an integer in [10, 50].
 *
 * @param {object|null} tutorialLayoutSettings  e.g. { leftPaneRatio: 35 } from tutorial API
 * @param {object|null} slideLayoutOverride     e.g. { enabled: true, leftPaneRatio: 40 } from slide
 * @returns {number}
 */
export function resolveEffectivePaneRatio(tutorialLayoutSettings, slideLayoutOverride) {
  // 1. Slide-level override takes highest priority
  if (
    slideLayoutOverride &&
    slideLayoutOverride.enabled === true &&
    typeof slideLayoutOverride.leftPaneRatio === "number"
  ) {
    const r = slideLayoutOverride.leftPaneRatio;
    if (r >= 10 && r <= 50) return r;
  }

  // 2. Tutorial-wide setting
  if (
    tutorialLayoutSettings &&
    typeof tutorialLayoutSettings.leftPaneRatio === "number"
  ) {
    const r = tutorialLayoutSettings.leftPaneRatio;
    if (r >= 10 && r <= 50) return r;
  }

  // 3. System default
  return LAYOUT_DEFAULT_LEFT_RATIO;
}
