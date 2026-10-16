import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import notificationService from "../services/notificationService";

/**
 * Visual styling, category mapping, and icons for notifications.
 */
const TYPE_META = {
  TRIP_INVITE: { icon: "👥", label: "Trip Invitation", color: "#4f46e5", bg: "#eef2ff" },
  GROUP_JOIN_REQUEST: { icon: "🙋", label: "Squad Join Request", color: "#7c3aed", bg: "#f5f3ff" },
  INVITATION_ACCEPTED: { icon: "✅", label: "Invitation Accepted", color: "#059669", bg: "#ecfdf5" },
  INVITATION_DECLINED: { icon: "❌", label: "Invitation Declined", color: "#dc2626", bg: "#fef2f2" },
  JOIN_REQUEST_APPROVED: { icon: "🎉", label: "Request Approved", color: "#059669", bg: "#ecfdf5" },
  JOIN_REQUEST_REJECTED: { icon: "🚫", label: "Request Rejected", color: "#dc2626", bg: "#fef2f2" },
  BUDGET_ALERT: { icon: "🚨", label: "Budget Alert", color: "#d97706", bg: "#fffbeb" },
  EXPENSE_SPLIT: { icon: "🧾", label: "Shared Expense Split", color: "#0284c7", bg: "#f0f9ff" },
  DOCUMENT_UPLOAD: { icon: "📁", label: "Document Vault", color: "#0d9488", bg: "#f0fdfa" },
  ACTIVITY_REMINDER: { icon: "⏰", label: "Activity Reminder", color: "#ea580c", bg: "#fff7ed" },
  DEFAULT: { icon: "🔔", label: "Notification", color: "#475569", bg: "#f1f5f9" },
};

/**
 * Classifies a notification into one of the 4 dedicated category headings.
 */
function categorizeNotification(notif) {
  const type = (notif.type || "").toUpperCase();
  const targetType = (notif.targetType || "").toUpperCase();
  const title = (notif.title || "").toLowerCase();
  const msg = (notif.message || "").toLowerCase();

  // 1. Reminders
  if (
    type === "ACTIVITY_REMINDER" ||
    type.includes("REMIND") ||
    title.includes("reminder") ||
    msg.includes("reminder") ||
    msg.includes("pickup") ||
    msg.includes("cab")
  ) {
    return "REMINDERS";
  }

  // 2. Expenses & Debts
  if (
    type === "EXPENSE_SPLIT" ||
    type.includes("EXPENSE") ||
    type.includes("SPLIT") ||
    targetType === "EXPENSE" ||
    title.includes("expense") ||
    title.includes("split") ||
    title.includes("settle") ||
    title.includes("debt") ||
    msg.includes("split") ||
    msg.includes("settled")
  ) {
    return "EXPENSES";
  }

  // 3. Vault & Budget
  if (
    type === "DOCUMENT_UPLOAD" ||
    type === "BUDGET_ALERT" ||
    type.includes("BUDGET") ||
    targetType === "DOCUMENT" ||
    targetType === "BUDGET" ||
    title.includes("document") ||
    title.includes("vault") ||
    title.includes("budget") ||
    msg.includes("budget") ||
    msg.includes("uploaded a file")
  ) {
    return "VAULT_BUDGET";
  }

  // 4. Trips & Squads (Invitations, join requests, approvals, etc.)
  return "TRIPS";
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 8;

  // Load all notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(false);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Mark a single notification as read
  const handleMarkAsRead = async (notif, e) => {
    if (e) e.stopPropagation();
    if (notif.isRead) return;
    try {
      await notificationService.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (markingAll) return;
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Deep link navigation
  const handleNavigateToTarget = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Continue navigation
      }
    }

    if (
      notif.targetType === "GROUP_INVITATION" ||
      notif.type === "TRIP_INVITE" ||
      (notif.title && notif.title.toLowerCase().includes("invit"))
    ) {
      navigate("/trips");
    } else if (notif.targetUrl && notif.targetUrl !== "/dashboard") {
      navigate(notif.targetUrl);
    } else if (notif.targetType === "DOCUMENT" && notif.targetId) {
      navigate(`/trips/${notif.targetId}?tab=vault`);
    } else if (notif.targetType === "EXPENSE" && notif.targetId) {
      navigate(`/trips/${notif.targetId}?tab=expenses`);
    } else if (notif.targetType === "BUDGET" && notif.targetId) {
      navigate(`/trips/${notif.targetId}?tab=budget`);
    } else if (notif.targetType === "GROUP" && notif.targetId) {
      navigate(`/trips/${notif.targetId}?tab=group`);
    } else if (notif.targetType === "TRIP" && notif.targetId) {
      navigate(`/trips/${notif.targetId}`);
    } else {
      navigate("/trips");
    }
  };

  // Compute category statistics for the 5 tabs
  const categoryStats = useMemo(() => {
    const stats = {
      ALL: { total: notifications.length, unread: 0 },
      TRIPS: { total: 0, unread: 0 },
      REMINDERS: { total: 0, unread: 0 },
      EXPENSES: { total: 0, unread: 0 },
      VAULT_BUDGET: { total: 0, unread: 0 },
    };

    notifications.forEach((n) => {
      const isUnread = !n.isRead;
      if (isUnread) stats.ALL.unread += 1;

      const cat = categorizeNotification(n);
      if (stats[cat]) {
        stats[cat].total += 1;
        if (isUnread) stats[cat].unread += 1;
      }
    });

    return stats;
  }, [notifications]);

  // Filtered notifications based on active category tab, unread toggle, and search query
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Category Tab Filter
      if (activeTab !== "ALL") {
        const cat = categorizeNotification(n);
        if (cat !== activeTab) return false;
      }

      // 2. Unread filter
      if (filterUnreadOnly && n.isRead) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (n.title || "").toLowerCase().includes(q);
        const msgMatch = (n.message || "").toLowerCase().includes(q);
        const tripMatch = (n.tripTitle || "").toLowerCase().includes(q);
        if (!titleMatch && !msgMatch && !tripMatch) return false;
      }

      return true;
    });
  }, [notifications, activeTab, filterUnreadOnly, searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, filterUnreadOnly, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE));
  const displayedNotifications = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredNotifications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotifications, page]);

  // Helper for action button label
  const getActionLabel = (notif) => {
    const type = (notif.type || "").toUpperCase();
    const targetType = (notif.targetType || "").toUpperCase();
    if (type === "ACTIVITY_REMINDER") return "View Day Schedule ➔";
    if (type === "DOCUMENT_UPLOAD" || targetType === "DOCUMENT") return "Open Vault ➔";
    if (type === "EXPENSE_SPLIT" || targetType === "EXPENSE") return "Check Expense Ledger ➔";
    if (type === "BUDGET_ALERT" || targetType === "BUDGET") return "Check Budget ➔";
    if (type.includes("INVIT") || targetType === "GROUP_INVITATION") return "Review Invitations ➔";
    return "View Details ➔";
  };

  return (
    <div className="content-page" style={{ padding: "30px 20px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* --------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & BREADCRUMB                                            */}
      {/* --------------------------------------------------------------------- */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
          <Link to="/dashboard" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: "600" }}>
            Dashboard
          </Link>
          <span>/</span>
          <span style={{ fontWeight: "600", color: "#1e293b" }}>Notification Center</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: "28px", color: "var(--navy, #0f172a)", fontWeight: "800", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>🔔</span>
              <span>All Notifications</span>
              {categoryStats.ALL.unread > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "800",
                    padding: "2px 10px",
                    borderRadius: "20px",
                  }}
                >
                  {categoryStats.ALL.unread} New
                </span>
              )}
            </h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              Real-time activity logs: Monitor trip invitations, scheduled cab/activity reminders, split expenses, and document vault updates.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll || categoryStats.ALL.unread === 0}
              style={{
                background: categoryStats.ALL.unread === 0 ? "#f1f5f9" : "#059669",
                color: categoryStats.ALL.unread === 0 ? "#94a3b8" : "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: categoryStats.ALL.unread === 0 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: categoryStats.ALL.unread === 0 ? "none" : "0 2px 6px rgba(5, 150, 105, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              <span>✅</span>
              <span>{markingAll ? "Marking..." : "Mark All as Read"}</span>
            </button>

            <button
              onClick={loadNotifications}
              title="Refresh notifications"
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "13px",
                fontWeight: "700",
                color: "#475569",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. CATEGORY TABS (4-5 HEADINGS)                                       */}
      {/* --------------------------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "20px",
          overflowX: "auto",
          paddingBottom: "2px",
        }}
      >
        {[
          { key: "ALL", label: "All Notifications", icon: "🔔" },
          { key: "TRIPS", label: "Trips & Squads", icon: "👥" },
          { key: "REMINDERS", label: "Reminders", icon: "⏰" },
          { key: "EXPENSES", label: "Expenses & Debts", icon: "🧾" },
          { key: "VAULT_BUDGET", label: "Vault & Budget", icon: "🚨" },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          const stat = categoryStats[tab.key] || { total: 0, unread: 0 };
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: isSelected ? "#ffffff" : "transparent",
                border: "none",
                borderBottom: isSelected ? "3px solid #3b82f6" : "3px solid transparent",
                padding: "10px 16px",
                color: isSelected ? "#1d4ed8" : "#64748b",
                fontWeight: isSelected ? "800" : "600",
                fontSize: "14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                marginBottom: "-2px",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span
                style={{
                  background: isSelected ? "#dbeafe" : "#f1f5f9",
                  color: isSelected ? "#1e40af" : "#64748b",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "700",
                }}
              >
                {stat.total}
              </span>
              {stat.unread > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                    fontWeight: "800",
                  }}
                  title={`${stat.unread} unread in ${tab.label}`}
                >
                  {stat.unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. FILTER CONTROLS & SEARCH BAR                                       */}
      {/* --------------------------------------------------------------------- */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "14px 18px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            placeholder="🔍 Search notifications by title, trip, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: "700",
              color: "#334155",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={filterUnreadOnly}
              onChange={(e) => setFilterUnreadOnly(e.target.checked)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
            <span>Show Unread Only</span>
          </label>

          <span style={{ color: "#cbd5e1" }}>|</span>

          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
            Showing <strong>{filteredNotifications.length}</strong> alerts
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. NOTIFICATIONS FEED LIST                                            */}
      {/* --------------------------------------------------------------------- */}
      {loading ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>⏳</div>
          <p style={{ margin: 0, fontWeight: "600" }}>Loading notification feed...</p>
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "14px",
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>
            {activeTab === "REMINDERS"
              ? "⏰"
              : activeTab === "EXPENSES"
              ? "🧾"
              : activeTab === "VAULT_BUDGET"
              ? "📁"
              : "🎉"}
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: "17px", color: "#1e293b", fontWeight: "800" }}>
            {filterUnreadOnly
              ? "No unread notifications in this category"
              : activeTab === "REMINDERS"
              ? "No scheduled reminders found"
              : activeTab === "EXPENSES"
              ? "No shared expense alerts"
              : activeTab === "VAULT_BUDGET"
              ? "No document or budget alerts"
              : "No notifications to display"}
          </h3>
          <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "13px", maxWidth: "460px", marginInline: "auto" }}>
            {activeTab === "REMINDERS"
              ? "When you set early morning cab alerts or activity alarms inside any trip's Itinerary tab, they will appear right here."
              : activeTab === "EXPENSES"
              ? "When travel companions add shared bills or settle debts, activity will be recorded here."
              : "All alerts and notifications from your travel companions and system intelligence will be listed here."}
          </p>
          {filterUnreadOnly && (
            <button
              onClick={() => setFilterUnreadOnly(false)}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "700",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Show All (Including Read)
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {displayedNotifications.map((notif) => {
            const meta = TYPE_META[notif.type] || TYPE_META.DEFAULT;
            return (
              <div
                key={notif.id}
                onClick={() => handleNavigateToTarget(notif)}
                style={{
                  background: notif.isRead ? "#ffffff" : "#f8fafc",
                  border: notif.isRead ? "1px solid #e2e8f0" : "1px solid #93c5fd",
                  borderLeft: notif.isRead ? "4px solid #cbd5e1" : "4px solid #3b82f6",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: notif.isRead ? "0 1px 3px rgba(0,0,0,0.02)" : "0 4px 12px rgba(59, 130, 246, 0.08)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.borderColor = "#94a3b8";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = notif.isRead ? "#e2e8f0" : "#93c5fd";
                }}
              >
                {/* Category Icon Badge */}
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: meta.bg,
                    color: meta.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  {meta.icon}
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                    <span
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "800",
                        textTransform: "uppercase",
                      }}
                    >
                      {meta.label}
                    </span>

                    {notif.tripTitle && (
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                        }}
                      >
                        ✈️ {notif.tripTitle}
                      </span>
                    )}

                    <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "auto" }}>
                      {notif.timeAgo || notif.createdAt ? new Date(notif.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Recently"}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: "0 0 4px",
                      fontSize: "15px",
                      color: notif.isRead ? "#1e293b" : "#0f172a",
                      fontWeight: notif.isRead ? "700" : "800",
                    }}
                  >
                    {notif.title}
                  </h3>

                  <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#475569", lineHeight: "1.5" }}>
                    {notif.message}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToTarget(notif);
                      }}
                      style={{
                        background: "#3b82f6",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{getActionLabel(notif)}</span>
                    </button>

                    {!notif.isRead ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif, e)}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#059669",
                          cursor: "pointer",
                        }}
                      >
                        ✓ Mark as Read
                      </button>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>
                        ✓ Read
                      </span>
                    )}
                  </div>
                </div>

                {/* Unread Indicator Badge */}
                {!notif.isRead && (
                  <div
                    title="Unread notification"
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "5px",
                      background: "#3b82f6",
                      flexShrink: 0,
                      marginTop: "4px",
                    }}
                  ></div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 5. PAGINATION CONTROLS                                                 */}
      {/* --------------------------------------------------------------------- */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: page <= 1 ? "#f1f5f9" : "#ffffff",
              color: page <= 1 ? "#94a3b8" : "#1e293b",
              fontWeight: "700",
              fontSize: "13px",
              cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            &lt;&lt; Prev ({ITEMS_PER_PAGE})
          </button>

          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
            Page {page} of {totalPages} &bull; Showing {displayedNotifications.length} of {filteredNotifications.length}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: page >= totalPages ? "#f1f5f9" : "#ffffff",
              color: page >= totalPages ? "#94a3b8" : "#1e293b",
              fontWeight: "700",
              fontSize: "13px",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
            }}
          >
            ({ITEMS_PER_PAGE}) Next &gt;&gt;
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;
