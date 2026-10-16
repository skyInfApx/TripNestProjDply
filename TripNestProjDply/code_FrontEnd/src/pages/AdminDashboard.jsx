import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { analyticsService } from "../services/analyticsService";
import "../utils/chartSetup";
import { Doughnut } from "react-chartjs-2";
import CategoryDonutChart from "../components/charts/CategoryDonutChart";
import DestinationsBarChart from "../components/charts/DestinationsBarChart";
import TrendLineChart from "../components/charts/TrendLineChart";

function AdminDashboard() {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    analyticsService
      .getAdminDashboard()
      .then((data) => {
        if (isMounted) {
          setAdminData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load admin telemetry");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const overview = adminData?.overview || {};
  const users = adminData?.userAnalytics || {};
  const trips = adminData?.tripAnalytics || {};
  const destinations = adminData?.destinationAnalytics || {};
  const financials = adminData?.financialAnalytics || {};

  // Chart 1: Trip Status Distribution
  const tripStatusData = {
    labels: ["Completed", "Planned", "Ongoing", "Cancelled"],
    datasets: [
      {
        data: [
          trips.completedTrips || 0,
          trips.plannedTrips || 0,
          trips.ongoingTrips || 0,
          trips.cancelledTrips || 0,
        ],
        backgroundColor: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const topDestList = destinations.topDestinations || [];
  const categoryList = financials.platformCategoryDistribution || [];
  const monthlyTripTrends = trips.monthlyTripTrends || [];

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11, weight: "600" } } },
    },
  };

  return (
    <div className="content-page admin-dashboard-page" style={{ padding: "30px 20px" }}>
      {/* Header Banner */}
      <section
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
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
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
            }}
          >
            🛡️ ADMIN TELEMETRY & OPERATIONS
          </span>
          <h1 style={{ margin: "10px 0 6px", fontSize: "28px", color: "#ffffff" }}>
            TripNest Platform Control Tower
          </h1>
          <p style={{ margin: 0, opacity: 0.8, fontSize: "15px" }}>
            Real-time system telemetry, cross-tenant metrics, and business intelligence.
          </p>
        </div>

        <div>
          <Link
            to="/dashboard"
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.3)",
              padding: "10px 18px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "700",
              fontSize: "14px",
            }}
          >
            ← Back to Traveler View
          </Link>
        </div>
      </section>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>⏳ Loading platform telemetry...</p>
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "16px", borderRadius: "12px", margin: "20px 0" }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 1. Macro Platform KPI Cards */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginBottom: "28px",
            }}
          >
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>TOTAL REGISTERED USERS</span>
              <strong style={{ display: "block", fontSize: "30px", color: "#0f172a", margin: "6px 0" }}>
                {overview.totalUsers || 0}
              </strong>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "700", background: "#f0fdf4", padding: "2px 8px", borderRadius: "6px" }}>
                  🟢 {users.activeTravelers || 0} Active
                </span>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", background: "#f8fafc", padding: "2px 8px", borderRadius: "6px" }}>
                  ⚪ {users.dormantUsers || 0} Dormant
                </span>
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>TOTAL PLATFORM TRIPS</span>
              <strong style={{ display: "block", fontSize: "30px", color: "#0f172a", margin: "6px 0" }}>
                {overview.totalTrips || 0}
              </strong>
              <span style={{ fontSize: "13px", color: "#3b82f6", fontWeight: "600" }}>
                📍 {overview.totalDestinations || 0} Unique Destinations
              </span>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>GROSS SPEND TURNOVER</span>
              <strong style={{ display: "block", fontSize: "30px", color: "#0f766e", margin: "6px 0" }}>
                ₹{Number(overview.totalPlatformSpend || 0).toLocaleString("en-IN")}
              </strong>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Avg/Trip: ₹{Number(overview.averageSpendPerTrip || 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px" }}>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>AVERAGE TRIP DURATION</span>
              <strong style={{ display: "block", fontSize: "30px", color: "#8b5cf6", margin: "6px 0" }}>
                {trips.averageTripDurationDays || 0} Days
              </strong>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                👥 Avg {overview.averageTravelersPerTrip || 1} travelers/trip
              </span>
            </div>
          </section>

          {/* 2. Dual Donut Charts Row */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
              marginBottom: "28px",
            }}
          >
            {/* Trip Status Donut */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>
                  🧭 Platform Trip Status Distribution
                </h3>
                <span style={{ fontSize: "12px", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", color: "#64748b", fontWeight: "700" }}>
                  {overview.totalTrips || 0} Total
                </span>
              </div>
              <div style={{ height: "260px", position: "relative" }}>
                <Doughnut data={tripStatusData} options={donutOptions} />
              </div>
            </div>

            {/* Platform Category Spending Donut (Reusable Component) */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>
                  💰 System-Wide Category Volume
                </h3>
                <span style={{ fontSize: "12px", background: "#f0fdfa", padding: "3px 8px", borderRadius: "6px", color: "#0f766e", fontWeight: "700" }}>
                  ₹{Number(overview.totalPlatformSpend || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <CategoryDonutChart items={categoryList} height="260px" currencySymbol="₹" />
            </div>
          </section>

          {/* 3. Top Booked Destinations (Full Width, Big & Prominent) */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "26px",
              marginBottom: "28px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "20px" }}>
                  🏆 Top Booked Destinations & Traveler Footprint
                </h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                  Comparative breakdown of trip bookings and unique traveler volume across top travel spots.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <span
                  style={{
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    padding: "5px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  📍 {overview.totalDestinations || 0} Unique Destinations
                </span>
                {topDestList[0] && (
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#15803d",
                      padding: "5px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    👑 #1 Most Booked: {topDestList[0].destination}
                  </span>
                )}
              </div>
            </div>

            {/* Big High-Readability Destination Bar Chart */}
            <DestinationsBarChart destinations={topDestList} height="380px" />
          </section>

          {/* 4. Monthly Platform Trip Creation Velocity (Mentor requirement: trip activity over time) */}
          {monthlyTripTrends && monthlyTripTrends.length > 0 && (
            <section
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "28px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>
                    📈 Platform Trip Activity Over Time
                  </h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                    Monthly velocity of trips created and scheduled across the entire platform.
                  </p>
                </div>
                <span style={{ fontSize: "12px", background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", color: "#334155", fontWeight: "700" }}>
                  {monthlyTripTrends.length} Months Tracked
                </span>
              </div>
              <TrendLineChart
                labels={monthlyTripTrends.map((t) => t.yearMonth)}
                data={monthlyTripTrends.map((t) => Number(t.tripCount || 0))}
                seriesLabel="Trips Created"
                height="240px"
                color="#3b82f6"
                fillColor="rgba(59, 130, 246, 0.12)"
                isCurrency={false}
              />
            </section>
          )}

          {/* 4. Power Travelers & Role Governance Table */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "32px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>
                  ⭐ Platform Travelers & Role Governance
                </h3>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
                  Inspect active travelers and authorize new Platform Administrators.
                </p>
              </div>
            </div>

            {users.topTravelers && users.topTravelers.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "13px" }}>
                      <th style={{ padding: "12px 14px" }}>USER</th>
                      <th style={{ padding: "12px 14px" }}>EMAIL</th>
                      <th style={{ padding: "12px 14px" }}>SYSTEM ROLE</th>
                      <th style={{ padding: "12px 14px" }}>TOTAL TRIPS</th>
                      <th style={{ padding: "12px 14px" }}>TOTAL SPENT</th>
                      <th style={{ padding: "12px 14px" }}>ADMIN AUTHORIZATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.topTravelers.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "14px" }}>
                        <td style={{ padding: "12px 14px", fontWeight: "700", color: "#0f172a" }}>
                          {idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : ""}
                          {t.name}
                        </td>
                        <td style={{ padding: "12px 14px", color: "#64748b" }}>{t.email}</td>
                        <td style={{ padding: "12px 14px" }}>
                          {t.admin ? (
                            <span style={{ background: "#fef2f2", color: "#dc2626", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800" }}>
                              🛡️ ADMIN
                            </span>
                          ) : (
                            <span style={{ background: "#f0fdfa", color: "#0f766e", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                              👤 TRAVELER
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: "700" }}>{t.tripCount} Trips</td>
                        <td style={{ padding: "12px 14px", color: "#0f766e", fontWeight: "700" }}>
                          ₹{Number(t.totalSpent || 0).toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          {t.admin ? (
                            <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "700" }}>✓ Authorized Admin</span>
                          ) : (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Authorize ${t.name} (${t.email}) as a System Administrator?`)) {
                                  try {
                                    await analyticsService.promoteUserToAdmin(t.userId);
                                    const refreshed = await analyticsService.getAdminDashboard();
                                    setAdminData(refreshed);
                                    alert(`Successfully promoted ${t.name} to Administrator!`);
                                  } catch (err) {
                                    alert("Promotion failed: " + (err.message || "Unknown error"));
                                  }
                                }
                              }}
                              style={{
                                background: "#0f172a",
                                color: "#ffffff",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              👑 Promote to Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "#64748b", margin: 0 }}>No travelers registered yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
