package com.tripnest.backend.repository;

import com.tripnest.backend.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * BudgetRepository provides database access operations for the Budget entity.
 */
@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    Optional<Budget> findByTripId(Long tripId);

    boolean existsByTripId(Long tripId);

    void deleteByTripId(Long tripId);

    /**
     * Calculate the total budget allocated across all trips owned by a specific traveler.
     */
    @Query("SELECT COALESCE(SUM(b.totalBudget), 0) FROM Budget b WHERE b.trip.owner.id = :ownerId")
    BigDecimal getTotalBudgetAllocatedByOwnerId(@Param("ownerId") Long ownerId);

    /**
     * Platform-wide total budget allocated across all trips (Admin Analytics).
     */
    @Query("SELECT COALESCE(SUM(b.totalBudget), 0) FROM Budget b")
    BigDecimal getTotalPlatformBudgetAllocated();
}
