package com.tripnest.backend.controller;

import com.tripnest.backend.dto.notification.NotificationResponse;
import com.tripnest.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing notification and alert endpoints:
 * 1. GET  /api/notifications              -> Get all notifications for user (optional ?unreadOnly=true)
 * 2. GET  /api/notifications/unread-count -> Fast unread count for top navbar bell badge (🔔 3)
 * 3. PUT  /api/notifications/{id}/read    -> Mark a specific notification as read on click
 * 4. PUT  /api/notifications/read-all     -> Mark all unread notifications as read
 */
@RestController
@CrossOrigin
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Retrieves the notification feed for the authenticated traveler.
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @RequestParam(value = "unreadOnly", defaultValue = "false") boolean unreadOnly,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<NotificationResponse> response = notificationService.getNotificationsForUser(userEmail, unreadOnly);

        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves the fast unread count for the top navbar bell icon badge.
     */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication authentication) {
        String userEmail = authentication.getName();
        long count = notificationService.getUnreadCount(userEmail);

        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    /**
     * Marks a specific notification as read when clicked by the user.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable("id") Long notificationId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        NotificationResponse response = notificationService.markAsRead(notificationId, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Marks all unread notifications as read in a single batch operation.
     */
    @PutMapping({"/read-all", "/mark-all-read"})
    public ResponseEntity<Map<String, Object>> markAllAsRead(Authentication authentication) {
        String userEmail = authentication.getName();
        int count = notificationService.markAllAsRead(userEmail);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "markedAsReadCount", count,
                "message", "All notifications marked as read."
        ));
    }

    /**
     * DTO Request body for creating an activity/travel reminder.
     */
    public record ReminderRequest(String title, String message, Long tripId) {}

    /**
     * Creates an activity or travel reminder that delivers directly to the user's notification bell.
     */
    @PostMapping("/reminder")
    public ResponseEntity<NotificationResponse> createReminder(
            @RequestBody ReminderRequest request,
            Authentication authentication) {
        String userEmail = authentication.getName();
        NotificationResponse response = notificationService.createActivityReminder(
                request.title(),
                request.message(),
                request.tripId(),
                userEmail
        );
        return ResponseEntity.ok(response);
    }
}
