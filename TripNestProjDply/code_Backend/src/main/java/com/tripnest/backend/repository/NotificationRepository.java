package com.tripnest.backend.repository;

import com.tripnest.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * NotificationRepository provides database queries for the Notification entity.
 * 
 * Supports:
 * 1. Fetching all notifications for a traveler (sorted newest first).
 * 2. Fetching only unread notifications.
 * 3. Lightning-fast unread count query for the top navbar bell badge (🔔 3).
 * 4. Batch marking all notifications as read in a single SQL UPDATE.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Retrieves all notifications for a specific user, sorted from newest to oldest.
     * SQL: SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC
     */
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    /**
     * Retrieves only unread notifications for a specific user.
     * SQL: SELECT * FROM notifications WHERE recipient_id = ? AND is_read = false ORDER BY created_at DESC
     */
    List<Notification> findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(Long recipientId);

    /**
     * Counts the total number of unread notifications for a traveler.
     * Powers the red notification badge on the bell icon.
     * SQL: SELECT COUNT(*) FROM notifications WHERE recipient_id = ? AND is_read = false
     */
    long countByRecipientIdAndIsReadFalse(Long recipientId);

    /**
     * Finds a notification by ID and verifies it belongs to the authenticated recipient.
     * Prevents one user from reading or modifying another user's notifications.
     */
    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    /**
     * Checks if an unread notification of a specific type already exists for a target entity.
     * Prevents duplicate spam alerts (e.g. repeated budget alerts for the same trip).
     */
    boolean existsByRecipientIdAndTypeAndTargetIdAndIsReadFalse(Long recipientId, com.tripnest.backend.entity.NotificationType type, Long targetId);

    /**
     * Batch updates all unread notifications for a user to read in a single atomic SQL statement.
     * SQL: UPDATE notifications SET is_read = true WHERE recipient_id = ? AND is_read = false
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.id = :recipientId AND n.isRead = false")
    int markAllAsReadByRecipientId(@Param("recipientId") Long recipientId);
}
