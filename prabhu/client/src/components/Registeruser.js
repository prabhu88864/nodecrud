import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { BASE_URL } from "../API/Constants";

export default function RegisterUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData || null;
  // normalize BASE_URL to avoid duplicate/missing slashes
  const _apiBase = (BASE_URL || "").replace(/\/+$/, "");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    idProofType: "",
    isActive: "true",
    floor: "",
    block: "",
    roomNumber: "",
    roomId: "",
    bedNumber: "",
    bedId: "",
    rentAmount: "",
    joinedDate: "",
    damageCharges: "",
    advanceAmount: "",
    discountAmount: "",
    idProofImage: null,
    userImage: null,
  });

  const [loading, setLoading] = useState(false);
  const [availableFloors, setAvailableFloors] = useState([]);
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [floorsLoading, setFloorsLoading] = useState(false);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [bedsLoading, setBedsLoading] = useState(false);

  /* FETCH FUNCTIONS */
  const fetchFloors = async () => {
    setFloorsLoading(true);
    try {
  const res = await axios.get(`${_apiBase}/api/allocation/available-floors`);
      setAvailableFloors(res.data || []);
    } catch (err) {
      alert("Failed to load floors");
    } finally {
      setFloorsLoading(false);
    }
  };

  const fetchBlocks = async (floorValue) => {
    if (!floorValue) {
      setAvailableBlocks([]);
      return;
    }
    setBlocksLoading(true);
    try {
  const res = await axios.get(`${_apiBase}/api/allocation/available-blocks`, {
        params: { floor: floorValue },
      });
      setAvailableBlocks(res.data || []);
    } catch (err) {
      alert("Failed to load blocks");
    } finally {
      setBlocksLoading(false);
    }
  };

  const fetchRooms = async (floorValue, blockValue, currentRoom) => {
    if (!floorValue || !blockValue) {
      setAvailableRooms([]);
      return;
    }
    setRoomsLoading(true);
    try {
  const res = await axios.get(`${_apiBase}/api/allocation/available-rooms`, {
        params: { floor: floorValue, block: blockValue },
      });
      let rooms = res.data || [];
      if (currentRoom?.roomId) {
        const exists = rooms.some((r) => r._id === currentRoom.roomId);
        if (!exists) {
          rooms.push({
            _id: currentRoom.roomId,
            roomNumber: currentRoom.roomNumber,
            rentAmount: currentRoom.rentAmount,
          });
        }
      }
      setAvailableRooms(rooms);
    } catch (err) {
      alert("Failed to load rooms");
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchBeds = async (roomId, currentBed) => {
    if (!roomId) {
      setAvailableBeds([]);
      return;
    }
    setBedsLoading(true);
    try {
  const res = await axios.get(`${_apiBase}api/allocation/available-beds`, {
        params: { roomId },
      });
      let beds = res.data || [];
      if (currentBed?.bedId) {
        const exists = beds.some((b) => b._id === currentBed.bedId);
        if (!exists) {
          beds.push({
            _id: currentBed.bedId,
            bedNumber: currentBed.bedNumber,
          });
        }
      }
      setAvailableBeds(beds);
    } catch (err) {
      alert("Failed to load beds");
    } finally {
      setBedsLoading(false);
    }
  };

  useEffect(() => {
    fetchFloors();
  }, []);

  useEffect(() => {
    if (!editData) return;

    setForm({
      fullName: editData.fullName || "",
      phone: editData.phone || "",
      address: editData.address || "",
      idProofType: editData.idProofType || "",
      isActive: editData.isActive === false ? "false" : "true",
      floor: editData.floor || "",
      block: editData.block || "",
      roomNumber: editData.roomNumber || "",
      roomId: editData.roomId || "",
      bedNumber: editData.bedNumber || "",
      bedId: editData.bedId || "",
      rentAmount: editData.rentAmount || "",
      joinedDate: editData.joinedDate?.split("T")[0] || "",
      damageCharges: editData.damageCharges || "",
      advanceAmount: editData.advanceAmount || "",
      discountAmount: editData.discountAmount || "",
      idProofImage: null,
      userImage: null,
    });

    (async () => {
      if (editData.floor) await fetchBlocks(editData.floor);
      if (editData.floor && editData.block) {
        await fetchRooms(editData.floor, editData.block, {
          roomId: editData.roomId,
          roomNumber: editData.roomNumber,
          rentAmount: editData.rentAmount,
        });
      }
      if (editData.roomId) {
        await fetchBeds(editData.roomId, {
          bedId: editData.bedId,
          bedNumber: editData.bedNumber,
        });
      }
    })();
  }, [editData]);

  const handleFloorChange = (e) => {
    const value = e.target.value;
    setForm((p) => ({
      ...p,
      floor: value,
      block: "",
      roomId: "",
      roomNumber: "",
      bedId: "",
      bedNumber: "",
      rentAmount: "",
    }));
    setAvailableRooms([]);
    setAvailableBeds([]);
    fetchBlocks(value);
  };

  const handleBlockChange = (e) => {
    const value = e.target.value;
    setForm((p) => ({
      ...p,
      block: value,
      roomId: "",
      roomNumber: "",
      bedId: "",
      bedNumber: "",
      rentAmount: "",
    }));
    setAvailableBeds([]);
    fetchRooms(form.floor, value);
  };

  const handleRoomChange = (e) => {
    const roomId = e.target.value;
    const room = availableRooms.find((r) => r._id === roomId);
    setForm((p) => ({
      ...p,
      roomId,
      roomNumber: room?.roomNumber || "",
      rentAmount: room?.rentAmount || "",
      bedId: "",
      bedNumber: "",
    }));
    fetchBeds(roomId);
  };

  const handleBedChange = (e) => {
    const bedId = e.target.value;
    const bed = availableBeds.find((b) => b._id === bedId);
    setForm((p) => ({
      ...p,
      bedId,
      bedNumber: bed?.bedNumber || "",
    }));
  };

  const onChange = (field) => (e) => {
    const value = field.includes("Image") ? e.target.files[0] : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (!key.includes("Image") && value !== null && value !== "") {
          fd.append(key, value);
        }
      });
      fd.set("isActive", form.isActive === "true");
      if (form.idProofImage) fd.append("idProofImage", form.idProofImage);
      if (form.userImage) fd.append("userImage", form.userImage);

      if (editData) {
  await axios.put(`${_apiBase}/api/userprofile/${editData._id}`, fd);
        alert("User updated successfully!");
      } else {
        if (!form.floor || !form.block || !form.roomId || !form.bedId) {
          alert("Please select Floor, Block, Room, and Bed.");
          setLoading(false);
          return;
        }
  await axios.post(`${_apiBase}/api/userprofile`, fd);
        alert("User registered successfully!");
      }
      navigate("/dashboard");
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: #000;
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
        }

        /* Mobile First - 2 columns on mobile */
        .ru-container {
          min-height: 100vh;
          background: #000;
          padding: 12px 8px;
          display: flex;
          justify-content: center;
        }

        .ru-card {
          width: 100%;
          max-width: 900px;
          background: black;
          border-radius: 2px;
         
         
        }

        .ru-title {
          font-size: 24px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 24px;
        }

        .ru-section {
          margin-bottom: 32px;
        }

        .ru-section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #ddd;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
        }

        .ru-grid {
          display: grid;
          grid-template-columns: 1fr 1fr; /* 2 columns on mobile */
          gap: 16px;
        }

        .full-width {
          grid-column: 1 / -1; /* Full width fields */
        }

        .ru-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ru-label {
          font-size: 14px;
          font-weight: 600;
          color: #ccc;
        }

        .ru-input,
        .ru-select,
        .ru-textarea {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #444;
          background: #222;
          color: #fff;
          font-size: 16px;
          outline: none;
        }

        .ru-input:focus,
        .ru-select:focus,
        .ru-textarea:focus {
          border-color: #fff;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
        }

        .ru-textarea {
          min-height: 90px;
          resize: vertical;
        }

        .ru-buttons {
          display: flex;
          flex-direction: row;
          gap: 12px;
          margin-top: 24px;
        }

        .ru-btn {
          padding: 16px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 10px;
          border: 2px solid #fff;
          background: transparent;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .ru-btn:hover {
          background: #333;
        }

        .ru-btn-primary {
          background: #fff;
          color: #000;
        }

        .ru-btn-primary:hover {
          background: #f0f0f0;
        }

        .ru-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Tablet & Desktop - keep 2 columns, but more space */
        @media (min-width: 640px) {
          .ru-container {
            padding: 20px 16px;
          }
          .ru-card {
            padding: 32px 28px;
          }
          .ru-title {
            font-size: 28px;
          }
          .ru-grid {
            gap: 20px;
          }
          .ru-input,
          .ru-select,
          .ru-textarea {
            padding: 15px;
          }
          .ru-buttons {
            flex-direction: row;
          }
          .ru-btn {
            padding: 17px;
          }
        }

        .ru-input[type="date"] {
  color-scheme: light;
}

.ru-input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}


        @media (min-width: 1024px) {
          .ru-grid {
            gap: 24px;
          }
          .ru-input,
          .ru-select,
          .ru-textarea {
            padding: 16px;
          }
        }

        /* Very small screens - improve readability */
        @media (max-width: 480px) {
          .ru-title {
            font-size: 22px;
          }
          .ru-section-title {
            font-size: 17px;
          }
          .ru-input,
          .ru-select,
          .ru-textarea {
            padding: 13px;
            font-size: 15.5px;
          }
          .ru-btn {
            padding: 15px;
            font-size: 15.5px;
          }
        }
      `}</style>

      <div className="ru-container">
        <div className="ru-card">
          <h1 className="ru-title">{editData ? "Edit User" : "Register User"}</h1>

          <form onSubmit={onSubmit}>
            {/* Personal Details */}
            <div className="ru-section">
              <h3 className="ru-section-title">Personal Details</h3>
              <div className="ru-grid">
                <div className="ru-field">
                  <label className="ru-label">Full Name *</label>
                  <input className="ru-input" value={form.fullName} onChange={onChange("fullName")} required placeholder="Full name" />
                </div>
                <div className="ru-field">
                  <label className="ru-label">Phone *</label>
                  <input className="ru-input" value={form.phone} onChange={onChange("phone")} required placeholder="Phone number" />
                </div>
                <div className="ru-field full-width">
                  <label className="ru-label">Address</label>
                  <textarea className="ru-textarea" value={form.address} onChange={onChange("address")} placeholder="Full address" />
                </div>
               <div className="ru-field full-width">
  <label className="ru-label">ID Proof Type</label>
  <select
    className="ru-select"
    value={form.idProofType}
    onChange={onChange("idProofType")}
  >
    <option value="">Select ID Proof</option>
    <option value="Aadhar Card">Aadhar Card</option>
    <option value="PAN Card">PAN Card</option>
    <option value="Voter ID">Voter ID</option>
    <option value="Driving License">Driving License</option>
    <option value="Passport">Passport</option>
  </select>
</div>
                {editData && (
                  <div className="ru-field">
                    <label className="ru-label">Status</label>
                    <select className="ru-select" value={form.isActive} onChange={onChange("isActive")}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Allocation Details */}
            <div className="ru-section">
              <h3 className="ru-section-title">Allocation Details</h3>
              <div className="ru-grid">
                <div className="ru-field">
                  <label className="ru-label">Floor *</label>
                  <select className="ru-select" value={form.floor} onChange={handleFloorChange} required={!editData}>
                    <option value="">{floorsLoading ? "Loading..." : "Select Floor"}</option>
                    {availableFloors.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="ru-field">
                  <label className="ru-label">Block *</label>
                  <select className="ru-select" value={form.block} onChange={handleBlockChange} disabled={!form.floor} required={!editData}>
                    <option value="">{blocksLoading ? "Loading..." : "Select Block"}</option>
                    {availableBlocks.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="ru-field">
                  <label className="ru-label">Room *</label>
                  <select className="ru-select" value={form.roomId} onChange={handleRoomChange} disabled={!form.block} required={!editData}>
                    <option value="">{roomsLoading ? "Loading..." : "Select Room"}</option>
                    {availableRooms.map((room) => (
                      <option key={room._id} value={room._id}>
                        {room.roomNumber} — ₹{room.rentAmount}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ru-field">
                  <label className="ru-label">Bed *</label>
                  <select className="ru-select" value={form.bedId} onChange={handleBedChange} disabled={!form.roomId} required={!editData}>
                    <option value="">{bedsLoading ? "Loading..." : "Select Bed"}</option>
                    {availableBeds.map((bed) => (
                      <option key={bed._id} value={bed._id}>Bed {bed.bedNumber}</option>
                    ))}
                  </select>
                </div>
                <div className="ru-field full-width">
                  <label className="ru-label">Rent Amount (Auto-filled)</label>
                  <input className="ru-input" value={form.rentAmount || ""} readOnly />
                </div>
              </div>
            </div>

            {/* Financial & Joining */}
            <div className="ru-section">
              <h3 className="ru-section-title">Financial & Joining Details</h3>
              <div className="ru-grid">
                <div className="ru-field">
                  <label className="ru-label">Advance Amount</label>
                  <input type="number" className="ru-input" value={form.advanceAmount} onChange={onChange("advanceAmount")} placeholder="0" />
                </div>
                <div className="ru-field">
                  <label className="ru-label">Discount Amount</label>
                  <input type="number" className="ru-input" value={form.discountAmount} onChange={onChange("discountAmount")} placeholder="0" />
                </div>
                <div className="ru-field">
                  <label className="ru-label">Damage Charges</label>
                  <input type="number" className="ru-input" value={form.damageCharges} onChange={onChange("damageCharges")} placeholder="0" />
                </div>
                <div className="ru-field">
                  <label className="ru-label">Joined Date</label>
                  <input type="date" className="ru-input" value={form.joinedDate} onChange={onChange("joinedDate")} />
                </div>
              </div>
            </div>

            {/* Upload Files */}
            <div className="ru-section">
              <h3 className="ru-section-title">Upload Files</h3>
              <div className="ru-grid">
                <div className="ru-field ">
                  <label className="ru-label">
                    ID Proof Image {editData && "(Leave blank to keep existing)"}
                  </label>
                  <input type="file" accept="image/*" className="ru-input" onChange={onChange("idProofImage")} />
                </div>
                <div className="ru-field ">
                  <label className="ru-label">
                    User Photo {editData && "(Leave blank to keep existing)"}
                  </label>
                  <input type="file" accept="image/*" className="ru-input" onChange={onChange("userImage")} />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="ru-buttons">
              <button type="submit" className="ru-btn ru-btn-primary" disabled={loading}>
                {loading ? "Saving..." : editData ? "Update User" : "Register User"}
              </button>
              <button type="button" className="ru-btn" onClick={() => navigate("/dashboard")}>
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}