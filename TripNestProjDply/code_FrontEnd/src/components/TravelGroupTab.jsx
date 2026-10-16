import { useState, useEffect } from "react";
import groupService from "../services/groupService";
import { useAuth } from "../context/useAuth";
import { formatDisplayDate } from "../utils/dateUtils";

/**
 * TravelGroupTab Component (Milestone 3 Task 10)
 * Group Collaboration, Roster Management & Join Code Sharing UI.
 */
export default function TravelGroupTab({ tripId, onGroupUpdated }) {
  const { user } = useAuth();

  // Core Group State
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Modal States
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Form States
  const [createSquadName, setCreateSquadName] = useState("");
  const [editSquadName, setEditSquadName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("GROUP_MEMBER");

  // Invitations & Join Requests State (Double-Consent Flow)
  const [invitations, setInvitations] = useState([]);

  // Themed In-Page Confirmation Dialog (Replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    confirmColor: "#dc2626",
    onConfirm: null,
  });

  useEffect(() => {
    fetchGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    if (group && onGroupUpdated) {
      onGroupUpdated(group);
    }
  }, [group, onGroupUpdated]);

  async function fetchInvitations(tId = tripId) {
    if (!tId) return;
    try {
      const data = await groupService.getGroupInvitations(tId);
      setInvitations(data || []);
    } catch {
      setInvitations([]);
    }
  }

  async function fetchGroup() {
    setLoading(true);
    setError("");
    try {
      const data = await groupService.getGroupByTripId(tripId);
      setGroup(data);
      if (data?.name) {
        setEditSquadName(data.name);
      }
      // Load pending join requests and outgoing invitations for admins
      fetchInvitations(tripId);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "";
      const status = err.response?.status;
      // If group is not created yet (404, 400, 500 or uninitialized text), set null so create squad prompt renders
      if (
        status === 404 ||
        status === 400 ||
        msg.includes("No travel group") ||
        msg.includes("not found") ||
        msg.includes("not been initialized") ||
        msg.includes("500")
      ) {
        setGroup(null);
      } else {
        setError(msg || "Failed to load travel group details.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-dismiss success alert after 4 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Copy 6-character squad join code with 1-click clipboard API
  async function handleCopyJoinCode() {
    if (!group?.joinCode) return;
    try {
      await navigator.clipboard.writeText(group.joinCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = group.joinCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  }

  // Initialize a new travel group for the trip
  async function handleCreateSquad(e) {
    e.preventDefault();
    if (!createSquadName.trim()) return;
    setModalSubmitting(true);
    setError("");
    try {
      const newGroup = await groupService.createGroup(tripId, {
        name: createSquadName.trim(),
      });
      setGroup(newGroup);
      setEditSquadName(newGroup.name);
      setCreateSquadName("");
      setSuccess("🎉 Travel group created successfully! Share the join code with your friends.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to create travel group.");
    } finally {
      setModalSubmitting(false);
    }
  }

  // Update group name
  async function handleUpdateSquadName(e) {
    e.preventDefault();
    if (!editSquadName.trim()) return;
    setModalSubmitting(true);
    setError("");
    try {
      const updated = await groupService.updateGroupName(tripId, {
        name: editSquadName.trim(),
      });
      setGroup(updated);
      setIsEditNameOpen(false);
      setSuccess("✨ Travel group name updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update group name.");
    } finally {
      setModalSubmitting(false);
    }
  }

  // Add / Invite member directly by email (Double-consent flow)
  async function handleInviteCompanion(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setModalSubmitting(true);
    setError("");
    try {
      await groupService.sendInvitation(tripId, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("GROUP_MEMBER");
      setSuccess(`📩 Invitation sent! Your companion will be added once they accept.`);
      fetchInvitations(tripId);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send invitation.");
    } finally {
      setModalSubmitting(false);
    }
  }

  // Admin approves traveler's join request to enter the squad
  async function handleApproveJoinRequest(invitationId, requesterName) {
    setActionLoadingId(invitationId);
    setError("");
    try {
      const updatedGroup = await groupService.approveJoinRequest(tripId, invitationId);
      setGroup(updatedGroup);
      setSuccess(`🎉 Approved ${requesterName} to join the travel squad!`);
      fetchInvitations(tripId);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to approve join request.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Admin rejects traveler's join request (In-Page Confirmation Dialog)
  function handleRejectJoinRequest(invitationId, requesterName) {
    setConfirmModal({
      isOpen: true,
      title: "Decline Join Request",
      message: `Are you sure you want to decline the join request from ${requesterName}? They will not be enrolled into the travel squad.`,
      confirmLabel: "Yes, Decline",
      cancelLabel: "Keep Request",
      confirmColor: "#dc2626",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActionLoadingId(invitationId);
        setError("");
        try {
          await groupService.rejectJoinRequest(tripId, invitationId);
          setSuccess(`Declined join request from ${requesterName}.`);
          fetchInvitations(tripId);
        } catch (err) {
          setError(err.response?.data?.message || err.message || "Failed to reject join request.");
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  }

  // Admin cancels an outgoing pending invitation (In-Page Confirmation Dialog)
  function handleCancelInvitation(invitationId, inviteeEmail) {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Group Invitation",
      message: `Are you sure you want to cancel the pending squad invitation sent to ${inviteeEmail}?`,
      confirmLabel: "Yes, Cancel Invitation",
      cancelLabel: "Keep Invitation",
      confirmColor: "#dc2626",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActionLoadingId(invitationId);
        setError("");
        try {
          await groupService.cancelInvitation(tripId, invitationId);
          setSuccess(`Cancelled invitation to ${inviteeEmail}.`);
          fetchInvitations(tripId);
        } catch (err) {
          setError(err.response?.data?.message || err.message || "Failed to cancel invitation.");
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  }

  // Promote or demote member role
  async function handleRoleChange(userId, newRole) {
    setActionLoadingId(userId);
    setError("");
    try {
      const updatedMember = await groupService.updateMemberRole(tripId, userId, newRole);
      setGroup((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.userId === userId ? { ...m, role: updatedMember.role } : m
        ),
      }));
      setSuccess(`Role updated to ${newRole === "GROUP_ADMIN" ? "Admin 🛡️" : "Member 👤"}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update member role.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Remove member or leave group (In-Page Confirmation Dialog)
  function handleRemoveCompanion(userId, memberName) {
    const isSelf = user?.email && group?.members?.find((m) => m.userId === userId)?.email?.toLowerCase() === user.email.toLowerCase();
    setConfirmModal({
      isOpen: true,
      title: isSelf ? "Leave Travel Squad?" : "Remove Companion?",
      message: isSelf
        ? "Are you sure you want to leave this travel squad? You will lose access to the shared group itinerary, expense settlements, and companion roster."
        : `Are you sure you want to remove ${memberName} from this travel group?`,
      confirmLabel: isSelf ? "Yes, Leave Squad" : "Yes, Remove Member",
      cancelLabel: "Cancel",
      confirmColor: "#dc2626",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActionLoadingId(userId);
        setError("");
        try {
          await groupService.removeMember(tripId, userId);
          if (isSelf) {
            // If current user left, reload to reflect departure
            fetchGroup();
          } else {
            setGroup((prev) => ({
              ...prev,
              memberCount: (prev.memberCount || 1) - 1,
              members: prev.members.filter((m) => m.userId !== userId),
            }));
            setSuccess(`Removed ${memberName} from the travel group.`);
          }
        } catch (err) {
          setError(err.response?.data?.message || err.message || "Failed to remove member.");
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  }

  // Identify current user's membership and permission level
  const currentMember = group?.members?.find(
    (m) => m.email?.toLowerCase() === user?.email?.toLowerCase()
  );
  const isOwner = currentMember?.role === "GROUP_OWNER";
  const isAdmin = currentMember?.role === "GROUP_ADMIN" || isOwner;

  // Filter pending join requests and outgoing invitations
  const pendingJoinRequests = (invitations || []).filter(
    (inv) => inv.type === "JOIN_REQUEST" && inv.status === "PENDING"
  );
  const outgoingInvitations = (invitations || []).filter(
    (inv) => inv.type === "ADMIN_INVITATION" && inv.status === "PENDING"
  );

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
        <p style={{ color: "#64748b", fontWeight: "600" }}>Loading Travel Squad...</p>
      </div>
    );
  }

  return (
    <section className="group-section" style={{ marginTop: "24px" }}>
      {/* High-Contrast Royal Violet Executive Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, #f5f3ff 0%, #f8fafc 100%)",
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid #ddd6fe",
          borderLeft: "6px solid #7c3aed",
          boxShadow: "0 2px 10px rgba(124, 58, 237, 0.06)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ede9fe",
              color: "#6d28d9",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            <span>👥 Squad Collaboration</span>
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#0f172a",
              margin: "0 0 6px",
              letterSpacing: "-0.01em",
            }}
          >
            👥 Travel Squad & Companions
          </h2>
          <p style={{ color: "#475569", margin: 0, fontSize: "14px", fontWeight: "500" }}>
            Collaborate in real-time, share your unique 6-character squad join code, invite friends, and coordinate together.
          </p>
        </div>

        {group && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {isAdmin && (
              <button
                onClick={() => setIsInviteOpen(true)}
                style={{
                  padding: "9px 18px",
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
                <span>➕</span> Invite Companion
              </button>
            )}
            <button
              onClick={fetchGroup}
              style={{
                padding: "9px 16px",
                background: "#ffffff",
                color: "#6d28d9",
                border: "1px solid #c4b5fd",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>🔄</span> Refresh Roster
            </button>
          </div>
        )}
      </div>

      {/* Notification Alerts */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "20px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            style={{
              background: "none",
              border: "none",
              color: "#dc2626",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#f0fdf4",
            color: "#16a34a",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "20px",
            fontWeight: "600",
          }}
        >
          {success}
        </div>
      )}

      {/* STATE A: NO SQUAD CREATED YET */}
      {!group ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "48px 24px",
            textAlign: "center",
            maxWidth: "580px",
            margin: "0 auto",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#ede9fe",
              color: "#7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              margin: "0 auto 16px",
            }}
          >
            🏕️
          </div>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "#0f172a",
              marginBottom: "8px",
            }}
          >
            No Travel Group Initialized Yet
          </h3>
          <p
            style={{
              color: "#64748b",
              fontSize: "14px",
              lineHeight: "1.6",
              marginBottom: "24px",
            }}
          >
            Gather your travel buddies! Initializing a travel group creates a unique 6-character
            join code so companions can join this trip, split bills, and collaborate in real-time.
          </p>

          <form onSubmit={handleCreateSquad} style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <input
              type="text"
              placeholder="e.g., Weekend Wanderers, Beach Club"
              value={createSquadName}
              onChange={(e) => setCreateSquadName(e.target.value)}
              required
              style={{
                flex: "1",
                maxWidth: "320px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={modalSubmitting || !createSquadName.trim()}
              style={{
                padding: "10px 20px",
                background: "#7c3aed",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "14px",
                cursor: modalSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
              }}
            >
              {modalSubmitting ? "Initializing..." : "✨ Create Travel Group"}
            </button>
          </form>
        </div>
      ) : (
        /* STATE B: GROUP ACTIVE */
        <div>
          {/* Top Info Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "28px",
            }}
          >
            {/* Group Name Card */}
            <div
              style={{
                background: "#ffffff",
                padding: "20px 22px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  🏷️ Travel Group Name
                </span>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", margin: "8px 0 4px" }}>
                  {group.name}
                </h3>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Destination: {group.destination || "Trip Destination"}
                </span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setIsEditNameOpen(true)}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "14px",
                    background: "none",
                    border: "none",
                    color: "#7c3aed",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  ✏️ Rename Group
                </button>
              )}
            </div>

            {/* Total Companions Card */}
            <div
              style={{
                background: "#ffffff",
                padding: "20px 22px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "12px",
                  background: "#ede9fe",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  flexShrink: 0,
                }}
              >
                👥
              </div>
              <div>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                  Active Companions
                </span>
                <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
                  {group.memberCount || group.members?.length || 1}{" "}
                  <span style={{ fontSize: "14px", fontWeight: "500", color: "#64748b" }}>
                    Travelers
                  </span>
                </div>
              </div>
            </div>

            {/* Shareable Join Code Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)",
                padding: "20px 22px",
                borderRadius: "14px",
                border: "2px dashed #c084fc",
                boxShadow: "0 2px 8px rgba(124, 58, 237, 0.06)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#7c3aed", textTransform: "uppercase" }}>
                    🔑 Group Join Code
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
                    6-Char Secret
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: "900",
                    fontFamily: "monospace",
                    letterSpacing: "4px",
                    color: "#6d28d9",
                    margin: "10px 0 6px",
                  }}
                >
                  {group.joinCode}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <button
                  onClick={handleCopyJoinCode}
                  style={{
                    flex: "1",
                    padding: "8px 14px",
                    background: copySuccess ? "#16a34a" : "#7c3aed",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>{copySuccess ? "✅" : "📋"}</span>
                  {copySuccess ? "Copied to Clipboard!" : "Copy Join Code"}
                </button>
              </div>
            </div>
          </div>

          {/* Admin Section: Pending Join Requests (Double-Consent Flow) */}
          {isAdmin && pendingJoinRequests.length > 0 && (
            <div
              style={{
                background: "#fffbeb",
                borderRadius: "16px",
                border: "1px solid #fde68a",
                borderLeft: "6px solid #f59e0b",
                boxShadow: "0 2px 10px rgba(245, 158, 11, 0.08)",
                marginBottom: "28px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid #fef3c7",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#fef3c7",
                      color: "#b45309",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    <span>⚠️ Approval Required</span>
                  </div>
                  <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#92400e", margin: "2px 0 0" }}>
                    📥 Pending Join Requests ({pendingJoinRequests.length})
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#78350f" }}>
                    These travelers submitted a request via your 6-character squad join code or search. Approve to grant access to the group, budget, and expenses.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#fef9c3", borderBottom: "1px solid #fef08a" }}>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#854d0e" }}>
                        TRAVELER
                      </th>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#854d0e" }}>
                        EMAIL
                      </th>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#854d0e" }}>
                        REQUESTED DATE
                      </th>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#854d0e", textAlign: "right" }}>
                        ADMIN DECISION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingJoinRequests.map((req) => {
                      const displayName = req.userName || req.userEmail?.split("@")[0] || "Traveler";
                      const initials = displayName.slice(0, 2).toUpperCase();
                      const isLoading = actionLoadingId === req.id;

                      return (
                        <tr
                          key={req.id}
                          style={{
                            borderBottom: "1px solid #fef3c7",
                            background: "#ffffff",
                          }}
                        >
                          <td style={{ padding: "14px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "34px",
                                  height: "34px",
                                  borderRadius: "50%",
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: "800",
                                  fontSize: "12px",
                                }}
                              >
                                {initials}
                              </div>
                              <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                                {displayName}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: "14px 20px", fontSize: "13px", color: "#475569" }}>
                            {req.userEmail}
                          </td>

                          <td style={{ padding: "14px 20px", fontSize: "12px", color: "#64748b" }}>
                            {req.createdAt ? formatDisplayDate(req.createdAt) : "Recently"}
                          </td>

                          <td style={{ padding: "14px 20px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                              <button
                                disabled={isLoading}
                                onClick={() => handleApproveJoinRequest(req.id, displayName)}
                                style={{
                                  padding: "6px 14px",
                                  background: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: isLoading ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  boxShadow: "0 1px 4px rgba(22, 163, 74, 0.2)",
                                }}
                              >
                                <span>✅</span> {isLoading ? "Approving..." : "Approve & Enroll"}
                              </button>

                              <button
                                disabled={isLoading}
                                onClick={() => handleRejectJoinRequest(req.id, displayName)}
                                style={{
                                  padding: "6px 12px",
                                  background: "#ffffff",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: isLoading ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <span>❌</span> Decline
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Companions Roster Table */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  Companions Roster ({group.members?.length || 0})
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                  Members can view trip details, share itineraries, and split vacation bills.
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                      COMPANION
                    </th>
                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                      EMAIL
                    </th>
                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                      ROLE & PERMISSIONS
                    </th>
                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                      JOINED DATE
                    </th>
                    <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: "700", color: "#475569", textAlign: "right" }}>
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.members?.map((member) => {
                    const isSelf = user?.email && member.email?.toLowerCase() === user.email.toLowerCase();
                    const isMemberOwner = member.role === "GROUP_OWNER";
                    const isMemberAdmin = member.role === "GROUP_ADMIN";
                    const initials = (member.name || member.email || "U")
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={member.id || member.userId}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Companion Avatar & Name */}
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                background: isMemberOwner
                                  ? "#fef3c7"
                                  : isMemberAdmin
                                  ? "#ede9fe"
                                  : "#e2e8f0",
                                color: isMemberOwner
                                  ? "#b45309"
                                  : isMemberAdmin
                                  ? "#6d28d9"
                                  : "#475569",
                                display: "flex",
                                alignItems: "center",
                                justifyCenter: "center",
                                fontWeight: "800",
                                fontSize: "13px",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ margin: "auto" }}>{initials}</span>
                            </div>
                            <div>
                              <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                                {member.name || member.email.split("@")[0]}
                                {isSelf && (
                                  <span
                                    style={{
                                      marginLeft: "6px",
                                      fontSize: "11px",
                                      background: "#e0f2fe",
                                      color: "#0369a1",
                                      padding: "2px 6px",
                                      borderRadius: "10px",
                                      fontWeight: "700",
                                    }}
                                  >
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "16px 20px", fontSize: "13px", color: "#475569" }}>
                          {member.email}
                        </td>

                        {/* Role Badge */}
                        <td style={{ padding: "16px 20px" }}>
                          {isMemberOwner ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                padding: "4px 10px",
                                borderRadius: "14px",
                                fontSize: "12px",
                                fontWeight: "700",
                              }}
                            >
                              👑 Group Owner
                            </span>
                          ) : isMemberAdmin ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#ede9fe",
                                color: "#6d28d9",
                                border: "1px solid #ddd6fe",
                                padding: "4px 10px",
                                borderRadius: "14px",
                                fontSize: "12px",
                                fontWeight: "700",
                              }}
                            >
                              🛡️ Group Admin
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#f1f5f9",
                                color: "#475569",
                                border: "1px solid #e2e8f0",
                                padding: "4px 10px",
                                borderRadius: "14px",
                                fontSize: "12px",
                                fontWeight: "600",
                              }}
                            >
                              👤 Companion
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td style={{ padding: "16px 20px", fontSize: "13px", color: "#64748b" }}>
                          {member.joinedAt ? formatDisplayDate(member.joinedAt) : "Recently"}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "16px 20px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                            {/* Role management: Only Owner can promote/demote other non-owner members */}
                            {isOwner && !isMemberOwner && (
                              <button
                                disabled={actionLoadingId === member.userId}
                                onClick={() =>
                                  handleRoleChange(
                                    member.userId,
                                    isMemberAdmin ? "GROUP_MEMBER" : "GROUP_ADMIN"
                                  )
                                }
                                style={{
                                  padding: "5px 10px",
                                  background: "#ffffff",
                                  color: isMemberAdmin ? "#475569" : "#6d28d9",
                                  border: `1px solid ${isMemberAdmin ? "#cbd5e1" : "#c4b5fd"}`,
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                {isMemberAdmin ? "Demote to Member" : "🛡️ Promote to Admin"}
                              </button>
                            )}

                            {/* Remove or Leave */}
                            {((isAdmin && !isMemberOwner) || isSelf) && (
                              <button
                                disabled={actionLoadingId === member.userId}
                                onClick={() =>
                                  handleRemoveCompanion(
                                    member.userId,
                                    member.name || member.email
                                  )
                                }
                                style={{
                                  padding: "5px 10px",
                                  background: "#fef2f2",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                {isSelf ? "🚪 Leave Group" : "❌ Remove"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Section: Outgoing Pending Invitations (Double-Consent Flow) */}
          {isAdmin && outgoingInvitations.length > 0 && (
            <div
              style={{
                marginTop: "28px",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    📤 Outgoing Pending Invitations ({outgoingInvitations.length})
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    Invitations sent to companions. They will appear in the squad roster once accepted.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        INVITEE
                      </th>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        EMAIL
                      </th>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        OFFERED ROLE
                      </th>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                        SENT DATE
                      </th>
                      <th style={{ padding: "12px 20px", fontSize: "12px", fontWeight: "700", color: "#475569", textAlign: "right" }}>
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outgoingInvitations.map((inv) => {
                      const displayName = inv.userName || inv.userEmail?.split("@")[0] || "Invited User";
                      const isLoading = actionLoadingId === inv.id;

                      return (
                        <tr
                          key={inv.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <td style={{ padding: "14px 20px", fontWeight: "600", color: "#0f172a", fontSize: "13px" }}>
                            {displayName}
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "13px", color: "#475569" }}>
                            {inv.userEmail}
                          </td>
                          <td style={{ padding: "14px 20px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: inv.role === "GROUP_ADMIN" ? "#ede9fe" : "#f1f5f9",
                                color: inv.role === "GROUP_ADMIN" ? "#6d28d9" : "#475569",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                            >
                              {inv.role === "GROUP_ADMIN" ? "🛡️ Admin" : "👤 Member"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 20px", fontSize: "12px", color: "#64748b" }}>
                            {inv.createdAt ? formatDisplayDate(inv.createdAt) : "Recently"}
                          </td>
                          <td style={{ padding: "14px 20px", textAlign: "right" }}>
                            <button
                              disabled={isLoading}
                              onClick={() => handleCancelInvitation(inv.id, inv.userEmail)}
                              style={{
                                padding: "5px 12px",
                                background: "#ffffff",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                cursor: isLoading ? "not-allowed" : "pointer",
                              }}
                            >
                              {isLoading ? "Cancelling..." : "Cancel Invitation"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: INVITE COMPANION BY EMAIL --- */}
      {isInviteOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsInviteOpen(false)}
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                ➕ Invite Companion to Squad
              </h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5", margin: "0 0 16px" }}>
              Enter your companion's email address. An invitation and in-app notification will be sent immediately. They will be added to the squad once they accept.
            </p>

            <form onSubmit={handleInviteCompanion}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Member's Email Address *
                </label>
                <input
                  type="email"
                  placeholder="e.g. friend@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "22px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Assigned Permission Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="GROUP_MEMBER">👤 Group Member (Can view & split bills)</option>
                  <option value="GROUP_ADMIN">🛡️ Group Admin (Can invite & manage roster)</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
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
                  disabled={modalSubmitting || !inviteEmail.trim()}
                  style={{
                    padding: "10px 20px",
                    background: "#7c3aed",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: modalSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.25)",
                  }}
                >
                  {modalSubmitting ? "Sending Invite..." : "📩 Send Group Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT GROUP NAME --- */}
      {isEditNameOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsEditNameOpen(false)}
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
              maxWidth: "440px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                ✏️ Rename Travel Group
              </h3>
              <button
                onClick={() => setIsEditNameOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSquadName}>
              <div style={{ marginBottom: "22px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  New Group Name *
                </label>
                <input
                  type="text"
                  value={editSquadName}
                  onChange={(e) => setEditSquadName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsEditNameOpen(false)}
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
                  disabled={modalSubmitting || !editSquadName.trim()}
                  style={{
                    padding: "10px 20px",
                    background: "#7c3aed",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: modalSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {modalSubmitting ? "Updating..." : "Save Name"}
                </button>
              </div>
            </form>
          </div>
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
    </section>
  );
}
