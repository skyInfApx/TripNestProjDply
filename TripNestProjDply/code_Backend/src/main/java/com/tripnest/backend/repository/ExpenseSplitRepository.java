package com.tripnest.backend.repository;

import com.tripnest.backend.entity.ExpenseSplit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * ExpenseSplitRepository provides database operations for the ExpenseSplit entity.
 * 
 * Supports:
 * 1. Fetching splits by individual expense ID.
 * 2. Fetching all splits across a trip with JOIN FETCH (preventing N+1 problem).
 * 3. Fetching unsettled debts for the Greedy Debt Minimization Algorithm.
 * 4. Calculating total monetary contribution and debt totals via JPQL aggregations.
 */
@Repository
public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {

    /**
     * Finds all split shares assigned for a specific expense.
     * SQL: SELECT * FROM expense_splits WHERE expense_id = ?
     */
    List<ExpenseSplit> findByExpenseId(Long expenseId);

    /**
     * Finds all split shares for a specific companion in a trip.
     * SQL: SELECT s.* FROM expense_splits s JOIN expenses e ON s.expense_id = e.id WHERE e.trip_id = ? AND s.user_id = ?
     */
    List<ExpenseSplit> findByExpenseTripIdAndUserId(Long tripId, Long userId);

    /**
     * Finds all UNSETTLED (active) debts for a trip.
     * Essential for the Greedy Debt Minimization Algorithm.
     * SQL: SELECT s.* FROM expense_splits s JOIN expenses e ON s.expense_id = e.id WHERE e.trip_id = ? AND s.is_settled = false
     */
    List<ExpenseSplit> findByExpenseTripIdAndIsSettledFalse(Long tripId);

    /**
     * High-performance batch fetch with JOIN FETCH to eliminate the N+1 Query Problem.
     * Loads splits, parent expenses (with payer), and debtor users in exactly 1 single SQL query.
     */
    @Query("SELECT s FROM ExpenseSplit s " +
           "JOIN FETCH s.expense e " +
           "JOIN FETCH e.paidBy " +
           "JOIN FETCH s.user u " +
           "WHERE e.trip.id = :tripId")
    List<ExpenseSplit> findAllByTripIdWithDetails(@Param("tripId") Long tripId);

    /**
     * Computes the total monetary share owed by a specific user across a trip.
     * Returns 0.00 if user has no assigned shares.
     */
    @Query("SELECT COALESCE(SUM(s.shareAmount), 0) FROM ExpenseSplit s " +
           "WHERE s.expense.trip.id = :tripId AND s.user.id = :userId")
    BigDecimal calculateTotalOwedByUserInTrip(@Param("tripId") Long tripId, @Param("userId") Long userId);

    /**
     * Deletes all splits belonging to an expense (used before re-splitting a bill).
     */
    void deleteByExpenseId(Long expenseId);
}
