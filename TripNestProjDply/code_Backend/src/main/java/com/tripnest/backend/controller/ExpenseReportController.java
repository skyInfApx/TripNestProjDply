package com.tripnest.backend.controller;

import com.tripnest.backend.dto.report.CategoryExpenseSummaryDTO;
import com.tripnest.backend.dto.report.TripExpenseReportDTO;
import com.tripnest.backend.service.ExpenseReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ExpenseReportController exposes RESTful endpoints for retrieving financial analytics,
 * category breakdowns, budget burn rates, and executive reports for a trip.
 * 
 * Base Path: /api/trips/{tripId}/reports
 * 
 * Endpoints:
 * 1. GET /api/trips/{tripId}/reports                -> Master Financial Report (TripExpenseReportDTO)
 * 2. GET /api/trips/{tripId}/reports/full           -> Master Financial Report (TripExpenseReportDTO)
 * 3. GET /api/trips/{tripId}/reports/expense-summary-> Master Financial Report (Team-B Excel alignment)
 * 4. GET /api/trips/{tripId}/reports/categories     -> Category-wise breakdown list (List<CategoryExpenseSummaryDTO>)
 */
@RestController
@RequestMapping("/api/trips/{tripId}/reports")
@CrossOrigin
public class ExpenseReportController {

    private final ExpenseReportService expenseReportService;

    public ExpenseReportController(ExpenseReportService expenseReportService) {
        this.expenseReportService = expenseReportService;
    }

    /**
     * Retrieve the comprehensive master financial report for a trip.
     * Contains high-level KPIs, risk flags, top spending category, and all category breakdowns.
     * 
     * @param tripId The trip ID from the URL path
     * @param authentication Authenticated traveler extracted from JWT
     * @return 200 OK with TripExpenseReportDTO
     */
    @GetMapping
    public ResponseEntity<TripExpenseReportDTO> getFullReport(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        TripExpenseReportDTO report = expenseReportService.getTripExpenseReport(tripId, userEmail);

        return ResponseEntity.ok(report);
    }

    /**
     * Alias endpoint: /api/trips/{tripId}/reports/full
     */
    @GetMapping("/full")
    public ResponseEntity<TripExpenseReportDTO> getFullReportExplicit(
            @PathVariable Long tripId,
            Authentication authentication) {

        return getFullReport(tripId, authentication);
    }

    /**
     * Alias endpoint: /api/trips/{tripId}/reports/expense-summary
     * Specifically aligns with Team-B Tracker & Mentor guidelines.
     */
    @GetMapping("/expense-summary")
    public ResponseEntity<TripExpenseReportDTO> getExpenseSummaryReport(
            @PathVariable Long tripId,
            Authentication authentication) {

        return getFullReport(tripId, authentication);
    }

    /**
     * Retrieve only the category-wise spending summaries for a trip.
     * Ideal for rendering pie charts, spending distribution, and category progress bars.
     * 
     * @param tripId The trip ID from the URL path
     * @param authentication Authenticated traveler extracted from JWT
     * @return 200 OK with List of CategoryExpenseSummaryDTO
     */
    @GetMapping("/categories")
    public ResponseEntity<List<CategoryExpenseSummaryDTO>> getCategorySummaries(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<CategoryExpenseSummaryDTO> summaries = expenseReportService.getCategorySummaries(tripId, userEmail);

        return ResponseEntity.ok(summaries);
    }
}
