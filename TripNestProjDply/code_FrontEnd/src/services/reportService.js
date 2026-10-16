import apiClient from "./apiClient";

/**
 * Report & Data Aggregation Service (Milestone 3 & Milestone 4)
 * Connects React UI to Spring Boot ReportController Endpoints.
 */
export const reportService = {
  // =========================================================================
  // SINGLE-TRIP REPORTS
  // =========================================================================

  async getTripReport(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/reports`);
    return response.data;
  },

  async getCategorySummaries(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/reports/categories`);
    return response.data;
  },

  async getComprehensiveTripReport(tripId) {
    const response = await apiClient.get(`/api/reports/trip/${tripId}/comprehensive`);
    return response.data;
  },

  // =========================================================================
  // MULTI-CRITERIA EXPENSE FILTERING & CSV EXPORT (Task 3)
  // =========================================================================

  async getFilteredExpenses(params = {}) {
    const response = await apiClient.get("/api/reports/expenses/filtered", { params });
    return response.data;
  },

  /**
   * Triggers a streaming CSV download in the user's browser
   */
  async downloadExpensesCsv(tripId = null) {
    const params = tripId ? { tripId } : {};
    const response = await apiClient.get("/api/reports/expenses/export/csv", {
      params,
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", tripId ? `trip-${tripId}-expenses.csv` : "tripnest-all-expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // =========================================================================
  // ANNUAL RECAP & CHART-READY FEEDS (Task 3 & Task 9)
  // =========================================================================

  async getAnnualSummary(year = 2026) {
    const response = await apiClient.get("/api/reports/annual-summary", { params: { year } });
    return response.data;
  },

  async getCategoryDistributionChart() {
    const response = await apiClient.get("/api/reports/charts/category-distribution");
    return response.data;
  },

  async getMonthlySpendingChart() {
    const response = await apiClient.get("/api/reports/charts/monthly-spending");
    return response.data;
  },
};

export default reportService;
