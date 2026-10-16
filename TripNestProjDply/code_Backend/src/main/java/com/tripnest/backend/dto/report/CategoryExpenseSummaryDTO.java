package com.tripnest.backend.dto.report;

import com.tripnest.backend.entity.ExpenseCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * CategoryExpenseSummaryDTO represents the financial health and budget consumption
 * for a single expense category (e.g., FOOD, TRANSPORTATION, ACCOMMODATION).
 * 
 * Used by:
 * 1. Milestone 3 Task 3 Category Summaries & Reports API.
 * 2. Milestone 4 Frontend Charts (Pie & Bar visual analytics).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryExpenseSummaryDTO {

    // The category being summarized (e.g., FOOD, TRANSPORTATION, ACCOMMODATION)
    private ExpenseCategory category;

    // Budget limit allocated by traveler in Task 1 (e.g. ₹10,000.00)
    private BigDecimal allocatedLimit;

    // Total actual money spent in this category (e.g. ₹8,800.00)
    private BigDecimal totalSpent;

    // Remaining money left in this category (allocatedLimit - totalSpent)
    private BigDecimal remainingAmount;

    // Percentage of the category budget consumed (e.g., 88.0%)
    private Double percentageSpent;

    // Financial Health Flag:
    // "NORMAL"            -> Under 85% spent
    // "APPROACHING_LIMIT" -> 85% to 100% spent (warning to traveler)
    // "OVER_BUDGET"       -> Exceeded 100% limit (red alert!)
    private String status;

    // Total number of expense receipts logged under this category
    private Long transactionCount;
}
