import { useState, useEffect } from "react";
import reportService from "../services/reportService";

/**
 * ExpenseReportsTab Component (Milestone 3 Task 9)
 * Executive Financial Intelligence & Visual Reports Dashboard.
 * 
 * Features:
 * 1. Master KPI Cards (Total Budget, Spent, Balance, % Burn Rate).
 * 2. Visual Budget Health Gauge & Status Flag (NORMAL, APPROACHING_LIMIT, OVER_BUDGET).
 * 3. Dominant Cost Driver Card (Top Spending Category).
 * 4. Granular Category Breakdown with Visual Consumption Meters.
 * 5. Printable / Exportable Financial Statement Trigger.
 */
export default function ExpenseReportsTab({ tripId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categoryIcons = {
    FOOD: "🍔 Food & Dining",
    TRANSPORTATION: "🚗 Transport",
    ACCOMMODATION: "🏨 Accommodation",
    ACTIVITIES: "🎟️ Activities",
    OTHER: "🛍️ Other Expenses",
  };

  useEffect(() => {
    fetchReport();
  }, [tripId]);

  async function fetchReport() {
    setLoading(true);
    setError("");
    try {
      const data = await reportService.getTripReport(tripId);
      setReport(data);
    } catch (err) {
      console.error("Error fetching financial report:", err);
      setError(err.response?.data?.message || err.message || "Failed to load financial report.");
    } finally {
      setLoading(false);
    }
  }

  function getStatusMeta(status) {
    switch (status) {
      case "OVER_BUDGET":
        return {
          label: "Over Budget Alert",
          bg: "#fef2f2",
          border: "#f87171",
          text: "#dc2626",
          icon: "🚨",
          desc: "Spending has exceeded 100% of the allocated financial cap.",
        };
      case "ABOUT_TO_EXHAUST":
        return {
          label: "About to Exhaust Budget (Critical)",
          bg: "#fff7ed",
          border: "#fdba74",
          text: "#ea580c",
          icon: "🚨",
          desc: "Spending has reached 90% or more — budget is about to be exhausted!",
        };
      case "APPROACHING_LIMIT":
        return {
          label: "Approaching Limit (Warning)",
          bg: "#fffbeb",
          border: "#fde68a",
          text: "#d97706",
          icon: "⚠️",
          desc: "Spending has reached 80% or more of the allocated budget.",
        };
      default:
        return {
          label: "Healthy & Within Budget",
          bg: "#ecfdf5",
          border: "#a7f3d0",
          text: "#059669",
          icon: "✅",
          desc: "Spending is safely under 80% of the allocated budget.",
        };
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
        <div className="spinner" style={{ margin: "0 auto 16px auto" }}></div>
        <p style={{ fontSize: "1rem", fontWeight: "600" }}>Calculating financial analytics & burn rates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", background: "#fef2f2", borderRadius: "12px", border: "1px solid #fecaca", margin: "20px 0" }}>
        <p style={{ color: "#dc2626", fontWeight: "600", margin: "0 0 12px 0" }}>⚠️ {error}</p>
        <button
          onClick={fetchReport}
          style={{
            padding: "8px 16px",
            background: "#dc2626",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          🔄 Retry Analysis
        </button>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const statusMeta = getStatusMeta(report.overallStatus);
  const totalBudget = Number(report.totalBudget || 0);
  const totalSpent = Number(report.totalSpent || 0);
  const remainingBudget = Number(report.remainingBudget || 0);
  const overallPercentage = Number(report.overallPercentageSpent || 0);

  return (
    <section className="reports-section" style={{ marginTop: "24px" }}>
      {/* Header & Quick Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)",
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid #bae6fd",
          borderLeft: "6px solid #0284c7",
          boxShadow: "0 2px 10px rgba(2, 132, 199, 0.06)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#e0f2fe",
              color: "#0369a1",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            <span>📊 Financial Intelligence</span>
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            📊 Financial Analytics & Executive Reports
          </h2>
          <p style={{ color: "#475569", margin: 0, fontSize: "14px", fontWeight: "500" }}>
            Comprehensive spending audit, burn rates, and category health metrics for {report.tripTitle || "Trip"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={fetchReport}
            style={{
              padding: "9px 16px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              color: "#334155",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🔄 Refresh Metrics
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: "9px 16px",
              background: "#0284c7",
              border: "1px solid #0284c7",
              borderRadius: "8px",
              color: "#ffffff",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🖨️ Print / Save Statement
          </button>
        </div>
      </div>

      {/* Financial Health Banner */}
      <div
        style={{
          background: statusMeta.bg,
          border: `1.5px solid ${statusMeta.border}`,
          borderRadius: "12px",
          padding: "18px 24px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "2rem" }}>{statusMeta.icon}</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: statusMeta.text,
                }}
              >
                {statusMeta.label}
              </span>
              <span
                style={{
                  fontSize: "0.8rem",
                  background: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontWeight: "700",
                  color: statusMeta.text,
                  border: `1px solid ${statusMeta.border}`,
                }}
              >
                {overallPercentage.toFixed(1)}% Consumed
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", color: "#475569", fontSize: "0.92rem" }}>
              {statusMeta.desc}
            </p>
          </div>
        </div>

        {/* Visual Burn Meter */}
        <div style={{ minWidth: "220px", flex: "1", maxWidth: "340px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: "700", marginBottom: "6px" }}>
            <span style={{ color: "#475569" }}>Burn Velocity</span>
            <span style={{ color: statusMeta.text }}>{overallPercentage.toFixed(1)}%</span>
          </div>
          <div style={{ height: "10px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(overallPercentage, 100)}%`,
                height: "100%",
                background: statusMeta.text,
                borderRadius: "999px",
                transition: "width 0.4s ease-in-out",
              }}
            />
          </div>
        </div>
      </div>

      {/* Executive Financial KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        {/* Card 1: Total Allocated Budget */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            🎯 Total Budget Cap
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#0f172a", marginTop: "8px" }}>
            ₹{totalBudget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
            Approved financial baseline
          </span>
        </div>

        {/* Card 2: Actual Spend */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            🧾 Actual Outlay
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#dc2626", marginTop: "8px" }}>
            ₹{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px", display: "block" }}>
            From {report.totalTransactions || 0} logged expense receipts
          </span>
        </div>

        {/* Card 3: Remaining Balance */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            💵 Net Variance
          </span>
          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: remainingBudget >= 0 ? "#059669" : "#dc2626",
              marginTop: "8px",
            }}
          >
            ₹{Math.abs(remainingBudget).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span
            style={{
              fontSize: "0.8rem",
              color: remainingBudget >= 0 ? "#059669" : "#dc2626",
              fontWeight: "600",
              marginTop: "4px",
              display: "block",
            }}
          >
            {remainingBudget >= 0 ? "✓ Unspent Safe Balance" : "⚠️ Over Budget Deficit"}
          </span>
        </div>

        {/* Card 4: Top Cost Driver */}
        <div
          style={{
            background: "#ffffff",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
            🔥 Dominant Spend Driver
          </span>
          <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e293b", marginTop: "8px" }}>
            {report.topSpendingCategory
              ? categoryIcons[report.topSpendingCategory] || report.topSpendingCategory
              : "No Outlay Yet"}
          </div>
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600", marginTop: "4px", display: "block" }}>
            {report.topCategoryAmount
              ? `₹${Number(report.topCategoryAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} absorbed`
              : "0 expenses registered"}
          </span>
        </div>
      </div>

      {/* Granular Category Spending Table & Progress Bars */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: "28px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e293b", margin: 0 }}>
            📑 Granular Category Breakdown & Allocation Health
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "4px 0 0 0" }}>
            Detailed audit of allocated caps vs actual consumption across each expense category.
          </p>
        </div>

        {(!report.categorySummaries || report.categorySummaries.length === 0) ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
            <span>🏖️ No category summaries found. Configure budget allocations and log expenses to view reports.</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: "12px 16px", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>Category</th>
                  <th style={{ padding: "12px 16px", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>Allocated Cap</th>
                  <th style={{ padding: "12px 16px", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>Actual Spent</th>
                  <th style={{ padding: "12px 16px", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>Remaining</th>
                  <th style={{ padding: "12px 16px", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>Consumption Progress</th>
                  <th style={{ padding: "12px 16px", color: "#475569", fontSize: "0.85rem", textTransform: "uppercase" }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {report.categorySummaries.map((cat, idx) => {
                  const limit = Number(cat.allocatedLimit || 0);
                  const spent = Number(cat.totalSpent || 0);
                  const remaining = Number(cat.remainingAmount || 0);
                  const pct = Number(cat.percentageSpent || 0);
                  const catMeta = getStatusMeta(cat.status);

                  return (
                    <tr
                      key={cat.category || idx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Category Label & Receipts Count */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.95rem" }}>
                          {categoryIcons[cat.category] || cat.category}
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                          {cat.transactionCount || 0} receipt{(cat.transactionCount || 0) === 1 ? "" : "s"}
                        </span>
                      </td>

                      {/* Allocated Cap */}
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "#475569", fontSize: "0.95rem" }}>
                        ₹{limit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actual Spent */}
                      <td style={{ padding: "14px 16px", fontWeight: "700", color: spent > 0 ? "#0f172a" : "#94a3b8", fontSize: "0.95rem" }}>
                        ₹{spent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Remaining Variance */}
                      <td
                        style={{
                          padding: "14px 16px",
                          fontWeight: "700",
                          color: remaining >= 0 ? "#059669" : "#dc2626",
                          fontSize: "0.95rem",
                        }}
                      >
                        ₹{remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Visual Progress Bar */}
                      <td style={{ padding: "14px 16px", minWidth: "160px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: "700", marginBottom: "4px" }}>
                          <span style={{ color: "#64748b" }}>Burn</span>
                          <span style={{ color: catMeta.text }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              height: "100%",
                              background: catMeta.text,
                              borderRadius: "999px",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </td>

                      {/* Audit Status Pill */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            background: catMeta.bg,
                            color: catMeta.text,
                            border: `1px solid ${catMeta.border}`,
                          }}
                        >
                          <span>{catMeta.icon}</span>
                          <span>{cat.status || "NORMAL"}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
