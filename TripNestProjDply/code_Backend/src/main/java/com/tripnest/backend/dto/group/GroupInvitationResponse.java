package com.tripnest.backend.dto.group;

import com.tripnest.backend.entity.GroupRole;
import com.tripnest.backend.entity.InvitationStatus;
import com.tripnest.backend.entity.InvitationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO representing a travel squad invitation or join request.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupInvitationResponse {

    private Long id;
    private Long groupId;
    private String groupName;
    private String joinCode;
    private Long tripId;
    private String tripTitle;
    private String destination;

    // The user who is invited or who sent the join request
    private Long userId;
    private String userName;
    private String userEmail;

    // The admin who sent the invitation (null for user-initiated join requests)
    private Long inviterId;
    private String inviterName;
    private String inviterEmail;

    private InvitationType type;
    private InvitationStatus status;
    private GroupRole role;
    private LocalDateTime createdAt;
}
