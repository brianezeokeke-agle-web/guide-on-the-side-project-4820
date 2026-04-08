// Unit tests: certificateApi.js (student-side certificate issuance)

import { issueCertificate, downloadCertificate, verifyCertificate, requestCompletionProof } from './certificateApi';

global.fetch = jest.fn();

describe('certificateApi', () => {
  const restUrl = 'https://example.com/wp-json/gots/v1';
  const mockProof = 'encoded-payload.sig';

  beforeEach(() => {
    jest.clearAllMocks();
    window.gotsStudentConfig = {
      restUrl,
      nonce: 'student-nonce',
      completionProof: mockProof,
      completionNonce: 'test-completion-nonce',
    };
  });

  afterEach(() => {
    delete window.gotsStudentConfig;
    document.body.innerHTML = '';
  });

  // ── issueCertificate ──────────────────────────────────────────────────────

  test('issueCertificate sends POST to correct URL with required fields', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        certificateId: 7,
        downloadUrl: `${restUrl}/certificates/token123/download`,
        expiresAt: '2026-04-02T00:00:00Z',
      }),
    });

    const result = await issueCertificate(42, { recipientName: 'Alice', completionProof: mockProof });

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorials/42/certificate/issue`,
      expect.objectContaining({ method: 'POST' })
    );

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.recipientName).toBe('Alice');
    expect(body.completionProof).toBe(mockProof);
    expect(result.certificateId).toBe(7);
  });

  test('issueCertificate includes X-WP-Nonce header', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ certificateId: 1, downloadUrl: '', expiresAt: '' }),
    });

    await issueCertificate(1, { recipientName: 'Bob' });

    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBe('student-nonce');
  });

  test('issueCertificate includes idempotencyKey when provided', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ certificateId: 2, downloadUrl: '', expiresAt: '' }),
    });

    await issueCertificate(10, { recipientName: 'Carol', idempotencyKey: 'key-abc' });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.idempotencyKey).toBe('key-abc');
  });

  test('issueCertificate throws on server error response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Rate limited' }),
    });

    await expect(issueCertificate(5, { recipientName: 'Dave' })).rejects.toThrow('Rate limited');
  });

  test('issueCertificate throws on server error with fallback message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(issueCertificate(5, { recipientName: 'Eve' })).rejects.toThrow(/500/);
  });

  test('issueCertificate uses fallback URL when no config set', async () => {
    delete window.gotsStudentConfig;

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ certificateId: 3, downloadUrl: '', expiresAt: '' }),
    });

    await issueCertificate(3, { recipientName: 'Frank' });

    expect(fetch.mock.calls[0][0]).toContain('/wp-json/gots/v1/tutorials/3/certificate/issue');
  });

  test('issueCertificate sends the completionProof supplied in the payload', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ certificateId: 4, downloadUrl: '', expiresAt: '' }),
    });

    await issueCertificate(4, { recipientName: 'Grace', completionProof: 'payload-proof' });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.completionProof).toBe('payload-proof');
  });

  // ── downloadCertificate ───────────────────────────────────────────────────

  test('downloadCertificate fetches blob and triggers download', async () => {
    const mockBlob = new Blob(['fake-pdf'], { type: 'application/pdf' });
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    // jsdom doesn't have URL.createObjectURL/revokeObjectURL
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn().mockReturnValue('blob:fake-url');
    URL.revokeObjectURL = jest.fn();

    await downloadCertificate('https://example.com/cert-download', 'my-cert.pdf');

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/cert-download',
      expect.objectContaining({ credentials: 'same-origin' })
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');

    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
  });

  test('downloadCertificate throws on failed response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await expect(downloadCertificate('https://example.com/missing')).rejects.toThrow('Download failed (404)');
  });

  // ── verifyCertificate ─────────────────────────────────────────────────────

  test('verifyCertificate GETs public verify URL', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, issued_at: '2026-01-01', tutorial_title: 'T', status: 'issued' }),
    });

    const result = await verifyCertificate('abc-uuid-123');

    expect(fetch.mock.calls[0][0]).toContain('/certificates/verify/');
    expect(fetch.mock.calls[0][0]).toContain(encodeURIComponent('abc-uuid-123'));
    expect(result.valid).toBe(true);
  });

  test('verifyCertificate throws immediately for empty verificationId', async () => {
    await expect(verifyCertificate('')).rejects.toThrow('verificationId is required.');
    await expect(verifyCertificate('   ')).rejects.toThrow('verificationId is required.');
    await expect(verifyCertificate(null)).rejects.toThrow('verificationId is required.');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('verifyCertificate throws on rate-limit response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Too many verification requests. Please wait before trying again.' }),
    });

    await expect(verifyCertificate('any-id')).rejects.toThrow('Too many verification requests');
  });

  // ── requestCompletionProof ────────────────────────────────────────────────

  test('requestCompletionProof POSTs to completion-proof endpoint and returns token', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ completionProof: 'fresh-proof-token' }),
    });

    const proof = await requestCompletionProof(42);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorials/42/certificate/completion-proof`,
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.completionNonce).toBe('test-completion-nonce');
    expect(proof).toBe('fresh-proof-token');
  });

  test('requestCompletionProof sends empty completionNonce when config is absent', async () => {
    delete window.gotsStudentConfig;

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ completionProof: 'fallback-proof' }),
    });

    await requestCompletionProof(42);

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.completionNonce).toBe('');
  });

  test('requestCompletionProof throws on invalid or expired nonce', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Invalid or expired completion nonce.' }),
    });

    await expect(requestCompletionProof(5)).rejects.toThrow('Invalid or expired completion nonce.');
  });

  test('requestCompletionProof throws when cert is disabled on tutorial', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Certificates are not enabled for this tutorial.' }),
    });

    await expect(requestCompletionProof(5)).rejects.toThrow('Certificates are not enabled');
  });

  test('requestCompletionProof throws on rate limit', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Too many proof requests. Please wait before trying again.' }),
    });

    await expect(requestCompletionProof(5)).rejects.toThrow('Too many proof requests');
  });

  // ── issueCertificate error paths ──────────────────────────────────────────

  test('issueCertificate throws proof_expired error with server message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Completion proof has expired.' }),
    });

    await expect(issueCertificate(1, { recipientName: 'Alice', completionProof: 'old-proof' }))
      .rejects.toThrow('Completion proof has expired.');
  });

  test('issueCertificate throws proof_mismatch error with server message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Completion proof is not valid for this student.' }),
    });

    await expect(issueCertificate(1, { recipientName: 'Bob', completionProof: 'wrong-proof' }))
      .rejects.toThrow('Completion proof is not valid for this student.');
  });
});
