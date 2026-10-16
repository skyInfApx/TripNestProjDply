package com.tripnest.backend.controller;

import com.tripnest.backend.dto.report.ChartSeriesDTO;
import com.tripnest.backend.dto.report.FilteredExpenseReportDTO;
import com.tripnest.backend.dto.report.TripComprehensiveReportDTO;
import com.tripnest.backend.dto.report.YearlyTravelSummaryDTO;
import com.tripnest.backend.entity.ExpenseCategory;
import com.tripnest.backend.service.ReportAggregationService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * ReportController exposes RESTful endpoints for comprehensive trip dossiers,
 * dynamic multi-criteria expense filtering, RFC 4180 streaming CSV exports,
 * annual travel recaps, and chart-ready pre-aggregated datasets.
 * 
 * Base Path: /api/reports
 */
@RestController
@RequestMapping("/api/reports")
@CrossOrigin
@RequiredArgsConstructor
public class ReportController {

    private final ReportAggregationService reportAggregationService;

    /**
     * Master single-trip comprehensive audit report.
     */
    @GetMapping("/trip/{tripId}/comprehensive")
    public ResponseEntity<TripComprehensiveReportDTO> getComprehensiveTripReport(
            @PathVariable Long tripId,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(reportAggregationService.getComprehensiveTripReport(tripId, email));
    }

    /**
     * Multi-criteria filtered expense search across all trips or a specific trip.
     */
    @GetMapping("/expenses/filtered")
    public ResponseEntity<FilteredExpenseReportDTO> getFilteredExpenses(
            @RequestParam(required = false) Long tripId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) ExpenseCategory category,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(reportAggregationService.getFilteredExpenses(
                email, tripId, startDate, endDate, category, minAmount, maxAmount
        ));
    }

    /**
     * Streams an RFC 4180 compliant CSV file of user expenses for Excel / Google Sheets export.
     */
    @GetMapping("/expenses/export/csv")
    public void exportExpensesToCsv(
            @RequestParam(required = false) Long tripId,
            HttpServletResponse response,
            Authentication authentication) throws IOException {

        response.setContentType("text/csv; charset=UTF-8");
        String filename = (tripId != null) ? "trip-" + tripId + "-expenses.csv" : "tripnest-all-expenses.csv";
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");

        String email = authentication.getName();
        reportAggregationService.exportExpensesToCsv(email, tripId, response.getWriter());
    }

    /**
     * Annual travel recap report (Year in Review) with monthly spending progression.
     */
    @GetMapping("/annual-summary")
    public ResponseEntity<YearlyTravelSummaryDTO> getAnnualSummary(
            @RequestParam(defaultValue = "2026") int year,
            Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(reportAggregationService.getYearlyTravelSummary(email, year));
    }

    /**
     * Pre-framed category spending feed for Chart.js Donut graphs.
     */
    @GetMapping("/charts/category-distribution")
    public ResponseEntity<ChartSeriesDTO> getCategoryDistributionChart(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(reportAggregationService.getCategoryDistributionChart(email));
    }

    /**
     * Pre-framed 12-month spending progression for Chart.js Bar/Line graphs.
     */
    @GetMapping("/charts/monthly-spending")
    public ResponseEntity<ChartSeriesDTO> getMonthlySpendingChart(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(reportAggregationService.getMonthlySpendingChart(email));
    }
}
