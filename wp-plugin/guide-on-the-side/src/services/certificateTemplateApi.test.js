// Unit tests: certificateTemplateApi.js (admin template management)

import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  verifyCertificateById,
  getTutorialCertSettings,
  saveTutorialCertSettings,
  listTutorialCertificates,
} from './certificateTemplateApi';

global.fetch = jest.fn();

describe('certificateTemplateApi', () => {
  const restUrl = 'https://example.com/wp-json/gots/v1';
  const nonce   = 'admin-nonce-123';

  beforeEach(() => {
    jest.clearAllMocks();
    window.gotsConfig = { restUrl, nonce };
  });

  afterEach(() => {
    delete window.gotsConfig;
  });

  // ── listTemplates ─────────────────────────────────────────────────────────

  test('listTemplates GETs /certificate-templates', async () => {
    const mockTemplates = [{ id: 1, name: 'Classic', layout_type: 'classic' }];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockTemplates });

    const result = await listTemplates();

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/certificate-templates`,
      expect.objectContaining({ headers: expect.objectContaining({ 'X-WP-Nonce': nonce }) })
    );
    expect(result).toEqual(mockTemplates);
  });

  test('listTemplates throws on server error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    });
    await expect(listTemplates()).rejects.toThrow('Forbidden');
  });

  // ── createTemplate ────────────────────────────────────────────────────────

  test('createTemplate POSTs template data', async () => {
    const input = { name: 'Formal', layout_type: 'formal', config_json: {} };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2, ...input }) });

    const result = await createTemplate(input);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/certificate-templates`,
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.name).toBe('Formal');
    expect(result.id).toBe(2);
  });

  // ── updateTemplate ────────────────────────────────────────────────────────

  test('updateTemplate PUTs to /certificate-templates/{id}', async () => {
    const input = { name: 'Updated', layout_type: 'minimal', config_json: {} };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 3, ...input }) });

    await updateTemplate(3, input);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/certificate-templates/3`,
      expect.objectContaining({ method: 'PUT' })
    );
  });

  // ── deleteTemplate ────────────────────────────────────────────────────────

  test('deleteTemplate DELETEs /certificate-templates/{id}', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true, id: 4 }) });

    const result = await deleteTemplate(4);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/certificate-templates/4`,
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(result.deleted).toBe(true);
  });

  // ── previewTemplate ───────────────────────────────────────────────────────

  test('previewTemplate POSTs config_json, layout_type, and logo_media_id', async () => {
    window.open = jest.fn();
    const prevCreate = URL.createObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:mock');
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => new Blob(['%PDF']),
    });

    await previewTemplate(
      0,
      { title: 'Preview Title' },
      { layout_type: 'custom_html', logo_media_id: 99 }
    );

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/certificate-templates/0/preview`,
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.config_json.title).toBe('Preview Title');
    expect(body.layout_type).toBe('custom_html');
    expect(body.logo_media_id).toBe(99);

    URL.createObjectURL = prevCreate;
  });

  // ── verifyCertificateById ─────────────────────────────────────────────────

  test('verifyCertificateById GETs verify URL', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, issued_at: '2026-01-01', tutorial_title: 'T', status: 'issued' }),
    });

    const out = await verifyCertificateById('uuid-here');

    expect(fetch.mock.calls[0][0]).toContain('/certificates/verify/');
    expect(fetch.mock.calls[0][0]).toContain(encodeURIComponent('uuid-here'));
    expect(out.valid).toBe(true);
  });

  test('verifyCertificateById throws when id empty', async () => {
    await expect(verifyCertificateById('  ')).rejects.toThrow(/Enter the certificate ID/);
  });

  // ── getTutorialCertSettings ───────────────────────────────────────────────

  test('getTutorialCertSettings GETs settings for tutorial', async () => {
    const settings = { enabled: true, template_id: 1, issuer_name: 'Library' };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => settings });

    const result = await getTutorialCertSettings(99);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorials/99/certificate-settings`,
      expect.anything()
    );
    expect(result.enabled).toBe(true);
  });

  // ── saveTutorialCertSettings ──────────────────────────────────────────────

  test('saveTutorialCertSettings PUTs settings', async () => {
    const payload = { enabled: false, templateId: 0, issuerName: '' };
    const response = { enabled: false, template_id: null, issuer_name: '' };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => response });

    const result = await saveTutorialCertSettings(99, payload);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorials/99/certificate-settings`,
      expect.objectContaining({ method: 'PUT' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.enabled).toBe(false);
    expect(result.enabled).toBe(false);
  });

  // ── listTutorialCertificates ──────────────────────────────────────────────

  test('listTutorialCertificates GETs certificates with limit/offset', async () => {
    const resp = { tutorialId: 5, certificates: [], count: 0 };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => resp });

    await listTutorialCertificates(5, 20, 40);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/tutorials/5/certificates');
    expect(calledUrl).toContain('limit=20');
    expect(calledUrl).toContain('offset=40');
  });

  // ── Auth / config ─────────────────────────────────────────────────────────

  test('uses fallback URL when gotsConfig is not set', async () => {
    delete window.gotsConfig;
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await listTemplates();

    expect(fetch.mock.calls[0][0]).toContain('/wp-json/gots/v1/certificate-templates');
  });
});
