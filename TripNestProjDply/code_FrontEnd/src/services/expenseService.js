import apiClient from "./apiClient";

/**
 * Expense Management API Service (Milestone 3 Task 8)
 * Connects React UI to Spring Boot Expense Endpoints:
 * - GET    /api/trips/{tripId}/expenses (with optional ?category= filter)
 * - GET    /api/trips/{tripId}/expenses/{expenseId}
 * - POST   /api/trips/{tripId}/expenses
 * - PUT    /api/trips/{tripId}/expenses/{expenseId}
 * - DELETE /api/trips/{tripId}/expenses/{expenseId}
 * - GET    /api/trips/{tripId}/expenses/total-spent
 */
export const expenseService = {
  // 1. List all expenses for a trip (optional category filter)
  async getExpenses(tripId, category = null) {
    const url = category
      ? `/api/trips/${tripId}/expenses?category=${category}`
      : `/api/trips/${tripId}/expenses`;
    const response = await apiClient.get(url);
    return response.data;
  },

  // Alias for getExpenses
  async getAllExpenses(tripId) {
    return this.getExpenses(tripId);
  },

  // 2. Retrieve single expense by ID
  async getExpenseById(tripId, expenseId) {
    const response = await apiClient.get(`/api/trips/${tripId}/expenses/${expenseId}`);
    return response.data;
  },

  // 3. Create a new expense for a trip
  async createExpense(tripId, expenseData) {
    const response = await apiClient.post(`/api/trips/${tripId}/expenses`, expenseData);
    return response.data;
  },

  // 4. Update an existing expense
  async updateExpense(tripId, expenseId, expenseData) {
    const response = await apiClient.put(`/api/trips/${tripId}/expenses/${expenseId}`, expenseData);
    return response.data;
  },

  // 5. Delete an expense by ID
  async deleteExpense(tripId, expenseId) {
    const response = await apiClient.delete(`/api/trips/${tripId}/expenses/${expenseId}`);
    return response.data;
  },

  // 6. Get total expenditure aggregate for a trip
  async getTotalSpent(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/expenses/total-spent`);
    return response.data;
  },
};

export default expenseService;
