package com.tripnest.backend.dto.document;

import com.tripnest.backend.entity.DocumentCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DocumentResponse DTO represents the response card returned to the client/UI
 * when viewing or uploading travel documents in TripNest.
 * 
 * Contains:
 * 1. File metadata (id, filename, MIME type, category).
 * 2. Human-readable file size formatting ("1.2 MB" instead of 1258291 bytes).
 * 3. Secure download/preview storage URL.
 * 4. Uploader details (for UI display and access control checks).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentResponse {

    // Unique document record ID
    private Long id;

    // Parent trip ID
    private Long tripId;

    // Original file name (e.g. "AirIndia_BoardingPass.pdf")
    private String fileName;

    // MIME type (e.g. "application/pdf", "image/jpeg", "image/png")
    private String fileType;

    // Document category for UI tabs & filters (TICKET, BOOKING, RECEIPT, PHOTO, OTHER)
    private DocumentCategory category;

    // Permanent or secure HTTPS URL to view/download the file
    private String storageUrl;

    // Storage location type ("CLOUD" or "LOCAL")
    private String storageType;

    // File size in raw bytes
    private Long fileSizeBytes;

    // Human-readable file size (e.g. "1.2 MB", "450 KB")
    private String fileSizeFormatted;

    // Uploader details (who put this in the trip vault)
    private Long uploadedByUserId;
    private String uploadedByUserName;
    private String uploadedByUserEmail;

    // Upload timestamp
    private LocalDateTime uploadedAt;

    /**
     * Utility method to convert raw bytes into human-friendly file size strings.
     * E.g. 1048576 bytes -> "1.0 MB", 51200 bytes -> "50.0 KB".
     */
    public static String formatFileSize(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        }
        int exp = (int) (Math.log(bytes) / Math.log(1024));
        String pre = "KMGTPE".charAt(exp - 1) + "";
        return String.format("%.1f %sB", bytes / Math.pow(1024, exp), pre);
    }
}
