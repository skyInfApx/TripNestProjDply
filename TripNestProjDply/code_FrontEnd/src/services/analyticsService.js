import apiClient from "./apiClient";

export const analyticsService = {
  // =========================================================================
  // TRAVELER ANALYTICS (Task 1 & Task 7)
  // =========================================================================

  /**
   * Fetch complete traveler dashboard payload (Stats, Budget, Upcoming trips, Categories, Favorites, Trends)
   */
  getTravelerDashboard: async () => {
    const response = await apiClient.get("/api/analytics/traveler/dashboard");
    return response.data;
  },

  /**
   * Fetch traveler travel statistics (total, completed, ongoing, planned trips)
   */
  getTravelStats: async () => {
    const response = await apiClient.get("/api/analytics/traveler/travel-stats");
    return response.data;
  },

  /**
   * Fetch budget vs actual spend overview
   */
  getBudgetOverview: async () => {
    const response = await apiClient.get("/api/analytics/traveler/budget-overview");
    return response.data;
  },

  /**
   * Fetch upcoming trips sorted with countdown days
   */
  getUpcomingTrips: async () => {
    const response = await apiClient.get("/api/analytics/traveler/upcoming-trips");
    return response.data;
  },

  /**
   * Fetch category-wise expense breakdown with percentages
   */
  getCategoryExpenses: async () => {
    const response = await apiClient.get("/api/analytics/traveler/category-expenses");
    return response.data;
  },

  /**
   * Fetch favorite / top destinations
   */
  getFavoriteDestinations: async () => {
    const response = await apiClient.get("/api/analytics/traveler/favorite-destinations");
    return response.data;
  },

  /**
   * Fetch 12-month spending progression
   */
  getMonthlyTrends: async () => {
    const response = await apiClient.get("/api/analytics/traveler/monthly-trends");
    return response.data;
  },

  // =========================================================================
  // ADMIN ANALYTICS (Task 2 & Task 8)
  // =========================================================================

  /**
   * Master admin control tower dashboard payload
   */
  getAdminDashboard: async () => {
    const response = await apiClient.get("/api/admin/analytics/dashboard");
    return response.data;
  },

  /**
   * Platform macro overview KPIs
   */
  getAdminOverview: async () => {
    const response = await apiClient.get("/api/admin/analytics/overview");
    return response.data;
  },

  /**
   * User demographics, active travelers, and power users
   */
  getAdminUserAnalytics: async () => {
    const response = await apiClient.get("/api/admin/analytics/users");
    return response.data;
  },

  /**
   * Trip status distribution, average duration, monthly trends
   */
  getAdminTripAnalytics: async () => {
    const response = await apiClient.get("/api/admin/analytics/trips");
    return response.data;
  },

  /**
   * Destination popularity rankings platform-wide
   */
  getAdminDestinationAnalytics: async () => {
    const response = await apiClient.get("/api/admin/analytics/destinations");
    return response.data;
  },

  /**
   * Platform-wide financial turnover and category breakdown
   */
  getAdminFinancialAnalytics: async () => {
    const response = await apiClient.get("/api/admin/analytics/financials");
    return response.data;
  },

  /**
   * Promote user to Administrator role (Admin-only privilege)
   */
  promoteUserToAdmin: async (userId) => {
    const response = await apiClient.post(`/api/admin/analytics/users/${userId}/promote`);
    return response.data;
  },
};
