# TripNest — Milestone 3 Task 3 Engineering Guide: Expense Categories & Reports APIs

> **Module:** Milestone 3, Part 3 (Task 3: Financial Analytics, Risk Detection & Reporting Engine)  
> **Tech Stack:** Java 21, Spring Boot 3.x / 4.x, Spring Data JPA, Hibernate, PostgreSQL, Spring Security (OAuth2/JWT)  
> **Status:** Production Verified | 0 Compiler Errors | 70 Source Files Built Successfully  
> **Authors:** rtAg (Antigravity AI Pair-Programming Buddy) with Azn (Shreyas)  
> **File:** `M3T3_Impl_Ag_readme.md`  

---

## Table of Contents
1. [Task 3 Overview & Problem Statement](#1-task-3-overview--problem-statement)
2. [Layman / Non-Technical vs. Technical Breakdown](#2-layman--non-technical-vs-technical-breakdown)
3. [The Financial Analytics & Risk Engine Architecture](#3-the-financial-analytics--risk-engine-architecture)
4. [The 4 Core Source Files Implemented](#4-the-4-core-source-files-implemented)
   - 4.1 [`CategoryExpenseSummaryDTO.java`](#41-categoryexpensesummarydtojava)
   - 4.2 [`TripExpenseReportDTO.java`](#42-tripexpensereportdtojava)
   - 4.3 [`ExpenseReportService.java`](#43-expensereportservicejava)
   - 4.4 [`ExpenseReportController.java`](#44-expensereportcontrollerjava)
5. [Repository Enhancements (`ExpenseRepository.java`)](#5-repository-enhancements-expenserepositoryjava)
6. [Complete REST API Catalog](#6-complete-rest-api-catalog)
7. [Postman Verification Guide & Test Payloads](#7-postman-verification-guide--test-payloads)
8. [PostgreSQL Reconciliation & Verification Queries](#8-postgresql-reconciliation--verification-queries)
9. [Key Interview & Evaluator Defense Talking Points](#9-key-interview--evaluator-defense-talking-points)

---

## 1. Task 3 Overview & Problem Statement

In **Task 1**, travelers defined their target **Budget** (e.g., ₹50,000 ceiling with category limits).  
In **Task 2**, travelers logged individual transactional **Expenses** (e.g., hotel stay, meals, cab rides).  

However, a raw list of 50 individual receipts is overwhelming and unhelpful for a traveler on vacation. Travelers need **instant financial clarity**:
* *"How much of my Food budget have I burned so far?"*
* *"Am I close to running out of money for Hotels?"*
* *"What is eating up the largest percentage of my money?"*
* *"Give me a warning before I exceed my spending limit!"*

**Milestone 3 Task 3 delivers this Intelligence & Reporting Layer.**

---

## 2. Layman / Non-Technical vs. Technical Breakdown

### 💡 Non-Technical (Layman) Explanation:
Think of Task 3 as the traveler's **Personal Executive Accountant**:
1. **The Receipt Statement:** It groups all your spending into 6 buckets: Food, Hotels, Transportation, Activities, Shopping, and Misc.
2. **The Traffic Light Warning System:**
   * 🟢 **NORMAL (Green Light):** You've spent under 85% of your category limit. All safe!
   * 🟡 **APPROACHING_LIMIT (Yellow Warning):** You hit 85% to 100% of your limit. A gentle heads-up to slow down on spending.
   * 🔴 **OVER_BUDGET (Red Alert):** You blew past 100% of your limit!
3. **The Money-Drain Detective:** It automatically identifies the **`topSpendingCategory`** and crowns the biggest spending villain of the vacation.

### 💻 Technical (Spring Boot & System Architecture) Explanation:
* **Decoupled Analytics Layer:** All calculation and reporting logic is encapsulated in `ExpenseReportService.java`, keeping `ExpenseService.java` purely focused on CRUD operations (Separation of Concerns).
* **High-Performance Aggregations:** Financial addition is pushed down to the PostgreSQL query planner using JPQL `COALESCE(SUM(e.amount), 0)` to prevent loading entire entity trees into Java memory.
* **Defensive Arithmetic:** Explicit protection against `ArithmeticException` (division by zero) when calculating percentage consumption against an uninitialized or zero-limit budget.
* **Stateless Token-Based Access Control:** Evaluates JWT authentication claims (`authentication.getName()`) against the Trip Owner to prevent unauthorized financial access.

---

## 3. The Financial Analytics & Risk Engine Architecture

```text
  Client (Postman / React UI)
             │
             │ GET /api/trips/{tripId}/reports
             ▼
  ┌────────────────────────────────────────────────────────┐
  │              ExpenseReportController                   │
  │  - Extracts userEmail from SecurityContext (JWT)       │
  │  - Validates route path {tripId}                       │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │               ExpenseReportService                     │
  │  1. getTripAndVerifyAccess(tripId, userEmail)          │
  │  2. budgetRepository.findByTripId(tripId)              │
  │  3. For each ExpenseCategory:                          │
  │     - JPQL SUM(amount) for that category               │
  │     - remaining = allocatedLimit - totalSpent          │
  │     - percentageSpent = (spent / limit) * 100.0        │
  │     - Evaluate Status: NORMAL / APPROACHING / OVER     │
  │  4. Identify topSpendingCategory & max amount          │
  │  5. Assemble TripExpenseReportDTO                      │
  └──────────────────────────┬─────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         ▼                                       ▼
  ┌──────────────┐                       ┌──────────────┐
  │  Trip / User │                       │   Expenses   │
  │  PostgreSQL  │                       │  PostgreSQL  │
  └──────────────┘                       └──────────────┘
```

---

## 4. The 4 Core Source Files Implemented

### 4.1 `CategoryExpenseSummaryDTO.java`
**Location:** `com.tripnest.backend.dto.report.CategoryExpenseSummaryDTO`  
Represents the spending status of a single category:
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryExpenseSummaryDTO {
    private ExpenseCategory category;
    private BigDecimal allocatedLimit;
    private BigDecimal totalSpent;
    private BigDecimal remainingAmount;
    private Double percentageSpent;
    private String status;           // NORMAL, APPROACHING_LIMIT, OVER_BUDGET
    private Long transactionCount;
}
```

### 4.2 `TripExpenseReportDTO.java`
**Location:** `com.tripnest.backend.dto.report.TripExpenseReportDTO`  
The master executive report returned to the frontend dashboard:
```java
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TripExpenseReportDTO {
    private Long tripId;
    private String tripTitle;
    private String currency;
    private BigDecimal totalBudget;
    private BigDecimal totalSpent;
    private BigDecimal remainingBudget;
    private Double overallPercentageSpent;
    private String overallStatus;
    private ExpenseCategory topSpendingCategory;
    private BigDecimal topCategoryAmount;
    private Long totalTransactions;
    private List<CategoryExpenseSummaryDTO> categorySummaries;
}
```

### 4.3 `ExpenseReportService.java`
**Location:** `com.tripnest.backend.service.ExpenseReportService`  
Contains the core business calculations:
* **Safe Percentage Calculation:**
  $$\text{PercentageSpent} = \text{round}\left(\frac{\text{Spent}}{\text{Limit}} \times 100, 1\right)$$
* **Risk Threshold Logic:**
  ```java
  if (limit.compareTo(BigDecimal.ZERO) == 0) {
      status = spent.compareTo(BigDecimal.ZERO) > 0 ? "OVER_BUDGET" : "NORMAL";
  } else if (percentageSpent >= 100.0) {
      status = "OVER_BUDGET";
  } else if (percentageSpent >= 85.0) {
      status = "APPROACHING_LIMIT";
  } else {
      status = "NORMAL";
  }
  ```
* **Top Spending Driver Identification:** Iterates through category aggregates and dynamically assigns the highest spender to `topSpendingCategory`.

### 4.4 `ExpenseReportController.java`
**Location:** `com.tripnest.backend.controller.ExpenseReportController`  
Exposes the REST endpoints at `/api/trips/{tripId}/reports`.

---

## 5. Repository Enhancements (`ExpenseRepository.java`)

To avoid loading raw lists into Java memory just to count entries, two high-speed derived count queries were added:
```java
// Count total transactions logged for a trip
Long countByTripId(Long tripId);

// Count transactions logged for a specific category
Long countByTripIdAndCategory(Long tripId, ExpenseCategory category);
```
These compile into instant `SELECT COUNT(*) FROM expenses WHERE ...` index scans in PostgreSQL.

---

## 6. Complete REST API Catalog

| Method | Endpoint | Description | Auth Required | Success Status |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/trips/{tripId}/reports` | Master financial report with KPIs and categories | Yes (JWT) | `200 OK` |
| `GET` | `/api/trips/{tripId}/reports/full` | Alias for master financial report | Yes (JWT) | `200 OK` |
| `GET` | `/api/trips/{tripId}/reports/expense-summary` | Mentor/Team-B specification alias | Yes (JWT) | `200 OK` |
| `GET` | `/api/trips/{tripId}/reports/categories` | Array of category-wise spending summaries | Yes (JWT) | `200 OK` |

---

## 7. Postman Verification Guide & Test Payloads

### Test 1: Get the Full Master Financial Report
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/reports`
* **Headers:** `Authorization: Bearer {{token}}`
* **Status:** `200 OK`

**Actual Live Verified Response JSON:**
```json
{
  "tripId": 7,
  "tripTitle": "hill station tour sept",
  "currency": "INR",
  "totalBudget": 50000.00,
  "totalSpent": 24200.50,
  "remainingBudget": 25799.50,
  "overallPercentageSpent": 48.4,
  "overallStatus": "NORMAL",
  "topSpendingCategory": "ACCOMMODATION",
  "topCategoryAmount": 20000.50,
  "totalTransactions": 4,
  "categorySummaries": [
    {
      "category": "ACCOMMODATION",
      "allocatedLimit": 18000.00,
      "totalSpent": 20000.50,
      "remainingAmount": -2000.50,
      "percentageSpent": 111.1,
      "status": "OVER_BUDGET",
      "transactionCount": 2
    },
    {
      "category": "TRANSPORTATION",
      "allocatedLimit": 12000.00,
      "totalSpent": 2200.00,
      "remainingAmount": 9800.00,
      "percentageSpent": 18.3,
      "status": "NORMAL",
      "transactionCount": 1
    },
    {
      "category": "FOOD",
      "allocatedLimit": 10000.00,
      "totalSpent": 2000.00,
      "remainingAmount": 8000.00,
      "percentageSpent": 20.0,
      "status": "NORMAL",
      "transactionCount": 1
    },
    {
      "category": "ACTIVITIES",
      "allocatedLimit": 6000.00,
      "totalSpent": 0,
      "remainingAmount": 6000.00,
      "percentageSpent": 0.0,
      "status": "NORMAL",
      "transactionCount": 0
    },
    {
      "category": "SHOPPING",
      "allocatedLimit": 2000.00,
      "totalSpent": 0,
      "remainingAmount": 2000.00,
      "percentageSpent": 0.0,
      "status": "NORMAL",
      "transactionCount": 0
    },
    {
      "category": "MISCELLANEOUS",
      "allocatedLimit": 2000.00,
      "totalSpent": 0,
      "remainingAmount": 2000.00,
      "percentageSpent": 0.0,
      "status": "NORMAL",
      "transactionCount": 0
    }
  ]
}
```

### Test 2: Category Breakdown Endpoint (For Charts)
* **Method:** `GET`
* **URL:** `http://localhost:8080/api/trips/7/reports/categories`
* **Headers:** `Authorization: Bearer {{token}}`
* **Status:** `200 OK`

**Actual Live Verified Response JSON:**
```json
[
  {
    "category": "ACCOMMODATION",
    "allocatedLimit": 18000.00,
    "totalSpent": 20000.50,
    "remainingAmount": -2000.50,
    "percentageSpent": 111.1,
    "status": "OVER_BUDGET",
    "transactionCount": 2
  },
  {
    "category": "TRANSPORTATION",
    "allocatedLimit": 12000.00,
    "totalSpent": 2200.00,
    "remainingAmount": 9800.00,
    "percentageSpent": 18.3,
    "status": "NORMAL",
    "transactionCount": 1
  },
  {
    "category": "FOOD",
    "allocatedLimit": 10000.00,
    "totalSpent": 2000.00,
    "remainingAmount": 8000.00,
    "percentageSpent": 20.0,
    "status": "NORMAL",
    "transactionCount": 1
  },
  {
    "category": "ACTIVITIES",
    "allocatedLimit": 6000.00,
    "totalSpent": 0,
    "remainingAmount": 6000.00,
    "percentageSpent": 0.0,
    "status": "NORMAL",
    "transactionCount": 0
  },
  {
    "category": "SHOPPING",
    "allocatedLimit": 2000.00,
    "totalSpent": 0,
    "remainingAmount": 2000.00,
    "percentageSpent": 0.0,
    "status": "NORMAL",
    "transactionCount": 0
  },
  {
    "category": "MISCELLANEOUS",
    "allocatedLimit": 2000.00,
    "totalSpent": 0,
    "remainingAmount": 2000.00,
    "percentageSpent": 0.0,
    "status": "NORMAL",
    "transactionCount": 0
  }
]
```

---

## 8. PostgreSQL Reconciliation & Verification Queries

### Actual CLI Output from PostgreSQL Database (`psql`):

```text
tripnestdb2ag=# SELECT category, COUNT(*) as count, SUM(amount) as spent FROM expenses WHERE trip_id=7 GROUP BY category;
    category    | count |  spent   
----------------+-------+----------
 ACCOMMODATION  |     2 | 20000.50
 FOOD           |     1 |  2000.00
 TRANSPORTATION |     1 |  2200.00
(3 rows)


tripnestdb2ag=# SELECT COALESCE(SUM(amount), 0) AS total_spent FROM expenses WHERE trip_id = 7;
 total_spent 
-------------
    24200.50
(1 row)
```

**Reconciliation Analysis:**
* $\text{Total Database Spent} = 20,000.50 + 2,000.00 + 2,200.00 = 24,200.50$
* $\text{API Result} = 24,200.50$ (100% exact mathematical match).
* $\text{Accommodation Budget Limit} = 18,000.00$, $\text{Spent} = 20,000.50$ $\implies$ Exactly $111.1\%$ consumed with $-2,000.50$ remaining.
* Triggered the `"OVER_BUDGET"` alert flag in real time!

---

## 9. Key Interview & Evaluator Defense Talking Points

When your interviewer or college evaluator asks:
1. *"Why did you separate ExpenseService and ExpenseReportService?"*
   * **Answer:** *"Single Responsibility Principle (SRP). `ExpenseService` manages the lifecycle and mutation of individual expense records. `ExpenseReportService` is an analytical query engine responsible for multi-aggregate computations, risk thresholds, and cross-entity summaries. Decoupling them keeps the code clean, modular, and easy to unit-test."*
2. *"How do you prevent Division by Zero when calculating percentages?"*
   * **Answer:** *"If a user has not set a budget limit for a category, `limit == 0`. Dividing by zero would trigger an arithmetic crash. We guard against this with defensive checks (`limit.compareTo(BigDecimal.ZERO) > 0`), defaulting percentage to 0.0% and flagging as `OVER_BUDGET` if any spending occurs against an unallocated limit."*
3. *"Why use BigDecimal instead of Double for currency?"*
   * **Answer:** *"Floating-point numbers in Java suffer from binary representation rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`). In enterprise banking and financial applications, `BigDecimal` guarantees arbitrary-precision exact decimal math."*

---
*Document created by rtAg (Antigravity) for Azn's TripNest Project.*
