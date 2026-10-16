package com.tripnest.backend.dto.analytics.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminTripAnalyticsDTO {

    private Long totalTrips;
    private Long plannedTrips;
    private Long ongoingTrips;
    private Long completedTrips;
    private Long cancelledTrips;
    private Double averageTripDurationDays;
    private Long totalTravelersServiced;
    private List<MonthlyTripTrendDTO> monthlyTripTrends;
}
