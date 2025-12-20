// Remaingdues.js
import React, { useEffect, useState } from "react";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

// Build overdue API URL from BASE_URL while avoiding duplicate slashes
const OVERDUE_API = (BASE_URL || "").replace(/\/+$/, "") + "/api/payments/overdue-users";

function formatDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ----------------------------------------------------
// UPDATED STYLES
// ----------------------------------------------------
const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#000",
    padding: "10px", // Reduced padding for mobile
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    boxSizing: "border-box",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 1200,
    backgroundColor: "#000",
    color: "black",
    borderRadius: 2,
    padding: 10, // Reduced padding inside the card
    boxSizing: "border-box",
    boxShadow: "0 0 0 1px black",
  },
  headerRow: {
    display: "flex",
    flexDirection: "column", // Stack on mobile
    justifyContent: "space-between",
    alignItems: "flex-start", // Align items to the left when stacked
    marginBottom: 10,
    gap: 10,
    paddingBottom: 8,
    borderBottom: "1px solid #333",
  },
  title: {
    margin: 0,
    fontSize: 15, // Smaller font for mobile title
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#fff",
    textAlign: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap", // Allow buttons/search to wrap if space is too small
    width: "100%", // Take full width on mobile
    justifyContent: "space-between", // Space out items in the action row
  },
  searchInput: {
    padding: "8px 12px",
    fontSize: 14,
    borderRadius: 2,
    border: "1px solid #fff",
    minWidth: 100, // Reduced min-width
    flexGrow: 1, // Allow search input to take up available space
    backgroundColor: "#111",
    color: "#fff",
  },
  searchBtn: {
    padding: "8px 16px",
    backgroundColor: "#7f8c8d",
    color: "#fff",
    border: "1px solid #fff",
    borderRadius: 2,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    transition: "background-color 0.2s",
  },
  refreshBtn: {
    padding: "8px 16px",
    backgroundColor: "#2ecc71",
    color: "#000",
    border: "1px solid #000",
    borderRadius: 2,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    transition: "background-color 0.2s",
  },
  summaryRow: {
    display: "flex",
    flexDirection: "row", // UPDATED: Row direction to keep them side-by-side
    gap: 10,
    marginBottom: 15,
    borderBottom: "1px solid #333",
    paddingBottom: 10,
  },
  summaryItem: {
    flex: 1, // UPDATED: Share available space equally (50% each)
    minWidth: 0, 
    border: "1px solid #fff",
    borderRadius: 2,
    padding: 10,
    backgroundColor: "#111",
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.8,
    marginBottom: 4,
    color: "#ccc",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  errorBox: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#8e44ad",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 2,
  },
  text: {
    fontSize: 14,
    color: "#ccc",
    padding: "10px 0",
    textAlign: "center",
  },
  tableWrap: {
    overflowX: "auto", // Essential for horizontal scrolling on mobile
    borderRadius: 2,
    border: "1px solid #fff",
    backgroundColor: "#111",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "black",
    minWidth: 850, // Keep a large minWidth to enforce horizontal scroll
  },
  th: {
    padding: "8px 6px",
    border: "1px solid #fff",
    backgroundColor: "#7f8c8d", // UPDATED: Grey background for header
    color: "white",
    fontSize: 13,
    textAlign: "left",
    whiteSpace: "nowrap",
    fontWeight: 700,
  },
  tr: {
    borderBottom: "1px solid black",
  },
  td: {
    padding: "6px 5px",
    fontSize: 12,
    textAlign: "left",
    whiteSpace: "nowrap",
    border: "1px solid white",
    backgroundColor: "#000",
    color: "#fff",
  },
  tdCenter: {
    padding: "6px 5px",
    fontSize: 12,
    textAlign: "center",
    whiteSpace: "nowrap",
    border: "1px solid white",
    backgroundColor: "#000",
    color: "#fff",
  },
  tdRight: {
    padding: "6px 5px",
    fontSize: 12,
    textAlign: "right",
    whiteSpace: "nowrap",
    border: "1px solid white",
    backgroundColor: "#000",
    color: "#fff",
  },
  tdRightBold: {
    padding: "6px 5px",
    fontSize: 13,
    textAlign: "right",
    fontWeight: "700",
    whiteSpace: "nowrap",
    border: "1px solid white",
    backgroundColor: "black",
    color: "#e74c3c",
  },
};

// ----------------------------------------------------
// REACT COMPONENT
// ----------------------------------------------------

export default function Remaingdues() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadOverdue = async (searchQuery = "") => {
    try {
      setLoading(true);
      setError("");

      const trimmed = (searchQuery || "").trim();
      const url = trimmed
        ? `${OVERDUE_API}?q=${encodeURIComponent(trimmed)}`
        : OVERDUE_API;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to load overdue users");
      }

      const data = await res.json();

      const results = data.results || [];
      setRows(results);
      setTotal(data.total || 0);
      setCount(data.count || results.length);
    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load – no search filter
    loadOverdue();
  }, []);

  const handleSearch = () => {
    loadOverdue(searchTerm);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* HEADER ROW - Responsive Stacking */}
        <div style={s.headerRow}>
          <h2 style={s.title}>Remaining Dues </h2>

          <div style={s.headerActions}>
            <input
              type="text"
              placeholder="Search by name / phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              style={s.searchInput}
            />
            <button
              style={s.searchBtn}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
            {/*}
            <button
              style={s.refreshBtn}
              onClick={() => loadOverdue(searchTerm)}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            */}
          </div>
        </div>

        {/* SUMMARY ROW - Responsive Side-by-Side */}
        <div style={s.summaryRow}>
          <div style={s.summaryItem}>
            <div style={s.summaryLabel}>Total Users</div>
            <div style={s.summaryValue}>{count}</div>
          </div>
          <div style={s.summaryItem}>
            <div style={s.summaryLabel}>Total Unpaid bal.</div>
            <div style={s.summaryValue}>₹{total.toLocaleString("en-IN")}</div>
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {loading && rows.length === 0 ? (
          <p style={s.text}>Loading...</p>
        ) : rows.length === 0 ? (
          <p style={s.text}>No overdue users found.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Phone</th>
                  <th style={s.th}>Room</th>
                  <th style={s.th}>Bed</th>
                  <th style={s.th}>Joined Date</th>
                  {/* <th style={s.th}>Months Passed</th>  */}
                  <th style={s.th}>Rent / Month</th>
                  <th style={s.th}>Expected Total</th>
                  <th style={s.th}>Paid Total</th>
                  <th style={{ ...s.th, textAlign: "right" }}>
                    Remaining Dues
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u, index) => (
                  <tr key={u._id} style={{ ...s.tr, backgroundColor: index % 2 === 0 ? '#000' : '#050505' }}>
                    <td style={{ ...s.td, borderLeft: "none" }}>{u.fullName}</td>
                    <td style={s.td}>{u.phone}</td>
                    <td style={s.td}>{u.roomNumber}</td>
                    <td style={s.td}>{u.bedNumber}</td>
                    <td style={s.td}>{formatDate(u.joinedDate)}</td>
                    {/*<td style={s.tdCenter}>{u.monthsPassed}</td>*/}
                    <td style={s.tdRight}>
                      ₹{Number(u.rentPerMonth || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={s.tdRight}>
                      ₹{Number(u.expectedTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={s.tdRight}>
                      ₹{Number(u.paidTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ ...s.tdRightBold, borderRight: "none" }}>
                      ₹{Number(u.unpaidTotal || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}