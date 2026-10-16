import apiClient from "./apiClient";

/**
 * Budget Management API Service (Milestone 3 Task 7)
 * Connects React UI to Spring Boot Budget Endpoints:
 * - GET    /api/trips/{tripId}/budgets
 * - POST   /api/trips/{tripId}/budgets
 * - PUT    /api/trips/{tripId}/budgets
 * - DELETE /api/trips/{tripId}/budgets
 */
export const budgetService = {
  // Fetch budget details for a specific trip
  async getBudget(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/budget`);
    return response.data;
  },

  // Create an initial budget for a trip (Backend Upsert uses POST)
  async createBudget(tripId, budgetData) {
    const response = await apiClient.post(`/api/trips/${tripId}/budget`, budgetData);
    return response.data;
  },

  // Update or reallocate category limits (Backend Upsert uses POST)
  async updateBudget(tripId, budgetData) {
    const response = await apiClient.post(`/api/trips/${tripId}/budget`, budgetData);
    return response.data;
  },

  // Reset or delete a budget
  async deleteBudget(tripId) {
    const response = await apiClient.delete(`/api/trips/${tripId}/budget`);
    return response.data;
  },
};

export default budgetService;
