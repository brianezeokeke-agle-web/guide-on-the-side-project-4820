// Unit Test: Analytics API Service (WordPress Environment)

import {
  recordAnalyticsEvent,
  getAnalyticsSummary,
  getAnalyticsTrend,
  getSlidePerformance,
} from './analyticsApi';

global.fetch = jest.fn();

describe('Analytics API Service (WordPress)', () => {
  const mockRestUrl = 'https://example.com/wp-json/gots/v1';
  const mockNonce = 'mock-nonce-456';

  beforeEach(() => {
    jest.clearAllMocks();

    window.gotsConfig = {
      restUrl: mockRestUrl,
      nonce: mockNonce,
    };
    delete window.gotsStudentConfig;

    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete window.gotsConfig;
    delete window.gotsStudentConfig;
    console.warn.mockRestore();
  });

  // --- recordAnalyticsEvent ---

  // Verify POST with correct body
  test('recordAnalyticsEvent should POST the event with tutorialId and eventType', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await recordAnalyticsEvent(42, 'tutorial_started');

    expect(fetch).toHaveBeenCalledWith(
      `${mockRestUrl}/analytics/event`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ tutorialId: '42', eventType: 'tutorial_started' }),
      })
    );
  });

  // Verify slideId is included when provided
  test('recordAnalyticsEvent should include slideId when provided', async () => {
    fetch.mockResolvedValueOnce({ ok: true });

    await recordAnalyticsEvent(42, 'slide_viewed', 'slide-abc');

    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.slideId).toBe('slide-abc');
    expect(callBody.tutorialId).toBe('42');
    expect(callBody.eventType).toBe('slide_viewed');
  });

  // Verify HMAC token from gotsStudentConfig
  test('recordAnalyticsEvent should attach analyticsToken from student config', async () => {
    window.gotsStudentConfig = {
      restUrl: mockRestUrl,
      nonce: null,
      analyticsToken: 'hmac-token-xyz',
    };

    fetch.mockResolvedValueOnce({ ok: true });

    await recordAnalyticsEvent(10, 'tutorial_completed');

    const callBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(callBody.token).toBe('hmac-token-xyz');
  });

  // Should not throw on server error
  test('recordAnalyticsEvent should silently catch server errors', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

    // Should NOT throw
    await expect(recordAnalyticsEvent(1, 'tutorial_started')).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  // Should not throw on network failure
  test('recordAnalyticsEvent should silently catch network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network failure'));

    await expect(recordAnalyticsEvent(1, 'tutorial_started')).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  // Student config takes priority over admin config
  test('recordAnalyticsEvent should prefer gotsStudentConfig over gotsConfig', async () => {
    const studentRestUrl = 'https://example.com/wp-json/gots-student/v1';
    window.gotsStudentConfig = {
      restUrl: studentRestUrl,
      nonce: 'student-nonce',
    };

    fetch.mockResolvedValueOnce({ ok: true });

    await recordAnalyticsEvent(5, 'slide_proceeded');

    expect(fetch).toHaveBeenCalledWith(
      `${studentRestUrl}/analytics/event`,
      expect.objectContaining({ method: 'POST' })
    );
    // Should use student nonce
    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBe('student-nonce');
  });

  // --- getAnalyticsSummary ---

  // Fetch summary without date range
  test('getAnalyticsSummary should fetch summary without date params', async () => {
    const mockSummary = { starts: 100, completions: 75, completionRate: 0.75 };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSummary,
    });

    const result = await getAnalyticsSummary(42);

    expect(fetch).toHaveBeenCalledWith(
      `${mockRestUrl}/tutorials/42/analytics/summary`,
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-WP-Nonce': mockNonce }),
      })
    );
    expect(result).toEqual(mockSummary);
  });

  // Date range query params
  test('getAnalyticsSummary should include date range query params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await getAnalyticsSummary(42, '2026-01-01', '2026-03-15');

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('dateFrom=2026-01-01');
    expect(calledUrl).toContain('dateTo=2026-03-15');
  });

  // Only dateFrom when dateTo is null
  test('getAnalyticsSummary should handle dateFrom only', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await getAnalyticsSummary(42, '2026-01-01', null);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('dateFrom=2026-01-01');
    expect(calledUrl).not.toContain('dateTo');
  });

  // Throws on server error
  test('getAnalyticsSummary should throw on server failure', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(getAnalyticsSummary(42)).rejects.toThrow('Failed to fetch analytics summary');
  });

  // --- getAnalyticsTrend ---

  // Fetch daily trend data
  test('getAnalyticsTrend should fetch trend data', async () => {
    const mockTrend = [
      { date: '2026-03-01', starts: 10, completions: 8 },
      { date: '2026-03-02', starts: 12, completions: 9 },
    ];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrend,
    });

    const result = await getAnalyticsTrend(42);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toBe(`${mockRestUrl}/tutorials/42/analytics/trend`);
    expect(result).toEqual(mockTrend);
  });

  // Date range query params
  test('getAnalyticsTrend should include date range query params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await getAnalyticsTrend(42, '2026-01-01', '2026-03-15');

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('dateFrom=2026-01-01');
    expect(calledUrl).toContain('dateTo=2026-03-15');
  });

  // Throws on server error
  test('getAnalyticsTrend should throw on server failure', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(getAnalyticsTrend(42)).rejects.toThrow('Failed to fetch analytics trend');
  });

  // --- getSlidePerformance ---

  // Fetch per-slide data
  test('getSlidePerformance should fetch slide-level data', async () => {
    const mockSlides = [
      { slideId: 's1', views: 50, proceeds: 45, conversionRate: 0.9 },
      { slideId: 's2', views: 45, proceeds: 40, conversionRate: 0.89 },
    ];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSlides,
    });

    const result = await getSlidePerformance(42);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toBe(`${mockRestUrl}/tutorials/42/analytics/slides`);
    expect(result).toEqual(mockSlides);
  });

  // Date range query params
  test('getSlidePerformance should include date range query params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await getSlidePerformance(42, '2026-02-01', '2026-02-28');

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('dateFrom=2026-02-01');
    expect(calledUrl).toContain('dateTo=2026-02-28');
  });

  // Throws on server error
  test('getSlidePerformance should throw on server failure', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(getSlidePerformance(42)).rejects.toThrow('Failed to fetch slide performance');
  });

  // --- Config / auth ---

  // Nonce header from gotsConfig
  test('requests should include X-WP-Nonce header from gotsConfig', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await getAnalyticsSummary(1);

    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBe(mockNonce);
  });

  // Fallback config when no globals exist
  test('should use fallback config when no global config is set', async () => {
    delete window.gotsConfig;
    delete window.gotsStudentConfig;

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await getAnalyticsSummary(1);

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/wp-json/gots/v1/');
    expect(fetch.mock.calls[0][1].headers['X-WP-Nonce']).toBeUndefined();
  });
});
