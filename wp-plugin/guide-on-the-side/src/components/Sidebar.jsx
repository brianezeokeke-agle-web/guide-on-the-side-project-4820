import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <Link to="/" style={styles.navLink}>Home</Link>
      <Link to="/tutorials" style={styles.navLink}>All Tutorials</Link>
      <Link to="/tutorials/published" style={styles.navLink}>Published</Link>
      <Link to="/tutorials/archived" style={styles.navLink}>Archived</Link>
      <div style={styles.navItem}>Settings</div>

      {/* empty scaffolding space for future navigation items */}
      <div style={{ flexGrow: 1 }} />
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "200px",
    backgroundColor: "#f9fafb",
    borderRight: "1px solid #e5e7eb",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  navItem: {
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    transition: "background-color 0.15s ease",
  },
  navLink: {
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    textDecoration: "none",
    transition: "background-color 0.15s ease",
  },
};
