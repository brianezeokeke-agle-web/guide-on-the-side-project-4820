//a single metric card for the analytics dashboard.
//Displays a label, a formatted value, and an optional description or
//color accent for visual hierarchy.
export default function AnalyticsSummaryCard({ label, value, description, accentColor }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.accentBar, backgroundColor: accentColor || "#7B2D26" }} />
      <div style={styles.body}>
        <span style={styles.label}>{label}</span>
        <span style={styles.value}>{value}</span>
        {description && <span style={styles.description}>{description}</span>}
      </div>
    </div>
  );
}

const styles = {
  card: {
    flex: "1 1 0",
    minWidth: "160px",
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  accentBar: {
    height: "4px",
    width: "100%",
  },
  body: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  value: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#111827",
    lineHeight: "1.2",
  },
  description: {
    fontSize: "12px",
    color: "#9ca3af",
    marginTop: "2px",
  },
};
