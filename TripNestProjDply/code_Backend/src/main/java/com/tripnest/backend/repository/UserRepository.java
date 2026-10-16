package com.tripnest.backend.repository;

import com.tripnest.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    // =========================================================================
    // ADMIN ANALYTICS QUERIES (Task 2)
    // =========================================================================

    /**
     * Count distinct users who have planned/taken at least one trip (Active Travelers).
     */
    @Query("SELECT COUNT(DISTINCT t.owner.id) FROM Trip t")
    Long countActiveTravelers();

    /**
     * Top power travelers ranked by total number of trips.
     */
    @Query("SELECT u.id, u.name, u.email, COUNT(t.id) " +
           "FROM User u JOIN Trip t ON t.owner.id = u.id " +
           "GROUP BY u.id, u.name, u.email " +
           "ORDER BY COUNT(t.id) DESC")
    List<Object[]> findTopTravelersByTripCount();
}