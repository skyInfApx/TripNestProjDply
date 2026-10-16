package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Notification Entity represents an in-app alert, reminder, or event notification.
 * 
 * Mentor's Requirements Implemented:
 * 1. Event alerts: Triggered on group invites, budget threshold warnings (>85%, >100%), split debts.
 * 2. Scheduled reminders: Automated morning alerts for upcoming trips and activities.
 * 3. Unread counter support: isRead boolean flag for fast COUNT queries.
 * 4. Deep-link navigation: targetType ("TRIP", "GROUP", "EXPENSE") and targetId for instant page redirection on click.
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notifications_recipient_read", columnList = "recipient_id, is_read"),
        @Index(name = "idx_notifications_created_at", columnList = "created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    // Primary Key
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The traveler who receives this notification
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    // Short headline (e.g. "Budget Warning", "New Group Invitation")
    @Column(nullable = false, length = 255)
    private String title;

    // Detailed explanation message
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    // Classification type (TRIP_INVITE, BUDGET_ALERT, EXPENSE_SPLIT, etc.)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    // Target entity type for navigation redirection (e.g. "TRIP", "GROUP", "EXPENSE", "DOCUMENT")
    @Column(name = "target_type", length = 50)
    private String targetType;

    // Target entity ID to redirect to (e.g. tripId: 7)
    @Column(name = "target_id")
    private Long targetId;

    // Read status: false = unread (shows red dot 🔴); true = read
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    // Creation timestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (isRead == null) {
            isRead = false;
        }
    }
}
