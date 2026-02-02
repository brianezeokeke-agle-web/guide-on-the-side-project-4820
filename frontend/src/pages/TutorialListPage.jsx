import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function TutorialListPage() {
  const [tutorials, setTutorials] = useState([]);
  const [highlightId, setHighlightId] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetch("http://localhost:4000/api/tutorials")
      .then((res) => res.json())
      .then((data) => setTutorials(data))
      .catch((err) => console.error("Failed to load tutorials", err));
  }, []);

  // handle tutorial highlight from query param
  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setHighlightId(highlight);
      // clear the query param from URL
      setSearchParams({});
      // remove highlight after animation
      setTimeout(() => {
        setHighlightId(null);
      }, 1500);
    }
  }, [searchParams, setSearchParams]);

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Your Tutorials</h1>
          <button
            style={styles.newButton}
            onClick={() => navigate("/tutorials/new")}
          >
            New Tutorial
          </button>
        </div>

        {tutorials.length === 0 ? (
          <p style={styles.emptyText}>No tutorials yet. Click "New Tutorial" to get started.</p>
        ) : (
          <ul style={styles.list}>
            {tutorials.map((tut) => (
              <li
                key={tut.tutorialId}
                style={{
                  ...styles.listItem,
                  ...(highlightId === tut.tutorialId ? styles.listItemHighlight : {}),
                }}
                onClick={() => navigate(`/tutorials/${tut.tutorialId}/edit`)}
              >
                <span style={styles.listItemTitle}>{tut.title}</span>
                <span style={styles.statusBadge}>{tut.status}</span>
              </li>
            ))}
          </ul>
        )}
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  heading: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
  },
  newButton: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: "#7B2D26",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    transition: "background-color 0.15s ease",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "14px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    padding: "12px 16px",
    marginBottom: "8px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fafafa",
    transition: "all 0.3s ease",
  },
  listItemHighlight: {
    backgroundColor: "#f5e6e4",
    borderColor: "#7B2D26",
    boxShadow: "0 0 0 2px rgba(123, 45, 38, 0.2)",
  },
  listItemTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#111827",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "9999px",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    textTransform: "capitalize",
  },
};
