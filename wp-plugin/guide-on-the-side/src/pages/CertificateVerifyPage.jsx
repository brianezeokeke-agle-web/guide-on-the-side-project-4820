import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { verifyCertificateById } from "../services/certificateTemplateApi";

export default function CertificateVerifyPage() {
  const [certificateId, setCertificateId] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await verifyCertificateById(certificateId);
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not verify.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <h1 style={styles.pageTitle}>Verify certificate ID</h1>
        <p style={styles.lead}>
          Enter the <strong>Certificate ID</strong> exactly as shown on the PDF (under
          &ldquo;Certificate ID:&rdquo;). Each issued certificate has its own ID, issue time, and name on
          file. While signed in here as staff, you will see the <strong>recipient name</strong> when the ID
          is valid. Unauthenticated lookups only confirm validity and metadata, not the name.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label htmlFor="gots-cert-verify-id" style={styles.label}>
            Certificate ID
          </label>
          <input
            id="gots-cert-verify-id"
            type="text"
            value={certificateId}
            onChange={(e) => setCertificateId(e.target.value)}
            placeholder="e.g. 3f2a1b4c-…"
            style={styles.input}
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.button, opacity: 0.65 } : styles.button}
          >
            {loading ? "Checking…" : "Verify"}
          </button>
        </form>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {result && (
          <div
            style={
              result.valid ? styles.resultOk : styles.resultBad
            }
          >
            {result.valid ? (
              <>
                <p style={styles.resultTitle}>This certificate ID is valid</p>
                <ul style={styles.resultList}>
                  {result.recipient_name ? (
                    <li>
                      <strong>Recipient name:</strong> {result.recipient_name}
                    </li>
                  ) : null}
                  <li>
                    <strong>Tutorial:</strong> {result.tutorial_title || "(untitled or removed)"}
                  </li>
                  <li>
                    <strong>Issued:</strong> {result.issued_at || "—"}
                  </li>
                  <li>
                    <strong>Status:</strong> {result.status || "—"}
                  </li>
                  {result.certificate_id ? (
                    <li>
                      <strong>Certificate ID:</strong> {result.certificate_id}
                    </li>
                  ) : null}
                </ul>
              </>
            ) : (
              <p style={styles.resultTitle}>No certificate found for this ID</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  main: {
    flex: 1,
    padding: "32px",
    maxWidth: "640px",
    backgroundColor: "#f9fafb",
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    marginTop: 0,
    marginBottom: "12px",
  },
  lead: {
    fontSize: "15px",
    color: "#4b5563",
    lineHeight: 1.55,
    marginBottom: "24px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "20px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "10px 12px",
    fontSize: "15px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  button: {
    alignSelf: "flex-start",
    marginTop: "4px",
    padding: "10px 22px",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: "#7B2D26",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  errorBanner: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "16px",
  },
  resultOk: {
    backgroundColor: "#ecfdf5",
    border: "1px solid #6ee7b7",
    borderRadius: "10px",
    padding: "16px 20px",
    marginTop: "8px",
  },
  resultBad: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "16px 20px",
    marginTop: "8px",
  },
  resultTitle: {
    fontSize: "16px",
    fontWeight: "700",
    marginTop: 0,
    marginBottom: "10px",
    color: "#111827",
  },
  resultList: {
    margin: 0,
    paddingLeft: "20px",
    fontSize: "14px",
    color: "#374151",
    lineHeight: 1.7,
  },
};
