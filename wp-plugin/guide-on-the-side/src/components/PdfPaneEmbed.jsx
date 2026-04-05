/**
 * In-slide PDF viewer: <object> for native PDF rendering where supported,
 * with <iframe> fallback (HTML5 content inside <object>).
 */
export default function PdfPaneEmbed({ url, title = "PDF document", compact = false }) {
  const height = compact ? "320px" : "min(70vh, 720px)";

  return (
    <div
      style={{
        width: "100%",
        height,
        minHeight: compact ? "280px" : "420px",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#525659",
      }}
    >
      <object
        data={url}
        type="application/pdf"
        aria-label={title}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      >
        <iframe
          src={url}
          title={title}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            minHeight: compact ? "280px" : "420px",
            border: "none",
            backgroundColor: "#f3f4f6",
          }}
        />
      </object>
    </div>
  );
}
