import apiClient from "./apiClient";

/**
 * Travel Group Collaboration API Service (Milestone 3 Task 10)
 * Connects React UI to Spring Boot GroupCollaborationController:
 * - GET    /api/trips/{tripId}/groups                 -> Get group details, join code & roster
 * - POST   /api/trips/{tripId}/groups                 -> Create/initialize travel squad
 * - PUT    /api/trips/{tripId}/groups                 -> Update group name
 * - POST   /api/trips/{tripId}/groups/members         -> Invite/add companion by email
 * - PUT    /api/trips/{tripId}/groups/members/{id}/role -> Promote to Admin or update role
 * - DELETE /api/trips/{tripId}/groups/members/{id}     -> Remove companion or leave squad
 * - POST   /api/groups/join                           -> Join trip squad using 6-char code
 */
export const groupService = {
  // Fetch group details, join code, and member roster for a trip
  async getGroupByTripId(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/groups`);
    return response.data;
  },

  // Initialize/create a new travel squad for a trip
  async createGroup(tripId, groupData) {
    const response = await apiClient.post(`/api/trips/${tripId}/groups`, groupData);
    return response.data;
  },

  // Update travel squad name
  async updateGroupName(tripId, groupData) {
    const response = await apiClient.put(`/api/trips/${tripId}/groups`, groupData);
    return response.data;
  },

  // Add/invite companion directly by email
  async addMember(tripId, memberData) {
    const response = await apiClient.post(`/api/trips/${tripId}/groups/members`, memberData);
    return response.data;
  },

  // Update a companion's role (GROUP_ADMIN or GROUP_MEMBER)
  async updateMemberRole(tripId, userId, role) {
    const response = await apiClient.put(
      `/api/trips/${tripId}/groups/members/${userId}/role?role=${role}`
    );
    return response.data;
  },

  // Remove a companion from squad or leave group
  async removeMember(tripId, userId) {
    const response = await apiClient.delete(`/api/trips/${tripId}/groups/members/${userId}`);
    return response.data;
  },

  // Join a trip squad using 6-character alphanumeric join code
  async joinGroupByCode(joinCode) {
    const response = await apiClient.post("/api/groups/join", { joinCode });
    return response.data;
  },

  // Universal search for travel groups by name, destination, or join code
  async searchGroups(query = "") {
    const response = await apiClient.get(`/api/groups/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  // --- Double-Consent Invitation & Join Request Endpoints ---

  // Admin sends an invitation to a companion by email (requires companion acceptance)
  async sendInvitation(tripId, memberData) {
    const response = await apiClient.post(`/api/trips/${tripId}/groups/invitations`, memberData);
    return response.data;
  },

  // Admin retrieves pending join requests and outgoing invitations for the trip
  async getGroupInvitations(tripId) {
    const response = await apiClient.get(`/api/trips/${tripId}/groups/invitations`);
    return response.data;
  },

  // Admin approves a traveler's join request
  async approveJoinRequest(tripId, invitationId) {
    const response = await apiClient.post(
      `/api/trips/${tripId}/groups/invitations/${invitationId}/approve`
    );
    return response.data;
  },

  // Admin rejects a traveler's join request
  async rejectJoinRequest(tripId, invitationId) {
    const response = await apiClient.post(
      `/api/trips/${tripId}/groups/invitations/${invitationId}/reject`
    );
    return response.data;
  },

  // Admin cancels an outgoing invitation
  async cancelInvitation(tripId, invitationId) {
    const response = await apiClient.delete(
      `/api/trips/${tripId}/groups/invitations/${invitationId}`
    );
    return response.data;
  },

  // Traveler requests to join a squad using 6-character code (requires admin approval)
  async requestJoinByCode(joinCode) {
    const response = await apiClient.post("/api/groups/join-request", { joinCode });
    return response.data;
  },

  // Traveler retrieves all pending trip invitations received
  async getMyInvitations() {
    const response = await apiClient.get("/api/users/me/invitations");
    return response.data;
  },

  // Traveler accepts a pending trip invitation
  async acceptInvitation(invitationId) {
    const response = await apiClient.post(`/api/users/me/invitations/${invitationId}/accept`);
    return response.data;
  },

  // Traveler declines a pending trip invitation
  async declineInvitation(invitationId) {
    const response = await apiClient.post(`/api/users/me/invitations/${invitationId}/decline`);
    return response.data;
  },
};

export default groupService;
