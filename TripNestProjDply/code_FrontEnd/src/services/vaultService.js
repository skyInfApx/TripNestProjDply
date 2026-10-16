import apiClient from "./apiClient";

const API_BASE_URL = "http://localhost:8080";

/**
 * Vault Service: Handles API communication for Trip Document Vault & Media Hub.
 * Connected to Spring Boot DocumentVaultController:
 * - POST   /api/trips/{tripId}/documents       -> Upload file with category (multipart/form-data)
 * - GET    /api/trips/{tripId}/documents       -> List trip documents with optional category filter
 * - GET    /api/documents/{documentId}         -> View document metadata
 * - DELETE /api/documents/{documentId}         -> Delete document (uploader or trip owner)
 */
export const vaultService = {
  /**
   * Upload a travel document or photo to a trip vault.
   * @param {number|string} tripId - The trip ID
   * @param {File} file - Physical file object from file picker
   * @param {string} category - DocumentCategory (TICKET, BOOKING, RECEIPT, PHOTO, OTHER)
   * @param {string} [storageType] - Storage target: "CLOUD" (Cloudinary) or "LOCAL" (Server disk)
   * @returns {Promise<Object>} DocumentResponse DTO
   */
  async uploadDocument(tripId, file, category = "OTHER", storageType = "CLOUD") {
    const formData = new FormData();
    formData.append("file", file);
    if (category) {
      formData.append("category", category);
    }
    if (storageType) {
      formData.append("storageType", storageType);
    }

    const response = await apiClient.post(`/api/trips/${tripId}/documents`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * Retrieves current cloud storage configuration status from backend.
   */
  async getStorageConfig() {
    try {
      const response = await apiClient.get("/api/documents/storage-config");
      return response.data;
    } catch (e) {
      return { cloudinaryConfigured: false, defaultStorage: "LOCAL" };
    }
  },

  /**
   * Fetch all documents stored in a trip's vault, with optional category filter.
   * @param {number|string} tripId - The trip ID
   * @param {string} [category] - Optional category filter (TICKET, BOOKING, RECEIPT, PHOTO, OTHER)
   * @returns {Promise<Array>} List of DocumentResponse DTOs
   */
  async getDocumentsByTrip(tripId, category) {
    const params = category && category !== "ALL" ? { category } : {};
    const response = await apiClient.get(`/api/trips/${tripId}/documents`, { params });
    return response.data;
  },

  /**
   * Get metadata for a single document by its record ID.
   * @param {number|string} documentId - The document record ID
   * @returns {Promise<Object>} DocumentResponse DTO
   */
  async getDocumentById(documentId) {
    const response = await apiClient.get(`/api/documents/${documentId}`);
    return response.data;
  },

  /**
   * Delete a document from the vault.
   * Access rule: Only the uploader or the trip owner can perform this action.
   * @param {number|string} documentId - The document record ID
   * @returns {Promise<Object>} Deletion confirmation status
   */
  async deleteDocument(documentId) {
    const response = await apiClient.delete(`/api/documents/${documentId}`);
    return response.data;
  },

  /**
   * Resolves the full URL for streaming or downloading a physical file.
   * Converts relative backend storage paths (/api/documents/files/...) to absolute URLs.
   * @param {string} storageUrl - The storageUrl from DocumentResponse
   * @returns {string} Fully qualified URL
   */
  getFileUrl(storageUrl) {
    if (!storageUrl) return "";
    if (storageUrl.startsWith("http://") || storageUrl.startsWith("https://")) {
      return storageUrl;
    }
    return `${API_BASE_URL}${storageUrl.startsWith("/") ? "" : "/"}${storageUrl}`;
  },
};

export default vaultService;
