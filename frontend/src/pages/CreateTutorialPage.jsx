import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function CreateTutorialPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const createTutorial = async (mode) => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/api/tutorials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      const newTutorial = await res.json();

      if (mode === "save") {
        navigate("/tutorials");
      } else if (mode === "edit") {
        navigate(`/tutorials/${newTutorial.tutorialId}/edit`);
      }
    } catch (err) {
      setError("Failed to create tutorial");
    }
  };

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <h1 style={styles.heading}>Create Tutorial</h1>

        <div style={styles.form}>
          <label style={styles.label}>
            <span style={styles.labelText}>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              placeholder="Enter tutorial title..."
            />
          </label>

          <label style={styles.label}>
            <span style={styles.labelText}>Description (optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
              placeholder="Enter an optional description..."
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={() => createTutorial("save")}>
              Save Draft
            </button>

            <button style={styles.primaryButton} onClick={() => createTutorial("edit")}>
              Add Slides
            </button>
          </div>
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
    margin: "0 0 24px 0",
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "480px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
  },
  labelText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxSizing: "border-box",
    minHeight: "100px",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
  },
  error: {
    color: "#dc2626",
    fontSize: "14px",
    margin: 0,
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  primaryButton: {
    padding: "10px 20px",
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
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    transition: "all 0.15s ease",
  },
};
