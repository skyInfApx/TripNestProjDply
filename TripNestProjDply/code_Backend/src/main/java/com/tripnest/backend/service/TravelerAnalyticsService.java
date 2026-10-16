package com.tripnest.backend.service;

import com.tripnest.backend.dto.analytics.*;
import com.tripnest.backend.entity.ExpenseCategory;
import com.tripnest.backend.entity.Trip;
import com.tripnest.backend.entity.TripStatus;
import com.tripnest.backend.entity.User;
import com.tripnest.backend.repository.BudgetRepository;
import com.tripnest.backend.repository.ExpenseRepository;
import com.tripnest.backend.repository.TripRepository;
import com.tripnest.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * TravelerAnalyticsService computes personal metrics, budget health,
 * upcoming itineraries, category spending, and favorite destinations for a traveler.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class TravelerAnalyticsService {

    private final TripRepository tripRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;

    /**
     * Master Aggregation: Assembles the complete Traveler Dashboard payload in one database transaction.
     */
    public TravelerDashboardDTO getTravelerDashboard(String userEmail) {
        User user = getUserByEmail(userEmail);
        Long userId = user.getId();

        TravelStatsDTO travelStats = buildTravelStats(userId);
        BudgetOverviewDTO budgetOverview = buildBudgetOverview(userId);
        List<UpcomingTripDTO> upcomingTrips = buildUpcomingTrips(userId);
        UpcomingTripDTO nextUpcomingTrip = upcomingTrips.isEmpty() ? null : upcomingTrips.get(0);
        List<CategoryExpenseDTO> categoryExpenses = buildCategoryExpenses(userId, budgetOverview.getTotalSpent());
        List<FavoriteDestinationDTO> favoriteDestinations = buildFavoriteDestinations(userId);
        List<MonthlySpendingDTO> monthlySpendings = buildMonthlySpendings(userId);

        return TravelerDashboardDTO.builder()
                .travelStats(travelStats)
                .budgetOverview(budgetOverview)
                .nextUpcomingTrip(nextUpcomingTrip)
                .upcomingTrips(upcomingTrips)
                .categoryExpenses(categoryExpenses)
                .favoriteDestinations(favoriteDestinations)
                .recentMonthlySpendings(monthlySpendings)
                .build();
    }

    public TravelStatsDTO getTravelStats(String userEmail) {
        User user = getUserByEmail(userEmail);
        return buildTravelStats(user.getId());
    }

    public BudgetOverviewDTO getBudgetOverview(String userEmail) {
        User user = getUserByEmail(userEmail);
        return buildBudgetOverview(user.getId());
    }

    public List<UpcomingTripDTO> getUpcomingTrips(String userEmail) {
        User user = getUserByEmail(userEmail);
        return buildUpcomingTrips(user.getId());
    }

    public List<CategoryExpenseDTO> getCategoryExpenses(String userEmail) {
        User user = getUserByEmail(userEmail);
        BigDecimal totalSpent = expenseRepository.getTotalSpentByOwnerId(user.getId());
        return buildCategoryExpenses(user.getId(), totalSpent);
    }

    public List<FavoriteDestinationDTO> getFavoriteDestinations(String userEmail) {
        User user = getUserByEmail(userEmail);
        return buildFavoriteDestinations(user.getId());
    }

    public List<MonthlySpendingDTO> getMonthlySpendings(String userEmail) {
        User user = getUserByEmail(userEmail);
        return buildMonthlySpendings(user.getId());
    }

    // =========================================================================
    // PRIVATE BUILDER METHODS
    // =========================================================================

    private TravelStatsDTO buildTravelStats(Long userId) {
        Long totalTrips = tripRepository.countByOwnerId(userId);
        Long completedTrips = tripRepository.countByOwnerIdAndStatus(userId, TripStatus.COMPLETED);
        Long ongoingTrips = tripRepository.countByOwnerIdAndStatus(userId, TripStatus.ONGOING);
        Long plannedTrips = tripRepository.countByOwnerIdAndStatus(userId, TripStatus.PLANNED);
        Long uniqueDestinations = tripRepository.countDistinctDestinationsByOwnerId(userId);

        return TravelStatsDTO.builder()
                .totalTrips(totalTrips != null ? totalTrips : 0L)
                .completedTrips(completedTrips != null ? completedTrips : 0L)
                .ongoingTrips(ongoingTrips != null ? ongoingTrips : 0L)
                .plannedTrips(plannedTrips != null ? plannedTrips : 0L)
                .uniqueDestinationsCount(uniqueDestinations != null ? uniqueDestinations : 0L)
                .build();
    }

    private BudgetOverviewDTO buildBudgetOverview(Long userId) {
        BigDecimal totalBudget = budgetRepository.getTotalBudgetAllocatedByOwnerId(userId);
        if (totalBudget == null) {
            totalBudget = BigDecimal.ZERO;
        }

        BigDecimal totalSpent = expenseRepository.getTotalSpentByOwnerId(userId);
        if (totalSpent == null) {
            totalSpent = BigDecimal.ZERO;
        }

        BigDecimal remainingBudget = totalBudget.subtract(totalSpent);

        double utilizationPercentage = 0.0;
        if (totalBudget.compareTo(BigDecimal.ZERO) > 0) {
            utilizationPercentage = totalSpent
                    .multiply(BigDecimal.valueOf(100))
                    .divide(totalBudget, 2, RoundingMode.HALF_UP)
                    .doubleValue();
        } else if (totalSpent.compareTo(BigDecimal.ZERO) > 0) {
            utilizationPercentage = 100.0;
        }

        String healthStatus;
        if (utilizationPercentage < 70.0) {
            healthStatus = "UNDER_BUDGET";
        } else if (utilizationPercentage <= 90.0) {
            healthStatus = "HEALTHY";
        } else if (utilizationPercentage <= 100.0) {
            healthStatus = "NEARING_LIMIT";
        } else {
            healthStatus = "OVER_BUDGET";
        }

        return BudgetOverviewDTO.builder()
                .totalBudget(totalBudget)
                .totalSpent(totalSpent)
                .remainingBudget(remainingBudget)
                .utilizationPercentage(utilizationPercentage)
                .budgetHealthStatus(healthStatus)
                .build();
    }

    private List<UpcomingTripDTO> buildUpcomingTrips(Long userId) {
        LocalDate today = LocalDate.now();
        List<Trip> upcomingTrips = tripRepository.findUpcomingTripsByOwnerId(userId, today);

        return upcomingTrips.stream().map(trip -> {
            long daysUntil = ChronoUnit.DAYS.between(today, trip.getStartDate());
            if (daysUntil < 0) {
                daysUntil = 0;
            }
            return UpcomingTripDTO.builder()
                    .tripId(trip.getId())
                    .title(trip.getTitle())
                    .destination(trip.getDestination())
                    .startDate(trip.getStartDate())
                    .endDate(trip.getEndDate())
                    .daysUntilTrip(daysUntil)
                    .status(trip.getStatus() != null ? trip.getStatus().name() : "PLANNED")
                    .numberOfTravelers(trip.getNumberOfTravelers())
                    .build();
        }).collect(Collectors.toList());
    }

    private List<CategoryExpenseDTO> buildCategoryExpenses(Long userId, BigDecimal totalSpent) {
        List<Object[]> rawList = expenseRepository.getCategorySpendingByOwnerId(userId);
        List<CategoryExpenseDTO> result = new ArrayList<>();

        if (rawList == null || rawList.isEmpty()) {
            return result;
        }

        for (Object[] row : rawList) {
            if (row[0] == null) continue;
            String categoryStr;
            if (row[0] instanceof ExpenseCategory) {
                categoryStr = ((ExpenseCategory) row[0]).name();
            } else {
                categoryStr = row[0].toString();
            }

            BigDecimal amount = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            double percentage = 0.0;
            if (totalSpent != null && totalSpent.compareTo(BigDecimal.ZERO) > 0) {
                percentage = amount
                        .multiply(BigDecimal.valueOf(100))
                        .divide(totalSpent, 2, RoundingMode.HALF_UP)
                        .doubleValue();
            }

            result.add(CategoryExpenseDTO.builder()
                    .category(categoryStr)
                    .totalAmount(amount)
                    .percentage(percentage)
                    .build());
        }

        return result;
    }

    private List<FavoriteDestinationDTO> buildFavoriteDestinations(Long userId) {
        List<Object[]> rawList = tripRepository.findFavoriteDestinationsByOwnerId(userId);
        List<FavoriteDestinationDTO> result = new ArrayList<>();

        if (rawList == null || rawList.isEmpty()) {
            return result;
        }

        int count = 0;
        for (Object[] row : rawList) {
            if (count >= 5) break; // Top 5 favorite destinations
            String destination = row[0] != null ? row[0].toString() : "Unknown";
            Long visitCount = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            LocalDate lastVisited = row[2] != null ? (LocalDate) row[2] : null;

            result.add(FavoriteDestinationDTO.builder()
                    .destination(destination)
                    .visitCount(visitCount)
                    .lastVisitedDate(lastVisited)
                    .build());
            count++;
        }

        return result;
    }

    private List<MonthlySpendingDTO> buildMonthlySpendings(Long userId) {
        List<Object[]> rawList = expenseRepository.getMonthlySpendingTrendsByOwnerId(userId);
        List<MonthlySpendingDTO> result = new ArrayList<>();

        if (rawList == null || rawList.isEmpty()) {
            return result;
        }

        for (Object[] row : rawList) {
            String monthStr = row[0] != null ? row[0].toString() : "";
            BigDecimal amount = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            Long txCount = row[2] != null ? ((Number) row[2]).longValue() : 0L;

            result.add(MonthlySpendingDTO.builder()
                    .yearMonth(monthStr)
                    .amount(amount)
                    .transactionCount(txCount)
                    .build());
        }

        return result;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}
