import React, { useEffect, useState, useMemo } from "react";
import { STATUS_CODE, BASE_URL } from "../API/Constants";

// build API base from BASE_URL, trimming trailing slash
const _apiBase = (BASE_URL || "").replace(/\/+$/, "");
const SUMMARY_API_URL = `${_apiBase}/api/payments/summary-report`;

// Each column is a 2-month band.
// The *first* month in the pair is what we use for coverage logic.
const MONTH_KEYS = [
  "01-02",
  "02-03",
  "03-04",
  "04-05",
  "05-06",
  "06-07",
  "07-08",
  "08-09",
  "09-10",
  "10-11",
  "11-12",
  "12-01",
];

const MONTH_LABELS = [
  "Jan-Feb",
  "Feb-Mar",
  "Mar-Apr",
  "Apr-May",
  "May-Jun",
  "Jun-Jul",
  "Jul-Aug",
  "Aug-Sep",
  "Sep-Oct",
  "Oct-Nov",
  "Nov-Dec",
  "Dec-Jan",
];

function formatCurrency(value) {
  const num = Number(value || 0);
  return `₹${num.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

// ✅ Helper: check if a given month band (e.g. "11-12") is covered
// by ANY periodStart/periodEnd in this row.
// We treat the band as starting at the *first* month (11 = Nov),
// and we consider the end month as EXCLUSIVE.
// So 07-11-2025 → 07-12-2025 only hits the "11-12" band, NOT "12-01".
function isMonthCoveredByAnyPeriod(row, monthKey) {
  const monthsArr = row.months || [];

  // monthKey like "11-12" → take "11"
  const firstPart = monthKey.slice(0, 2);
  const monthNum = parseInt(firstPart, 10);
  if (Number.isNaN(monthNum)) return false;

  const monthIndex = monthNum - 1; // 0-based (0=Jan, 10=Nov, 11=Dec)

  for (const m of monthsArr) {
    if (!m.periodStart || !m.periodEnd) continue;

    const ps = new Date(m.periodStart);
    const pe = new Date(m.periodEnd);
    if (Number.isNaN(ps.getTime()) || Number.isNaN(pe.getTime())) continue;

    const startYear = ps.getFullYear();
    const endYear = pe.getFullYear();
    const startMonth = ps.getMonth(); // 0-based
    const endMonth = pe.getMonth(); // 0-based

    if (startYear === endYear) {
      // Same year

      // If period is within a single calendar month, mark only that band.
      if (startMonth === endMonth) {
        if (monthIndex === startMonth) return true;
      } else {
        // Use [startMonth, endMonth) – end month EXCLUSIVE
        if (monthIndex >= startMonth && monthIndex < endMonth) {
          return true;
        }
      }
    } else if (startYear < endYear) {
      // Crosses year boundary.
      // Treat months from startMonth..Dec (11) and Jan (0)..endMonth (exclusive).
      // Use OR because we don't know the year of the band, only the month number.
      if (monthIndex >= startMonth || monthIndex < endMonth) {
        return true;
      }
    }
  }

  return false;
}

// ===============================================================
// STYLES – COPIED FROM UserProfileList.jsx
// ===============================================================

const containerStyle = {
  padding: "20px",
  background: "#000",
  minHeight: "100vh",
  color: "#fff",
  fontFamily: "'Segoe UI', Arial, sans-serif",
};

const headerBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  flexWrap: "wrap",
  gap: "15px",
};

// Reusing addButtonStyle for the main title/header bar container
const titleBarStyle = {
  background: "#7f8c8d", // Replaced original titleBarStyle with the button background color for consistency
  color: "white",
  padding: "5px 5px",
  fontSize: "8px",
  fontWeight: "bold",
  border: "1px solid #fff",
  borderRadius: "2px",
  textAlign: "center",
  marginBottom: "20px", // Added margin bottom for spacing
};

const tableWrapperStyle = {
  overflowX: "auto",
  border: "2px solid #333",
  borderRadius: "1px",
  background: "#111",
  WebkitOverflowScrolling: "touch",
};

const tableStyle = {
  width: "100%",
  minWidth: "1500px",
  border: "1px solid #fff",
  borderCollapse: "collapse", // Added this property
};

const thStyle = {
  background: "#7f8c8d", // Gray header background
  color: "#fff",
  padding: "8px 6px",
  textAlign: "center",
  border: "1px solid #fff",
  fontSize: "12px",
  whiteSpace: "nowrap",
  fontWeight: "bold",
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
  background: "#111", // Set TD background for stripes
  color: "#fff",
};

const rowHeaderCellLeft = {
  ...tdStyle,
  textAlign: "left",
  fontWeight: "bold",
  background: "#18181b", // Slightly darker for row headers
};

const rowCellMonth = {
  ...tdStyle,
  padding: "4px 6px",
  fontSize: "11px",
  lineHeight: 1.3,
  background: "#0a0a0a", // Even darker for inner data cells
  maxWidth: "100px",
};

const statusRowStyle = {
  ...tdStyle,
  padding: "20px",
  textAlign: "center",
  background: "#111827",
  color: "#e5e7eb",
  fontWeight: 500,
  fontSize: "16px",
};

const errorRowStyle = {
  ...statusRowStyle,
  background: "#1f2933",
  color: "#fca5a5",
};

// Reusable styles for the top summary strip (using similar dark/light contrast)
const summaryStripStyle = {
  background: "#18181b", // Slightly darker than table wrapper
  color: "#f9fafb",
  padding: "2px 2px 2px",
  borderRadius: "2px",
  border: "1px solid #7f8c8d", // Using the header color for the border
  marginBottom: "20px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "2px",
};

const summaryCard = {
  background: "#000",
  padding: "5px 5px",
  borderRadius: "2px",
  textAlign: "center",
  fontWeight: 500,
  fontSize: "10px",
  border: "1px solid #fff",
};

const summaryValue = {
  marginTop: "6px",
  fontSize: "12px",
  fontWeight: 400,
  color: "#2ecc71", // Using the Print button color for emphasis
};

// ===============================================================
// REACT COMPONENT
// ===============================================================

export default function PaymentsSummaryPage() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------- LOAD SUMMARY REPORT ----------
  const loadSummary = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(SUMMARY_API_URL);
      if (!res.ok) {
        throw new Error(
          `Fetch summary failed: HTTP ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();
      const list = data.results || [];
      setSummaries(list);
    } catch (err) {
      console.error("Error loading summary:", err);
      setError(err.message || "Failed to load summary report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  // --------- TOP TOTALS ----------
  const totalStudents = summaries.length;

  const { totalPaidAll, totalUnpaidAll } = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    summaries.forEach((s) => {
      paid += Number(s.totalPaid || 0);
      unpaid += Number(s.totalUnpaid || 0);
    });
    return { totalPaidAll: paid, totalUnpaidAll: unpaid };
  }, [summaries]);

  // Total columns: 3 (static) + 12 (months) + 3 (totals) = 18
  const COLSPAN_TOTAL = 18;

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        {/* TITLE BAR - Using button style background */}
        <div style={titleBarStyle}>
          <h1>PAYMENTS SUMMARY REPORT</h1>
        </div>

        {/* TOP SUMMARY ROW */}
        <div style={summaryStripStyle}>
          <div style={summaryGrid}>
            <div style={summaryCard}>
              Total Students
              <div style={summaryValue}>{totalStudents}</div>
            </div>

            <div style={summaryCard}>
              Total Paid Amount
              <div style={summaryValue}>{formatCurrency(totalPaidAll)}</div>
            </div>

            <div style={summaryCard}>
              Remaining bal.
              <div style={summaryValue}>{formatCurrency(totalUnpaidAll)}</div>
            </div>
          </div>
        </div>

        {/* MAIN GRID TABLE */}
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {/* left static headers */}
                <th style={{ ...thStyle, minWidth: "90px" }}>Room-ID</th>
                <th style={{ ...thStyle, minWidth: "160px" }}>
                  Student Name
                </th>
                <th style={{ ...thStyle, minWidth: "110px" }}>
                  Rent Per Month
                </th>

                {/* month columns */}
                {MONTH_KEYS.map((key, idx) => (
                  <th key={key} style={{ ...thStyle, minWidth: "100px" }}>
                    {MONTH_LABELS[idx]}
                  </th>
                ))}

                {/* totals per student */}
                <th style={{ ...thStyle, minWidth: "110px" }}>
                  Total Paid
                </th>
                <th style={{ ...thStyle, minWidth: "120px" }}>
                  Total Remaining
                </th>
                <th style={{ ...thStyle, minWidth: "120px" }}>
                  Total Expected
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={COLSPAN_TOTAL} style={statusRowStyle}>
                    Loading summary report...
                  </td>
                </tr>
              )}

              {error && !loading && (
                <tr>
                  <td colSpan={COLSPAN_TOTAL} style={errorRowStyle}>
                    Error: {error}
                  </td>
                </tr>
              )}

              {!loading && !error && summaries.length === 0 && (
                <tr>
                  <td colSpan={COLSPAN_TOTAL} style={statusRowStyle}>
                    No data in summary report.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                summaries.map((row, idx) => {
                  const u = row.user || {};

                  // build month -> data map (from "month": "2025-05" etc.)
                  const monthMap = {};
                  (row.months || []).forEach((m) => {
                    const monthStr = m.month || "";
                    const key = monthStr.slice(5, 7); // "03", "10", etc.
                    if (!key) return;

                    // If multiple entries for the same month, sum them
                    if (!monthMap[key]) {
                      monthMap[key] = { ...m };
                    } else {
                      monthMap[key] = {
                        ...monthMap[key],
                        expected:
                          Number(monthMap[key].expected || 0) +
                          Number(m.expected || 0),
                        paid:
                          Number(monthMap[key].paid || 0) +
                          Number(m.paid || 0),
                        unpaid:
                          Number(monthMap[key].unpaid || 0) +
                          Number(m.unpaid || 0),
                      };
                    }
                  });

                  // Rent per month: use user.rentAmount first, fallback to months.expected
                  let rentPerMonth = Number(u.rentAmount || 0);
                  if (!rentPerMonth) {
                    (row.months || []).forEach((m) => {
                      const ex = Number(m.expected || 0);
                      if (ex > 0 && rentPerMonth === 0) {
                        rentPerMonth = ex;
                      }
                    });
                  }

                  return (
                    <tr key={u._id || idx} style={{ backgroundColor: "#0a0a0a" }}>
                      {/* Room / student info */}
                      <td style={tdStyle}>{u.roomNumber || "-"}</td>
                      <td style={rowHeaderCellLeft}>
                        {u.fullName || "-"}
                        <div
                          style={{
                            fontSize: "11px",
                            opacity: 0.75,
                            color: "#ccc",
                            fontWeight: 400,
                          }}
                        >
                          {u.phone || ""}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {rentPerMonth ? formatCurrency(rentPerMonth) : "-"}
                      </td>

                      {/* month cells */}
                      {MONTH_KEYS.map((mk) => {
                        // For amounts, use first part of the band, e.g. "11-12" → "11"
                        const startKey = mk.slice(0, 2);
                        const m = monthMap[startKey];

                        const covered = isMonthCoveredByAnyPeriod(row, mk);

                        // nothing for this band at all
                        if (!m && !covered) {
                          return (
                            <td key={mk} style={rowCellMonth}>
                              -
                            </td>
                          );
                        }

                        // Determine the background color for the month cell
                        let cellBgColor = "#0a0a0a"; // default dark
                        if (m && m.unpaid > 0) {
                          cellBgColor = "#331a1a"; // Reddish if unpaid
                        } else if (m && m.paid > 0) {
                          cellBgColor = "#1a331a"; // Greenish if paid
                        } else if (covered) {
                            cellBgColor = "#1a2433"; // Bluish if period covers it but no data
                        }


                        return (
                          <td key={mk} style={{ ...rowCellMonth, background: cellBgColor }}>
                            {m && (
                              <>
                                <div>
                                  Exp: {formatCurrency(m.expected)}
                                </div>
                                <div>Paid: {formatCurrency(m.paid)}</div>
                                <div style={{ color: m.unpaid > 0 ? '#ff7f7f' : '#fff' }}>Unpd: {formatCurrency(m.unpaid)}</div>
                              </>
                            )}

                            {covered && !m && (
                              <div
                                style={{
                                  marginTop: m ? 4 : 0,
                                  fontWeight: 600,
                                  color: "#bbf7d0",
                                }}
                              >
                                Status: Paid
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* totals per student */}
                      <td style={tdStyle}>{formatCurrency(row.totalPaid)}</td>
                      <td style={tdStyle}>{formatCurrency(row.totalUnpaid)}</td>
                      <td style={tdStyle}>
                        {formatCurrency(row.totalExpected)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}