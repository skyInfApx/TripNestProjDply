package com.tripnest.backend.dto.notification;

import com.tripnest.backend.entity.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * NotificationResponse DTO represents the notification card delivered to the React UI and Postman.
 * 
 * Includes:
 * 1. Notification content: headline title and detailed explanation message.
 * 2. Visual classification: NotificationType (TRIP_INVITE, BUDGET_ALERT, etc.) for UI icons.
 * 3. Deep-link routing: targetType ("TRIP", "EXPENSE", "GROUP") and targetId for direct navigation on click.
 * 4. Human-friendly relative timestamp ("Just now", "10 mins ago", "Yesterday").
 * 5. Read status flag (isRead: false renders the unread red dot in the dropdown).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    // Notification ID
    private Long id;

    // Headline (e.g. "Budget Alert: Food", "Group Invitation")
    private String title;

    // Detailed explanation body
    private String message;

    // Classification type for UI styling & badge icons
    private NotificationType type;

    // Target entity type for navigation (e.g. "TRIP", "GROUP", "EXPENSE", "DOCUMENT")
    private String targetType;

    // Target entity ID to redirect to (e.g. tripId 7)
    private Long targetId;

    // Computed frontend route (e.g. "/trips/7/reports")
    private String targetUrl;

    // Read status: false = unread (shows red dot); true = read
    private Boolean isRead;

    // Timestamp when notification was created
    private LocalDateTime createdAt;

    // Human-friendly relative time (e.g. "Just now", "15m ago", "2h ago", "3d ago")
    private String timeAgo;

    /**
     * Utility method to format LocalDateTime into clean human-friendly relative time strings.
     */
    public static String formatTimeAgo(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }
        Duration duration = Duration.between(dateTime, LocalDateTime.now());
        long seconds = duration.getSeconds();

        if (seconds < 60) {
            return "Just now";
        }
        long minutes = seconds / 60;
        if (minutes < 60) {
            return minutes + "m ago";
        }
        long hours = minutes / 60;
        if (hours < 24) {
            return hours + "h ago";
        }
        long days = hours / 24;
        return days + "d ago";
    }
}
