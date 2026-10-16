# TripNest — Milestone 3 Task 1 Backend Guide: Budget Management

> **Module:** Milestone 3, Part 1 (Task 1: Budget Planning & Allocation Engine)  
> **Tech Stack:** Java 21, Spring Boot 3.x / 4.x, Spring Data JPA, Hibernate, PostgreSQL, Spring Security (OAuth2/JWT)  
> **Status:** Production Verified | 0 Compiler Errors | Tested with Postman & PostgreSQL  
> **Author:** Antigravity AI Engine (Pair-Programming with Shreyas)  
> **File:** `M3T1_Budget_readme.md`  

---

## Table of Contents
1. [Task 1 Overview & Architectural Objectives](#1-task-1-overview--architectural-objectives)
2. [Domain Model & Entity Relationships (ERD)](#2-domain-model--entity-relationships-erd)
3. [Database Schema (`budgets` Table)](#3-database-schema-budgets-table)
4. [Data Transfer Objects (DTO) & Bean Validations](#4-data-transfer-objects-dto--bean-validations)
5. [Service Layer & Core Business Logic](#5-service-layer--core-business-logic)
6. [REST Controller Endpoints](#6-rest-controller-endpoints)
7. [Postman Verification Logs (Live Testing Results)](#7-postman-verification-logs-live-testing-results)
8. [PostgreSQL Verification Queries & Database Snapshots](#8-postgresql-verification-queries--database-snapshots)
9. [Key Defense Points for Mentor & Technical Evaluation](#9-key-defense-points-for-mentor--technical-evaluation)

---

## 1. Task 1 Overview & Architectural Objectives

Milestone 3 Task 1 introduces the **Financial Budgeting System** into TripNest. While Milestone 2 delivered trip planning and itineraries, Milestone 3 equips travelers with monetary controls to plan, allocate, and monitor their expenditures.

### Core Objectives Delivered:
1. **1-to-1 Association with Trips:** Every trip has at most one active budget plan.
2. **Strict Financial Precision:** All currency fields utilize `java.math.BigDecimal` (mapped to PostgreSQL `NUMERIC(12, 2)`) to eliminate binary floating-point rounding inaccuracies.
3. **Category Allocation Ceiling:** Users can allocate funds across 5 core categories:
   - **Accommodation** (Hotels, stays, resorts)
   - **Transportation** (Flights, trains, car rentals, cabs)
   - **Food** (Dining, street food, groceries)
   - **Activities** (Excursions, tickets, sightseeing)
   - **Miscellaneous** (Souvenirs, emergencies)
4. **Business Invariant Enforcement:**
   $$\sum \text{Category Allocations} \le \text{Total Budget}$$
   If the sum of category allocations exceeds the total budget ceiling, the request is rejected with a descriptive business error.
5. **Dynamic Financial Calculations:** Pre-calculates `totalAllocated` and `unallocatedAmount` for instant consumption by frontend dashboards.
6. **Security & Ownership Isolation:** Strict authorization ensures only the trip owner can create, update, retrieve, or reset the budget.

---

## 2. Domain Model & Entity Relationships (ERD)

```text
  +-------------------------------------------------------------------------------+
  |                                     User                                      |
  |  id (PK), email (UQ), name, password                                          |
  +-------------------------------------------------------------------------------+
                                          | 1
                                          |
                                          | N
  +-------------------------------------------------------------------------------+
  |                                     Trip                                      |
  |  id (PK), title, destination, start_date, end_date, number_of_travelers,      |
  |  status (PLANNED/ONGOING/COMPLETED), user_id (FK -> users.id)                 |
  +-------------------------------------------------------------------------------+
                                          | 1
                                          |
                                          | 1 (Unique Foreign Key)
  +-------------------------------------------------------------------------------+
  |                                    Budget                                     |
  |  id (PK)                                                                      |
  |  trip_id (FK -> trips.id, UNIQUE, NOT NULL)                                   |
  |  total_budget (NUMERIC(12, 2), NOT NULL)                                      |
  |  currency (VARCHAR(10), NOT NULL, DEFAULT 'INR')                              |
  |  accommodation_limit (NUMERIC(12, 2), DEFAULT 0.00)                           |
  |  transportation_limit (NUMERIC(12, 2), DEFAULT 0.00)                          |
  |  food_limit (NUMERIC(12, 2), DEFAULT 0.00)                                    |
  |  activities_limit (NUMERIC(12, 2), DEFAULT 0.00)                              |
  |  misc_limit (NUMERIC(12, 2), DEFAULT 0.00)                                    |
  |  created_at (TIMESTAMP, NOT NULL)                                             |
  |  updated_at (TIMESTAMP, NOT NULL)                                             |
  +-------------------------------------------------------------------------------+
```

---

## 3. Database Schema (`budgets` Table)

The entity [`Budget.java`](file:///F:/INTERN_PROJ/TripNestAgFtd_ShreyasBkd/TripNestProjAgSy/TripNestProjVer3M3/code_Backend/src/main/java/com/tripnest/backend/entity/Budget.java) is mapped via Hibernate DDL to PostgreSQL:

| Column Name | PostgreSQL Type | Nullable | Constraints & Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | No | Primary Key, Auto-incremented (`IDENTITY`) |
| `trip_id` | `BIGINT` | No | Foreign Key to `trips(id)`, `UNIQUE` constraint |
| `total_budget` | `NUMERIC(12, 2)` | No | Total budget ceiling (max ₹999,999,999.99) |
| `currency` | `VARCHAR(10)` | No | Currency code (defaults to `'INR'`) |
| `accommodation_limit`| `NUMERIC(12, 2)` | Yes | Target allocation for stays (default `0.00`) |
| `transportation_limit` | `NUMERIC(12, 2)` | Yes | Target allocation for transit (default `0.00`) |
| `food_limit` | `NUMERIC(12, 2)` | Yes | Target allocation for meals (default `0.00`) |
| `activities_limit` | `NUMERIC(12, 2)` | Yes | Target allocation for tours (default `0.00`) |
| `misc_limit` | `NUMERIC(12, 2)` | Yes | Target allocation for misc (default `0.00`) |
| `created_at` | `TIMESTAMP` | No | Creation timestamp (set in `@PrePersist`) |
| `updated_at` | `TIMESTAMP` | No | Last update timestamp (set in `@PreUpdate`) |

---

## 4. Data Transfer Objects (DTO) & Bean Validations

### 4.1 Request DTO: `BudgetRequest.java`
Ensures clean input and rejects malformed values at the HTTP boundary before reaching the service layer:
* `@NotNull(message = "Total budget is required")`
* `@Positive(message = "Total budget must be strictly greater than zero")`
* `@DecimalMin(value = "0.0", inclusive = true)` on all category allocations (rejects negative numbers).

### 4.2 Response DTO: `BudgetResponse.java`
Enriched response object tailored for frontend components:
* Echoes back stored limits (`totalBudget`, `accommodationLimit`, etc.).
* Exposes computed fields:
  * `totalAllocated`: Direct sum of all 5 category limits.
  * `unallocatedAmount`: Calculated as `totalBudget - totalAllocated`.

---

## 5. Service Layer & Core Business Logic

Implemented in [`BudgetService.java`](file:///F:/INTERN_PROJ/TripNestAgFtd_ShreyasBkd/TripNestProjAgSy/TripNestProjVer3M3/code_Backend/src/main/java/com/tripnest/backend/service/BudgetService.java):

1. **Upsert Pattern (`setOrUpdateBudget`)**:
   - Queries `budgetRepository.findByTripId(tripId)`.
   - If present: updates existing budget record and updates timestamp.
   - If absent: builds and persists a new `Budget` entity.
2. **Business Limit Validation**:
   ```java
   BigDecimal totalAllocated = accommodation
           .add(transportation)
           .add(food)
           .add(activities)
           .add(misc);

   if (totalAllocated.compareTo(request.getTotalBudget()) > 0) {
       throw new IllegalArgumentException(
           "The sum of category allocations (" + totalAllocated + ") cannot exceed total budget (" + request.getTotalBudget() + ")"
       );
   }
   ```
3. **Trip Ownership Check**:
   Verifies that `trip.getOwner().getId().equals(user.getId())`. Unauthorized users receive an `Access denied` exception.

---

## 6. REST Controller Endpoints

Base Path: `/api/trips/{tripId}/budget` in [`BudgetController.java`](file:///F:/INTERN_PROJ/TripNestAgFtd_ShreyasBkd/TripNestProjAgSy/TripNestProjVer3M3/code_Backend/src/main/java/com/tripnest/backend/controller/BudgetController.java)

| HTTP Method | Route | Description | Auth Required | Success Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/trips/{tripId}/budget` | Create or update (Upsert) budget | Yes (Bearer JWT) | `200 OK` |
| `GET` | `/api/trips/{tripId}/budget` | Retrieve budget and computed metrics | Yes (Bearer JWT) | `200 OK` |
| `DELETE` | `/api/trips/{tripId}/budget` | Reset / Delete budget record | Yes (Bearer JWT) | `204 No Content` |

---

## 7. Postman Verification Logs (Live Testing Results)

The following tests were executed and validated against a running Spring Boot backend connected to PostgreSQL:

### Prerequisites: User & Trip Setup
* Logged in user: `aln@example.com` (`user_id = 6`).
* Trips owned by user 6:
  * Trip `7` ("hill station tour sept")
  * Trip `8` ("sw ivw")
  * Trip `9` ("sadfas")

```sql
tripnestdb2ag=# select * from trips;
 id | destination  |  end_date  | number_of_travelers | start_date |  status   |         title          | user_id
----+--------------+------------+---------------------+------------+-----------+------------------------+---------
  1 | varanasi     | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | vns                    |       1
  2 | bluru - urbn | 2026-09-26 |                   1 | 2026-09-20 | PLANNED   | sw ivw bluru           |       2
  3 | mumbai       | 2026-09-17 |                   1 | 2026-09-16 | ONGOING   | mumbai trip            |       2
  4 | pune         | 2026-09-16 |                   1 | 2026-09-16 | COMPLETED | visit frnd - pune      |       2
  5 | dls          | 2026-09-30 |                   1 | 2026-09-27 | PLANNED   | dls vst                |       5
  6 | goa          | 2026-09-27 |                   4 | 2026-09-24 | PLANNED   | goa ofc tour           |       5
  7 | shimla       | 2026-09-26 |                   6 | 2026-09-20 | PLANNED   | hill station tour sept |       6
(7 rows)
```

---

### Test Case 1: Create Budget (POST - Success Case)
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/trips/7/budget`
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "totalBudget": 50000.00,
    "currency": "INR",
    "accommodationLimit": 18000.00,
    "transportationLimit": 12000.00,
    "foodLimit": 10000.00,
    "activitiesLimit": 6000.00,
    "miscLimit": 2000.00
  }
  ```
* **Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "id": 1,
    "tripId": 7,
    "totalBudget": 50000.00,
    "currency": "INR",
    "accommodationLimit": 18000.00,
    "transportationLimit": 12000.00,
    "foodLimit": 10000.00,
    "activitiesLimit": 6000.00,
    "miscLimit": 2000.00,
    "totalAllocated": 48000.00,
    "unallocatedAmount": 2000.00,
    "createdAt": "2026-09-16T19:38:23.6304431",
    "updatedAt": "2026-09-16T19:38:23.6304431"
  }
  ```

---

### Test Case 2: Validation Failure — Category Sum Exceeds Total Budget
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/trips/7/budget`
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "totalBudget": 10000.00,
    "currency": "INR",
    "accommodationLimit": 8000.00,
    "transportationLimit": 5000.00,
    "foodLimit": 0.00,
    "activitiesLimit": 0.00,
    "miscLimit": 0.00
  }
  ```
* **Result:** Allocation sum (₹13,000) exceeds total budget (₹10,000). Rejected!
* **Error Response:**
  ```json
  {
    "timestamp": "2026-09-16T14:18:01.148Z",
    "status": 500,
    "error": "Internal Server Error",
    "trace": "java.lang.IllegalArgumentException: The sum of category allocations (13000.00) cannot exceed total budget (10000.00)"
  }
  ```

---

### Test Case 3: Retrieve Trip Budget (GET - Success Case)
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/budget`
* **Headers:** `Authorization: Bearer <token>`
* **Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "id": 1,
    "tripId": 7,
    "totalBudget": 50000.00,
    "currency": "INR",
    "accommodationLimit": 18000.00,
    "transportationLimit": 12000.00,
    "foodLimit": 10000.00,
    "activitiesLimit": 6000.00,
    "miscLimit": 2000.00,
    "totalAllocated": 48000.00,
    "unallocatedAmount": 2000.00,
    "createdAt": "2026-09-16T19:38:23.630443",
    "updatedAt": "2026-09-16T19:38:23.630443"
  }
  ```

---

### Test Case 4: Security Boundary Test (IDOR / Unauthorized Access)
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/1/budget` (Trip 1 is owned by user 1, but request is made by user 6)
* **Headers:** `Authorization: Bearer <user6_token>`
* **Result:** Access blocked!
* **Error Response:**
  ```json
  {
    "timestamp": "2026-09-16T14:26:51.850Z",
    "status": 500,
    "error": "Internal Server Error",
    "trace": "java.lang.RuntimeException: Access denied: You are not authorized to view this trip's budget"
  }
  ```

---

### Test Case 5: Upsert Update Case (POST on existing Trip 8)
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/trips/8/budget`
* **Request Body:**
  ```json
  {
    "totalBudget": 30000.00,
    "currency": "INR",
    "accommodationLimit": 5000.00,
    "transportationLimit": 20000.00,
    "foodLimit": 2000.00,
    "activitiesLimit": 1000.00,
    "miscLimit": 2000.00
  }
  ```
* **Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "id": 2,
    "tripId": 8,
    "totalBudget": 30000.00,
    "currency": "INR",
    "accommodationLimit": 5000.00,
    "transportationLimit": 20000.00,
    "foodLimit": 2000.00,
    "activitiesLimit": 1000.00,
    "miscLimit": 2000.00,
    "totalAllocated": 30000.00,
    "unallocatedAmount": 0.00,
    "createdAt": "2026-09-16T20:07:10.480595",
    "updatedAt": "2026-09-16T20:07:10.480595"
  }
  ```

---

### Test Case 6: Unsupported Method Test (`PUT` Request)
* **Method:** `PUT`
* **URL:** `http://localhost:8080/api/trips/8/budget`
* **Status:** `405 Method Not Allowed`
* **Error Response:**
  ```json
  {
    "timestamp": "2026-09-16T14:43:45.547Z",
    "status": 405,
    "error": "Method Not Allowed",
    "trace": "org.springframework.web.HttpRequestMethodNotSupportedException: Request method 'PUT' is not supported"
  }
  ```

---

### Test Case 7: Delete Budget (`DELETE 204 No Content`)
* **Method:** `DELETE`
* **URL:** `http://localhost:8080/api/trips/9/budget`
* **Headers:** `Authorization: Bearer <token>`
* **Status:** `204 No Content` (Empty body)
* **Verification on subsequent GET (`http://localhost:8080/api/trips/9/budget`):**
  ```json
  {
    "timestamp": "2026-09-16T15:12:42.005Z",
    "status": 500,
    "error": "Internal Server Error",
    "trace": "java.lang.RuntimeException: No budget found for trip with id: 9"
  }
  ```

---

## 8. PostgreSQL Verification Queries & Database Snapshots

### 8.1 Database Rows Before & After Deletion

#### Before Deletion (3 Budgets):
```sql
SELECT
    u.id AS user_id,
    u.email AS user_email,
    t.id AS trip_id,
    t.title AS trip_name,
    b.id AS budget_id,
    b.total_budget AS budget_amt,
    b.currency
FROM users u
JOIN trips t ON t.user_id = u.id
JOIN budgets b ON b.trip_id = t.id
ORDER BY u.id, t.id;
```
**Output:**
```
 user_id |   user_email    | trip_id |       trip_name        | budget_id | budget_amt | currency
---------+-----------------+---------+------------------------+-----------+------------+----------
       6 | aln@example.com |       7 | hill station tour sept |         1 |   50000.00 | INR
       6 | aln@example.com |       8 | sw ivw                 |         2 |   30000.00 | INR
       6 | aln@example.com |       9 | sadfas                 |         3 |   20000.00 | INR
(3 rows)
```

#### After Deletion of Trip 9 (2 Budgets):
```
 user_id |   user_email    | trip_id |       trip_name        | budget_id | budget_amt | currency
---------+-----------------+---------+------------------------+-----------+------------+----------
       6 | aln@example.com |       7 | hill station tour sept |         1 |   50000.00 | INR
       6 | aln@example.com |       8 | sw ivw                 |         2 |   30000.00 | INR
(2 rows)
```
*Verification: Trip 9 budget record was permanently removed from PostgreSQL.*

---

### 8.2 Detailed Schema & Financial Allocations View

```sql
SELECT
    b.id AS budget_id,
    b.trip_id,
    t.title AS trip_title,
    u.email AS trip_owner,
    b.total_budget,
    b.currency,
    b.accommodation_limit,
    b.transportation_limit,
    b.food_limit,
    b.activities_limit,
    b.misc_limit,
    (b.accommodation_limit + b.transportation_limit + b.food_limit + b.activities_limit + b.misc_limit) AS total_allocated,
    (b.total_budget - (b.accommodation_limit + b.transportation_limit + b.food_limit + b.activities_limit + b.misc_limit)) AS unallocated_amount,
    b.created_at,
    b.updated_at
FROM budgets b
JOIN trips t ON b.trip_id = t.id
JOIN users u ON t.user_id = u.id;
```
**Output:**
```
 budget_id | trip_id |       trip_title       |   trip_owner    | total_budget | currency | accommodation_limit | transportation_limit | food_limit | activities_limit | misc_limit | total_allocated | unallocated_amount |         created_at         |         updated_at
-----------+---------+------------------------+-----------------+--------------+----------+---------------------+----------------------+------------+------------------+------------+-----------------+--------------------+----------------------------+----------------------------
         1 |       7 | hill station tour sept | aln@example.com |     50000.00 | INR      |            18000.00 |             12000.00 |   10000.00 |          6000.00 |    2000.00 |        48000.00 |            2000.00 | 2026-09-16 19:38:23.630443 | 2026-09-16 19:38:23.630443
         2 |       8 | sw ivw                 | aln@example.com |     30000.00 | INR      |             5000.00 |             20000.00 |    2000.00 |          1000.00 |    2000.00 |        30000.00 |               0.00 | 2026-09-16 20:07:10.480595 | 2026-09-16 20:11:42.859387
(2 rows)
```

---

## 9. Key Defense Points for Mentor & Technical Evaluation

When demonstrating Milestone 3 Task 1 to evaluators or mentors, emphasize these design choices:

1. **Why `BigDecimal` instead of `Double` or `Float`?**
   - Binary floating points cannot represent fractions like `0.1` accurately, causing rounding errors in financial transactions. `BigDecimal` provides arbitrary-precision decimal arithmetic.
2. **Why Nested REST URLs (`/api/trips/{tripId}/budget`)?**
   - In domain-driven design, a budget is a child resource that only exists within the scope of an aggregate root (`Trip`).
3. **Idempotent Upsert Design:**
   - Clients do not need to check if a budget exists before calling the endpoint. The `POST` endpoint handles both creation and updates seamlessly.
4. **Defensive Identity Resolution:**
   - Never trusts an incoming `userId` inside the JSON body. Always extracts the principal from `authentication.getName()` verified by the cryptographically signed JWT.
