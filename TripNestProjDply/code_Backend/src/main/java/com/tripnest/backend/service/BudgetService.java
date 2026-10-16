package com.tripnest.backend.service;

import com.tripnest.backend.dto.budget.BudgetRequest;
import com.tripnest.backend.dto.budget.BudgetResponse;
import com.tripnest.backend.entity.Budget;
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
import java.util.Optional;

/**
 * BudgetService contains the core financial business logic for TripNest.
 * 
 * Responsibilities:
 * 1. Validating category allocations against total budget.
 * 2. Enforcing security so authorized trip owners and group members can alter/view budgets.
 * 3. Handling Upsert logic (Create if absent, Update if present).
 * 4. Computing remaining unallocated amounts for frontend visibility.
 */
@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final ExpenseRepository expenseRepository;
    private final NotificationService notificationService;

    // Constructor injection ensures strong immutability and easy unit testing
    public BudgetService(
            BudgetRepository budgetRepository,
            TripRepository tripRepository,
            UserRepository userRepository,
            GroupMemberRepository groupMemberRepository,
            TravelGroupRepository travelGroupRepository,
            ExpenseRepository expenseRepository,
            NotificationService notificationService) {
        this.budgetRepository = budgetRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.travelGroupRepository = travelGroupRepository;
        this.expenseRepository = expenseRepository;
        this.notificationService = notificationService;
    }

    private boolean hasTripAccess(Trip trip, User user) {
        if (trip.getOwner().getId().equals(user.getId())) {
            return true;
        }
        Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(trip.getId());
        if (groupOpt.isPresent()) {
            return groupMemberRepository.existsByGroupIdAndUserId(groupOpt.get().getId(), user.getId());
        }
        return false;
    }

    /**
     * Create or Update (Upsert) budget for a specific trip.
     * Transactional ensures changes either commit cleanly or roll back completely if an error occurs.
     */
    @Transactional
    public BudgetResponse setOrUpdateBudget(Long tripId, BudgetRequest request, String userEmail) {
        // 1. Fetch Trip & User
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        // 2. Authorization Check: Trip owner or invited group member can set or modify the budget
        if (!hasTripAccess(trip, user)) {
            throw new RuntimeException("Access denied: You are not authorized to modify this trip's budget");
        }

        // 3. Fallback null safety for all category allocations
        BigDecimal accommodation = request.getAccommodationLimit() != null ? request.getAccommodationLimit() : BigDecimal.ZERO;
        BigDecimal transportation = request.getTransportationLimit() != null ? request.getTransportationLimit() : BigDecimal.ZERO;
        BigDecimal food = request.getFoodLimit() != null ? request.getFoodLimit() : BigDecimal.ZERO;
        BigDecimal activities = request.getActivitiesLimit() != null ? request.getActivitiesLimit() : BigDecimal.ZERO;
        BigDecimal shopping = request.getShoppingLimit() != null ? request.getShoppingLimit() : BigDecimal.ZERO;
        BigDecimal misc = request.getMiscLimit() != null ? request.getMiscLimit() : BigDecimal.ZERO;

        // 4. Financial Validation Rule: Sum of categories must NOT exceed Total Budget
        BigDecimal totalAllocated = accommodation
                .add(transportation)
                .add(food)
                .add(activities)
                .add(shopping)
                .add(misc);

        if (totalAllocated.compareTo(request.getTotalBudget()) > 0) {
            throw new IllegalArgumentException(
                    "The sum of category allocations (" + totalAllocated + ") cannot exceed total budget (" + request.getTotalBudget() + ")"
            );
        }

        // 5. Upsert: Look for an existing budget record for this trip
        Budget budget = budgetRepository.findByTripId(tripId)
                .orElseGet(() -> Budget.builder()
                        .trip(trip)
                        .build());

        // Update fields
        budget.setTotalBudget(request.getTotalBudget());
        if (request.getCurrency() != null && !request.getCurrency().trim().isEmpty()) {
            budget.setCurrency(request.getCurrency().trim().toUpperCase());
        }
        budget.setAccommodationLimit(accommodation);
        budget.setTransportationLimit(transportation);
        budget.setFoodLimit(food);
        budget.setActivitiesLimit(activities);
        budget.setShoppingLimit(shopping);
        budget.setMiscLimit(misc);

        // Save entity to database
        Budget savedBudget = budgetRepository.save(budget);

        // Check if spending crossed budget alert threshold (e.g. >= 85% or >= 90%)
        try {
            BigDecimal totalSpent = expenseRepository.getTotalSpentByTripId(tripId);
            notificationService.checkAndTriggerBudgetAlert(trip, savedBudget.getTotalBudget(), totalSpent);
        } catch (Exception ignored) {}

        // Return formatted response
        return mapToResponse(savedBudget);
    }

    /**
     * Retrieve budget details and computed allocations for a trip.
     */
    @Transactional(readOnly = true)
    public BudgetResponse getBudgetByTripId(Long tripId, String userEmail) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        // Check if user has access to trip (owner or invited group member)
        if (!hasTripAccess(trip, user)) {
            throw new RuntimeException("Access denied: You are not authorized to view this trip's budget");
        }

        Budget budget = budgetRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("No budget found for trip with id: " + tripId));

        // Evaluate alert on retrieval (ensures user gets alert if spending is >= 85% / 90%)
        try {
            BigDecimal totalSpent = expenseRepository.getTotalSpentByTripId(tripId);
            notificationService.checkAndTriggerBudgetAlert(trip, budget.getTotalBudget(), totalSpent);
        } catch (Exception ignored) {}

        return mapToResponse(budget);
    }

    /**
     * Delete / Reset budget for a trip.
     */
    @Transactional
    public void deleteBudget(Long tripId, String userEmail) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        if (!hasTripAccess(trip, user)) {
            throw new RuntimeException("Access denied: You are not authorized to delete the budget");
        }

        Budget budget = budgetRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("No budget found to delete for trip with id: " + tripId));

        budgetRepository.delete(budget);
    }

    /**
     * Helper mapper method to convert Budget entity to BudgetResponse DTO.
     * Computes totalAllocated and unallocatedAmount dynamically.
     */
    private BudgetResponse mapToResponse(Budget budget) {
        BigDecimal totalAllocated = budget.getTotalAllocated();
        BigDecimal unallocated = budget.getTotalBudget().subtract(totalAllocated);

        // Ensure unallocated is not negative
        if (unallocated.compareTo(BigDecimal.ZERO) < 0) {
            unallocated = BigDecimal.ZERO;
        }

        return BudgetResponse.builder()
                .id(budget.getId())
                .tripId(budget.getTrip().getId())
                .totalBudget(budget.getTotalBudget())
                .currency(budget.getCurrency())
                .accommodationLimit(budget.getAccommodationLimit())
                .transportationLimit(budget.getTransportationLimit())
                .foodLimit(budget.getFoodLimit())
                .activitiesLimit(budget.getActivitiesLimit())
                .shoppingLimit(budget.getShoppingLimit())
                .miscLimit(budget.getMiscLimit())
                .totalAllocated(totalAllocated)
                .unallocatedAmount(unallocated)
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .build();
    }
}
