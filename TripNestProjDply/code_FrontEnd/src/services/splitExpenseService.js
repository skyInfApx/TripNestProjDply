import apiClient from "./apiClient";

/**
 * Shared Expenses & Split Bills API Service (Milestone 3 Task 11)
 * Connects React UI to Spring Boot ExpenseSplitController:
 * - POST /api/expenses/{expenseId}/split          -> Split expense (EQUAL or CUSTOM)
 * - GET  /api/expenses/{expenseId}/splits         -> Get split shares for an expense
 * - GET  /api/trips/{tripId}/splits               -> Get all split shares across entire trip
 * - GET  /api/trips/{tripId}/splits/my-debts      -> Get active debts owed by logged-in user
 * - PUT  /api/splits/{splitId}/settle             -> Settle/mark a split debt as paid
 * - GET  /api/trips/{tripId}/splits/contributions -> Member balance passbook (paid vs fair share)
 * - GET  /api/trips/{tripId}/debts/settle         -> Greedy Debt Minimization ("Who owes whom")
 */
export const splitExpenseService = {
  // Split a logged expense equally or with custom amounts among companions
  async splitExpense(expenseId, splitData) {
    const response = await apiClient.post(`/api/expenses/${expenseId}/split`, splitData);
    return response.data;
  },

  // Get all individual split shares for a specific expense receipt
  async getSplitsByExpense(expenseId) {
    const response = await apiClient.get(`/api/expenses/${expenseId}/splits`);
    return response.data;
  },

  // Get all split shares recorded across the entire trip
  async getSplitsByTrip(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/splits`);
    return response.data;
  },

  // Get pending debts that the currently logged-in user owes
  async getMyPendingDebts(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/splits/my-debts`);
    return response.data;
  },

  // Mark a specific companion's split debt as settled (paid)
  async settleSplit(splitId) {
    const response = await apiClient.put(`/api/splits/${splitId}/settle`);
    return response.data;
  },

  // Get overall member balance passbook (Total Paid, Fair Share, Net Balance, Status)
  async getMemberContributions(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/splits/contributions`);
    return response.data;
  },

  // Calculate Greedy Debt Minimization plan (simplifies web of debts to minimum transactions)
  async getOptimizedSettlements(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/debts/settle`);
    return response.data;
  },
};

export default splitExpenseService;
