import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import DateRangeFilter from "../components/DateRangeFilter";
import AnalyticsSummaryCard from "../components/AnalyticsSummaryCard";
import AnalyticsTrendChart from "../components/AnalyticsTrendChart";
import SlidePerformanceTable from "../components/SlidePerformanceTable";
import { getTutorial } from "../services/tutorialApi";
import {
  getAnalyticsSummary,
  getAnalyticsTrend,
  getSlidePerformance,
} from "../services/analyticsApi";

/**
 * TutorialAnalyticsPage — per-tutorial analytics dashboard.
 *
 * Route: /tutorials/:id/analytics
 *
 * Shows:
 *  - Summary cards (starts, completions, completion rate, abandonment rate)
 *  - Trend line chart (starts + completions over time)
 *  - Slide performance table + bar chart
 *  - Global date range filter affecting all sections
 */
export default function TutorialAnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Tutorial metadata
  const [tutorial, setTutorial] = useState(null);

  // Use the server's "today" so date ranges always match the dates stored
  // in the analytics table, regardless of the browser's local timezone.
  const serverToday =
    (typeof window !== 'undefined' && window.gotsConfig?.serverToday) ||
    (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();

  /** Subtract N days from a YYYY-MM-DD string and return YYYY-MM-DD. */
  const subtractDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - n);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [dateRange, setDateRange] = useState({
    dateFrom: subtractDays(serverToday, 29),
    dateTo: serverToday,
  });

  // Analytics data
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [slides, setSlides] = useState(null);

  // Loading / error / retry
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const DESCRIPTION_LIMIT = 150;

  // Load tutorial metadata (re-runs on retry)
  useEffect(() => {
    async function load() {
      try {
        const data = await getTutorial(id);
        setTutorial(data);
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, [id, retryCount]);

  // Load all analytics data when date range changes
  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, trendData, slideData] = await Promise.all([
          getAnalyticsSummary(id, dateRange.dateFrom, dateRange.dateTo),
          getAnalyticsTrend(id, dateRange.dateFrom, dateRange.dateTo),
          getSlidePerformance(id, dateRange.dateFrom, dateRange.dateTo),
        ]);
        setSummary(summaryData);
        setTrend(trendData);
        setSlides(slideData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [id, dateRange, retryCount]);

  const pct = (rate) => `${(rate * 100).toFixed(1)}%`;

  // Check if there is any data at all
  const hasData =
    summary && (summary.starts > 0 || summary.completions > 0);

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <button style={styles.backButton} onClick={() => navigate("/tutorials")}>
              Back to Tutorials
            </button>
            <h1 style={styles.heading}>
              {tutorial ? tutorial.title : "Loading…"}
            </h1>
            {tutorial?.description && (() => {
              const full = tutorial.description;
              const truncated = full.length > DESCRIPTION_LIMIT;
              const displayed = truncated && !descExpanded
                ? full.slice(0, DESCRIPTION_LIMIT).trimEnd() + "…"
                : full;
              return (
                <p style={styles.description}>
                  {displayed}
                  {truncated && (
                    <button
                      style={styles.descToggle}
                      onClick={() => setDescExpanded((v) => !v)}
                    >
                      {descExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </p>
              );
            })()}
            <p style={styles.subtitle}>
              Usage and completion analytics for this tutorial
            </p>
          </div>
          <div style={styles.headerRight}>
            <DateRangeFilter onChange={setDateRange} serverToday={serverToday} />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
            <button
              style={styles.retryButton}
              onClick={() => setRetryCount((c) => c + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>Loading analytics…</span>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Empty state */}
            {!hasData && (
              <div style={styles.emptyState}>
                <h2 style={styles.emptyTitle}>No analytics available yet</h2>
                <p style={styles.emptyMessage}>
                  Analytics will appear once learners start using this tutorial.
                  Share the tutorial link to get started!
                </p>
              </div>
            )}

            {/* Summary cards */}
            {hasData && (
              <>
                <div style={styles.summaryGrid}>
                  <AnalyticsSummaryCard
                    label="Starts"
                    value={summary.starts.toLocaleString()}
                    description="Total times tutorial was started"
                    accentColor="#7B2D26"
                  />
                  <AnalyticsSummaryCard
                    label="Completions"
                    value={summary.completions.toLocaleString()}
                    description="Total times tutorial was completed"
                    accentColor="#059669"
                  />
                  <AnalyticsSummaryCard
                    label="Completion Rate"
                    value={pct(summary.completionRate)}
                    description="Completions ÷ Starts"
                    accentColor="#2563eb"
                  />
                  <AnalyticsSummaryCard
                    label="Abandonment Rate"
                    value={pct(summary.abandonmentRate)}
                    description="Users who did not complete"
                    accentColor="#d97706"
                  />
                </div>

                {/* Trend chart */}
                <div style={styles.section}>
                  <AnalyticsTrendChart data={trend} />
                </div>

                {/* Slide performance */}
                <div style={styles.section}>
                  <SlidePerformanceTable data={slides} />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  main: {
    flexGrow: 1,
    padding: "32px",
    backgroundColor: "#f9fafb",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  headerRight: {
    display: "flex",
    alignItems: "flex-start",
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#7B2D26",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "0",
    marginBottom: "4px",
    textAlign: "left",
  },
  heading: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.6",
    maxWidth: "600px",
  },
  descToggle: {
    background: "none",
    border: "none",
    padding: "0 0 0 6px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#7B2D26",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  subtitle: {
    margin: "2px 0 0 0",
    fontSize: "14px",
    color: "#6b7280",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  section: {
    marginBottom: "24px",
  },
  // Loading
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "80px 0",
  },
  spinner: {
    width: "28px",
    height: "28px",
    border: "3px solid #e5e7eb",
    borderTopColor: "#7B2D26",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: "14px",
    color: "#6b7280",
  },
  // Error
  errorBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#991b1b",
    marginBottom: "24px",
  },
  retryButton: {
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: "600",
    backgroundColor: "#7B2D26",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  // Empty state
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 24px",
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  emptyTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  emptyMessage: {
    fontSize: "14px",
    color: "#6b7280",
    maxWidth: "420px",
    lineHeight: "1.6",
    margin: 0,
  },
};
