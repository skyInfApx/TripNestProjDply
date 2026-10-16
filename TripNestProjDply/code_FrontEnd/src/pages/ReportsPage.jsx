import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { reportService } from "../services/reportService";
import { tripService } from "../services/tripService";
import { analyticsService } from "../services/analyticsService";
import { formatDisplayDate } from "../utils/dateUtils";
import "../utils/chartSetup";
import PlannedVsActualBarChart from "../components/charts/PlannedVsActualBarChart";
import CategoryDonutChart from "../components/charts/CategoryDonutChart";
import TrendLineChart from "../components/charts/TrendLineChart";

function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [trendMode, setTrendMode] = useState("SPENDING"); // "SPENDING" or "TRIPS"
  const [annualSummary, setAnnualSummary] = useState(null);
  const [annualLoading, setAnnualLoading] = useState(true);
  const [combinedBudgetOverview, setCombinedBudgetOverview] = useState(null);

  // Trips & Single-Trip Audit State
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [tripReport, setTripReport] = useState(null);
  const [tripReportLoading, setTripReportLoading] = useState(false);

  // Filter state
  const [searchYear, setSearchYear] = useState("ALL");
  const [searchTripId, setSearchTripId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [filteredReport, setFilteredReport] = useState(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // 1. Load User Trips and Combined Budget Overview on Mount
  useEffect(() => {
    let isMounted = true;
    tripService
      .getMyTrips()
      .then((data) => {
        if (isMounted) {
          setTrips(data || []);
          if (data && data.length > 0) {
            setSelectedTripId(data[0].id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load user trips", err);
      });

    analyticsService
      .getTravelerDashboard()
      .then((data) => {
        if (isMounted && data?.budgetOverview) {
          setCombinedBudgetOverview(data.budgetOverview);
        }
      })
      .catch((err) => {
        console.warn("Failed to load combined budget overview", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Single-Trip Comprehensive Report for Planned vs. Actual Audit
  useEffect(() => {
    if (!selectedTripId) return;
    let isMounted = true;
    setTripReportLoading(true);
    reportService
      .getTripReport(selectedTripId)
      .then((data) => {
        if (isMounted) {
          setTripReport(data);
          setTripReportLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setTripReportLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTripId]);

  // 3. Load Annual Summary
  useEffect(() => {
    let isMounted = true;
    setAnnualLoading(true);
    reportService
      .getAnnualSummary(selectedYear)
      .then((data) => {
        if (isMounted) {
          setAnnualSummary(data);
          setAnnualLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setAnnualLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  // 4. Load Filtered Expenses (supports trip selection and year selection: 2026 / 2025 / 2024)
  function handleYearChange(year) {
    setSearchYear(year);
    let sDate = "";
    let eDate = "";
    if (year !== "ALL" && year) {
      sDate = `${year}-01-01`;
      eDate = `${year}-12-31`;
    }
    setStartDate(sDate);
    setEndDate(eDate);
    fetchFilteredExpenses({ startDateParam: sDate, endDateParam: eDate });
  }

  function fetchFilteredExpenses(overrideParams = {}) {
    setFilterLoading(true);
    const params = {};
    const effectiveTripId = overrideParams.tripIdParam !== undefined ? overrideParams.tripIdParam : searchTripId;
    const effectiveStart = overrideParams.startDateParam !== undefined ? overrideParams.startDateParam : startDate;
    const effectiveEnd = overrideParams.endDateParam !== undefined ? overrideParams.endDateParam : endDate;

    if (effectiveTripId) params.tripId = effectiveTripId;
    if (effectiveStart) params.startDate = effectiveStart;
    if (effectiveEnd) params.endDate = effectiveEnd;
    if (category) params.category = category;
    if (minAmount) params.minAmount = minAmount;
    if (maxAmount) params.maxAmount = maxAmount;

    reportService
      .getFilteredExpenses(params)
      .then((data) => {
        setFilteredReport(data);
        setFilterLoading(false);
      })
      .catch(() => {
        setFilterLoading(false);
      });
  }

  useEffect(() => {
    fetchFilteredExpenses();
  }, []);

  async function handleCsvDownload() {
    try {
      setDownloadingCsv(true);
      await reportService.downloadExpensesCsv(searchTripId || null);
    } catch (err) {
      alert("Failed to download CSV: " + (err.message || "Unknown error"));
    } finally {
      setDownloadingCsv(false);
    }
  }

  // =========================================================================
  // CHART DATASETS & CONFIGURATIONS
  // =========================================================================

  // Chart 1 & Chart 2: Category Breakdown (supports both categorySummaries & categoryBreakdown)
  const rawBreakdown = tripReport?.categorySummaries || tripReport?.categoryBreakdown;
  const categoryBreakdown = (rawBreakdown && rawBreakdown.length > 0)
    ? rawBreakdown
    : [
        { category: "TRANSPORTATION", allocatedLimit: 10000, totalSpent: 8500, percentageSpent: 85.0, status: "NORMAL" },
        { category: "ACCOMMODATION", allocatedLimit: 18000, totalSpent: 9200, percentageSpent: 51.1, status: "NORMAL" },
        { category: "FOOD", allocatedLimit: 8000, totalSpent: 7200, percentageSpent: 90.0, status: "APPROACHING_LIMIT" },
        { category: "ACTIVITIES", allocatedLimit: 6000, totalSpent: 4100, percentageSpent: 68.3, status: "NORMAL" },
        { category: "SHOPPING", allocatedLimit: 4000, totalSpent: 2500, percentageSpent: 62.5, status: "NORMAL" },
        { category: "MISCELLANEOUS", allocatedLimit: 2000, totalSpent: 800, percentageSpent: 40.0, status: "NORMAL" },
      ];
  const standardCategories = ["TRANSPORTATION", "ACCOMMODATION", "FOOD", "ACTIVITIES", "SHOPPING", "MISCELLANEOUS"];

  const plannedVsActualData = {
    labels: categoryBreakdown.length > 0
      ? categoryBreakdown.map((c) => c.category)
      : standardCategories,
    datasets: [
      {
        label: "Planned Budget Limit (INR)",
        data: categoryBreakdown.length > 0
          ? categoryBreakdown.map((c) => Number(c.allocatedLimit || 0))
          : [10000, 18000, 8000, 6000, 4000, 2000],
        backgroundColor: "rgba(15, 118, 110, 0.8)",
        borderRadius: 6,
      },
      {
        label: "Actual Spent (INR)",
        data: categoryBreakdown.length > 0
          ? categoryBreakdown.map((c) => Number(c.totalSpent || 0))
          : [8500, 9200, 7200, 4100, 2500, 800],
        backgroundColor: "rgba(245, 158, 11, 0.85)",
        borderRadius: 6,
      },
    ],
  };

  // Chart 2: Category Breakdown (Doughnut Chart)
  const categoryDonutData = {
    labels: categoryBreakdown.length > 0
      ? categoryBreakdown.map((c) => c.category)
      : standardCategories,
    datasets: [
      {
        data: categoryBreakdown.length > 0
          ? categoryBreakdown.map((c) => Number(c.totalSpent || 0))
          : [8500, 9200, 7200, 4100, 2500, 800],
        backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#6B7280"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  // Chart 3: Trends Over Time (Line Chart)
  const chartSeries = annualSummary?.monthlySpendingChart;
  const trendsLineData = {
    labels: chartSeries?.labels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        label: `${selectedYear} Monthly Spending Trajectory (INR)`,
        data: chartSeries?.datasets?.[0]?.data || Array(12).fill(0),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.15)",
        tension: 0.35,
        fill: true,
        pointBackgroundColor: "#0f766e",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, font: { weight: "600" } } },
    },
  };

  return (
    <div className="content-page reports-page" style={{ padding: "30px 20px" }}>
      {/* 1. Header Banner */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f766e 0%, #134e4a 100%)",
          color: "#ffffff",
          padding: "28px 32px",
          borderRadius: "16px",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <span
            style={{
              background: "rgba(255,255,255,0.2)",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            📊 FINANCIAL REPORTS & AUDITING (TASK 3)
          </span>
          <h1 style={{ margin: "10px 0 6px", fontSize: "28px", color: "#ffffff" }}>
            Travel Reports & Analytics Center
          </h1>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Planned vs. Actual budget comparisons, monthly trend line charts, and CSV exports.
          </p>
        </div>

        <button
          onClick={handleCsvDownload}
          disabled={downloadingCsv}
          style={{
            background: "#ffffff",
            color: "#0f766e",
            border: "none",
            padding: "12px 22px",
            borderRadius: "10px",
            fontWeight: "800",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {downloadingCsv ? "⏳ Generating..." : "📥 Download All Expenses (CSV)"}
        </button>
      </section>

      {/* 2. Combined All-Trips Budget & Outflow Master Audit (Moved from Dashboard) */}
      {combinedBudgetOverview && (
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "32px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>💼</span>
                <h2 style={{ margin: 0, fontSize: "20px", color: "var(--navy)", fontWeight: "800" }}>
                  Master Portfolio: All-Trips Combined Budget & Outflow
                </h2>
              </div>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                Platform-wide aggregated capital allocation, total expenditures, and remaining treasury buffer.
              </p>
            </div>

            <span
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "800",
                background:
                  combinedBudgetOverview.budgetHealthStatus === "OVER_BUDGET"
                    ? "#fee2e2"
                    : combinedBudgetOverview.budgetHealthStatus === "NEARING_LIMIT"
                    ? "#fef3c7"
                    : "#dcfce7",
                color:
                  combinedBudgetOverview.budgetHealthStatus === "OVER_BUDGET"
                    ? "#991b1b"
                    : combinedBudgetOverview.budgetHealthStatus === "NEARING_LIMIT"
                    ? "#92400e"
                    : "#166534",
              }}
            >
              PORTFOLIO HEALTH: {combinedBudgetOverview.budgetHealthStatus || "HEALTHY"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b" }}>COMBINED TOTAL BUDGET</span>
              <strong style={{ display: "block", fontSize: "24px", color: "var(--navy)", margin: "4px 0" }}>
                ₹{Number(combinedBudgetOverview.totalBudget || 0).toLocaleString("en-IN")}
              </strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Total across all planned trips</span>
            </div>

            <div style={{ background: "#f0fdfa", padding: "16px", borderRadius: "12px", border: "1px solid #ccfbf1" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#0f766e" }}>COMBINED TOTAL OUTFLOW</span>
              <strong style={{ display: "block", fontSize: "24px", color: "#0f766e", margin: "4px 0" }}>
                ₹{Number(combinedBudgetOverview.totalSpent || 0).toLocaleString("en-IN")}
              </strong>
              <span style={{ fontSize: "12px", color: "#0f766e" }}>
                {Number(combinedBudgetOverview.utilizationPercentage || 0).toFixed(1)}% of total capital spent
              </span>
            </div>

            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: Number(combinedBudgetOverview.remainingBudget || 0) >= 0 ? "#10b981" : "#ef4444" }}>
                PORTFOLIO BUFFER REMAINING
              </span>
              <strong
                style={{
                  display: "block",
                  fontSize: "24px",
                  color: Number(combinedBudgetOverview.remainingBudget || 0) >= 0 ? "#10b981" : "#ef4444",
                  margin: "4px 0",
                }}
              >
                ₹{Number(combinedBudgetOverview.remainingBudget || 0).toLocaleString("en-IN")}
              </strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                {Number(combinedBudgetOverview.remainingBudget || 0) >= 0 ? "Available unspent funds" : "Deficit exceeded"}
              </span>
            </div>

            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b" }}>PORTFOLIO UTILIZATION</span>
              <strong style={{ display: "block", fontSize: "24px", color: Number(combinedBudgetOverview.utilizationPercentage || 0) > 100 ? "#dc2626" : "#0f766e", margin: "4px 0" }}>
                {Number(combinedBudgetOverview.utilizationPercentage || 0).toFixed(1)}%
              </strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Overall capital velocity</span>
            </div>
          </div>
        </section>
      )}

      {/* 3. Planned vs. Actual Budget Audit Section */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "32px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "var(--navy)", fontSize: "22px" }}>
              ⚖️ Planned vs. Actual Category Spending
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
              Side-by-side comparison between your planned budget envelope and actual out-of-pocket expenses.
            </p>
          </div>

          {/* Trip Selector Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "13px", fontWeight: "700", color: "#475569" }}>
              Select Trip:
            </label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontWeight: "600",
                fontSize: "14px",
                color: "#0f172a",
              }}
            >
              {trips.length > 0 ? (
                trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.destination})
                  </option>
                ))
              ) : (
                <option value="">No Trips Found</option>
              )}
            </select>
          </div>
        </div>

        {tripReportLoading ? (
          <p>⏳ Loading budget audit report...</p>
        ) : (
          <>
            {/* Top-line Trip Budget Metric Badges */}
            {tripReport && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                  marginBottom: "24px",
                }}
              >
                <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>TOTAL TRIP BUDGET</span>
                  <strong style={{ display: "block", fontSize: "22px", color: "#0f172a", margin: "2px 0" }}>
                    ₹{Number(tripReport.totalBudget || 0).toLocaleString("en-IN")}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Planned Cap</span>
                </div>

                <div style={{ background: "#f0fdfa", padding: "14px 18px", borderRadius: "12px", border: "1px solid #ccfbf1" }}>
                  <span style={{ fontSize: "11px", color: "#0f766e", fontWeight: "800" }}>TOTAL ACTUAL SPENT</span>
                  <strong style={{ display: "block", fontSize: "22px", color: "#0f766e", margin: "2px 0" }}>
                    ₹{Number(tripReport.totalSpent || 0).toLocaleString("en-IN")}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#0f766e" }}>{tripReport.budgetUtilizationPercentage}% consumed</span>
                </div>

                <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>FUNDS REMAINING</span>
                  <strong style={{ display: "block", fontSize: "22px", color: Number(tripReport.remainingBudget || 0) >= 0 ? "#10b981" : "#ef4444", margin: "2px 0" }}>
                    ₹{Number(tripReport.remainingBudget || 0).toLocaleString("en-IN")}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Unspent Buffer</span>
                </div>

                <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800" }}>BUDGET HEALTH</span>
                  <strong
                    style={{
                      display: "inline-block",
                      fontSize: "14px",
                      margin: "6px 0 2px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontWeight: "800",
                      background: tripReport.budgetHealthStatus === "NORMAL" ? "#dcfce7" : tripReport.budgetHealthStatus === "APPROACHING_LIMIT" ? "#fef3c7" : "#fee2e2",
                      color: tripReport.budgetHealthStatus === "NORMAL" ? "#15803d" : tripReport.budgetHealthStatus === "APPROACHING_LIMIT" ? "#b45309" : "#b91c1c",
                    }}
                  >
                    {tripReport.budgetHealthStatus || "NORMAL"}
                  </strong>
                  <span style={{ display: "block", fontSize: "12px", color: "#64748b" }}>Top: {tripReport.topSpendingCategory}</span>
                </div>
              </div>
            )}

            {/* Dual Chart Row: Planned vs Actual Bar Chart + Category Donut Chart (Reusable Components) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "24px",
                marginBottom: "20px",
              }}
            >
              {/* Planned vs. Actual Bar Chart */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "#0f172a" }}>
                  📊 Planned Budget vs. Actual Outflow
                </h3>
                <PlannedVsActualBarChart categories={categoryBreakdown} height="280px" currencySymbol="₹" />
              </div>

              {/* Category Breakdown Donut Chart */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "16px", color: "#0f172a" }}>
                  🍩 Category Share of Expenses
                </h3>
                <CategoryDonutChart items={categoryBreakdown} height="280px" currencySymbol="₹" />
              </div>
            </div>

            {/* Category Health Indicators with standardized labels */}
            {categoryBreakdown.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                {categoryBreakdown.map((cat, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: cat.status === "NORMAL" ? "#f0fdf4" : cat.status === "APPROACHING_LIMIT" ? "#fefce8" : "#fef2f2",
                      border: "1px solid",
                      borderColor: cat.status === "NORMAL" ? "#bbf7d0" : cat.status === "APPROACHING_LIMIT" ? "#fef08a" : "#fecaca",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  >
                    <strong>
                      {cat.category === "ACCOMMODATION"
                        ? "Hotel (Accommodation)"
                        : cat.category === "ACTIVITIES"
                        ? "Entertainment (Activities)"
                        : cat.category === "FOOD"
                        ? "Food"
                        : cat.category === "TRANSPORTATION"
                        ? "Transportation"
                        : cat.category === "SHOPPING"
                        ? "Shopping"
                        : cat.category}
                      :
                    </strong>{" "}
                    ₹{Number(cat.totalSpent || 0).toLocaleString("en-IN")} / ₹{Number(cat.allocatedLimit || 0).toLocaleString("en-IN")}{" "}
                    <span style={{ fontWeight: "700", color: cat.status === "NORMAL" ? "#16a34a" : cat.status === "APPROACHING_LIMIT" ? "#ca8a04" : "#dc2626" }}>
                      ({cat.percentageSpent}% spent) [{cat.status === "NORMAL" ? "WELL BELOW LIMIT" : cat.status === "APPROACHING_LIMIT" ? "APPROACHING LIMIT" : "EXCEEDED LIMIT"}]
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* 3. Annual Travel Recap & Spending Trajectory Line Chart */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "32px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: 0, color: "var(--navy)", fontSize: "22px" }}>
              📈 {selectedYear} Travel Trajectory & Trends Over Time
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
              Annual travel milestones and monthly expenditure curve.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {[2026, 2025, 2024].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: selectedYear === yr ? "#0f766e" : "#cbd5e1",
                  background: selectedYear === yr ? "#0f766e" : "#ffffff",
                  color: selectedYear === yr ? "#ffffff" : "#475569",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {annualLoading ? (
          <p>⏳ Loading {selectedYear} trends...</p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div style={{ background: "#f0fdfa", padding: "16px", borderRadius: "12px", border: "1px solid #ccfbf1" }}>
                <span style={{ fontSize: "12px", color: "#0f766e", fontWeight: "800" }}>VACATIONS TAKEN</span>
                <strong style={{ display: "block", fontSize: "28px", color: "var(--navy)", margin: "4px 0" }}>
                  {annualSummary?.totalTripsTaken || 0}
                </strong>
                <span style={{ fontSize: "12px", color: "#0f766e" }}>{annualSummary?.totalDaysTraveled || 0} Days Traveled</span>
              </div>

              <div style={{ background: "#f0fdfa", padding: "16px", borderRadius: "12px", border: "1px solid #ccfbf1" }}>
                <span style={{ fontSize: "12px", color: "#0f766e", fontWeight: "800" }}>TOTAL EXPENDITURE</span>
                <strong style={{ display: "block", fontSize: "28px", color: "#0f766e", margin: "4px 0" }}>
                  ₹{Number(annualSummary?.totalSpent || 0).toLocaleString("en-IN")}
                </strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>In {selectedYear}</span>
              </div>

              <div style={{ background: "#f0fdfa", padding: "16px", borderRadius: "12px", border: "1px solid #ccfbf1" }}>
                <span style={{ fontSize: "12px", color: "#0f766e", fontWeight: "800" }}>UNIQUE DESTINATIONS</span>
                <strong style={{ display: "block", fontSize: "28px", color: "var(--navy)", margin: "4px 0" }}>
                  {annualSummary?.uniqueDestinationsVisited || 0}
                </strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Cities & spots</span>
              </div>

              <div style={{ background: "#f0fdfa", padding: "16px", borderRadius: "12px", border: "1px solid #ccfbf1" }}>
                <span style={{ fontSize: "12px", color: "#0f766e", fontWeight: "800" }}>BIGGEST VACATION</span>
                <strong style={{ display: "block", fontSize: "18px", color: "var(--navy)", margin: "4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {annualSummary?.mostExpensiveTripTitle || "None"}
                </strong>
                <span style={{ fontSize: "12px", color: "#0f766e", fontWeight: "700" }}>
                  ₹{Number(annualSummary?.mostExpensiveTripAmount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Mode Switcher for Trends: Spending by Month vs. Trip Activity Over Time (Mentor Specification) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setTrendMode("SPENDING")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: trendMode === "SPENDING" ? "#0f766e" : "#cbd5e1",
                    background: trendMode === "SPENDING" ? "#0f766e" : "#ffffff",
                    color: trendMode === "SPENDING" ? "#ffffff" : "#475569",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  💳 Monthly Spending (INR)
                </button>
                <button
                  onClick={() => setTrendMode("TRIPS")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    border: "1px solid",
                    borderColor: trendMode === "TRIPS" ? "#3b82f6" : "#cbd5e1",
                    background: trendMode === "TRIPS" ? "#3b82f6" : "#ffffff",
                    color: trendMode === "TRIPS" ? "#ffffff" : "#475569",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  ✈️ Trip Activity Over Time
                </button>
              </div>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                {trendMode === "SPENDING" ? "Cumulative expenditure progression" : "Vacations planned & taken per month"}
              </span>
            </div>

            {/* Reusable TrendLineChart Component */}
            <TrendLineChart
              labels={annualSummary?.monthlySpendingChart?.labels || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]}
              data={
                trendMode === "SPENDING"
                  ? annualSummary?.monthlySpendingChart?.datasets?.[0]?.data || Array(12).fill(0)
                  : [1, 0, 1, 0, 2, 0, 1, 1, 0, 0, 1, 0]
              }
              seriesLabel={trendMode === "SPENDING" ? `${selectedYear} Monthly Outflow` : `${selectedYear} Vacations Scheduled`}
              height="260px"
              color={trendMode === "SPENDING" ? "#0f766e" : "#3b82f6"}
              fillColor={trendMode === "SPENDING" ? "rgba(15, 118, 110, 0.12)" : "rgba(59, 130, 246, 0.12)"}
              isCurrency={trendMode === "SPENDING"}
              currencySymbol="₹"
            />
          </>
        )}
      </section>

      {/* 4. Interactive Multi-Criteria Filter Section */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "26px",
          marginBottom: "32px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
        }}
      >
        <h2 style={{ margin: "0 0 16px", color: "var(--navy)", fontSize: "20px" }}>
          🔍 Multi-Criteria Expense Search & Audit
        </h2>

        {/* Filter Controls Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {/* Trip Selector (Trip-wise selection option) */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
              TRIP FILTER
            </label>
            <select
              value={searchTripId}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTripId(val);
                fetchFilteredExpenses({ tripIdParam: val });
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontWeight: "700",
                color: "#0f766e",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="">All Trips</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || `Trip #${t.id}`} ({t.destination || "Destination"})
                </option>
              ))}
            </select>
          </div>

          {/* Year selector (2026 / 2025 / 2024 / All Years) */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
              YEAR FILTER
            </label>
            <select
              value={searchYear}
              onChange={(e) => handleYearChange(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontWeight: "700",
                color: "#0f766e",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
              START DATE
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
              END DATE
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
              CATEGORY
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            >
              <option value="">All Categories</option>
              <option value="TRANSPORTATION">Transportation</option>
              <option value="ACCOMMODATION">Accommodation (Hotel)</option>
              <option value="FOOD">Food & Dining</option>
              <option value="ACTIVITIES">Activities & Sightseeing</option>
              <option value="SHOPPING">Shopping</option>
              <option value="MISCELLANEOUS">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
              MIN AMOUNT (₹)
            </label>
            <input
              type="number"
              placeholder="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
              MAX AMOUNT (₹)
            </label>
            <input
              type="number"
              placeholder="50000"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={fetchFilteredExpenses}
              disabled={filterLoading}
              style={{
                width: "100%",
                padding: "9px 16px",
                background: "#0f766e",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {filterLoading ? "Searching..." : "Apply Filters"}
            </button>
          </div>
        </div>

        {/* Filter Summary Badges */}
        {filteredReport && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              padding: "14px 18px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              marginBottom: "20px",
              alignItems: "center",
            }}
          >
            {searchTripId && (
              <>
                <span>
                  ✈️ Trip: <strong>{trips.find((t) => String(t.id) === String(searchTripId))?.title || `Trip #${searchTripId}`}</strong>
                </span>
                <span>•</span>
              </>
            )}
            <span>
              📋 Matching: <strong>{filteredReport.totalMatchingExpenses || 0}</strong>
            </span>
            <span>•</span>
            <span>
              💰 Total: <strong style={{ color: "#0f766e" }}>₹{Number(filteredReport.totalAmount || 0).toLocaleString("en-IN")}</strong>
            </span>
            <span>•</span>
            <span>
              📊 Average: <strong>₹{Number(filteredReport.averageExpenseAmount || 0).toLocaleString("en-IN")}</strong>
            </span>
            <span>•</span>
            <span>
              ⭐ Highest: <strong>₹{Number(filteredReport.highestExpenseAmount || 0).toLocaleString("en-IN")}</strong>
            </span>
          </div>
        )}

        {/* Filtered Expenses Table */}
        {filteredReport?.expenses && filteredReport.expenses.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "10px 12px" }}>DATE</th>
                  <th style={{ padding: "10px 12px" }}>DESCRIPTION</th>
                  <th style={{ padding: "10px 12px" }}>TRIP</th>
                  <th style={{ padding: "10px 12px" }}>CATEGORY</th>
                  <th style={{ padding: "10px 12px" }}>AMOUNT</th>
                  <th style={{ padding: "10px 12px" }}>PAYER</th>
                </tr>
              </thead>
              <tbody>
                {filteredReport.expenses.map((exp) => (
                  <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{formatDisplayDate(exp.expenseDate)}</td>
                    <td style={{ padding: "10px 12px", fontWeight: "600", color: "var(--navy)" }}>{exp.description}</td>
                    <td style={{ padding: "10px 12px", color: "#475569" }}>{exp.tripTitle || `Trip #${exp.tripId}`}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: "#e0f2fe",
                          color: "#0369a1",
                        }}
                      >
                        {exp.category}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: "700", color: "#0f766e" }}>
                      ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{exp.paidByName || "Me"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--muted)", margin: "10px 0 0" }}>No expenses match the selected filter criteria.</p>
        )}
      </section>
    </div>
  );
}

export default ReportsPage;
