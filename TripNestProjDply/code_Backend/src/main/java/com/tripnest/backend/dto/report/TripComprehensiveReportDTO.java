package com.tripnest.backend.dto.report;

import com.tripnest.backend.dto.expense.ExpenseResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripComprehensiveReportDTO {

    private Long tripId;
    private String title;
    private String destination;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long durationDays;
    private Integer numberOfTravelers;
    private String status;

    private BigDecimal totalBudget;
    private BigDecimal totalSpent;
    private BigDecimal remainingBudget;
    private Double budgetUtilizationPercentage;
    private String budgetHealthStatus;
    private String topSpendingCategory;

    private Long totalExpenseCount;
    private Long totalDocumentsCount;
    private List<CategoryExpenseSummaryDTO> categoryBreakdown;
    private List<ExpenseResponseDTO> itemizedExpenses;
}
