/**
 * Frontend theme token schema.
 *
 * Defines the allowed token keys, their UI field types, allowed values, and defaults.
 * Used to drive form fields in TutorialThemesPage and the slide override UI.
 *
 * This is NOT the authoritative validation source — that lives server-side in
 * gots_validate_theme_config() (includes/tutorial-themes.php).
 * Use this only to build forms and populate default values.
 */

/** Fonts must match GOTS_THEME_FONTS in includes/tutorial-themes.php */
export const THEME_FONTS = [
  "Georgia",
  "Times New Roman",
  "Arial",
  "Helvetica",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Palatino Linotype",
];

/** Button styles must match GOTS_THEME_BUTTON_STYLES in includes/tutorial-themes.php */
export const THEME_BUTTON_STYLES = [
  { value: "filled",  label: "Filled (solid background)" },
  { value: "outline", label: "Outline (border only)" },
];

/**
 * Default token values used when creating a new theme or initializing the
 * slide override form. These mirror gots_get_builtin_fallback_theme().
 */
export const THEME_TOKEN_DEFAULTS = {
  primaryColor:    "#7B2D26",
  backgroundColor: "#ffffff",
  textColor:       "#111827",
  fontFamily:      "Arial",
  showProgressBar: true,
  buttonStyle:     "filled",
};

/**
 * Field descriptor array — drives form rendering for both the theme editor
 * and the per-slide override panel.
 *
 * Each entry: { key, label, type, options? }
 *   type: 'color' | 'select' | 'bool'
 */
export const THEME_FIELD_DEFS = [
  {
    key:   "primaryColor",
    label: "Accent / Button Color",
    type:  "color",
  },
  {
    key:   "backgroundColor",
    label: "Slide Background",
    type:  "color",
  },
  {
    key:   "textColor",
    label: "Text Color",
    type:  "color",
  },
  {
    key:     "fontFamily",
    label:   "Font Family",
    type:    "select",
    options: THEME_FONTS.map((f) => ({ value: f, label: f })),
  },
  {
    key:     "buttonStyle",
    label:   "Button Style",
    type:    "select",
    options: THEME_BUTTON_STYLES,
  },
  {
    key:   "showProgressBar",
    label: "Show Progress Bar",
    type:  "bool",
  },
];
