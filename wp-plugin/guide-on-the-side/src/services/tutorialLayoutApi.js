/**
 * Admin API for tutorial layout settings.
 * Mirrors tutorialThemeApi.js structure exactly.
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

/**
 * Get the layout settings for a specific tutorial.
 *
 * @param {string|number} tutorialId
 * @returns {Promise<{ leftPaneRatio: number|null }>}
 */
export async function getTutorialLayoutSettings(tutorialId) {
  return apiRequest(`/tutorials/${tutorialId}/layout-settings`);
}

/**
 * Save the tutorial-level layout settings.
 * Only writes _gots_layout_left_pane_ratio — never touches slides.
 *
 * @param {string|number} tutorialId
 * @param {{ leftPaneRatio: number|null }} settings
 */
export async function saveTutorialLayoutSettings(tutorialId, settings) {
  return apiRequest(`/tutorials/${tutorialId}/layout-settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
