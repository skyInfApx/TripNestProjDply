import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { tripService } from "../services/tripService";
import { groupService } from "../services/groupService";
import { useAuth } from "../context/useAuth";
import { formatDisplayDate } from "../utils/dateUtils";

function Trips() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal 1: Create Trip State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    numberOfTravelers: 1,
    status: "PLANNED",
  });

  // Modal 2: Join Squad by Code State
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  // Modal 3: Search & Discover Squads State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [joiningCode, setJoiningCode] = useState(null);

  // Received Invitations State (Double-Consent Flow)
  const [myInvitations, setMyInvitations] = useState([]);
  const [invitationActionLoadingId, setInvitationActionLoadingId] = useState(null);

  // In-Page Toast Notification (Replaces window.alert)
  const [toastNotification, setToastNotification] = useState(null);

  // In-Page Confirmation Dialog (Replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    confirmColor: "#dc2626",
    onConfirm: null,
  });

  function showToast(message, type = "success") {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }

  useEffect(() => {
    loadTrips();
    loadMyInvitations();
  }, []);

  async function loadMyInvitations() {
    try {
      const invs = await groupService.getMyInvitations();
      setMyInvitations(invs || []);
    } catch {
      setMyInvitations([]);
    }
  }

  async function loadTrips() {
    setLoading(true);
    setError("");
    try {
      const data = await tripService.getMyTrips();
      setTrips(data);
    } catch (err) {
      setError(err.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "numberOfTravelers" ? Number(value) : value,
    }));
  }

  async function handleCreateTrip(e) {
    e.preventDefault();
    setFormError("");

    if (!formData.title.trim()) {
      setFormError("Trip title is required.");
      return;
    }
    if (!formData.destination.trim()) {
      setFormError("Destination is required.");
      return;
    }
    if (!formData.startDate) {
      setFormError("Start date is required.");
      return;
    }
    if (!formData.endDate) {
      setFormError("End date is required.");
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setFormError("End date cannot be earlier than start date.");
      return;
    }
    if (formData.numberOfTravelers < 1) {
      setFormError("At least 1 traveler is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newTrip = await tripService.createTrip(formData);
      setTrips((prev) => [newTrip, ...prev]);
      setIsModalOpen(false);
      setFormData({
        title: "",
        destination: "",
        startDate: "",
        endDate: "",
        numberOfTravelers: 1,
        status: "PLANNED",
      });
      navigate(`/trips/${newTrip.id}`);
    } catch (err) {
      setFormError(err.message || "Failed to create trip.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Submitting Join Request by 6-character Code (Double-Consent Flow)
  async function handleJoinByCode(e) {
    if (e) e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;

    setJoinLoading(true);
    setJoinError("");
    setJoinSuccess("");

    try {
      const res = await groupService.requestJoinByCode(code);
      const squadName = res.groupName || res.tripTitle || code;
      setIsJoinModalOpen(false);
      setJoinCodeInput("");
      showToast(`📨 Join request sent to the admins of "${squadName}"! You will be added to the squad once an admin approves.`);
    } catch (err) {
      setJoinError(err.response?.data?.message || err.message || "Invalid join code. Please verify and try again.");
    } finally {
      setJoinLoading(false);
    }
  }

  // Handle Searching Travel Groups
  async function handleSearchGroups(queryToSearch) {
    setSearchLoading(true);
    setSearchError("");
    try {
      const results = await groupService.searchGroups(queryToSearch);
      setSearchResults(results || []);
    } catch (err) {
      setSearchError(err.response?.data?.message || err.message || "Failed to search travel squads.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Submit join request directly from search results (Double-Consent Flow)
  async function handleJoinFromSearch(code) {
    if (!code) return;
    setJoiningCode(code);
    setSearchError("");
    try {
      const res = await groupService.requestJoinByCode(code);
      const squadName = res.groupName || res.tripTitle || code;
      setIsSearchModalOpen(false);
      setJoiningCode(null);
      showToast(`📨 Join request sent to the admins of "${squadName}"! You will be added to the squad once an admin approves.`);
    } catch (err) {
      setSearchError(err.response?.data?.message || err.message || "Failed to send join request.");
      setJoiningCode(null);
    }
  }

  // Accept Received Trip Invitation
  async function handleAcceptInvitation(invitation) {
    setInvitationActionLoadingId(invitation.id);
    setError("");
    try {
      const res = await groupService.acceptInvitation(invitation.id);
      setMyInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      showToast(`🎉 You joined "${invitation.groupName || invitation.tripTitle}"! Welcome to the squad.`);
      await loadTrips();
      if (res.tripId) {
        navigate(`/trips/${res.tripId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to accept invitation.");
    } finally {
      setInvitationActionLoadingId(null);
    }
  }

  // Decline Received Trip Invitation (In-Page Confirmation Dialog)
  function handleDeclineInvitation(invitation) {
    const squadTitle = invitation.groupName || invitation.tripTitle || "Travel Squad";
    setConfirmModal({
      isOpen: true,
      title: "Decline Squad Invitation",
      message: `Are you sure you want to decline the invitation to join "${squadTitle}"? This will remove the invitation from your received list.`,
      confirmLabel: "Yes, Decline",
      cancelLabel: "Keep Invitation",
      confirmColor: "#dc2626",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setInvitationActionLoadingId(invitation.id);
        setError("");
        try {
          await groupService.declineInvitation(invitation.id);
          setMyInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
          showToast(`Declined invitation to join "${squadTitle}".`, "info");
        } catch (err) {
          setError(err.response?.data?.message || err.message || "Failed to decline invitation.");
        } finally {
          setInvitationActionLoadingId(null);
        }
      },
    });
  }

  // Filter trips by status and search
  const filteredTrips = trips.filter((trip) => {
    const matchesStatus =
      statusFilter === "ALL" || trip.status === statusFilter;
    const matchesSearch =
      trip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate duration in days
  function calculateDays(start, end) {
    if (!start || !end) return 1;
    const diffTime = Math.abs(new Date(end) - new Date(start));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <div className="content-page trips-page">
      {/* Page Heading & Action Buttons */}
      <section className="trips-header-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="eyebrow">TRAVEL BLUEPRINTS</span>
          <h1>My Trips & Groups</h1>
          <p>Organize, schedule, and collaborate across all your personal and group adventures.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Join Group by Code Button */}
          <button
            onClick={() => {
              setJoinError("");
              setJoinSuccess("");
              setIsJoinModalOpen(true);
            }}
            style={{
              padding: "10px 16px",
              background: "#7c3aed",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
            }}
          >
            <span>🔑</span> Join Group by Code
          </button>

          {/* Search Groups Button */}
          <button
            onClick={() => {
              setSearchError("");
              setIsSearchModalOpen(true);
              handleSearchGroups(searchQuery);
            }}
            style={{
              padding: "10px 16px",
              background: "#ede9fe",
              color: "#6d28d9",
              border: "1px solid #c4b5fd",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🔍</span> Search Groups
          </button>

          {/* Plan New Trip Button */}
          <button
            className="primary-btn add-trip-btn"
            onClick={() => setIsModalOpen(true)}
          >
            + Plan a New Trip
          </button>
        </div>
      </section>

      {/* --- RECEIVED TRIP INVITATIONS BANNER (Double-Consent Flow) --- */}
      {myInvitations.length > 0 && (
        <div
          style={{
            marginBottom: "28px",
            background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
            border: "1px solid #bbf7d0",
            borderLeft: "6px solid #16a34a",
            borderRadius: "14px",
            padding: "20px 24px",
            boxShadow: "0 2px 12px rgba(22, 163, 74, 0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                <span>📬 Action Required</span>
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#14532d", margin: "2px 0 0" }}>
                📩 Received Trip Invitations ({myInvitations.length})
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#166534" }}>
                Friends have invited you to collaborate on their upcoming travel squads. Accept to join and view trip details, itineraries, and expense splits.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {myInvitations.map((inv) => {
              const isLoading = invitationActionLoadingId === inv.id;
              return (
                <div
                  key={inv.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "10px",
                    border: "1px solid #dcfce7",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  }}
                >
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                      🏕️ {inv.groupName || inv.tripTitle || "Travel Squad"}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "#475569" }}>
                      <span>
                        📍 Destination: <strong>{inv.destination || "Trip Destination"}</strong>
                      </span>
                      <span>
                        👤 Invited by: <strong>{inv.inviterName || inv.inviterEmail || "Trip Admin"}</strong>
                      </span>
                      <span
                        style={{
                          background: inv.role === "GROUP_ADMIN" ? "#ede9fe" : "#f1f5f9",
                          color: inv.role === "GROUP_ADMIN" ? "#6d28d9" : "#475569",
                          padding: "1px 8px",
                          borderRadius: "10px",
                          fontSize: "11px",
                          fontWeight: "700",
                        }}
                      >
                        {inv.role === "GROUP_ADMIN" ? "🛡️ Offered Role: Admin" : "👤 Offered Role: Companion"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      disabled={isLoading}
                      onClick={() => handleAcceptInvitation(inv)}
                      style={{
                        padding: "8px 16px",
                        background: "#16a34a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 2px 6px rgba(22, 163, 74, 0.25)",
                      }}
                    >
                      <span>✅</span> {isLoading ? "Joining..." : "Accept & Join Squad"}
                    </button>
                    <button
                      disabled={isLoading}
                      onClick={() => handleDeclineInvitation(inv)}
                      style={{
                        padding: "8px 14px",
                        background: "#ffffff",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>❌</span> Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="trips-toolbar">
        <div className="status-filter-group">
          {["ALL", "PLANNED", "ONGOING", "COMPLETED", "CANCELLED"].map(
            (status) => (
              <button
                key={status}
                className={`filter-chip ${
                  statusFilter === status ? "active" : ""
                }`}
                onClick={() => setStatusFilter(status)}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            )
          )}
        </div>

        <div className="trip-search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search your trips by title or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="message error">
          <span>⚠️ {error}</span>
          <button className="small-link-btn" onClick={loadTrips}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your trips and groups...</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        /* Empty State */
        <div className="empty-trips-card">
          <span className="empty-icon">🗺️</span>
          <h2>No trips found</h2>
          <p>
            {searchTerm || statusFilter !== "ALL"
              ? "No trips match your current filter or search criteria."
              : "You haven't planned or joined any trips yet. Plan your next adventure or join a group with a 6-character code!"}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              className="primary-btn"
              onClick={() => setIsModalOpen(true)}
            >
              + Create Your First Trip
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              style={{
                padding: "10px 18px",
                background: "#7c3aed",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              🔑 Join Group with Code
            </button>
          </div>
        </div>
      ) : (
        /* Trip Cards Grid */
        <div className="trips-grid">
          {filteredTrips.map((trip) => {
            const days = calculateDays(trip.startDate, trip.endDate);
            const isOwner = user?.id && trip.ownerId ? user.id === trip.ownerId : true;

            return (
              <div key={trip.id} className="trip-summary-card">
                <div className="trip-card-header">
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span className={`status-pill ${trip.status.toLowerCase()}`}>
                      {trip.status}
                    </span>
                    {trip.ownerName && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: isOwner ? "#fef3c7" : "#ede9fe",
                          color: isOwner ? "#92400e" : "#6d28d9",
                          border: `1px solid ${isOwner ? "#fde68a" : "#ddd6fe"}`,
                        }}
                      >
                        {isOwner ? "👑 Owner" : `👥 Group (${trip.ownerName})`}
                      </span>
                    )}
                  </div>
                  <span className="duration-tag">{days} {days === 1 ? "Day" : "Days"}</span>
                </div>

                <h3 className="trip-card-title">{trip.title}</h3>

                <p className="trip-destination">
                  📍 <strong>{trip.destination}</strong>
                </p>

                <div className="trip-meta-info">
                  <div className="meta-item">
                    <span className="meta-label">DATES & DURATION</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                      <span className="stat-pill" style={{ background: "#f0fdfa", color: "#0f766e", border: "1px solid #99f6e4", fontWeight: "600", fontSize: "12px", padding: "3px 10px" }}>
                        📅 {formatDisplayDate(trip.startDate)}{trip.endDate ? ` to ${formatDisplayDate(trip.endDate)}` : ""}
                      </span>
                      {days && (
                        <span className="stat-pill" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: "600", fontSize: "12px", padding: "3px 10px" }}>
                          Trip - {days} {days === 1 ? "Day" : "Days"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="meta-item">
                    <span className="meta-label">TRAVELERS</span>
                    <span>👥 {trip.numberOfTravelers} {trip.numberOfTravelers === 1 ? "Traveler" : "Travelers"}</span>
                  </div>
                </div>

                <div className="trip-card-actions" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Link
                    to={`/trips/${trip.id}`}
                    className="primary-btn full-btn"
                    style={{ textAlign: "center" }}
                  >
                    View Details & Plan →
                  </Link>
                  <Link
                    to={`/trips/${trip.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      background: "#f5f3ff",
                      color: "#6d28d9",
                      border: "1px solid #ddd6fe",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
                      textDecoration: "none",
                      width: "100%",
                      boxSizing: "border-box",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>👥</span> Travel Group & Members
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL 1: PLAN A NEW TRIP --- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Plan a New Trip</h2>
              <button
                className="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {formError && <div className="message error">{formError}</div>}

            <form onSubmit={handleCreateTrip} className="trip-form">
              <label>
                Trip Title *
                <input
                  type="text"
                  name="title"
                  placeholder="e.g., Summer in Goa, Parisian Getaway"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <label>
                Destination *
                <input
                  type="text"
                  name="destination"
                  placeholder="e.g., Goa, Paris, Tokyo, Manali"
                  value={formData.destination}
                  onChange={handleInputChange}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Start Date *
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  End Date *
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Number of Travelers *
                  <input
                    type="number"
                    name="numberOfTravelers"
                    min="1"
                    value={formData.numberOfTravelers}
                    onChange={handleInputChange}
                    required
                  />
                </label>

                <label>
                  Initial Status
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Save Trip & Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: JOIN SQUAD BY 6-CHAR CODE --- */}
      {isJoinModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsJoinModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                🔑 Request to Join Travel Group
              </h3>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5", margin: "0 0 20px" }}>
              Enter the unique 6-character code (e.g., <strong>GOA-842</strong> or <strong>SHIMLA-123</strong>) shared by your trip organizer. A join request will be sent to the group's admins for approval.
            </p>

            {joinError && (
              <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                ⚠️ {joinError}
              </div>
            )}

            {joinSuccess && (
              <div style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                {joinSuccess}
              </div>
            )}

            <form onSubmit={handleJoinByCode}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", textTransform: "uppercase", marginBottom: "6px" }}>
                  6-Character Join Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. GOA-842"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "2px solid #c4b5fd",
                    fontSize: "18px",
                    fontWeight: "800",
                    fontFamily: "monospace",
                    letterSpacing: "3px",
                    color: "#6d28d9",
                    textAlign: "center",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  style={{
                    padding: "10px 16px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinLoading || !joinCodeInput.trim()}
                  style={{
                    padding: "10px 20px",
                    background: "#7c3aed",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: joinLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
                  }}
                >
                  {joinLoading ? "Submitting Request..." : "📨 Send Join Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: SEARCH & DISCOVER TRAVEL GROUPS --- */}
      {isSearchModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsSearchModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                🔍 Search & Discover Travel Groups
              </h3>
              <button
                onClick={() => setIsSearchModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#64748b", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px" }}>
              Search for your friends' trips by Destination (e.g. <strong>Shimla</strong>, <strong>Goa</strong>), Group Name, or Join Code.
            </p>

            {/* Search Input Box */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Type 'Shimla', 'Goa', or group name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchGroups(e.target.value);
                }}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleSearchGroups(searchQuery)}
                style={{
                  padding: "10px 18px",
                  background: "#7c3aed",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Search
              </button>
            </div>

            {searchError && (
              <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
                ⚠️ {searchError}
              </div>
            )}

            {/* Results List */}
            {searchLoading ? (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div className="spinner" style={{ margin: "0 auto 10px" }}></div>
                <p style={{ color: "#64748b", fontSize: "13px" }}>Searching groups...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "28px" }}>🏕️</span>
                <p style={{ color: "#64748b", fontSize: "14px", fontWeight: "600", margin: "8px 0 4px" }}>
                  No groups found matching "{searchQuery}"
                </p>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Try searching by destination (e.g. Shimla) or ask your friend for their 6-character code.
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {searchResults.map((grp) => (
                  <div
                    key={grp.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "14px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                        {grp.name}
                      </h4>
                      <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#475569" }}>
                        📍 {grp.destination || grp.tripTitle || "Vacation Destination"}
                      </p>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", background: "#f5f3ff", color: "#7c3aed", border: "1px dashed #c084fc", padding: "2px 8px", borderRadius: "6px", fontFamily: "monospace" }}>
                          Code: {grp.joinCode}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          👥 {grp.memberCount || grp.members?.length || 1} Companions
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={joiningCode === grp.joinCode}
                      onClick={() => handleJoinFromSearch(grp.joinCode)}
                      style={{
                        padding: "8px 16px",
                        background: "#7c3aed",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: joiningCode === grp.joinCode ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 6px rgba(124, 58, 237, 0.2)",
                        flexShrink: 0,
                      }}
                    >
                      {joiningCode === grp.joinCode ? "Submitting..." : "📨 Request to Join"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating In-Page Toast Notification (Replaces window.alert) */}
      {toastNotification && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 3000,
            background: toastNotification.type === "info" ? "#0f172a" : "#065f46",
            color: "#ffffff",
            padding: "14px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "460px",
            border: toastNotification.type === "info" ? "1px solid #334155" : "1px solid #059669",
            animation: "slideInRight 0.3s ease-out",
          }}
        >
          <div style={{ fontSize: "20px" }}>
            {toastNotification.type === "info" ? "ℹ️" : "✅"}
          </div>
          <div style={{ flex: 1, fontSize: "13px", fontWeight: "600", lineHeight: "1.4" }}>
            {toastNotification.message}
          </div>
          <button
            onClick={() => setToastNotification(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              opacity: 0.8,
              cursor: "pointer",
              fontSize: "16px",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Themed In-Page Confirmation Modal (Replaces window.confirm) */}
      {confirmModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "16px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>
                  {confirmModal.title}
                </h3>
              </div>
            </div>

            <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
              {confirmModal.message}
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  padding: "9px 16px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {confirmModal.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                style={{
                  padding: "9px 18px",
                  background: confirmModal.confirmColor || "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(220, 38, 38, 0.25)",
                  transition: "all 0.15s ease",
                }}
              >
                {confirmModal.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trips;
