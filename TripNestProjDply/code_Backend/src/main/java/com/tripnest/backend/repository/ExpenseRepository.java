package com.tripnest.backend.repository;

import com.tripnest.backend.entity.Expense;
import com.tripnest.backend.entity.ExpenseCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * ExpenseRepository provides database query operations for the 'expenses' table.
 */
@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // =========================================================================
    // 1. BASIC RETRIEVAL QUERIES
    // =========================================================================

    List<Expense> findByTripIdOrderByExpenseDateDesc(Long tripId);

    List<Expense> findByTripIdAndCategory(Long tripId, ExpenseCategory category);

    List<Expense> findByTripIdAndPaidById(Long tripId, Long userId);

    Long countByTripId(Long tripId);

    Long countByTripIdAndCategory(Long tripId, ExpenseCategory category);

    void deleteByTripId(Long tripId);

    // =========================================================================
    // 2. FINANCIAL AGGREGATION QUERIES (Task 3 & Single Trip)
    // =========================================================================

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.trip.id = :tripId")
    BigDecimal getTotalSpentByTripId(@Param("tripId") Long tripId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.trip.id = :tripId AND e.category = :category")
    BigDecimal getTotalSpentByTripIdAndCategory(
            @Param("tripId") Long tripId,
            @Param("category") ExpenseCategory category
    );

    // =========================================================================
    // 3. TRAVELER ANALYTICS AGGREGATIONS (Milestone 4 Task 1)
    // =========================================================================

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.trip.owner.id = :ownerId")
    BigDecimal getTotalSpentByOwnerId(@Param("ownerId") Long ownerId);

    @Query("SELECT e.category, COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.trip.owner.id = :ownerId GROUP BY e.category ORDER BY SUM(e.amount) DESC")
    List<Object[]> getCategorySpendingByOwnerId(@Param("ownerId") Long ownerId);

    @Query(value = "SELECT TO_CHAR(e.expense_date, 'YYYY-MM') AS month_str, COALESCE(SUM(e.amount), 0) AS total_amount, COUNT(e.id) AS tx_count " +
                   "FROM expenses e JOIN trips t ON e.trip_id = t.id " +
                   "WHERE t.user_id = :ownerId " +
                   "GROUP BY TO_CHAR(e.expense_date, 'YYYY-MM') " +
                   "ORDER BY month_str DESC LIMIT 12", nativeQuery = true)
    List<Object[]> getMonthlySpendingTrendsByOwnerId(@Param("ownerId") Long ownerId);

    // =========================================================================
    // 4. ADMIN ANALYTICS AGGREGATIONS (Milestone 4 Task 2)
    // =========================================================================

    /**
     * Platform-wide total monetary spend across all trips and expenses.
     */
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e")
    BigDecimal getTotalPlatformSpend();

    /**
     * Platform-wide category spending distribution.
     */
    @Query("SELECT e.category, COALESCE(SUM(e.amount), 0) FROM Expense e GROUP BY e.category ORDER BY SUM(e.amount) DESC")
    List<Object[]> getPlatformCategorySpending();

    /**
     * Platform-wide 12-month expenditure timeline.
     */
    @Query(value = "SELECT TO_CHAR(expense_date, 'YYYY-MM') AS month_str, COALESCE(SUM(amount), 0) AS total_amount, COUNT(id) AS tx_count " +
                   "FROM expenses " +
                   "GROUP BY TO_CHAR(expense_date, 'YYYY-MM') " +
                   "ORDER BY month_str DESC LIMIT 12", nativeQuery = true)
    List<Object[]> getPlatformMonthlySpendingTrends();

    /**
     * Platform-wide average expense amount per transaction.
     */
    @Query("SELECT COALESCE(AVG(e.amount), 0.0) FROM Expense e")
    Double getAverageExpenseAmount();

    // =========================================================================
    // 5. REPORTING & DATA AGGREGATION QUERIES (Milestone 4 Task 3)
    // =========================================================================

    /**
     * Filter expenses for a specific user within an optional date range.
     */
    @Query("SELECT e FROM Expense e WHERE e.trip.owner.id = :ownerId " +
           "AND (:startDate IS NULL OR e.expenseDate >= :startDate) " +
           "AND (:endDate IS NULL OR e.expenseDate <= :endDate) " +
           "ORDER BY e.expenseDate DESC")
    List<Expense> findExpensesByOwnerAndDateRange(
            @Param("ownerId") Long ownerId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate
    );

    /**
     * Total spent by owner in a specific calendar year.
     */
    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM expenses e JOIN trips t ON e.trip_id = t.id " +
                   "WHERE t.user_id = :ownerId AND TO_CHAR(e.expense_date, 'YYYY') = :yearStr", nativeQuery = true)
    BigDecimal getTotalSpentByOwnerInYear(@Param("ownerId") Long ownerId, @Param("yearStr") String yearStr);

    /**
     * Monthly spending progression for an owner in a specific year.
     */
    @Query(value = "SELECT TO_CHAR(e.expense_date, 'MM') AS month_num, COALESCE(SUM(e.amount), 0) AS total_amount " +
                   "FROM expenses e JOIN trips t ON e.trip_id = t.id " +
                   "WHERE t.user_id = :ownerId AND TO_CHAR(e.expense_date, 'YYYY') = :yearStr " +
                   "GROUP BY TO_CHAR(e.expense_date, 'MM') ORDER BY month_num ASC", nativeQuery = true)
    List<Object[]> getMonthlySpendingByOwnerInYear(@Param("ownerId") Long ownerId, @Param("yearStr") String yearStr);
}
