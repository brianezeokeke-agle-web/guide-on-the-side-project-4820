import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function LandingDashboard() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.heading}>Welcome to your Dashboard</h1>

        <div style={styles.cardContainer}>
          <button
            style={styles.primaryButton}
            onClick={() => navigate("/tutorials")}
          >
            Get Started
          </button>

          <button style={styles.secondaryButton} disabled>
            Add User (Coming Soon)
          </button>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  main: {
    flexGrow: 1,
    padding: "32px",
    backgroundColor: "#fff",
  },
  heading: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
  },
  cardContainer: {
    display: "flex",
    gap: "16px",
    marginTop: "32px",
  },
  primaryButton: {
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: "#7B2D26",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    transition: "background-color 0.15s ease",
  },
  secondaryButton: {
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "500",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    opacity: 0.6,
    cursor: "not-allowed",
  },
};
