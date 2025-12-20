import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Data passed from UserProfileList -> goToCheckout(user)
  const checkoutUser = location.state?.checkoutUser || null;

  const API_BASE = BASE_URL;

  const [isActive, setIsActive] = useState("false"); // for checkout usually inactive
  const [exitDate, setExitDate] = useState("");
  const [loading, setLoading] = useState(false);

  // When backend says there are dues:
  // { message, unpaidRent, damageCharges }
  const [dueInfo, setDueInfo] = useState(null);

  // Prefill from user if present
  useEffect(() => {
    if (!checkoutUser) return;

    // default: mark as inactive on checkout
    setIsActive(checkoutUser.isActive ? "true" : "false");

    if (checkoutUser.exitDate) {
      const d = new Date(checkoutUser.exitDate);
      if (!isNaN(d.getTime())) {
        setExitDate(d.toISOString().split("T")[0]);
      }
    }
  }, [checkoutUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkoutUser || !checkoutUser._id) {
      alert("No user data found for checkout.");
      return;
    }

    if (!exitDate) {
      alert("Please select Exit Date.");
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("isActive", isActive === "true");
      fd.append("exitDate", exitDate);

      const API_URL = `${API_BASE}/api/userprofile/${checkoutUser._id}`;

      const res = await axios.put(API_URL, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res?.data || {};

      // If backend returns dues in success response
      if (
        data &&
        typeof data === "object" &&
        (Number(data.unpaidRent) > 0 || Number(data.damageCharges) > 0)
      ) {
        setDueInfo({
          message:
            data.message || "User has pending dues. Checkout cannot be completed.",
          unpaidRent: Number(data.unpaidRent) || 0,
          damageCharges: Number(data.damageCharges) || 0,
        });
        // Do NOT navigate – checkout blocked
        return;
      }

      alert("Checkout details updated successfully.");
      navigate("/dashboard"); // change if your list route is different
    } catch (err) {
      console.error("Checkout update error:", err.response?.data || err.message);

      const data = err.response?.data;

      // If backend throws error with dues info like:
      // { "message": "User has pending dues. Cannot vacate.", "unpaidRent": 10000, "damageCharges": 0 }
      if (
        data &&
        typeof data === "object" &&
        (Number(data.unpaidRent) > 0 || Number(data.damageCharges) > 0)
      ) {
        setDueInfo({
          message:
            data.message || "User has pending dues. Checkout cannot be completed.",
          unpaidRent: Number(data.unpaidRent) || 0,
          damageCharges: Number(data.damageCharges) || 0,
        });
      } else {
        alert("Failed to update checkout details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  const closeDuePopup = () => {
    setDueInfo(null);
  };

  const formatAmount = (value) => {
    const num = Number(value || 0);
    return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  if (!checkoutUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            maxWidth: "400px",
            width: "100%",
            border: "1px solid #fff",
            borderRadius: "14px",
            padding: "18px 16px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 10 }}>No User Selected</h2>
          <p style={{ fontSize: 13, marginBottom: 16 }}>
            Open the user list and click on Checkout again.
          </p>
          <button
            style={{
              background: "#000",
              color: "#fff",
              border: "2px solid #fff",
              borderRadius: "10px",
              padding: "8px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => navigate("/dashboard")}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        html, #root {
          margin: 0;
          padding: 0;
          background: #000 !important;
        }
        .co-page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 24px 16px 40px;
        }

        .co-card {
          width: min(500px, 100%);
          background: #000;
          border-radius: 16px;
          padding: 20px 18px 26px;
          box-shadow: 0 0 25px rgba(255,255,255,0.08);
          border: 1px solid #fff;
        }

        .co-title {
          margin: 0 0 10px;
          font-size: 20px;
          font-weight: 800;
          text-align: center;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .co-subtitle {
          margin: 0 0 18px;
          font-size: 13px;
          text-align: center;
          color: #ccc;
        }

        .co-form {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .co-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .co-label {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
        }

        .co-input,
        .co-select {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #fff;
          background: #000;
          color: #fff;
          outline: none;
          font-size: 14px;
        }

        .co-hint {
          font-size: 11px;
          color: #ccc;
        }

        .co-user-summary {
          font-size: 13px;
          margin-bottom: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px dashed #555;
          background: rgba(255,255,255,0.03);
        }

        .co-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .co-btn {
          min-width: 130px;
          background: #000;
          color: #fff;
          border: 2px solid #fff;
          border-radius: 10px;
          padding: 10px 22px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          letter-spacing: 0.6px;
          transition: 0.2s ease;
        }

        .co-btn.primary:hover:not(:disabled) {
          background: #fff;
          color: #000;
          transform: translateY(-1px);
        }

        .co-btn.secondary:hover:not(:disabled) {
          background: #444;
          transform: translateY(-1px);
        }

        .co-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ===== DUES MODAL ===== */
        .co-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 16px;
        }

        .co-modal {
          width: min(420px, 100%);
          background: #000;
          border-radius: 16px;
          padding: 20px 18px 18px;
          border: 1px solid #fff;
          box-shadow: 0 0 30px rgba(255,255,255,0.15);
        }

        .co-modal-title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 800;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .co-modal-msg {
          font-size: 13px;
          text-align: center;
          color: #f5b14c;
          margin-bottom: 12px;
        }

        .co-modal-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          color: #fff;
        }

        .co-modal-table th,
        .co-modal-table td {
          border: 1px solid #555;
          padding: 8px 10px;
          font-size: 13px;
        }

        .co-modal-table th {
          background: #111;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .co-modal-table td {
          background: #050505;
        }

        .co-modal-note {
          font-size: 11px;
          color: #ccc;
          text-align: center;
          margin-top: 4px;
        }

        .co-modal-actions {
          display: flex;
          justify-content: center;
          margin-top: 14px;
        }

        .co-modal-btn {
          background: #000;
          color: #fff;
          border: 2px solid #fff;
          border-radius: 10px;
          padding: 8px 20px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          letter-spacing: 0.6px;
          transition: 0.2s ease;
        }

        .co-modal-btn:hover {
          background: #fff;
          color: red;
          transform: translateY(-1px);
        }

        @media (max-width: 600px) {
          .co-card {
            padding: 16px 12px 20px;
          }

          .co-title {
            font-size: 18px;
          }

          .co-modal {
            padding: 16px 12px 14px;
          }
        }
      `}</style>

      <div className="co-page">
        <div className="co-card">
          <h2 className="co-title">Checkout</h2>
          <p className="co-subtitle">
            Update only Active Status and Exit Date for this user.
          </p>

          {/* Small summary of user */}
          <div className="co-user-summary">
            <div>
              <strong>Name:</strong> {checkoutUser.fullName || "-"}
            </div>
            <div>
              <strong>Phone:</strong> {checkoutUser.phone || "-"}
            </div>
            <div>
              <strong>Room:</strong>{" "}
              {checkoutUser.floor || "-"} /{" "}
              {checkoutUser.roomNumber || "-"} / Bed{" "}
              {checkoutUser.bedNumber || "-"}
            </div>
          </div>

          <form className="co-form" onSubmit={handleSubmit}>
            {/* ACTIVE STATUS */}
            <div className="co-row">
              <label className="co-label">Active Status</label>
              <select
                className="co-select"
                value={isActive}
                onChange={(e) => setIsActive(e.target.value)}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <span className="co-hint">
                For checkout, usually set to Inactive.
              </span>
            </div>

            {/* EXIT DATE */}
            <div className="co-row">
              <label className="co-label">Exit Date</label>
              <input
                className="co-input"
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="co-actions">
              <button
                className="co-btn primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Updating..." : "Submit"}
              </button>

              <button
                className="co-btn secondary"
                type="button"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PENDING DUES POPUP */}
      {dueInfo && (
        <div className="co-overlay">
          <div className="co-modal">
            <h3 className="co-modal-title">Pending Dues</h3>
            <p className="co-modal-msg">{dueInfo.message}</p>

            <table className="co-modal-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Unpaid Rent</td>
                  <td>{formatAmount(dueInfo.unpaidRent)}</td>
                </tr>
                <tr>
                  <td>Damage Charges</td>
                  <td>{formatAmount(dueInfo.damageCharges)}</td>
                </tr>
              </tbody>
            </table>

            <div className="co-modal-note">
              Checkout cannot be completed until these dues are cleared.
              <br />
              Please collect the amount from tenant and update accounts.
            </div>

            <div className="co-modal-actions">
              <button className="co-modal-btn" onClick={closeDuePopup}>
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
