package com.tripnest.backend.service;

import com.tripnest.backend.dto.notification.NotificationResponse;
import com.tripnest.backend.entity.Notification;
import com.tripnest.backend.entity.NotificationType;
import com.tripnest.backend.entity.Trip;
import com.tripnest.backend.entity.User;
import com.tripnest.backend.entity.Budget;
import com.tripnest.backend.entity.ExpenseCategory;
import com.tripnest.backend.repository.BudgetRepository;
import com.tripnest.backend.repository.ExpenseRepository;
import com.tripnest.backend.repository.NotificationRepository;
import com.tripnest.backend.repository.TripRepository;
import com.tripnest.backend.repository.UserRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * NotificationService coordinates event alert dispatches, unread feed retrieval,
 * read-state mutations, and scheduled automated travel reminders.
 * 
 * Mentor's Requirements Implemented:
 * 1. Event alerts: Triggered instantly on group invites, budget warnings, document uploads.
 * 2. Unread notification count for bell icon badge (GET /api/notifications/unread-count).
 * 3. Deep-link navigation: Computes targetUrl for seamless UI routing.
 * 4. Scheduled automated reminders: Spring @Scheduled cron checking upcoming trips.
 */
@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final TripRepository tripRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            TripRepository tripRepository,
            BudgetRepository budgetRepository,
            ExpenseRepository expenseRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.tripRepository = tripRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
    }

    /**
     * Dispatches and persists a new notification for a specific recipient.
     * Uses REQUIRES_NEW propagation so notification dispatching executes in an isolated transaction.
     * This guarantees that any transient issue with notifications never poisons or causes
     * silent rollback-only failures in the caller's core business transactions (such as joining a group).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationResponse sendNotification(
            User recipient,
            String title,
            String message,
            NotificationType type,
            String targetType,
            Long targetId) {

        User managedRecipient = recipient != null && recipient.getId() != null
                ? userRepository.findById(recipient.getId()).orElse(recipient)
                : recipient;

        Notification notification = Notification.builder()
                .recipient(managedRecipient)
                .title(title)
                .message(message)
                .type(type)
                .targetType(targetType)
                .targetId(targetId)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        return mapToResponse(saved);
    }

    /**
     * Retrieves notifications for the authenticated user (all or unread-only).
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsForUser(String userEmail, boolean unreadOnly) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        List<Notification> notifications;
        if (unreadOnly) {
            notifications = notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(user.getId());
        } else {
            notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId());
        }

        return notifications.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Fast unread count query for the bell icon badge (e.g. 🔔 3).
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        return notificationRepository.countByRecipientIdAndIsReadFalse(user.getId());
    }

    /**
     * Marks a single notification as read (with recipient ownership verification).
     */
    public NotificationResponse markAsRead(Long notificationId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, user.getId())
                .orElseThrow(() -> new RuntimeException("Notification not found or unauthorized."));

        notification.setIsRead(true);
        Notification updated = notificationRepository.save(notification);
        return mapToResponse(updated);
    }

    /**
     * Marks all unread notifications as read in a single atomic bulk query.
     */
    public int markAllAsRead(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        return notificationRepository.markAllAsReadByRecipientId(user.getId());
    }

    /**
     * Automated morning cron job (runs every day at 7:00 AM).
     * Checks for trips departing tomorrow and sends proactive travel reminders!
     */
    @Scheduled(cron = "0 0 7 * * *")
    public void sendDailyTripDepartureReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<Trip> upcomingTrips = tripRepository.findByStartDate(tomorrow);

        for (Trip trip : upcomingTrips) {
            sendNotification(
                    trip.getOwner(),
                    "Trip Departure Tomorrow! ✈️",
                    "Your trip to " + trip.getDestination() + " starts tomorrow! Check your documents and tickets in the vault.",
                    NotificationType.ACTIVITY_REMINDER,
                    "TRIP",
                    trip.getId()
            );
        }
    }

    /**
     * Checks spending against total budget and dispatches an in-app alert when threshold (>=80%, >=90%, >=100%) is reached.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void checkAndTriggerBudgetAlert(Trip trip, BigDecimal totalBudget, BigDecimal currentSpent) {
        if (trip == null || trip.getId() == null) {
            return;
        }

        Trip managedTrip = tripRepository.findById(trip.getId()).orElse(trip);
        User owner = managedTrip.getOwner();
        if (owner == null) return;
        Long ownerId = owner.getId();

        // 1. Overall Trip Budget Check (>=80%, >=90%, >=100%)
        if (totalBudget != null && totalBudget.compareTo(BigDecimal.ZERO) > 0 && currentSpent != null) {
            double ratio = currentSpent.doubleValue() / totalBudget.doubleValue();
            int percent = (int) Math.round(ratio * 100);

            if (percent >= 80) {
                String tierKey = percent >= 100 ? "Exceeded" : (percent >= 90 ? "About to Exhaust" : "Approaching");

                List<Notification> unreadAlerts = notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(ownerId);
                boolean alreadyNotifiedThisTier = unreadAlerts.stream().anyMatch(n ->
                        n.getType() == NotificationType.BUDGET_ALERT &&
                        managedTrip.getId().equals(n.getTargetId()) &&
                        n.getTitle() != null &&
                        n.getTitle().contains(tierKey) &&
                        !n.getTitle().contains("Budget Limit:")
                );

                if (!alreadyNotifiedThisTier) {
                    String destination = managedTrip.getDestination() != null ? managedTrip.getDestination() : "your trip";
                    String tripTitle = managedTrip.getTitle() != null ? managedTrip.getTitle() : destination;

                    String title;
                    String message;

                    if (percent >= 100) {
                        title = String.format("🚨 Budget Exceeded (%d%%) for %s!", percent, destination);
                        message = String.format("Emergency: Spending for '%s' has exceeded your planned budget (₹%,.2f spent of ₹%,.2f budget). Review expenses immediately.",
                                tripTitle, currentSpent.doubleValue(), totalBudget.doubleValue());
                    } else if (percent >= 90) {
                        title = String.format("🚨 Budget Alert: %d%% Spent - About to Exhaust! (%s)", percent, destination);
                        message = String.format("Caution: Your trip expenses for '%s' have reached %d%% (₹%,.2f spent of ₹%,.2f budget). You are about to exhaust your budget limit!",
                                tripTitle, percent, currentSpent.doubleValue(), totalBudget.doubleValue());
                    } else {
                        title = String.format("⚠️ Approaching Budget Limit: %d%% Spent (%s)", percent, destination);
                        message = String.format("Notice: Spending for '%s' has reached %d%% (₹%,.2f spent of ₹%,.2f budget), approaching your planned financial ceiling.",
                                tripTitle, percent, currentSpent.doubleValue(), totalBudget.doubleValue());
                    }

                    sendNotification(
                            owner,
                            title,
                            message,
                            NotificationType.BUDGET_ALERT,
                            "BUDGET",
                            managedTrip.getId()
                    );
                }
            }
        }

        // 2. Individual Category Threshold Alerts Evaluation
        try {
            budgetRepository.findByTripId(managedTrip.getId()).ifPresent(b -> {
                evaluateCategoryAlert(managedTrip, owner, ExpenseCategory.ACCOMMODATION, b.getAccommodationLimit());
                evaluateCategoryAlert(managedTrip, owner, ExpenseCategory.TRANSPORTATION, b.getTransportationLimit());
                evaluateCategoryAlert(managedTrip, owner, ExpenseCategory.FOOD, b.getFoodLimit());
                evaluateCategoryAlert(managedTrip, owner, ExpenseCategory.ACTIVITIES, b.getActivitiesLimit());
                evaluateCategoryAlert(managedTrip, owner, ExpenseCategory.SHOPPING, b.getShoppingLimit());
                evaluateCategoryAlert(managedTrip, owner, ExpenseCategory.MISCELLANEOUS, b.getMiscLimit());
            });
        } catch (Exception ignored) {}
    }

    private void evaluateCategoryAlert(Trip trip, User owner, ExpenseCategory category, BigDecimal limit) {
        if (limit == null || limit.compareTo(BigDecimal.ZERO) <= 0) return;
        BigDecimal spent = expenseRepository.getTotalSpentByTripIdAndCategory(trip.getId(), category);
        if (spent == null || spent.compareTo(BigDecimal.ZERO) <= 0) return;

        double catRatio = spent.doubleValue() / limit.doubleValue();
        int catPercent = (int) Math.round(catRatio * 100);

        if (catPercent >= 80) {
            String catName = category.name().substring(0, 1).toUpperCase() + category.name().substring(1).toLowerCase();
            String catTierKey = catPercent >= 100 ? "Exceeded" : (catPercent >= 90 ? "About to Exhaust" : "Approaching");

            List<Notification> unreadAlerts = notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(owner.getId());
            boolean alreadyNotified = unreadAlerts.stream().anyMatch(n ->
                    n.getType() == NotificationType.BUDGET_ALERT &&
                    trip.getId().equals(n.getTargetId()) &&
                    n.getTitle() != null &&
                    n.getTitle().contains(catName) &&
                    n.getTitle().contains(catTierKey)
            );

            if (!alreadyNotified) {
                String destination = trip.getDestination() != null ? trip.getDestination() : "your trip";
                String tripTitle = trip.getTitle() != null ? trip.getTitle() : destination;
                String title;
                String message;

                if (catPercent >= 100) {
                    title = String.format("🚨 %s Budget Exceeded (%d%%) - %s", catName, catPercent, destination);
                    message = String.format("Emergency: Spending on %s has exceeded its allocated limit (₹%,.2f spent of ₹%,.2f limit) for '%s'.",
                            catName, spent.doubleValue(), limit.doubleValue(), tripTitle);
                } else if (catPercent >= 90) {
                    title = String.format("🚨 %s Budget Alert: %d%% Spent - About to Exhaust! (%s)", catName, catPercent, destination);
                    message = String.format("Caution: Spending on %s has reached %d%% (₹%,.2f spent of ₹%,.2f limit) for '%s'. Limit is about to exhaust!",
                            catName, catPercent, spent.doubleValue(), limit.doubleValue(), tripTitle);
                } else {
                    title = String.format("⚠️ Approaching %s Budget Limit: %d%% Spent (%s)", catName, catPercent, destination);
                    message = String.format("Notice: Spending on %s has reached %d%% (₹%,.2f spent of ₹%,.2f limit) for '%s'.",
                            catName, catPercent, spent.doubleValue(), limit.doubleValue(), tripTitle);
                }

                sendNotification(owner, title, message, NotificationType.BUDGET_ALERT, "BUDGET", trip.getId());
            }
        }
    }

    /**
     * Creates an activity or travel reminder requested by the user.
     */
    @Transactional
    public NotificationResponse createActivityReminder(
            String title,
            String message,
            Long tripId,
            String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        Notification notification = Notification.builder()
                .recipient(user)
                .title(title != null && !title.isBlank() ? title : "⏰ Activity Reminder")
                .message(message != null && !message.isBlank() ? message : "You have an upcoming activity scheduled.")
                .type(NotificationType.ACTIVITY_REMINDER)
                .targetType("TRIP")
                .targetId(tripId)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        return mapToResponse(saved);
    }

    /**
     * Converts a Notification entity into a UI-friendly NotificationResponse DTO.
     */
    private NotificationResponse mapToResponse(Notification n) {
        String targetUrl = computeTargetUrl(n.getTargetType(), n.getTargetId());

        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .targetType(n.getTargetType())
                .targetId(n.getTargetId())
                .targetUrl(targetUrl)
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .timeAgo(NotificationResponse.formatTimeAgo(n.getCreatedAt()))
                .build();
    }

    /**
     * Helper to compute frontend navigation URLs based on targetType and targetId.
     */
    private String computeTargetUrl(String targetType, Long targetId) {
        if (targetType == null || targetId == null) {
            return "/dashboard";
        }
        return switch (targetType.toUpperCase()) {
            case "TRIP" -> "/trips/" + targetId;
            case "EXPENSE" -> "/trips/" + targetId + "?tab=expenses";
            case "DOCUMENT" -> "/trips/" + targetId + "?tab=vault";
            case "BUDGET" -> "/trips/" + targetId + "?tab=budget";
            case "GROUP" -> "/trips/" + targetId + "?tab=group";
            case "GROUP_INVITATION" -> "/trips";
            default -> "/trips";
        };
    }
}
