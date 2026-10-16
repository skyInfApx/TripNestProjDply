package com.tripnest.backend.service;

import com.tripnest.backend.dto.report.CategoryExpenseSummaryDTO;
import com.tripnest.backend.dto.report.TripExpenseReportDTO;
import com.tripnest.backend.entity.Budget;
import com.tripnest.backend.entity.ExpenseCategory;
import com.tripnest.backend.entity.TravelGroup;
import com.tripnest.backend.entity.Trip;
import com.tripnest.backend.entity.User;
import com.tripnest.backend.repository.BudgetRepository;
import com.tripnest.backend.repository.ExpenseRepository;
import com.tripnest.backend.repository.GroupMemberRepository;
import com.tripnest.backend.repository.TravelGroupRepository;
import com.tripnest.backend.repository.TripRepository;
import com.tripnest.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * ExpenseReportService is the financial calculation and reporting engine of TripNest.
 * 
 * Capabilities:
 * 1. Computes category-by-category expense summaries with remaining balance and percent consumed.
 * 2. Generates early warning flags (APPROACHING_LIMIT at 85%, OVER_BUDGET at 100%).
 * 3. Identifies the trip's top expenditure driver (topSpendingCategory).
 * 4. Compiles the master executive financial report for the entire trip.
 */
@Service
@Transactional(readOnly = true)
public class ExpenseReportService {

    private final TripRepository tripRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final NotificationService notificationService;

    public ExpenseReportService(
            TripRepository tripRepository,
            BudgetRepository budgetRepository,
            ExpenseRepository expenseRepository,
            UserRepository userRepository,
            GroupMemberRepository groupMemberRepository,
            TravelGroupRepository travelGroupRepository,
            NotificationService notificationService) {
        this.tripRepository = tripRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.travelGroupRepository = travelGroupRepository;
        this.notificationService = notificationService;
    }

    /**
     * Generates a category-wise spending summary list for all supported categories.
     * 
     * @param tripId The trip to analyze
     * @param userEmail Email of the authenticated traveler
     * @return List of CategoryExpenseSummaryDTO for each category
     */
    public List<CategoryExpenseSummaryDTO> getCategorySummaries(Long tripId, String userEmail) {
        getTripAndVerifyAccess(tripId, userEmail);
        Budget budget = budgetRepository.findByTripId(tripId).orElse(null);

        List<CategoryExpenseSummaryDTO> summaries = new ArrayList<>();
        for (ExpenseCategory category : ExpenseCategory.values()) {
            summaries.add(buildCategorySummary(tripId, budget, category));
        }

        return summaries;
    }

    /**
     * Compiles the comprehensive master financial report for a trip.
     * 
     * @param tripId The trip to report on
     * @param userEmail Email of the authenticated traveler
     * @return TripExpenseReportDTO containing KPIs, top driver, and category details
     */
    public TripExpenseReportDTO getTripExpenseReport(Long tripId, String userEmail) {
        Trip trip = getTripAndVerifyAccess(tripId, userEmail);
        Budget budget = budgetRepository.findByTripId(tripId).orElse(null);

        // 1. Total Target Budget (default to 0 if not yet set by traveler)
        BigDecimal totalBudget = (budget != null && budget.getTotalBudget() != null)
                ? budget.getTotalBudget()
                : BigDecimal.ZERO;

        // 2. Actual Total Spent (calculated via JPQL SUM aggregation in database)
        BigDecimal totalSpent = expenseRepository.getTotalSpentByTripId(tripId);
        if (totalSpent == null) {
            totalSpent = BigDecimal.ZERO;
        }

        // 3. Remaining balance: totalBudget - totalSpent
        BigDecimal remainingBudget = totalBudget.subtract(totalSpent);

        // 4. Overall Consumption Percentage
        Double overallPercentage = 0.0;
        if (totalBudget.compareTo(BigDecimal.ZERO) > 0) {
            double raw = (totalSpent.doubleValue() / totalBudget.doubleValue()) * 100.0;
            overallPercentage = Math.round(raw * 10.0) / 10.0; // 1 decimal place (e.g. 77.0%)
        }

        // 5. Determine Overall Financial Health Status
        String overallStatus;
        if (totalBudget.compareTo(BigDecimal.ZERO) == 0) {
            overallStatus = totalSpent.compareTo(BigDecimal.ZERO) > 0 ? "OVER_BUDGET" : "NORMAL";
        } else if (overallPercentage >= 100.0) {
            overallStatus = "OVER_BUDGET";
        } else if (overallPercentage >= 90.0) {
            overallStatus = "ABOUT_TO_EXHAUST";
        } else if (overallPercentage >= 80.0) {
            overallStatus = "APPROACHING_LIMIT";
        } else {
            overallStatus = "NORMAL";
        }

        // Proactively evaluate budget alerts when viewing the financial report
        try {
            if (totalBudget.compareTo(BigDecimal.ZERO) > 0) {
                notificationService.checkAndTriggerBudgetAlert(trip, totalBudget, totalSpent);
            }
        } catch (Exception ignored) {}

        // 6. Build Category Breakdowns & Identify Top Spending Driver
        List<CategoryExpenseSummaryDTO> categorySummaries = new ArrayList<>();
        ExpenseCategory topCategory = null;
        BigDecimal topAmount = BigDecimal.ZERO;

        for (ExpenseCategory category : ExpenseCategory.values()) {
            CategoryExpenseSummaryDTO catSummary = buildCategorySummary(tripId, budget, category);
            categorySummaries.add(catSummary);

            if (catSummary.getTotalSpent().compareTo(topAmount) > 0) {
                topAmount = catSummary.getTotalSpent();
                topCategory = category;
            }
        }

        // 7. Transaction count and currency
        Long totalTransactions = expenseRepository.countByTripId(tripId);
        String currency = (budget != null && budget.getCurrency() != null) ? budget.getCurrency() : "INR";

        return TripExpenseReportDTO.builder()
                .tripId(trip.getId())
                .tripTitle(trip.getTitle())
                .currency(currency)
                .totalBudget(totalBudget)
                .totalSpent(totalSpent)
                .remainingBudget(remainingBudget)
                .overallPercentageSpent(overallPercentage)
                .overallStatus(overallStatus)
                .topSpendingCategory(topCategory)
                .topCategoryAmount(topAmount)
                .totalTransactions(totalTransactions != null ? totalTransactions : 0L)
                .categorySummaries(categorySummaries)
                .build();
    }

    /**
     * Computes the individual metrics for a single category.
     */
    private CategoryExpenseSummaryDTO buildCategorySummary(Long tripId, Budget budget, ExpenseCategory category) {
        BigDecimal limit = getCategoryLimit(budget, category);
        BigDecimal spent = expenseRepository.getTotalSpentByTripIdAndCategory(tripId, category);
        if (spent == null) {
            spent = BigDecimal.ZERO;
        }

        BigDecimal remaining = limit.subtract(spent);

        // Safe percentage calculation to protect against division by zero
        Double percentageSpent = 0.0;
        if (limit.compareTo(BigDecimal.ZERO) > 0) {
            double raw = (spent.doubleValue() / limit.doubleValue()) * 100.0;
            percentageSpent = Math.round(raw * 10.0) / 10.0;
        }

        // Status Evaluation:
        String status;
        if (limit.compareTo(BigDecimal.ZERO) == 0) {
            status = spent.compareTo(BigDecimal.ZERO) > 0 ? "OVER_BUDGET" : "NORMAL";
        } else if (percentageSpent >= 100.0) {
            status = "OVER_BUDGET";
        } else if (percentageSpent >= 90.0) {
            status = "ABOUT_TO_EXHAUST";
        } else if (percentageSpent >= 80.0) {
            status = "APPROACHING_LIMIT";
        } else {
            status = "NORMAL";
        }

        Long count = expenseRepository.countByTripIdAndCategory(tripId, category);

        return CategoryExpenseSummaryDTO.builder()
                .category(category)
                .allocatedLimit(limit)
                .totalSpent(spent)
                .remainingAmount(remaining)
                .percentageSpent(percentageSpent)
                .status(status)
                .transactionCount(count != null ? count : 0L)
                .build();
    }

    /**
     * Resolves the allocated limit for a given category from the Budget entity.
     */
    private BigDecimal getCategoryLimit(Budget budget, ExpenseCategory category) {
        if (budget == null) {
            return BigDecimal.ZERO;
        }
        return switch (category) {
            case ACCOMMODATION -> budget.getAccommodationLimit() != null ? budget.getAccommodationLimit() : BigDecimal.ZERO;
            case TRANSPORTATION -> budget.getTransportationLimit() != null ? budget.getTransportationLimit() : BigDecimal.ZERO;
            case FOOD -> budget.getFoodLimit() != null ? budget.getFoodLimit() : BigDecimal.ZERO;
            case ACTIVITIES -> budget.getActivitiesLimit() != null ? budget.getActivitiesLimit() : BigDecimal.ZERO;
            case SHOPPING, MISCELLANEOUS -> budget.getMiscLimit() != null ? budget.getMiscLimit() : BigDecimal.ZERO;
        };
    }

    /**
     * Verifies that the trip exists and the requesting user is authorized to view its reports.
     */
    private Trip getTripAndVerifyAccess(Long tripId, String userEmail) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        boolean hasAccess = trip.getOwner().getId().equals(user.getId());
        if (!hasAccess) {
            Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(tripId);
            if (groupOpt.isPresent()) {
                hasAccess = groupMemberRepository.existsByGroupIdAndUserId(groupOpt.get().getId(), user.getId());
            }
        }

        if (!hasAccess) {
            throw new RuntimeException("Access denied: You are not authorized to view reports for this trip");
        }

        return trip;
    }
}
