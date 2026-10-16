import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import notificationService from "../services/notificationService";

/**
 * Visual styling and icons for each notification classification type.
 */
const TYPE_META = {
  TRIP_INVITE: { icon: "👥", color: "#6366f1", bg: "#eef2ff" },
  GROUP_JOIN_REQUEST: { icon: "🙋", color: "#8b5cf6", bg: "#f5f3ff" },
  INVITATION_ACCEPTED: { icon: "✅", color: "#10b981", bg: "#ecfdf5" },
  INVITATION_DECLINED: { icon: "❌", color: "#ef4444", bg: "#fef2f2" },
  JOIN_REQUEST_APPROVED: { icon: "🎉", color: "#059669", bg: "#ecfdf5" },
  JOIN_REQUEST_REJECTED: { icon: "🚫", color: "#dc2626", bg: "#fef2f2" },
  BUDGET_ALERT: { icon: "🚨", color: "#f59e0b", bg: "#fffbeb" },
  EXPENSE_SPLIT: { icon: "🧾", color: "#0ea5e9", bg: "#f0f9ff" },
  DOCUMENT_UPLOAD: { icon: "📁", color: "#14b8a6", bg: "#f0fdfa" },
  ACTIVITY_REMINDER: { icon: "⏰", color: "#f97316", bg: "#fff7ed" },
  DEFAULT: { icon: "🔔", color: "#64748b", bg: "#f1f5f9" },
};

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  /**
   * Fetch unread counter for the navbar badge.
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(typeof count === "number" ? count : 0);
    } catch {
      // Quiet fail if network / unauthenticated
    }
  }, []);

  /**
   * Fetch full notification list for the open dropdown.
   */
  const fetchFeed = useCallback(async (unreadOnly = false) => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications(unreadOnly);
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count on mount and every 30 seconds
  useEffect(() => {
    let isMounted = true;
    notificationService.getUnreadCount()
      .then((count) => {
        if (isMounted) setUnreadCount(typeof count === "number" ? count : 0);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshUnreadCount]);



  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  /**
   * Toggle dropdown visibility and fetch feed when opened.
   */
  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      fetchFeed(filterUnreadOnly);
    }
  };

  /**
   * Switch between All and Unread filter tabs.
   */
  const handleFilterToggle = (unreadOnly) => {
    setFilterUnreadOnly(unreadOnly);
    fetchFeed(unreadOnly);
  };

  /**
   * Click notification item: mark as read and redirect if URL exists.
   */
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === notif.id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Continue navigation even if markAsRead has non-critical error
      }
    }

    setIsOpen(false);

    // Deep link routing (invitations route to /trips where Received Invitations banner is located)
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

  /**
   * Mark all notifications as read.
   */
  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    try {
      setMarkingAll(true);
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignored
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* ========================================================================= */}
      {/* BELL ICON BUTTON                                                          */}
      {/* ========================================================================= */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="View Notifications"
        title="View Notifications"
        style={{
          position: "relative",
          background: isOpen ? "#f1f5f9" : "transparent",
          border: "none",
          borderRadius: "10px",
          padding: "8px 10px",
          cursor: "pointer",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s ease",
        }}
      >
        <span>🔔</span>

        {/* Unread Badge Counter */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "3px",
              right: "3px",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "800",
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px #ffffff",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ========================================================================= */}
      {/* DROPDOWN POPUP DRAWER                                                     */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            maxWidth: "92vw",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.15), 0 4px 12px rgba(0,0,0,0.06)",
            zIndex: 9999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #f1f5f9",
              background: "#fafafa",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                🔔 Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    fontSize: "11px",
                    fontWeight: "800",
                    padding: "1px 6px",
                    borderRadius: "10px",
                  }}
                >
                  {unreadCount} {unreadCount <= 1 ? "unread" : "unread"}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#059669",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: markingAll ? "not-allowed" : "pointer",
                  padding: "4px 6px",
                  borderRadius: "6px",
                }}
              >
                {markingAll ? "Marking..." : "✓ Mark all read"}
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: "flex",
              padding: "6px 12px",
              background: "#ffffff",
              borderBottom: "1px solid #f1f5f9",
              gap: "6px",
            }}
          >
            <button
              type="button"
              onClick={() => handleFilterToggle(false)}
              style={{
                flex: 1,
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: !filterUnreadOnly ? "#f1f5f9" : "transparent",
                color: !filterUnreadOnly ? "#0f172a" : "#64748b",
                fontWeight: !filterUnreadOnly ? "800" : "600",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => handleFilterToggle(true)}
              style={{
                flex: 1,
                padding: "4px 8px",
                borderRadius: "6px",
                border: "none",
                background: filterUnreadOnly ? "#f1f5f9" : "transparent",
                color: filterUnreadOnly ? "#0f172a" : "#64748b",
                fontWeight: filterUnreadOnly ? "800" : "600",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Unread
            </button>
          </div>

          {/* Notification List Body */}
          <div
            style={{
              maxHeight: "380px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                <span className="spinner" style={{ margin: "0 auto 8px", width: "16px", height: "16px" }}></span>
                Loading alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "#64748b" }}>
                <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🎉</span>
                <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                  {filterUnreadOnly ? "No unread notifications" : "All caught up!"}
                </p>
                <span style={{ fontSize: "12px" }}>
                  {filterUnreadOnly
                    ? "You have no unread trip alerts."
                    : "No new activity or alerts for your trips right now."}
                </span>
              </div>
            ) : (
              notifications.map((notif) => {
                const typeMeta = TYPE_META[notif.type] || TYPE_META.DEFAULT;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid #f8fafc",
                      background: notif.isRead ? "#ffffff" : "#f0fdf4",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      cursor: "pointer",
                      transition: "background 0.1s ease",
                    }}
                  >
                    {/* Icon Badge */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        background: typeMeta.bg,
                        color: typeMeta.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {typeMeta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: notif.isRead ? "600" : "800",
                          color: "#0f172a",
                          marginBottom: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#475569",
                          lineHeight: "1.4",
                          marginBottom: "4px",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {notif.message}
                      </div>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {notif.timeAgo || "Recently"}
                      </span>
                    </div>

                    {/* Unread Indicator Dot */}
                    {!notif.isRead && (
                      <div
                        title="Unread"
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "4px",
                          background: "#059669",
                          flexShrink: 0,
                          marginTop: "6px",
                        }}
                      ></div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ========================================================================= */}
          {/* DROPDOWN FOOTER: ALL NOTIFICATIONS PAGE BUTTON                            */}
          {/* ========================================================================= */}
          <div
            style={{
              padding: "10px 14px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              style={{
                width: "100%",
                padding: "8px 14px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#1e293b",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.borderColor = "#94a3b8";
                e.currentTarget.style.color = "#0f172a";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#cbd5e1";
                e.currentTarget.style.color = "#1e293b";
              }}
            >
              <span>📋</span>
              <span>All Notifications Page</span>
              <span style={{ fontSize: "14px", marginLeft: "2px" }}>➔</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
