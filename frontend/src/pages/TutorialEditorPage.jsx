import { useParams } from "react-router-dom";
import { useState } from "react";

export default function TutorialEditorPage() {
  const { id } = useParams();
  const [status, setStatus] = useState("");

  const saveDraft = async () => {
    await fetch(`http://localhost:4000/api/tutorials/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });

    setStatus("Draft saved");
  };

  return (
    <div style={{ padding: "32px" }}>
      <h1>Tutorial Editor (Draft)</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button disabled>Add Slides</button>
        <button onClick={saveDraft}>Save Draft</button>
      </div>

      {status && <p>{status}</p>}

      <p>Slide editor UI coming next.</p>
    </div>
  );
}