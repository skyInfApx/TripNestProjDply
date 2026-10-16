package com.tripnest.backend.dto.budget;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * BudgetResponse is the public payload returned by the REST API.
 * Contains both stored limits and convenient computed financial summaries.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetResponse {

    private Long id;

    // ID of the trip this budget belongs to
    private Long tripId;

    // Total planned budget ceiling
    private BigDecimal totalBudget;

    // Currency (e.g. 'INR')
    private String currency;

    // Category target limits
    private BigDecimal accommodationLimit;
    private BigDecimal transportationLimit;
    private BigDecimal foodLimit;
    private BigDecimal activitiesLimit;
    private BigDecimal shoppingLimit;
    private BigDecimal miscLimit;

    // =========================================================================
    // COMPUTED FIELDS (Extremely useful for Frontend UI!)
    // =========================================================================

    // Sum of all 5 category limits: (Accommodation + Transport + Food + Activities + Misc)
    private BigDecimal totalAllocated;

    // Remaining unassigned budget: (TotalBudget - TotalAllocated)
    private BigDecimal unallocatedAmount;

    // Audit timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
