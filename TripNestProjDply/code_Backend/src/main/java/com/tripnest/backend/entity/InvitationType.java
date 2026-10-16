package com.tripnest.backend.entity;

/**
 * Defines the origin direction of a group onboarding request:
 * 1. ADMIN_INVITATION: Group Owner/Admin invited user by email -> Requires User Acceptance.
 * 2. JOIN_REQUEST: Traveler entered join code or searched group -> Requires Admin Approval.
 */
public enum InvitationType {
    ADMIN_INVITATION,
    JOIN_REQUEST
}
