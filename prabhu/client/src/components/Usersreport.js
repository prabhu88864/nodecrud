import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

// build api base from BASE_URL (trim trailing slash)
const _apiBase = (BASE_URL || "").replace(/\/+$/, "");
const USER_PROFILE_API = `${_apiBase}/api/userProfile`;

function buildFullUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${_apiBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function UserProfileList() {
  const [profiles, setProfiles] = useState([]);
  const [viewImage, setViewImage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  const navigate = useNavigate();
  const isInactiveView = statusFilter === "inactive";

  // Detect mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [statusFilter]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      loadProfiles();
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (statusFilter === "active") params.isActive = true;
      if (statusFilter === "inactive") params.isActive = false;
      if (searchTerm?.trim()) params.search = searchTerm.trim();

      const res = await axios.get(USER_PROFILE_API, { params });
      const data = res.data || {};
      const list = data.profiles || data.users || [];
      setProfiles(list);
      setTotalCount(typeof data.count === "number" ? data.count : list.length);
    } catch (err) {
      console.error("Error fetching profiles:", err);
      setError("Failed to load users. Please try again.");
      setProfiles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const goToAddUser = () => navigate("/Registeruser");

  const goToEdit = (user) => {
    navigate("/Registeruser", { state: { editData: user } });
  };

  const goToCheckout = (user) => {
    navigate("/Checkout", { state: { checkoutUser: user } });
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "-" : date.toISOString().split("T")[0];
  };

  const baseHeaders = [
    "Id",
    "Full Name",
    "Floor",
    "Block",
    "Room No",
    "Bed No",
    "Phone",
    "Rent",
    "Discount",
    "Damage",
    "Advance",
    "Aadhar",
    "Photo",
    "Address",
    "Entry",
  ];

  const activeActionHeaders = ["View", "Checkout", "Edit", "Print"];
  const inactiveActionHeaders = ["Exit", "Print", "Edit"];

  const headers = isInactiveView
    ? [...baseHeaders, ...inactiveActionHeaders]
    : [...baseHeaders, ...activeActionHeaders];

  return (
    <>
      {/* Global CSS Reset - Removes white edges on mobile & desktop */}
      <style>{`
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #000 !important;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
        }
        #root, .App, div[data-testid="root"] {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #000 !important;
          min-height: 100vh;
        }
      `}</style>

      <div style={containerStyle}>
        {/* Header Controls - 2 Clean Rows */}
        <div style={headerContainerStyle}>
          {/* Row 1: Add Button + Status Filter - Equal width, same height, perfectly aligned */}
          <div style={row1Style}>
            <button onClick={goToAddUser} style={addButtonStyle}>
              + Add User
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Row 2: Search Input (70%) + Search Button (30%) */}
          <div style={row2Style}>
            <input
              type="text"
              placeholder="Search by name / phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={searchInputStyle}
            />
            <button onClick={loadProfiles} style={searchBtnStyle}>
              Search
            </button>
          </div>
        </div>

        {/* Total Records Info */}
        <div style={infoStyle}>
          {loading
            ? "Loading users..."
            : error
            ? <span style={{ color: "red" }}>{error}</span>
            : `Total Records: ${totalCount}`}
        </div>

        {/* Table */}
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th key={i} style={thStyle}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={headers.length} style={loadingTdStyle}>
                    Loading...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} style={noDataTdStyle}>
                    No users found
                  </td>
                </tr>
              ) : (
                profiles.map((user, idx) => (
                  <tr key={user._id || idx}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={nameTdStyle}>{user.fullName || "-"}</td>
                    <td style={tdStyle}>{user.floor ?? "-"}</td>
                    <td style={tdStyle}>{user.block ?? "-"}</td>
                    <td style={tdStyle}>{user.roomNumber ?? "-"}</td>
                    <td style={tdStyle}>{user.bedNumber ?? "-"}</td>
                    <td style={tdStyle}>{user.phone || "-"}</td>
                    <td style={tdStyle}>
                      ₹
                      {typeof user.rentAmount === "number"
                        ? user.rentAmount.toLocaleString()
                        : user.rentAmount || "0"}
                    </td>
                    <td style={tdStyle}>{user.discountAmount ?? "0"}</td>
                    <td style={tdStyle}>{user.damageCharges ?? "0"}</td>
                    <td style={tdStyle}>{user.advanceAmount ?? "0"}</td>

                    <td style={tdStyle}>
                      <button
                        style={viewBtnStyle}
                        onClick={() =>
                          user.idProofImage && setViewImage(buildFullUrl(user.idProofImage))
                        }
                      >
                        View
                      </button>
                    </td>

                    <td style={tdStyle}>
                      <button
                        style={viewBtnStyle}
                        onClick={() =>
                          user.userImage && setViewImage(buildFullUrl(user.userImage))
                        }
                      >
                        View
                      </button>
                    </td>

                    <td style={addressTdStyle}>{user.address || "-"}</td>
                    <td style={tdStyle}>{formatDate(user.joinedDate)}</td>

                    {/* Actions */}
                    {isInactiveView ? (
                      <>
                        <td style={tdStyle}>{formatDate(user.exitDate)}</td>
                        <td style={tdStyle}>
                          <button style={printBtnStyle} onClick={handlePrint}>
                            Print
                          </button>
                        </td>
                        <td style={tdStyle}>
                          <button style={editBtnStyle} onClick={() => goToEdit(user)}>
                            Edit
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tdStyle}>
                          <button style={viewBtnStyle}>Details</button>
                        </td>
                        <td style={tdStyle}>
                          <button style={checkoutBtnStyle} onClick={() => goToCheckout(user)}>
                            Checkout
                          </button>
                        </td>
                        <td style={tdStyle}>
                          <button style={editBtnStyle} onClick={() => goToEdit(user)}>
                            Edit
                          </button>
                        </td>
                        <td style={tdStyle}>
                          <button style={printBtnStyle} onClick={handlePrint}>
                            Print
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Image Preview Popup */}
        {viewImage && (
          <div style={popupOverlay} onClick={() => setViewImage(null)}>
            <div style={popupBox} onClick={(e) => e.stopPropagation()}>
              <img
                src={viewImage}
                alt="Document"
                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "12px" }}
              />
              <button style={closePopupBtn} onClick={() => setViewImage(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ======================== STYLES - PURE BLACK & FULL SCREEN ======================== */
const containerStyle = {
  padding: "2px",
  backgroundColor: "#000",
  minHeight: "100vh",
  color: "#fff",
  fontFamily: "'Segoe UI', Arial, sans-serif",
  boxSizing: "border-box",
};

const headerContainerStyle = {
  marginBottom: "20px",
};

const row1Style = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr", // Two equal columns
  gap: "12px",
  marginBottom: "15px",
};

const row2Style = {
  display: "flex",
  gap: "10px",
};

const addButtonStyle = {
  background: "#7f8c8d",
  color: "white",
  padding: "14px 20px",
  fontSize: "16px",
  fontWeight: "bold",
  border: "1px solid #fff",
  borderRadius: "2px",
  cursor: "pointer",
  width: "100%",
  minHeight: "50px",
};

const filterSelectStyle = {
  width: "100%",
  padding: "14px 16px",
  background: "#111",
  border: "1px solid #fff",
  borderRadius: "2px",
  color: "#fff",
  fontSize: "15px",
  cursor: "pointer",
  minHeight: "50px",
  boxSizing: "border-box",
};

const searchInputStyle = {
  flex: "2.5",
  padding: "14px 16px",
  background: "#111",
  border: "1px solid #fff",
  borderRadius: "2px",
  color: "#fff",
  fontSize: "15px",
};

const searchBtnStyle = {
  flex: "1",
  background: "#7f8c8d",
  color: "white",
  padding: "14px 20px",
  fontWeight: "bold",
  border: "1px solid #fff",
  borderRadius: "2px",
  cursor: "pointer",
};

const infoStyle = {
  marginBottom: "15px",
  fontSize: "15px",
  color: "#aaa",
  textAlign: "center",
};

const tableWrapperStyle = {
  overflowX: "auto",
  border: "2px solid #333",
  borderRadius: "1px",
  background: "#111",
};

const tableStyle = {
  width: "100%",
  minWidth: "1500px",
  borderCollapse: "collapse",
};

const thStyle = {
  background: "#7f8c8d",
  color: "#fff",
  padding: "10px 6px",
  textAlign: "center",
  border: "1px solid #fff",
  fontSize: "12px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 6px",
  border: "1px solid #fff",
  textAlign: "center",
  fontSize: "13px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "160px",
};

const nameTdStyle = { ...tdStyle, fontWeight: "bold", maxWidth: "200px", fontSize: "14px" };
const addressTdStyle = { ...tdStyle, maxWidth: "240px", fontSize: "12px" };

const loadingTdStyle = { ...tdStyle, padding: "50px", fontSize: "16px" };
const noDataTdStyle = { ...tdStyle, padding: "60px", fontSize: "16px" };

const viewBtnStyle = {
  background: "#3498db",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: "2px",
  fontSize: "11px",
  fontWeight: "bold",
  cursor: "pointer",
};

const checkoutBtnStyle = {
  background: "#e74c3c",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: "2px",
  fontSize: "11px",
  fontWeight: "bold",
  cursor: "pointer",
};

const editBtnStyle = {
  background: "orange",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: "2px",
  fontSize: "11px",
  fontWeight: "bold",
  cursor: "pointer",
};

const printBtnStyle = {
  background: "#2ecc71",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: "2px",
  fontSize: "11px",
  fontWeight: "bold",
  cursor: "pointer",
};

const popupOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.95)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
  padding: "15px",
};

const popupBox = {
  background: "#111",
  border: "2px solid #fff",
  borderRadius: "16px",
  padding: "25px",
  maxWidth: "90vw",
  maxHeight: "90vh",
  textAlign: "center",
};

const closePopupBtn = {
  marginTop: "20px",
  background: "#7f8c8d",
  color: "#fff",
  padding: "12px 30px",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "16px",
};