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
        <h1>Create Tutorial</h1>

        <div style={styles.form}>
          <label style={styles.label}>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
            />
          </label>

          {error && <p style={{ color: "red" }}>{error}</p>}

          <div style={styles.actions}>
            <button onClick={() => createTutorial("save")}>
              Save Draft
            </button>

            <button onClick={() => createTutorial("edit")}>
              Add Slides
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100vh" },
  main: { flexGrow: 1, padding: "32px" },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "400px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  input: {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    boxSizing: "border-box",
    minHeight: "100px",
    resize: "vertical",
  },
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
  },
};
