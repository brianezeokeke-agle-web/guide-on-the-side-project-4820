import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function TutorialListPage() {
  const [tutorials, setTutorials] = useState([]);
  const [filteredTutorials, setFilteredTutorials] = useState([]);
  const [highlightId, setHighlightId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetch("http://localhost:4000/api/tutorials")
      .then((res) => res.json())
      .then((data) => {
        // filter out archived tutorials for the main list (show drafts and published, not archived)
        const activeTutorials = data.filter((t) => !t.archived);
        setTutorials(activeTutorials);
      })
      .catch((err) => console.error("Failed to load tutorials", err));
  }, []);

  // Apply search and sort whenever tutorials, searchQuery, sortBy, or filterBy changes
  useEffect(() => {
    let result = [...tutorials];

    // Apply status filter
    if (filterBy === "unpublished") {
      result = result.filter((t) => t.status === "draft");
    }
    // "all" shows all active (non-archived) tutorials

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "alphabetical-desc":
          return b.title.localeCompare(a.title);
        case "newest":
          return new Date(b.createdAt) - new Date(a.createdAt);
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "modified-newest":
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case "modified-oldest":
          return new Date(a.updatedAt) - new Date(b.updatedAt);
        default:
          return 0;
      }
    });

    setFilteredTutorials(result);
  }, [tutorials, searchQuery, sortBy, filterBy]);

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // handle tutorial highlight from query param
  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setHighlightId(highlight);
      // clear the query param from URL
      setSearchParams({});
      // remove highlight after animation
      setTimeout(() => {
        setHighlightId(null);
      }, 1500);
    }
  }, [searchParams, setSearchParams]);

  const toggleDropdown = (e, tutorialId) => {
    e.stopPropagation(); // prevent page navigation when clicking dropdown
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
      const res = await fetch(`http://localhost:4000/api/tutorials/${tutorialId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      
      if (!res.ok) throw new Error("Failed to archive tutorial");
      
      // remove from local state
      setTutorials((prev) => prev.filter((t) => t.tutorialId !== tutorialId));
    } catch (err) {
      console.error("Failed to archive tutorial", err);
    }
  };

  const handlePublish = (e) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    // laceholder - no functionality yet
    alert("Publish functionality coming soon!");
  };

  const handlePreview = (e) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    // placeholder - no functionality yet
    alert("Preview functionality coming soon!");
  };

  return (
    <div style={styles.container}>
      <Sidebar />

      <main style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Your Tutorials</h1>
          <button
            style={styles.newButton}
            onClick={() => navigate("/tutorials/new")}
          >
            New Tutorial
          </button>
        </div>

        {/* Search, Sort, and Filter Controls */}
        <div style={styles.controlsContainer}>
          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Sort and Filter Row */}
          <div style={styles.sortFilterRow}>
            {/* Sort Dropdown */}
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.selectInput}
              >
                <option value="newest">Created (Newest First)</option>
                <option value="oldest">Created (Oldest First)</option>
                <option value="modified-newest">Modified (Newest First)</option>
                <option value="modified-oldest">Modified (Oldest First)</option>
                <option value="alphabetical">Alphabetical (A-Z)</option>
                <option value="alphabetical-desc">Alphabetical (Z-A)</option>
              </select>
            </div>

            {/* Filter Dropdown */}
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>Filter:</label>
              <select
                value={filterBy}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "published") {
                    navigate("/tutorials/published");
                  } else if (value === "archived") {
                    navigate("/tutorials/archived");
                  } else {
                    // "all" or "unpublished" stays on current page
                    setFilterBy(value);
                  }
                }}
                style={styles.selectInput}
              >
                <option value="all">All Tutorials</option>
                <option value="published">Published</option>
                <option value="unpublished">Unpublished (Drafts)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {filteredTutorials.length === 0 ? (
          <p style={styles.emptyText}>
            {searchQuery 
              ? "No tutorials match your search." 
              : filterBy === "unpublished"
                ? "No unpublished (draft) tutorials found."
                : "No tutorials yet. Click \"New Tutorial\" to get started."}
          </p>
        ) : (
          <ul style={styles.list}>
            {filteredTutorials.map((tut) => (
              <li
                key={tut.tutorialId}
                style={{
                  ...styles.listItem,
                  ...(highlightId === tut.tutorialId ? styles.listItemHighlight : {}),
                }}
                onClick={() => navigate(`/tutorials/${tut.tutorialId}/edit`)}
              >
                <span style={styles.listItemTitle}>{tut.title}</span>
                <div style={styles.listItemRight}>
                  <span style={styles.statusBadge}>{tut.status}</span>
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
                          onClick={(e) => handleArchive(e, tut.tutorialId)}
                        >
                          Archive
                        </button>
                        <button
                          style={styles.dropdownItem}
                          onClick={handlePublish}
                        >
                          Publish
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
  newButton: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    backgroundColor: "#7B2D26",
    color: "#fff",
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
  listItemHighlight: {
    backgroundColor: "#f5e6e4",
    borderColor: "#7B2D26",
    boxShadow: "0 0 0 2px rgba(123, 45, 38, 0.2)",
  },
  listItemTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#111827",
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
    backgroundColor: "#fef3c7",
    color: "#92400e",
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
