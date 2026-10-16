package com.tripnest.backend.dto.report;

import com.tripnest.backend.entity.ExpenseCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * TripExpenseReportDTO represents the comprehensive financial master report
 * for an entire trip.
 * 
 * Aggregates:
 * 1. High-level financial KPIs (Total Budget, Total Spent, Balance Remaining).
 * 2. Risk analysis (Overall spending percentage, Over-budget warning status).
 * 3. Dominant spending driver (Top spending category & amount).
 * 4. Granular breakdown list of each category's consumption.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripExpenseReportDTO {

    // Unique ID of the trip (e.g. 7)
    private Long tripId;

    // Title of the trip (e.g. "Hill Station Tour Sept")
    private String tripTitle;

    // Financial currency code (e.g. "INR")
    private String currency;

    // Total target budget allocated in Task 1 (e.g. ₹50,000.00)
    private BigDecimal totalBudget;

    // Total actual money spent across all categories (e.g. ₹38,500.00)
    private BigDecimal totalSpent;

    // Remaining unspent budget balance (totalBudget - totalSpent)
    private BigDecimal remainingBudget;

    // Overall percentage of total budget consumed (e.g. 77.0%)
    private Double overallPercentageSpent;

    // Overall Trip Financial Health Status:
    // "NORMAL"            -> Under 85% of total budget spent
    // "APPROACHING_LIMIT" -> 85% to 100% of total budget spent
    // "OVER_BUDGET"       -> Exceeded 100% of total budget
    private String overallStatus;

    // The category where the most money was spent (e.g. ACCOMMODATION)
    private ExpenseCategory topSpendingCategory;

    // The amount spent in that top category (e.g. ₹18,000.00)
    private BigDecimal topCategoryAmount;

    // Total number of expense receipts logged across the entire trip
    private Long totalTransactions;

    // Detailed category-by-category breakdown list (Food, Travel, Stay, etc.)
    private List<CategoryExpenseSummaryDTO> categorySummaries;
}
