package com.tripnest.backend.dto.analytics.admin;

import com.tripnest.backend.dto.analytics.CategoryExpenseDTO;
import com.tripnest.backend.dto.analytics.MonthlySpendingDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminFinancialAnalyticsDTO {

    private BigDecimal totalPlatformSpend;
    private BigDecimal totalBudgetAllocated;
    private BigDecimal averageExpenseAmount;
    private List<CategoryExpenseDTO> platformCategoryDistribution;
    private List<MonthlySpendingDTO> platformMonthlySpendings;
}
