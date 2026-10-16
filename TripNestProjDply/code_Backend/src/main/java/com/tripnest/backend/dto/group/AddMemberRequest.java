package com.tripnest.backend.dto.group;

import com.tripnest.backend.entity.GroupRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GOAL: DTO payload sent by a Group Owner or Group Admin to invite a companion by email.
 * HTTP Context: POST /api/trips/{tripId}/groups/members
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddMemberRequest {

    /**
     * GOAL: The registered email address of the traveler to add into the travel group.
     * VALIDATION: Must not be blank and must follow valid email syntax.
     */
    @NotBlank(message = "Member email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    // Optional proposed role (defaults to GROUP_MEMBER if null)
    private GroupRole role;
}

