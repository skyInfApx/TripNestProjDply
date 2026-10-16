package com.tripnest.backend.dto.group;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Master response DTO returned when fetching or initializing a travel group.
 * Contains the group metadata, shareable join code, and full member roster.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupDetailsResponse {

    // Unique ID of the travel group
    private Long id;

    // Associated trip ID
    private Long tripId;

    // Title of the vacation trip (e.g., "Goa Beach Vacation")
    private String tripTitle;

    // Destination of the trip (e.g., "Goa, India")
    private String destination;

    // Name given to the group by the owner (e.g., "Weekend Wanderers")
    private String name;

    // Unique 6-character code (e.g., "GOA-4821") that admins can copy and share
    private String joinCode;

    // Timestamp when the group was created
    private LocalDateTime createdAt;

    // Total count of current group members
    private int memberCount;

    // Full list of companions currently in this travel group
    @Builder.Default
    private List<GroupMemberResponse> members = new ArrayList<>();
}
