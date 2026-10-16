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
public class MonthlySpendingDTO {

    private String yearMonth;
    private BigDecimal amount;
    private Long transactionCount;
}
