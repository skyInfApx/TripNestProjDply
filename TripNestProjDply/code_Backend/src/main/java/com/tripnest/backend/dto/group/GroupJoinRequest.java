package com.tripnest.backend.dto.group;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GOAL: DTO payload sent by a traveler to join an existing trip group using a code.
 * HTTP Context: POST /api/groups/join
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupJoinRequest {

    /**
     * GOAL: The 6-8 character alphanumeric join code (e.g. "GOA-4821") provided by the trip organizer.
     * VALIDATION: Must not be blank, size between 4 and 12 characters.
     */
    @NotBlank(message = "Join code is required")
    @Size(min = 4, max = 12, message = "Join code must be between 4 and 12 characters")
    private String joinCode;
}
