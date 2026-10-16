package com.tripnest.backend.entity;

/**
 * NotificationType classifies in-app notifications and automated travel alerts.
 * 
 * Used for:
 * 1. Categorizing notifications in the UI dropdown.
 * 2. Determining notification priority and icon display (e.g. ⚠️ Budget Warning vs 👥 Group Invite).
 */
public enum NotificationType {
    TRIP_INVITE,            // A friend invited the user to join a travel group
    GROUP_JOIN_REQUEST,     // A traveler submitted a request to join a squad via code or search
    INVITATION_ACCEPTED,    // Invitee accepted the squad invitation
    INVITATION_DECLINED,    // Invitee declined the squad invitation
    JOIN_REQUEST_APPROVED,  // Admin approved the traveler's request to join squad
    JOIN_REQUEST_REJECTED,  // Admin declined the traveler's request to join squad
    BUDGET_ALERT,           // Category or total spending crossed 85% or 100% threshold
    EXPENSE_SPLIT,          // A new bill split was assigned or a debt was settled
    DOCUMENT_UPLOAD,        // A companion uploaded a new ticket, voucher, or photo to the vault
    ACTIVITY_REMINDER       // Scheduled morning reminder for trips or activities starting soon
}
