// Analytics API — records events from student playback and fetches analytics data for the admin dashboard.

function getConfig() {
  if (typeof window !== 'undefined' && window.gotsStudentConfig) {
    return {
      baseUrl: window.gotsStudentConfig.restUrl,
      nonce: window.gotsStudentConfig.nonce || null,
    };
  }
  if (typeof window !== 'undefined' && window.gotsConfig) {
    return {
      baseUrl: window.gotsConfig.restUrl,
      nonce: window.gotsConfig.nonce,
    };
  }
  return { baseUrl: '/wp-json/gots/v1', nonce: null };
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

// Record an analytics event (fire-and-forget, never blocks the student).
export async function recordAnalyticsEvent(tutorialId, eventType, slideId = null) {
  try {
    const body = { tutorialId: String(tutorialId), eventType };
    if (slideId) body.slideId = slideId;

    await apiRequest('/analytics/event', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[GOTS Analytics] Failed to record event:', err);
  }
}

// Build a query-string from date range params.
function dateParams(dateFrom, dateTo) {
  const parts = [];
  if (dateFrom) parts.push(`dateFrom=${dateFrom}`);
  if (dateTo) parts.push(`dateTo=${dateTo}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

// Fetch tutorial analytics summary (starts, completions, rates).
export async function getAnalyticsSummary(tutorialId, dateFrom = null, dateTo = null) {
  const response = await apiRequest(
    `/tutorials/${tutorialId}/analytics/summary${dateParams(dateFrom, dateTo)}`
  );
  if (!response.ok) throw new Error('Failed to fetch analytics summary');
  return response.json();
}

// Fetch daily trend data (starts + completions over time).
export async function getAnalyticsTrend(tutorialId, dateFrom = null, dateTo = null) {
  const response = await apiRequest(
    `/tutorials/${tutorialId}/analytics/trend${dateParams(dateFrom, dateTo)}`
  );
  if (!response.ok) throw new Error('Failed to fetch analytics trend');
  return response.json();
}

// Fetch slide-level performance data (views, proceeds, conversion).
export async function getSlidePerformance(tutorialId, dateFrom = null, dateTo = null) {
  const response = await apiRequest(
    `/tutorials/${tutorialId}/analytics/slides${dateParams(dateFrom, dateTo)}`
  );
  if (!response.ok) throw new Error('Failed to fetch slide performance');
  return response.json();
}
