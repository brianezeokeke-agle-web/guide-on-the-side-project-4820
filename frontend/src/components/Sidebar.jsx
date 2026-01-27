export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.navItem}>Home</div>
      <div style={styles.navItem}>Users</div>
      <div style={styles.navItem}>Settings</div>

      {/* empty scaffolding space for future navigation items */}
      <div style={{ flexGrow: 1 }} />
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "200px",
    background: "#f4f4f4",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  navItem: {
    cursor: "pointer",
  },
};
