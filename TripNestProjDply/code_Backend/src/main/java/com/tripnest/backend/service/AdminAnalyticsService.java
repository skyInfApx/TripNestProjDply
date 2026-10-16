package com.tripnest.backend.service;

import com.tripnest.backend.dto.analytics.CategoryExpenseDTO;
import com.tripnest.backend.dto.analytics.MonthlySpendingDTO;
import com.tripnest.backend.dto.analytics.admin.*;
import com.tripnest.backend.entity.ExpenseCategory;
import com.tripnest.backend.entity.TripStatus;
import com.tripnest.backend.entity.Role;
import com.tripnest.backend.entity.User;
import com.tripnest.backend.entity.UserRole;
import com.tripnest.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * AdminAnalyticsService computes platform-wide macro analytics, user demographics,
 * trip status distributions, destination popularity rankings, and financial volumes.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class AdminAnalyticsService {

    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    /**
     * Master Aggregator: Delivers the entire Admin Control Tower payload in one database transaction.
     */
    public AdminDashboardDTO getAdminDashboard() {
        return AdminDashboardDTO.builder()
                .overview(getOverview())
                .userAnalytics(getUserAnalytics())
                .tripAnalytics(getTripAnalytics())
                .destinationAnalytics(getDestinationAnalytics())
                .financialAnalytics(getFinancialAnalytics())
                .build();
    }

    /**
     * Top-line platform KPI metrics.
     */
    public AdminOverviewDTO getOverview() {
        long totalUsers = userRepository.count();
        long totalTrips = tripRepository.count();

        BigDecimal totalPlatformSpend = expenseRepository.getTotalPlatformSpend();
        if (totalPlatformSpend == null) totalPlatformSpend = BigDecimal.ZERO;

        BigDecimal totalBudgetAllocated = budgetRepository.getTotalPlatformBudgetAllocated();
        if (totalBudgetAllocated == null) totalBudgetAllocated = BigDecimal.ZERO;

        BigDecimal averageSpendPerTrip = BigDecimal.ZERO;
        if (totalTrips > 0) {
            averageSpendPerTrip = totalPlatformSpend.divide(BigDecimal.valueOf(totalTrips), 2, RoundingMode.HALF_UP);
        }

        long totalTravelers = tripRepository.getTotalTravelersCount();
        double averageTravelersPerTrip = 0.0;
        if (totalTrips > 0) {
            averageTravelersPerTrip = BigDecimal.valueOf((double) totalTravelers / totalTrips)
                    .setScale(1, RoundingMode.HALF_UP)
                    .doubleValue();
        }

        long totalDestinations = tripRepository.countDistinctDestinationsPlatformWide();

        return AdminOverviewDTO.builder()
                .totalUsers(totalUsers)
                .totalTrips(totalTrips)
                .totalPlatformSpend(totalPlatformSpend)
                .totalBudgetAllocated(totalBudgetAllocated)
                .averageSpendPerTrip(averageSpendPerTrip)
                .averageTravelersPerTrip(averageTravelersPerTrip)
                .totalDestinations(totalDestinations)
                .build();
    }

    /**
     * User demographics, engagement, and power travelers ranking.
     */
    public AdminUserAnalyticsDTO getUserAnalytics() {
        long totalUsers = userRepository.count();
        Long activeTravelers = userRepository.countActiveTravelers();
        if (activeTravelers == null) activeTravelers = 0L;
        long dormantUsers = Math.max(0, totalUsers - activeTravelers);

        List<Object[]> rawTravelers = userRepository.findTopTravelersByTripCount();
        List<TopTravelerDTO> topTravelers = new ArrayList<>();

        if (rawTravelers != null) {
            int count = 0;
            for (Object[] row : rawTravelers) {
                if (count >= 5) break; // Top 5 power travelers
                Long userId = row[0] != null ? ((Number) row[0]).longValue() : 0L;
                String name = row[1] != null ? row[1].toString() : "Anonymous";
                String email = row[2] != null ? row[2].toString() : "";
                Long tripCount = row[3] != null ? ((Number) row[3]).longValue() : 0L;

                BigDecimal spent = expenseRepository.getTotalSpentByOwnerId(userId);
                if (spent == null) spent = BigDecimal.ZERO;

                boolean isUserAdmin = userRoleRepository.existsByUserIdAndRoleName(userId, "ADMIN");

                topTravelers.add(TopTravelerDTO.builder()
                        .userId(userId)
                        .name(name)
                        .email(email)
                        .tripCount(tripCount)
                        .totalSpent(spent)
                        .admin(isUserAdmin)
                        .build());
                count++;
            }
        }

        return AdminUserAnalyticsDTO.builder()
                .totalUsers(totalUsers)
                .activeTravelers(activeTravelers)
                .dormantUsers(dormantUsers)
                .topTravelers(topTravelers)
                .build();
    }

    /**
     * Platform trip analytics (status breakdown, average duration, monthly trip velocity).
     */
    public AdminTripAnalyticsDTO getTripAnalytics() {
        long totalTrips = tripRepository.count();
        long planned = tripRepository.countByStatus(TripStatus.PLANNED);
        long ongoing = tripRepository.countByStatus(TripStatus.ONGOING);
        long completed = tripRepository.countByStatus(TripStatus.COMPLETED);
        long cancelled = tripRepository.countByStatus(TripStatus.CANCELLED);

        Double avgDuration = tripRepository.getAverageTripDurationDays();
        if (avgDuration == null) avgDuration = 0.0;
        double roundedAvgDuration = BigDecimal.valueOf(avgDuration)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        long totalTravelers = tripRepository.getTotalTravelersCount();

        List<Object[]> rawTrends = tripRepository.getMonthlyTripCreationTrends();
        List<MonthlyTripTrendDTO> monthlyTrends = new ArrayList<>();
        if (rawTrends != null) {
            for (Object[] row : rawTrends) {
                String month = row[0] != null ? row[0].toString() : "";
                Long count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
                monthlyTrends.add(MonthlyTripTrendDTO.builder()
                        .yearMonth(month)
                        .tripCount(count)
                        .build());
            }
        }

        return AdminTripAnalyticsDTO.builder()
                .totalTrips(totalTrips)
                .plannedTrips(planned)
                .ongoingTrips(ongoing)
                .completedTrips(completed)
                .cancelledTrips(cancelled)
                .averageTripDurationDays(roundedAvgDuration)
                .totalTravelersServiced(totalTravelers)
                .monthlyTripTrends(monthlyTrends)
                .build();
    }

    /**
     * Destination popularity ranking and total unique destinations.
     */
    public AdminDestinationAnalyticsDTO getDestinationAnalytics() {
        long totalUnique = tripRepository.countDistinctDestinationsPlatformWide();

        List<Object[]> rawList = tripRepository.getPlatformDestinationTrends();
        List<DestinationTrendDTO> topDestinations = new ArrayList<>();

        if (rawList != null) {
            int count = 0;
            for (Object[] row : rawList) {
                if (count >= 10) break; // Top 10 destinations
                String dest = row[0] != null ? row[0].toString() : "Unknown";
                Long trips = row[1] != null ? ((Number) row[1]).longValue() : 0L;
                Long travelers = row[2] != null ? ((Number) row[2]).longValue() : 0L;

                topDestinations.add(DestinationTrendDTO.builder()
                        .destination(dest)
                        .totalTrips(trips)
                        .totalTravelers(travelers)
                        .estimatedSpend(BigDecimal.ZERO)
                        .build());
                count++;
            }
        }

        return AdminDestinationAnalyticsDTO.builder()
                .totalUniqueDestinations(totalUnique)
                .topDestinations(topDestinations)
                .build();
    }

    /**
     * Platform-wide financial volume, average transaction size, and category distribution.
     */
    public AdminFinancialAnalyticsDTO getFinancialAnalytics() {
        BigDecimal totalPlatformSpend = expenseRepository.getTotalPlatformSpend();
        if (totalPlatformSpend == null) totalPlatformSpend = BigDecimal.ZERO;

        BigDecimal totalBudgetAllocated = budgetRepository.getTotalPlatformBudgetAllocated();
        if (totalBudgetAllocated == null) totalBudgetAllocated = BigDecimal.ZERO;

        Double rawAvgExpense = expenseRepository.getAverageExpenseAmount();
        BigDecimal avgExpense = BigDecimal.ZERO;
        if (rawAvgExpense != null) {
            avgExpense = BigDecimal.valueOf(rawAvgExpense).setScale(2, RoundingMode.HALF_UP);
        }

        List<Object[]> rawCategories = expenseRepository.getPlatformCategorySpending();
        List<CategoryExpenseDTO> categoryList = new ArrayList<>();

        if (rawCategories != null) {
            for (Object[] row : rawCategories) {
                if (row[0] == null) continue;
                String catName = (row[0] instanceof ExpenseCategory) ?
                        ((ExpenseCategory) row[0]).name() : row[0].toString();
                BigDecimal amount = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;

                double percentage = 0.0;
                if (totalPlatformSpend.compareTo(BigDecimal.ZERO) > 0) {
                    percentage = amount
                            .multiply(BigDecimal.valueOf(100))
                            .divide(totalPlatformSpend, 2, RoundingMode.HALF_UP)
                            .doubleValue();
                }

                categoryList.add(CategoryExpenseDTO.builder()
                        .category(catName)
                        .totalAmount(amount)
                        .percentage(percentage)
                        .build());
            }
        }

        List<Object[]> rawMonthly = expenseRepository.getPlatformMonthlySpendingTrends();
        List<MonthlySpendingDTO> monthlyList = new ArrayList<>();
        if (rawMonthly != null) {
            for (Object[] row : rawMonthly) {
                String month = row[0] != null ? row[0].toString() : "";
                BigDecimal amount = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
                Long txCount = row[2] != null ? ((Number) row[2]).longValue() : 0L;

                monthlyList.add(MonthlySpendingDTO.builder()
                        .yearMonth(month)
                        .amount(amount)
                        .transactionCount(txCount)
                        .build());
            }
        }

        return AdminFinancialAnalyticsDTO.builder()
                .totalPlatformSpend(totalPlatformSpend)
                .totalBudgetAllocated(totalBudgetAllocated)
                .averageExpenseAmount(avgExpense)
                .platformCategoryDistribution(categoryList)
                .platformMonthlySpendings(monthlyList)
                .build();
    }

    /**
     * Checks if a user has the ADMIN role.
     */
    public boolean isUserAdmin(String email) {
        return userRepository.findByEmail(email)
                .map(user -> userRoleRepository.existsByUserIdAndRoleName(user.getId(), "ADMIN"))
                .orElse(false);
    }

    /**
     * Promotes an existing user to Administrator role (Admin-only privilege).
     */
    @Transactional
    public String promoteUserToAdmin(Long userId) {
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseThrow(() -> new RuntimeException("ADMIN role not found in database"));

        boolean alreadyAdmin = userRoleRepository.existsByUserIdAndRoleName(userId, "ADMIN");
        if (alreadyAdmin) {
            return "User " + targetUser.getEmail() + " is already an Administrator";
        }

        UserRole userRole = UserRole.builder()
                .user(targetUser)
                .role(adminRole)
                .build();
        userRoleRepository.save(userRole);

        return "Successfully promoted " + targetUser.getEmail() + " to Administrator";
    }
}
