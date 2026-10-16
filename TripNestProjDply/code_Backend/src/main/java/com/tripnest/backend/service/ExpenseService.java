package com.tripnest.backend.service;

import com.tripnest.backend.dto.expense.ExpenseRequestDTO;
import com.tripnest.backend.dto.expense.ExpenseResponseDTO;
import com.tripnest.backend.entity.Expense;
import com.tripnest.backend.entity.ExpenseCategory;
import com.tripnest.backend.entity.GroupMember;
import com.tripnest.backend.entity.NotificationType;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * ExpenseService handles business rules and transaction logic for trip expenses.
 * 
 * Responsibilities:
 * 1. Trip access verification (authorizes traveler and group member permissions).
 * 2. Intelligent Payer Assignment (defaults to logged-in user if paidBy is omitted).
 * 3. Cross-resource validation (ensures an expense belongs to the correct trip).
 * 4. Rich DTO mapping (attaches payer names and trip titles).
 */
@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final BudgetRepository budgetRepository;
    private final NotificationService notificationService;

    public ExpenseService(
            ExpenseRepository expenseRepository,
            TripRepository tripRepository,
            UserRepository userRepository,
            GroupMemberRepository groupMemberRepository,
            TravelGroupRepository travelGroupRepository,
            BudgetRepository budgetRepository,
            NotificationService notificationService) {
        this.expenseRepository = expenseRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.travelGroupRepository = travelGroupRepository;
        this.budgetRepository = budgetRepository;
        this.notificationService = notificationService;
    }

    // =========================================================================
    // 1. CREATE EXPENSE
    // =========================================================================
    @Transactional
    public ExpenseResponseDTO createExpense(Long tripId, ExpenseRequestDTO request, String userEmail) {
        Trip trip = getTripAndVerifyAccess(tripId, userEmail);
        User currentUser = getUser(userEmail);

        // Intelligent Payer Resolution:
        // If client provided a specific paidByUserId (e.g., traveling in a group), use that.
        // If omitted, default to the currently logged-in user!
        User payer = currentUser;
        if (request.getPaidByUserId() != null) {
            payer = userRepository.findById(request.getPaidByUserId())
                    .orElseThrow(() -> new RuntimeException("Payer user not found with id: " + request.getPaidByUserId()));
        }

        LocalDate entryDate = request.getEntryDate() != null ? request.getEntryDate() : LocalDate.now();

        Expense expense = Expense.builder()
                .trip(trip)
                .paidBy(payer)
                .description(request.getDescription().trim())
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency().trim().toUpperCase() : "INR")
                .category(request.getCategory())
                .expenseDate(request.getExpenseDate())
                .entryDate(entryDate)
                .build();

        Expense saved = expenseRepository.save(expense);
        evaluateBudgetAlert(trip);

        // Dispatch in-app notification to bell
        try {
            String title = "🧾 New Expense Logged: " + (saved.getDescription() != null ? saved.getDescription() : "Expense");
            String message = String.format("%s %,.2f logged under %s for %s.",
                    saved.getCurrency() != null ? saved.getCurrency() : "₹",
                    saved.getAmount() != null ? saved.getAmount().doubleValue() : 0.0,
                    saved.getCategory() != null ? saved.getCategory().name() : "General",
                    trip.getDestination());

            Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(trip.getId());
            if (groupOpt.isPresent()) {
                List<GroupMember> members = groupMemberRepository.findByGroupId(groupOpt.get().getId());
                for (GroupMember member : members) {
                    notificationService.sendNotification(
                            member.getUser(),
                            title,
                            message,
                            NotificationType.EXPENSE_SPLIT,
                            "EXPENSE",
                            trip.getId()
                    );
                }
            } else {
                notificationService.sendNotification(
                        trip.getOwner(),
                        title,
                        message,
                        NotificationType.EXPENSE_SPLIT,
                        "EXPENSE",
                        trip.getId()
                );
            }
        } catch (Exception ignored) {}

        return mapToResponseDTO(saved);
    }

    // =========================================================================
    // 2. GET ALL EXPENSES FOR A TRIP
    // =========================================================================
    @Transactional(readOnly = true)
    public List<ExpenseResponseDTO> getExpensesByTrip(Long tripId, String userEmail) {
        getTripAndVerifyAccess(tripId, userEmail);

        return expenseRepository.findByTripIdOrderByExpenseDateDesc(tripId)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // 3. GET SINGLE EXPENSE BY ID
    // =========================================================================
    @Transactional(readOnly = true)
    public ExpenseResponseDTO getExpenseById(Long tripId, Long expenseId, String userEmail) {
        getTripAndVerifyAccess(tripId, userEmail);

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with id: " + expenseId));

        validateExpenseBelongsToTrip(expense, tripId);
        return mapToResponseDTO(expense);
    }

    // =========================================================================
    // 4. FILTER EXPENSES BY CATEGORY
    // =========================================================================
    @Transactional(readOnly = true)
    public List<ExpenseResponseDTO> getExpensesByCategory(Long tripId, ExpenseCategory category, String userEmail) {
        getTripAndVerifyAccess(tripId, userEmail);

        return expenseRepository.findByTripIdAndCategory(tripId, category)
                .stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // 5. UPDATE EXPENSE
    // =========================================================================
    @Transactional
    public ExpenseResponseDTO updateExpense(Long tripId, Long expenseId, ExpenseRequestDTO request, String userEmail) {
        getTripAndVerifyAccess(tripId, userEmail);

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with id: " + expenseId));

        validateExpenseBelongsToTrip(expense, tripId);

        // Update fields
        expense.setDescription(request.getDescription().trim());
        expense.setAmount(request.getAmount());
        if (request.getCurrency() != null && !request.getCurrency().trim().isEmpty()) {
            expense.setCurrency(request.getCurrency().trim().toUpperCase());
        }
        expense.setCategory(request.getCategory());
        expense.setExpenseDate(request.getExpenseDate());
        if (request.getEntryDate() != null) {
            expense.setEntryDate(request.getEntryDate());
        }

        if (request.getPaidByUserId() != null) {
            User payer = userRepository.findById(request.getPaidByUserId())
                    .orElseThrow(() -> new RuntimeException("Payer user not found with id: " + request.getPaidByUserId()));
            expense.setPaidBy(payer);
        }

        Expense updated = expenseRepository.save(expense);
        evaluateBudgetAlert(updated.getTrip());
        return mapToResponseDTO(updated);
    }

    // =========================================================================
    // 6. DELETE EXPENSE
    // =========================================================================
    @Transactional
    public void deleteExpense(Long tripId, Long expenseId, String userEmail) {
        getTripAndVerifyAccess(tripId, userEmail);

        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with id: " + expenseId));

        validateExpenseBelongsToTrip(expense, tripId);
        expenseRepository.delete(expense);
    }

    // =========================================================================
    // 7. TOTAL SPENT QUERY (Bridge to Budget & Analytics)
    // =========================================================================
    @Transactional(readOnly = true)
    public BigDecimal getTotalSpentForTrip(Long tripId, String userEmail) {
        getTripAndVerifyAccess(tripId, userEmail);
        return expenseRepository.getTotalSpentByTripId(tripId);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    private void evaluateBudgetAlert(Trip trip) {
        if (trip == null || trip.getId() == null) return;
        try {
            budgetRepository.findByTripId(trip.getId()).ifPresent(budget -> {
                if (budget.getTotalBudget() != null && budget.getTotalBudget().compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal totalSpent = expenseRepository.getTotalSpentByTripId(trip.getId());
                    notificationService.checkAndTriggerBudgetAlert(trip, budget.getTotalBudget(), totalSpent);
                }
            });
        } catch (Exception ignored) {}
    }

    private Trip getTripAndVerifyAccess(Long tripId, String userEmail) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        User user = getUser(userEmail);

        boolean hasAccess = trip.getOwner().getId().equals(user.getId());
        if (!hasAccess) {
            Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(tripId);
            if (groupOpt.isPresent()) {
                hasAccess = groupMemberRepository.existsByGroupIdAndUserId(groupOpt.get().getId(), user.getId());
            }
        }

        if (!hasAccess) {
            throw new RuntimeException("Access denied: You are not authorized for this trip");
        }

        return trip;
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    private void validateExpenseBelongsToTrip(Expense expense, Long tripId) {
        if (!expense.getTrip().getId().equals(tripId)) {
            throw new RuntimeException("Expense with id " + expense.getId() + " does not belong to trip " + tripId);
        }
    }

    private ExpenseResponseDTO mapToResponseDTO(Expense expense) {
        LocalDate resolvedEntryDate = expense.getEntryDate() != null
                ? expense.getEntryDate()
                : (expense.getCreatedAt() != null ? expense.getCreatedAt().toLocalDate() : LocalDate.now());

        return ExpenseResponseDTO.builder()
                .id(expense.getId())
                .tripId(expense.getTrip().getId())
                .tripTitle(expense.getTrip().getTitle())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .currency(expense.getCurrency())
                .category(expense.getCategory())
                .expenseDate(expense.getExpenseDate())
                .entryDate(resolvedEntryDate)
                .paidByUserId(expense.getPaidBy().getId())
                .paidByName(expense.getPaidBy().getName())
                .paidByEmail(expense.getPaidBy().getEmail())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }
}
