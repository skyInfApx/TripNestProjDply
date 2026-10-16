package com.tripnest.backend.repository;

import com.tripnest.backend.entity.DocumentCategory;
import com.tripnest.backend.entity.DocumentVault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * DocumentVaultRepository provides database operations for the DocumentVault entity.
 * 
 * Supports:
 * 1. Fetching all travel documents belonging to a trip (sorted newest first).
 * 2. Filtering documents by category (e.g., show only 'TICKET' or 'BOOKING').
 * 3. Fetching documents uploaded by a specific user (for access control audits).
 * 4. Aggregating total storage used by a trip in bytes.
 */
@Repository
public interface DocumentVaultRepository extends JpaRepository<DocumentVault, Long> {

    /**
     * Retrieves all documents stored in a trip's vault, sorted newest to oldest.
     * SQL: SELECT * FROM document_vault WHERE trip_id = ? ORDER BY uploaded_at DESC
     */
    List<DocumentVault> findByTripIdOrderByUploadedAtDesc(Long tripId);

    /**
     * Retrieves documents for a trip filtered by category (e.g. TICKET, BOOKING, RECEIPT).
     * SQL: SELECT * FROM document_vault WHERE trip_id = ? AND category = ? ORDER BY uploaded_at DESC
     */
    List<DocumentVault> findByTripIdAndCategoryOrderByUploadedAtDesc(Long tripId, DocumentCategory category);

    /**
     * Retrieves all documents uploaded by a specific traveler in a trip.
     * SQL: SELECT * FROM document_vault WHERE trip_id = ? AND uploaded_by_user_id = ? ORDER BY uploaded_at DESC
     */
    List<DocumentVault> findByTripIdAndUploadedByIdOrderByUploadedAtDesc(Long tripId, Long userId);

    /**
     * Counts the total number of files uploaded to a trip's vault.
     * SQL: SELECT COUNT(*) FROM document_vault WHERE trip_id = ?
     */
    long countByTripId(Long tripId);

    /**
     * Verifies if a specific document exists inside a specific trip.
     * Prevents cross-trip document access or tampering.
     */
    Optional<DocumentVault> findByIdAndTripId(Long id, Long tripId);

    /**
     * Calculates the total storage consumed by all documents in a trip (in bytes).
     * Returns 0 if no documents have been uploaded yet.
     */
    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM DocumentVault d WHERE d.trip.id = :tripId")
    Long calculateTotalStorageUsedByTrip(@Param("tripId") Long tripId);
}
