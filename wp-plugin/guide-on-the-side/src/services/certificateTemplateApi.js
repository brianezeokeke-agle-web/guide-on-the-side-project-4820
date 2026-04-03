// Admin API for certificate template management (librarian/admin use only).
// Uses gotsConfig (admin context), not gotsStudentConfig.

function getConfig() {
  if (typeof window !== 'undefined' && window.gotsConfig) {
    return { baseUrl: window.gotsConfig.restUrl, nonce: window.gotsConfig.nonce };
  }
  return { baseUrl: '/wp-json/gots/v1', nonce: null };
}

async function apiRequest(endpoint, options = {}) {
  const config = getConfig();
  const url = `${config.baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (config.nonce) headers['X-WP-Nonce'] = config.nonce;

  const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${response.status})`);
  }

  return response.json();
}

export async function listTemplates() {
  return apiRequest('/certificate-templates');
}

export async function createTemplate(data) {
  return apiRequest('/certificate-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(id, data) {
  return apiRequest(`/certificate-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id) {
  return apiRequest(`/certificate-templates/${id}`, { method: 'DELETE' });
}

/**
 * Open a preview PDF for a template (or unsaved data) in a new tab.
 * Sends an authenticated POST — the server responds with a PDF stream.
 *
 * @param {number|null} templateId  0 for unsaved / built-in base merged with overrides
 * @param {object|null} configOverrides  Optional unsaved config_json
 * @param {{ layout_type?: string, logo_media_id?: number|null }} [extras]  Unsaved layout or logo
 */
export async function previewTemplate(templateId, configOverrides = null, extras = {}) {
  const config = getConfig();
  const id = templateId || 0;
  const url = `${config.baseUrl}/certificate-templates/${id}/preview`;
  const headers = { 'Content-Type': 'application/json' };
  if (config.nonce) headers['X-WP-Nonce'] = config.nonce;

  const body = {};
  if (configOverrides && typeof configOverrides === 'object') {
    body.config_json = configOverrides;
  }
  if (extras && typeof extras === 'object') {
    if (extras.layout_type) {
      body.layout_type = extras.layout_type;
    }
    if (Object.prototype.hasOwnProperty.call(extras, 'logo_media_id')) {
      body.logo_media_id = extras.logo_media_id;
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Preview failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank');
  // Revoke after a short delay to free memory
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

export async function getTutorialCertSettings(tutorialId) {
  return apiRequest(`/tutorials/${tutorialId}/certificate-settings`);
}

export async function saveTutorialCertSettings(tutorialId, settings) {
  return apiRequest(`/tutorials/${tutorialId}/certificate-settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function listTutorialCertificates(tutorialId, limit = 50, offset = 0) {
  return apiRequest(`/tutorials/${tutorialId}/certificates?limit=${limit}&offset=${offset}`);
}

/**
 * Look up a certificate by the Certificate ID printed on the PDF (public endpoint).
 * Does not return the student name.
 *
 * @param {string} verificationId
 * @returns {Promise<{ valid: false } | { valid: true, issued_at: string, tutorial_title: string, status: string }>}
 */
export async function verifyCertificateById(verificationId) {
  const config = getConfig();
  const raw = String(verificationId ?? '').trim();
  if (!raw) {
    throw new Error('Enter the certificate ID from the PDF.');
  }
  const id = encodeURIComponent(raw);
  const url = `${config.baseUrl}/certificates/verify/${id}`;
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Verification failed (${response.status})`);
  }
  return response.json();
}
