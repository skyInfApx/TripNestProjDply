package com.tripnest.backend.controller;

import com.tripnest.backend.dto.analytics.*;
import com.tripnest.backend.service.TravelerAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * TravelerAnalyticsController exposes REST APIs for personal traveler dashboard metrics:
 * upcoming trips countdown, budget overview vs actual spends, category expense distribution,
 * historical travel statistics, and favorite destinations.
 * 
 * Base Path: /api/analytics/traveler
 */
@RestController
@RequestMapping("/api/analytics/traveler")
@CrossOrigin
@RequiredArgsConstructor
public class TravelerAnalyticsController {

    private final TravelerAnalyticsService travelerAnalyticsService;

    /**
     * Master Endpoint: Fetches all dashboard analytics in a single, high-performance payload.
     * Preferred for initializing the React Traveler Dashboard.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<TravelerDashboardDTO> getTravelerDashboard(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(travelerAnalyticsService.getTravelerDashboard(email));
    }

    /**
     * Alias endpoint for dashboard summary.
     */
    @GetMapping("/summary")
    public ResponseEntity<TravelerDashboardDTO> getTravelerSummary(Authentication authentication) {
        return getTravelerDashboard(authentication);
    }

    /**
     * Fetch traveler KPI travel statistics (total, completed, ongoing, planned trips, destinations count).
     */
    @GetMapping("/travel-stats")
    public ResponseEntity<TravelStatsDTO> getTravelStats(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(travelerAnalyticsService.getTravelStats(email));
    }

    /**
     * Fetch budget vs actual spending overview and health indicator.
     */
    @GetMapping("/budget-overview")
    public ResponseEntity<BudgetOverviewDTO> getBudgetOverview(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(travelerAnalyticsService.getBudgetOverview(email));
    }

    /**
     * Fetch upcoming trips chronologically sorted with countdown days.
     */
    @GetMapping("/upcoming-trips")
    public ResponseEntity<List<UpcomingTripDTO>> getUpcomingTrips(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(travelerAnalyticsService.getUpcomingTrips(email));
    }

    /**
     * Fetch category-wise expense breakdown with percentages for Chart.js Donut graphs.
     */
    @GetMapping("/category-expenses")
    public ResponseEntity<List<CategoryExpenseDTO>> getCategoryExpenses(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(travelerAnalyticsService.getCategoryExpenses(email));
    }

    /**
     * Fetch top 5 favorite/most-visited destinations for the traveler.
     */
    @GetMapping("/favorite-destinations")
    public ResponseEntity<List<FavoriteDestinationDTO>> getFavoriteDestinations(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(travelerAnalyticsService.getFavoriteDestinations(email));
    }

    /**
     * Fetch monthly spending history for the past 12 months for Chart.js Line graphs.
     */
    @GetMapping("/monthly-trends")
    public ResponseEntity<List<MonthlySpendingDTO>> getMonthlySpendingTrends(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(travelerAnalyticsService.getMonthlySpendings(email));
    }
}
