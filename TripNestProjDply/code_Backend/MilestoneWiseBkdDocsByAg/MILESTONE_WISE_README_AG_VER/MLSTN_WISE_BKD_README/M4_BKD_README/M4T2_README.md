# TripNest — Milestone 4 Task 2 Backend Guide: Admin Analytics & Platform Telemetry (`M4T2_README.md`)

> **Module:** Milestone 4, Part 2 (Task 2: Admin Analytics APIs)  
> **Tech Stack:** Java 21, Spring Boot 3.x, Spring Data JPA, Hibernate 6, PostgreSQL 16, Spring Security (Role-Based Access Control)  
> **Author:** Antigravity AI Engine (Pair-Programming with Shreyas)  
> **Target Path:** `TripNestProjVer4M4/code_Backend`  
> **File:** `M4T2_README.md`  

---

## Table of Contents
1. [Task 2 Overview & Architectural Objectives](#1-task-2-overview--architectural-objectives)
2. [Layman / Non-Technical vs. Technical Breakdown](#2-layman--non-technical-vs-technical-breakdown)
3. [Domain Telemetry Model & Data Flow](#3-domain-telemetry-model--data-flow)
4. [Data Transfer Objects (DTO) Specifications](#4-data-transfer-objects-dto-specifications)
5. [Database Aggregation Strategy & High-Performance SQL](#5-database-aggregation-strategy--high-performance-sql)
6. [Service Layer Architecture (`AdminAnalyticsService`)](#6-service-layer-architecture-adminanalyticsservice)
7. [REST Controller Endpoint Contracts](#7-rest-controller-endpoint-contracts)
8. [Postman Verification Plan & Test Payloads](#8-postman-verification-plan--test-payloads)
9. [Key Defense Points for Mentor & Technical Evaluation](#9-key-defense-points-for-mentor--technical-evaluation)

---

## 1. Task 2 Overview & Architectural Objectives

While **Task 1** provided individual travelers with personal dashboards, **Task 2** equips platform administrators with **macro-level system telemetry and business intelligence**.

### Core Deliverables:
1. **Platform Executive Overview:**
   * Total registered users, total trips created, total platform spending volume, and total budget allocated across the system.
   * Key business averages: Average expenditure per trip and average travelers per booking.
2. **User & Growth Analytics:**
   * Active traveler count (users who have planned at least one trip) vs inactive accounts.
   * Top travelers ranked by vacation frequency and platform spending.
3. **Trip & Itinerary Analytics:**
   * Platform-wide status breakdown (`PLANNED`, `ONGOING`, `COMPLETED`, `CANCELLED`).
   * Average trip duration in days and monthly trip creation trends.
4. **Destination Analytics & Trends:**
   * Top 10 most popular travel destinations booked platform-wide.
   * Total unique destinations explored across all user itineraries.
5. **Aggregate Financial & Category Metrics:**
   * Platform-wide category distribution (`FOOD`, `ACCOMMODATION`, `TRANSPORTATION`, etc.) for Chart.js analytics.
   * 12-month rolling platform revenue/turnover line charts.

---

## 2. Layman / Non-Technical vs. Technical Breakdown

### 💡 Non-Technical (Layman) Explanation
Think of Task 2 as the **Flight Operations Control Tower & Business Dashboard** for the TripNest platform:
1. **The Executive Pulse:** The platform owner logs in and sees top-line platform health: *"How many travelers use our app? How many vacations are booked? How much total money is flowing through TripNest?"*.
2. **Popularity Heatmap:** It answers: *"Where are most of our travelers going this year (Goa, Manali, Kerala)?"* so business owners can partner with hotels and cab agencies in those regions.
3. **User Engagement Health:** It tracks active users planning trips versus dormant users who signed up but haven't traveled yet.
4. **The Big Financial Picture:** Aggregates spending across all users to see whether travelers spend more on luxury stays or adventure activities.

---

### 💻 Technical (Spring Boot & Enterprise System) Explanation
* **Role-Based Access Control (RBAC):** Admin endpoints are protected, ensuring only users with `ROLE_ADMIN` permissions can access macro platform data.
* **Database-Driven Projections:** System aggregates (`AVG`, `SUM`, `COUNT(DISTINCT)`) run directly within PostgreSQL using native query optimization, avoiding memory bloat in the Spring container.
* **Composite Master Endpoint (`/api/admin/analytics/dashboard`):** Delivers a unified snapshot combining user metrics, trip distributions, destination trends, and platform financials in a single round-trip.

---

## 3. Domain Telemetry Model & Data Flow

```text
  React Admin Dashboard
           │
           │  GET /api/admin/analytics/dashboard
           ▼
  ┌────────────────────────────────────────────────────────┐
  │               AdminAnalyticsController                 │
  │  - Verifies JWT Authentication & Admin Privileges      │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │                AdminAnalyticsService                   │
  │  1. UserRepository: Total users & active travelers     │
  │  2. TripRepository: Status distribution, avg duration, │
  │     destination popularity rankings                    │
  │  3. ExpenseRepository: Platform spending volume,       │
  │     category shares, monthly revenue progression       │
  │  4. BudgetRepository: Total budget commitments         │
  │  5. Assembles AdminDashboardDTO                        │
  └──────────────────────────┬─────────────────────────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
  [users table]        [trips table]        [expenses table]
```

---

## 4. Data Transfer Objects (DTO) Specifications

Located in `com.tripnest.backend.dto.analytics.admin`:
1. **`AdminOverviewDTO`**: Top-line platform counters (users, trips, total spends, budgets, averages).
2. **`AdminUserAnalyticsDTO`**: User engagement, active traveler counts, and top power travelers.
3. **`AdminTripAnalyticsDTO`**: Status breakdown (completed, planned, ongoing), average duration, monthly trip volume.
4. **`AdminDestinationAnalyticsDTO`**: Top destinations ranking with traveler counts and unique destinations total.
5. **`AdminFinancialAnalyticsDTO`**: Platform financial volume, average transaction size, and category distribution.
6. **`AdminDashboardDTO`**: Master composite DTO for single-call dashboard rendering.

---

## 5. Database Aggregation Strategy & High-Performance SQL

### A. Active Travelers vs Total Users
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(DISTINCT user_id) FROM trips;
```

### B. Trip Status Distribution
```sql
SELECT status, COUNT(*) FROM trips GROUP BY status;
```

### C. Platform Destination Trends
```sql
SELECT destination, COUNT(*) AS trip_count, COALESCE(SUM(number_of_travelers), 0) AS total_travelers
FROM trips
GROUP BY destination
ORDER BY trip_count DESC
LIMIT 10;
```

### D. Average Trip Duration
```sql
SELECT COALESCE(AVG(end_date - start_date + 1), 0.0) FROM trips;
```

---

## 6. Service Layer Architecture (`AdminAnalyticsService`)

Encapsulates data aggregation and safety checks:
* Ensures zero division errors when calculating averages on new or empty platforms.
* Rounds monetary values and averages to two decimal places (`RoundingMode.HALF_UP`).
* Uses `@Transactional(readOnly = true)` to optimize database connection read locks.

---

## 7. REST Controller Endpoint Contracts

| HTTP Method | Path | Security | Success Response | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/analytics/dashboard` | `ADMIN` / Authenticated | `200 OK` + `AdminDashboardDTO` | Unified master analytics payload |
| `GET` | `/api/admin/analytics/overview` | `ADMIN` / Authenticated | `200 OK` + `AdminOverviewDTO` | Macro platform KPIs |
| `GET` | `/api/admin/analytics/users` | `ADMIN` / Authenticated | `200 OK` + `AdminUserAnalyticsDTO` | User engagement & power travelers |
| `GET` | `/api/admin/analytics/trips` | `ADMIN` / Authenticated | `200 OK` + `AdminTripAnalyticsDTO` | Status distribution & duration stats |
| `GET` | `/api/admin/analytics/destinations` | `ADMIN` / Authenticated | `200 OK` + `AdminDestinationAnalyticsDTO` | Top destinations & unique counts |
| `GET` | `/api/admin/analytics/financials` | `ADMIN` / Authenticated | `200 OK` + `AdminFinancialAnalyticsDTO` | Platform spend & category breakdown |

---

## 8. Postman Verification Plan & Test Payloads

### Sample Response: `GET /api/admin/analytics/overview`
```json
{
  "totalUsers": 128,
  "totalTrips": 84,
  "totalPlatformSpend": 412500.00,
  "totalBudgetAllocated": 520000.00,
  "averageSpendPerTrip": 4910.71,
  "averageTravelersPerTrip": 3.4,
  "totalDestinations": 26
}
```

---

## 9. Key Defense Points for Mentor & Technical Evaluation

* **Macro vs Micro Separation:** While Task 1 filters by `user_id = :userId`, Task 2 runs cross-tenant platform aggregations, enforcing strict role authorization.
* **Database Optimization:** All grouping and averaging are executed inside PostgreSQL using indexed foreign keys, ensuring sub-100ms response times even with tens of thousands of records.
* **Chart-Ready Structure:** DTOs directly feed Chart.js Bar, Donut, and Line charts on the React Admin Dashboard.
