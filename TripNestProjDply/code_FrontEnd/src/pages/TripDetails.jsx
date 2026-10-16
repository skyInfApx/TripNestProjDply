import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { tripService } from "../services/tripService";
import { itineraryService } from "../services/itineraryService";
import { activityService } from "../services/activityService";
import groupService from "../services/groupService";
import { formatDisplayDate } from "../utils/dateUtils";
import BudgetTab from "../components/BudgetTab";
import ExpenseTab from "../components/ExpenseTab";
import ExpenseReportsTab from "../components/ExpenseReportsTab";
import TravelGroupTab from "../components/TravelGroupTab";
import SharedExpensesTab from "../components/SharedExpensesTab";
import DocumentVaultTab from "../components/DocumentVaultTab";
import notificationService from "../services/notificationService";

function TripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab driven from URL query param for instant deep-linking (e.g. ?tab=vault, ?tab=expenses)
  const activeTab = searchParams.get("tab") || "itinerary";
  const setActiveTab = (tab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  // Core Trip State
  const [trip, setTrip] = useState(null);
  const [travelGroup, setTravelGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Itinerary & Activity State
  const [days, setDays] = useState([]);
  const [dayActivities, setDayActivities] = useState({}); // { [dayId]: [activities] }

  // Modals State
  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedDayForActivity, setSelectedDayForActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Activity Reminder Modal State
  const [reminderModal, setReminderModal] = useState({
    isOpen: false,
    activityTitle: "",
    scheduledTime: "",
    notes: "",
    submitting: false,
    successMsg: "",
  });

  // Edit Trip Form
  const [tripForm, setTripForm] = useState({
    title: "",
    destination: "",
    startDate: "",
    endDate: "",
    numberOfTravelers: 1,
    status: "PLANNED",
  });

  // Add Day Form
  const [dayForm, setDayForm] = useState({
    dayNumber: 1,
    date: "",
    title: "",
    description: "",
  });

  // Activity Form
  const [activityForm, setActivityForm] = useState({
    title: "",
    category: "SIGHTSEEING",
    startTime: "09:00",
    endTime: "11:00",
    location: "",
    description: "",
    bookingDetails: "",
    checklist: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        const tripData = await tripService.getTripById(tripId);
        if (!isMounted) return;
        setTrip(tripData);
        setTripForm({
          title: tripData.title,
          destination: tripData.destination,
          startDate: tripData.startDate,
          endDate: tripData.endDate,
          numberOfTravelers: tripData.numberOfTravelers,
          status: tripData.status,
        });

        try {
          await itineraryService.ensureItinerary(tripId);
          const daysData = await itineraryService.getDays(tripId);
          if (!isMounted) return;
          setDays(daysData);

          const activitiesMap = {};
          for (const day of daysData) {
            try {
              const acts = await activityService.getActivitiesByDay(day.id);
              activitiesMap[day.id] = acts;
            } catch {
              activitiesMap[day.id] = [];
            }
          }
          if (isMounted) setDayActivities(activitiesMap);
        } catch (itineraryErr) {
          console.warn("Itinerary load notice:", itineraryErr.message);
        }

        try {
          const groupData = await groupService.getGroupByTripId(tripId);
          if (isMounted) setTravelGroup(groupData);
        } catch {
          if (isMounted) setTravelGroup(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load trip details");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [tripId]);

  // --- TRIP ACTIONS (Task 8) ---
  async function handleUpdateTrip(e) {
    e.preventDefault();
    setModalError("");

    if (tripForm.startDate && tripForm.endDate && tripForm.endDate < tripForm.startDate) {
      setModalError("End date cannot be earlier than start date.");
      return;
    }

    setModalSubmitting(true);
    try {
      const updated = await tripService.updateTrip(tripId, tripForm);
      setTrip(updated);
      setIsEditTripOpen(false);
    } catch (err) {
      setModalError(err.message || "Failed to update trip");
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleDeleteTrip() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${trip.title}"? This will permanently delete its itinerary and all scheduled activities.`
    );
    if (!confirmed) return;

    try {
      await tripService.deleteTrip(tripId);
      navigate("/trips");
    } catch (err) {
      alert("Failed to delete trip: " + err.message);
    }
  }

  // Trip duration in days
  const tripStartDate = trip?.startDate ? new Date(trip.startDate) : null;
  const tripEndDate = trip?.endDate ? new Date(trip.endDate) : null;
  const tripDuration =
    tripStartDate && tripEndDate
      ? Math.max(1, Math.round((tripEndDate.getTime() - tripStartDate.getTime()) / (1000 * 3600 * 24)) + 1)
      : 10;

  // Member names list (supports solo and group companion rosters)
  const memberNames = useMemo(() => {
    if (travelGroup?.members && Array.isArray(travelGroup.members) && travelGroup.members.length > 0) {
      return travelGroup.members.map((m) => m.name || m.email?.split("@")[0] || "Traveler");
    }
    if (trip?.ownerName) {
      return [trip.ownerName];
    }
    return [];
  }, [travelGroup, trip]);

  // Dynamic effective travelers count (reconciles declared trip travelers with active travel group members)
  const effectiveTravelersCount = useMemo(() => {
    const groupCount = travelGroup?.members && Array.isArray(travelGroup.members) ? travelGroup.members.length : 0;
    const tripCount = Number(trip?.numberOfTravelers) || 0;
    return Math.max(groupCount, tripCount, 1);
  }, [travelGroup, trip]);

  // Guaranteed sorted days (Day 1 -> Day N)
  const sortedDays = [...days].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));

  // Helper to format exact calendar date with weekday for any day number (e.g. Day 10 -> "Thu, 15 Oct 2026")
  function getDayCalendarLabel(dayNum) {
    if (!trip?.startDate) return "";
    try {
      const parts = String(trip.startDate).split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        date.setDate(date.getDate() + (dayNum - 1));
        return date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    } catch {
      return "";
    }
    return "";
  }

  // --- ITINERARY DAY ACTIONS (Task 9) ---
  function openAddDayModal(targetDayNum) {
    setModalError("");
    setEditingDay(null);

    // Determine target day number: default to first available unassigned day or targetDayNum
    const existingDayNums = new Set(days.map((d) => Number(d.dayNumber)));
    let defaultDayNum = 1;
    if (typeof targetDayNum === "number" && targetDayNum >= 1) {
      defaultDayNum = targetDayNum;
    } else {
      for (let i = 1; i <= Math.max(tripDuration, days.length + 1); i++) {
        if (!existingDayNums.has(i)) {
          defaultDayNum = i;
          break;
        }
      }
    }

    // Auto-calculate exact date matching backend validation: startDate + (dayNumber - 1)
    let calculatedDate = trip.startDate;
    if (trip.startDate) {
      const start = new Date(trip.startDate);
      start.setDate(start.getDate() + (defaultDayNum - 1));
      calculatedDate = start.toISOString().split("T")[0];
    }

    setDayForm({
      dayNumber: defaultDayNum,
      date: calculatedDate,
      title: `Day ${defaultDayNum} Exploration`,
      description: "",
    });
    setIsAddDayOpen(true);
  }

  function handleDayNumberChange(e) {
    const chosenDay = Number(e.target.value);
    let calculatedDate = trip.startDate;
    if (trip.startDate) {
      const start = new Date(trip.startDate);
      start.setDate(start.getDate() + (chosenDay - 1));
      calculatedDate = start.toISOString().split("T")[0];
    }
    setDayForm((prev) => ({
      ...prev,
      dayNumber: chosenDay,
      date: calculatedDate,
      title: prev.title.startsWith("Day ") ? `Day ${chosenDay} Exploration` : prev.title,
    }));
  }

  function openEditDayModal(day) {
    setModalError("");
    setEditingDay(day);
    setDayForm({
      dayNumber: day.dayNumber,
      date: day.date,
      title: day.title,
      description: day.description || "",
    });
    setIsAddDayOpen(true);
  }

  async function handleSaveDay(e) {
    e.preventDefault();
    setModalError("");
    setModalSubmitting(true);
    try {
      if (editingDay) {
        // Update existing day
        const updated = await itineraryService.updateDay(
          tripId,
          editingDay.id,
          dayForm
        );
        setDays((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
      } else {
        // Create new day
        const newDay = await itineraryService.addDay(tripId, dayForm);
        setDays((prev) => [...prev, newDay]);
        setDayActivities((prev) => ({ ...prev, [newDay.id]: [] }));
      }
      setIsAddDayOpen(false);
      setEditingDay(null);
    } catch (err) {
      setModalError(err.message || "Failed to save itinerary day");
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleDeleteDay(dayId) {
    if (!window.confirm("Delete this day and all its scheduled activities?"))
      return;
    try {
      await itineraryService.deleteDay(tripId, dayId);
      setDays((prev) => prev.filter((d) => d.id !== dayId));
      setDayActivities((prev) => {
        const copy = { ...prev };
        delete copy[dayId];
        return copy;
      });
    } catch (err) {
      alert("Failed to delete day: " + err.message);
    }
  }

  // --- ACTIVITY ACTIONS (Task 10) ---
  function openAddActivityModal(day) {
    setSelectedDayForActivity(day);
    setEditingActivity(null);
    setActivityForm({
      title: "",
      category: "SIGHTSEEING",
      startTime: "09:00",
      endTime: "11:00",
      location: "",
      description: "",
      bookingDetails: "",
      checklist: "",
    });
    setModalError("");
    setIsActivityModalOpen(true);
  }

  function openEditActivityModal(day, activity) {
    setSelectedDayForActivity(day);
    setEditingActivity(activity);
    setActivityForm({
      title: activity.title,
      category: activity.category || "SIGHTSEEING",
      startTime: activity.startTime ? activity.startTime.slice(0, 5) : "09:00",
      endTime: activity.endTime ? activity.endTime.slice(0, 5) : "11:00",
      location: activity.location || "",
      description: activity.description || "",
      bookingDetails: activity.bookingDetails || "",
      checklist: activity.checklist || "",
    });
    setModalError("");
    setIsActivityModalOpen(true);
  }

  async function handleSaveActivity(e) {
    e.preventDefault();
    setModalError("");

    if (!activityForm.title.trim()) {
      setModalError("Activity title is required.");
      return;
    }

    setModalSubmitting(true);
    try {
      // Backend expects HH:mm:ss for LocalTime
      const formattedStartTime = activityForm.startTime.length === 5
        ? `${activityForm.startTime}:00`
        : activityForm.startTime;
      const formattedEndTime = activityForm.endTime.length === 5
        ? `${activityForm.endTime}:00`
        : activityForm.endTime;

      const payload = {
        title: activityForm.title,
        category: activityForm.category,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        location: activityForm.location,
        description: activityForm.description,
        bookingDetails: activityForm.bookingDetails,
        checklist: activityForm.checklist,
        itineraryDayId: selectedDayForActivity.id,
      };

      if (editingActivity) {
        // Update
        const updated = await activityService.updateActivity(
          editingActivity.id,
          payload
        );
        setDayActivities((prev) => ({
          ...prev,
          [selectedDayForActivity.id]: prev[selectedDayForActivity.id].map(
            (act) => (act.id === updated.id ? updated : act)
          ),
        }));
      } else {
        // Create
        const created = await activityService.createActivity(payload);
        setDayActivities((prev) => ({
          ...prev,
          [selectedDayForActivity.id]: [
            ...(prev[selectedDayForActivity.id] || []),
            created,
          ],
        }));
      }

      setIsActivityModalOpen(false);
    } catch (err) {
      setModalError(err.message || "Failed to save activity");
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleDeleteActivity(dayId, activityId) {
    if (!window.confirm("Remove this activity?")) return;
    try {
      await activityService.deleteActivity(activityId);
      setDayActivities((prev) => ({
        ...prev,
        [dayId]: prev[dayId].filter((act) => act.id !== activityId),
      }));
    } catch (err) {
      alert("Failed to delete activity: " + err.message);
    }
  }

  // Handle Opening Activity Reminder Modal
  const handleOpenReminderModal = (day, act) => {
    const timeStr = act.startTime ? ` at ${act.startTime.slice(0, 5)}` : "";
    const calLabel = getDayCalendarLabel(day.dayNumber);
    const dateStr = calLabel ? ` (${calLabel})` : ` (${formatDisplayDate(day.date)})`;
    setReminderModal({
      isOpen: true,
      activityTitle: act.title || "Cab / Travel Activity",
      scheduledTime: `Day ${day.dayNumber}${dateStr}${timeStr}`,
      notes: act.location ? `Location: ${act.location}` : (act.description || ""),
      submitting: false,
      successMsg: "",
    });
  };

  // Handle Dispatching Reminder to Notification Bell
  const handleSendReminder = async (e) => {
    e.preventDefault();
    try {
      setReminderModal((prev) => ({ ...prev, submitting: true }));
      const title = `⏰ Reminder: ${reminderModal.activityTitle}`;
      const message = `Scheduled for ${reminderModal.scheduledTime}.${reminderModal.notes ? ` Details: ${reminderModal.notes}` : ""}`;
      await notificationService.createReminder({
        title,
        message,
        tripId: Number(tripId),
      });
      setReminderModal((prev) => ({
        ...prev,
        submitting: false,
        successMsg: "✅ Reminder sent successfully to your notification bell (🔔)!",
      }));
      setTimeout(() => {
        setReminderModal((prev) => ({ ...prev, isOpen: false, successMsg: "" }));
      }, 1500);
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to set reminder");
      setReminderModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Category Icon Helper
  const categoryIcons = {
    SIGHTSEEING: "🏛️ Sightseeing",
    TRANSPORTATION: "🚗 Transportation",
    ACCOMMODATION: "🏨 Accommodation",
    DINING: "🍽️ Dining & Food",
    ADVENTURE: "🏄‍♂️ Adventure",
    SHOPPING: "🛍️ Shopping",
    WORK: "💼 Work & Meeting",
    PERSONAL: "🧘 Personal Time",
    OTHER: "📝 Other",
  };

  // Chronological Sorting Helper (morning -> afternoon -> evening)
  function sortActivitiesByTime(activities = []) {
    return [...activities].sort((a, b) => {
      const timeA = a.startTime || "";
      const timeB = b.startTime || "";
      if (timeA && timeB) {
        return timeA.localeCompare(timeB);
      }
      if (timeA && !timeB) return -1;
      if (!timeA && timeB) return 1;
      return 0;
    });
  }

  if (loading) {
    return (
      <div className="content-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="content-page">
        <div className="message error">
          <span>⚠️ {error || "Trip not found."}</span>
        </div>
        <Link to="/trips" className="text-link">
          ← Back to Trips
        </Link>
      </div>
    );
  }

  return (
    <div className="content-page trip-details-page">
      {/* Navigation Breadcrumb */}
      <div className="trip-nav-breadcrumb">
        <Link to="/trips" className="text-link">
          ← Back to My Trips
        </Link>
      </div>

      {/* Hero Trip Banner & Header */}
      <section className="trip-hero-banner">
        <div className="trip-hero-main">
          <div className="trip-title-row">
            <span className={`status-pill ${trip.status.toLowerCase()}`}>
              {trip.status}
            </span>
            <h1>{trip.title}</h1>
          </div>

          <p className="trip-hero-destination">
            📍 <strong>{trip.destination}</strong>
          </p>

          <div className="trip-quick-stats" style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            {/* Line 1: Dates & Calculated Duration (2 Separate Oval Shapes) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <div className="stat-pill" style={{ background: "#f0fdfa", color: "#0f766e", border: "1px solid #99f6e4", fontWeight: "700" }}>
                📅 {formatDisplayDate(trip.startDate)}{trip.endDate ? ` to ${formatDisplayDate(trip.endDate)}` : ""}
              </div>
              {tripDuration && (
                <div className="stat-pill" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: "700" }}>
                  Trip - {tripDuration} {tripDuration === 1 ? "Day" : "Days"}
                </div>
              )}
            </div>

            {/* Line 2: Travelers, Organizer & Members */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>

              {trip.ownerName && (
                <div className="stat-pill" style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe", fontWeight: "700" }}>
                  👑 Organizer: {trip.ownerName}
                </div>
              )}
              
              
              <div className="stat-pill">
                👥 {effectiveTravelersCount} {effectiveTravelersCount === 1 ? "Traveler" : "Travelers"}
              </div>
              
              
              <div className="stat-pill" style={{ background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1", fontWeight: "600" }}>
                Members : {memberNames.length > 0 ? memberNames.join(", ") : (trip.ownerName || "1 Traveler")}
              </div>
            </div>

            {/* Line 3: Days Planned */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
              <div className="stat-pill" style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", fontWeight: "700" }}>
                🗓️ {days.length} {days.length === 1 ? "Day Planned" : "Days Planned"} here
              </div>
            </div>
          </div>
        </div>

        {/* Edit / Delete Trip Controls */}
        <div className="trip-hero-actions">
          <button
            className="secondary-btn"
            onClick={() => setIsEditTripOpen(true)}
          >
            ✎ Edit Trip
          </button>
          <button
            type="button"
            onClick={handleDeleteTrip}
            style={{
              padding: "10px 18px",
              fontWeight: "700",
              color: "#dc2626",
              border: "1.5px solid #f87171",
              background: "#fef2f2",
              borderRadius: "8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#dc2626";
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.borderColor = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fef2f2";
              e.currentTarget.style.color = "#dc2626";
              e.currentTarget.style.borderColor = "#f87171";
            }}
          >
            <span>🗑</span> Delete Trip
          </button>
        </div>
      </section>

      {/* Tab Navigation (2 Lines for Fast Access) */}
      <div
        className="trip-tabs-container"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "28px",
        }}
      >
        {/* Line 1: Trip Details to Expense Tracking */}
        <div
          className="trip-tabs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            paddingBottom: "2px",
            scrollbarWidth: "thin",
            marginBottom: 0,
          }}
        >
          <button
            className={`tab-btn ${activeTab === "itinerary" ? "active" : ""}`}
            onClick={() => setActiveTab("itinerary")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "itinerary" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            🗓️ Trip Details: Day-Wise ({days.length} {days.length === 1 ? "Day" : "Days"})
          </button>
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "overview" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            ℹ️ Trip Summary & Highlights
          </button>
          <button
            className={`tab-btn ${activeTab === "budget" ? "active" : ""}`}
            onClick={() => setActiveTab("budget")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "budget" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            💰 Budget & Allocation
          </button>
          <button
            className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`}
            onClick={() => setActiveTab("expenses")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "expenses" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            🧾 Expense Tracking
          </button>
        </div>

        {/* Line 2: Financial Reports and Travel Group */}
        <div
          className="trip-tabs"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            paddingBottom: "2px",
            scrollbarWidth: "thin",
            marginBottom: 0,
          }}
        >
          <button
            className={`tab-btn ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "reports" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            📊 Financial Reports
          </button>
          <button
            className={`tab-btn ${activeTab === "group" ? "active" : ""}`}
            onClick={() => setActiveTab("group")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "group" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            👥 Travel Group
          </button>
          <button
            className={`tab-btn ${activeTab === "splits" ? "active" : ""}`}
            onClick={() => setActiveTab("splits")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "splits" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            🤝 Shared Expenses & Splits
          </button>
          <button
            className={`tab-btn ${activeTab === "vault" ? "active" : ""}`}
            onClick={() => setActiveTab("vault")}
            style={{
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: activeTab === "vault" ? "rgba(15, 118, 110, 0.08)" : "transparent",
              borderRadius: "8px 8px 0 0",
            }}
          >
            📁 Document Vault & Media
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: DAY-WISE TRIP DETAILS */}
      {activeTab === "itinerary" && (
        <section className="itinerary-section">
          <div
            className="itinerary-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "28px",
              background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)",
              padding: "20px 24px",
              borderRadius: "14px",
              border: "1px solid #bbf7d0",
              borderLeft: "6px solid #16a34a",
              boxShadow: "0 2px 10px rgba(22, 163, 74, 0.06)",
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
                  marginBottom: "8px",
                }}
              >
                <span>🗓️ {days.length} {days.length === 1 ? "Day Planned" : "Days Planned"}</span>
              </div>
              <h2 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.01em" }}>
                🗓️ Trip Details: Day-Wise Plan
              </h2>
              <p style={{ margin: 0, color: "#475569", fontSize: "14px", fontWeight: "500" }}>
                Chronological schedule of daily places, excursions, activities, and bookings.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    openAddDayModal(Number(e.target.value));
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #16a34a",
                  background: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#166534",
                  cursor: "pointer",
                  outline: "none",
                }}
                title="Quick jump to plan any specific day of your trip"
              >
                <option value="" disabled>⚡ Jump to Plan Day...</option>
                {Array.from({ length: tripDuration }, (_, idx) => idx + 1).map((num) => {
                  const calLabel = getDayCalendarLabel(num);
                  const alreadyPlanned = days.some((d) => Number(d.dayNumber) === num);
                  return (
                    <option key={num} value={num}>
                      Day {num}{calLabel ? ` (${calLabel})` : ""} {alreadyPlanned ? "✓ Planned" : "+ Plan"}
                    </option>
                  );
                })}
              </select>
              <button className="primary-btn" onClick={() => openAddDayModal()}>
                + Plan a Day
              </button>
            </div>
          </div>

          {days.length === 0 ? (
            <div className="empty-itinerary-card">
              <span className="empty-icon">🗓️</span>
              <h3>No itinerary days yet</h3>
              <p>
                Start building your vacation by adding Day 1. The date will be
                automatically synced with your trip start date ({formatDisplayDate(trip.startDate)}).
              </p>
              <button className="primary-btn" onClick={() => openAddDayModal()}>
                + Add Day 1
              </button>
            </div>
          ) : (
            <div className="days-timeline">
              {sortedDays.map((day) => {
                const activities = sortActivitiesByTime(dayActivities[day.id] || []);
                return (
                  <div key={day.id} className="itinerary-day-card">
                    <div className="day-card-header">
                      <div className="day-badge-title">
                        <span className="day-number-badge">Day {day.dayNumber}</span>
                        <div>
                          <div className="day-title-row-flex">
                            <h3>{day.title}</h3>
                            <span className="day-acts-pill">
                              ⚡ {activities.length} {activities.length === 1 ? "Activity" : "Activities"}
                            </span>
                          </div>
                          <span className="day-date-label">📅 {formatDisplayDate(day.date)}</span>
                        </div>
                      </div>

                      <div className="day-header-actions">
                        <button
                          type="button"
                          className="small-btn"
                          style={{
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            color: "#065f46",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                          title="Jump to Expenses tab to log receipts"
                          onClick={() => setActiveTab("expenses")}
                        >
                          🧾 Log Expense
                        </button>
                        <button
                          className="small-btn add-act-btn"
                          onClick={() => openAddActivityModal(day)}
                        >
                          + Add Activity
                        </button>
                        <button
                          className="small-btn edit-day-btn"
                          title="Edit Day Details & Notes"
                          onClick={() => openEditDayModal(day)}
                        >
                          ✎ Edit Day
                        </button>
                        <button
                          className="icon-btn delete-day-btn"
                          title="Delete Day"
                          onClick={() => handleDeleteDay(day.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {day.description && (
                      <p className="day-description">{day.description}</p>
                    )}

                    {/* Scheduled Activities List */}
                    <div className="activities-container">
                      {activities.length === 0 ? (
                        <div className="no-activities-box">
                          <p>No activities scheduled for this day yet.</p>
                          <button
                            className="text-link"
                            onClick={() => openAddActivityModal(day)}
                          >
                            + Schedule an activity (Sightseeing, Food, etc.)
                          </button>
                        </div>
                      ) : (
                        <div className="activities-list">
                          {activities.map((act) => (
                            <div
                              key={act.id}
                              className={`activity-card ${act.category?.toLowerCase() || "other"}`}
                            >
                              <div className="activity-left">
                                <span
                                  className={`category-badge ${act.category?.toLowerCase()}`}
                                >
                                  {categoryIcons[act.category] || act.category}
                                </span>

                                <div className="activity-main-info">
                                  <h4>{act.title}</h4>
                                  {act.location && (
                                    <span className="activity-location">
                                      📍 {act.location}
                                    </span>
                                  )}
                                  {act.description && (
                                    <p className="activity-notes">
                                      {act.description}
                                    </p>
                                  )}
                                  {act.bookingDetails && (
                                    <div className="booking-info-box">
                                      🎫 <strong>Booking:</strong>{" "}
                                      {act.bookingDetails}
                                    </div>
                                  )}
                                  {act.checklist && (
                                    <div className="checklist-box">
                                      ✓ <strong>Notes / Checklist:</strong>{" "}
                                      {act.checklist}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="activity-right">
                                {act.startTime && (
                                  <div className="time-chip">
                                    ⏰ {act.startTime.slice(0, 5)}
                                    {act.endTime && ` – ${act.endTime.slice(0, 5)}`}
                                  </div>
                                )}
                                <div className="activity-actions">
                                  <button
                                    type="button"
                                    className="icon-action-btn reminder"
                                    title="Set Reminder (Send to Bell)"
                                    style={{
                                      background: "#fff7ed",
                                      color: "#ea580c",
                                      border: "1px solid #fed7aa",
                                      fontWeight: "700",
                                    }}
                                    onClick={() =>
                                      handleOpenReminderModal(day, act)
                                    }
                                  >
                                    ⏰
                                  </button>
                                  <button
                                    className="icon-action-btn"
                                    title="Edit Activity"
                                    onClick={() =>
                                      openEditActivityModal(day, act)
                                    }
                                  >
                                    ✎
                                  </button>
                                  <button
                                    className="icon-action-btn delete"
                                    title="Delete Activity"
                                    onClick={() =>
                                      handleDeleteActivity(day.id, act.id)
                                    }
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT 2: TRIP SUMMARY & HIGHLIGHTS */}
      {activeTab === "overview" && (
        <section className="trip-overview-section">
          {/* Executive Overview Banner */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "28px",
              background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
              padding: "20px 24px",
              borderRadius: "14px",
              border: "1px solid #bfdbfe",
              borderLeft: "6px solid #2563eb",
              boxShadow: "0 2px 10px rgba(37, 99, 235, 0.06)",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}
              >
                <span>✨ Highlights & Overview</span>
              </div>
              <h2 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.01em" }}>
                ℹ️ Trip Summary & Highlights
              </h2>
              <p style={{ margin: 0, color: "#475569", fontSize: "14px", fontWeight: "500" }}>
                Key trip statistics, destinations, dates, and journey notes for {trip.title}.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className={`status-pill ${trip.status.toLowerCase()}`}>
                {trip.status}
              </span>
              <button
                className="secondary-btn"
                onClick={() => setIsEditTripOpen(true)}
                style={{
                  padding: "8px 16px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ✎ Edit Trip Details
              </button>
            </div>
          </div>

          <div className="overview-card vibrant">
            <div className="overview-grid vibrant-grid">
              <div className="overview-stat-box dest-box">
                <span className="stat-icon">📍</span>
                <div>
                  <strong>Destination</strong>
                  <p>{trip.destination}</p>
                </div>
              </div>
              <div className="overview-stat-box date-box">
                <span className="stat-icon">📅</span>
                <div>
                  <strong>Travel Dates & Duration</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                    <span className="stat-pill" style={{ background: "#f0fdfa", color: "#0f766e", border: "1px solid #99f6e4", fontWeight: "700" }}>
                      📅 {formatDisplayDate(trip.startDate)}{trip.endDate ? ` to ${formatDisplayDate(trip.endDate)}` : ""}
                    </span>
                    {tripDuration && (
                      <span className="stat-pill" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontWeight: "700" }}>
                        Trip Days - {tripDuration} {tripDuration === 1 ? "Day" : "Days"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="overview-stat-box travelers-box">
                <span className="stat-icon">👥</span>
                <div>
                  <strong>Travelers & Members</strong>
                  <p>
                    {effectiveTravelersCount} {effectiveTravelersCount === 1 ? "Traveler" : "Travelers"} • Members : {memberNames.length > 0 ? memberNames.join(", ") : (trip.ownerName || "Solo Traveler")}
                  </p>
                </div>
              </div>
              <div className="overview-stat-box days-box">
                <span className="stat-icon">🗓️</span>
                <div>
                  <strong>Days Planned</strong>
                  <p>{days.length} {days.length === 1 ? "Day Planned" : "Days Planned"} here</p>
                </div>
              </div>
              <div className="overview-stat-box acts-box">
                <span className="stat-icon">🎯</span>
                <div>
                  <strong>Total Activities</strong>
                  <p>
                    {Object.values(dayActivities).reduce(
                      (acc, curr) => acc + curr.length,
                      0
                    )}{" "}
                    Scheduled
                  </p>
                </div>
              </div>
              <div className="overview-stat-box status-box">
                <span className="stat-icon">⚡</span>
                <div>
                  <strong>Trip Status</strong>
                  <p>{trip.status}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Day-Wise Trip Plan Timeline Summary */}
          <div className="daywise-itinerary-summary-card">
            <div className="timeline-header-bar">
              <div>
                <h2 className="timeline-section-title">Trip Details: Day-Wise Plan Summary</h2>
                <p className="timeline-section-sub">
                  Complete day-by-day plan with all scheduled activities
                </p>
              </div>
              <span className="timeline-badge-count">
                🗓️ {days.length} {days.length === 1 ? "Day" : "Days"} Planned
              </span>
            </div>

            {days.length === 0 ? (
              <div className="empty-timeline-note">
                <p>
                  No plan days scheduled yet. Switch to the{" "}
                  <button
                    className="text-link inline-btn"
                    onClick={() => setActiveTab("itinerary")}
                  >
                    Trip Details (Day-Wise)
                  </button>{" "}
                  tab to start building your vacation schedule!
                </p>
              </div>
            ) : (
              <div className="itinerary-timeline-list">
                {days.map((day, index) => {
                  const activities = sortActivitiesByTime(dayActivities[day.id] || []);
                  const isLast = index === days.length - 1;

                  return (
                    <div key={day.id || index} className="itinerary-timeline-node">
                      <div className="node-marker-track">
                        <span className="node-bullet" />
                        {!isLast && <span className="node-connecting-line" />}
                      </div>

                      <div className="node-body">
                        <div className="node-title-row">
                          <span className="node-day-badge">Day {day.dayNumber}</span>
                          <h3 className="node-title">{day.title}</h3>
                          <span className="node-date">
                            📅 {formatDisplayDate(day.date)}
                          </span>
                        </div>

                        {day.description && (
                          <p className="node-description">{day.description}</p>
                        )}

                        {/* RENDER ALL ACTIVITIES FOR THIS DAY */}
                        {activities.length > 0 ? (
                          <div className="timeline-activities-wrapper">
                            <span className="activities-heading-label">
                              Activities ({activities.length}):
                            </span>
                            <div className="timeline-activities-grid">
                              {activities.map((act) => (
                                <div
                                  key={act.id}
                                  className={`timeline-activity-chip ${act.category?.toLowerCase() || "other"}`}
                                >
                                  <div className="chip-top">
                                    <span className="chip-icon">
                                      {act.category === "SIGHTSEEING" ? "🏛️" :
                                       act.category === "DINING" ? "🍽️" :
                                       act.category === "TRANSPORTATION" ? "🚗" :
                                       act.category === "ACCOMMODATION" ? "🏨" :
                                       act.category === "ADVENTURE" ? "🏄‍♂️" :
                                       act.category === "SHOPPING" ? "🛍️" :
                                       act.category === "WORK" ? "💼" :
                                       act.category === "PERSONAL" ? "🧘" : "📍"}
                                    </span>
                                    <span className="chip-title">{act.title}</span>
                                    {act.startTime && (
                                      <span className="chip-time">
                                        ⏰ {act.startTime.slice(0, 5)}
                                        {act.endTime && `–${act.endTime.slice(0, 5)}`}
                                      </span>
                                    )}
                                  </div>
                                  {act.location && (
                                    <div className="chip-location">
                                      📍 {act.location}
                                    </div>
                                  )}
                                  {act.description && (
                                    <div className="chip-desc">
                                      {act.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="no-acts-hint">
                            <span>🏖️ No specific activities added yet for this day</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB CONTENT 3: BUDGET MANAGEMENT (Milestone 3 Task 7) */}
      {activeTab === "budget" && <BudgetTab tripId={tripId} />}

      {/* TAB CONTENT 4: EXPENSE TRACKING (Milestone 3 Task 8) */}
      {activeTab === "expenses" && (
        <ExpenseTab tripId={tripId} onNavigateToSplits={() => setActiveTab("splits")} />
      )}

      {/* TAB CONTENT 5: FINANCIAL REPORTS & ANALYTICS (Milestone 3 Task 9) */}
      {activeTab === "reports" && <ExpenseReportsTab tripId={tripId} />}

      {/* TAB CONTENT 6: TRAVEL GROUP COLLABORATION (Milestone 3 Task 10) */}
      {activeTab === "group" && (
        <TravelGroupTab
          tripId={tripId}
          onGroupUpdated={(updatedGroup) => {
            if (updatedGroup) setTravelGroup(updatedGroup);
          }}
        />
      )}

      {/* TAB CONTENT 7: SHARED EXPENSES & SPLITS (Milestone 3 Task 11) */}
      {activeTab === "splits" && <SharedExpensesTab tripId={tripId} trip={trip} />}

      {/* TAB CONTENT 8: DOCUMENT VAULT & MEDIA (Milestone 3 Task 12) */}
      {activeTab === "vault" && <DocumentVaultTab tripId={tripId} trip={trip} />}

      {/* --- MODAL 1: EDIT TRIP MODAL --- */}
      {isEditTripOpen && (
        <div className="modal-overlay" onClick={() => setIsEditTripOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Edit Trip Details</h2>
              <button
                className="close-modal-btn"
                onClick={() => setIsEditTripOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalError && <div className="message error">{modalError}</div>}

            <form onSubmit={handleUpdateTrip} className="trip-form">
              <label>
                Trip Title *
                <input
                  type="text"
                  value={tripForm.title}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, title: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Destination *
                <input
                  type="text"
                  value={tripForm.destination}
                  onChange={(e) =>
                    setTripForm({ ...tripForm, destination: e.target.value })
                  }
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Start Date *
                  <input
                    type="date"
                    value={tripForm.startDate}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, startDate: e.target.value })
                    }
                    required
                  />
                </label>

                <label>
                  End Date *
                  <input
                    type="date"
                    value={tripForm.endDate}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, endDate: e.target.value })
                    }
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Travelers
                  <input
                    type="number"
                    min="1"
                    value={tripForm.numberOfTravelers}
                    onChange={(e) =>
                      setTripForm({
                        ...tripForm,
                        numberOfTravelers: Number(e.target.value),
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Status
                  <select
                    value={tripForm.status}
                    onChange={(e) =>
                      setTripForm({ ...tripForm, status: e.target.value })
                    }
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
                  onClick={() => setIsEditTripOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? "Saving..." : "Update Trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD ITINERARY DAY MODAL --- */}
      {isAddDayOpen && (
        <div className="modal-overlay" onClick={() => setIsAddDayOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingDay ? `Edit Day ${editingDay.dayNumber}` : "Add Itinerary Day"}</h2>
              <button
                className="close-modal-btn"
                onClick={() => setIsAddDayOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalError && <div className="message error">{modalError}</div>}

            <form onSubmit={handleSaveDay} className="trip-form">
              <div className="form-row">
                <label>
                  Day Number *
                  {editingDay ? (
                    <input
                      type="number"
                      min="1"
                      value={dayForm.dayNumber}
                      readOnly
                      className="readonly-input"
                    />
                  ) : (
                    <select
                      value={dayForm.dayNumber}
                      onChange={handleDayNumberChange}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1.5px solid #059669",
                        fontSize: "14px",
                        background: "#ffffff",
                        fontWeight: "700",
                        color: "#0f172a",
                      }}
                    >
                      {Array.from({ length: tripDuration }, (_, idx) => idx + 1).map((num) => {
                        const calLabel = getDayCalendarLabel(num);
                        const alreadyPlanned = days.some((d) => Number(d.dayNumber) === num);
                        return (
                          <option key={num} value={num}>
                            Day {num} — {calLabel} {alreadyPlanned ? "⚠️ (Already Planned)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </label>

                <label>
                  Date *
                  <input
                    type="date"
                    value={dayForm.date}
                    readOnly
                    className="readonly-input"
                    title="Automatically aligned with trip schedule"
                  />
                </label>
              </div>

              <label>
                Day Title / Focus *
                <input
                  type="text"
                  placeholder="e.g., Beach Exploration & Sunset Walk"
                  value={dayForm.title}
                  onChange={(e) =>
                    setDayForm({ ...dayForm, title: e.target.value })
                  }
                  required
                />
              </label>

              <label>
                Description & Notes
                <textarea
                  placeholder="Key notes, reminders, or general plan for this day..."
                  rows="3"
                  value={dayForm.description}
                  onChange={(e) =>
                    setDayForm({ ...dayForm, description: e.target.value })
                  }
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setIsAddDayOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting
                    ? "Saving..."
                    : editingDay
                    ? "Save Changes"
                    : "Add to Itinerary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD / EDIT ACTIVITY MODAL --- */}
      {isActivityModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsActivityModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingActivity ? "Edit Activity" : "Schedule New Activity"}
              </h2>
              <button
                className="close-modal-btn"
                onClick={() => setIsActivityModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalError && <div className="message error">{modalError}</div>}

            <form onSubmit={handleSaveActivity} className="trip-form">
              <label>
                Activity Title *
                <input
                  type="text"
                  placeholder="e.g., Visit Fort Aguada, Lunch at Cafe, Scuba Diving"
                  value={activityForm.title}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, title: e.target.value })
                  }
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  Category
                  <select
                    value={activityForm.category}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="SIGHTSEEING">🏛️ Sightseeing</option>
                    <option value="DINING">🍽️ Dining & Food</option>
                    <option value="TRANSPORTATION">🚗 Transportation</option>
                    <option value="ACCOMMODATION">🏨 Accommodation</option>
                    <option value="ADVENTURE">🏄‍♂️ Adventure</option>
                    <option value="SHOPPING">🛍️ Shopping</option>
                    <option value="WORK">💼 Work & Meeting</option>
                    <option value="PERSONAL">🧘 Personal Time</option>
                    <option value="OTHER">📝 Other</option>
                  </select>
                </label>

                <label>
                  Location / Address
                  <input
                    type="text"
                    placeholder="e.g., Old Goa, Candolim Beach"
                    value={activityForm.location}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        location: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Start Time
                  <input
                    type="time"
                    value={activityForm.startTime}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        startTime: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  End Time
                  <input
                    type="time"
                    value={activityForm.endTime}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        endTime: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label>
                Description & Notes
                <textarea
                  placeholder="Brief details about what to do, what to expect..."
                  rows="2"
                  value={activityForm.description}
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      description: e.target.value,
                    })
                  }
                />
              </label>

              <div className="form-row">
                <label>
                  Booking / Ticket Details
                  <input
                    type="text"
                    placeholder="e.g., Ticket #AB123, table reserved at 7:30"
                    value={activityForm.bookingDetails}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        bookingDetails: e.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Checklist / What to bring
                  <input
                    type="text"
                    placeholder="e.g., Camera, Sunscreen, ID proof"
                    value={activityForm.checklist}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        checklist: e.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setIsActivityModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting
                    ? "Saving..."
                    : editingActivity
                    ? "Save Changes"
                    : "Schedule Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVITY REMINDER MODAL */}
      {reminderModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => !reminderModal.submitting && setReminderModal((prev) => ({ ...prev, isOpen: false }))}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
              margin: "auto",
            }}
          >
            <div className="modal-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: "8px", color: "var(--navy)", fontSize: "20px", fontWeight: "800" }}>
                  <span>⏰</span> Set Activity Reminder
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
                  Send an alert directly to your notification bell (🔔) for this scheduled activity.
                </p>
              </div>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setReminderModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={reminderModal.submitting}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: "14px",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {reminderModal.successMsg ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  background: "#f0fdf4",
                  borderRadius: "12px",
                  border: "1px solid #bbf7d0",
                  margin: "16px 0",
                }}
              >
                <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>🔔</span>
                <p style={{ margin: 0, fontWeight: "800", color: "#166534", fontSize: "14px" }}>
                  {reminderModal.successMsg}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#15803d" }}>
                  Check the top navigation bar to see your new reminder!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReminder} className="trip-form">
                <label>
                  Activity / Booking
                  <input
                    type="text"
                    value={reminderModal.activityTitle}
                    onChange={(e) =>
                      setReminderModal((prev) => ({
                        ...prev,
                        activityTitle: e.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Scheduled Timing
                  <input
                    type="text"
                    value={reminderModal.scheduledTime}
                    readOnly
                    className="readonly-input"
                  />
                </label>

                <label>
                  Reminder Notes / Details
                  <textarea
                    rows="2"
                    placeholder="e.g., Cab arriving at hotel porch, have luggage and vouchers ready..."
                    value={reminderModal.notes}
                    onChange={(e) =>
                      setReminderModal((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                  />
                </label>

                <div className="modal-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setReminderModal((prev) => ({ ...prev, isOpen: false }))}
                    disabled={reminderModal.submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={reminderModal.submitting}
                    style={{
                      background: "#ea580c",
                      borderColor: "#c2410c",
                      color: "#ffffff",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 20px",
                      fontWeight: "700",
                    }}
                  >
                    {reminderModal.submitting ? "Sending Alert..." : "🔔 Send Reminder to Bell"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TripDetails;
