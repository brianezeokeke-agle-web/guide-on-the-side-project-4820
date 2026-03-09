import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

//SlidePerformanceTable — table + optional bar chart showing per-slide
//views, proceeds, and conversion rate.
export default function SlidePerformanceTable({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.title}>Slide Performance</h3>
        <p style={styles.empty}>No slide analytics data available for this period.</p>
      </div>
    );
  }

  const pct = (rate) => `${(rate * 100).toFixed(1)}%`;

  // Color for conversion rate — red/yellow/green gradient
  const rateColor = (rate) => {
    if (rate >= 0.7) return "#059669";
    if (rate >= 0.4) return "#d97706";
    return "#dc2626";
  };

  // Chart data — truncated labels
  const chartData = data.map((d) => ({
    name: d.title?.length > 18 ? d.title.slice(0, 16) + "…" : d.title || `Slide ${d.order}`,
    Views: d.views,
    Proceeds: d.proceeds,
  }));

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Slide Performance</h3>
          <p style={styles.subtitle}>Views, proceeds, and conversion rate per slide</p>
        </div>
      </div>

      {/* Bar chart visualization */}
      {data.some((d) => d.views > 0 || d.proceeds > 0) && (
        <div style={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40 + 60)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                width={130}
              />
              <Tooltip
                contentStyle={{
                  fontSize: "13px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }} />
              <Bar dataKey="Views" fill="#7B2D26" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="Proceeds" fill="#059669" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Data table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: "50px" }}>#</th>
              <th style={styles.th}>Slide</th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                Views <span style={styles.infoIcon} title="How many times a slide was viewed">ⓘ</span>
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                Proceeds <span style={styles.infoIcon} title="How many times a student clicked Next on this slide">ⓘ</span>
              </th>
              <th style={{ ...styles.th, textAlign: "right" }}>
                Conversion <span style={styles.infoIcon} title="Percentage of viewers who proceeded to the next slide">ⓘ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((slide) => (
              <tr
                key={slide.slideId}
                style={{
                  ...styles.tr,
                  ...(slide.conversionRate < 0.4 && slide.views > 0 ? styles.trLowConversion : {}),
                }}
              >
                <td style={{ ...styles.td, color: "#9ca3af" }}>{slide.order}</td>
                <td style={styles.td}>{slide.title || `Slide ${slide.order}`}</td>
                <td style={{ ...styles.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {slide.views.toLocaleString()}
                </td>
                <td style={{ ...styles.td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {slide.proceeds.toLocaleString()}
                </td>
                <td style={{ ...styles.td, textAlign: "right" }}>
                  <span
                    style={{
                      ...styles.rateBadge,
                      color: slide.views > 0 ? rateColor(slide.conversionRate) : "#9ca3af",
                      backgroundColor: slide.views > 0
                        ? rateColor(slide.conversionRate) + "14"
                        : "#f3f4f6",
                    }}
                  >
                    {slide.views > 0 ? pct(slide.conversionRate) : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: "13px",
    color: "#9ca3af",
    margin: "4px 0 0 0",
  },
  chartWrapper: {
    marginBottom: "24px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontWeight: "600",
    color: "#6b7280",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "2px solid #e5e7eb",
  },
  tr: {
    transition: "background-color 0.1s ease",
  },
  trLowConversion: {
    backgroundColor: "#fef2f2",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    color: "#374151",
  },
  rateBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "600",
  },
  infoIcon: {
    cursor: "help",
    fontSize: "13px",
    color: "#9ca3af",
    marginLeft: "4px",
  },
  empty: {
    color: "#9ca3af",
    fontSize: "14px",
    textAlign: "center",
    padding: "48px 0",
    margin: 0,
  },
};
