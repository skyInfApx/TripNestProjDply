package com.tripnest.backend.dto.budget;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

/**
 * BudgetRequest captures client input for creating or updating a trip budget.
 * Includes Bean Validation constraints to reject invalid financial payloads.
 */
@Data
public class BudgetRequest {

    // Total budget must be present and strictly greater than zero (e.g. >= 0.01)
    @NotNull(message = "Total budget is required")
    @Positive(message = "Total budget must be strictly greater than zero")
    private BigDecimal totalBudget;

    // Currency code (e.g. 'INR', 'USD'). Optional in request; defaults to INR in service if null.
    private String currency;

    // Category allocations: cannot be negative, but can be 0.00
    @DecimalMin(value = "0.0", inclusive = true, message = "Accommodation limit cannot be negative")
    private BigDecimal accommodationLimit;

    @DecimalMin(value = "0.0", inclusive = true, message = "Transportation limit cannot be negative")
    private BigDecimal transportationLimit;

    @DecimalMin(value = "0.0", inclusive = true, message = "Food limit cannot be negative")
    private BigDecimal foodLimit;

    @DecimalMin(value = "0.0", inclusive = true, message = "Activities limit cannot be negative")
    private BigDecimal activitiesLimit;

    @DecimalMin(value = "0.0", inclusive = true, message = "Shopping limit cannot be negative")
    private BigDecimal shoppingLimit;

    @DecimalMin(value = "0.0", inclusive = true, message = "Miscellaneous limit cannot be negative")
    private BigDecimal miscLimit;
}
