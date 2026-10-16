package com.tripnest.backend.service;

import com.tripnest.backend.dto.document.DocumentResponse;
import com.tripnest.backend.entity.DocumentCategory;
import com.tripnest.backend.entity.DocumentVault;
import com.tripnest.backend.entity.GroupMember;
import com.tripnest.backend.entity.NotificationType;
import com.tripnest.backend.entity.TravelGroup;
import com.tripnest.backend.entity.Trip;
import com.tripnest.backend.entity.User;
import com.tripnest.backend.repository.DocumentVaultRepository;
import com.tripnest.backend.repository.GroupMemberRepository;
import com.tripnest.backend.repository.TravelGroupRepository;
import com.tripnest.backend.repository.TripRepository;
import com.tripnest.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * DocumentVaultService coordinates document storage, database metadata records,
 * and security rules for trip media and files.
 * 
 * Mentor's Core Rules Enforced:
 * 1. File and DB coordination: Physical file saved via FileStorageService, metadata in PostgreSQL.
 * 2. Access Control: Only the uploader OR the trip owner can delete a document.
 * 3. Category classification & filtering (TICKET, BOOKING, RECEIPT, PHOTO, OTHER).
 */
@Service
@Transactional
public class DocumentVaultService {

    private final DocumentVaultRepository documentVaultRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final CloudinaryService cloudinaryService;
    private final NotificationService notificationService;
    private final TravelGroupRepository travelGroupRepository;
    private final GroupMemberRepository groupMemberRepository;

    public DocumentVaultService(
            DocumentVaultRepository documentVaultRepository,
            TripRepository tripRepository,
            UserRepository userRepository,
            FileStorageService fileStorageService,
            CloudinaryService cloudinaryService,
            NotificationService notificationService,
            TravelGroupRepository travelGroupRepository,
            GroupMemberRepository groupMemberRepository) {
        this.documentVaultRepository = documentVaultRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.cloudinaryService = cloudinaryService;
        this.notificationService = notificationService;
        this.travelGroupRepository = travelGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
    }

    /**
     * Checks if Cloudinary cloud storage is active and configured.
     */
    public boolean isCloudStorageConfigured() {
        return cloudinaryService.isConfigured();
    }

    /**
     * Uploads a document to physical storage (Cloud or Local) and records its metadata in the database.
     */
    public DocumentResponse uploadDocument(Long tripId, MultipartFile file, DocumentCategory category, String userEmail) {
        return uploadDocument(tripId, file, category, null, userEmail);
    }

    /**
     * Uploads a document with explicit storage destination (CLOUD vs LOCAL).
     */
    public DocumentResponse uploadDocument(Long tripId, MultipartFile file, DocumentCategory category, String storageType, String userEmail) {
        // 1. Verify parent trip exists
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with id: " + tripId));

        // 2. Verify authenticated uploader exists
        User uploader = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        // 3. Fallback category if none provided
        DocumentCategory resolvedCategory = (category != null) ? category : DocumentCategory.OTHER;

        // 4. Resolve Storage Type: "CLOUD" or "LOCAL"
        String resolvedType;
        if (storageType != null && storageType.equalsIgnoreCase("LOCAL")) {
            resolvedType = "LOCAL";
        } else if (storageType != null && storageType.equalsIgnoreCase("CLOUD")) {
            resolvedType = "CLOUD";
        } else {
            // Default to Cloud if configured, otherwise fallback smoothly to Local
            resolvedType = cloudinaryService.isConfigured() ? "CLOUD" : "LOCAL";
        }

        // 5. Save physical file to chosen destination (Cloudinary or Local disk)
        String storageUrl;
        if ("CLOUD".equalsIgnoreCase(resolvedType)) {
            if (!cloudinaryService.isConfigured()) {
                throw new IllegalStateException(
                        "Cloudinary credentials are not configured. Please add CLOUDINARY_CLOUD_NAME, " +
                        "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file, or select 'Local Server Disk'."
                );
            }
            storageUrl = cloudinaryService.uploadFile(file);
        } else {
            storageUrl = fileStorageService.storeFile(file);
        }

        // 6. Build and persist database entity
        DocumentVault document = DocumentVault.builder()
                .trip(trip)
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .category(resolvedCategory)
                .storageUrl(storageUrl)
                .storageType(resolvedType)
                .fileSize(file.getSize())
                .uploadedBy(uploader)
                .build();

        DocumentVault savedDocument = documentVaultRepository.save(document);

        // 6. Dispatch in-app notification to bell
        try {
            String title = "📁 New Document Added: " + (savedDocument.getFileName() != null ? savedDocument.getFileName() : "Vault File");
            String message = String.format("A new %s file ('%s') was added to the document vault for %s.",
                    resolvedCategory.name(),
                    savedDocument.getFileName() != null ? savedDocument.getFileName() : "Document",
                    trip.getDestination());

            Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(trip.getId());
            if (groupOpt.isPresent()) {
                List<GroupMember> members = groupMemberRepository.findByGroupId(groupOpt.get().getId());
                for (GroupMember member : members) {
                    notificationService.sendNotification(
                            member.getUser(),
                            title,
                            message,
                            NotificationType.DOCUMENT_UPLOAD,
                            "DOCUMENT",
                            trip.getId()
                    );
                }
            } else {
                notificationService.sendNotification(
                        trip.getOwner(),
                        title,
                        message,
                        NotificationType.DOCUMENT_UPLOAD,
                        "DOCUMENT",
                        trip.getId()
                );
            }
        } catch (Exception ignored) {}

        // 7. Return response DTO
        return mapToResponse(savedDocument);
    }

    /**
     * Retrieves all documents for a trip, optionally filtered by category.
     */
    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocumentsByTrip(Long tripId, DocumentCategory category) {
        // Verify trip exists
        if (!tripRepository.existsById(tripId)) {
            throw new RuntimeException("Trip not found with id: " + tripId);
        }

        List<DocumentVault> documents;
        if (category != null) {
            documents = documentVaultRepository.findByTripIdAndCategoryOrderByUploadedAtDesc(tripId, category);
        } else {
            documents = documentVaultRepository.findByTripIdOrderByUploadedAtDesc(tripId);
        }

        return documents.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves details of a specific document by its ID.
     */
    @Transactional(readOnly = true)
    public DocumentResponse getDocumentById(Long documentId) {
        DocumentVault document = documentVaultRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));
        return mapToResponse(document);
    }

    /**
     * Deletes a document with mentor's access control:
     * Only the user who uploaded the document OR the trip owner can delete it.
     */
    public void deleteDocument(Long documentId, String userEmail) {
        // 1. Fetch document
        DocumentVault document = documentVaultRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found with id: " + documentId));

        // 2. Fetch authenticated user
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));

        // 3. Security Check: Only uploader or trip owner has permission
        boolean isUploader = document.getUploadedBy().getId().equals(currentUser.getId());
        boolean isTripOwner = document.getTrip().getOwner().getId().equals(currentUser.getId());

        if (!isUploader && !isTripOwner) {
            throw new RuntimeException("Unauthorized: Only the uploader or the trip owner can delete this document.");
        }

        // 4. Delete physical file from storage (Cloudinary or local server disk)
        if (document.getStorageUrl() != null && 
                (document.getStorageUrl().startsWith("http://") || document.getStorageUrl().startsWith("https://"))) {
            cloudinaryService.deleteFile(document.getStorageUrl());
        } else {
            fileStorageService.deleteFile(document.getStorageUrl());
        }

        // 5. Delete metadata row from PostgreSQL
        documentVaultRepository.delete(document);
    }

    /**
     * Maps DocumentVault entity to DocumentResponse DTO.
     */
    private DocumentResponse mapToResponse(DocumentVault document) {
        String resolvedStorageType = document.getStorageType();
        if (resolvedStorageType == null) {
            resolvedStorageType = (document.getStorageUrl() != null &&
                    (document.getStorageUrl().startsWith("http://") || document.getStorageUrl().startsWith("https://")))
                    ? "CLOUD" : "LOCAL";
        }

        return DocumentResponse.builder()
                .id(document.getId())
                .tripId(document.getTrip().getId())
                .fileName(document.getFileName())
                .fileType(document.getFileType())
                .category(document.getCategory())
                .storageUrl(document.getStorageUrl())
                .storageType(resolvedStorageType)
                .fileSizeBytes(document.getFileSize())
                .fileSizeFormatted(DocumentResponse.formatFileSize(document.getFileSize()))
                .uploadedByUserId(document.getUploadedBy().getId())
                .uploadedByUserName(document.getUploadedBy().getName())
                .uploadedByUserEmail(document.getUploadedBy().getEmail())
                .uploadedAt(document.getUploadedAt())
                .build();
    }
}
