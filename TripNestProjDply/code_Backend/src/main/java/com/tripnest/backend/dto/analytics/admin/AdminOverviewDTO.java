package com.tripnest.backend.dto.analytics.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewDTO {

    private Long totalUsers;
    private Long totalTrips;
    private BigDecimal totalPlatformSpend;
    private BigDecimal totalBudgetAllocated;
    private BigDecimal averageSpendPerTrip;
    private Double averageTravelersPerTrip;
    private Long totalDestinations;
}
