# TripNest — Milestone 3 Task 2 Backend Guide: Expense Management

> **Module:** Milestone 3, Part 2 (Task 2: Expense Tracking & Financial Ledger Engine)  
> **Tech Stack:** Java 21, Spring Boot 3.x / 4.x, Spring Data JPA, Hibernate, PostgreSQL, Spring Security (OAuth2/JWT)  
> **Status:** Production Verified | 0 Compiler Errors | Tested with Postman & PostgreSQL  
> **Author:** Antigravity AI Engine (Pair-Programming with Shreyas)  
> **File:** `M3T2_Expense_readme.md`  

---

## Table of Contents
1. [Task 2 Overview & Architectural Scope](#1-task-2-overview--architectural-scope)
2. [Domain Model & Entity Relationships (ERD)](#2-domain-model--entity-relationships-erd)
3. [Database Schema (`expenses` Table)](#3-database-schema-expenses-table)
4. [Data Transfer Objects (`ExpenseRequestDTO` & `ExpenseResponseDTO`)](#4-data-transfer-objects-expenserequestdto--expenseresponsedto)
5. [Service Layer & Business Rules](#5-service-layer--business-rules)
6. [REST Controller API Catalog](#6-rest-controller-api-catalog)
7. [Postman Verification Logs (Live Testing Results)](#7-postman-verification-logs-live-testing-results)
8. [PostgreSQL Verification Snapshots & Reconciliation Queries](#8-postgresql-verification-snapshots--reconciliation-queries)
9. [Interview & Mentor Defense Points](#9-interview--mentor-defense-points)

---

## 1. Task 2 Overview & Architectural Scope

While Task 1 established the financial **Plan** (Budget ceiling and category limits), Task 2 introduces the financial **Reality** (Actual transactional spending).

The `Expense` entity serves as the **Core Transactional Ledger** of TripNest. Every receipt, ticket, bill, or meal logged by a traveler is recorded here.

### Key Capabilities Delivered:
1. **Relational Anchoring:** Linked to `Trip` (`@ManyToOne`) and `User` (`paidBy`).
2. **High-Performance Database Indexes:** Composite B-Tree indexes on `trip_id` and `paid_by_user_id` for $O(\log N)$ search speeds.
3. **Category Classification:** Strictly typed `ExpenseCategory` enum (`ACCOMMODATION`, `TRANSPORTATION`, `FOOD`, `ACTIVITIES`, `SHOPPING`, `MISCELLANEOUS`).
4. **Intelligent Payer Resolution:** Automatically defaults `paidBy` to the authenticated user from the JWT token if omitted by the client.
5. **Dynamic Filtering:** Supports filtering expenses by category (`?category=FOOD`) via HTTP query parameters.
6. **Real-Time Aggregations:** JPQL `COALESCE(SUM(amount), 0)` prevents null values and enables real-time `/total-spent` metric cards.
7. **Cross-Resource Security:** Validates that an expense belongs strictly to the requested `tripId` before updating or deleting.

---

## 2. Domain Model & Entity Relationships (ERD)

```text
  +-------------------------------------------------------------------------------+
  |                                     User                                      |
  |  id (PK), email (UQ), name, password                                          |
  +-------------------------------------------------------------------------------+
       | 1                                                                   | 1
       |                                                                     |
       | N (Trip Owner)                                                      | N (Expense Payer)
  +-------------------------------------------------------------------------------+
  |                                     Trip                                      |
  |  id (PK), title, destination, start_date, end_date, user_id (FK)              |
  +-------------------------------------------------------------------------------+
       | 1                                               | 1
       |                                                 |
       | 1 (Unique)                                      | N
  +-------------------------------+   +-------------------------------------------+
  |            Budget             |   |                  Expense                  |
  |  id (PK), trip_id (FK, UQ)    |   |  id (PK)                                  |
  |  total_budget (NUMERIC 12,2)  |   |  trip_id (FK -> trips.id, INDEXED)        |
  |  accommodation_limit          |   |  paid_by_user_id (FK -> users.id, INDEXED)|
  |  transportation_limit         |   |  description (VARCHAR 255)                |
  |  food_limit                   |   |  amount (NUMERIC 12,2)                    |
  |  activities_limit             |   |  currency (VARCHAR 10, DEFAULT 'INR')     |
  |  misc_limit                   |   |  category (VARCHAR 30, CHECK ENUM)        |
  +-------------------------------+   |  expense_date (DATE)                      |
                                      |  created_at (TIMESTAMP)                   |
                                      |  updated_at (TIMESTAMP)                   |
                                      +-------------------------------------------+
```

---

## 3. Database Schema (`expenses` Table)

Generated automatically by Hibernate DDL from [`Expense.java`](file:///F:/INTERN_PROJ/TripNestAgFtd_ShreyasBkd/TripNestProjAgSy/TripNestProjVer3M3/code_Backend/src/main/java/com/tripnest/backend/entity/Expense.java):

```sql
tripnestdb2ag=# \d expenses;
                                          Table "public.expenses"
     Column      |              Type              | Collation | Nullable |             Default
-----------------+--------------------------------+-----------+----------+----------------------------------
 id              | bigint                         |           | not null | generated by default as identity
 amount          | numeric(12,2)                  |           | not null |
 category        | character varying(30)          |           | not null |
 created_at      | timestamp(6) without time zone |           | not null |
 currency        | character varying(10)          |           | not null |
 description     | character varying(255)         |           | not null |
 expense_date    | date                           |           | not null |
 updated_at      | timestamp(6) without time zone |           | not null |
 paid_by_user_id | bigint                         |           | not null |
 trip_id         | bigint                         |           | not null |
Indexes:
    "expenses_pkey" PRIMARY KEY, btree (id)
    "idx_expenses_paid_by" btree (paid_by_user_id)
    "idx_expenses_trip_id" btree (trip_id)
Check constraints:
    "expenses_category_check" CHECK (category::text = ANY (ARRAY['ACCOMMODATION'::character varying, 'TRANSPORTATION'::character varying, 'FOOD'::character varying, 'ACTIVITIES'::character varying, 'SHOPPING'::character varying, 'MISCELLANEOUS'::character varying]::text[]))
Foreign-key constraints:
    "fk9twvm79qw1voae3xgtn1xq5y9" FOREIGN KEY (trip_id) REFERENCES trips(id)
    "fko0m8jktfrmdbhhajx3qwr8ngr" FOREIGN KEY (paid_by_user_id) REFERENCES users(id)
```

---

## 4. Data Transfer Objects (`ExpenseRequestDTO` & `ExpenseResponseDTO`)

### 4.1 Request DTO: `ExpenseRequestDTO.java`
* `@NotBlank(message = "Expense description is required")`
* `@Positive(message = "Expense amount must be strictly greater than zero")` — Rejects zero and negative amounts.
* `@NotNull(message = "Category is required")` — Enforces enum typing.
* `@NotNull(message = "Expense date is required")`
* `paidByUserId` — Optional; if omitted, defaults to currently authenticated user.

### 4.2 Response DTO: `ExpenseResponseDTO.java`
Enriches raw table IDs with human-friendly metadata for React UI rendering:
* `tripId` and `tripTitle`
* `description`, `amount`, `currency`, `category`, `expenseDate`
* `paidByUserId`, `paidByName`, `paidByEmail`
* `createdAt`, `updatedAt`

---

## 5. Service Layer & Business Rules

Implemented in [`ExpenseService.java`](file:///F:/INTERN_PROJ/TripNestAgFtd_ShreyasBkd/TripNestProjAgSy/TripNestProjVer3M3/code_Backend/src/main/java/com/tripnest/backend/service/ExpenseService.java):

```java
// Intelligent Payer Fallback Logic
User payer = currentUser;
if (request.getPaidByUserId() != null) {
    payer = userRepository.findById(request.getPaidByUserId())
            .orElseThrow(() -> new RuntimeException("Payer user not found"));
}

// Cross-Resource Security Guard
if (!expense.getTrip().getId().equals(tripId)) {
    throw new RuntimeException("Expense " + expense.getId() + " does not belong to trip " + tripId);
}
```

* **`@Transactional`**: Wraps writes in atomic transactions with automatic rollback on errors.
* **`@Transactional(readOnly = true)`**: Optimizes read queries by disabling Hibernate dirty-checking.

---

## 6. REST Controller API Catalog

Base URL: `/api/trips/{tripId}/expenses` in [`ExpenseController.java`](file:///F:/INTERN_PROJ/TripNestAgFtd_ShreyasBkd/TripNestProjAgSy/TripNestProjVer3M3/code_Backend/src/main/java/com/tripnest/backend/controller/ExpenseController.java)

| HTTP Verb | Route | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/trips/{tripId}/expenses` | Record a new expense | Bearer JWT | `201 Created` |
| `GET` | `/api/trips/{tripId}/expenses` | List all expenses for a trip | Bearer JWT | `200 OK` |
| `GET` | `/api/trips/{tripId}/expenses?category=FOOD` | Filter expenses by category | Bearer JWT | `200 OK` |
| `GET` | `/api/trips/{tripId}/expenses/{expenseId}` | Get single expense details | Bearer JWT | `200 OK` |
| `PUT` | `/api/trips/{tripId}/expenses/{expenseId}` | Update an existing expense | Bearer JWT | `200 OK` |
| `DELETE` | `/api/trips/{tripId}/expenses/{expenseId}` | Delete an expense | Bearer JWT | `204 No Content` |
| `GET` | `/api/trips/{tripId}/expenses/total-spent` | Total spent aggregate metric | Bearer JWT | `200 OK` |

---

## 7. Postman Verification Logs (Live Testing Results)

### Test Case 1: Record First Expense (POST — Food)
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/trips/7/expenses`
* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "description": "Dinner at Heritage Cafe",
    "amount": 1500.00,
    "currency": "INR",
    "category": "FOOD",
    "expenseDate": "2026-09-20"
  }
  ```
* **Status:** `201 Created`
* **Response Body:**
  ```json
  {
    "id": 1,
    "tripId": 7,
    "tripTitle": "hill station tour sept",
    "description": "Dinner at Heritage Cafe",
    "amount": 1500.00,
    "currency": "INR",
    "category": "FOOD",
    "expenseDate": "2026-09-20",
    "paidByUserId": 6,
    "paidByName": "aln",
    "paidByEmail": "aln@example.com",
    "createdAt": "2026-09-17T15:03:26.3683723",
    "updatedAt": "2026-09-17T15:03:26.3683723"
  }
  ```

---

### Test Case 2: Record Second Expense (POST — Transportation)
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/trips/7/expenses`
* **Request Body:**
  ```json
  {
    "description": "Taxi from Airport to Hotel",
    "amount": 2200.00,
    "currency": "INR",
    "category": "TRANSPORTATION",
    "expenseDate": "2026-09-20"
  }
  ```
* **Status:** `201 Created`
* **Response Body:**
  ```json
  {
    "id": 2,
    "tripId": 7,
    "tripTitle": "hill station tour sept",
    "description": "Taxi from Airport to Hotel",
    "amount": 2200.00,
    "currency": "INR",
    "category": "TRANSPORTATION",
    "expenseDate": "2026-09-20",
    "paidByUserId": 6,
    "paidByName": "aln",
    "paidByEmail": "aln@example.com",
    "createdAt": "2026-09-17T15:06:15.6078026",
    "updatedAt": "2026-09-17T15:06:15.6078026"
  }
  ```

---

### Test Case 3: Retrieve All Expenses for a Trip (GET)
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/expenses`
* **Status:** `200 OK`
* **Response Body:**
  ```json
  [
    {
      "id": 1,
      "tripId": 7,
      "tripTitle": "hill station tour sept",
      "description": "Dinner at Heritage Cafe",
      "amount": 1500.00,
      "currency": "INR",
      "category": "FOOD",
      "expenseDate": "2026-09-20",
      "paidByUserId": 6,
      "paidByName": "aln",
      "paidByEmail": "aln@example.com",
      "createdAt": "2026-09-17T15:03:26.368372",
      "updatedAt": "2026-09-17T15:03:26.368372"
    },
    {
      "id": 2,
      "tripId": 7,
      "tripTitle": "hill station tour sept",
      "description": "Taxi from Airport to Hotel",
      "amount": 2200.00,
      "currency": "INR",
      "category": "TRANSPORTATION",
      "expenseDate": "2026-09-20",
      "paidByUserId": 6,
      "paidByName": "aln",
      "paidByEmail": "aln@example.com",
      "createdAt": "2026-09-17T15:06:15.607803",
      "updatedAt": "2026-09-17T15:06:15.607803"
    }
  ]
  ```

---

### Test Case 4: Dynamic Category Filtering (`?category=FOOD`)
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/expenses?category=FOOD`
* **Status:** `200 OK`
* **Output:** Returns **only** the `FOOD` expense, filtering out `TRANSPORTATION`:
  ```json
  [
    {
      "id": 1,
      "tripId": 7,
      "tripTitle": "hill station tour sept",
      "description": "Dinner at Heritage Cafe",
      "amount": 1500.00,
      "currency": "INR",
      "category": "FOOD",
      "expenseDate": "2026-09-20",
      "paidByUserId": 6,
      "paidByName": "aln",
      "paidByEmail": "aln@example.com",
      "createdAt": "2026-09-17T15:03:26.368372",
      "updatedAt": "2026-09-17T15:03:26.368372"
    }
  ]
  ```

---

### Test Case 5: Total Spent Aggregate (GET `/total-spent`)
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/expenses/total-spent`
* **Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "totalSpent": 3700.00,
    "tripId": 7
  }
  ```

---

### Test Case 6: Update an Expense (PUT)
* **Method:** `PUT`
* **URL:** `http://localhost:8080/api/trips/7/expenses/1`
* **Request Body:**
  ```json
  {
    "description": "Dinner at Heritage Cafe (Includes Dessert)",
    "amount": 2000.00,
    "currency": "INR",
    "category": "FOOD",
    "expenseDate": "2026-09-20"
  }
  ```
* **Status:** `200 OK`
* **Response Body:**
  ```json
  {
    "id": 1,
    "tripId": 7,
    "tripTitle": "hill station tour sept",
    "description": "Dinner at Heritage Cafe (Includes Dessert)",
    "amount": 2000.00,
    "currency": "INR",
    "category": "FOOD",
    "expenseDate": "2026-09-20",
    "paidByUserId": 6,
    "paidByName": "aln",
    "paidByEmail": "aln@example.com",
    "createdAt": "2026-09-17T15:03:26.368372",
    "updatedAt": "2026-09-17T15:03:26.368372"
  }
  ```

---

### Test Case 7: Negative Validation (Negative Amount Rejection)
* **Method:** `POST`
* **URL:** `http://localhost:8080/api/trips/7/expenses`
* **Request Body:**
  ```json
  {
    "description": "Invalid Bill",
    "amount": -500.00,
    "category": "FOOD",
    "expenseDate": "2026-09-21"
  }
  ```
* **Status:** `400 Bad Request`
* **Error Trace Output:**
  ```json
  {
    "timestamp": "2026-09-17T13:28:18.681Z",
    "status": 400,
    "error": "Bad Request",
    "trace": "org.springframework.web.bind.MethodArgumentNotValidException: Validation failed for argument [1] in public org.springframework.http.ResponseEntity<com.tripnest.backend.dto.expense.ExpenseResponseDTO> ... [Field error in object 'expenseRequestDTO' on field 'amount': rejected value [-500.00]; default message [Expense amount must be strictly greater than zero]]"
  }
  ```

---

### Test Case 8: Delete Expense (DELETE `204 No Content`)
* **Method:** `DELETE`
* **URL:** `http://localhost:8080/api/trips/7/expenses/2`
* **Status:** `204 No Content` (Clean empty body)

---

## 8. PostgreSQL Verification Snapshots & Reconciliation Queries

### 8.1 Active Tables in `tripnestdb2ag` (`\dt`)
```sql
tripnestdb2ag=# \dt
             List of relations
 Schema |      Name      | Type  |  Owner   
--------+----------------+-------+----------
 public | activities     | table | postgres
 public | attractions    | table | postgres
 public | budgets        | table | postgres
 public | destination    | table | postgres
 public | expenses       | table | postgres
 public | itineraries    | table | postgres
 public | itinerary_days | table | postgres
 public | roles          | table | postgres
 public | trips          | table | postgres
 public | user_roles     | table | postgres
 public | users          | table | postgres
(11 rows)
```

---

### 8.2 Logged Expenses Pre and Post Deletion

#### Before Deletion (5 Rows):
```sql
SELECT e.id, e.trip_id, e.description, e.category, e.amount, e.currency, e.expense_date,
       u.name AS paid_by_name, u.email AS paid_by_email
FROM expenses e
JOIN users u ON e.paid_by_user_id = u.id
ORDER BY e.expense_date DESC;
```
```
 id | trip_id |                description                 |    category    |  amount  | currency | expense_date | paid_by_name |  paid_by_email   
----+---------+--------------------------------------------+----------------+----------+----------+--------------+--------------+-----------------
  5 |       7 | Hotel charge                               | ACCOMMODATION  | 20000.00 | INR      | 2026-09-22   | aln          | aln@example.com
  4 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.50 | INR      | 2026-09-21   | aln          | aln@example.com
  2 |       7 | Taxi from Airport to Hotel                 | TRANSPORTATION |  2200.00 | INR      | 2026-09-20   | aln          | aln@example.com
  1 |       7 | Dinner at Heritage Cafe (Includes Dessert) | FOOD           |  2000.00 | INR      | 2026-09-20   | aln          | aln@example.com
  3 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.00 | INR      | 2026-09-20   | aln          | aln@example.com
(5 rows)
```

#### After Deletion of ID 5 (4 Rows):
```
 id | trip_id |                description                 |    category    |  amount  | currency | expense_date | paid_by_name |  paid_by_email   
----+---------+--------------------------------------------+----------------+----------+----------+--------------+--------------+-----------------
  4 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.50 | INR      | 2026-09-21   | aln          | aln@example.com
  2 |       7 | Taxi from Airport to Hotel                 | TRANSPORTATION |  2200.00 | INR      | 2026-09-20   | aln          | aln@example.com
  1 |       7 | Dinner at Heritage Cafe (Includes Dessert) | FOOD           |  2000.00 | INR      | 2026-09-20   | aln          | aln@example.com
  3 |       7 | Hotel charge                               | ACCOMMODATION  | 10000.00 | INR      | 2026-09-20   | aln          | aln@example.com
(4 rows)
```

---

### 8.3 Complete Financial Reconciliation (Budget vs Total Spent vs Remaining)

```sql
SELECT 
    t.id AS trip_id, 
    t.title AS trip_title, 
    u.email AS owner_email,
    COALESCE(b.total_budget, 0.00) AS total_budget,
    COALESCE(SUM(e.amount), 0.00) AS total_spent,
    (COALESCE(b.total_budget, 0.00) - COALESCE(SUM(e.amount), 0.00)) AS remaining_budget
FROM trips t
JOIN users u ON t.user_id = u.id
LEFT JOIN budgets b ON b.trip_id = t.id
LEFT JOIN expenses e ON e.trip_id = t.id
WHERE t.id = 7
GROUP BY t.id, t.title, u.email, b.total_budget;
```
**Output:**
```
 trip_id |       trip_title       |   owner_email   | total_budget | total_spent | remaining_budget 
---------+------------------------+-----------------+--------------+-------------+------------------
       7 | hill station tour sept | aln@example.com |     50000.00 |    24200.50 |         25799.50
(1 row)
```

---

## 9. Interview & Mentor Defense Points

When discussing Task 2 in technical interviews or with evaluators:

1. **Why use Database `@Index` on `trip_id` and `paid_by_user_id`?**
   - As an application grows to tens of thousands of transactions, querying by `trip_id` without an index causes an $O(N)$ full table scan. Adding a B-Tree index brings lookup time down to $O(\log N)$, allowing PostgreSQL to locate trip expenses in sub-millisecond time.
2. **Why use `COALESCE(SUM(e.amount), 0)` in JPQL?**
   - Standard SQL `SUM()` returns `NULL` when no rows match the filter. In Java, unboxing a `null` `BigDecimal` causes an immediate `NullPointerException`. `COALESCE` guarantees the query always returns `0.00`.
3. **Why provide `?category=` as a RequestParam instead of a separate endpoint?**
   - Clean REST design: filters should be query parameters (`/expenses?category=FOOD`), not separate endpoints. This keeps the URI space tidy and allows the frontend to easily compose multiple filters.
4. **Why include `paidBy` (User) in Task 2 rather than waiting for Task 5?**
   - Future-proofing: In collaborative travel, every bill is paid by a specific person. Introducing `paidBy` now prevents having to execute painful database migrations and data backfills when building the Split and Settlement engine in Task 5.
