package com.tripnest.backend.entity;

/**
 * Defines member roles within a travel collaboration group.
 */
public enum GroupRole {
    GROUP_OWNER,  // Creator of the trip/group: full control (delete group, manage roles)
    GROUP_ADMIN,  // Co-organizer: can invite members, edit itineraries, and log expenses
    GROUP_MEMBER  // Companion: can view trip details, log expenses, and participate
}
