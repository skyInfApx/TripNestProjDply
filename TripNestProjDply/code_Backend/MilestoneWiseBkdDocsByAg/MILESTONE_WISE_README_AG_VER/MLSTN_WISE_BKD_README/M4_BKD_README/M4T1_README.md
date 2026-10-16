# TripNest — Milestone 4 Task 1 Backend Guide: Traveler Analytics Engine (`M4T1_README.md`)

> **Module:** Milestone 4, Part 1 (Task 1: Traveler Analytics APIs)  
> **Tech Stack:** Java 21, Spring Boot 3.x, Spring Data JPA, Hibernate, PostgreSQL 16, Spring Security (OAuth2/JWT)  
> **Author:** Antigravity AI Engine (Pair-Programming with Shreyas)  
> **Target Path:** `TripNestProjVer4M4/code_Backend`  
> **File:** `M4T1_README.md`  

---

## Table of Contents
1. [Task 1 Overview & Architectural Objectives](#1-task-1-overview--architectural-objectives)
2. [Domain Model & Entity Relationships](#2-domain-model--entity-relationships)
3. [Data Transfer Objects (DTO) Specifications](#3-data-transfer-objects-dto-specifications)
4. [Database Aggregation Strategy & Optimized SQL Queries](#4-database-aggregation-strategy--optimized-sql-queries)
5. [Service Layer Architecture (`TravelerAnalyticsService`)](#5-service-layer-architecture-traveleranalyticsservice)
6. [REST Controller Endpoint Contracts](#6-rest-controller-endpoint-contracts)
7. [Edge Case Handling & Defensive Rules](#7-edge-case-handling--defensive-rules)
8. [Postman Verification Plan & Test Payloads](#8-postman-verification-plan--test-payloads)
9. [Key Defense Points for Mentor & Technical Evaluation](#9-key-defense-points-for-mentor--technical-evaluation)

---

## 1. Task 1 Overview & Architectural Objectives

Milestone 4 Task 1 transforms raw relational records across trips, budgets, and expenses into **instant, high-impact personal intelligence** for the logged-in traveler.

### Core Deliverables:
1. **Traveler KPI Summary Cards:**
   * Total Trips taken by the user.
   * Total Completed Trips vs Upcoming/Planned Trips.
   * Cumulative financial spending across all trips.
   * Total active budget allocated.
2. **Upcoming Trip Spotlight:**
   * Identifies the next chronological trip starting on or after today's date.
   * Countdown in days, destination name, start date, and group member count.
3. **Budget vs Actual Spend Overview:**
   * Computes budget utilization percentage:
     $$\text{Utilization \%} = \left(\frac{\text{Total Spends}}{\text{Total Allocated Budget}}\right) \times 100$$
   * Highlights remaining unspent funds.
4. **Category-Wise Spending Breakdown:**
   * Aggregates expenses grouped by category (`ACCOMMODATION`, `TRANSPORTATION`, `FOOD`, `ACTIVITIES`, `SHOPPING`, `MISCELLANEOUS`).
   * Computes both the raw sum in `BigDecimal` and percentage share for frontend Chart.js donut graphs.
5. **Favorite Destinations Ranking:**
   * Aggregates completed and planned trips grouped by destination name to discover top-visited locations with trip frequency counts.
6. **Monthly Expenditure Trend:**
   * Groups expenses by Year-Month (e.g. `2026-05`, `2026-06`) over the past 12 months for historical line chart analytics.

---

## 2. Domain Model & Entity Relationships

The analytics engine reads from 4 core tables without mutating state:

```text
  +-------------------------------------------------------------------------------+
  |                                     User                                      |
  |  id (PK), email (UQ), name, password                                          |
  +-------------------------------------------------------------------------------+
                                          | 1
                                          |
                     +--------------------+--------------------+
                     | N                                       | N
  +-------------------------------------+   +-------------------------------------+
  |                Trip                 |   |               Expense               |
  |  id (PK), destination, status,      |   |  id (PK), amount, category,         |
  |  start_date, end_date, user_id (FK) |   |  expense_date, payer_id (FK)        |
  +-------------------------------------+   +-------------------------------------+
                     | 1
                     | 1
  +-------------------------------------+
  |               Budget                |
  |  id (PK), total_budget, currency,   |
  |  trip_id (FK, UQ)                   |
  +-------------------------------------+
```

---

## 3. Data Transfer Objects (DTO) Specifications

### 3.1 `TravelerDashboardSummaryDTO`
Root DTO returned by `GET /api/analytics/traveler/summary`:
```java
public record TravelerDashboardSummaryDTO(
    Long totalTrips,
    Long completedTrips,
    Long upcomingTrips,
    BigDecimal totalSpent,
    BigDecimal totalBudget,
    Double overallBudgetUtilizationPercentage,
    UpcomingTripSummaryDTO nextUpcomingTrip,
    List<CategorySpendingDTO> categorySpending,
    List<FavoriteDestinationDTO> favoriteDestinations
) {}
```

### 3.2 `UpcomingTripSummaryDTO`
```java
public record UpcomingTripSummaryDTO(
    Long tripId,
    String title,
    String destination,
    LocalDate startDate,
    LocalDate endDate,
    Long daysUntilTrip,
    String status
) {}
```

### 3.3 `CategorySpendingDTO`
```java
public record CategorySpendingDTO(
    String category,
    BigDecimal totalAmount,
    Double percentageOfTotal
) {}
```

### 3.4 `FavoriteDestinationDTO`
```java
public record FavoriteDestinationDTO(
    String destination,
    Long visitCount,
    LocalDate lastVisitedDate
) {}
```

### 3.5 `MonthlySpendingTrendDTO`
```java
public record MonthlySpendingTrendDTO(
    String yearMonth, // e.g., "2026-08"
    BigDecimal totalSpent,
    Long transactionCount
) {}
```

---

## 4. Database Aggregation Strategy & Optimized SQL Queries

To ensure millisecond response times without loading thousands of entity objects into Java heap memory, the engine relies on **database-level SQL aggregations**:

### A. Total Trips & Status Aggregation
```sql
SELECT 
    COUNT(*) AS total_trips,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_trips,
    COUNT(CASE WHEN status IN ('PLANNED', 'ONGOING') AND start_date >= CURRENT_DATE THEN 1 END) AS upcoming_trips
FROM trips 
WHERE user_id = :userId;
```

### B. Category-Wise Expense Aggregation
```sql
SELECT 
    category,
    COALESCE(SUM(amount), 0.00) AS total_amount
FROM expenses
WHERE payer_id = :userId
GROUP BY category
ORDER BY total_amount DESC;
```

### C. Favorite Destinations Aggregation
```sql
SELECT 
    destination,
    COUNT(*) AS visit_count,
    MAX(end_date) AS last_visited
FROM trips
WHERE user_id = :userId
GROUP BY destination
ORDER BY visit_count DESC, last_visited DESC
LIMIT 5;
```

---

## 5. Service Layer Architecture (`TravelerAnalyticsService`)

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TravelerAnalyticsService {

    private final TripRepository tripRepository;
    private final ExpenseRepository expenseRepository;
    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;

    public TravelerDashboardSummaryDTO getTravelerDashboardSummary(Long userId) {
        // 1. Fetch trip counts
        // 2. Compute total spends across user's trips
        // 3. Compute total budget allocations
        // 4. Resolve next upcoming trip
        // 5. Build category breakdowns
        // 6. Aggregate favorite destinations
        // 7. Assemble and return immutable DTO
    }

    public List<MonthlySpendingTrendDTO> getMonthlySpendingTrends(Long userId) {
        // Query last 12 months expenses grouped by TO_CHAR(expense_date, 'YYYY-MM')
    }
}
```

---

## 6. REST Controller Endpoint Contracts

| HTTP Method | Path | Security | Success Response | Description |
|---|---|---|---|---|
| `GET` | `/api/analytics/traveler/summary` | Authenticated (JWT) | `200 OK` + `TravelerDashboardSummaryDTO` | Complete personal analytics dashboard payload |
| `GET` | `/api/analytics/traveler/monthly-trends` | Authenticated (JWT) | `200 OK` + `List<MonthlySpendingTrendDTO>` | Monthly spending history for past 12 months |
| `GET` | `/api/analytics/traveler/upcoming-trip` | Authenticated (JWT) | `200 OK` + `UpcomingTripSummaryDTO` | Spotlight card for next planned vacation |

---

## 7. Edge Case Handling & Defensive Rules

1. **Zero Trips User (New Registration):**
   * Returns clean zeroed stats: `totalTrips: 0`, `totalSpent: 0.00`, `nextUpcomingTrip: null`, empty list for `categorySpending`.
   * Never throws `NullPointerException` or divides by zero when computing percentage utilization.
2. **Trips with No Expenses:**
   * `totalSpent` defaults to `BigDecimal.ZERO`.
   * Utilization percentage defaults to `0.0%`.
3. **Expenses with No Active Budget:**
   * When `totalBudget == 0.00` and `totalSpent > 0`, utilization returns `100.0%` with a flag indicating unbudgeted spending.
4. **Strict Isolation:**
   * The authenticated user's ID is extracted directly from the verified Spring Security context (`Authentication.getPrincipal()`). Users cannot query other travelers' dashboards.

---

## 8. Postman Verification Plan & Test Payloads

### Sample Response: `GET /api/analytics/traveler/summary`
```json
{
  "totalTrips": 6,
  "completedTrips": 4,
  "upcomingTrips": 2,
  "totalSpent": 48750.00,
  "totalBudget": 60000.00,
  "overallBudgetUtilizationPercentage": 81.25,
  "nextUpcomingTrip": {
    "tripId": 14,
    "title": "Goa Beach Retreat",
    "destination": "Goa, India",
    "startDate": "2026-11-10",
    "endDate": "2026-11-15",
    "daysUntilTrip": 25,
    "status": "PLANNED"
  },
  "categorySpending": [
    {
      "category": "ACCOMMODATION",
      "totalAmount": 22000.00,
      "percentageOfTotal": 45.13
    },
    {
      "category": "FOOD",
      "totalAmount": 14250.00,
      "percentageOfTotal": 29.23
    },
    {
      "category": "TRANSPORTATION",
      "totalAmount": 8500.00,
      "percentageOfTotal": 17.44
    },
    {
      "category": "ACTIVITIES",
      "totalAmount": 4000.00,
      "percentageOfTotal": 8.20
    }
  ],
  "favoriteDestinations": [
    {
      "destination": "Goa, India",
      "visitCount": 3,
      "lastVisitedDate": "2026-05-12"
    },
    {
      "destination": "Manali, Himachal Pradesh",
      "visitCount": 2,
      "lastVisitedDate": "2026-01-20"
    }
  ]
}
```

---

## 9. Key Defense Points for Mentor & Technical Evaluation

* **Database Engine Efficiency:** Aggregations (`SUM`, `COUNT`, `GROUP BY`) are executed directly inside PostgreSQL using index-backed projections, avoiding heavy in-memory Java loops.
* **Financial Data Accuracy:** All calculations use `BigDecimal` with explicit rounding modes (`RoundingMode.HALF_UP`) to prevent floating-point calculation errors.
* **Frontend-Ready Architecture:** DTO structures map 1-to-1 with Chart.js donut and bar chart specs, enabling zero data-munging in React.
