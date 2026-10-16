# TripNest — Master REST API Registry (`APIsCreated.md`)

> **Project:** TripNest Enterprise Travel Orchestration Platform  
> **Tech Stack:** Java 21, Spring Boot 3.x / 4.x, Spring Data JPA, Hibernate, PostgreSQL, Spring Security 6 (OAuth2/JWT)  
> **Maintainers:** Azn (Shreyas) & Ag (Antigravity AI Pair-Programming Buddy)  
> **File Location:** `code_Backend/MilestoneWiseBkdDocsByAg/MILESTONE_WISE_README_AG_VER/MILESTONE_WISE_PlanningBkdDocs/APIsCreated.md`  
> **Last Updated:** Milestone 3 (Tasks 1, 2, 3 & 4 Complete)  

---

## 📌 Table of Contents
1. [Overview & API Architecture Standards](#overview--api-architecture-standards)
2. [Milestone 1: Authentication & Identity Management](#milestone-1-authentication--identity-management)
3. [Milestone 2: Trips, Itineraries, Activities & Destinations](#milestone-2-trips-itineraries-activities--destinations)
   - 3.1 [Trip Management APIs](#31-trip-management-apis)
   - 3.2 [Itinerary & Day Schedule APIs](#32-itinerary--day-schedule-apis)
   - 3.3 [Activity Scheduling APIs](#33-activity-scheduling-apis)
   - 3.4 [Destination, Attractions & Weather APIs](#34-destination-attractions--weather-apis)
4. [Milestone 3: Financial Management, Splitting & Collaboration](#milestone-3-financial-management-splitting--collaboration)
   - 4.1 [Task 1: Budget Management APIs](#41-task-1-budget-management-apis)
   - 4.2 [Task 2: Expense Management APIs](#42-task-2-expense-management-apis)
   - 4.3 [Task 3: Expense Reports & Category Analytics APIs](#43-task-3-expense-reports--category-analytics-apis)
   - 4.4 [Task 4: Group Collaboration & Member Management APIs](#44-task-4-group-collaboration--member-management-apis)
   - 4.5 [Task 5: Bill Splitting & Debt Minimization APIs (Upcoming)](#45-task-5-bill-splitting--debt-minimization-apis-upcoming)
   - 4.6 [Task 6: Document Vault & Notifications APIs (Upcoming)](#46-task-6-document-vault--notifications-apis-upcoming)
5. [Summary Statistics & Milestone Completion Matrix](#summary-statistics--milestone-completion-matrix)

---

## Overview & API Architecture Standards
* **Protocol:** HTTP/1.1 RESTful JSON
* **Authentication:** Stateless Bearer JWT tokens in `Authorization: Bearer <TOKEN>` header.
* **Date-Time Formats:** ISO-8601 (`YYYY-MM-DD` for dates, `HH:mm:ss` for times).
* **Currency Math:** `BigDecimal` with scale 2 (e.g. `24200.50`).
* **HTTP Status Codes:**
  * `200 OK`: Successful read or update.
  * `201 Created`: Resource successfully created.
  * `204 No Content`: Resource successfully deleted.
  * `400 Bad Request`: Input validation or business rule violation.
  * `401 Unauthorized`: Missing or invalid JWT token.
  * `403 Forbidden`: Authenticated user does not own the requested resource.
  * `404 Not Found`: Target entity ID does not exist.

---

## Milestone 1: Authentication & Identity Management

| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/auth/register` | Register a new traveler account with BCrypt password hashing | Public | `201 Created` |
| **`POST`** | `/api/auth/login` | Authenticate with email/password and receive signed JWT token | Public | `200 OK` |
| **`GET`** | `/api/auth/me` | Fetch profile details of current authenticated user | Yes (JWT) | `200 OK` |
| **`GET`** | `/oauth2/authorization/google` | Trigger Google OAuth2 social single-sign-on redirect | Public | `302 Found` |
| **`GET`** | `/api/users/profile` | Retrieve user profile information | Yes (JWT) | `200 OK` |
| **`PUT`** | `/api/users/profile` | Update profile information (name, phone, avatar) | Yes (JWT) | `200 OK` |

---

## Milestone 2: Trips, Itineraries, Activities & Destinations

### 3.1 Trip Management APIs (`/api/trips`)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/trips` | Create a new trip with auto-generated Itinerary | Yes (JWT) | `201 Created` |
| **`GET`** | `/api/trips` | List all trips owned by the authenticated user | Yes (JWT) | `200 OK` |
| **`GET`** | `/api/trips/{id}` | Get detailed information for a specific trip | Yes (Owner) | `200 OK` |
| **`PUT`** | `/api/trips/{id}` | Update trip title, dates, travelers, or status | Yes (Owner) | `200 OK` |
| **`DELETE`**| `/api/trips/{id}` | Delete trip and cascade delete itinerary, activities, budget, expenses | Yes (Owner) | `204 No Content` |

### 3.2 Itinerary & Day Schedule APIs (`/api/trips/{tripId}/itinerary`)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`GET`** | `/api/trips/{tripId}/itinerary` | Retrieve trip itinerary and all scheduled days | Yes (Owner) | `200 OK` |
| **`POST`** | `/api/trips/{tripId}/itinerary/days` | Add a new chronological day to the itinerary | Yes (Owner) | `201 Created` |
| **`DELETE`**| `/api/trips/{tripId}/itinerary/days/{dayId}`| Remove a specific day from the itinerary | Yes (Owner) | `204 No Content` |

### 3.3 Activity Scheduling APIs (`/api/activities`)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/activities` | Schedule an activity under a day (Dining, Sightseeing, etc.) | Yes (JWT) | `201 Created` |
| **`GET`** | `/api/activities/day/{dayId}` | Fetch all scheduled activities for a specific day | Yes (JWT) | `200 OK` |
| **`PUT`** | `/api/activities/{id}` | Update activity timings, location, notes, or checklist | Yes (JWT) | `200 OK` |
| **`DELETE`**| `/api/activities/{id}` | Delete scheduled activity | Yes (JWT) | `204 No Content` |

### 3.4 Destination, Attractions & Weather APIs (`/api/destinations`, `/api/attractions`)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`GET`** | `/api/destinations` | Browse entire catalog of 47 destinations | Public | `200 OK` |
| **`GET`** | `/api/destinations/{id}` | Get destination travel guide, best season & climate | Public | `200 OK` |
| **`POST`** | `/api/destinations` | Admin: Add a new destination to catalog | Public / Admin | `200 OK` |
| **`PUT`** | `/api/destinations/{id}` | Admin: Update destination details | Public / Admin | `200 OK` |
| **`DELETE`**| `/api/destinations/{id}` | Admin: Delete destination from catalog | Public / Admin | `204 No Content` |
| **`GET`** | `/api/destinations/{destinationId}/attractions` | List tourist attractions & entry fees for a destination | Public | `200 OK` |
| **`GET`** | `/api/destinations/{id}/weather` | Fetch & cache real-time weather from OpenWeatherMap | Public | `200 OK` |
| **`POST`** | `/api/destinations/sync-weather` | Trigger bulk sync across all 47 destinations (Station Alias Engine) | Public / Admin | `200 OK` |

---

## Milestone 3: Financial Management, Splitting & Collaboration

### 4.1 Task 1: Budget Management APIs (`/api/trips/{tripId}/budget`)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/trips/{tripId}/budget` | Set or update budget limits (Upsert with $\text{allocations} \le \text{total}$ check) | Yes (Owner) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/budget` | Fetch budget ceiling, category limits, spent, and balance | Yes (Owner) | `200 OK` |
| **`DELETE`**| `/api/trips/{tripId}/budget` | Reset/delete budget configuration for the trip | Yes (Owner) | `204 No Content` |

### 4.2 Task 2: Expense Management APIs (`/api/trips/{tripId}/expenses`)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/trips/{tripId}/expenses` | Record a new expense receipt (defaults `paidBy` to JWT user) | Yes (Owner) | `201 Created` |
| **`GET`** | `/api/trips/{tripId}/expenses` | List all receipts (newest first, optional `?category=FOOD` filter) | Yes (Owner) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/expenses/{id}` | Get detailed breakdown of a single receipt | Yes (Owner) | `200 OK` |
| **`PUT`** | `/api/trips/{tripId}/expenses/{id}` | Edit an existing receipt (amount, category, notes, date) | Yes (Owner) | `200 OK` |
| **`DELETE`**| `/api/trips/{tripId}/expenses/{id}` | Delete a receipt from database | Yes (Owner) | `204 No Content` |
| **`GET`** | `/api/trips/{tripId}/expenses/total-spent` | High-speed JPQL scalar sum query (`COALESCE(SUM(amount), 0)`) | Yes (Owner) | `200 OK` |

### 4.3 Task 3: Expense Reports & Category Analytics APIs (`/api/trips/{tripId}/reports`)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`GET`** | `/api/trips/{tripId}/reports` | Master executive financial report card with KPIs, risk alerts, and categories | Yes (Owner) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/reports/full` | Alias for master trip report | Yes (Owner) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/reports/expense-summary`| Team-B Excel / Mentor specification alias | Yes (Owner) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/reports/categories` | Array of category-wise spending summaries for Chart.js visual charts | Yes (Owner) | `200 OK` |

---

### 4.4 Task 4: Group Collaboration & Double-Consent APIs (`/api/trips/{tripId}/groups`, `/api/groups/join`, `/api/groups/search`)

#### Core Squad Collaboration APIs
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/trips/{tripId}/groups` | Initialize travel group and generate destination join code | Yes (Owner) | `201 Created` |
| **`GET`** | `/api/trips/{tripId}/groups` | View group details, join code, and member roster | Yes (JWT) | `200 OK` |
| **`PUT`** | `/api/trips/{tripId}/groups` | Update travel group name | Yes (Owner/Admin) | `200 OK` |
| **`POST`** | `/api/groups/join` | Direct join trip group using 6-character Join Code | Yes (JWT) | `200 OK` |
| **`GET`** | `/api/groups/search` | Universal Search: search groups by Group ID, Join Code, or Name | Yes (JWT) | `200 OK` |
| **`POST`** | `/api/trips/{tripId}/groups/members` | Directly add companion by email (Admin direct add) | Yes (Owner/Admin) | `201 Created` |
| **`PUT`** | `/api/trips/{tripId}/groups/members/{userId}/role` | Promote/change companion role (`GROUP_ADMIN`, `GROUP_MEMBER`) | Yes (Owner) | `200 OK` |
| **`DELETE`**| `/api/trips/{tripId}/groups/members/{userId}` | Remove companion from group (Admin/Owner) or self-leave | Yes (JWT) | `204 No Content` |

#### Double-Consent Invitation & Join Request APIs (Zero Authorization Leakage)
| Method | Endpoint URL | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/trips/{tripId}/groups/invitations` | Admin sends pending invitation by email | Yes (Owner/Admin) | `201 Created` |
| **`GET`** | `/api/trips/{tripId}/groups/invitations` | Admin views pending join requests & outgoing invitations | Yes (Owner/Admin) | `200 OK` |
| **`POST`** | `/api/trips/{tripId}/groups/invitations/{id}/approve` | Admin approves traveler's join request $\rightarrow$ enrolls into squad | Yes (Owner/Admin) | `200 OK` |
| **`POST`** | `/api/trips/{tripId}/groups/invitations/{id}/reject` | Admin declines traveler's join request | Yes (Owner/Admin) | `204 No Content` |
| **`DELETE`**| `/api/trips/{tripId}/groups/invitations/{id}` | Admin cancels outgoing invitation | Yes (Owner/Admin) | `204 No Content` |
| **`POST`** | `/api/groups/join-request` | Traveler submits join request via 6-character code | Yes (JWT) | `201 Created` |
| **`GET`** | `/api/users/me/invitations` | Traveler retrieves all pending trip invitations received | Yes (JWT) | `200 OK` |
| **`POST`** | `/api/users/me/invitations/{id}/accept` | Traveler accepts invitation $\rightarrow$ enrolled into squad | Yes (JWT) | `200 OK` |
| **`POST`** | `/api/users/me/invitations/{id}/decline` | Traveler declines invitation $\rightarrow$ marked rejected | Yes (JWT) | `204 No Content` |

---

### 4.5 Task 5: Bill Splitting & Debt Minimization APIs
| Method | Endpoint URL | Description | Auth Required | Status |
| :--- | :--- | :--- | :---: | :---: |
| **`POST`** | `/api/expenses/{expenseId}/split` | Split an expense (EQUAL with Penny Balancing or CUSTOM) | Yes (JWT) | `201 Created` |
| **`GET`** | `/api/expenses/{expenseId}/splits` | View all individual split shares for a specific expense | Yes (JWT) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/splits` | View all split shares across the entire trip (JOIN FETCH optimized) | Yes (JWT) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/splits/my-debts` | View current user's active/unsettled debts in this trip | Yes (JWT) | `200 OK` |
| **`PUT`** | `/api/splits/{splitId}/settle` | Settle a specific split debt share (marks paid with timestamp) | Yes (JWT) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/splits/contributions` | Member contribution summary (Total Paid, Fair Share, Net Balance, Status) | Yes (JWT) | `200 OK` |
| **`GET`** | `/api/trips/{tripId}/debts/settle` | Greedy Debt Minimization Algorithm: simplified settlement plan ($O(N)$) | Yes (JWT) | `200 OK` |

---

### 4.6 Task 6: Document Vault & Notifications APIs *(Upcoming)*
| Method | Endpoint URL | Planned Description | Target Status |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/trips/{tripId}/documents` | Upload boarding pass, flight ticket, or hotel PDF voucher | Planned |
| `GET` | `/api/trips/{tripId}/documents` | List uploaded travel documents | Planned |
| `GET` | `/api/notifications` | Fetch budget threshold alerts & trip group invites | Planned |

---

## Summary Statistics & Milestone Completion Matrix

```text
+---------------------------------------------------------------------------------+
| Milestone                       | Status       | Active Endpoints | Test Status |
+---------------------------------+--------------+------------------+-------------+
| Milestone 1: Auth & Users       | COMPLETED    | 6 Endpoints      | Verified    |
| Milestone 2: Trips & Catalog    | COMPLETED    | 17 Endpoints     | Verified    |
| Milestone 3: Task 1 (Budget)    | COMPLETED    | 3 Endpoints      | Verified    |
| Milestone 3: Task 2 (Expenses)  | COMPLETED    | 6 Endpoints      | Verified    |
| Milestone 3: Task 3 (Reports)   | COMPLETED    | 4 Endpoints      | Verified    |
| Milestone 3: Task 4 (Groups)    | COMPLETED    | 17 Endpoints     | Verified    |
| Milestone 3: Task 5 (Splits)    | COMPLETED    | 7 Endpoints      | Ready/Test  |
| Milestone 3: Task 6 (Vault)     | NEXT         | ~5-8 Endpoints   | Queued      |
+---------------------------------------------------------------------------------+
| TOTAL ACTIVE PRODUCTION ENDPOINTS: 60 ENDPOINTS (100% BUILD SUCCESS)            |
+---------------------------------------------------------------------------------+
```

---
*Maintained by Ag for Azn's TripNest Project.*
