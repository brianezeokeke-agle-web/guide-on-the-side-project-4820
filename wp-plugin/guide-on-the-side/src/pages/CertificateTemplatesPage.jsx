import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from "../services/certificateTemplateApi";

const PRESETS = ["classic", "minimal", "formal"];
const FONTS   = [
  "Georgia", "Times New Roman", "Arial", "Helvetica",
  "Verdana", "Tahoma", "Trebuchet MS", "Palatino Linotype",
];

const EMPTY_CONFIG = {
  title:           "Certificate of Completion",
  subtitle:        "This certifies that",
  body_text:       "{{recipient_name}} has successfully completed {{tutorial_title}} on {{completion_date}}.",
  issuer_name:     "{{issuer_name}}",
  signature_label: "Authorized Signature",
  accent_color:    "#2563eb",
  font_family:     "Georgia",
  show_border:     true,
  show_seal:       false,
};

const EMPTY_FORM = {
  name:        "",
  layout_type: "classic",
  is_default:  false,
  config_json: { ...EMPTY_CONFIG },
};

export default function CertificateTemplatesPage() {
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [editingId, setEditingId]   = useState(null); // null = new
  const [form, setForm]             = useState(EMPTY_FORM);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowForm(true);
  }

  function openEdit(template) {
    setEditingId(template.id);
    setForm({
      name:        template.name,
      layout_type: template.layout_type,
      is_default:  !!template.is_default,
      config_json: { ...EMPTY_CONFIG, ...template.config_json },
    });
    setSaveError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setSaveError(null);
  }

  function setConfigField(key, value) {
    setForm((prev) => ({
      ...prev,
      config_json: { ...prev.config_json, [key]: value },
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Template name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name:        form.name.trim(),
        layout_type: form.layout_type,
        is_default:  form.is_default,
        config_json: form.config_json,
      };
      if (editingId) {
        await updateTemplate(editingId, payload);
      } else {
        await createTemplate(payload);
      }
      await loadTemplates();
      closeForm();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(template) {
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    try {
      await deleteTemplate(template.id);
      await loadTemplates();
      if (editingId === template.id) closeForm();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      await previewTemplate(editingId || 0, form.config_json);
    } catch (err) {
      setSaveError("Preview failed: " + err.message);
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Certificate Templates</h1>
          <button onClick={openNew} style={styles.primaryButton}>
            + New Template
          </button>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {loading ? (
          <p style={styles.loadingText}>Loading templates…</p>
        ) : (
          <div style={styles.templateGrid}>
            {templates.length === 0 && (
              <p style={styles.emptyText}>
                No templates yet. Create one to get started.
              </p>
            )}
            {templates.map((t) => (
              <div key={t.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardName}>{t.name}</span>
                  {t.is_default ? (
                    <span style={styles.defaultBadge}>Default</span>
                  ) : null}
                </div>
                <div style={styles.cardMeta}>
                  Preset: <strong>{t.layout_type}</strong>
                </div>
                <div style={styles.cardActions}>
                  <button onClick={() => openEdit(t)} style={styles.editButton}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(t)} style={styles.deleteButton}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>
                {editingId ? "Edit Template" : "New Template"}
              </h2>

              {saveError && <div style={styles.errorBanner}>{saveError}</div>}

              {/* Name */}
              <label style={styles.fieldLabel}>Template Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                style={styles.textInput}
                maxLength={191}
              />

              {/* Preset */}
              <label style={styles.fieldLabel}>Preset Layout</label>
              <select
                value={form.layout_type}
                onChange={(e) => setForm((p) => ({ ...p, layout_type: e.target.value }))}
                style={styles.selectInput}
              >
                {PRESETS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>

              {/* Config fields */}
              {[
                { key: "title",           label: "Title" },
                { key: "subtitle",        label: "Subtitle" },
                { key: "body_text",       label: "Body Text" },
                { key: "issuer_name",     label: "Issuer Name" },
                { key: "signature_label", label: "Signature Label" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={styles.fieldLabel}>{label}</label>
                  <input
                    type="text"
                    value={form.config_json[key] || ""}
                    onChange={(e) => setConfigField(key, e.target.value)}
                    style={styles.textInput}
                    maxLength={500}
                  />
                </div>
              ))}

              {/* Accent color */}
              <label style={styles.fieldLabel}>Accent Color</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                <input
                  type="color"
                  value={form.config_json.accent_color || "#2563eb"}
                  onChange={(e) => setConfigField("accent_color", e.target.value)}
                  style={{ width: "40px", height: "32px", border: "none", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={form.config_json.accent_color || "#2563eb"}
                  onChange={(e) => setConfigField("accent_color", e.target.value)}
                  style={{ ...styles.textInput, marginBottom: 0, width: "120px" }}
                  maxLength={7}
                />
              </div>

              {/* Font family */}
              <label style={styles.fieldLabel}>Font Family</label>
              <select
                value={form.config_json.font_family || "Georgia"}
                onChange={(e) => setConfigField("font_family", e.target.value)}
                style={styles.selectInput}
              >
                {FONTS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              {/* Toggles */}
              <div style={{ display: "flex", gap: "24px", marginBottom: "12px" }}>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!form.config_json.show_border}
                    onChange={(e) => setConfigField("show_border", e.target.checked)}
                  />
                  Show Border
                </label>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!form.config_json.show_seal}
                    onChange={(e) => setConfigField("show_seal", e.target.checked)}
                  />
                  Show Seal
                </label>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!form.is_default}
                    onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                  />
                  Set as Default
                </label>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={saving ? { ...styles.primaryButton, opacity: 0.6 } : styles.primaryButton}
                >
                  {saving ? "Saving…" : "Save Template"}
                </button>
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  style={previewing ? { ...styles.secondaryButton, opacity: 0.6 } : styles.secondaryButton}
                >
                  {previewing ? "Opening…" : "Preview PDF"}
                </button>
                <button onClick={closeForm} style={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
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
    backgroundColor: "#f9fafb",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  loadingText: { color: "#6b7280" },
  emptyText:   { color: "#6b7280", fontStyle: "italic" },
  errorBanner: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  templateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "16px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  cardName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#111827",
  },
  defaultBadge: {
    fontSize: "11px",
    fontWeight: "600",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "2px 8px",
    borderRadius: "99px",
  },
  cardMeta: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "12px",
  },
  cardActions: { display: "flex", gap: "8px" },
  editButton: {
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "500",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "500",
    backgroundColor: "#fff",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    borderRadius: "6px",
    cursor: "pointer",
  },
  primaryButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: "#7B2D26",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    backgroundColor: "white",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "28px",
    width: "100%",
    maxWidth: "520px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827",
    marginTop: 0,
    marginBottom: "20px",
  },
  fieldLabel: {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "4px",
  },
  textInput: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    marginBottom: "12px",
    boxSizing: "border-box",
    outline: "none",
  },
  selectInput: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    marginBottom: "12px",
    boxSizing: "border-box",
    backgroundColor: "white",
  },
};
