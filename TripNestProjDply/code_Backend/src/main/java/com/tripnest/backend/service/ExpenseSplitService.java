package com.tripnest.backend.service;

import com.tripnest.backend.dto.split.DebtSettlementDTO;
import com.tripnest.backend.dto.split.ExpenseSplitRequest;
import com.tripnest.backend.dto.split.ExpenseSplitResponse;
import com.tripnest.backend.dto.split.MemberContributionDTO;
import com.tripnest.backend.entity.*;
import com.tripnest.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * ExpenseSplitService is the financial settlement and collaboration engine of TripNest.
 * 
 * Implements:
 * 1. Equal & Custom Expense Splitting.
 * 2. Penny Split Balancing: Exact base-10 paise distribution (e.g. 100/3 = 33.34 + 33.33 + 33.33).
 * 3. Member Contribution Summaries (Total Paid, Fair Share, Net Balance, Status).
 * 4. Greedy Debt Minimization Algorithm (Cash Flow Simplification from O(N^2) to at most N-1 transactions).
 * 5. Direct Split Settlements (Settling individual share debts).
 * 6. Dynamic Recalculation & Cleanup on Expense updates.
 */
@Service
@Transactional
public class ExpenseSplitService {

    private final ExpenseSplitRepository expenseSplitRepository;
    private final ExpenseRepository expenseRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final TravelGroupRepository travelGroupRepository;
    private final GroupMemberRepository groupMemberRepository;

    public ExpenseSplitService(
            ExpenseSplitRepository expenseSplitRepository,
            ExpenseRepository expenseRepository,
            TripRepository tripRepository,
            UserRepository userRepository,
            TravelGroupRepository travelGroupRepository,
            GroupMemberRepository groupMemberRepository) {
        this.expenseSplitRepository = expenseSplitRepository;
        this.expenseRepository = expenseRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.travelGroupRepository = travelGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
    }

    // =========================================================================
    // 1. SPLIT EXPENSE (EQUAL OR CUSTOM WITH PENNY SPLIT BALANCING)
    // =========================================================================
    public List<ExpenseSplitResponse> splitExpense(Long expenseId, ExpenseSplitRequest request, String userEmail) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with id: " + expenseId));

        verifyTripAccess(expense.getTrip().getId(), userEmail);

        // Delete any pre-existing splits for this expense to allow clean re-splitting/editing
        expenseSplitRepository.deleteByExpenseId(expenseId);

        List<ExpenseSplit> splitsToSave = new ArrayList<>();
        String splitType = request.getSplitType() != null ? request.getSplitType().toUpperCase() : "EQUAL";

        if ("CUSTOM".equals(splitType)) {
            splitsToSave = handleCustomSplit(expense, request);
        } else {
            splitsToSave = handleEqualSplit(expense, request);
        }

        List<ExpenseSplit> savedSplits = expenseSplitRepository.saveAll(splitsToSave);
        return savedSplits.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Handles Equal Splitting with Penny Split Balancing to ensure the sum of shares
     * matches the exact total bill to the very last paisa (e.g. ₹100.00 / 3 = ₹33.34 + ₹33.33 + ₹33.33).
     */
    private List<ExpenseSplit> handleEqualSplit(Expense expense, ExpenseSplitRequest request) {
        List<Long> userIds = request.getUserIds();
        if (userIds == null || userIds.isEmpty()) {
            throw new RuntimeException("For EQUAL split, at least one companion userId must be provided.");
        }

        int count = userIds.size();
        BigDecimal totalAmount = expense.getAmount();

        // Base share rounded down to 2 decimal places
        BigDecimal baseShare = totalAmount.divide(BigDecimal.valueOf(count), 2, RoundingMode.FLOOR);

        // Calculate leftover paise: remainder = totalAmount - (baseShare * count)
        BigDecimal totalDistributed = baseShare.multiply(BigDecimal.valueOf(count));
        BigDecimal remainder = totalAmount.subtract(totalDistributed);
        int remainderPaise = remainder.multiply(BigDecimal.valueOf(100)).intValueExact();

        List<ExpenseSplit> splits = new ArrayList<>();
        Long payerId = expense.getPaidBy() != null ? expense.getPaidBy().getId() : null;

        for (int i = 0; i < count; i++) {
            Long uid = userIds.get(i);
            User user = userRepository.findById(uid)
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + uid));

            // Distribute 1 extra paisa (0.01) to each member starting from index 0 until remainder is exhausted
            BigDecimal memberShare = baseShare;
            if (i < remainderPaise) {
                memberShare = memberShare.add(new BigDecimal("0.01"));
            }

            boolean isSelfShare = payerId != null && payerId.equals(uid);

            ExpenseSplit split = ExpenseSplit.builder()
                    .expense(expense)
                    .user(user)
                    .shareAmount(memberShare)
                    .isSettled(isSelfShare) // Payer's own share is inherently settled
                    .settledAt(isSelfShare ? LocalDateTime.now() : null)
                    .build();

            splits.add(split);
        }

        return splits;
    }

    /**
     * Handles Custom Splitting with total amount validation.
     */
    private List<ExpenseSplit> handleCustomSplit(Expense expense, ExpenseSplitRequest request) {
        if (request.getCustomShares() == null || request.getCustomShares().isEmpty()) {
            throw new RuntimeException("For CUSTOM split, customShares list cannot be empty.");
        }

        // Validate that custom shares sum up exactly to the total expense amount
        BigDecimal sumCustom = request.getCustomShares().stream()
                .map(ExpenseSplitRequest.CustomSplitItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (sumCustom.compareTo(expense.getAmount()) != 0) {
            throw new RuntimeException("Custom split total (₹" + sumCustom + 
                    ") does not match expense amount (₹" + expense.getAmount() + ").");
        }

        List<ExpenseSplit> splits = new ArrayList<>();
        Long payerId = expense.getPaidBy() != null ? expense.getPaidBy().getId() : null;

        for (ExpenseSplitRequest.CustomSplitItem item : request.getCustomShares()) {
            User user = userRepository.findById(item.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + item.getUserId()));

            boolean isSelfShare = payerId != null && payerId.equals(item.getUserId());

            ExpenseSplit split = ExpenseSplit.builder()
                    .expense(expense)
                    .user(user)
                    .shareAmount(item.getAmount())
                    .isSettled(isSelfShare)
                    .settledAt(isSelfShare ? LocalDateTime.now() : null)
                    .build();

            splits.add(split);
        }

        return splits;
    }

    // =========================================================================
    // 2. RETRIEVE SPLITS (BY EXPENSE OR BY TRIP)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<ExpenseSplitResponse> getSplitsByExpense(Long expenseId, String userEmail) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with id: " + expenseId));

        verifyTripAccess(expense.getTrip().getId(), userEmail);

        return expenseSplitRepository.findByExpenseId(expenseId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExpenseSplitResponse> getSplitsByTrip(Long tripId, String userEmail) {
        verifyTripAccess(tripId, userEmail);

        return expenseSplitRepository.findAllByTripIdWithDetails(tripId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExpenseSplitResponse> getMyPendingDebts(Long tripId, String userEmail) {
        verifyTripAccess(tripId, userEmail);
        User currentUser = getUserByEmail(userEmail);

        return expenseSplitRepository.findByExpenseTripIdAndUserId(tripId, currentUser.getId()).stream()
                .filter(split -> !Boolean.TRUE.equals(split.getIsSettled()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // 3. SETTLE A SPECIFIC SPLIT
    // =========================================================================
    public ExpenseSplitResponse settleSplit(Long splitId, String userEmail) {
        ExpenseSplit split = expenseSplitRepository.findById(splitId)
                .orElseThrow(() -> new RuntimeException("Expense split not found with id: " + splitId));

        verifyTripAccess(split.getExpense().getTrip().getId(), userEmail);

        split.setIsSettled(true);
        split.setSettledAt(LocalDateTime.now());

        ExpenseSplit updated = expenseSplitRepository.save(split);
        return mapToResponse(updated);
    }

    // =========================================================================
    // 4. MEMBER CONTRIBUTION SUMMARY (TOTAL PAID, FAIR SHARE, NET BALANCE, STATUS)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<MemberContributionDTO> getMemberContributions(Long tripId, String userEmail) {
        verifyTripAccess(tripId, userEmail);

        Set<User> participants = getTripParticipants(tripId);
        List<Expense> expenses = expenseRepository.findByTripIdOrderByExpenseDateDesc(tripId);
        List<ExpenseSplit> splits = expenseSplitRepository.findAllByTripIdWithDetails(tripId);

        List<MemberContributionDTO> contributions = new ArrayList<>();

        for (User user : participants) {
            // Calculate total paid upfront by this user
            BigDecimal totalPaid = expenses.stream()
                    .filter(e -> e.getPaidBy() != null && e.getPaidBy().getId().equals(user.getId()))
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Calculate total fair share assigned to this user
            BigDecimal fairShare = splits.stream()
                    .filter(s -> s.getUser().getId().equals(user.getId()))
                    .map(ExpenseSplit::getShareAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Net balance = Total Paid - Fair Share
            BigDecimal netBalance = totalPaid.subtract(fairShare);

            String status = "SETTLED";
            if (netBalance.compareTo(BigDecimal.ZERO) > 0) {
                status = "RECEIVES";
            } else if (netBalance.compareTo(BigDecimal.ZERO) < 0) {
                status = "OWES";
            }

            contributions.add(MemberContributionDTO.builder()
                    .userId(user.getId())
                    .userName(user.getName())
                    .userEmail(user.getEmail())
                    .totalPaid(totalPaid)
                    .fairShare(fairShare)
                    .netBalance(netBalance)
                    .status(status)
                    .build());
        }

        return contributions;
    }

    // =========================================================================
    // 5. GREEDY DEBT MINIMIZATION ALGORITHM (O(N^2) -> O(N) CASH FLOW SIMPLIFICATION)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<DebtSettlementDTO> calculateOptimizedSettlements(Long tripId, String userEmail) {
        List<MemberContributionDTO> contributions = getMemberContributions(tripId, userEmail);

        // Helper class to track mutable balances during the greedy reduction
        class UserBalance {
            final Long userId;
            final String userName;
            BigDecimal balance;

            UserBalance(Long userId, String userName, BigDecimal balance) {
                this.userId = userId;
                this.userName = userName;
                this.balance = balance;
            }
        }

        List<UserBalance> debtors = new ArrayList<>();
        List<UserBalance> creditors = new ArrayList<>();

        for (MemberContributionDTO m : contributions) {
            if (m.getNetBalance().compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(new UserBalance(m.getUserId(), m.getUserName(), m.getNetBalance().abs()));
            } else if (m.getNetBalance().compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(new UserBalance(m.getUserId(), m.getUserName(), m.getNetBalance()));
            }
        }

        // Sort descending by amount to greedily settle largest amounts first
        debtors.sort((a, b) -> b.balance.compareTo(a.balance));
        creditors.sort((a, b) -> b.balance.compareTo(a.balance));

        List<DebtSettlementDTO> settlements = new ArrayList<>();
        int i = 0; // Debtor pointer
        int j = 0; // Creditor pointer

        while (i < debtors.size() && j < creditors.size()) {
            UserBalance debtor = debtors.get(i);
            UserBalance creditor = creditors.get(j);

            // Settle minimum of debtor's debt and creditor's credit
            BigDecimal settleAmount = debtor.balance.min(creditor.balance);

            if (settleAmount.compareTo(BigDecimal.ZERO) > 0) {
                settlements.add(DebtSettlementDTO.builder()
                        .fromUserId(debtor.userId)
                        .fromUserName(debtor.userName)
                        .toUserId(creditor.userId)
                        .toUserName(creditor.userName)
                        .amount(settleAmount)
                        .build());
            }

            debtor.balance = debtor.balance.subtract(settleAmount);
            creditor.balance = creditor.balance.subtract(settleAmount);

            if (debtor.balance.compareTo(BigDecimal.ZERO) == 0) {
                i++;
            }
            if (creditor.balance.compareTo(BigDecimal.ZERO) == 0) {
                j++;
            }
        }

        return settlements;
    }

    // =========================================================================
    // 6. HELPER & ACCESS VERIFICATION METHODS
    // =========================================================================
    private void verifyTripAccess(Long tripId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        // Owner has full access
        if (trip.getOwner().getId().equals(user.getId())) {
            return;
        }

        // Group members have access
        Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(tripId);
        if (groupOpt.isPresent()) {
            boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(groupOpt.get().getId(), user.getId());
            if (isMember) {
                return;
            }
        }

        throw new RuntimeException("Access denied: You are neither the trip owner nor a group member.");
    }

    private Set<User> getTripParticipants(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        Set<User> participants = new LinkedHashSet<>();
        participants.add(trip.getOwner());

        // Add all travel group members if a group exists
        Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(tripId);
        if (groupOpt.isPresent()) {
            List<GroupMember> members = groupMemberRepository.findByGroupId(groupOpt.get().getId());
            for (GroupMember gm : members) {
                participants.add(gm.getUser());
            }
        }

        // Add any additional users who paid an expense
        List<Expense> expenses = expenseRepository.findByTripIdOrderByExpenseDateDesc(tripId);
        for (Expense e : expenses) {
            if (e.getPaidBy() != null) {
                participants.add(e.getPaidBy());
            }
        }

        // Add any users who were assigned a split share
        List<ExpenseSplit> splits = expenseSplitRepository.findAllByTripIdWithDetails(tripId);
        for (ExpenseSplit s : splits) {
            participants.add(s.getUser());
        }

        return participants;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }

    private ExpenseSplitResponse mapToResponse(ExpenseSplit split) {
        Expense expense = split.getExpense();
        User debtor = split.getUser();
        User payer = expense.getPaidBy();

        return ExpenseSplitResponse.builder()
                .id(split.getId())
                .expenseId(expense.getId())
                .expenseDescription(expense.getDescription())
                .userId(debtor.getId())
                .userName(debtor.getName())
                .userEmail(debtor.getEmail())
                .shareAmount(split.getShareAmount())
                .isSettled(split.getIsSettled())
                .settledAt(split.getSettledAt())
                .paidByUserId(payer != null ? payer.getId() : null)
                .paidByUserName(payer != null ? payer.getName() : null)
                .paidByUserEmail(payer != null ? payer.getEmail() : null)
                .createdAt(split.getCreatedAt())
                .build();
    }
}
