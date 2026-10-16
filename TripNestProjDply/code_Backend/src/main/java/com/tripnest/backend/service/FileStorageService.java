package com.tripnest.backend.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * FileStorageService manages physical file persistence, validation, retrieval, and cleanup.
 * 
 * Mentor's Requirements Implemented:
 * 1. File Type Validation: Restricts uploads strictly to PDF, JPEG, and PNG.
 * 2. File Size Validation: Rejects files exceeding the 10 MB maximum limit.
 * 3. Safe Storage & Unique Naming: Generates collision-proof UUID filenames to prevent file collisions.
 * 4. Extensible Architecture: Exposes clean storage paths/URLs that can easily transition to AWS S3 or Cloudinary.
 */
@Service
public class FileStorageService {

    // Maximum allowed file size: 10 Megabytes in bytes
    public static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

    // Allowed MIME types
    public static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg"
    );

    private final Path storageLocation;

    public FileStorageService(@Value("${app.upload.dir:uploads/documents/}") String uploadDir) {
        this.storageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Initializes the storage directory on application startup.
     */
    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(this.storageLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize document storage directory at: " + this.storageLocation, e);
        }
    }

    /**
     * Validates file size, non-emptiness, and MIME type before saving.
     */
    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file. Please select a valid document or photo.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException(
                    "File size (" + (file.getSize() / (1024 * 1024)) + " MB) exceeds the 10 MB maximum limit."
            );
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException(
                    "Unsupported file format: '" + contentType + "'. Only PDF, JPEG, and PNG files are allowed."
            );
        }
    }

    /**
     * Saves the physical file to the storage directory with a collision-proof UUID filename.
     * Returns the relative downloadable storage URL.
     */
    public String storeFile(MultipartFile file) {
        validateFile(file);

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        
        // Sanitize filename: replace spaces and unsafe characters
        String safeName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        
        // Generate unique name: e.g. 550e8400-e29b-41d4-a716-446655440000_boarding_pass.pdf
        String uniqueFilename = UUID.randomUUID() + "_" + safeName;

        try {
            Path targetLocation = this.storageLocation.resolve(uniqueFilename);

            // Copy file stream to target location, replacing if duplicate exists
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            // Return relative access URL for retrieval
            return "/api/documents/files/" + uniqueFilename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file '" + originalFilename + "' to disk.", e);
        }
    }

    /**
     * Loads a file from disk as a Spring Resource for download or preview streaming.
     */
    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = this.storageLocation.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Document file not found or not readable: " + fileName);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Malformed file path URL: " + fileName, e);
        }
    }

    /**
     * Safely deletes a file from disk given its storage URL or unique filename.
     */
    public boolean deleteFile(String storageUrl) {
        if (storageUrl == null || storageUrl.isBlank()) {
            return false;
        }

        // Extract filename from URL (e.g. "/api/documents/files/uuid_file.pdf" -> "uuid_file.pdf")
        String fileName = storageUrl.substring(storageUrl.lastIndexOf('/') + 1);
        try {
            Path filePath = this.storageLocation.resolve(fileName).normalize();
            return Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Log warning but don't crash
            return false;
        }
    }
}
