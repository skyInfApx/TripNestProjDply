package com.tripnest.backend.dto.report;

import com.tripnest.backend.dto.expense.ExpenseResponseDTO;
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
public class FilteredExpenseReportDTO {

    private Long totalMatchingExpenses;
    private BigDecimal totalAmount;
    private BigDecimal averageExpenseAmount;
    private BigDecimal highestExpenseAmount;
    private List<ExpenseResponseDTO> expenses;
}
