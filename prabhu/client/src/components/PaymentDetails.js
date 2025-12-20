import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { STATUS_CODE, BASE_URL } from "../API/Constants";


const PAYMENTS_API_URL = (BASE_URL || "").replace(/\/+$/, "") + "/api/payments";

function formatDateTime(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

function formatDateOnly(dt) {
  if (!dt) return "-";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleDateString();
}

export default function PaymentDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  // user passed from PaymentsPage
  const selectedUser = (location.state && location.state.user) || null;

  // payment form (CREATE)
  const [amount, setAmount] = useState("");
  const [expectedRemaining, setExpectedRemaining] = useState(""); // remaining / expected rent
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("paid");
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // payments from backend
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  // ---------- LOAD ALL PAYMENTS ----------
  const loadAllPayments = async () => {
    try {
      setPaymentsLoading(true);
      setPaymentsError("");
      const res = await fetch(PAYMENTS_API_URL);
      if (!res.ok) {
        throw new Error(
          `Fetch payments failed: HTTP ${res.status} ${res.statusText}`
        );
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.payments || [];
      setPayments(list);
    } catch (err) {
      console.error("Error loading payments:", err);
      setPaymentsError(err.message || "Failed to load payments");
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    loadAllPayments();
  }, []);

  // ---------- ALL PAYMENTS FOR THIS USER ----------
  const selectedUserPayments = useMemo(() => {
    if (!selectedUser || !selectedUser._id) return [];
    return payments.filter((p) => {
      const uf = p.user;
      if (!uf) return false;
      if (typeof uf === "string") {
        return String(uf) === String(selectedUser._id);
      }
      return uf._id && String(uf._id) === String(selectedUser._id);
    });
  }, [selectedUser, payments]);

  // ---------- TOTAL REMAINING ----------
  const totalRemainingForSelectedUser = useMemo(() => {
    if (!selectedUser || !selectedUser._id) return 0;
    return payments
      .filter((p) => {
        const uf = p.user;
        if (!uf) return false;
        if (typeof uf === "string") {
          return String(uf) === String(selectedUser._id);
        }
        return uf._id && String(uf._id) === String(selectedUser._id);
      })
      .reduce((sum, p) => sum + Number(p.remaining ?? 0), 0);
  }, [selectedUser, payments]);

  // ---------- CREATE PAYMENT ----------
  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!selectedUser || !selectedUser._id) {
      alert("No tenant selected.");
      return;
    }

    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("Enter a valid positive amount.");
      return;
    }

    if (
      !expectedRemaining ||
      Number.isNaN(Number(expectedRemaining)) ||
      Number(expectedRemaining) < 0
    ) {
      alert("Enter Remaining / Expected Rent.");
      return;
    }

    if (!fromDate || !toDate) {
      alert("Select From Date and To Date.");
      return;
    }

    try {
      setCreatingPayment(true);

      const userId = selectedUser._id;

      const body = {
        user: userId,
        amount: Number(amount),
        remaining: Number(expectedRemaining),
        fromDate,
        toDate,
        status,
      };

      const res = await fetch(PAYMENTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      let rawText = "";
      try {
        rawText = await res.text();
      } catch {
        rawText = "";
      }

      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          rawText ||
          `Create payment failed: HTTP ${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      const rawPayment = data && data.payment ? data.payment : null;
      if (!rawPayment) {
        throw new Error("API did not return 'payment' object.");
      }

      let createdPayment = rawPayment;
      if (
        createdPayment.user &&
        typeof createdPayment.user === "string" &&
        selectedUser
      ) {
        createdPayment = {
          ...createdPayment,
          user: selectedUser,
        };
      }

      setCreateSuccess("Payment recorded successfully.");

      setAmount("");
      setExpectedRemaining("");
      setFromDate("");
      setToDate("");
      setStatus("paid");

      // add new payment into state so history updates immediately
      setPayments((prev) => [createdPayment, ...prev]);
    } catch (err) {
      console.error("Error creating payment:", err);
      setCreateError(err.message || "Failed to create payment");
    } finally {
      setCreatingPayment(false);
    }
  };

  // ---------- STYLES (same look as PaymentsPage) ----------
  const pageStyle = {
    padding: "16px 12px 24px",
    background: "#000000",
    minHeight: "100vh",
    color: "#f9fafb",
    fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  };

  const shellStyle = {
    maxWidth: "960px",
    margin: "0 auto",
  };

  const cardStyle = {
    marginBottom: "16px",
    padding: "12px 12px",
    borderRadius: "12px",
    background: "#050505",
  };

  const headingMainStyle = {
    textAlign: "center",
    margin: "0 0 4px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontSize: "16px",
    fontWeight: 700,
  };

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    color: "#e5e7eb",
  };

  const inputRectStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    fontSize: "13px",
    outline: "none",
    background: "#000000",
    color: "#f9fafb",
  };

  const selectStyle = {
    ...inputRectStyle,
    appearance: "none",
  };

  const primaryBtnStyle = (disabled) => ({
    padding: "9px 16px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: disabled ? "#6b7280" : "#ffffff",
    color: "#000000",
    fontSize: "13px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  });

  const outlineBtnStyle = {
    padding: "7px 13px",
    borderRadius: "999px",
    border: "1px solid #4b5563",
    backgroundColor: "transparent",
    fontSize: "12px",
    cursor: "pointer",
    color: "#f9fafb",
    whiteSpace: "nowrap",
  };

  const tableWrapperStyle = {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11px",
    minWidth: "600px",
  };

  const thStyle = {
    padding: "8px 6px",
    textAlign: "left",
    whiteSpace: "nowrap",
    background: "#111827",
    color: "#f9fafb",
    borderBottom: "1px solid #374151",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  const tdStyle = {
    padding: "7px 6px",
    borderBottom: "1px solid #1f2933",
    verticalAlign: "top",
  };

  const badgeError = {
    fontSize: "11px",
    color: "#fecaca",
    background: "#7f1d1d",
    padding: "6px 8px",
    borderRadius: "999px",
    display: "inline-block",
  };

  const badgeSuccess = {
    fontSize: "11px",
    color: "#bbf7d0",
    background: "#14532d",
    padding: "6px 8px",
    borderRadius: "999px",
    display: "inline-block",
  };

  // if somebody opens this page directly without navigation
  if (!selectedUser) {
    return (
      <div style={pageStyle}>
        <div style={shellStyle}>
          <h2 style={headingMainStyle}>Payment Details</h2>
          <div style={cardStyle}>
            <p style={{ fontSize: "12px", marginBottom: "12px" }}>
              No tenant data provided. Open this page from the Payments search
              page.
            </p>
            <button
              type="button"
              style={outlineBtnStyle}
              onClick={() => navigate("/payments")}
            >
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <h2 style={headingMainStyle}>Payment Details</h2>

        {/* TOP: TENANT INFO + TOTAL REMAINING + BACK BUTTON */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "12px",
                }}
              >
                <strong>{selectedUser.fullName}</strong> &nbsp; | &nbsp;
                {selectedUser.phone}
              </p>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "12px",
                }}
              >
                Floor: {selectedUser.floor || "-"} &nbsp; | Room:{" "}
                {selectedUser.roomNumber || "-"} &nbsp; | Bed:{" "}
                {selectedUser.bedNumber || "-"}
              </p>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "12px",
                  color: "#e5e7eb",
                }}
              >
                Total Remaining:{" "}
                <strong>₹{totalRemainingForSelectedUser.toFixed(2)}</strong>
              </p>
            </div>
            <div>
              <button
                type="button"
                style={outlineBtnStyle}
                onClick={() => navigate("/payments")}
              >
                Back to Payments
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE: RECORD PAYMENT FORM */}
        <div style={cardStyle}>
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Record Payment
          </h4>

          <form
            onSubmit={handleCreatePayment}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "8px",
            }}
          >
            <div>
              <label style={labelStyle}>Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={inputRectStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Remaining / Expected Rent (₹)</label>
              <input
                type="number"
                value={expectedRemaining}
                onChange={(e) => setExpectedRemaining(e.target.value)}
                style={inputRectStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={inputRectStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={inputRectStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="unpaid">Unpaid</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="submit"
                disabled={creatingPayment}
                style={primaryBtnStyle(creatingPayment)}
              >
                {creatingPayment ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </form>

          {createError && (
            <p>
              <span style={badgeError}>{createError}</span>
            </p>
          )}

          {createSuccess && (
            <p>
              <span style={badgeSuccess}>{createSuccess}</span>
            </p>
          )}
        </div>

        {/* BOTTOM: PAYMENT HISTORY FOR THIS TENANT */}
        <div style={cardStyle}>
          <h4
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Payment History (This Tenant)
          </h4>

          {paymentsLoading && (
            <p
              style={{
                fontSize: "11px",
                color: "#9ca3af",
                marginBottom: "8px",
              }}
            >
              Loading payments...
            </p>
          )}

          {paymentsError && !paymentsLoading && (
            <p style={{ marginBottom: "8px" }}>
              <span style={badgeError}>Error: {paymentsError}</span>
            </p>
          )}

          {!paymentsLoading &&
            !paymentsError &&
            selectedUserPayments.length === 0 && (
              <p
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  margin: 0,
                }}
              >
                No payments recorded for this tenant yet.
              </p>
            )}

          {!paymentsLoading &&
            !paymentsError &&
            selectedUserPayments.length > 0 && (
              <div style={{ ...tableWrapperStyle, marginTop: "4px" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Amount (₹)</th>
                      <th style={thStyle}>Remaining (₹)</th>
                      <th style={thStyle}>Period</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUserPayments.map((p, idx) => (
                      <tr key={p._id || idx}>
                        <td style={tdStyle}>{idx + 1}</td>
                        <td style={tdStyle}>
                          ₹{Number(p.amount || 0).toFixed(2)}
                        </td>
                        <td style={tdStyle}>
                          ₹{Number(p.remaining ?? 0).toFixed(2)}
                        </td>
                        <td style={tdStyle}>
                          {formatDateOnly(p.fromDate)} &rarr;{" "}
                          {formatDateOnly(p.toDate)}
                        </td>
                        <td style={tdStyle}>
                          {(p.status || "").toUpperCase()}
                        </td>
                        <td style={tdStyle}>{formatDateTime(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
