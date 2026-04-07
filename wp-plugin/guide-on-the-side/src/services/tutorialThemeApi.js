/**
 * Admin API for tutorial theme template management.
 * Mirrors certificateTemplateApi.js structure exactly.
 *
 * Uses gotsConfig (admin context), not gotsStudentConfig.
 */

function getConfig() {
  if (typeof window !== "undefined" && window.gotsConfig) {
    return { baseUrl: window.gotsConfig.restUrl, nonce: window.gotsConfig.nonce };
  }
  return { baseUrl: "/wp-json/gots/v1", nonce: null };
}

async function apiRequest(endpoint, options = {}) {
  const config = getConfig();
  const url = `${config.baseUrl}${endpoint}`;
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (config.nonce) headers["X-WP-Nonce"] = config.nonce;

  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${response.status})`);
  }

  return response.json();
}

/** List all active tutorial themes. */
export async function listTutorialThemes() {
  return apiRequest("/tutorial-themes");
}

/** Create a new tutorial theme. */
export async function createTutorialTheme(data) {
  return apiRequest("/tutorial-themes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Update an existing tutorial theme. */
export async function updateTutorialTheme(id, data) {
  return apiRequest(`/tutorial-themes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a tutorial theme.
 * First call (no confirmed flag) returns usage info for a confirmation dialog.
 * Second call (confirmed: true) performs the soft-delete.
 */
export async function deleteTutorialTheme(id, { confirmed = false } = {}) {
  return apiRequest(`/tutorial-themes/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmed }),
  });
}

/** Get the theme settings for a specific tutorial. */
export async function getTutorialThemeSettings(tutorialId) {
  return apiRequest(`/tutorials/${tutorialId}/theme-settings`);
}

/**
 * Save the tutorial-level theme selection.
 * Only writes _gots_theme_id — never touches slides.
 *
 * @param {string|number} tutorialId
 * @param {{ themeId: number|null }} settings
 */
export async function saveTutorialThemeSettings(tutorialId, settings) {
  return apiRequest(`/tutorials/${tutorialId}/theme-settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
