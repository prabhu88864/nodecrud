import React, { useEffect, useState } from "react";
import axios from "axios";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

// build API base from BASE_URL, trimming any trailing slash
const _apiBase = (BASE_URL || "").replace(/\/+$/, "");

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [bedAllocations, setBedAllocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [selectedBed, setSelectedBed] = useState(null);
  const [form, setForm] = useState({
    block: "",
    floor: "",
    roomNumber: "",
    rentAmount: "",
    beds: [""],
  });

  // Detect screen size for minor responsive tweaks
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = screenWidth < 768;
  const isVerySmall = screenWidth < 480;

  useEffect(() => {
    fetchRooms();
    fetchBedAllocations();
    fetchDetailedBeds();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${_apiBase}/api/rooms`);
      setRooms(res.data || []);
    } catch (err) {
      alert("Failed to load rooms.");
    }
  };

  const fetchBedAllocations = async () => {
    try {
      const res = await axios.get(`${_apiBase}api/allocation/available-beds?full=true`);
      setBedAllocations(res.data || []);
    } catch (err) {
      setBedAllocations([]);
    }
  };

  const fetchDetailedBeds = async () => {
    try {
      const res = await axios.get(`${_apiBase}/api/beds/details`);
      if (Array.isArray(res.data)) {
        setBedAllocations(res.data);
      }
    } catch (err) {
      console.log("Error fetching detailed bed data", err);
    }
  };

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleBedChange = (index, value) => {
    const updatedBeds = [...form.beds];
    updatedBeds[index] = value;
    setForm({ ...form, beds: updatedBeds });
  };

  const addBedField = () => {
    setForm({ ...form, beds: [...form.beds, ""] });
  };

  const removeBed = (index) => {
    if (form.beds.length === 1) return;
    const updated = form.beds.filter((_, i) => i !== index);
    setForm({ ...form, beds: updated });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "-" : date.toISOString().split("T")[0];
  };

  const handleAddNewClick = () => {
    setEditingRoomId(null);
    setForm({ block: "", floor: "", roomNumber: "", rentAmount: "", beds: [""] });
    setShowForm(true);
  };

  const handleEditClick = (room) => {
    const bedsArray = Array.isArray(room.beds)
      ? room.beds.map((b) => (typeof b === "object" ? b.bedNumber || "" : b)).filter(Boolean)
      : [""];
    setEditingRoomId(room._id);
    setForm({
      block: room.block || "",
      floor: room.floor || "",
      roomNumber: room.roomNumber || "",
      rentAmount: room.rentAmount ? String(room.rentAmount) : "",
      beds: bedsArray.length > 0 ? bedsArray : [""],
    });
    setShowForm(true);
  };

  const submitRoom = async (e) => {
    e.preventDefault();
    const cleanedBeds = form.beds.map((b) => b.trim()).filter((b) => b !== "");
    if (cleanedBeds.length === 0) cleanedBeds.push("");
    const body = {
      block: form.block.trim(),
      floor: form.floor.trim(),
      roomNumber: form.roomNumber.trim(),
      rentAmount: Number(form.rentAmount) || 0,
      beds: cleanedBeds,
    };
    if (!body.block || !body.floor || !body.roomNumber || !body.rentAmount) {
      alert("Please fill all required fields.");
      return;
    }
    try {
      if (editingRoomId) {
        await axios.put(`${_apiBase}/api/rooms/${editingRoomId}`, body);
        alert("Room updated successfully!");
      } else {
        await axios.post(`${_apiBase}/api/rooms`, body);
        alert("Room added successfully!");
      }
      setShowForm(false);
      fetchRooms();
      fetchBedAllocations();
      fetchDetailedBeds();
    } catch (err) {
      alert("Failed to save room.");
    }
  };

  const getBedInfo = (bedNumber) => {
    if (!bedNumber) return null;
    return (
      bedAllocations.find(
        (alloc) =>
          alloc.bedNumber?.trim().toLowerCase() === bedNumber.trim().toLowerCase()
      ) || null
    );
  };

  const getBedNumber = (bed) => (typeof bed === "object" ? bed.bedNumber || "" : bed);

  /* ====================== RESPONSIVE STYLES ====================== */
  const pageWrapper = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#000",
    margin: 0,
    padding: 0,
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const containerStyle = {
    width: "100%",
    height: "100%",
    padding: isMobile ? "12px 8px" : "20px 16px",
    background: "#000",
    color: "#fff",
    boxSizing: "border-box",
    overflowY: "auto",
    overflowX: "hidden",
  };

  const addButtonStyle = {
    background: "#7f8c8d",
    color: "white",
    padding: isMobile ? "12px 16px" : "14px 20px",
    borderRadius: "2px",
    border: "1px solid #fff",
    fontSize: isMobile ? "15px" : "16px",
    fontWeight: "bold",
    width: "100%",
    maxWidth: "420px",
    display: "block",
    margin: "0 auto 20px auto",
    cursor: "pointer",
  };

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.98)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: isMobile ? "10px 8px" : "20px 16px",
    zIndex: 1000,
    overflowY: "auto",
  };

  const formContainerStyle = {
    background: "#000",
    border: "2px solid #fff",
    borderRadius: "2px",
    padding: isMobile ? "20px" : "25px",
    width: "100%",
    maxWidth: isMobile ? "100%" : "480px",
    margin: "10px auto",
  };

  const formTitleStyle = {
    textAlign: "center",
    marginBottom: "20px",
    fontSize: isMobile ? "17px" : "18px",
    color: "#fff",
  };

  const fieldStyle = { marginBottom: "16px" };

  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px" : "14px",
    marginTop: "8px",
    background: "#000",
    border: "1px solid #fff",
    borderRadius: "2px",
    color: "#fff",
    fontSize: isMobile ? "15px" : "16px",
    boxSizing: "border-box",
  };

  const bedRowStyle = {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
    alignItems: "center",
  };

  const removeBtnStyle = {
    background: "#e74c3c",
    color: "#fff",
    width: "38px",
    height: "38px",
    borderRadius: "2px",
    fontSize: "18px",
    border: "1px solid #fff",
    cursor: "pointer",
    flexShrink: 0,
  };

  const addBedBtnStyle = {
    marginTop: "12px",
    background: "#3498db",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "2px",
    border: "1px solid #fff",
    fontSize: "14px",
    cursor: "pointer",
  };

  const buttonGroupStyle = {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginTop: "25px",
    flexWrap: isVerySmall ? "wrap" : "nowrap",
  };

  const saveBtnStyle = {
    background: "#27ae60",
    padding: isMobile ? "12px 24px" : "14px 28px",
    borderRadius: "2px",
    fontWeight: "bold",
    color: "#fff",
    border: "1px solid #fff",
    cursor: "pointer",
    fontSize: isMobile ? "15px" : "16px",
  };

  const cancelBtnStyle = {
    background: "#7f8c8d",
    padding: isMobile ? "12px 24px" : "14px 28px",
    borderRadius: "2px",
    fontWeight: "bold",
    color: "#fff",
    border: "1px solid #fff",
    cursor: "pointer",
    fontSize: isMobile ? "15px" : "16px",
  };

  const tableWrapperStyle = {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    background: "#000",
    border: "0px solid #",
    borderRadius: "2px",
    marginTop: "10px",
  };

  const tableStyle = {
    width: "100%",
    minWidth: "900px", // Keeps desktop layout, mobile users swipe
    borderCollapse: "collapse",
    background: "#000",
  };

  const thStyle = {
    background: "#7f8c8d",
    color: "#fff",
    padding: isMobile ? "8px 6px" : "10px",
    border: "1px solid #fff",
    fontSize: isMobile ? "11px" : "13px",
    textAlign: "center",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: isMobile ? "8px 6px" : "10px",
    border: "1px solid #fff",
    fontSize: isMobile ? "12px" : "13px",
    color: "#fff",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const emptyTdStyle = {
    ...tdStyle,
    padding: "40px",
    fontSize: "15px",
  };

  const colFloor = { width: "70px" };
  const colBlock = { width: "70px" };
  const colRoom = { width: "90px" };
  const colRent = { width: "90px" };
  const colBeds = { width: "280px" };
  const colStatus = { width: "90px" };
  const colCreated = { width: "100px" };
  const colAction = { width: "80px" };

  const bedsContainerStyle = {
    display: "flex",
    flexWrap: "nowrap",
    gap: "0px",
    justifyContent: "flex-start",
    padding: "0px 0",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    maxWidth: "100%",
  };

  const bedItemStyle = {
    textAlign: "center",
    flexShrink: 0,
    minWidth: isMobile ? "65px" : "80px",
  };

  const bedTagStyle = {
    background: "#3498db",
    color: "#fff",
    padding: isMobile ? "6px 20px" : "6px 16px",
    borderRadius: "2px",
    fontSize: isMobile ? "10px" : "12px",
    fontWeight: "bold",
    display: "inline-block",
    whiteSpace: "nowrap",
  };

  const dueBadgeStyle = {
    marginTop: "0px",
    marginBottom: "0px",
    padding: "0px 0px",
    fontSize: "9px",
    color: "#fff",
   
  };

  const availableStyle = { color: "#2ecc71", fontWeight: "bold" };
  const occupiedStyle = { color: "#e74c3c", fontWeight: "bold" };

  const editBtnStyle = {
    background: "#A40759",
    color: "#fff",
    padding: isMobile ? "5px 12px" : "6px 16px",
    borderRadius: "2px",
    fontSize: isMobile ? "11px" : "12px",
    fontWeight: "bold",
    border: "1px solid black",
  };

  const detailsTextStyle = {
    color: "#fff",
    fontSize: isMobile ? "14px" : "15px",
    lineHeight: "1.6",
    marginBottom: "12px",
  };

  return (
    <div style={pageWrapper}>
      <div style={containerStyle}>
        <button onClick={handleAddNewClick} style={addButtonStyle}>
          Create New Room
        </button>

        {/* ADD / EDIT FORM OVERLAY */}
        {showForm && (
          <div style={overlayStyle}>
            <div style={formContainerStyle}>
              <h3 style={formTitleStyle}>
                {editingRoomId ? "Edit Room" : "Add New Room"}
              </h3>
              <form onSubmit={submitRoom}>
                <div style={fieldStyle}>
                  <label>Floor *</label>
                  <input style={inputStyle} value={form.floor} onChange={handleChange("floor")} required />
                </div>
                <div style={fieldStyle}>
                  <label>Block *</label>
                  <input style={inputStyle} value={form.block} onChange={handleChange("block")} required />
                </div>
                <div style={fieldStyle}>
                  <label>Room Number *</label>
                  <input style={inputStyle} value={form.roomNumber} onChange={handleChange("roomNumber")} required />
                </div>
                <div style={fieldStyle}>
                  <label>Rent Amount *</label>
                  <input style={inputStyle} type="number" value={form.rentAmount} onChange={handleChange("rentAmount")} required />
                </div>
                <div style={fieldStyle}>
                  <label>Beds</label>
                  {form.beds.map((bed, index) => (
                    <div key={index} style={bedRowStyle}>
                      <input
                        style={inputStyle}
                        placeholder="Bed No (e.g. A1)"
                        value={bed}
                        onChange={(e) => handleBedChange(index, e.target.value)}
                      />
                      {form.beds.length > 1 && (
                        <button type="button" onClick={() => removeBed(index)} style={removeBtnStyle}>
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addBedField} style={addBedBtnStyle}>
                    + Add Bed
                  </button>
                </div>
                <div style={buttonGroupStyle}>
                  <button type="submit" style={saveBtnStyle}>
                    {editingRoomId ? "Update" : "Save"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={cancelBtnStyle}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BED DETAILS POPUP */}
        {selectedBed && (
          <div style={overlayStyle}>
            <div style={formContainerStyle}>
              <h3 style={formTitleStyle}>Bed Details: {selectedBed.bedNumber}</h3>
              {selectedBed.isOccupied ? (
                <div style={detailsTextStyle}>
                  <p><strong>Name:</strong> {selectedBed.occupant?.fullName || "-"}</p>
                  <p><strong>Phone:</strong> {selectedBed.occupant?.phone || "-"}</p>
                  <p><strong>Joining Date:</strong> {formatDate(selectedBed.occupant?.joinedDate)}</p>
                  <p><strong>Rent/Month:</strong> ₹{selectedBed.rentPerMonth || selectedBed.rentAmount || 0}</p>
                  <p><strong>Paid:</strong> ₹{selectedBed.paidTotal || 0}</p>
                  <p><strong>Expected:</strong> ₹{selectedBed.expectedTotal || 0}</p>
                  <p style={{ color: "#e74c3c" }}><strong>Due:</strong> ₹{selectedBed.unpaidTotal || 0}</p>
                </div>
              ) : (
                <p style={detailsTextStyle}>This bed is <strong>Available</strong>.</p>
              )}
              <div style={buttonGroupStyle}>
                <button type="button" onClick={() => setSelectedBed(null)} style={cancelBtnStyle}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ROOMS TABLE - Horizontal scroll on mobile */}
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, ...colFloor }}>Floor</th>
                <th style={{ ...thStyle, ...colBlock }}>Block</th>
                <th style={{ ...thStyle, ...colRoom }}>Room</th>
                <th style={{ ...thStyle, ...colRent }}>Rent</th>
                <th style={{ ...thStyle, ...colBeds }}>Beds</th>
                <th style={{ ...thStyle, ...colStatus }}>Status</th>
                <th style={{ ...thStyle, ...colCreated }}>Created</th>
                <th style={{ ...thStyle, ...colAction }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="8" style={emptyTdStyle}>No rooms found</td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room._id}>
                    <td style={{ ...tdStyle, ...colFloor }}>{room.floor}</td>
                    <td style={{ ...tdStyle, ...colBlock }}>{room.block}</td>
                    <td style={{ ...tdStyle, ...colRoom }}>{room.roomNumber}</td>
                    <td style={{ ...tdStyle, ...colRent }}>₹{room.rentAmount}</td>
                    <td style={{ ...tdStyle, ...colBeds }}>
                      <div style={bedsContainerStyle}>
                        {room.beds.map((b, i) => {
                          const bedNumber = getBedNumber(b);
                          const bed = getBedInfo(bedNumber);
                          return (
                            <div key={i} style={bedItemStyle} onClick={() => bed && setSelectedBed(bed)}>
                              <span
                                style={{
                                  ...bedTagStyle,
                                  background: bed
                                    ? bed.isOccupied
                                      ? "#FF0000"
                                      : "#099C01"
                                    : "#7f8c8d",
                                  cursor: bed ? "pointer" : "default",
                                }}
                              >
                                {bedNumber || "-"}
                              </span>
                              {bed?.unpaidTotal > 0 && (
                                <div style={dueBadgeStyle}>₹{bed.unpaidTotal}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, ...colStatus }}>
                      <span style={room.status === "Occupied" ? occupiedStyle : availableStyle}>
                        {room.status || "Available"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, ...colCreated }}>{formatDate(room.createdAt)}</td>
                    <td style={{ ...tdStyle, ...colAction }}>
                      <button onClick={() => handleEditClick(room)} style={editBtnStyle}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}