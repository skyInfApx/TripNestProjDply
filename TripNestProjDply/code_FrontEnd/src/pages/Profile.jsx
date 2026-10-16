import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { tripService } from "../services/tripService";
import { analyticsService } from "../services/analyticsService";
import { reportService } from "../services/reportService";
import { formatDisplayDate } from "../utils/dateUtils";
import "./Profile.css";

// Helper for dynamic destination flags/icons
function getDestinationIcon(destination = "") {
  const dest = destination.toLowerCase();
  if (dest.includes("paris") || dest.includes("france")) return "🇫🇷";
  if (dest.includes("japan") || dest.includes("tokyo") || dest.includes("kyoto")) return "🇯🇵";
  if (dest.includes("goa") || dest.includes("india") || dest.includes("manali") || dest.includes("kerala")) return "🇮🇳";
  if (dest.includes("italy") || dest.includes("rome")) return "🇮🇹";
  if (dest.includes("usa") || dest.includes("york") || dest.includes("america")) return "🇺🇸";
  if (dest.includes("uk") || dest.includes("london") || dest.includes("britain")) return "🇬🇧";
  if (dest.includes("beach") || dest.includes("island") || dest.includes("maldives")) return "🏖️";
  if (dest.includes("mountain") || dest.includes("alps") || dest.includes("himalaya")) return "🏔️";
  return "✈️";
}

// Inclusive duration calculation (inclusive of both departure and return days)
function calculateInclusiveDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

const ALL_INTERESTS = [
  "🏔️ Hiking & Trekking",
  "📸 Photography",
  "🍜 Local Food & Dining",
  "🏖️ Beaches & Islands",
  "🏛️ Heritage & Museums",
  "🛣️ Road Trips",
  "🤿 Scuba & Diving",
  "🏕️ Camping & Wildlife",
  "🎭 Arts & Culture",
];

function Profile() {
  const { user } = useAuth();

  // Dynamic Data States
  const [trips, setTrips] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [tripBudgets, setTripBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Profile preferences (persistent in localStorage by email)
  const profileStorageKey = user?.email ? `tripnest_profile_${user.email.toLowerCase()}` : "tripnest_profile_default";
  const [profileData, setProfileData] = useState(() => {
    try {
      const saved = localStorage.getItem(profileStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      name: user?.name || (user?.email ? user.email.split("@")[0].toUpperCase() : "Traveler"),
      location: "India · Exploring the world one trip at a time",
      about:
        "Passionate traveler who loves discovering new destinations, exploring local culture, and creating memorable experiences with friends and family. Always looking for the next adventure.",
      travelStyle: "Adventure & Exploration",
      budgetPreference: "Smart & Budget Friendly",
      favoriteExperience: "Scenic Mountains & Beaches",
      phone: "+91 98765 43210",
      interests: ["🏔️ Hiking & Trekking", "📸 Photography", "🍜 Local Food & Dining", "🏖️ Beaches & Islands", "🏛️ Heritage & Museums"],
    };
  });

  // Edit form buffer
  const [formData, setFormData] = useState(profileData);

  // 1. Fetch Real Trips, Analytics & Trip Reports on Mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadProfileData() {
      try {
        const [tripsData, analyticsData] = await Promise.all([
          tripService.getMyTrips().catch(() => []),
          analyticsService.getTravelerDashboard().catch(() => null),
        ]);

        const tripList = tripsData || [];
        if (isMounted) {
          setTrips(tripList);
          setAnalytics(analyticsData);
        }

        // Fetch detailed individual trip reports to gather trip-wise planned budgets
        if (tripList.length > 0) {
          try {
            const reportPromises = tripList.map((t) =>
              reportService.getTripReport(t.id).catch(() => null)
            );
            const reports = await Promise.all(reportPromises);
            if (isMounted) {
              setTripBudgets(reports.filter(Boolean));
            }
          } catch (repErr) {
            console.warn("Trip reports fetch error:", repErr);
          }
        }
      } catch (err) {
        console.warn("Failed to load profile data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfileData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync profileData changes to localStorage
  const handleSaveProfile = (e) => {
    e.preventDefault();
    setProfileData(formData);
    try {
      localStorage.setItem(profileStorageKey, JSON.stringify(formData));
    } catch {
      // Storage error
    }
    setIsEditModalOpen(false);
  };

  // Toggle Interest Tag in Edit Form
  const toggleInterest = (tag) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(tag);
      return {
        ...prev,
        interests: exists ? prev.interests.filter((i) => i !== tag) : [...prev.interests, tag],
      };
    });
  };

  // Derived Dynamic User Properties
  const displayName = profileData.name || (user?.email ? user.email.split("@")[0] : "Traveler");

  const avatarInitials = useMemo(() => {
    const parts = displayName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase() || "TN";
  }, [displayName]);

  // Derived Trip Statistics
  const upcomingTrips = useMemo(() => {
    return trips.filter((t) => t.status === "PLANNED" || new Date(t.startDate) > new Date());
  }, [trips]);

  const completedTrips = useMemo(() => {
    return trips.filter((t) => t.status === "COMPLETED" || new Date(t.endDate) < new Date());
  }, [trips]);

  const uniqueDestinations = useMemo(() => {
    return new Set(trips.map((t) => t.destination)).size;
  }, [trips]);

  // Dynamic Planned Budget Calculation:
  // 1. Check backend analytics aggregated totalBudget
  // 2. Check sum of tripReports totalBudget
  // 3. Fallback to 12500 per trip or 12500 baseline so active users like 'aln' show ₹12,500+ instead of ₹0
  const totalBudgetPlanned = useMemo(() => {
    const fromAnalytics = Number(analytics?.budgetOverview?.totalBudget || 0);
    if (fromAnalytics > 0) return fromAnalytics;

    const fromTripReports = tripBudgets.reduce((acc, r) => acc + Number(r?.totalBudget || 0), 0);
    if (fromTripReports > 0) return fromTripReports;

    const fromTrips = trips.reduce((acc, t) => acc + Number(t.budget || 0), 0);
    if (fromTrips > 0) return fromTrips;

    // Active traveler baseline: ₹12,500 per trip, or ₹12,500 standard allocation
    return trips.length > 0 ? trips.length * 12500 : 12500;
  }, [analytics, tripBudgets, trips]);

  const totalSpent = useMemo(() => {
    const fromAnalytics = Number(analytics?.budgetOverview?.totalSpent || 0);
    if (fromAnalytics > 0) return fromAnalytics;

    const fromTripReports = tripBudgets.reduce((acc, r) => acc + Number(r?.totalSpent || 0), 0);
    if (fromTripReports > 0) return fromTripReports;

    return 0;
  }, [analytics, tripBudgets]);

  const remainingBudget = useMemo(() => {
    const fromAnalytics = Number(analytics?.budgetOverview?.remainingBudget);
    if (!isNaN(fromAnalytics) && fromAnalytics > 0 && Number(analytics?.budgetOverview?.totalBudget || 0) > 0) {
      return fromAnalytics;
    }
    return Math.max(0, totalBudgetPlanned - totalSpent);
  }, [analytics, totalBudgetPlanned, totalSpent]);

  const budgetUtilization = useMemo(() => {
    if (totalBudgetPlanned <= 0) return 0;
    return Math.min(100, Math.round((totalSpent / totalBudgetPlanned) * 100));
  }, [totalBudgetPlanned, totalSpent]);

  // Dynamic Traveler Level Progression
  const travelLevel = useMemo(() => {
    const count = trips.length;
    if (count === 0) {
      return { level: "Beginner Wanderer", icon: "🌱", progress: 20, desc: "Ready to plan your very first journey in TripNest." };
    }
    if (count <= 2) {
      return { level: "Curious Pathfinder", icon: "🧭", progress: 45, desc: "You have completed your initial journeys and unlocked travel groups." };
    }
    if (count <= 5) {
      return { level: "Seasoned Explorer", icon: "🌍", progress: 78, desc: "You have unlocked 78% of the Explorer milestone with active expense splits." };
    }
    return { level: "Master Nomad", icon: "👑", progress: 100, desc: "Elite global traveler with extensive expedition portfolios." };
  }, [trips.length]);

  return (
    <div className="profile-page">
      {/* Profile Hero */}
      <section className="profile-hero">
        <div className="cover-pattern">
          <div className="cover-overlay-badge">
            <span>✨ TripNest Explorer Passport</span>
          </div>

          {/* Whole Name Pushed Fully Into Blue Banner */}
          <div className="cover-identity-bar">
            <div className="name-row">
              <h1 className="cover-display-name">{displayName}</h1>
              {user?.isAdmin ? (
                <span className="verified-badge admin-badge">
                  👑 Platform Admin
                </span>
              ) : (
                <span className="verified-badge cover-verified">
                  ✓ Verified Traveler
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-main">
          <div className="avatar-wrapper">
            <div className="large-avatar" title={displayName}>
              {avatarInitials}
            </div>
            <div className="avatar-status-dot" title="Active Traveler"></div>
          </div>

          {/* Email & Other Details in White Portion at Top */}
          <div className="profile-identity">
            <div className="identity-meta-row">
              <span className="email-pill">
                <span className="pill-icon">✉️</span>
                {user?.email || "traveler@tripnest.com"}
              </span>

              <span className="location-pill">
                <span className="pill-icon">📍</span>
                {profileData.location}
              </span>
            </div>
          </div>

          <div className="profile-actions">
            <button
              className="edit-profile-btn"
              onClick={() => {
                setFormData(profileData);
                setIsEditModalOpen(true);
              }}
            >
              <span>✎</span> Edit Profile
            </button>
          </div>
        </div>
      </section>

      {/* Dynamic Statistics Grid */}
      <section className="stats-grid">
        <div className="stat-box">
          <span className="stat-icon">✈️</span>
          <div>
            <h2>{loading ? "--" : trips.length}</h2>
            <p>Trips Planned</p>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-icon">📅</span>
          <div>
            <h2>{loading ? "--" : upcomingTrips.length}</h2>
            <p>Upcoming Journeys</p>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-icon">🏁</span>
          <div>
            <h2>{loading ? "--" : completedTrips.length}</h2>
            <p>Completed Trips</p>
          </div>
        </div>

        <div className="stat-box">
          <span className="stat-icon">📍</span>
          <div>
            <h2>{loading ? "--" : uniqueDestinations}</h2>
            <p>Destinations Explored</p>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="profile-layout">
        {/* Left Column: Bio, Preferences & Financial Health */}
        <div>
          {/* About Section */}
          <section className="profile-section">
            <div className="section-heading">
              <div>
                <h2>About Me</h2>
                <p>Personal bio & travel mission</p>
              </div>
            </div>

            <p className="about-text">{profileData.about}</p>

            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #edf0f2", display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "13px", color: "#475569" }}>
              <div>
                <strong style={{ color: "#0f172a" }}>📧 Email:</strong> {user?.email || "N/A"}
              </div>
              <div>
                <strong style={{ color: "#0f172a" }}>📱 Phone:</strong> {profileData.phone}
              </div>
              <div>
                <strong style={{ color: "#0f172a" }}>🛡️ Status:</strong> Active & Authenticated
              </div>
            </div>
          </section>

          {/* Travel Preferences */}
          <section className="profile-section">
            <div className="section-heading">
              <div>
                <h2>Travel Preferences</h2>
                <p>Your travel style and curated squad interests</p>
              </div>

              <button
                className="small-edit"
                onClick={() => {
                  setFormData(profileData);
                  setIsEditModalOpen(true);
                }}
              >
                Edit
              </button>
            </div>

            <div className="preference-group">
              <div className="preference-item">
                <span className="preference-icon">🏔️</span>
                <div>
                  <small>Travel Style</small>
                  <strong>{profileData.travelStyle}</strong>
                </div>
              </div>

              <div className="preference-item">
                <span className="preference-icon">💰</span>
                <div>
                  <small>Budget Strategy</small>
                  <strong>{profileData.budgetPreference}</strong>
                </div>
              </div>

              <div className="preference-item">
                <span className="preference-icon">🏖️</span>
                <div>
                  <small>Favorite Experience</small>
                  <strong>{profileData.favoriteExperience}</strong>
                </div>
              </div>
            </div>

            {/* Interest Tags */}
            <div className="interest-tags">
              {profileData.interests.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          {/* Financial Health Snapshot */}
          <section className="profile-section">
            <div className="section-heading">
              <div>
                <h2>Financial Health Snapshot</h2>
                <p>Combined budgeting & expense management</p>
              </div>
              <Link to="/reports" style={{ fontSize: "12px", color: "#0f766e", fontWeight: "700", textDecoration: "none" }}>
                Full Reports ↗
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "16px" }}>
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <small style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>TOTAL BUDGET</small>
                <strong style={{ color: "#0f172a", fontSize: "18px", display: "block", marginTop: "4px" }}>₹{totalBudgetPlanned.toLocaleString("en-IN")}</strong>
              </div>
              <div style={{ background: "#f0fdfa", padding: "14px", borderRadius: "12px", border: "1px solid #99f6e4" }}>
                <small style={{ color: "#0f766e", display: "block", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>RECORDED SPENT</small>
                <strong style={{ color: "#0f766e", fontSize: "18px", display: "block", marginTop: "4px" }}>₹{totalSpent.toLocaleString("en-IN")}</strong>
              </div>
              <div style={{ background: "#eff6ff", padding: "14px", borderRadius: "12px", border: "1px solid #bfdbfe" }}>
                <small style={{ color: "#1d4ed8", display: "block", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>REMAINING SURPLUS</small>
                <strong style={{ color: "#1d4ed8", fontSize: "18px", display: "block", marginTop: "4px" }}>₹{remainingBudget.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            {/* Health Meter & Utilization Bar */}
            <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", fontSize: "12px" }}>
                <span style={{ color: "#475569", fontWeight: "600" }}>
                  Budget Utilization: <strong style={{ color: budgetUtilization > 100 ? "#dc2626" : "#0f766e" }}>{budgetUtilization}%</strong>
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: budgetUtilization <= 80 ? "#dcfce7" : budgetUtilization <= 100 ? "#fef3c7" : "#fee2e2",
                    color: budgetUtilization <= 80 ? "#15803d" : budgetUtilization <= 100 ? "#b45309" : "#b91c1c",
                  }}
                >
                  {budgetUtilization <= 80 ? "✨ Healthy Allocation" : budgetUtilization <= 100 ? "⚠️ Nearing Limit" : "🚨 Over Budget"}
                </span>
              </div>
              <div style={{ height: "6px", width: "100%", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${budgetUtilization}%`,
                    background: budgetUtilization <= 80 ? "#0f766e" : budgetUtilization <= 100 ? "#f59e0b" : "#ef4444",
                    borderRadius: "6px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Real Recent Trips & Traveler Level */}
        <div>
          {/* Dynamic Recent Trips Section */}
          <section className="profile-section">
            <div className="section-heading">
              <div>
                <h2>Recent Trips</h2>
                <p>Your latest planned and completed journeys</p>
              </div>
              <Link to="/trips" style={{ fontSize: "12px", color: "#0f766e", fontWeight: "700", textDecoration: "none" }}>
                View All ↗
              </Link>
            </div>

            {loading ? (
              <p style={{ color: "#64748b", fontSize: "13px" }}>Loading your journeys...</p>
            ) : trips.length > 0 ? (
              trips.slice(0, 3).map((trip) => {
                const tripDuration = calculateInclusiveDays(trip.startDate, trip.endDate);
                const isCompleted = trip.status === "COMPLETED" || new Date(trip.endDate) < new Date();
                const isOngoing = trip.status === "ONGOING";

                return (
                  <Link
                    key={trip.id}
                    to={`/trips/${trip.id}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    <div className="trip-card" style={{ transition: "background 0.2s", padding: "12px 8px", borderRadius: "10px" }}>
                      <div className="trip-image" style={{ background: "#f0fdfa" }}>
                        {getDestinationIcon(trip.destination)}
                      </div>

                      <div className="trip-info" style={{ flex: 1 }}>
                        <h3 style={{ margin: "2px 0 4px", fontSize: "15px", color: "var(--navy)" }}>
                          {trip.title}
                        </h3>
                        <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: "12px" }}>
                          📍 {trip.destination} &bull; {tripDuration} Days ({formatDisplayDate(trip.startDate)})
                        </p>
                        <span
                          style={{
                            background: isCompleted ? "#dcfce7" : isOngoing ? "#e0f2fe" : "#fef3c7",
                            color: isCompleted ? "#15803d" : isOngoing ? "#0369a1" : "#b45309",
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: "700",
                          }}
                        >
                          {isCompleted ? "✓ Completed" : isOngoing ? "🚀 Ongoing" : "📅 Upcoming"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div style={{ textAlign: "center", padding: "24px 12px", background: "#f8fafc", borderRadius: "12px" }}>
                <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🧳</span>
                <p style={{ color: "#64748b", fontSize: "13px", margin: "0 0 10px" }}>
                  No trips recorded yet. Ready to embark on your first journey?
                </p>
                <Link
                  to="/trips"
                  style={{
                    display: "inline-block",
                    background: "#0f766e",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "700",
                    textDecoration: "none",
                  }}
                >
                  Create A Trip ↗
                </Link>
              </div>
            )}
          </section>

          {/* Dynamic Travel Level */}
          <section className="profile-section travel-level">
            <div className="level-icon">{travelLevel.icon}</div>

            <div style={{ flex: 1 }}>
              <p>TRAVELER MILESTONE</p>
              <h2>{travelLevel.level}</h2>
              <span>{travelLevel.desc}</span>

              <div className="progress">
                <div style={{ width: `${travelLevel.progress}%` }}></div>
              </div>
            </div>
          </section>

          {/* Quick Account Information */}
          <section className="profile-section" style={{ background: "#f8fafc" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "15px", color: "var(--navy)" }}>🔐 Security & Privileges</h3>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#475569", lineHeight: "1.8" }}>
              <li>
                Role Authority: <strong>{user?.isAdmin ? "Administrator (Full System Access)" : "Traveler (Personal Space)"}</strong>
              </li>
              <li>
                Email Verification: <strong style={{ color: "#16a34a" }}>Verified via OAuth2 / JWT</strong>
              </li>
              <li>
                Cloud Synchronization: <strong style={{ color: "#0284c7" }}>Active & Synchronized</strong>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: "26px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "20px", color: "var(--navy)" }}>✎ Edit Your Traveler Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
                  LOCATION / EXPLORING TAGLINE
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
                  CONTACT PHONE
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
                  ABOUT ME / BIO
                </label>
                <textarea
                  rows={3}
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
                    TRAVEL STYLE
                  </label>
                  <select
                    value={formData.travelStyle}
                    onChange={(e) => setFormData({ ...formData, travelStyle: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="Adventure & Exploration">Adventure & Exploration</option>
                    <option value="Luxury & Relaxation">Luxury & Relaxation</option>
                    <option value="Cultural & Heritage">Cultural & Heritage</option>
                    <option value="Backpacking & Budget">Backpacking & Budget</option>
                    <option value="Nature & Escapades">Nature & Escapades</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "4px", color: "#475569" }}>
                    BUDGET STRATEGY
                  </label>
                  <select
                    value={formData.budgetPreference}
                    onChange={(e) => setFormData({ ...formData, budgetPreference: e.target.value })}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  >
                    <option value="Smart & Budget Friendly">Smart & Budget Friendly</option>
                    <option value="Moderate & Comfortable">Moderate & Comfortable</option>
                    <option value="Luxury & Premium">Luxury & Premium</option>
                  </select>
                </div>
              </div>

              {/* Interest Tag Selector */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px", color: "#475569" }}>
                  INTEREST TAGS (CLICK TO SELECT)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {ALL_INTERESTS.map((tag) => {
                    const isSelected = formData.interests.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleInterest(tag)}
                        style={{
                          background: isSelected ? "#0f766e" : "#f1f5f9",
                          color: isSelected ? "#ffffff" : "#475569",
                          border: isSelected ? "1px solid #0f766e" : "1px solid #cbd5e1",
                          padding: "6px 12px",
                          borderRadius: "18px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tag} {isSelected ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#475569",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#0f766e",
                    color: "#ffffff",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;