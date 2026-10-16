package com.tripnest.backend.controller;

import com.tripnest.backend.dto.split.DebtSettlementDTO;
import com.tripnest.backend.dto.split.ExpenseSplitRequest;
import com.tripnest.backend.dto.split.ExpenseSplitResponse;
import com.tripnest.backend.dto.split.MemberContributionDTO;
import com.tripnest.backend.service.ExpenseSplitService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * ExpenseSplitController exposes RESTful endpoints for collaborative expense splitting,
 * member contribution reporting, personal debt tracking, and Greedy Debt Minimization settlements.
 * 
 * Endpoints:
 * 1. POST  /api/expenses/{expenseId}/split             -> Split an expense (EQUAL or CUSTOM)
 * 2. GET   /api/expenses/{expenseId}/splits            -> Get all splits for an expense
 * 3. GET   /api/trips/{tripId}/splits                  -> Get all splits for an entire trip
 * 4. GET   /api/trips/{tripId}/splits/my-debts         -> Get active debts for the logged-in user
 * 5. PUT   /api/splits/{splitId}/settle                -> Settle a specific split share
 * 6. GET   /api/trips/{tripId}/splits/contributions    -> Member contribution summaries (paid vs fair share)
 * 7. GET   /api/trips/{tripId}/debts/settle            -> Greedy Debt Minimization ("Who owes whom how much")
 */
@RestController
@CrossOrigin
public class ExpenseSplitController {

    private final ExpenseSplitService expenseSplitService;

    public ExpenseSplitController(ExpenseSplitService expenseSplitService) {
        this.expenseSplitService = expenseSplitService;
    }

    /**
     * Split an expense equally or with custom amounts among companions.
     * Aliases supported: /api/expenses/{expenseId}/split and /api/expenses/{expenseId}/splits
     */
    @PostMapping({"/api/expenses/{expenseId}/split", "/api/expenses/{expenseId}/splits"})
    public ResponseEntity<List<ExpenseSplitResponse>> splitExpense(
            @PathVariable Long expenseId,
            @Valid @RequestBody ExpenseSplitRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<ExpenseSplitResponse> responses = expenseSplitService.splitExpense(expenseId, request, userEmail);
        return ResponseEntity.status(HttpStatus.CREATED).body(responses);
    }

    /**
     * Retrieve all split shares for a specific expense.
     */
    @GetMapping("/api/expenses/{expenseId}/splits")
    public ResponseEntity<List<ExpenseSplitResponse>> getSplitsByExpense(
            @PathVariable Long expenseId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<ExpenseSplitResponse> responses = expenseSplitService.getSplitsByExpense(expenseId, userEmail);
        return ResponseEntity.ok(responses);
    }

    /**
     * Retrieve all split records for an entire trip.
     */
    @GetMapping("/api/trips/{tripId}/splits")
    public ResponseEntity<List<ExpenseSplitResponse>> getSplitsByTrip(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<ExpenseSplitResponse> responses = expenseSplitService.getSplitsByTrip(tripId, userEmail);
        return ResponseEntity.ok(responses);
    }

    /**
     * Retrieve unsettled debts for the currently authenticated user in this trip.
     */
    @GetMapping("/api/trips/{tripId}/splits/my-debts")
    public ResponseEntity<List<ExpenseSplitResponse>> getMyPendingDebts(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<ExpenseSplitResponse> responses = expenseSplitService.getMyPendingDebts(tripId, userEmail);
        return ResponseEntity.ok(responses);
    }

    /**
     * Settle a specific split debt (e.g. companion confirmed UPI payment).
     */
    @PutMapping("/api/splits/{splitId}/settle")
    public ResponseEntity<ExpenseSplitResponse> settleSplit(
            @PathVariable Long splitId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        ExpenseSplitResponse response = expenseSplitService.settleSplit(splitId, userEmail);
        return ResponseEntity.ok(response);
    }

    /**
     * Member Contribution Financial Summary:
     * Returns total paid, fair share, net balance, and status (RECEIVES / OWES / SETTLED) for each traveler.
     */
    @GetMapping("/api/trips/{tripId}/splits/contributions")
    public ResponseEntity<List<MemberContributionDTO>> getMemberContributions(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<MemberContributionDTO> contributions = expenseSplitService.getMemberContributions(tripId, userEmail);
        return ResponseEntity.ok(contributions);
    }

    /**
     * Greedy Debt Minimization Algorithm:
     * Simplifies the entire trip debt graph into the minimum number of direct settlement transfers.
     * Aliases supported: /api/trips/{tripId}/debts/settle and /api/trips/{tripId}/splits/settlements
     */
    @GetMapping({"/api/trips/{tripId}/debts/settle", "/api/trips/{tripId}/splits/settlements"})
    public ResponseEntity<List<DebtSettlementDTO>> getOptimizedSettlements(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<DebtSettlementDTO> settlements = expenseSplitService.calculateOptimizedSettlements(tripId, userEmail);
        return ResponseEntity.ok(settlements);
    }
}
