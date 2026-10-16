package com.tripnest.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetOverviewDTO {

    private BigDecimal totalBudget;
    private BigDecimal totalSpent;
    private BigDecimal remainingBudget;
    private Double utilizationPercentage;
    private String budgetHealthStatus; // UNDER_BUDGET, HEALTHY, NEARING_LIMIT, OVER_BUDGET
}
