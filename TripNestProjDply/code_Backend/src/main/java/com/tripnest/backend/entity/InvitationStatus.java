package com.tripnest.backend.entity;

/**
 * Lifecycle status for travel squad invitations and join requests:
 * - PENDING: Waiting for consent (user acceptance or admin approval)
 * - ACCEPTED: Request accepted/approved and traveler enrolled into active group members
 * - REJECTED: Request declined by invitee or rejected by group admin
 * - CANCELLED: Outgoing invitation retracted by the admin who issued it
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    REJECTED,
    CANCELLED
}
