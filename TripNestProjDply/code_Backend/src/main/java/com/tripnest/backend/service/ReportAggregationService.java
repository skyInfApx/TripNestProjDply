package com.tripnest.backend.service;

import com.tripnest.backend.dto.expense.ExpenseResponseDTO;
import com.tripnest.backend.dto.report.*;
import com.tripnest.backend.entity.*;
import com.tripnest.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Writer;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ReportAggregationService builds comprehensive trip dossiers, multi-criteria
 * expense summaries, streaming CSV exports, annual travel recaps, and chart datasets.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class ReportAggregationService {

    private final TripRepository tripRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final DocumentVaultRepository documentVaultRepository;
    private final ExpenseReportService expenseReportService;

    /**
     * Master single-trip audit report combining trip info, budget metrics,
     * category breakdowns, document counts, and itemized receipts.
     */
    public TripComprehensiveReportDTO getComprehensiveTripReport(Long tripId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        long durationDays = 1L;
        if (trip.getStartDate() != null && trip.getEndDate() != null) {
            durationDays = ChronoUnit.DAYS.between(trip.getStartDate(), trip.getEndDate()) + 1L;
            if (durationDays <= 0) durationDays = 1L;
        }

        BigDecimal totalBudget = BigDecimal.ZERO;
        Optional<Budget> budgetOpt = budgetRepository.findByTripId(tripId);
        if (budgetOpt.isPresent()) {
            totalBudget = budgetOpt.get().getTotalBudget();
        }

        BigDecimal totalSpent = expenseRepository.getTotalSpentByTripId(tripId);
        if (totalSpent == null) totalSpent = BigDecimal.ZERO;
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
        if (utilizationPercentage < 85.0) {
            healthStatus = "NORMAL";
        } else if (utilizationPercentage <= 100.0) {
            healthStatus = "APPROACHING_LIMIT";
        } else {
            healthStatus = "OVER_BUDGET";
        }

        List<CategoryExpenseSummaryDTO> categoryBreakdown = expenseReportService.getCategorySummaries(tripId, userEmail);

        String topCategory = "NONE";
        BigDecimal maxSpend = BigDecimal.ZERO;
        for (CategoryExpenseSummaryDTO cat : categoryBreakdown) {
            if (cat.getTotalSpent() != null && cat.getTotalSpent().compareTo(maxSpend) > 0) {
                maxSpend = cat.getTotalSpent();
                topCategory = cat.getCategory() != null ? cat.getCategory().name() : "NONE";
            }
        }

        List<Expense> rawExpenses = expenseRepository.findByTripIdOrderByExpenseDateDesc(tripId);
        List<ExpenseResponseDTO> itemizedList = rawExpenses.stream()
                .map(this::mapToExpenseResponseDTO)
                .collect(Collectors.toList());

        List<DocumentVault> docs = documentVaultRepository.findByTripIdOrderByUploadedAtDesc(tripId);
        long docCount = docs != null ? docs.size() : 0L;

        return TripComprehensiveReportDTO.builder()
                .tripId(trip.getId())
                .title(trip.getTitle())
                .destination(trip.getDestination())
                .startDate(trip.getStartDate())
                .endDate(trip.getEndDate())
                .durationDays(durationDays)
                .numberOfTravelers(trip.getNumberOfTravelers())
                .status(trip.getStatus() != null ? trip.getStatus().name() : "PLANNED")
                .totalBudget(totalBudget)
                .totalSpent(totalSpent)
                .remainingBudget(remainingBudget)
                .budgetUtilizationPercentage(utilizationPercentage)
                .budgetHealthStatus(healthStatus)
                .topSpendingCategory(topCategory)
                .totalExpenseCount((long) itemizedList.size())
                .totalDocumentsCount(docCount)
                .categoryBreakdown(categoryBreakdown)
                .itemizedExpenses(itemizedList)
                .build();
    }

    /**
     * Multi-criteria filtered expense search across all trips owned by user or a specific trip.
     */
    public FilteredExpenseReportDTO getFilteredExpenses(
            String userEmail,
            Long tripId,
            LocalDate startDate,
            LocalDate endDate,
            ExpenseCategory category,
            BigDecimal minAmount,
            BigDecimal maxAmount) {

        User user = getUserByEmail(userEmail);
        List<Expense> expenses;

        if (tripId != null) {
            expenses = expenseRepository.findByTripIdOrderByExpenseDateDesc(tripId);
        } else {
            expenses = expenseRepository.findExpensesByOwnerAndDateRange(user.getId(), startDate, endDate);
        }

        List<Expense> filtered = expenses.stream()
                .filter(e -> startDate == null || (e.getExpenseDate() != null && !e.getExpenseDate().isBefore(startDate)))
                .filter(e -> endDate == null || (e.getExpenseDate() != null && !e.getExpenseDate().isAfter(endDate)))
                .filter(e -> category == null || e.getCategory() == category)
                .filter(e -> minAmount == null || e.getAmount().compareTo(minAmount) >= 0)
                .filter(e -> maxAmount == null || e.getAmount().compareTo(maxAmount) <= 0)
                .collect(Collectors.toList());

        BigDecimal total = BigDecimal.ZERO;
        BigDecimal highest = BigDecimal.ZERO;

        for (Expense e : filtered) {
            if (e.getAmount() != null) {
                total = total.add(e.getAmount());
                if (e.getAmount().compareTo(highest) > 0) {
                    highest = e.getAmount();
                }
            }
        }

        BigDecimal average = BigDecimal.ZERO;
        if (!filtered.isEmpty()) {
            average = total.divide(BigDecimal.valueOf(filtered.size()), 2, RoundingMode.HALF_UP);
        }

        List<ExpenseResponseDTO> responseList = filtered.stream()
                .map(this::mapToExpenseResponseDTO)
                .collect(Collectors.toList());

        return FilteredExpenseReportDTO.builder()
                .totalMatchingExpenses((long) filtered.size())
                .totalAmount(total)
                .averageExpenseAmount(average)
                .highestExpenseAmount(highest)
                .expenses(responseList)
                .build();
    }

    /**
     * Streams an RFC 4180 compliant CSV export directly to the writer.
     */
    public void exportExpensesToCsv(String userEmail, Long tripId, Writer writer) throws IOException {
        User user = getUserByEmail(userEmail);
        List<Expense> expenses;

        if (tripId != null) {
            expenses = expenseRepository.findByTripIdOrderByExpenseDateDesc(tripId);
        } else {
            expenses = expenseRepository.findExpensesByOwnerAndDateRange(user.getId(), null, null);
        }

        // CSV Header
        writer.write("Expense ID,Date,Description,Category,Amount,Currency,Payer Name,Payer Email,Trip Title,Destination\n");

        for (Expense e : expenses) {
            StringBuilder sb = new StringBuilder();
            sb.append(e.getId()).append(",");
            sb.append(e.getExpenseDate() != null ? e.getExpenseDate().toString() : "").append(",");
            sb.append(escapeCsvField(e.getDescription())).append(",");
            sb.append(e.getCategory() != null ? e.getCategory().name() : "").append(",");
            sb.append(e.getAmount() != null ? e.getAmount().toString() : "0.00").append(",");
            sb.append(e.getCurrency() != null ? e.getCurrency() : "INR").append(",");
            sb.append(escapeCsvField(e.getPaidBy() != null ? e.getPaidBy().getName() : "")).append(",");
            sb.append(escapeCsvField(e.getPaidBy() != null ? e.getPaidBy().getEmail() : "")).append(",");
            sb.append(escapeCsvField(e.getTrip() != null ? e.getTrip().getTitle() : "")).append(",");
            sb.append(escapeCsvField(e.getTrip() != null ? e.getTrip().getDestination() : "")).append("\n");
            writer.write(sb.toString());
        }
        writer.flush();
    }

    /**
     * Annual travel summary (Year in Review) for a traveler.
     */
    public YearlyTravelSummaryDTO getYearlyTravelSummary(String userEmail, int year) {
        User user = getUserByEmail(userEmail);
        String yearStr = String.valueOf(year);

        List<Trip> yearTrips = tripRepository.findTripsByOwnerInYear(user.getId(), yearStr);
        long tripCount = yearTrips.size();

        long daysTraveled = 0L;
        Set<String> destinationsSet = new HashSet<>();
        String mostExpensiveTitle = "None";
        BigDecimal mostExpensiveAmount = BigDecimal.ZERO;

        for (Trip t : yearTrips) {
            if (t.getStartDate() != null && t.getEndDate() != null) {
                long d = ChronoUnit.DAYS.between(t.getStartDate(), t.getEndDate()) + 1L;
                if (d > 0) daysTraveled += d;
            }
            if (t.getDestination() != null) {
                destinationsSet.add(t.getDestination().trim().toLowerCase());
            }

            BigDecimal tripSpend = expenseRepository.getTotalSpentByTripId(t.getId());
            if (tripSpend != null && tripSpend.compareTo(mostExpensiveAmount) > 0) {
                mostExpensiveAmount = tripSpend;
                mostExpensiveTitle = t.getTitle();
            }
        }

        BigDecimal totalYearSpend = expenseRepository.getTotalSpentByOwnerInYear(user.getId(), yearStr);
        if (totalYearSpend == null) totalYearSpend = BigDecimal.ZERO;

        // Monthly progression for 12 months
        List<Object[]> rawMonthly = expenseRepository.getMonthlySpendingByOwnerInYear(user.getId(), yearStr);
        Map<String, Double> monthMap = new HashMap<>();
        if (rawMonthly != null) {
            for (Object[] row : rawMonthly) {
                String mNum = row[0] != null ? row[0].toString() : "";
                BigDecimal amt = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
                monthMap.put(mNum, amt.doubleValue());
            }
        }

        List<String> labels = List.of("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
        List<Double> dataPoints = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            String key = String.format("%02d", i);
            dataPoints.add(monthMap.getOrDefault(key, 0.0));
        }

        ChartDatasetDTO dataset = ChartDatasetDTO.builder()
                .label(year + " Monthly Spend (INR)")
                .data(dataPoints)
                .build();

        ChartSeriesDTO chartSeries = ChartSeriesDTO.builder()
                .chartTitle(year + " Annual Spending Progression")
                .labels(labels)
                .datasets(List.of(dataset))
                .build();

        return YearlyTravelSummaryDTO.builder()
                .year(year)
                .totalTripsTaken(tripCount)
                .totalDaysTraveled(daysTraveled)
                .totalSpent(totalYearSpend)
                .uniqueDestinationsVisited((long) destinationsSet.size())
                .mostExpensiveTripTitle(mostExpensiveTitle)
                .mostExpensiveTripAmount(mostExpensiveAmount)
                .favoriteCategory("ALL")
                .monthlySpendingChart(chartSeries)
                .build();
    }

    /**
     * Pre-frames category spending for Chart.js Donut/Pie graphs.
     */
    public ChartSeriesDTO getCategoryDistributionChart(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<Object[]> rawList = expenseRepository.getCategorySpendingByOwnerId(user.getId());

        List<String> labels = new ArrayList<>();
        List<Double> data = new ArrayList<>();
        List<String> colors = List.of(
                "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6B7280"
        );

        if (rawList != null) {
            for (Object[] row : rawList) {
                if (row[0] == null) continue;
                String cat = (row[0] instanceof ExpenseCategory) ?
                        ((ExpenseCategory) row[0]).name() : row[0].toString();
                BigDecimal amt = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
                labels.add(cat);
                data.add(amt.doubleValue());
            }
        }

        ChartDatasetDTO dataset = ChartDatasetDTO.builder()
                .label("Expenses by Category")
                .data(data)
                .backgroundColor(colors.subList(0, Math.min(colors.size(), labels.size())))
                .build();

        return ChartSeriesDTO.builder()
                .chartTitle("Expense Category Breakdown")
                .labels(labels)
                .datasets(List.of(dataset))
                .build();
    }

    /**
     * Pre-frames 12-month spending for Chart.js Bar/Line graphs.
     */
    public ChartSeriesDTO getMonthlySpendingChart(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<Object[]> rawList = expenseRepository.getMonthlySpendingTrendsByOwnerId(user.getId());

        List<String> labels = new ArrayList<>();
        List<Double> data = new ArrayList<>();

        if (rawList != null) {
            // Reverse so oldest month is first (chronological order)
            for (int i = rawList.size() - 1; i >= 0; i--) {
                Object[] row = rawList.get(i);
                String month = row[0] != null ? row[0].toString() : "";
                BigDecimal amt = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
                labels.add(month);
                data.add(amt.doubleValue());
            }
        }

        ChartDatasetDTO dataset = ChartDatasetDTO.builder()
                .label("Monthly Expenditure (INR)")
                .data(data)
                .build();

        return ChartSeriesDTO.builder()
                .chartTitle("12-Month Spending Progression")
                .labels(labels)
                .datasets(List.of(dataset))
                .build();
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private ExpenseResponseDTO mapToExpenseResponseDTO(Expense expense) {
        return ExpenseResponseDTO.builder()
                .id(expense.getId())
                .tripId(expense.getTrip() != null ? expense.getTrip().getId() : null)
                .tripTitle(expense.getTrip() != null ? expense.getTrip().getTitle() : null)
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .currency(expense.getCurrency())
                .category(expense.getCategory())
                .expenseDate(expense.getExpenseDate())
                .entryDate(expense.getEntryDate())
                .paidByUserId(expense.getPaidBy() != null ? expense.getPaidBy().getId() : null)
                .paidByName(expense.getPaidBy() != null ? expense.getPaidBy().getName() : null)
                .paidByEmail(expense.getPaidBy() != null ? expense.getPaidBy().getEmail() : null)
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }

    private String escapeCsvField(String field) {
        if (field == null) return "";
        if (field.contains(",") || field.contains("\"") || field.contains("\n")) {
            return "\"" + field.replace("\"", "\"\"") + "\"";
        }
        return field;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
}
