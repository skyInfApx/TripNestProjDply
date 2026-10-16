import apiClient from "./apiClient";

/**
 * Notification Service: Handles API communication for TripNest Notifications Hub.
 * Connected to Spring Boot NotificationController:
 * - GET  /api/notifications              -> Get notification feed (optional ?unreadOnly=true)
 * - GET  /api/notifications/unread-count -> Fast unread count for top navbar bell badge (🔔 3)
 * - PUT  /api/notifications/{id}/read    -> Mark a specific notification as read on click
 * - PUT  /api/notifications/read-all     -> Mark all unread notifications as read
 */
export const notificationService = {
  /**
   * Fetch all notifications for the authenticated user.
   * @param {boolean} [unreadOnly=false] - Whether to only fetch unread alerts
   * @returns {Promise<Array>} List of NotificationResponse DTOs
   */
  async getNotifications(unreadOnly = false) {
    const params = unreadOnly ? { unreadOnly: true } : {};
    const response = await apiClient.get("/api/notifications", { params });
    return response.data;
  },

  /**
   * Fetch unread notifications count for the navbar bell badge.
   * @returns {Promise<number>} Unread count number (e.g. 3)
   */
  async getUnreadCount() {
    const response = await apiClient.get("/api/notifications/unread-count");
    return response.data?.unreadCount || 0;
  },

  /**
   * Mark a single notification as read when clicked by the user.
   * @param {number|string} notificationId - The notification ID
   * @returns {Promise<Object>} Updated NotificationResponse DTO
   */
  async markAsRead(notificationId) {
    const response = await apiClient.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications as read in a single batch operation.
   * @returns {Promise<Object>} Status and count of marked notifications
   */
  async markAllAsRead() {
    const response = await apiClient.put("/api/notifications/read-all");
    return response.data;
  },

  /**
   * Create an activity reminder or travel notification.
   * @param {Object} reminderData - { title, message, tripId }
   * @returns {Promise<Object>} Created notification response
   */
  async createReminder(reminderData) {
    const response = await apiClient.post("/api/notifications/reminder", reminderData);
    return response.data;
  },
};

export default notificationService;
