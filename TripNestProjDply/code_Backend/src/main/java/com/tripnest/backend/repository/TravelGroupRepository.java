package com.tripnest.backend.repository;

import com.tripnest.backend.entity.TravelGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * TravelGroupRepository provides database operations for the TravelGroup entity.
 */
@Repository
public interface TravelGroupRepository extends JpaRepository<TravelGroup, Long> {

    /**
     * GOAL: Search travel groups whose name contains the query string (case-insensitive).
     * SQL:  SELECT * FROM travel_groups WHERE LOWER(name) LIKE LOWER(CONCAT('%', ?, '%'))
     */
    List<TravelGroup> findByNameContainingIgnoreCase(String name);

    /**
     * GOAL: Find the unique travel group linked to a specific trip ID.
     * SQL:  SELECT * FROM travel_groups WHERE trip_id = ?
     */
    Optional<TravelGroup> findByTripId(Long tripId);

    /**
     * GOAL: Find the travel group matching the 6-character join code entered by a user.
     * SQL:  SELECT * FROM travel_groups WHERE join_code = ?
     */
    Optional<TravelGroup> findByJoinCode(String joinCode);

    /**
     * GOAL: Verify if a generated join code is already in use (collision prevention).
     * SQL:  SELECT COUNT(*) > 0 FROM travel_groups WHERE join_code = ?
     */
    boolean existsByJoinCode(String joinCode);

    /**
     * GOAL: Check if a trip already has an active group (enforces 1 Trip = 1 Group rule).
     * SQL:  SELECT COUNT(*) > 0 FROM travel_groups WHERE trip_id = ?
     */
    boolean existsByTripId(Long tripId);
}
