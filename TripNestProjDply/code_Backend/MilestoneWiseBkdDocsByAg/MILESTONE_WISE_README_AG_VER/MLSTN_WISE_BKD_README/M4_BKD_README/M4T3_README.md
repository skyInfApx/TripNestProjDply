# TripNest — Milestone 4 Task 3 Backend Guide: Reports & Data Aggregation APIs (`M4T3_README.md`)

> **Module:** Milestone 4, Part 3 (Task 3: Reports & Data Aggregation Engine)  
> **Tech Stack:** Java 21, Spring Boot 3.x, Spring Data JPA, Hibernate 6, PostgreSQL 16, Chart.js Data Framing, CSV Streaming  
> **Author:** Antigravity AI Engine (Pair-Programming with Shreyas)  
> **Target Path:** `TripNestProjVer4M4/code_Backend`  
> **File:** `M4T3_README.md`  

---

## Table of Contents
1. [Task 3 Overview & Architectural Objectives](#1-task-3-overview--architectural-objectives)
2. [Layman / Non-Technical vs. Technical Breakdown](#2-layman--non-technical-vs-technical-breakdown)
3. [Reporting & Chart Aggregation Architecture](#3-reporting--chart-aggregation-architecture)
4. [Data Transfer Objects (DTO) Specifications](#4-data-transfer-objects-dto-specifications)
5. [CSV Streaming & RFC 4180 Compliant Exporter](#5-csv-streaming--rfc-4180-compliant-exporter)
6. [Service Layer Architecture (`ReportAggregationService`)](#6-service-layer-architecture-reportaggregationservice)
7. [REST Controller Endpoint Contracts](#7-rest-controller-endpoint-contracts)
8. [Postman Verification Plan & Sample Payloads](#8-postman-verification-plan--sample-payloads)
9. [Key Defense Points for Mentor & Technical Evaluation](#9-key-defense-points-for-mentor--technical-evaluation)

---

## 1. Task 3 Overview & Architectural Objectives

While Tasks 1 and 2 provided real-time dashboard telemetry, **Task 3** equips TripNest with **deep historical reports, exportable financial statements (CSV), annual travel recaps, and chart-ready pre-aggregated datasets**.

### Core Deliverables:
1. **Comprehensive Trip Audit Report:**
   * Single-trip master dossier combining trip metadata, budget allocation ceilings, all itemized expenses, group member debt settlement status, and vault document counts.
2. **Multi-Criteria Filtered Expense Reporting:**
   * Filter expenses across vacations by date range (`startDate`, `endDate`), category, payment method (`UPI`, `CASH`, `CARD`), and min/max monetary values with on-the-fly summary statistics.
3. **Annual Travel Year-in-Review:**
   * End-of-year recap (e.g. 2026): Total vacations taken, gross amount spent, destinations explored, most expensive trip, and month-by-month financial progression.
4. **RFC 4180 Streaming CSV Exporter:**
   * Generates downloadable, spreadsheet-compatible CSV files of user expenses with proper content headers (`Content-Disposition: attachment; filename="..."`).
5. **Chart-Ready Pre-Aggregated Feeds:**
   * Pre-formats datasets into standard `labels` and `datasets` arrays for direct consumption by React Chart.js components (Task 9) with zero frontend parsing overhead.

---

## 2. Layman / Non-Technical vs. Technical Breakdown

### 💡 Non-Technical (Layman) Explanation
Think of Task 3 as the **Tax Accountant & Year-End Vacation Memory Book**:
1. **The Complete Trip Dossier:** When your vacation ends, you can generate a single organized report that shows every ticket, hotel bill, group debt split, and whether everyone has settled their balance.
2. **The "Download to Excel" Button:** Travelers can export all their expenses into an Excel-ready CSV file for personal tax records or company reimbursement.
3. **Year-in-Review (Travel Spotify Wrapped):** Shows a colorful recap of your entire year of travel: *"In 2026, you took 5 trips, traveled for 24 days, and your biggest spending was in Goa!"*.
4. **Instant Chart Feeds:** Feeds ready-made numbers to the charts so graphs render smoothly without freezing the user's phone or laptop.

---

### 💻 Technical (Spring Boot & Reporting Engine) Explanation
* **Streaming I/O Architecture:** CSV generation utilizes memory-efficient streaming (`PrintWriter` / `BufferedWriter`) directly into the `HttpServletResponse` output stream, avoiding holding multi-megabyte CSV files in server RAM.
* **Chart-Optimized Projections:** Formats data directly into Chart.js contract schemas (`labels: string[]`, `datasets: [{ label, data: number[] }]`), completely eliminating fragile client-side data reshaping.
* **Dynamic Multi-Parameter Queries:** Filters expenses across multiple optional criteria (date range, categories, payment types) using database-level filtering.

---

## 3. Reporting & Chart Aggregation Architecture

```text
  React Frontend (Chart.js / Download Button)
                        │
                        │  GET /api/reports/trip/{id}/summary
                        │  GET /api/reports/expenses/export/csv
                        │  GET /api/reports/annual-summary?year=2026
                        ▼
  ┌────────────────────────────────────────────────────────────┐
  │                     ReportController                       │
  │  - Streams CSV attachments                                 │
  │  - Serves JSON chart datasets                              │
  └─────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
  ┌────────────────────────────────────────────────────────────┐
  │                 ReportAggregationService                   │
  │  1. Verifies User Access & Trip Ownership                  │
  │  2. Assembles TripComprehensiveReportDTO                   │
  │  3. Compiles Annual Year-In-Review Metrics                 │
  │  4. Formats ChartSeriesDTO (labels & datasets)             │
  │  5. Encodes RFC 4180 CSV Lines                             │
  └─────────────────────────────┬──────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
   [trips table]         [budgets table]        [expenses table]
```

---

## 4. Data Transfer Objects (DTO) Specifications

Located in `com.tripnest.backend.dto.report`:
1. **`TripComprehensiveReportDTO`**: The master dossier for an individual trip.
2. **`FilteredExpenseReportDTO`**: Dynamic expense search results with summary cards (Total spent, average expense, transaction count).
3. **`YearlyTravelSummaryDTO`**: Annual travel recap (Trips, days, spends, top destination, monthly timeline).
4. **`ChartSeriesDTO` & `ChartDatasetDTO`**: Direct framing for React Chart.js graphs.

---

## 5. CSV Streaming & RFC 4180 Compliant Exporter

To ensure Microsoft Excel and Google Sheets open the export cleanly:
* **MIME Type:** `text/csv; charset=UTF-8`
* **Response Header:** `Content-Disposition: attachment; filename="tripnest-expenses-report.csv"`
* **Headers:** `Expense ID, Date, Description, Category, Amount, Currency, Payment Method, Trip Title, Destination`
* Escapes commas and quotation marks inside descriptions (e.g. `"Dinner, Drinks & Snacks"`).

---

## 6. Service Layer Architecture (`ReportAggregationService`)

* **Trip Access Verification:** Ensures only trip owners or authorized group members can generate comprehensive financial reports.
* **Null-Safe Date Filtering:** Gracefully defaults empty date ranges to all-time historical data.
* **Currency Preservation:** Consolidates spending in traveler's base currency (`INR`).

---

## 7. REST Controller Endpoint Contracts

| HTTP Method | Path | Security | Success Response | Description |
|---|---|---|---|---|
| `GET` | `/api/reports/trip/{tripId}/comprehensive` | JWT Authenticated | `200 OK` + `TripComprehensiveReportDTO` | Full executive dossier for a single trip |
| `GET` | `/api/reports/expenses/filtered` | JWT Authenticated | `200 OK` + `FilteredExpenseReportDTO` | Multi-filter expense search with summaries |
| `GET` | `/api/reports/expenses/export/csv` | JWT Authenticated | `200 OK` + `text/csv` Stream | Downloadable CSV file of user expenses |
| `GET` | `/api/reports/annual-summary` | JWT Authenticated | `200 OK` + `YearlyTravelSummaryDTO` | Year-in-review travel and spend statistics |
| `GET` | `/api/reports/charts/category-distribution`| JWT Authenticated | `200 OK` + `ChartSeriesDTO` | Pre-framed Donut chart feed for Chart.js |
| `GET` | `/api/reports/charts/monthly-spending` | JWT Authenticated | `200 OK` + `ChartSeriesDTO` | Pre-framed Bar/Line chart feed for Chart.js |

---

## 8. Postman Verification Plan & Sample Payloads

### Sample Response: `GET /api/reports/annual-summary?year=2026`
```json
{
  "year": 2026,
  "totalTripsTaken": 4,
  "totalDaysTraveled": 18,
  "totalSpent": 64200.00,
  "uniqueDestinationsVisited": 3,
  "mostExpensiveTripTitle": "Goa Beach Retreat",
  "mostExpensiveTripAmount": 28500.00,
  "favoriteCategory": "ACCOMMODATION",
  "monthlySpendingChart": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "datasets": [
      {
        "label": "2026 Monthly Spending (INR)",
        "data": [0.0, 12000.0, 0.0, 15000.0, 8500.0, 0.0, 0.0, 0.0, 10200.0, 18500.0, 0.0, 0.0]
      }
    ]
  }
}
```

---

## 9. Key Defense Points for Mentor & Technical Evaluation

* **Zero Memory Leak CSV Streaming:** Rather than buffering a 10,000-row CSV in server heap, rows are written iteratively to the HTTP servlet output stream.
* **Contract Coupling Elimination:** The backend provides chart-formatted datasets (`labels` + `datasets`), eliminating 50+ lines of fragile client-side JavaScript date parsing and bucketing logic.
* **Complete Financial Lifecycle:** Bridges the gap between budgeting (Task 1), tracking (Task 2), and post-trip auditing/accounting (Task 3).
