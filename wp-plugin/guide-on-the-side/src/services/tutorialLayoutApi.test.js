// Unit tests: tutorialLayoutApi.js (tutorial-wide pane ratio settings)

import {
  getTutorialLayoutSettings,
  saveTutorialLayoutSettings,
} from './tutorialLayoutApi';

global.fetch = jest.fn();

describe('tutorialLayoutApi', () => {
  const restUrl = 'https://example.com/wp-json/gots/v1';
  const nonce   = 'admin-nonce-789';

  beforeEach(() => {
    jest.clearAllMocks();
    window.gotsConfig = { restUrl, nonce };
  });

  afterEach(() => {
    delete window.gotsConfig;
  });

  //getTutorialLayoutSettings

  describe('getTutorialLayoutSettings', () => {
    test('GETs /tutorials/{id}/layout-settings', async () => {
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leftPaneRatio: 35 }) });

      const result = await getTutorialLayoutSettings(42);

      expect(fetch).toHaveBeenCalledWith(
        `${restUrl}/tutorials/42/layout-settings`,
        expect.anything(),
      );
      expect(result.leftPaneRatio).toBe(35);
    });

    test('returns null leftPaneRatio when no ratio is configured', async () => {
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leftPaneRatio: null }) });

      const result = await getTutorialLayoutSettings(42);

      expect(result.leftPaneRatio).toBeNull();
    });

    test('throws on server error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Tutorial not found.' }),
      });

      await expect(getTutorialLayoutSettings(999)).rejects.toThrow('Tutorial not found.');
    });
  });

  //saveTutorialLayoutSettings

  describe('saveTutorialLayoutSettings', () => {
    test('PUTs leftPaneRatio to /tutorials/{id}/layout-settings', async () => {
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leftPaneRatio: 40 }) });

      const result = await saveTutorialLayoutSettings(42, { leftPaneRatio: 40 });

      expect(fetch).toHaveBeenCalledWith(
        `${restUrl}/tutorials/42/layout-settings`,
        expect.objectContaining({ method: 'PUT' }),
      );
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.leftPaneRatio).toBe(40);
      expect(result.leftPaneRatio).toBe(40);
    });

    test('accepts null leftPaneRatio to clear the setting', async () => {
      fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leftPaneRatio: null }) });

      await saveTutorialLayoutSettings(42, { leftPaneRatio: null });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.leftPaneRatio).toBeNull();
    });

    test('throws on validation error from server', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'leftPaneRatio must be between 10 and 50.' }),
      });

      await expect(saveTutorialLayoutSettings(42, { leftPaneRatio: 99 }))
        .rejects.toThrow('leftPaneRatio must be between 10 and 50.');
    });

    test('throws when tutorial is not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Tutorial not found.' }),
      });

      await expect(saveTutorialLayoutSettings(999, { leftPaneRatio: 30 }))
        .rejects.toThrow('Tutorial not found.');
    });
  });

  //Auth/config

  test('attaches X-WP-Nonce header from gotsConfig', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leftPaneRatio: null }) });

    await getTutorialLayoutSettings(1);

    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBe(nonce);
  });

  test('uses fallback URL when gotsConfig is not set', async () => {
    delete window.gotsConfig;
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leftPaneRatio: null }) });

    await getTutorialLayoutSettings(1);

    expect(fetch.mock.calls[0][0]).toContain('/wp-json/gots/v1/tutorials/1/layout-settings');
  });

  test('omits X-WP-Nonce header when gotsConfig has no nonce', async () => {
    window.gotsConfig = { restUrl, nonce: null };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leftPaneRatio: null }) });

    await getTutorialLayoutSettings(1);

    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBeUndefined();
  });
});
