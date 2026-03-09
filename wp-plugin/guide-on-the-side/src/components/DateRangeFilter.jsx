import { useState, useRef, useEffect } from "react";

/**
 * Global date range filter for the analytics dashboard.
 *
 * Presets: Last 7 Days, Last 30 Days, All Time, Custom Range.
 * Emits {dateFrom, dateTo} (both YYYY-MM-DD strings, or null for All Time).
 *
 * @param {string} serverToday  The server's "today" as YYYY-MM-DD, sourced from
 *                              gotsConfig.serverToday so date ranges always
 *                              match the dates stored in the analytics table.
 */
export default function DateRangeFilter({ onChange, serverToday }) {
  const [preset, setPreset] = useState("last30");
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const customRef = useRef(null);

  // close custom picker when clicking outside
  useEffect(() => {
    if (!showCustom) return;
    const handleClick = (e) => {
      if (customRef.current && !customRef.current.contains(e.target)) {
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showCustom]);

  // Use the server's "today" (from gotsConfig.serverToday) for all date
  // calculations.  This ensures the frontend's date ranges match the dates
  // stored in the analytics table, regardless of the browser's timezone.
  // We only fall back to the browser clock if the prop isn't available.
  const todayStr = serverToday || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  /** Subtract N days from a YYYY-MM-DD string and return YYYY-MM-DD. */
  const subtractDays = (dateStr, n) => {
    // Parse as noon UTC to avoid DST edge-cases when shifting days
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - n);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handlePreset = (key) => {
    setPreset(key);
    setShowCustom(false);

    if (key === "last7") {
      onChange({ dateFrom: subtractDays(todayStr, 6), dateTo: todayStr });
    } else if (key === "last30") {
      onChange({ dateFrom: subtractDays(todayStr, 29), dateTo: todayStr });
    } else if (key === "all") {
      onChange({ dateFrom: null, dateTo: null });
    } else if (key === "custom") {
      setShowCustom(true);
    }
  };

  const handleApplyCustom = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      setShowCustom(false);
      onChange({ dateFrom: customFrom, dateTo: customTo });
    }
  };

  const presetLabel = {
    last7: "Last 7 Days",
    last30: "Last 30 Days",
    all: "All Time",
    custom: "Custom Range",
  };

  return (
    <div style={styles.container}>
      <div style={styles.buttonGroup}>
        {["last7", "last30", "all", "custom"].map((key) => (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            style={{
              ...styles.presetButton,
              ...(preset === key ? styles.presetButtonActive : {}),
            }}
          >
            {presetLabel[key]}
          </button>
        ))}
      </div>

      {showCustom && (
        <div ref={customRef} style={styles.customPicker}>
          <div style={styles.customRow}>
            <label style={styles.customLabel}>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                max={customTo || todayStr}
                style={styles.dateInput}
              />
            </label>
            <label style={styles.customLabel}>
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom || undefined}
                max={todayStr}
                style={styles.dateInput}
              />
            </label>
            <button
              onClick={handleApplyCustom}
              disabled={!customFrom || !customTo || customFrom > customTo}
              style={{
                ...styles.applyButton,
                opacity: !customFrom || !customTo || customFrom > customTo ? 0.5 : 1,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
  },
  buttonGroup: {
    display: "flex",
    gap: "4px",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
    padding: "3px",
  },
  presetButton: {
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: "500",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "transparent",
    color: "#6b7280",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  presetButtonActive: {
    backgroundColor: "#fff",
    color: "#111827",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  customPicker: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    zIndex: 50,
  },
  customRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "12px",
  },
  customLabel: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#374151",
  },
  dateInput: {
    padding: "6px 10px",
    fontSize: "13px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
  },
  applyButton: {
    padding: "6px 16px",
    fontSize: "13px",
    fontWeight: "600",
    backgroundColor: "#7B2D26",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
