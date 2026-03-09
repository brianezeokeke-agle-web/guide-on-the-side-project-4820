import { useEffect, useState } from "react";

export default function CompletedTutorialsPage() {
    const [completed, setCompleted] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCompleted() {
            try {
                const res = await fetch("/wp-json/gots/v1/completed", {
                    credentials: "include",
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = await res.json();
                setCompleted(Array.isArray(data) ? data:[]);
            }   catch (e) {
                setError(e.message || "Failed to load complete tutorials");
            }
        }

        loadCompleted();
    }, []);

    return (
        <div style={{ padding: 24 }} >
            <h1>Completed Tutorials</h1>

            {error && <p style={{ color: "crimson"}}>{error}</p>}
            
            {completed.length === 0 ? ( 
                <p>No completed tutorials yet.</p>
            ) : (
                <ul>
                    {completed.map((item) => (
                        <l1 key={item.tutorialId || item}>
                            {item.title ? item.title: `Tutorial ID: ${item.tutorialId || item}`}
                        </l1>
                    ))}
                </ul>
            )}
        </div>
    );

}