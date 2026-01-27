import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function LandingDashboard() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1>Welcome to your Dashboard</h1>

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
  },
  main: {
    flexGrow: 1,
    padding: "32px",
  },
  cardContainer: {
    display: "flex",
    gap: "24px",
    marginTop: "32px",
  },
  primaryButton: {
    padding: "16px 24px",
    fontSize: "16px",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "16px 24px",
    fontSize: "16px",
    opacity: 0.6,
  },
};
