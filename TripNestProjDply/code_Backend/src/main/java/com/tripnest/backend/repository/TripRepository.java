package com.tripnest.backend.repository;

import com.tripnest.backend.entity.Trip;
import com.tripnest.backend.entity.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findByOwnerId(Long ownerId);

    List<Trip> findByStartDate(LocalDate startDate);

    // =========================================================================
    // TRAVELER ANALYTICS QUERIES (Task 1)
    // =========================================================================

    Long countByOwnerId(Long ownerId);

    Long countByOwnerIdAndStatus(Long ownerId, TripStatus status);

    @Query("SELECT t FROM Trip t WHERE t.owner.id = :ownerId AND t.startDate >= :today AND t.status IN (com.tripnest.backend.entity.TripStatus.PLANNED, com.tripnest.backend.entity.TripStatus.ONGOING) ORDER BY t.startDate ASC")
    List<Trip> findUpcomingTripsByOwnerId(@Param("ownerId") Long ownerId, @Param("today") LocalDate today);

    @Query("SELECT COUNT(DISTINCT t.destination) FROM Trip t WHERE t.owner.id = :ownerId")
    Long countDistinctDestinationsByOwnerId(@Param("ownerId") Long ownerId);

    @Query("SELECT t.destination, COUNT(t), MAX(t.endDate) FROM Trip t WHERE t.owner.id = :ownerId GROUP BY t.destination ORDER BY COUNT(t) DESC, MAX(t.endDate) DESC")
    List<Object[]> findFavoriteDestinationsByOwnerId(@Param("ownerId") Long ownerId);

    // =========================================================================
    // ADMIN ANALYTICS QUERIES (Task 2)
    // =========================================================================

    Long countByStatus(TripStatus status);

    @Query("SELECT COALESCE(SUM(t.numberOfTravelers), 0) FROM Trip t")
    Long getTotalTravelersCount();

    @Query(value = "SELECT COALESCE(AVG(end_date - start_date + 1), 0.0) FROM trips", nativeQuery = true)
    Double getAverageTripDurationDays();

    @Query(value = "SELECT TO_CHAR(start_date, 'YYYY-MM') AS month_str, COUNT(id) AS trip_count " +
                   "FROM trips " +
                   "GROUP BY TO_CHAR(start_date, 'YYYY-MM') " +
                   "ORDER BY month_str DESC LIMIT 12", nativeQuery = true)
    List<Object[]> getMonthlyTripCreationTrends();

    @Query("SELECT t.destination, COUNT(t), COALESCE(SUM(t.numberOfTravelers), 0) " +
           "FROM Trip t " +
           "GROUP BY t.destination " +
           "ORDER BY COUNT(t) DESC")
    List<Object[]> getPlatformDestinationTrends();

    @Query("SELECT COUNT(DISTINCT t.destination) FROM Trip t")
    Long countDistinctDestinationsPlatformWide();

    // =========================================================================
    // REPORTING QUERIES (Milestone 4 Task 3)
    // =========================================================================

    @Query(value = "SELECT t.* FROM trips t WHERE t.user_id = :ownerId AND TO_CHAR(t.start_date, 'YYYY') = :yearStr ORDER BY t.start_date ASC", nativeQuery = true)
    List<Trip> findTripsByOwnerInYear(@Param("ownerId") Long ownerId, @Param("yearStr") String yearStr);
}
