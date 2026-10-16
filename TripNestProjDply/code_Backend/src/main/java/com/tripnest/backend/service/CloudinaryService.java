package com.tripnest.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * CloudinaryService manages cloud media uploads to Cloudinary.
 * 
 * Features:
 * 1. Automatic resource detection (Images vs raw PDF documents).
 * 2. Collision-proof unique naming with clean sanitization.
 * 3. Returns permanent public HTTPS CDN links.
 * 4. Graceful configuration check with helpful guidance if keys are missing.
 */
@Service
public class CloudinaryService {

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    private Cloudinary cloudinary;

    @PostConstruct
    public void init() {
        if (StringUtils.hasText(cloudinaryUrl) && cloudinaryUrl.trim().startsWith("cloudinary://")) {
            this.cloudinary = new Cloudinary(cloudinaryUrl.trim());
        } else if (isConfigured()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName.trim(),
                    "api_key", apiKey.trim(),
                    "api_secret", apiSecret.trim(),
                    "secure", true
            ));
        }
    }

    /**
     * Checks whether Cloudinary credentials have been provided in configuration or .env.
     */
    public boolean isConfigured() {
        if (StringUtils.hasText(cloudinaryUrl) && cloudinaryUrl.trim().startsWith("cloudinary://")) {
            return true;
        }
        return StringUtils.hasText(cloudName) &&
               StringUtils.hasText(apiKey) &&
               StringUtils.hasText(apiSecret);
    }

    /**
     * Uploads a file (PDF, JPEG, PNG) to Cloudinary and returns the permanent HTTPS URL.
     */
    @SuppressWarnings("rawtypes")
    public String uploadFile(MultipartFile file) {
        if (!isConfigured() || this.cloudinary == null) {
            throw new IllegalStateException(
                    "Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, " +
                    "and CLOUDINARY_API_SECRET in your backend .env file, or select 'Local Server Disk'."
            );
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "document"));
        String safeName = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String uniqueId = UUID.randomUUID().toString().substring(0, 8) + "_" + safeName;

        try {
            // Determine resource type: "raw" for PDF, "auto" or "image" for images
            String contentType = file.getContentType();
            String resourceType = "auto";
            if (contentType != null && contentType.equalsIgnoreCase("application/pdf")) {
                resourceType = "raw";
            }

            Map uploadParams = ObjectUtils.asMap(
                    "folder", "tripnest/documents",
                    "public_id", uniqueId,
                    "resource_type", resourceType,
                    "use_filename", true,
                    "unique_filename", false,
                    "overwrite", true
            );

            Map uploadResult = this.cloudinary.uploader().upload(file.getBytes(), uploadParams);

            Object secureUrl = uploadResult.get("secure_url");
            if (secureUrl != null) {
                return secureUrl.toString();
            }

            Object url = uploadResult.get("url");
            if (url != null) {
                return url.toString();
            }

            throw new RuntimeException("Cloudinary upload succeeded but no URL was returned.");
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload document to Cloudinary: " + e.getMessage(), e);
        }
    }

    /**
     * Deletes a file from Cloudinary given its storage URL.
     */
    public void deleteFile(String storageUrl) {
        if (!isConfigured() || this.cloudinary == null || !StringUtils.hasText(storageUrl)) {
            return;
        }

        try {
            // Extract public ID from Cloudinary URL if possible:
            // e.g. https://res.cloudinary.com/.../tripnest/documents/uniqueId.pdf
            if (storageUrl.contains("/tripnest/documents/")) {
                int startIndex = storageUrl.indexOf("tripnest/documents/");
                String publicId = storageUrl.substring(startIndex);
                // Strip extension if not raw or use as is
                this.cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            }
        } catch (Exception ignored) {
            // Non-critical cleanup failure, logged or ignored safely
        }
    }
}
