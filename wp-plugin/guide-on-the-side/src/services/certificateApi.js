// Certificate API — issues certificates and builds download URLs from the student playback page.

function getConfig() {
  if (typeof window !== 'undefined' && window.gotsStudentConfig) {
    return {
      baseUrl:          window.gotsStudentConfig.restUrl,
      nonce:            window.gotsStudentConfig.nonce || null,
      completionProof:  window.gotsStudentConfig.completionProof || '',
      completionNonce:  window.gotsStudentConfig.completionNonce || '',
    };
  }
  return { baseUrl: '/wp-json/gots/v1', nonce: null, completionProof: '', completionNonce: '' };
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
 * Request a signed completion-proof token from the server.
 * Must be called at the moment of genuine tutorial completion.
 *
 * @param {number} tutorialId
 * @returns {Promise<string>}  The completionProof token.
 */
export async function requestCompletionProof(tutorialId) {
  const { completionNonce } = getConfig();
  const response = await apiRequest(`/tutorials/${tutorialId}/certificate/completion-proof`, {
    method: 'POST',
    body: JSON.stringify({ completionNonce }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to get completion proof (${response.status})`);
  }

  const data = await response.json();
  return data.completionProof;
}

/**
 * Issue a certificate for a completed tutorial.
 *
 * @param {number} tutorialId
 * @param {{ recipientName: string, completionProof: string, idempotencyKey?: string }} payload
 * @returns {Promise<{ certificateId: number, downloadUrl: string, expiresAt: string }>}
 */
export async function issueCertificate(tutorialId, payload) {
  const body = {
    recipientName:   payload.recipientName,
    completionProof: payload.completionProof,
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
 * Fetches the PDF as a blob first, then triggers a download via an Object URL.
 * A plain <a download> doesn't work reliably with REST API URLs because the
 * browser treats them as cross-origin or navigates instead of downloading.
 *
 * @param {string} downloadUrl
 * @param {string} [filename]
 * @returns {Promise<void>}
 */
export async function downloadCertificate(downloadUrl, filename = 'certificate.pdf') {
  const config = getConfig();
  const headers = {};
  if (config.nonce) {
    headers['X-WP-Nonce'] = config.nonce;
  }

  const response = await fetch(downloadUrl, {
    credentials: 'same-origin',
    headers,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Public lookup by Certificate ID (UUID printed on the PDF). No auth required.
 *
 * @param {string} verificationId
 * @returns {Promise<{ valid: false } | { valid: true, issued_at: string, tutorial_title: string, status: string }>}
 */
export async function verifyCertificate(verificationId) {
  const config = getConfig();
  const id = encodeURIComponent(String(verificationId ?? '').trim());
  if (!id) {
    throw new Error('verificationId is required.');
  }
  const url = `${config.baseUrl}/certificates/verify/${id}`;
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Verification failed (${response.status})`);
  }
  return response.json();
}
