package com.tripnest.backend.controller;

import com.tripnest.backend.dto.expense.ExpenseRequestDTO;
import com.tripnest.backend.dto.expense.ExpenseResponseDTO;
import com.tripnest.backend.entity.ExpenseCategory;
import com.tripnest.backend.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * ExpenseController exposes RESTful API endpoints for recording and managing trip expenses.
 * Base Path: /api/trips/{tripId}/expenses
 * 
 * Key Endpoints:
 * 1. POST   /api/trips/{tripId}/expenses                -> Record a new expense
 * 2. GET    /api/trips/{tripId}/expenses                -> List all expenses (with optional ?category= filter)
 * 3. GET    /api/trips/{tripId}/expenses/{expenseId}    -> Retrieve single expense by ID
 * 4. PUT    /api/trips/{tripId}/expenses/{expenseId}    -> Update an existing expense
 * 5. DELETE /api/trips/{tripId}/expenses/{expenseId}    -> Delete an expense
 * 6. GET    /api/trips/{tripId}/expenses/total-spent    -> Total spent aggregate summary
 */
@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
@CrossOrigin
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    /**
     * Record a new expense for a trip.
     */
    @PostMapping
    public ResponseEntity<ExpenseResponseDTO> createExpense(
            @PathVariable Long tripId,
            @Valid @RequestBody ExpenseRequestDTO requestDTO,
            Authentication authentication) {

        String userEmail = authentication.getName();
        ExpenseResponseDTO response = expenseService.createExpense(tripId, requestDTO, userEmail);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieve all expenses for a trip, with optional category filtering.
     * Example 1: GET /api/trips/7/expenses
     * Example 2: GET /api/trips/7/expenses?category=FOOD
     */
    @GetMapping
    public ResponseEntity<List<ExpenseResponseDTO>> getExpenses(
            @PathVariable Long tripId,
            @RequestParam(required = false) ExpenseCategory category,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<ExpenseResponseDTO> expenses;

        if (category != null) {
            expenses = expenseService.getExpensesByCategory(tripId, category, userEmail);
        } else {
            expenses = expenseService.getExpensesByTrip(tripId, userEmail);
        }

        return ResponseEntity.ok(expenses);
    }

    /**
     * Retrieve a specific expense by ID.
     */
    @GetMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponseDTO> getExpenseById(
            @PathVariable Long tripId,
            @PathVariable Long expenseId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        ExpenseResponseDTO response = expenseService.getExpenseById(tripId, expenseId, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Update an existing expense.
     */
    @PutMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponseDTO> updateExpense(
            @PathVariable Long tripId,
            @PathVariable Long expenseId,
            @Valid @RequestBody ExpenseRequestDTO requestDTO,
            Authentication authentication) {

        String userEmail = authentication.getName();
        ExpenseResponseDTO response = expenseService.updateExpense(tripId, expenseId, requestDTO, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete an expense by ID.
     */
    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable Long tripId,
            @PathVariable Long expenseId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        expenseService.deleteExpense(tripId, expenseId, userEmail);

        return ResponseEntity.noContent().build();
    }

    /**
     * Retrieve total expenditure for a trip.
     * Handy for dashboard overview cards and budget gauges!
     */
    @GetMapping("/total-spent")
    public ResponseEntity<Map<String, Object>> getTotalSpent(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        BigDecimal totalSpent = expenseService.getTotalSpentForTrip(tripId, userEmail);

        return ResponseEntity.ok(Map.of(
                "tripId", tripId,
                "totalSpent", totalSpent
        ));
    }
}
