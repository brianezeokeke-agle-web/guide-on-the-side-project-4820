/**
 * TutorialThemesPage
 *
 * Theme template management page.
 * Modeled directly after CertificateTemplatesPage.jsx.
 *
 * Supports:
 *  - List themes
 *  - Create theme (modal form)
 *  - Edit theme (modal form)
 *  - Soft-delete with confirmation if tutorials are using the theme
 *  - Set default via checkbox in form
 */

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  listTutorialThemes,
  createTutorialTheme,
  updateTutorialTheme,
  deleteTutorialTheme,
} from "../services/tutorialThemeApi";
import { THEME_TOKEN_DEFAULTS, THEME_FIELD_DEFS } from "../services/themeSchema";

const EMPTY_CONFIG = { ...THEME_TOKEN_DEFAULTS };

const EMPTY_FORM = {
  name:        "",
  is_default:  false,
  config_json: { ...EMPTY_CONFIG },
};

export default function TutorialThemesPage() {
  const [themes, setThemes]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [editingId, setEditingId] = useState(null); // null = new
  const [form, setForm]           = useState(EMPTY_FORM);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    loadThemes();
  }, []);

  async function loadThemes() {
    setLoading(true);
    setError(null);
    try {
      const data = await listTutorialThemes();
      setThemes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, config_json: { ...EMPTY_CONFIG } });
    setSaveError(null);
    setShowForm(true);
  }

  function openEdit(theme) {
    setEditingId(theme.id);
    setForm({
      name:        theme.name,
      is_default:  Number(theme.is_default) === 1,
      config_json: { ...EMPTY_CONFIG, ...theme.config_json },
    });
    setSaveError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setSaveError(null);
  }

  function setToken(key, value) {
    setForm((prev) => ({
      ...prev,
      config_json: { ...prev.config_json, [key]: value },
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Theme name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name:        form.name.trim(),
        is_default:  form.is_default,
        config_json: form.config_json,
      };
      if (editingId) {
        await updateTutorialTheme(editingId, payload);
      } else {
        await createTutorialTheme(payload);
      }
      await loadThemes();
      closeForm();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(theme) {
    try {
      // First call: check if any tutorials use this theme
      const check = await deleteTutorialTheme(theme.id);

      if (check.confirmRequired) {
        const published = check.affectedTutorials.filter((t) => t.status === "published");
        const drafts    = check.affectedTutorials.filter((t) => t.status !== "published");

        let message = `Delete theme "${theme.name}"?\n\n`;
        message += `This theme is used by ${check.affectedTutorials.length} tutorial(s):\n\n`;
        if (published.length > 0) {
          message += `LIVE (published):\n`;
          published.forEach((t) => { message += `  • ${t.title}\n`; });
          message += `\nThese tutorials will fall back to the default theme.\n\n`;
        }
        if (drafts.length > 0) {
          message += `Drafts:\n`;
          drafts.forEach((t) => { message += `  • ${t.title}\n`; });
          message += `\n`;
        }
        message += `Do you want to proceed?`;

        if (!window.confirm(message)) return;

        await deleteTutorialTheme(theme.id, { confirmed: true });
      } else if (!check.deleted) {
        if (!window.confirm(`Delete theme "${theme.name}"?\n\nThis action cannot be undone.`)) return;
        await deleteTutorialTheme(theme.id, { confirmed: true });
      }

      await loadThemes();
      if (editingId === theme.id) closeForm();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.pageTitle}>Tutorial Themes</h1>
          <button onClick={openNew} style={styles.primaryButton}>
            New Theme
          </button>
        </div>

        <p style={styles.helpText}>
          Themes control the outer appearance of tutorials during student playback
          (background color, accent color, font, and button style).
          Per-slide overrides can be configured from within the tutorial editor.
        </p>

        {error && <div style={styles.errorBanner}>{error}</div>}

        {loading ? (
          <p style={styles.loadingText}>Loading themes…</p>
        ) : (
          <div style={styles.themeGrid}>
            {themes.length === 0 && (
              <p style={styles.emptyText}>
                No themes yet. Create one to get started, or tutorials will use the built-in default.
              </p>
            )}
            {themes.map((t) => (
              <div key={t.id} style={styles.card}>
                {/* Color swatch preview */}
                <div
                  style={{
                    ...styles.cardSwatch,
                    backgroundColor: t.config_json?.backgroundColor || "#ffffff",
                    borderBottom: `4px solid ${t.config_json?.primaryColor || "#7B2D26"}`,
                  }}
                />
                <div style={styles.cardBody}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardName}>{t.name}</span>
                    {Number(t.is_default) === 1 ? (
                      <span style={styles.defaultBadge}>Default</span>
                    ) : null}
                  </div>
                  <div style={styles.cardMeta}>
                    Font: <strong>{t.config_json?.fontFamily || "Arial"}</strong>
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
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>
                {editingId ? "Edit Theme" : "New Theme"}
              </h2>

              {saveError && <div style={styles.errorBanner}>{saveError}</div>}

              {/* Name */}
              <label style={styles.fieldLabel}>Theme Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                style={styles.textInput}
                maxLength={191}
              />

              {/* Token fields driven by THEME_FIELD_DEFS */}
              {THEME_FIELD_DEFS.map(({ key, label, type, options }) => (
                <div key={key}>
                  <label style={styles.fieldLabel}>{label}</label>
                  {type === "color" && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
                      <input
                        type="color"
                        value={form.config_json[key] || "#ffffff"}
                        onChange={(e) => setToken(key, e.target.value)}
                        style={{ width: "40px", height: "32px", border: "none", cursor: "pointer" }}
                      />
                      <input
                        type="text"
                        value={form.config_json[key] || ""}
                        onChange={(e) => setToken(key, e.target.value)}
                        style={{ ...styles.textInput, marginBottom: 0, width: "120px" }}
                        maxLength={7}
                        placeholder="#rrggbb"
                      />
                    </div>
                  )}
                  {type === "select" && (
                    <select
                      value={form.config_json[key] || ""}
                      onChange={(e) => setToken(key, e.target.value)}
                      style={styles.selectInput}
                    >
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                  {type === "bool" && (
                    <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer", marginBottom: "12px" }}>
                      <input
                        type="checkbox"
                        checked={!!form.config_json[key]}
                        onChange={(e) => setToken(key, e.target.checked)}
                      />
                      {label}
                    </label>
                  )}
                </div>
              ))}

              {/* Set as default */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: form.is_default && editingId ? "not-allowed" : "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!form.is_default}
                    disabled={!!form.is_default && !!editingId}
                    onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
                  />
                  Set as Default
                  {!!form.is_default && !!editingId && (
                    <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "4px" }}>
                      (set another theme as default to change this)
                    </span>
                  )}
                </label>
              </div>

              {/* Actions */}
              <div style={styles.modalActions}>
                <button onClick={closeForm} style={styles.cancelButton} disabled={saving}>
                  Cancel
                </button>
                <button onClick={handleSave} style={styles.saveButton} disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Theme"}
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
    backgroundColor: "#fff",
    overflow: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  pageTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
  },
  helpText: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "24px",
    maxWidth: "640px",
  },
  primaryButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    backgroundColor: "#7B2D26",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  errorBanner: {
    padding: "12px 16px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    color: "#dc2626",
    fontSize: "14px",
    marginBottom: "16px",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: "14px",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "14px",
  },
  themeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "16px",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardSwatch: {
    height: "48px",
    flexShrink: 0,
  },
  cardBody: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifyContent: "space-between",
  },
  cardName: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#111827",
  },
  defaultBadge: {
    fontSize: "11px",
    fontWeight: "500",
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "2px 7px",
    borderRadius: "9999px",
  },
  cardMeta: {
    fontSize: "12px",
    color: "#6b7280",
  },
  cardActions: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  editButton: {
    padding: "5px 10px",
    fontSize: "13px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "5px 10px",
    fontSize: "13px",
    backgroundColor: "#fff",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "4px",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "48px",
    zIndex: 1000,
    overflowY: "auto",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "28px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    marginBottom: "48px",
  },
  modalTitle: {
    margin: "0 0 20px 0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#111827",
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
    borderRadius: "5px",
    outline: "none",
    marginBottom: "12px",
    boxSizing: "border-box",
  },
  selectInput: {
    width: "100%",
    padding: "8px 10px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "5px",
    backgroundColor: "#fff",
    marginBottom: "12px",
    boxSizing: "border-box",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    marginTop: "8px",
  },
  cancelButton: {
    padding: "8px 16px",
    fontSize: "14px",
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
  },
  saveButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "500",
    backgroundColor: "#7B2D26",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
