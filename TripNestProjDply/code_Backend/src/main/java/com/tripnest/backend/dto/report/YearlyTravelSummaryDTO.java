package com.tripnest.backend.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YearlyTravelSummaryDTO {

    private Integer year;
    private Long totalTripsTaken;
    private Long totalDaysTraveled;
    private BigDecimal totalSpent;
    private Long uniqueDestinationsVisited;
    private String mostExpensiveTripTitle;
    private BigDecimal mostExpensiveTripAmount;
    private String favoriteCategory;
    private ChartSeriesDTO monthlySpendingChart;
}
