import React, { useEffect, useState } from "react";
import axios from "axios";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

const s = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#000",
    padding: "10px",
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
    padding: 10,
    boxSizing: "border-box",
    boxShadow: "0 0 0 1px black",
  },
  headerRow: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
    paddingBottom: 8,
    borderBottom: "1px solid #333",
  },
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#fff",
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
    
    
  },
  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    width: "100%",
    justifyContent: "space-between",
  },
  searchInput: {
    padding: "8px 12px",
    fontSize: 14,
    borderRadius: 2,
    border: "1px solid #fff",
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: "#111",
    color: "#fff",
  },
  searchBtn: {
    padding: "8px 16px",
    backgroundColor: "#7f8c8d", // Grey
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
    backgroundColor: "#2ecc71", // Green
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
    flexDirection: "row", // Side by side
    gap: 10,
    marginBottom: 15,
    borderBottom: "1px solid #333",
    paddingBottom: 10,
  },
  summaryItem: {
    flex: 1, // Equal width
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
    backgroundColor: "#e74c3c", // Red
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
    overflowX: "auto",
    borderRadius: 2,
    border: "1px solid #fff",
    backgroundColor: "#111",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "black",
    minWidth: 900, // Forces scroll on mobile
  },
  th: {
    padding: "8px 6px",
    border: "1px solid #fff",
    backgroundColor: "#333", // Grey Header
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
  tdStatus: {
    padding: "6px 5px",
    fontSize: 12,
    textAlign: "center",
    whiteSpace: "nowrap",
    border: "1px solid white",
    backgroundColor: "#000",
    color: "#fff",
    fontWeight: "bold",
  },
  tdID: {
    padding: "6px 5px",
    fontSize: 11, // Slightly smaller for IDs
    textAlign: "left",
    whiteSpace: "nowrap",
    border: "1px solid white",
    backgroundColor: "#000",
    color: "#aaa", // Grey text for IDs
  },
};

// ----------------------------------------------------
// REACT COMPONENT
// ----------------------------------------------------

export default function AvailableBedsReport() {
  const [beds, setBeds] = useState([]);
  const [filteredBeds, setFilteredBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE = BASE_URL;

  const fetchBeds = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}api/allocation/available-beds`);
      const data = res.data || [];
      setBeds(data);
      setFilteredBeds(data); // Initialize filtered list
    } catch (err) {
      console.error(
        "Error fetching available beds:",
        err.response?.data || err.message
      );
      setError("Failed to load available beds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, []);

  // Handle Client-Side Search
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredBeds(beds);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const result = beds.filter((b) => {
      const bedNo = String(b.bedNumber || "").toLowerCase();
      const roomNo = String(b.room?.roomNumber || "").toLowerCase();
      return bedNo.includes(lower) || roomNo.includes(lower);
    });
    setFilteredBeds(result);
  };

  // Trigger search on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    try {
      return new Date(dt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  };

  // Calculate Summary Stats
  const totalBeds = filteredBeds.length;
  const availableCount = filteredBeds.filter((b) => !b.isOccupied).length;

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* HEADER ROW */}
        <div style={s.headerRow}>
          <h2 style={s.title}>Available Beds Report</h2>

          <div style={s.headerActions}>
            <input
              type="text"
              placeholder="Search Bed / Room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              style={s.searchInput}
            />
            <button style={s.searchBtn} onClick={handleSearch} disabled={loading}>
              Search
            </button>
            {/*}
            <button style={s.refreshBtn} onClick={fetchBeds} disabled={loading}>
              {loading ? "..." : "Refresh"}
            </button>
            */}
          </div>
        </div>

        {/* SUMMARY ROW 
        <div style={s.summaryRow}>
          <div style={s.summaryItem}>
            <div style={s.summaryLabel}>Total Records</div>
            <div style={s.summaryValue}>{totalBeds}</div>
          </div>
          <div style={s.summaryItem}>
            <div style={s.summaryLabel}>Available Now</div>
            <div style={s.summaryValue}>{availableCount}</div>
          </div>
        </div>
        */}

        {error && <div style={s.errorBox}>{error}</div>}

        {loading && beds.length === 0 ? (
          <p style={s.text}>Loading data...</p>
        ) : filteredBeds.length === 0 ? (
          <p style={s.text}>No beds found matching your criteria.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Id</th>
                  <th style={s.th}>Bed No</th>
                  <th style={s.th}>Room No</th>
                  <th style={s.th}>Rent</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Bed ID</th>
                  <th style={s.th}>Room ID</th>
                  <th style={s.th}>Last Updated</th>
                  
                </tr>
              </thead>
              <tbody>
                {filteredBeds.map((item, idx) => (
                  <tr
                    key={item._id || idx}
                    style={{
                      ...s.tr,
                      backgroundColor: idx % 2 === 0 ? "#000" : "#050505",
                    }}
                  >
                    <td style={{ ...s.td, borderLeft: "none" }}>{idx + 1}</td>
                    <td style={s.td}>{item.bedNumber}</td>
                    <td style={s.td}>{item.room?.roomNumber || "-"}</td>
                    <td style={s.td}>
                      {item.room?.rentAmount
                        ? `₹${item.room.rentAmount}`
                        : "-"}
                    </td>
                    <td
                      style={{
                        ...s.tdStatus,
                        color: item.isOccupied ? "#e74c3c" : "#2ecc71",
                      }}
                    >
                      {item.isOccupied ? "OCCUPIED" : "AVAILABLE"}
                    </td>
                    <td style={s.tdID}>{item._id}</td>
                    <td style={s.tdID}>{item.room?._id || "-"}</td>
                    <td style={{ ...s.td, borderRight: "none" }}>
                      {formatDateTime(item.updatedAt)}
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