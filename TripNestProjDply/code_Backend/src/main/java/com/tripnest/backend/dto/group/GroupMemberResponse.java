package com.tripnest.backend.dto.group;

import com.tripnest.backend.entity.GroupRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * GOAL: DTO returned to the frontend representing an individual member inside a travel group.
 * Used inside the group roster to display who is participating and their permissions.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMemberResponse {

    /**
     * GOAL: Primary key ID of the group membership record.
     */
    private Long id;

    /**
     * GOAL: ID of the registered user.
     */
    private Long userId;

    /**
     * GOAL: Full name of the companion (e.g., "Rahul Sharma").
     */
    private String name;

    /**
     * GOAL: Contact email of the companion (e.g., "rahul@gmail.com").
     */
    private String email;

    /**
     * GOAL: Assigned role in the group (GROUP_OWNER, GROUP_ADMIN, or GROUP_MEMBER).
     */
    private GroupRole role;

    /**
     * GOAL: Timestamp when this companion joined the group.
     */
    private LocalDateTime joinedAt;
}
