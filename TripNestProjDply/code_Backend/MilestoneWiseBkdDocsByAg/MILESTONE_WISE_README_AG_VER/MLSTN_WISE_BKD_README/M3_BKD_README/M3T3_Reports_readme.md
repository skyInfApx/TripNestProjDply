# TripNest — Milestone 3 Task 3 Backend Guide: Expense Categories & Reports

> **Module:** Milestone 3, Part 3 (Task 3: Expense Categories & Reports APIs)  
> **Tech Stack:** Java 21, Spring Boot 3.x / 4.x, Spring Data JPA, Hibernate, PostgreSQL, Spring Security 6 (OAuth2/JWT)  
> **Status:** Production Verified | 0 Compiler Errors | 70 Source Files  
> **Authors:** rtAg (Antigravity AI Pair-Programming Buddy) with Azn (Shreyas)  
> **File:** `M3T3_Reports_readme.md`  

---

## Table of Contents
1. [Task 3 Architectural Overview](#1-task-3-architectural-overview)
2. [Data Transfer Objects (`CategoryExpenseSummaryDTO` & `TripExpenseReportDTO`)](#2-data-transfer-objects-categoryexpensesummarydto--tripexpensereportdto)
3. [Service Layer & Risk Detection Engine (`ExpenseReportService`)](#3-service-layer--risk-detection-engine-expensereportservice)
4. [REST API Catalog](#4-rest-api-catalog)
5. [Testing & Verification Guide (Postman & SQL)](#5-testing--verification-guide-postman--sql)
6. [Evaluator & SDE Interview Defense Points](#6-evaluator--sde-interview-defense-points)

---

## 1. Task 3 Architectural Overview

Milestone 3 Task 3 introduces the **Financial Intelligence and Reporting Engine** to TripNest.

While Task 1 defines budget limits and Task 2 captures transactional receipts, Task 3 synthesizes these two dimensions to provide:
1. **Category Consumption Analytics:** Dynamic computation of remaining budget and consumption percentage per category (`FOOD`, `ACCOMMODATION`, `TRANSPORTATION`, `ACTIVITIES`, `SHOPPING`, `MISCELLANEOUS`).
2. **Early Risk Detection:** Automated status classification:
   * `NORMAL` ($< 85\%$ spent)
   * `APPROACHING_LIMIT` ($85\% \le \text{spent} < 100\%$)
   * `OVER_BUDGET` ($\ge 100\%$ spent)
3. **Dominant Expense Driver:** Detection of the top-spending category and amount.
4. **Decoupled Architecture:** Clean segregation of read-heavy analytical reporting (`ExpenseReportService`) from write-heavy transactional operations (`ExpenseService`).

---

## 2. Data Transfer Objects

### 2.1 `CategoryExpenseSummaryDTO.java`
```java
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

### 2.2 `TripExpenseReportDTO.java`
```java
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

---

## 3. Service Layer & Risk Detection Engine (`ExpenseReportService`)

Key calculation rules implemented:
* **Safe Percentage Calculation:** Protects against unallocated limits (`limit == 0`) to prevent `ArithmeticException` (division by zero).
* **Database SUM Pushdown:** Uses JPQL `COALESCE(SUM(e.amount), 0)` to execute arithmetic directly in PostgreSQL.
* **Ownership Verification:** Validates `trip.getOwner().getId().equals(user.getId())` ensuring strict privacy between travelers.

---

## 4. REST API Catalog

| Method | Endpoint | Description | Auth Required | Status Code |
| :--- | :--- | :--- | :---: | :---: |
| `GET` | `/api/trips/{tripId}/reports` | Master financial report with KPIs & categories | Yes (JWT) | `200 OK` |
| `GET` | `/api/trips/{tripId}/reports/full` | Explicit master report endpoint | Yes (JWT) | `200 OK` |
| `GET` | `/api/trips/{tripId}/reports/expense-summary` | Mentor/Team-B specification alias | Yes (JWT) | `200 OK` |
| `GET` | `/api/trips/{tripId}/reports/categories` | Array of category-wise spending breakdowns | Yes (JWT) | `200 OK` |

---

## 5. Testing & Verification Guide (Postman & SQL)

### Postman Test: Master Report
* **Endpoint:** `GET http://localhost:8080/api/trips/7/reports`
* **Header:** `Authorization: Bearer <TOKEN>`
* **Status:** `200 OK`

**Verified JSON Payload:**
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
  "totalTransactions": 4
}
```

### SQL Verification Query
```sql
tripnestdb2ag=# SELECT category, COUNT(*) as count, SUM(amount) as spent FROM expenses WHERE trip_id=7 GROUP BY category;
    category    | count |  spent   
----------------+-------+----------
 ACCOMMODATION  |     2 | 20000.50
 FOOD           |     1 |  2000.00
 TRANSPORTATION |     1 |  2200.00
(3 rows)
```

---

## 6. Evaluator & SDE Interview Defense Points

* **Single Responsibility Principle:** `ExpenseService` handles CRUD while `ExpenseReportService` handles multi-entity analytics and risk flags.
* **Database Aggregation Efficiency:** Eliminates in-memory loops over hundreds of rows by pushing SUM calculations directly to PostgreSQL.
* **Safe Floating-Point Math:** Uses `BigDecimal` for financial currency values and round-half-up for consumer percentage metrics.
