package com.tripnest.backend.controller;

import com.tripnest.backend.dto.document.DocumentResponse;
import com.tripnest.backend.entity.DocumentCategory;
import com.tripnest.backend.service.DocumentVaultService;
import com.tripnest.backend.service.FileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * REST Controller exposing travel document vault and media endpoints:
 * 1. POST   /api/trips/{tripId}/documents       -> Upload document or photo (multipart/form-data)
 * 2. GET    /api/trips/{tripId}/documents       -> List documents for a trip (optional ?category= filter)
 * 3. GET    /api/documents/{documentId}         -> View metadata for a specific document
 * 4. GET    /api/documents/files/{fileName}     -> Download / stream physical file directly
 * 5. DELETE /api/documents/{documentId}         -> Delete document (Uploader or Trip Owner only)
 */
@RestController
@CrossOrigin
public class DocumentVaultController {

    private final DocumentVaultService documentVaultService;
    private final FileStorageService fileStorageService;

    public DocumentVaultController(
            DocumentVaultService documentVaultService,
            FileStorageService fileStorageService) {
        this.documentVaultService = documentVaultService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Uploads a travel document, ticket, booking, receipt, or photo for a trip.
     * Supports both CLOUD (Cloudinary) and LOCAL (Server Disk) storage options.
     */
    @PostMapping(value = "/api/trips/{tripId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> uploadDocument(
            @PathVariable Long tripId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", required = false) DocumentCategory category,
            @RequestParam(value = "storageType", required = false) String storageType,
            Authentication authentication) {

        String userEmail = authentication.getName();
        DocumentResponse response = documentVaultService.uploadDocument(tripId, file, category, storageType, userEmail);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Returns current storage configuration status (e.g. whether Cloudinary is configured).
     */
    @GetMapping("/api/documents/storage-config")
    public ResponseEntity<Map<String, Object>> getStorageConfig() {
        boolean isCloud = documentVaultService.isCloudStorageConfigured();
        return ResponseEntity.ok(Map.of(
                "cloudinaryConfigured", isCloud,
                "defaultStorage", isCloud ? "CLOUD" : "LOCAL"
        ));
    }

    /**
     * Lists all documents stored in a trip's vault, with optional category filter.
     */
    @GetMapping("/api/trips/{tripId}/documents")
    public ResponseEntity<List<DocumentResponse>> getDocumentsByTrip(
            @PathVariable Long tripId,
            @RequestParam(value = "category", required = false) DocumentCategory category) {

        List<DocumentResponse> response = documentVaultService.getDocumentsByTrip(tripId, category);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves metadata for a specific document by its database ID.
     */
    @GetMapping("/api/documents/{documentId}")
    public ResponseEntity<DocumentResponse> getDocumentById(
            @PathVariable Long documentId) {

        DocumentResponse response = documentVaultService.getDocumentById(documentId);
        return ResponseEntity.ok(response);
    }

    /**
     * Streams or downloads the physical file from server storage.
     * Accessible by the frontend and browser to view images or PDF tickets directly.
     */
    @GetMapping("/api/documents/files/{fileName:.+}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String fileName) {

        Resource resource = fileStorageService.loadFileAsResource(fileName);
        MediaType mediaType = MediaTypeFactory.getMediaType(resource)
                .orElse(MediaType.APPLICATION_OCTET_STREAM);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    /**
     * Deletes a document with mentor's access control (only uploader or trip owner).
     */
    @DeleteMapping("/api/documents/{documentId}")
    public ResponseEntity<Map<String, String>> deleteDocument(
            @PathVariable Long documentId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        documentVaultService.deleteDocument(documentId, userEmail);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Document deleted successfully."
        ));
    }
}
