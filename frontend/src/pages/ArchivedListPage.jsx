import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function ArchivedListPage() {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTutorials();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadTutorials() {
    try {
      const res = await fetch("http://localhost:4000/api/tutorials");
      const data = await res.json();
      // Only show archived tutorials
      const archivedTutorials = data.filter(t => t.archived === true);
      setTutorials(archivedTutorials);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function unarchiveTutorial(tutorialId) {
    const res = await fetch(`http://localhost:4000/api/tutorials/${tutorialId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (!res.ok) throw new Error("Failed to restore");
    return res.json();
  }

  const getSortedAndFilteredTutorials = () => {
    let result = [...tutorials];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "alphabetical":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "lastModified":
        result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      default:
        break;
    }

    return result;
  };

  const handleEdit = (tutorialId) => {
    setOpenDropdownId(null);
    navigate(`/tutorials/${tutorialId}/edit`);
  };

  const handleRestore = async (tutorialId) => {
    setOpenDropdownId(null);
    try {
      await unarchiveTutorial(tutorialId);
      loadTutorials();
    } catch (err) {
      console.error("Failed to restore tutorial:", err);
    }
  };

  const handleDelete = async (tutorialId) => {
    setOpenDropdownId(null);
    // TODO: Implement permanent delete functionality with confirmation
    console.log("Delete tutorial permanently:", tutorialId);
  };

  const toggleDropdown = (tutorialId) => {
    setOpenDropdownId(openDropdownId === tutorialId ? null : tutorialId);
  };

  const displayedTutorials = getSortedAndFilteredTutorials();

  if (loading) return <p style={styles.loadingText}>Loading archived tutorials…</p>;
  if (error) return <p style={styles.errorText}>Error: {error}</p>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>Archived Tutorials</h1>
          <Link to="/tutorials" style={styles.backLink}>
            ← Back to All Tutorials
          </Link>
        </div>
      </header>

      <div style={styles.controlsContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search archived tutorials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.sortFilterRow}>
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={styles.selectInput}
            >
              <option value="newest">Date Created (Newest)</option>
              <option value="oldest">Date Created (Oldest)</option>
              <option value="alphabetical">Alphabetical (A-Z)</option>
              <option value="lastModified">Last Modified</option>
            </select>
          </div>
        </div>
      </div>

      {displayedTutorials.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>
            {searchQuery.trim()
              ? "No archived tutorials match your search."
              : "Archived tutorials will appear here."}
          </p>
        </div>
      ) : (
        <ul style={styles.list}>
          {displayedTutorials.map((t) => (
            <li key={t.tutorialId} style={styles.listItem}>
              <div style={styles.tutorialInfo}>
                <span style={styles.tutorialTitle}>{t.title}</span>
                <span style={styles.archivedBadge}>Archived</span>
              </div>
              <div style={styles.actionsContainer} ref={openDropdownId === t.tutorialId ? dropdownRef : null}>
                <button
                  style={styles.menuButton}
                  onClick={() => toggleDropdown(t.tutorialId)}
                  aria-label="Tutorial actions"
                >
                  ⋮
                </button>
                {openDropdownId === t.tutorialId && (
                  <div style={styles.dropdownMenu}>
                    <button
                      style={styles.dropdownItem}
                      onClick={() => handleEdit(t.tutorialId)}
                    >
                      Edit
                    </button>
                    <button
                      style={styles.dropdownItem}
                      onClick={() => handleRestore(t.tutorialId)}
                    >
                      Restore
                    </button>
                    <button
                      style={{ ...styles.dropdownItem, color: "#dc2626" }}
                      onClick={() => handleDelete(t.tutorialId)}
                    >
                      Delete Permanently
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "40px 24px",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    marginBottom: "24px",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
  },
  backLink: {
    fontSize: "14px",
    color: "#7B2D26",
    textDecoration: "none",
    fontWeight: "500",
  },
  controlsContainer: {
    marginBottom: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  searchContainer: {
    width: "100%",
  },
  searchInput: {
    width: "100%",
    maxWidth: "400px",
    padding: "10px 14px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    outline: "none",
    boxSizing: "border-box",
  },
  sortFilterRow: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  controlLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  selectInput: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    backgroundColor: "#fff",
    cursor: "pointer",
    minWidth: "180px",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    border: "1px dashed #d1d5db",
  },
  emptyText: {
    fontSize: "16px",
    color: "#6b7280",
  },
  loadingText: {
    textAlign: "center",
    color: "#6b7280",
    padding: "40px",
  },
  errorText: {
    textAlign: "center",
    color: "#dc2626",
    padding: "40px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    transition: "box-shadow 0.15s ease",
  },
  tutorialInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  tutorialTitle: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#1f2937",
  },
  archivedBadge: {
    padding: "4px 8px",
    fontSize: "12px",
    fontWeight: "500",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    borderRadius: "4px",
  },
  actionsContainer: {
    position: "relative",
  },
  menuButton: {
    padding: "8px 12px",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    transition: "background-color 0.15s ease",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "4px",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    zIndex: 100,
    minWidth: "160px",
    overflow: "hidden",
  },
  dropdownItem: {
    display: "block",
    width: "100%",
    padding: "10px 16px",
    fontSize: "14px",
    color: "#374151",
    backgroundColor: "transparent",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
};
