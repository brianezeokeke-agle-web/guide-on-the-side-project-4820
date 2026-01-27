import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import SlideList from "../components/SlideList";

export default function TutorialEditorPage() {
  const { id } = useParams();


  const [tutorial, setTutorial] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedSlideId, setSelectedSlideId] = useState("");

  useEffect(() => {
    fetch(`http://localhost:4000/api/tutorials/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
  })
      .then((data) => {
        setTutorial(data);
        if (data?.slides?.length) {
          const sortedSlides = [...data.slides].sort(((a, b) => a.order - b.order)[0].slideId);
          setSelectedSlideId(sortedSlides[0].slideId);
        } else {
          setSelectedSlideId("");
        }
      })
      .catch((err) => console.error("Failed to load tutorial", err));
  }, [id]);

  const saveDraft = async () => {
    try{
      const res = await fetch(`http://localhost:4000/api/tutorials/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    setTutorial((prev) => (prev ? {...prev, status: "draft"} : prev));
    setStatusMsg("Draft saved");
  } catch (e) {
    console.error("Failed to save draft", e);
    setStatusMsg("Failed to save draft");
  }
};

  if (!tutorial) {
    return <div style={{ padding: "32px" }}>Loading tutorial...</div>;
  }

  return (
    <div style={{ padding: "32px" }}>
      <h1>Tutorial Editor ({tutorial.status})</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button disabled>Add Slides</button>
        <button onClick={saveDraft}>Save Draft</button>
      </div>

      {statusMsg && <p>{statusMsg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px"}}>
        <aside>
          <SlideList
            slides={tutorial.slides}
            selectedSlideId={selectedSlideId}
            onSelect={setSelectedSlideId}
            />
        </aside>

        <main style={{ border: "1px solid #ddd", padding: "12px", borderRadius: "8px"}}>
          <h3 style={{ marginTop: 0}}>Slide Editor</h3>
          <p>
            Selected slideId: <strong>{selectedSlideId || "(none)"}</strong>
            </p>
          <p>Slide editor UI coming next.</p>
        </main>
      </div>
    </div>
  );
}