package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * DocumentVault Entity represents a stored document, ticket, booking, receipt, or photo for a trip.
 * 
 * Mentor's Core Rules Adhered to:
 * 1. "Never store files directly in the database."
 *    -> Only metadata (name, type, size, category) and the storage reference (storageUrl) are stored here.
 * 2. "Do not store uploaded files on the local server without persistence across redeployments."
 *    -> The storageUrl references a permanent cloud storage bucket or persistent media URL.
 * 3. "Access Control: Only the uploader or the trip owner can delete a document."
 *    -> Relational foreign keys track both the parent Trip and the uploadedBy User.
 */
@Entity
@Table(
    name = "document_vault",
    indexes = {
        @Index(name = "idx_document_vault_trip", columnList = "trip_id"),
        @Index(name = "idx_document_vault_uploader", columnList = "uploaded_by_user_id"),
        @Index(name = "idx_document_vault_category", columnList = "category")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentVault {

    // =========================================================================
    // 1. PRIMARY KEY
    // =========================================================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // 2. PARENT TRIP RELATIONSHIP
    // =========================================================================
    // Every uploaded document belongs strictly to one specific trip
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    // =========================================================================
    // 3. FILE METADATA
    // =========================================================================
    // Original human-readable file name (e.g. "AirIndia_BoardingPass.pdf")
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    // MIME type / extension classification (e.g. "application/pdf", "image/jpeg", "image/png")
    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType;

    // Classification category for UI filtering and tabs (TICKET, BOOKING, RECEIPT, PHOTO, OTHER)
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    @Builder.Default
    private DocumentCategory category = DocumentCategory.OTHER;

    // Secure persistent URL or reference key where the file physically lives (Cloudinary, S3, or media storage)
    @Column(name = "storage_url", nullable = false, length = 1000)
    private String storageUrl;

    // Storage location type ("CLOUD" or "LOCAL")
    @Column(name = "storage_type", length = 20)
    @Builder.Default
    private String storageType = "LOCAL";

    // Exact size of the file in bytes (used to enforce the 10MB quota and display human-friendly "1.2 MB" in UI)
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    // =========================================================================
    // 4. ACCESS CONTROL & AUDITING
    // =========================================================================
    // The user who uploaded the document (required for delete permission checks)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_user_id", nullable = false)
    private User uploadedBy;

    // Audit timestamp when the file was uploaded
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    // Automatically stamp uploadedAt before saving to the database if not already provided
    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) {
            uploadedAt = LocalDateTime.now();
        }
    }
}
