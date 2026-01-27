import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function TutorialListPage() {
  const [tutorials, setTutorials] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:4000/api/tutorials")
      .then((res) => res.json())
      .then((data) => setTutorials(data))
      .catch((err) => console.error("Failed to load tutorials", err));
  }, []);

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <div style={styles.header}>
          <h1>Your Tutorials</h1>
          <button onClick={() => navigate("/tutorials/new")}>
            New Tutorial
          </button>
        </div>

        {tutorials.length === 0 ? (
          <p>No tutorials yet. Click “New Tutorial” to get started.</p>
        ) : (
          <ul>
            {tutorials.map((tut) => (
              <li
                key={tut.tutorialId}
                style={styles.listItem}
                onClick={() => navigate(`/tutorials/${tut.tutorialId}/edit`)}
              >
                <strong>{tut.title}</strong> — {tut.status}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100vh" },
  main: { flexGrow: 1, padding: "32px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  listItem: {
    cursor: "pointer",
    padding: "8px 0",
  },
};
