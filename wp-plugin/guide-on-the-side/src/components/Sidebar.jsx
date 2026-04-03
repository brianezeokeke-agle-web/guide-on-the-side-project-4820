import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside style={styles.sidebar}>
      <Link
        to="/"
        style={{
          ...styles.navLink,
          ...(isActive("/") ? styles.navLinkActive : {}),
        }}
      >
        Home
      </Link>
      <Link
        to="/tutorials"
        style={{
          ...styles.navLink,
          ...(isActive("/tutorials") ? styles.navLinkActive : {}),
        }}
      >
        My Tutorials
      </Link>
      <Link
        to="/certificate-templates"
        style={{
          ...styles.navLink,
          ...(isActive("/certificate-templates") ? styles.navLinkActive : {}),
        }}
      >
        Certificates
      </Link>
      <Link
        to="/certificate-verify"
        style={{
          ...styles.navLink,
          ...(isActive("/certificate-verify") ? styles.navLinkActive : {}),
        }}
      >
        Verify certificate ID
      </Link>
      <div style={styles.navItem}>Settings</div>

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
  navLinkActive: {
    backgroundColor: "#f5e6e4",
    color: "#7B2D26",
    fontWeight: "600",
  },
};
