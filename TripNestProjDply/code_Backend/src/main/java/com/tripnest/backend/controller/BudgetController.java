package com.tripnest.backend.controller;

import com.tripnest.backend.dto.budget.BudgetRequest;
import com.tripnest.backend.dto.budget.BudgetResponse;
import com.tripnest.backend.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * BudgetController exposes RESTful API endpoints for managing trip budgets.
 * Base Path: /api/trips/{tripId}/budget
 * 
 * Key Endpoints:
 * 1. POST   /api/trips/{tripId}/budget  -> Set or update budget (Upsert)
 * 2. GET    /api/trips/{tripId}/budget  -> Retrieve trip budget with computed metrics
 * 3. DELETE /api/trips/{tripId}/budget  -> Reset/delete trip budget
 */
@RestController
@RequestMapping({"/api/trips/{tripId}/budget", "/api/trips/{tripId}/budgets"})
@CrossOrigin
public class BudgetController {

    private final BudgetService budgetService;

    // Constructor injection
    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    /**
     * Set or update (upsert) the budget for a trip.
     * Supports both POST and PUT for seamless compatibility.
     * 
     * @param tripId ID of the trip in the URL path
     * @param request Validated JSON payload containing totalBudget & category allocations
     * @param authentication Authenticated user principal extracted from the JWT token
     * @return 200 OK or 201 CREATED with the saved BudgetResponse
     */
    @RequestMapping(method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<BudgetResponse> setOrUpdateBudget(
            @PathVariable Long tripId,
            @Valid @RequestBody BudgetRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        BudgetResponse response = budgetService.setOrUpdateBudget(tripId, request, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieve the budget for a trip.
     * 
     * @param tripId ID of the trip
     * @param authentication Authenticated user principal
     * @return 200 OK with the BudgetResponse
     */
    @GetMapping
    public ResponseEntity<BudgetResponse> getBudget(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        BudgetResponse response = budgetService.getBudgetByTripId(tripId, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete or reset the budget for a trip.
     * 
     * @param tripId ID of the trip
     * @param authentication Authenticated user principal
     * @return 204 NO_CONTENT on successful deletion
     */
    @DeleteMapping
    public ResponseEntity<Void> deleteBudget(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        budgetService.deleteBudget(tripId, userEmail);

        return ResponseEntity.noContent().build();
    }
}
