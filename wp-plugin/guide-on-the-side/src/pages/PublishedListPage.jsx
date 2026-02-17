import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { listTutorials, updateTutorial } from "../services/tutorialApi";

//helper function to get relative time for last edited display
function getRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 365) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export default function PublishedListPage() {
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
      setLoading(true);
      const data = await listTutorials();
      // Only show published, non-archived tutorials
      const publishedTutorials = data.filter(t => t.status === "published" && !t.archived);
      setTutorials(publishedTutorials);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function archiveTutorial(tutorialId) {
    await updateTutorial(tutorialId, { archived: true });
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

  const toggleDropdown = (e, tutorialId) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === tutorialId ? null : tutorialId);
  };

  const handleEdit = (e, tutorialId) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    navigate(`/tutorials/${tutorialId}/edit`);
  };

  const handleArchive = async (e, tutorialId) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    try {
      await archiveTutorial(tutorialId);
      // Remove from local state since it's now archived
      setTutorials((prev) => prev.filter((t) => t.tutorialId !== tutorialId));
    } catch (err) {
      console.error("Failed to archive tutorial:", err);
    }
  };

  const handleUnpublish = (e, tutorialId) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    // TODO: Implement unpublish functionality
    alert("Unpublish functionality coming soon!");
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    alert("Preview functionality coming soon!");
  };

  const displayedTutorials = getSortedAndFilteredTutorials();

  if (loading) return <p style={styles.loadingText}>Loading published tutorials…</p>;
  if (error) return <p style={styles.errorText}>Error: {error}</p>;

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Published Tutorials</h1>
          <Link to="/tutorials" style={styles.backLink}>
            Back to All Tutorials
          </Link>
        </div>

      <div style={styles.controlsContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search published tutorials..."
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
          <p style={styles.emptyText}>
            {searchQuery.trim()
              ? "No published tutorials match your search."
              : "Published tutorials will appear here."}
          </p>
        ) : (
        <ul style={styles.list}>
          {displayedTutorials.map((tut) => (
            <li
              key={tut.tutorialId}
              style={styles.listItem}
              onClick={() => navigate(`/tutorials/${tut.tutorialId}/edit`)}
            >
              <div style={styles.listItemLeft}>
                <span style={styles.listItemTitle}>{tut.title}</span>
                <span style={styles.lastModified}>Last modified {getRelativeTime(tut.updatedAt)}</span>
              </div>
              <div style={styles.listItemRight}>
                <span style={styles.statusBadge}>published</span>
                <div style={styles.dropdownContainer} ref={openDropdownId === tut.tutorialId ? dropdownRef : null}>
                  <button
                    style={styles.dropdownButton}
                    onClick={(e) => toggleDropdown(e, tut.tutorialId)}
                    title="Actions"
                  >
                    ▼
                  </button>
                  {openDropdownId === tut.tutorialId && (
                    <div style={styles.dropdownMenu}>
                      <button
                        style={styles.dropdownItem}
                        onClick={(e) => handleEdit(e, tut.tutorialId)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.dropdownItem}
                        onClick={(e) => handleUnpublish(e, tut.tutorialId)}
                      >
                        Unpublish
                      </button>
                      <button
                        style={styles.dropdownItem}
                        onClick={(e) => handleArchive(e, tut.tutorialId)}
                      >
                        Archive
                      </button>
                      <button
                        style={styles.dropdownItem}
                        onClick={handlePreview}
                      >
                        Preview
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        )}
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  heading: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
    color: "#111827",
  },
  backLink: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: "#7B2D26",
    color: "#fff",
    textDecoration: "none",
    border: "none",
    borderRadius: "6px",
    transition: "background-color 0.15s ease",
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
  emptyText: {
    color: "#6b7280",
    fontSize: "14px",
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
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    padding: "12px 16px",
    marginBottom: "8px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fafafa",
    transition: "all 0.3s ease",
  },
  listItemLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  listItemTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#111827",
  },
  lastModified: {
    fontSize: "12px",
    color: "#6b7280",
  },
  listItemRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "500",
    borderRadius: "9999px",
    backgroundColor: "#dcfce7",
    color: "#166534",
    textTransform: "capitalize",
  },
  dropdownContainer: {
    position: "relative",
  },
  dropdownButton: {
    padding: "6px 10px",
    fontSize: "10px",
    cursor: "pointer",
    backgroundColor: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    color: "#374151",
    transition: "background-color 0.15s ease",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "4px",
    minWidth: "140px",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    zIndex: 100,
    overflow: "hidden",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#374151",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.15s ease",
  },
};
