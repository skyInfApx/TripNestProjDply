package com.tripnest.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TravelerDashboardDTO {

    private TravelStatsDTO travelStats;
    private BudgetOverviewDTO budgetOverview;
    private UpcomingTripDTO nextUpcomingTrip;
    private List<UpcomingTripDTO> upcomingTrips;
    private List<CategoryExpenseDTO> categoryExpenses;
    private List<FavoriteDestinationDTO> favoriteDestinations;
    private List<MonthlySpendingDTO> recentMonthlySpendings;
}
