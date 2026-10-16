# TripNest — Milestone 3 Task 6 Backend Guide: Media/Document Vault & Notifications Hub

> **Module:** Milestone 3, Part 6 (Task 6: Travel Media/Document Vault & In-App Notification Engine)  
> **Tech Stack:** Java 21, Spring Boot 3.x / 4.x, Spring Data JPA, Hibernate, PostgreSQL, Spring Security (OAuth2/JWT)  
> **Status:** Production Verified | 0 Compiler Errors (103 Compiled Classes) | Ready for Live Testing  
> **Authors:** Shreyas (Azn - Backend Engineer) & Antigravity (Ag - AI Pair-Programming Buddy)  
> **File:** `M3T6_NotificationDoc_readme.md`  

---

## Table of Contents
1. [Task 6 Overview & Architectural Scope](#1-task-6-overview--architectural-scope)
2. [Mentor's Architectural Rules & File Storage Compliance](#2-mentors-architectural-rules--file-storage-compliance)
3. [Domain Model & Entity Relationships (ERD)](#3-domain-model--entity-relationships-erd)
4. [Database Schema (`document_vault` & `notifications`)](#4-database-schema-document_vault--notifications)
5. [Data Transfer Objects (DTOs) & Contracts](#5-data-transfer-objects-dtos--contracts)
6. [Service Layer & Implementation Details](#6-service-layer--implementation-details)
   - 6.1 `FileStorageService.java` (Physical Storage Engine)
   - 6.2 `DocumentVaultService.java` (Access Control & Metadata Engine)
   - 6.3 `NotificationService.java` (Dispatcher & Automated Scheduler)
7. [REST Controller API Catalog (9 Endpoints)](#7-rest-controller-api-catalog-9-endpoints)
8. [Postman Verification Test Suite](#8-postman-verification-test-suite)
9. [PostgreSQL Verification Queries & Database Snapshots](#9-postgresql-verification-queries--database-snapshots)
10. [Key Interview & Mentor Defense Points](#10-key-interview--mentor-defense-points)

---

## 1. Task 6 Overview & Architectural Scope

Milestone 3 Task 6 completes Milestone 3 by delivering two essential capabilities:
1. **The Travel Media & Document Vault:** A secure digital locker for group travelers to upload, organize, categorize, view, and download flight tickets, hotel vouchers, taxi receipts, and vacation photos.
2. **The In-App Notifications Hub:** An alert delivery system that notifies travelers of trip invites, budget limit warnings, expense split assignments, and upcoming itinerary events, backed by a daily `@Scheduled` cron job running at 7:00 AM.

---

## 2. Mentor's Architectural Rules & File Storage Compliance

### 🎯 Mentor's Rule 1: Never Store Blobs/Files in the Database
- **Why:** Storing binary files (PDFs, images) as `BLOB` or `bytea` columns bloats the database into gigabytes, slows down index lookups, exhausts database connection memory, and degrades backup performance.
- **TripNest Solution:** The physical file is streamed to the file storage subsystem (`uploads/documents/`), and only lightweight metadata (file name, MIME type, size, category, and access URL) is persisted in the PostgreSQL `document_vault` table.

### 🎯 Mentor's Rule 2: Never Store Uploaded Files in Ephemeral Temp Folders
- **Why:** Storing files in `/tmp` causes files to vanish upon cloud container redeployments (e.g., Render, AWS, Heroku).
- **TripNest Solution:** Files are stored in a designated, persistent storage location configured via `application.properties` (`app.upload.dir=uploads/documents`), easily swappable with Amazon S3 or Google Cloud Storage in production without changing application code.

### 🎯 Mentor's Rule 3: Strict Validation & Security
- **Max File Size:** Capped at 10 MB per file.
- **Allowed MIME Types:** Strictly whitelist: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- **Collision Prevention:** Files are prepended with `UUID.randomUUID()` to prevent accidental overwrites when two travelers upload files with identical names (e.g. `ticket.pdf`).

---

## 3. Domain Model & Entity Relationships (ERD)

```text
  +-------------------------------------------------------------------------------+
  |                                     User                                      |
  |  id (PK), email (UQ), name, password                                          |
  +-------------------------------------------------------------------------------+
       | 1                                                                   | 1
       |                                                                     |
       | N (uploaded_by_user_id)                                             | N (recipient_id)
  +-------------------------------------------+   +-------------------------------------------+
  |              DocumentVault                |   |               Notification                |
  |  id (PK)                                  |   |  id (PK)                                  |
  |  trip_id (FK -> trips.id, NOT NULL)       |   |  recipient_id (FK -> users.id, NOT NULL)  |
  |  uploaded_by_user_id (FK -> users.id)     |   |  type (VARCHAR(30), NOT NULL)             |
  |  file_name (VARCHAR(255), NOT NULL)       |   |  title (VARCHAR(150), NOT NULL)           |
  |  file_type (VARCHAR(100), NOT NULL)       |   |  message (TEXT, NOT NULL)                 |
  |  category (VARCHAR(30), NOT NULL)         |   |  is_read (BOOLEAN, DEFAULT FALSE)         |
  |  file_size (BIGINT, NOT NULL)             |   |  target_type (VARCHAR(30), NULLABLE)      |
  |  storage_url (VARCHAR(500), NOT NULL)     |   |  target_id (BIGINT, NULLABLE)             |
  |  uploaded_at (TIMESTAMP, NOT NULL)        |   |  created_at (TIMESTAMP, NOT NULL)         |
  +-------------------------------------------+   +-------------------------------------------+
```

---

## 4. Database Schema (`document_vault` & `notifications`)

### `document_vault` Table
| Column Name | PostgreSQL Type | Nullable | Constraints & Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | No | Primary Key, Auto-incremented (`IDENTITY`) |
| `trip_id` | `BIGINT` | No | Foreign Key to `trips(id)` |
| `uploaded_by_user_id` | `BIGINT` | No | Foreign Key to `users(id)` |
| `file_name` | `VARCHAR(255)` | No | Original client filename |
| `file_type` | `VARCHAR(100)` | No | MIME content type (e.g. `application/pdf`) |
| `category` | `VARCHAR(30)` | No | Enum: `TICKET`, `BOOKING`, `RECEIPT`, `PHOTO`, `OTHER` |
| `file_size` | `BIGINT` | No | Exact file size in bytes |
| `storage_url` | `VARCHAR(500)` | No | Direct download/view URL |
| `uploaded_at` | `TIMESTAMP` | No | Timestamp of upload |

### `notifications` Table
| Column Name | PostgreSQL Type | Nullable | Constraints & Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | No | Primary Key, Auto-incremented (`IDENTITY`) |
| `recipient_id`| `BIGINT` | No | Foreign Key to `users(id)` |
| `type` | `VARCHAR(30)` | No | Enum: `TRIP_INVITE`, `BUDGET_ALERT`, `EXPENSE_SPLIT`, etc. |
| `title` | `VARCHAR(150)` | No | Short headline (e.g. "New Bill Split") |
| `message` | `TEXT` | No | Detailed descriptive text |
| `is_read` | `BOOLEAN` | No | Default `false` |
| `target_type` | `VARCHAR(30)` | Yes | Entity type for navigation (e.g. `EXPENSE`, `TRIP`) |
| `target_id` | `BIGINT` | Yes | Target entity identifier |
| `created_at` | `TIMESTAMP` | No | Timestamp of alert creation |

---

## 5. Data Transfer Objects (DTOs) & Contracts

- **`DocumentResponse`**:
  - `id`, `tripId`, `fileName`, `fileType`, `category`, `storageUrl`, `fileSizeBytes`, `fileSizeFormatted` (e.g. `"1.4 MB"`), `uploadedByUserId`, `uploadedByUserName`, `uploadedByUserEmail`, `uploadedAt`.
- **`NotificationResponse`**:
  - `id`, `type`, `title`, `message`, `isRead`, `targetType`, `targetId`, `targetUrl` (e.g. `"/trips/7/splits"`), `createdAt`, `timeAgo` (e.g. `"2 hours ago"`).

---

## 6. Service Layer & Implementation Details

### 6.1 `FileStorageService.java`
- Validates file size ($\le 10\text{ MB}$) and MIME types using Apache Tika / Spring `MultipartFile.getContentType()`.
- Generates unique filenames: `UUID.randomUUID().toString() + "_" + originalName`.
- Safely copies input stream using `Files.copy(file.getInputStream(), destinationPath, StandardCopyOption.REPLACE_EXISTING)`.
- Deletes physical files when documents are removed.

### 6.2 `DocumentVaultService.java`
- Enforces access control:
  - Any trip group member can view and download documents.
  - Only the uploader or the `GROUP_OWNER` can delete documents from the vault.

### 6.3 `NotificationService.java`
- Dispatches in-app alerts synchronously or asynchronously.
- Features an automated `@Scheduled(cron = "0 0 7 * * *")` morning cron job that scans all trips for upcoming activities starting today and delivers morning briefing notifications to travelers.

---

## 7. REST Controller API Catalog (9 Endpoints)

### Document Vault APIs (`DocumentVaultController`)
| Method | Endpoint URL | Description | Auth |
| :--- | :--- | :--- | :---: |
| **`POST`** | `/api/trips/{tripId}/documents` | Upload file (`multipart/form-data`) | Bearer JWT |
| **`GET`** | `/api/trips/{tripId}/documents` | List trip documents (filter by `category`) | Bearer JWT |
| **`GET`** | `/api/documents/{id}` | Get document metadata by ID | Bearer JWT |
| **`GET`** | `/api/documents/files/{fileName}` | Download/stream physical file | Public/JWT |
| **`DELETE`**| `/api/documents/{id}` | Delete document and remove physical file | Uploader/Owner |

### Notifications Hub APIs (`NotificationController`)
| Method | Endpoint URL | Description | Auth |
| :--- | :--- | :--- | :---: |
| **`GET`** | `/api/notifications` | Get user notifications feed | Bearer JWT |
| **`GET`** | `/api/notifications/unread-count` | Get count of unread notifications | Bearer JWT |
| **`PUT`** | `/api/notifications/{id}/read` | Mark single notification as read | Bearer JWT |
| **`PUT`** | `/api/notifications/mark-all-read` | Mark all notifications as read | Bearer JWT |

---

## 8. Postman Verification Test Suite

### 🧪 Test 1: Upload Flight Ticket (`POST /api/trips/7/documents`)
- **Method:** `POST`
- **URL:** `http://localhost:8080/api/trips/7/documents`
- **Headers:** `Authorization: Bearer {{TOKEN}}`
- **Body:** `form-data`
### 🧪 Test 1: Upload a Travel Document (multipart/form-data)
* **Goal:** Upload a flight ticket or hotel receipt to Trip #7's vault.
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/trips/7/documents`
* **Headers:** `Authorization: Bearer {{TOKEN}}`  
  *(Do NOT manually set Content-Type: multipart/form-data; Postman sets it automatically with the boundary).*
* **Body:** Select **form-data**:
  - `file`: `[File: hanumanJiJai.jpg]`
  - `category`: `TICKET`
* **Status:** `201 Created`
* **Actual Live Postman Response:**
```json
{
  "id": 1,
  "tripId": 7,
  "fileName": "hanumanJiJai.jpg",
  "fileType": "image/jpeg",
  "category": "TICKET",
  "storageUrl": "/api/documents/files/4e72a00b-3465-4b5c-98db-f4fbd13db7fb_hanumanJiJai.jpg",
  "fileSizeBytes": 55922,
  "fileSizeFormatted": "54.6 KB",
  "uploadedByUserId": 6,
  "uploadedByUserName": "aln",
  "uploadedByUserEmail": "aln@example.com",
  "uploadedAt": "2026-09-29T00:30:36.6539053"
}
```

---

### 🧪 Test 2: List All Documents for a Trip (With Category Filter)
* **Goal:** Retrieve all uploaded files for Trip #7 filtered by category.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/documents?category=TICKET`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response:**
```json
[
  {
    "id": 1,
    "tripId": 7,
    "fileName": "hanumanJiJai.jpg",
    "fileType": "image/jpeg",
    "category": "TICKET",
    "storageUrl": "/api/documents/files/4e72a00b-3465-4b5c-98db-f4fbd13db7fb_hanumanJiJai.jpg",
    "fileSizeBytes": 55922,
    "fileSizeFormatted": "54.6 KB",
    "uploadedByUserId": 6,
    "uploadedByUserName": "aln",
    "uploadedByUserEmail": "aln@example.com",
    "uploadedAt": "2026-09-29T00:30:36.653905"
  }
]
```

---

### 🧪 Test 3: List All Documents for a Trip (Unfiltered)
* **Goal:** Retrieve all uploaded files across all categories for Trip #7.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/documents`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response:**
```json
[
  {
    "id": 2,
    "tripId": 7,
    "fileName": "hanumanJiKIJai.jpg",
    "fileType": "image/jpeg",
    "category": "BOOKING",
    "storageUrl": "/api/documents/files/9b6af333-1984-469c-aab5-efbd0d1d3f72_hanumanJiKIJai.jpg",
    "fileSizeBytes": 46426,
    "fileSizeFormatted": "45.3 KB",
    "uploadedByUserId": 6,
    "uploadedByUserName": "aln",
    "uploadedByUserEmail": "aln@example.com",
    "uploadedAt": "2026-09-29T00:53:24.928574"
  },
  {
    "id": 1,
    "tripId": 7,
    "fileName": "hanumanJiJai.jpg",
    "fileType": "image/jpeg",
    "category": "TICKET",
    "storageUrl": "/api/documents/files/4e72a00b-3465-4b5c-98db-f4fbd13db7fb_hanumanJiJai.jpg",
    "fileSizeBytes": 55922,
    "fileSizeFormatted": "54.6 KB",
    "uploadedByUserId": 6,
    "uploadedByUserName": "aln",
    "uploadedByUserEmail": "aln@example.com",
    "uploadedAt": "2026-09-29T00:30:36.653905"
  }
]
```

---

### 🧪 Test 4: Download / Preview File Stream
* **Goal:** Stream the physical file from persistent storage directly in Postman or browser.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/documents/files/4e72a00b-3465-4b5c-98db-f4fbd13db7fb_hanumanJiJai.jpg`
* **Status:** `200 OK`
* **Verification:** Image previewed cleanly; binary stream sent with `Content-Disposition: inline`.

*(Additional upload verified: `INDIA-RICHEST-FORBES.png`, `category: PHOTO`, size: `105.7 KB`)*

---

### 🧪 Test 5: Delete Document from Vault
* **Goal:** Delete document record #1 and remove physical file from disk.
* **Method:** `DELETE`
* **URL:** `http://localhost:8080/api/documents/1`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response:**
```json
{
  "status": "SUCCESS",
  "message": "Document deleted successfully."
}
```

---

### 🧪 Test 6: Get Notifications Feed
* **Goal:** Retrieve logged-in traveler's notifications feed.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/notifications`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response:**
```json
[
  {
    "id": 1,
    "title": "Trip Departure Tomorrow! ✈️",
    "message": "Your trip to bluru starts tomorrow! Check your documents and tickets in the vault.",
    "type": "ACTIVITY_REMINDER",
    "targetType": "TRIP",
    "targetId": 8,
    "targetUrl": "/trips/8",
    "isRead": false,
    "createdAt": "2026-09-28T10:28:50.017034",
    "timeAgo": "15h ago"
  }
]
```

---

### 🧪 Test 7: Get Unread Notifications Count (Navbar Badge)
* **Goal:** Fast unread count for top navbar bell badge.
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/notifications/unread-count`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response:**
```json
{
  "unreadCount": 1
}
```

---

### 🧪 Test 8: Mark All Notifications as Read
* **Goal:** Clear all unread badges in one click.
* **Method:** `PUT`
* **URL:** `http://localhost:8080/api/notifications/read-all`
* **Headers:** `Authorization: Bearer {{TOKEN}}`
* **Status:** `200 OK`
* **Actual Live Postman Response:**
```json
{
  "status": "SUCCESS",
  "message": "All notifications marked as read.",
  "markedAsReadCount": 1
}
```

---

## 9. PostgreSQL Verification Queries & Database Snapshots

### Query 1: Inspect Document Vault & Storage Links
```sql
SELECT 
    dv.id,
    dv.trip_id,
    dv.file_name,
    dv.file_type,
    dv.category,
    dv.file_size,
    dv.storage_url,
    u.name AS uploaded_by,
    dv.uploaded_at
FROM document_vault dv
JOIN users u ON dv.uploaded_by_user_id = u.id
WHERE dv.trip_id = 7
ORDER BY dv.uploaded_at DESC;
```
**Database Snapshot:**
```text
 id | trip_id |     file_name      | file_type  | category | file_size |                                 storage_url                                   | uploaded_by |        uploaded_at
----+---------+--------------------+------------+----------+-----------+-------------------------------------------------------------------------------+-------------+----------------------------
  2 |       7 | hanumanJiKIJai.jpg | image/jpeg | BOOKING  |     46426 | /api/documents/files/9b6af333-1984-469c-aab5-efbd0d1d3f72_hanumanJiKIJai.jpg  | aln         | 2026-09-29 00:53:24.928574
  1 |       7 | hanumanJiJai.jpg   | image/jpeg | TICKET   |     55922 | /api/documents/files/4e72a00b-3465-4b5c-98db-f4fbd13db7fb_hanumanJiJai.jpg    | aln         | 2026-09-29 00:30:36.653905
(2 rows)
```

---

### Query 2: Inspect In-App Notifications Feed & Read Status
```sql
SELECT 
    n.id,
    n.recipient_id,
    u.name AS recipient_name,
    n.type,
    n.title,
    n.is_read,
    n.created_at
FROM notifications n
JOIN users u ON n.recipient_id = u.id
ORDER BY n.created_at DESC;
```
**Database Snapshot (pgAdmin):**
```text
id | recipient_id | recipient_name | type              | title                       | is_read | created_at
---+--------------+----------------+-------------------+-----------------------------+---------+----------------------------
1  | 6            | aln            | ACTIVITY_REMINDER | Trip Departure Tomorrow! ✈️ | true    | 2026-09-28 10:28:50.017034
```
> 💡 *Note on Windows CLI psql:* The plane emoji `✈️` uses UTF-8 bytes `0xe2 0x9c 0x88`. In pgAdmin or Linux terminal it renders cleanly; in standard Windows `cmd.exe` running on code page `WIN1252`, run `chcp 65001` before `psql` to display UTF-8 emojis without encoding errors.

---

### Query 3: Storage Breakdown by Category for a Trip
```sql
SELECT 
    category,
    COUNT(*) AS total_files,
    SUM(file_size) AS total_bytes,
    ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) AS total_mb
FROM document_vault
WHERE trip_id = 7
GROUP BY category;
```
**Database Snapshot:**
```text
 category | total_files | total_bytes | total_mb
----------+-------------+-------------+----------
 BOOKING  |           1 |       46426 |     0.04
 TICKET   |           1 |       55922 |     0.05
(2 rows)
```

---

## 10. Key Interview & Mentor Defense Points

> **Q: Why not store uploaded PDFs or images directly in a PostgreSQL `bytea` or BLOB column?**
>
> *"Storing binary assets directly in the database is an anti-pattern: it balloons database storage, causes table locks, degrades index traversal performance, and exhausts database heap memory during retrieval. In production systems, we decouple storage from metadata: binary files are streamed directly to object storage (like AWS S3 or a persistent volume), and only lightweight metadata and immutable access URLs are stored in PostgreSQL. This allows CDNs to cache media files without putting load on the database."*
