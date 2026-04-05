// Unit tests: tutorialThemeApi.js (admin theme management)

import {
  listTutorialThemes,
  createTutorialTheme,
  updateTutorialTheme,
  deleteTutorialTheme,
  getTutorialThemeSettings,
  saveTutorialThemeSettings,
} from './tutorialThemeApi';

global.fetch = jest.fn();

describe('tutorialThemeApi', () => {
  const restUrl = 'https://example.com/wp-json/gots/v1';
  const nonce   = 'admin-nonce-456';

  beforeEach(() => {
    jest.clearAllMocks();
    window.gotsConfig = { restUrl, nonce };
  });

  afterEach(() => {
    delete window.gotsConfig;
  });

  //listTutorialThemes 

  test('listTutorialThemes GETs /tutorial-themes', async () => {
    const mockThemes = [{ id: 1, name: 'Crimson', is_default: 1 }];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockThemes });

    const result = await listTutorialThemes();

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorial-themes`,
      expect.objectContaining({ headers: expect.objectContaining({ 'X-WP-Nonce': nonce }) })
    );
    expect(result).toEqual(mockThemes);
  });

  test('listTutorialThemes throws on server error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    });
    await expect(listTutorialThemes()).rejects.toThrow('Forbidden');
  });

  //createTutorialTheme 

  test('createTutorialTheme POSTs theme data', async () => {
    const input = { name: 'Ocean', is_default: false, config_json: { primaryColor: '#0077cc' } };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2, ...input }) });

    const result = await createTutorialTheme(input);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorial-themes`,
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.name).toBe('Ocean');
    expect(body.config_json.primaryColor).toBe('#0077cc');
    expect(result.id).toBe(2);
  });

  test('createTutorialTheme throws on validation error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Theme name is required.' }),
    });
    await expect(createTutorialTheme({ name: '' })).rejects.toThrow('Theme name is required.');
  });

  //updateTutorialTheme 

  test('updateTutorialTheme PUTs to /tutorial-themes/{id}', async () => {
    const input = { name: 'Ocean Updated', is_default: false, config_json: {} };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2, ...input }) });

    await updateTutorialTheme(2, input);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorial-themes/2`,
      expect.objectContaining({ method: 'PUT' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.name).toBe('Ocean Updated');
  });

  //deleteTutorialTheme 

  test('deleteTutorialTheme first call returns usage info without deleting', async () => {
    const usageInfo = { deleted: false, confirmRequired: false, affectedTutorials: [] };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => usageInfo });

    const result = await deleteTutorialTheme(3);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorial-themes/3`,
      expect.objectContaining({ method: 'DELETE' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.confirmed).toBe(false);
    expect(result.deleted).toBe(false);
  });

  test('deleteTutorialTheme first call returns confirmRequired when theme is in use', async () => {
    const usageInfo = {
      deleted: false,
      confirmRequired: true,
      affectedTutorials: [{ id: 10, title: 'Intro Tutorial', status: 'published' }],
    };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => usageInfo });

    const result = await deleteTutorialTheme(3);

    expect(result.confirmRequired).toBe(true);
    expect(result.affectedTutorials).toHaveLength(1);
  });

  test('deleteTutorialTheme second call with confirmed=true performs deletion', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: true, id: 3 }) });

    const result = await deleteTutorialTheme(3, { confirmed: true });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.confirmed).toBe(true);
    expect(result.deleted).toBe(true);
  });

  test('deleteTutorialTheme throws on server error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Theme not found.' }),
    });
    await expect(deleteTutorialTheme(999)).rejects.toThrow('Theme not found.');
  });

  //getTutorialThemeSettings 

  test('getTutorialThemeSettings GETs settings for tutorial', async () => {
    const settings = { theme_id: 2 };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => settings });

    const result = await getTutorialThemeSettings(42);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorials/42/theme-settings`,
      expect.anything()
    );
    expect(result.theme_id).toBe(2);
  });

  test('getTutorialThemeSettings returns null theme_id when no theme assigned', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ theme_id: null }) });

    const result = await getTutorialThemeSettings(42);

    expect(result.theme_id).toBeNull();
  });

  //saveTutorialThemeSettings 

  test('saveTutorialThemeSettings PUTs themeId', async () => {
    const payload  = { themeId: 2 };
    const response = { theme_id: 2 };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => response });

    const result = await saveTutorialThemeSettings(42, payload);

    expect(fetch).toHaveBeenCalledWith(
      `${restUrl}/tutorials/42/theme-settings`,
      expect.objectContaining({ method: 'PUT' })
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.themeId).toBe(2);
    expect(result.theme_id).toBe(2);
  });

  test('saveTutorialThemeSettings accepts null themeId to clear assignment', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ theme_id: null }) });

    await saveTutorialThemeSettings(42, { themeId: null });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.themeId).toBeNull();
  });

  //Auth / config

  test('attaches X-WP-Nonce header from gotsConfig', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await listTutorialThemes();

    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBe(nonce);
  });

  test('uses fallback URL when gotsConfig is not set', async () => {
    delete window.gotsConfig;
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await listTutorialThemes();

    expect(fetch.mock.calls[0][0]).toContain('/wp-json/gots/v1/tutorial-themes');
  });

  test('omits X-WP-Nonce header when gotsConfig has no nonce', async () => {
    window.gotsConfig = { restUrl, nonce: null };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    await listTutorialThemes();

    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBeUndefined();
  });
});
