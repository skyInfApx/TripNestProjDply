package com.tripnest.backend.dto.group;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * GOAL: DTO payload sent by the trip owner to initialize a new travel group.
 * HTTP Context: POST /api/trips/{tripId}/groups
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupCreateRequest {

    /**
     * GOAL: Human-readable name for the travel group (e.g., "Goa Weekend Wanderers", "Family Tour").
     */
    @NotBlank(message = "Group name is required")
    @Size(min = 2, max = 100, message = "Group name must be between 2 and 100 characters")
    private String name;
}
