import React, { useEffect, useState, useMemo } from "react";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

// Build API endpoints from BASE_URL while avoiding duplicate slashes
const _apiBase = (BASE_URL || "").replace(/\/+$/, "");
const PAYMENTS_API_URL = `${_apiBase}/api/payments`;
const USER_SEARCH_API_URL = `${_apiBase}/api/userprofile/search-users`;
const RENT_PREVIEW_API_BASE = `${_apiBase}/api/userProfile`;
const OVERDUE_API_URL = `${_apiBase}/api/payments/overdue-users`;

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

// convert ISO/string date -> yyyy-mm-dd for <input type="date">
function toInputDate(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// convert ISO/string date -> yyyy-mm-ddTHH:mm for <input type="datetime-local">
function toInputDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

// ---- MERGE USER DATA FOR PAYMENTS ----
function getMergedPaymentUser(payment, users = [], selectedUser = null) {
  const uf = payment.user;
  let base =
    uf && typeof uf === "object" && uf !== null
      ? uf
      : {};

  const id =
    (typeof uf === "string" && uf) ||
    (uf && typeof uf === "object" && uf._id) ||
    null;

  let extra = null;

  if (id) {
    if (selectedUser && String(selectedUser._id) === String(id)) {
      extra = selectedUser;
    } else if (Array.isArray(users) && users.length > 0) {
      extra = users.find((u) => String(u._id) === String(id)) || null;
    }
  }

  return extra ? { ...base, ...extra } : base;
}

export default function PaymentsPage() {
  // search tenants
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [users, setUsers] = useState([]);

  // selected tenant
  const [selectedUser, setSelectedUser] = useState(null);

  // filter on payments list (by name/phone if needed)
  const [paymentFilter, setPaymentFilter] = useState("");

  // payment form (CREATE)
  const [amount, setAmount] = useState("");
  const [expectedRemaining, setExpectedRemaining] = useState(""); // remaining / expected rent
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("paid");
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // rent preview (from /userProfile/:id/rent-preview)
  const [rentPreview, setRentPreview] = useState(null);
  const [rentPreviewLoading, setRentPreviewLoading] = useState(false);
  const [rentPreviewError, setRentPreviewError] = useState("");

  // overdue (from /payments/overdue-users?userId=)
  const [overdueInfo, setOverdueInfo] = useState(null);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [overdueError, setOverdueError] = useState("");

  // payments from backend
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");

  // selected payment for OLD VALUES history (per payment id)
  const [selectedPaymentHistory, setSelectedPaymentHistory] = useState(null);

  // ----- EDIT PAYMENT (PUT /api/payments/:id) -----
  const [editPayment, setEditPayment] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editRemaining, setEditRemaining] = useState("");
  const [editStatus, setEditStatus] = useState("paid");
  const [editPaidAt, setEditPaidAt] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");

  // ---------- LOAD OVERDUE INFO FOR USER ----------
  const loadOverdueForUser = async (userId) => {
    if (!userId) {
      setOverdueInfo(null);
      setOverdueError("");
      setOverdueLoading(false);
      return;
    }

    try {
      setOverdueLoading(true);
      setOverdueError("");
      setOverdueInfo(null);

      const url = `${OVERDUE_API_URL}?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `Overdue fetch failed: HTTP ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();

      // expected shape:
      // {
      //   "total": 2250,
      //   "count": 1,
      //   "results": [
      //     {
      //       "_id": "userId",
      //       "unpaidTotal": 2250,
      //       ...
      //     }
      //   ]
      // }
      let info = null;
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        info = data.results[0];
      } else if (data && typeof data.unpaidTotal !== "undefined") {
        info = data;
      }

      setOverdueInfo(info);
    } catch (err) {
      console.error("Error loading overdue info:", err);
      setOverdueInfo(null);
      setOverdueError(err.message || "Failed to load overdue info");
    } finally {
      setOverdueLoading(false);
    }
  };

  // ---------- LOAD ALL PAYMENTS FROM API ----------
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

  // ---------- SEARCH TENANTS ----------
  const handleTenantSearchSubmit = async (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) {
      alert("Enter name / phone to search tenants.");
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError("");
      setUsers([]);

      const url = `${USER_SEARCH_API_URL}?q=${encodeURIComponent(
        q
      )}&limit=10`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(
          `User search failed: HTTP ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();
      const list = data.results || [];
      setUsers(list);
    } catch (err) {
      console.error("Error searching users:", err);
      setSearchError(err.message || "Failed to search users");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setCreateError("");
    setCreateSuccess("");
    setAmount("");
    setExpectedRemaining("");
    setFromDate("");
    setToDate("");
    setStatus("paid");
    setRentPreview(null);
    setRentPreviewError("");

    // load overdue from new API
    loadOverdueForUser(user._id);
  };

  // ---------- FILTER PAYMENTS ----------
  const getFilteredPayments = () => {
    let list = payments;

    if (selectedUser && selectedUser._id) {
      list = list.filter((p) => {
        const uf = p.user;
        if (!uf) return false;
        if (typeof uf === "string") {
          return String(uf) === String(selectedUser._id);
        }
        return uf._id && String(uf._id) === String(selectedUser._id);
      });
    }

    const filter = paymentFilter.trim().toLowerCase();
    if (filter) {
      list = list.filter((p) => {
        const u = getMergedPaymentUser(p, users, selectedUser);
        const name = (u.fullName || "").toLowerCase();
        const phone = (u.phone || "").toLowerCase();
        return name.includes(filter) || phone.includes(filter);
      });
    }

    return list;
  };

  const filteredPayments = getFilteredPayments();

  // ---------- TOTAL REMAINING FOR SELECTED USER (fallback if overdue API fails) ----------
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

  // ---------- ALL PAYMENTS FOR SELECTED USER ----------
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

  // ---------- RENT PREVIEW EFFECT ----------
  useEffect(() => {
    if (!selectedUser || !selectedUser._id || !fromDate || !toDate) {
      setRentPreview(null);
      setRentPreviewError("");
      setRentPreviewLoading(false);
      return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setRentPreview(null);
      setRentPreviewError("Invalid date range");
      setRentPreviewLoading(false);
      return;
    }

    if (from > to) {
      setRentPreview(null);
      setRentPreviewError("From Date cannot be after To Date");
      setRentPreviewLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchPreview = async () => {
      try {
        setRentPreviewLoading(true);
        setRentPreviewError("");

        const url = `${RENT_PREVIEW_API_BASE}/${selectedUser._id}/rent-preview?fromDate=${encodeURIComponent(
          fromDate
        )}&toDate=${encodeURIComponent(toDate)}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(
            `Rent preview failed: HTTP ${res.status} ${res.statusText}`
          );
        }

        const data = await res.json();
        // expecting shape:
        // { user: {...}, fromDate, toDate, days, expectedRent }
        setRentPreview(data || null);

        // auto-fill Amount + Remaining based on overdue unpaidTotal
        if (data && typeof data.expectedRent !== "undefined") {
          const expected = Number(data.expectedRent) || 0;
          const unpaidBase =
            overdueInfo && typeof overdueInfo.unpaidTotal !== "undefined"
              ? Number(overdueInfo.unpaidTotal || 0)
              : null;

          if (unpaidBase !== null) {
            // pay max possible for this range but not more than unpaid total
            const autoAmount = Math.min(expected, unpaidBase);
            const safeAmount = autoAmount > 0 ? autoAmount : 0;
            setAmount(safeAmount ? String(safeAmount) : "");
            const rem = unpaidBase - safeAmount;
            const safeRem = rem > 0 ? rem : 0;
            setExpectedRemaining(String(safeRem.toFixed(2)));
          } else {
            // fallback: old behavior
            setAmount(expected ? String(expected) : "");
            setExpectedRemaining("0");
          }
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Error fetching rent preview:", err);
        setRentPreview(null);
        setRentPreviewError(err.message || "Failed to load rent preview");
      } finally {
        setRentPreviewLoading(false);
      }
    };

    fetchPreview();

    return () => controller.abort();
  }, [selectedUser, fromDate, toDate, overdueInfo]);

  // ---------- AMOUNT CHANGE HANDLER (auto adjust remaining) ----------
  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);

    const paid = Number(val) || 0;

    // If overdue API available, base remaining on unpaidTotal
    if (overdueInfo && typeof overdueInfo.unpaidTotal !== "undefined") {
      const unpaidBase = Number(overdueInfo.unpaidTotal || 0);
      const rem = unpaidBase - paid;
      const safeRem = rem > 0 ? rem : 0;
      setExpectedRemaining(String(safeRem.toFixed(2)));
      return;
    }

    // Fallback to rent preview expectedRent if no overdue info
    if (rentPreview && typeof rentPreview.expectedRent !== "undefined") {
      const expected = Number(rentPreview.expectedRent) || 0;
      const rem = expected - paid;
      const safeRem = rem > 0 ? rem : 0;
      setExpectedRemaining(String(safeRem.toFixed(2)));
      return;
    }

    // Otherwise just leave it as is
    setExpectedRemaining("");
  };

  // ---------- CREATE PAYMENT ----------
  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!selectedUser || !selectedUser._id) {
      alert("Select a tenant first.");
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
        // remaining now comes from overdue unpaidTotal minus paid
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
      setRentPreview(null);
      setRentPreviewError("");

      setPayments((prev) => [createdPayment, ...prev]);

      // refresh overdue info from backend so unpaidTotal updates
      loadOverdueForUser(userId);
    } catch (err) {
      console.error("Error creating payment:", err);
      setCreateError(err.message || "Failed to create payment");
    } finally {
      setCreatingPayment(false);
    }
  };

  // ---------- START EDIT PAYMENT ----------
  const handleStartEditPayment = (p) => {
    setEditPayment(p);
    setUpdateError("");
    setUpdateSuccess("");
    setEditAmount(p.amount != null ? String(p.amount) : "");
    setEditRemaining(p.remaining != null ? String(p.remaining) : "");
    setEditStatus(p.status || "unpaid");
    setEditPaidAt(p.paidAt ? toInputDateTime(p.paidAt) : "");
  };

  // ---------- UPDATE PAYMENT (PUT /api/payments/:id) ----------
  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!editPayment || !editPayment._id) return;

    setUpdateError("");
    setUpdateSuccess("");

    if (
      !editAmount ||
      Number.isNaN(Number(editAmount)) ||
      Number(editAmount) < 0
    ) {
      alert("Enter a valid amount (0 or more).");
      return;
    }

    if (
      !editRemaining ||
      Number.isNaN(Number(editRemaining)) ||
      Number(editRemaining) < 0
    ) {
      alert("Enter a valid remaining amount (0 or more).");
      return;
    }

    if (!editStatus) {
      alert("Select a status.");
      return;
    }

    try {
      setUpdatingPayment(true);

      const body = {
        amount: Number(editAmount),
        remaining: Number(editRemaining),
        status: editStatus,
      };

      if (editPaidAt) {
        const dt = new Date(editPaidAt);
        if (!Number.isNaN(dt.getTime())) {
          body.paidAt = dt.toISOString();
        }
      }

      const res = await fetch(`${PAYMENTS_API_URL}/${editPayment._id}`, {
        method: "PUT",
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
          `Update payment failed: HTTP ${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      const updatedPayment = data && data.payment ? data.payment : data;
      if (!updatedPayment || !updatedPayment._id) {
        throw new Error("API did not return updated payment object.");
      }

      // refresh list
      setPayments((prev) =>
        prev.map((p) =>
          String(p._id) === String(updatedPayment._id) ? updatedPayment : p
        )
      );

      // refresh selected history if same payment
      setSelectedPaymentHistory((prev) =>
        prev && String(prev._id) === String(updatedPayment._id)
          ? updatedPayment
          : prev
      );

      // keep edit form in sync
      setEditPayment(updatedPayment);
      setEditAmount(
        updatedPayment.amount != null ? String(updatedPayment.amount) : ""
      );
      setEditRemaining(
        updatedPayment.remaining != null
          ? String(updatedPayment.remaining)
          : ""
      );
      setEditStatus(updatedPayment.status || "unpaid");
      setEditPaidAt(
        updatedPayment.paidAt ? toInputDateTime(updatedPayment.paidAt) : ""
      );

      setUpdateSuccess("Payment updated successfully.");

      // also refresh overdue info for this user if selected
      if (selectedUser && selectedUser._id) {
        loadOverdueForUser(selectedUser._id);
      }
    } catch (err) {
      console.error("Error updating payment:", err);
      setUpdateError(err.message || "Failed to update payment");
    } finally {
      setUpdatingPayment(false);
    }
  };

  // ---------- STYLES ----------
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

  const subTextStyle = {
    textAlign: "center",
    margin: "0 0 16px",
    fontSize: "11px",
    color: "#9ca3af",
  };

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    color: "#e5e7eb",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "999px",
    fontSize: "13px",
    outline: "none",
    background: "#000000",
    color: "#f9fafb",
  };

  const inputRectStyle = {
    ...inputStyle,
    borderRadius: "8px",
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
    backgroundColor: "transparent",
    fontSize: "12px",
    cursor: "pointer",
    color: "#f9fafb",
    whiteSpace: "nowrap",
  };

  const pillBtnSmall = {
    padding: "5px 10px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#ffffff",
    color: "#000000",
    fontSize: "11px",
    cursor: "pointer",
  };

  const historyBtnStyle = {
    padding: "4px 8px",
    borderRadius: "999px",
    backgroundColor: "transparent",
    fontSize: "10px",
    cursor: "pointer",
    color: "#f9fafb",
    whiteSpace: "nowrap",
  };

  const tableWrapperStyle = {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  };

  const tableStyle = {
    width: "100%"
    ,
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
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  const tdStyle = {
    padding: "7px 6px",
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

  const overdueRemaining =
    overdueInfo && typeof overdueInfo.unpaidTotal !== "undefined"
      ? Number(overdueInfo.unpaidTotal || 0)
      : null;

  const displayRemaining = overdueRemaining ?? totalRemainingForSelectedUser;

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <h2 style={headingMainStyle}>Tenant Payments</h2>

        <p style={subTextStyle}>
          Data is loaded from{" "}
          <code style={{ color: "#d1d5db" }}>/api/payments</code> and overdue
          from <code style={{ color: "#d1d5db" }}>/api/payments/overdue-users</code>.
          Use tenant search to lock on one user, then record payments. Mobile-first layout;
          scroll horizontally for wide tables.
        </p>

        {/* TENANT SEARCH */}
        <div style={cardStyle}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Search Tenants
          </h3>
          <form
            onSubmit={handleTenantSearchSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Search by name / phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="submit"
                style={primaryBtnStyle(searchLoading)}
                disabled={searchLoading}
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {searchError && (
            <p style={{ marginTop: "10px" }}>
              <span style={badgeError}>Error: {searchError}</span>
            </p>
          )}

          {users.length > 0 && (
            <div style={{ marginTop: "12px", ...tableWrapperStyle }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Floor / Room / Bed</th>
                    <th style={thStyle}>Advance</th>
                    <th style={thStyle}>Damage</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr
                      key={u._id || idx}
                      style={{
                        backgroundColor:
                          selectedUser && selectedUser._id === u._id
                            ? "#111827"
                            : "#000000",
                      }}
                    >
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}>{u.fullName || "-"}</td>
                      <td style={tdStyle}>{u.phone || "-"}</td>
                      <td style={tdStyle}>
                        {u.floor || "-"} / {u.roomNumber || "-"} /{" "}
                        {u.bedNumber || "-"}
                      </td>
                      <td style={tdStyle}>
                        ₹{Number(u.advanceAmount || 0).toFixed(2)}
                      </td>
                      <td style={tdStyle}>
                        ₹{Number(u.damageCharges || 0).toFixed(2)}
                      </td>
                      <td style={tdStyle}>
                        {u.isActive ? "Active" : "Inactive"}
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          onClick={() => handleSelectUser(u)}
                          style={pillBtnSmall}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!searchLoading && !searchError && users.length === 0 && (
            <p
              style={{
                marginTop: "10px",
                fontSize: "11px",
                color: "#9ca3af",
              }}
            >
              Search to list tenants.
            </p>
          )}
        </div>

        {/* SELECTED TENANT + PAYMENT FORM (CREATE) */}
        {selectedUser && (
          <div style={cardStyle}>
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Selected Tenant
            </h3>
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
              Total Remaining:&nbsp;
              {overdueLoading ? (
                <span>Loading...</span>
              ) : (
                <strong>₹{displayRemaining.toFixed(2)}</strong>
              )}
            </p>
            {overdueError && (
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "11px",
                }}
              >
                <span style={badgeError}>Overdue: {overdueError}</span>
              </p>
            )}

            <hr
              style={{
                border: "none",
                borderTop: "1px solid #1f2933",
                margin: "8px 0 12px",
              }}
            />

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

              {/* RENT PREVIEW DISPLAY */}
              <div
                style={{
                  fontSize: "11px",
                  marginTop: "2px",
                  color: "#9ca3af",
                  minHeight: "16px",
                }}
              >
                {rentPreviewLoading && (
                  <span>Calculating rent for selected period...</span>
                )}
                {!rentPreviewLoading && rentPreviewError && (
                  <span style={{ color: "#fecaca" }}>
                    Rent preview error: {rentPreviewError}
                  </span>
                )}
                {!rentPreviewLoading &&
                  !rentPreviewError &&
                  rentPreview &&
                  typeof rentPreview.expectedRent !== "undefined" && (
                    <span>
                      Rent for{" "}
                      <strong>{rentPreview.days ?? "-"}</strong> days (
                      {formatDateOnly(rentPreview.fromDate)} →{" "}
                      {formatDateOnly(rentPreview.toDate)}) ={" "}
                      <strong>
                        ₹{Number(rentPreview.expectedRent || 0).toFixed(2)}
                      </strong>
                    </span>
                  )}
              </div>

              <div>
                <label style={labelStyle}>Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  style={inputRectStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Remaining / Outstanding Rent (₹)
                </label>
                <input
                  type="number"
                  value={expectedRemaining}
                  onChange={(e) => setExpectedRemaining(e.target.value)}
                  style={inputRectStyle}
                />
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

            {/* PER-TENANT PAYMENT HISTORY */}
            <hr
              style={{
                border: "none",
                borderTop: "1px solid #1f2933",
                margin: "10px 0 8px",
              }}
            />
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

            {selectedUserPayments.length === 0 ? (
              <p
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  margin: 0,
                }}
              >
                No payments recorded for this tenant yet.
              </p>
            ) : (
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
        )}

        {/* PAYMENTS TABLE (READ-ONLY + EDIT) */}
        <div style={cardStyle}>
          <h3
            style={{
              margin: "0 0 8px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Payments (Auto from /api/payments)
          </h3>

          {/* FILTER BY NAME / PHONE */}
          <div
            style={{
              marginBottom: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Filter by name / phone..."
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={inputStyle}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPaymentFilter("");
                  setSelectedUser(null);
                  setSelectedPaymentHistory(null);
                  setRentPreview(null);
                  setRentPreviewError("");
                  setFromDate("");
                  setToDate("");
                  setEditPayment(null);
                  setUpdateError("");
                  setUpdateSuccess("");
                  setOverdueInfo(null);
                  setOverdueError("");
                  setOverdueLoading(false);
                }}
                style={outlineBtnStyle}
              >
                Clear Filters
              </button>
            </div>
          </div>

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
            filteredPayments.length === 0 &&
            !paymentsError && (
              <p
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                }}
              >
                No payments match the current filters.
              </p>
            )}

          {!paymentsLoading && filteredPayments.length > 0 && (
            <>
              <div style={tableWrapperStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Name / Phone</th>
                      <th style={thStyle}>Floor / Room / Bed</th>
                      <th style={thStyle}>Amount (₹)</th>
                      <th style={thStyle}>Remaining (₹)</th>
                      <th style={thStyle}>Period</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Paid At</th>
                      <th style={thStyle}>Created At</th>
                      <th style={thStyle}>Allocations</th>
                      <th style={thStyle}>Edit</th>
                      <th style={thStyle}>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p, idx) => {
                      const u = getMergedPaymentUser(p, users, selectedUser);
                      const hasHistory =
                        Array.isArray(p.oldValues) &&
                        p.oldValues.length > 0;

                      return (
                        <tr
                          key={p._id || idx}
                          style={{
                            backgroundColor: "#000000",
                          }}
                        >
                          <td style={tdStyle}>{idx + 1}</td>
                          <td style={tdStyle}>
                            <strong>{u.fullName || "-"}</strong>
                            <br />
                            <span style={{ color: "#9ca3af" }}>
                              {u.phone ||
                                (typeof p.user === "string"
                                  ? p.user
                                  : "-")}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {u.floor || "-"} / {u.roomNumber || "-"} /{" "}
                            {u.bedNumber || "-"}
                          </td>
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
                          <td style={tdStyle}>
                            {formatDateTime(p.paidAt)}
                          </td>
                          <td style={tdStyle}>
                            {formatDateTime(p.createdAt)}
                          </td>
                          <td style={tdStyle}>
                            {Array.isArray(p.allocations) &&
                            p.allocations.length > 0 ? (
                              <div style={{ lineHeight: 1.3 }}>
                                {p.allocations.map((a, i) => (
                                  <div key={i}>
                                    <strong>{a.month || "-"}</strong>: Exp{" "}
                                    {a.expected ?? 0}, Paid{" "}
                                    {a.paid ?? 0}, Unpaid{" "}
                                    {a.unpaid ?? 0}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={tdStyle}>
                            <button
                              type="button"
                              style={historyBtnStyle}
                              onClick={() => handleStartEditPayment(p)}
                            >
                              Edit
                            </button>
                          </td>
                          <td style={tdStyle}>
                            {hasHistory ? (
                              <button
                                type="button"
                                style={historyBtnStyle}
                                onClick={() =>
                                  setSelectedPaymentHistory(p)
                                }
                              >
                                View
                              </button>
                            ) : (
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: "#6b7280",
                                }}
                              >
                                No history
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* EDIT PAYMENT INLINE CARD */}
              {editPayment && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px 10px",
                    borderRadius: "10px",
                    border: "1px solid #1f2933",
                    background: "#020617",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Edit Payment –{" "}
                      <span style={{ color: "#9ca3af" }}>
                        {editPayment._id || ""}
                      </span>
                    </h4>
                    <button
                      type="button"
                      style={historyBtnStyle}
                      onClick={() => {
                        setEditPayment(null);
                        setUpdateError("");
                        setUpdateSuccess("");
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: "12px",
                    }}
                  >
                    <strong>Latest Remaining:</strong>{" "}
                    <span style={{ color: "#fbbf24" }}>
                      ₹{Number(editPayment.remaining ?? 0).toFixed(2)}
                    </span>{" "}
                    &nbsp;|&nbsp; <strong>Amount:</strong>{" "}
                    ₹{Number(editPayment.amount || 0).toFixed(2)} &nbsp;|&nbsp;
                    <strong>Status:</strong>{" "}
                    {(editPayment.status || "unpaid").toUpperCase()}
                  </p>

                  <form
                    onSubmit={handleUpdatePayment}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Amount (₹)</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        style={inputRectStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Remaining Balance (₹)
                      </label>
                      <input
                        type="number"
                        value={editRemaining}
                        onChange={(e) =>
                          setEditRemaining(e.target.value)
                        }
                        style={inputRectStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) =>
                          setEditStatus(e.target.value)
                        }
                        style={selectStyle}
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="upcoming">Upcoming</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Paid At (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={editPaidAt}
                        onChange={(e) =>
                          setEditPaidAt(e.target.value)
                        }
                        style={inputRectStyle}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: "4px",
                      }}
                    >
                      <button
                        type="submit"
                        disabled={updatingPayment}
                        style={primaryBtnStyle(updatingPayment)}
                      >
                        {updatingPayment
                          ? "Updating..."
                          : "Update Payment"}
                      </button>
                    </div>
                  </form>

                  {updateError && (
                    <p style={{ marginTop: "8px" }}>
                      <span style={badgeError}>{updateError}</span>
                    </p>
                  )}

                  {updateSuccess && (
                    <p style={{ marginTop: "8px" }}>
                      <span style={badgeSuccess}>{updateSuccess}</span>
                    </p>
                  )}
                </div>
              )}

              {/* PER-PAYMENT OLD VALUES HISTORY (by payment id) */}
              {selectedPaymentHistory && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px 10px",
                    borderRadius: "10px",
                    border: "1px solid #1f2933",
                    background: "#020617",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Change History – Payment ID{" "}
                      <span style={{ color: "#9ca3af" }}>
                        {selectedPaymentHistory._id || ""}
                      </span>
                    </h4>
                    <button
                      type="button"
                      style={historyBtnStyle}
                      onClick={() =>
                        setSelectedPaymentHistory(null)
                      }
                    >
                      Close
                    </button>
                  </div>

                  {Array.isArray(selectedPaymentHistory.oldValues) &&
                  selectedPaymentHistory.oldValues.length > 0 ? (
                    <div style={tableWrapperStyle}>
                      <table style={tableStyle}>
                        <thead>
                          <tr>
                            <th style={thStyle}>#</th>
                            <th style={thStyle}>Amount (₹)</th>
                            <th style={thStyle}>Remaining (₹)</th>
                            <th style={thStyle}>Period</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Paid At</th>
                            <th style={thStyle}>Changed At</th>
                            <th style={thStyle}>Allocations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPaymentHistory.oldValues.map(
                            (ov, idx) => (
                              <tr key={idx}>
                                <td style={tdStyle}>{idx + 1}</td>
                                <td style={tdStyle}>
                                  ₹{Number(ov.amount || 0).toFixed(2)}
                                </td>
                                <td style={tdStyle}>
                                  ₹{Number(ov.remaining ?? 0).toFixed(2)}
                                </td>
                                <td style={tdStyle}>
                                  {formatDateOnly(ov.fromDate)} &rarr;{" "}
                                  {formatDateOnly(ov.toDate)}
                                </td>
                                <td style={tdStyle}>
                                  {(ov.status || "").toUpperCase()}
                                </td>
                                <td style={tdStyle}>
                                  {formatDateTime(ov.paidAt)}
                                </td>
                                <td style={tdStyle}>
                                  {formatDateTime(
                                    ov.changedAt || ov.updatedAt
                                  )}
                                </td>
                                <td style={tdStyle}>
                                  {Array.isArray(ov.allocations) &&
                                  ov.allocations.length > 0 ? (
                                    <div
                                      style={{ lineHeight: 1.3 }}
                                    >
                                      {ov.allocations.map(
                                        (a, i) => (
                                          <div key={i}>
                                            <strong>
                                              {a.month ||
                                                "-"}
                                            </strong>
                                            : Exp{" "}
                                            {a.expected ?? 0}, Paid{" "}
                                            {a.paid ?? 0}, Unpaid{" "}
                                            {a.unpaid ?? 0}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        margin: 0,
                      }}
                    >
                      No previous versions / old values recorded for
                      this payment.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
