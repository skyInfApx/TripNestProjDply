# TripNest — Milestone 4 Task 1 Frontend Implementation Guide: Traveler Analytics (`M4T1_FTD_IMPL_readme_Ag.md`)

> **Module:** Milestone 4, Task 1 (Traveler Analytics & Personal Dashboard)  
> **Tech Stack:** React 19, Chart.js, React-Chartjs-2, Axios, Tailwind CSS  
> **Created By:** Antigravity (Ag) AI Pair Programmer  
> **Status:** Production Verified | 0 Errors | 131 Modules Bundled  
> **File Location:** `TripNestProjVer4M4/code_FrontEnd/MilestoneWiseFtdDocsByAg/MLSTN_WISE_FTD_IMPL_README/M4_IMPL_FTD_README/M4T1_FTD_IMPL_readme_Ag.md`  

---

## Table of Contents
1. [Mentor Requirements & Checklist Audit](#1-mentor-requirements--checklist-audit)
2. [Layman / Non-Technical Explanation](#2-layman--non-technical-explanation)
3. [Technical Architecture & Component Flow](#3-technical-architecture--component-flow)
4. [Enhanced Personal Traveler Dashboard Modules](#4-enhanced-personal-traveler-dashboard-modules)
   - 4.1 [Section 1: Travel Statistics Scorecard](#41-section-1-travel-statistics-scorecard)
   - 4.2 [Section 2: All Trips with Status Switcher, Year Filter & 3/Page Pagination](#42-section-2-all-trips-with-status-switcher-year-filter--3page-pagination)
   - 4.3 [Section 3: Trip-Wise Budget vs. Outflow Bar Chart with Year Filter & 3/Page Pagination](#43-section-3-trip-wise-budget-vs-outflow-bar-chart-with-year-filter--3page-pagination)
   - 4.4 [Section 4: Shared Expenses, Debts Settlement & Companion Breakdown](#44-section-4-shared-expenses-debts-settlement--companion-breakdown)
   - 4.5 [Section 5: Bills & Receipts Status Module](#45-section-5-bills--receipts-status-module)
   - 4.6 [Section 6: Expense Category Share Donut Chart with Direct Slice % Figures](#46-section-6-expense-category-share-donut-chart-with-direct-slice--figures)
   - 4.7 [Section 7: Travel Documents Vault (Cloud vs. Local Device)](#47-section-7-travel-documents-vault-cloud-vs-local-device)
   - 4.8 [Section 8: Travel Groups Created (Join Codes & Squad Rosters)](#48-section-8-travel-groups-created-join-codes--squad-rosters)
   - 4.9 [Section 9: Favorite Destinations Badges](#49-section-9-favorite-destinations-badges)
   - 4.10 [Portfolio Master Audit Migration to ReportsPage.jsx](#410-portfolio-master-audit-migration-to-reportspagejsx)
5. [Reusable Chart Components & Slice Labels Plugin](#5-reusable-chart-components--slice-labels-plugin)
6. [Step-by-Step Verification & Testing Guide](#6-step-by-step-verification--testing-guide)

---

## 1. Mentor Requirements & Checklist Audit

Milestone 4 Task 1 requires:
* **Upcoming & All Trips:** Display traveler vacations with departure countdowns and itineraries. Support status filtering (`All`, `Planned`, `Ongoing`, `Completed`), dynamic **Year-wise filtering** (`All Years`, `2026`, `2025`, `2024`), and **3-item pagination** (`<< Prev (3)` and `(3) Next >>`).
* **Travel Statistics:** High-level cards for Total Vacations, Completed Vacations, Upcoming & Active, and Destinations Explored.
* **Trip-Wise Budget vs. Expense:** Prominent, large-format bar chart directly comparing allocated budget caps against actual out-of-pocket expenses for each journey, with **Year-wise filtering** and **3-item pagination** (`<< Prev (3)` and `(3) Next >>`).
* **Shared Expenses & Debt Settlement:** Two-column companion debt audit:
  - *Money You Owe to Others:* List of companion names, amounts (₹), trip, date, and description. For `aln` (user 6), correctly displays ₹0 debt ("All Paid & Clean! Always paid on time").
  - *Money to be Paid by Others:* Summary of amounts owed to the user by companions (e.g., Tom: ₹3,000, Pi: ₹20,025.13, Kim: ₹14,125.12, Bell: ₹8,125.13) with companion pill badges and detailed ledger cards.
* **Bills & Receipts Status:** Filterable by Trip, Calendar Year, and Paid vs. Pending status, with top-4 pagination.
* **Expense Category Donut Chart:** Exact percentage values embedded **directly onto chart slices** via custom canvas plugin (`e.g., 35%, 28%`), as well as inside legend labels `(e.g., Hotel (Accommodation) (35.4%))` and hover tooltips.
* **Travel Documents Vault:** Filterable by Year, Document Category, and Storage Location (Cloud vs. Local Device), with top-4 pagination.
* **Travel Groups Created:** Filterable by Year and Trip, displaying shareable join codes, member counts, and squad managers with top-4 pagination.
* **Favorite Destinations:** Most frequented holiday spots ranked by booking frequency.
* **Master Portfolio Budget Migration:** Combined all-trips total budget and total outflow moved to `ReportsPage.jsx` to keep the personal dashboard focused on actionable travel life.

---

## 2. Layman / Non-Technical Explanation

Imagine you have an **Intelligent Personal Travel & Financial Command Center**:
1. **Travel Statistics:** Instant visibility into how many trips you've planned, completed, and how many unique destinations you've explored.
2. **All Trips with Status Tabs:** Switch between All Trips, Planned Trips, Ongoing Trips, and Completed Trips with a single click. Browse 4 trips at a time with clean `<< Prev (4)` and `(4) Next >>` buttons.
3. **Trip-Wise Budget vs. Outflow Chart:** A large, colorful grouped bar chart comparing what you planned to spend vs. what you actually spent for every vacation.
4. **Who Owes Whom (Shared Debts):** Never lose track of split bills. Immediately see if you owe anyone money (with creditor name, amount, trip, and date) or if companions owe you money. If everything is settled, a cheerful green message confirms you are 100% debt-free!
5. **Bills & Receipts Tracker:** Filter receipts by vacation, year, and check whether they are Paid or Pending.
6. **Category Expense Donut:** See exactly what percentage of your vacation money went into Flights, Hotels, Food, Activities, or Shopping.
7. **Document Vault & Travel Squads:** Quick access to boarding passes and hotel bookings stored in the Cloud or on your device, plus your travel groups with 6-character join codes.

---

## 3. Technical Architecture & Component Flow

```
                      ┌───────────────────────────────┐
                      │          User Login           │
                      └───────────────┬───────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │       Dashboard.jsx           │
                      │  (Route: /dashboard)          │
                      └───────────────┬───────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
  analyticsService.getTravelerDashboard()          tripService.getMyTrips()
  (High-level metrics, categories, favorites)      (User journeys & vacations)
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────────────────────┐
                    ▼                                        ▼                                        ▼
       reportService.getTripReport()           splitExpenseService.getSplitsByTrip()     vaultService.getDocumentsByTrip()
       (Trip budgets & expenses for chart)     (Who owes whom / companion debts)         (Tickets, vouchers, photos)
```

---

## 4. Enhanced Personal Traveler Dashboard Modules

### 4.1 Section 1: Travel Statistics Scorecard
- **Total Vacations:** `stats.totalTrips ?? trips.length`
- **Completed Vacations:** `stats.completedTrips ?? trips.filter(t => t.status === "COMPLETED").length`
- **Upcoming & Active:** `(stats.plannedTrips || 0) + (stats.ongoingTrips || 0)`
- **Destinations Explored:** Unique cities and countries visited across all journeys.

### 4.2 Section 2: All Trips with Status Switcher, Year Filter & 3/Page Pagination
- **Switcher Pills:** `All Trips (N)`, `Planned (N)`, `Ongoing (N)`, `Completed (N)`.
- **Year-Wise Filter Dropdown:** Dynamically extracts unique vacation years (e.g., `All Years`, `2026`, `2025`, `2024`) to isolate trips by calendar season.
- **Display Limit:** Top 3 trips per page.
- **Bottom Pagination:** `<< Prev (3)`, `Page X of Y`, and `(3) Next >>` with disabled boundary controls.
- **Card Metadata:** Destination, travel dates, status badge, number of travelers, and direct link to `/trips/:id`.

### 4.3 Section 3: Trip-Wise Budget vs. Outflow Bar Chart with Year Filter & 3/Page Pagination
- **Component:** `PlannedVsActualBarChart.jsx` (Height: `360px`).
- **Year-Wise Filter Dropdown:** Filter trip budget comparison bars by calendar year (`All Years`, `2026`, `2025`, `2024`).
- **Display Limit & Pagination:** Shows 3 trips per view with bottom `<< Prev (3)` and `(3) Next >>` controls, keeping charts clear, readable, and non-crammed.
- **Data Series:**
  - Teal Bar (`#0f766e`): Allocated Budget Cap
  - Amber Bar (`#f59e0b`): Actual Outflow Spent
- **Summary Badges:** Total Planned, Total Spent, and Net Variance (+Surplus / -Deficit).

### 4.4 Section 4: Shared Expenses, Debts Settlement & Companion Breakdown
- **Enhanced Identification Logic:** Both debtor and creditor matching uses JWT email as well as username for 100% reliable split association.
- **Column A (Money You Owe):** Filtered where logged-in user is the debtor and `isSettled === false`:
  - When debts exist: Displays **Pending Debts Summary**, creditor pills, first 5 details on page 1, and `<< Prev (3)` / `(3) Next >>` pagination controls.
  - When debts are zero (e.g. for user `aln`): Renders a clean, uncluttered blank state (`— No pending debts to pay (₹0.00) —`).
- **Column B (Money Owed to You):** Filtered where logged-in user is the payer and companion share is unsettled:
  - **Companion Breakdown Summary Badge:** Displays total pending collections (`₹45,275.38`) alongside companion pills:
    - `Tom: ₹3,000`
    - `Pi: ₹20,025.13`
    - `Kim: ₹14,125.12`
    - `Bell: ₹8,125.13`
  - **5 Initial Details + Pagination:** Displays the first 5 companion debts on page 1, with `<< Prev (3)` and `(3) Next >>` pagination controls when more than 5 exist.

### 4.5 Section 5: Bills & Receipts Status Module
- **Filters:** Trip dropdown (`All Trips` or specific trip), Year dropdown (`All Years`, `2026`, `2025`, `2024`), and Status pills (`All`, `Paid`, `Pending`).
- **Pagination:** Top 3 receipts per page with bottom `<< Prev (3)` and `(3) Next >>` controls.
- **Card Metadata:** Category icon, description, amount (₹), trip name, date, payer, and `PAID` / `PENDING` badge.

### 4.6 Section 6: Expense Category Share Donut Chart with Direct Slice % Figures
- **Left Ledger:** Itemized list of categories with icons, names, amounts, and percent of total.
- **Right Donut Chart:** Reusable `CategoryDonutChart.jsx` rendering:
  - **Direct Slice Canvas Figures:** Bold white percentage figures (`35%`, `28%`, etc.) drawn directly onto arc slice centroids via custom Chart.js plugin (`afterDatasetsDraw`).
  - **Legend Labels:** Exact percentages in legend items `(e.g., Food & Dining (28.4%))`.
  - **Interactive Tooltips:** `Category: ₹Amount (XX.X%)`.
  - **Center Cutout Callout:** Displays the dominant spending category percentage.

### 4.7 Section 7: Travel Documents Vault (Cloud vs. Local Device)
- **Filters:** Year (`All`, `2026`, `2025`, `2024`), Category (`Tickets`, `Bookings`, `Receipts`, `Photos`, `Other`), and Storage Location (`Cloud Storage ☁️` vs. `Local Device 💻`).
- **Pagination:** Top 3 documents per page with bottom `<< Prev (3)` and `(3) Next >>` controls.
- **Actions:** Secure download / preview links.

### 4.8 Section 8: Travel Groups Created (Join Codes & Squad Rosters)
- **Filters:** Year and Trip dropdowns.
- **Pagination:** Top 3 squads per page with bottom `<< Prev (3)` and `(3) Next >>` controls.
- **Card Metadata:** Squad name, associated trip, 6-character Join Code, companion count, and link to squad manager.

### 4.9 Section 9: Favorite Destinations Badges
- Grid of top destinations ranked by visit frequency.

### 4.10 Portfolio Master Audit Migration to ReportsPage.jsx
- The platform-wide combined all-trips total budget, total spent, and buffer are migrated to `ReportsPage.jsx` under **"💼 Master Portfolio: All-Trips Combined Budget & Outflow"**, giving deep financial reporting where it belongs.

### 4.11 Navbar Profile Oval Integration
- Removed the redundant plain text "Profile" link from the navbar.
- The user badge written in the sleek oval capsule (`👤 username` / `🛡️ username ADMIN`) now directly serves as the interactive link to `/profile`, with subtle hover animations and active tab highlights.

---

## 5. Reusable Chart Components & Slice Labels Plugin

1. **`CategoryDonutChart.jsx` (`src/components/charts/CategoryDonutChart.jsx`)**:
   - **Direct Slice Figure Plugin (`sliceLabelsPlugin`):** Uses Chart.js `afterDatasetsDraw` lifecycle hook. For every arc slice with $\ge 4\%$ share, computes the centroid via `element.tooltipPosition()` and renders clean, centered percentage text (`e.g., 35%`, `28%`).
   - Automatically calculates total category sum across datasets.
   - Legend formatter renders: `Label (XX.X%)`.
   - Tooltips show currency and percentage: `Amount: ₹18,000 (34.5%)`.
   - Shared between Traveler Dashboard (`Dashboard.jsx`) and Financial Reports (`ReportsPage.jsx`).

2. **`PlannedVsActualBarChart.jsx` (`src/components/charts/PlannedVsActualBarChart.jsx`)**:
   - Supports both category-wise breakdown (for single-trip audits in Reports) and trip-wise comparison (for all trips in Dashboard).
   - Configurable height (default `290px`, expandable to `360px`).
   - Grouped dual-bar presentation with rounded corners and high-contrast tooltip callbacks.

---

## 6. Step-by-Step Verification & Testing Guide

```bash
# 1. Run Vite frontend build verification
cd TripNestProjVer4M4/code_FrontEnd
npm run build

# Expected Output:
# ✓ 131 modules transformed.
# dist/assets/index-BKiq4zvo.js  863.38 kB
# dist/assets/index-VnvctOBR.css  66.87 kB
# ✓ built in 279ms with 0 errors
```

1. Open `http://localhost:5173/dashboard` after login.
2. Verify **Travel Statistics** at top (Total, Completed, Upcoming, Destinations).
3. Test **All Trips switching box**: Click `Planned`, `Ongoing`, `Completed`. Verify cards update and pagination (`<< Prev (4)` and `(4) Next >>`) works.
4. Verify the **Trip-Wise Budget vs. Outflow Bar Chart** renders in large size with allocated budgets and actual spent.
5. Inspect **Shared Expenses & Debts**: Verify both columns display companion debts or "All Settled".
6. Test **Bills Status**: Change Trip dropdown, Year dropdown, and toggle `Paid` vs. `Pending`. Verify top 4 cards and pagination.
7. Inspect the **Category Donut Chart**: Verify percentage values appear inside the legend and on hover.
8. Test **Documents Vault** and **Travel Groups**: Verify year/category/storage filters and 4-per-page pagination.
9. Open `http://localhost:5173/reports` and verify the **Master Portfolio All-Trips Combined Budget & Outflow** card is displayed prominently.
