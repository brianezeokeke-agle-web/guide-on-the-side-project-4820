// Certificate API — issues certificates and builds download URLs from the student playback page.

function getConfig() {
  if (typeof window !== 'undefined' && window.gotsStudentConfig) {
    return {
      baseUrl:         window.gotsStudentConfig.restUrl,
      nonce:           window.gotsStudentConfig.nonce || null,
      completionProof: window.gotsStudentConfig.completionProof || '',
    };
  }
  return { baseUrl: '/wp-json/gots/v1', nonce: null, completionProof: '' };
}

async function apiRequest(endpoint, options = {}) {
  const config = getConfig();
  const url = `${config.baseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (config.nonce) {
    headers['X-WP-Nonce'] = config.nonce;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  return response;
}

/**
 * Issue a certificate for a completed tutorial.
 *
 * @param {number} tutorialId
 * @param {{ recipientName: string, idempotencyKey?: string }} payload
 * @returns {Promise<{ certificateId: number, downloadUrl: string, expiresAt: string }>}
 */
export async function issueCertificate(tutorialId, payload) {
  const config = getConfig();

  const body = {
    recipientName:   payload.recipientName,
    completionProof: config.completionProof,
  };

  if (payload.idempotencyKey) {
    body.idempotencyKey = payload.idempotencyKey;
  }

  const response = await apiRequest(`/tutorials/${tutorialId}/certificate/issue`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to issue certificate (${response.status})`);
  }

  return response.json();
}

/**
 * Trigger a browser download for a certificate given a downloadUrl returned by issueCertificate.
 *
 * Uses a hidden <a> tag so the PDF opens as a download without navigating away.
 *
 * @param {string} downloadUrl
 * @param {string} [filename]
 */
export function downloadCertificate(downloadUrl, filename = 'certificate.pdf') {
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Public lookup by Certificate ID (UUID printed on the PDF). No auth required.
 *
 * @param {string} verificationId
 * @returns {Promise<{ valid: false } | { valid: true, issued_at: string, tutorial_title: string, status: string }>}
 */
export async function verifyCertificate(verificationId) {
  const config = getConfig();
  const id = encodeURIComponent(String(verificationId).trim());
  const url = `${config.baseUrl}/certificates/verify/${id}`;
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Verification failed (${response.status})`);
  }
  return response.json();
}
