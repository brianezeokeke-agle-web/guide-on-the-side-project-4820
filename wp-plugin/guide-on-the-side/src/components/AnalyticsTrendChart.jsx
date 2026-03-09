import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

//the analyticsTrendChart is a line chart showing starts & completions over time.
export default function AnalyticsTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.title}>Starts &amp; Completions Over Time</h3>
        <p style={styles.empty}>No trend data available for this period.</p>
      </div>
    );
  }

  // Format date for the axis label (e.g., "Jan 5")
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Starts &amp; Completions Over Time</h3>
          <p style={styles.subtitle}>Daily tutorial usage trend</p>
        </div>
      </div>
      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              labelFormatter={formatDate}
              contentStyle={{
                fontSize: "13px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
            />
            <Line
              type="monotone"
              dataKey="starts"
              name="Starts"
              stroke="#7B2D26"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="completions"
              name="Completions"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
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
    width: "100%",
  },
  empty: {
    color: "#9ca3af",
    fontSize: "14px",
    textAlign: "center",
    padding: "60px 0",
    margin: 0,
  },
};
