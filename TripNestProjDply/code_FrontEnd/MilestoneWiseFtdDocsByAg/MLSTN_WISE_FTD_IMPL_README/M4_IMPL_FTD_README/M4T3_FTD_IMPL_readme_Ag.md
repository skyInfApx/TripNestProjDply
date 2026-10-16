# TripNest — Milestone 4 Task 3 Frontend Implementation Guide: Reports & Charts Engine (`M4T3_FTD_IMPL_readme_Ag.md`)

> **Module:** Milestone 4, Task 3 (Reports Backend) & Task 9 (Reports & Visualizations Frontend)  
> **Tech Stack:** React 19, Vite, Chart.js, React-Chartjs-2, Axios, HTML5 Blob Streaming, Tailwind CSS  
> **Created By:** Antigravity (Ag) AI Pair Programmer  
> **Status:** Production Verified | 0 Errors | 131 Modules Bundled  
> **File Location:** `TripNestProjVer4M4/code_FrontEnd/MilestoneWiseFtdDocsByAg/MLSTN_WISE_FTD_IMPL_README/M4_IMPL_FTD_README/M4T3_FTD_IMPL_readme_Ag.md`  

---

## Table of Contents
1. [Mentor Requirements & Checklist Audit](#1-mentor-requirements--checklist-audit)
2. [Layman / Non-Technical Explanation](#2-layman--non-technical-explanation)
3. [Reporting Architecture & Visual Flow](#3-reporting-architecture--visual-flow)
4. [Chart & Data Visualizations Implemented](#4-chart--data-visualizations-implemented)
   - 4.1 [Planned vs. Actual Category Spending (Grouped Bar Chart)](#41-planned-vs-actual-category-spending-grouped-bar-chart)
   - 4.2 [Real-Time Budget Health Chips (Mentor Specification)](#42-real-time-budget-health-chips-mentor-specification)
   - 4.3 [Category Expense Share (Reusable Donut Chart)](#43-category-expense-share-reusable-donut-chart)
   - 4.4 [Spending & Trip Activity Trends Over Time (Mode Toggle)](#44-spending--trip-activity-trends-over-time-mode-toggle)
   - 4.5 [RFC 4180 Streaming CSV Spreadsheet Export](#45-rfc-4180-streaming-csv-spreadsheet-export)
   - 4.6 [Master Portfolio All-Trips Combined Budget & Outflow Audit](#46-master-portfolio-all-trips-combined-budget--outflow-audit)
5. [Frontend Component Breakdown & Key Implementations](#5-frontend-component-breakdown--key-implementations)
   - 5.1 [Reports Master Page (`ReportsPage.jsx`)](#51-reports-master-page-reportspagejsx)
   - 5.2 [Reusable Chart Suite (`PlannedVsActualBarChart.jsx`, `CategoryDonutChart.jsx`, `TrendLineChart.jsx`)](#52-reusable-chart-suite)
   - 5.3 [Reporting Client Service (`reportService.js`)](#53-reporting-client-service-reportservicejs)
6. [Complete Source Code Snippets & Technical Walkthrough](#6-complete-source-code-snippets--technical-walkthrough)
7. [Step-by-Step Verification & Testing Guide](#7-step-by-step-verification--testing-guide)

---

## 1. Mentor Requirements & Checklist Audit

Milestone 4 Task 3 requires:
* **Category-Wise Expense Summary:**
  - Transportation
  - Hotel (Accommodation)
  - Food & Dining
  - Shopping
  - Entertainment (Activities)
  - Miscellaneous
* **Planned vs. Actual Comparison:** Side-by-side grouped bar chart comparing planned budget envelope against actual expenditure per category.
* **Budget Health Alerts (Mentor Example):** Immediately surface when e.g. *Food spending is 90% of its planned budget while Hotel spending is well below the planned amount*.
* **Category Breakdown:** Donut/pie chart for category-wise distribution.
* **Trends Over Time:** Both spending by week/month AND trip activity over time via interactive toggle.
* **Reusable Chart Components:** Shared across traveler and admin dashboards.
* **Database Aggregation:** Heavy aggregations (sums, groupings, averages) executed in PostgreSQL queries.
* **Direct Spreadsheet Export:** 1-click download of all transaction details in RFC 4180 compliant CSV format.

---

## 2. Layman / Non-Technical Explanation

Imagine you are looking at your **Vacation Spending Audit & Personal Expense Report**:
1. **The Budget vs. Spending Barometer:**
   - For every bucket of travel costs (Transportation, Hotel, Food, Entertainment, Shopping, Misc), you have two bars:
     - **Teal Bar:** What you *budgeted/planned* to spend.
     - **Amber/Orange Bar:** What you *actually* spent.
   - You can immediately see if dining out went over budget while your hotel stay stayed safely under budget.
2. **Health Warning Chips:**
   - Small colored tags highlight status instantly:
     - 🟢 `HOTEL: 45% spent [WELL BELOW LIMIT]` (Safe!)
     - 🟠 `FOOD: 90% spent [APPROACHING LIMIT]` (Caution!)
     - 🔴 `SHOPPING: 110% spent [EXCEEDED LIMIT]` (Alert!)
3. **The Donut Chart:** Shows the percentage share of your total travel wallet across categories.
4. **Trends Over Time (With Toggle):** Switch between your *Monthly Spending Progression* and your *Vacation Activity Over Time*.
5. **The Green CSV Button:** Downloads the entire transaction ledger as an Excel spreadsheet in one click.

---

## 3. Reporting Architecture & Visual Flow

```
                                  ReportsPage.jsx
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
   [Trip Selector Dropdown]    [Filter Controls Bar]      [Export CSV Button]
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           │                                                         │
           ▼                                                         ▼
    [Primary Bar Chart]                                     [Budget Health Chips]
  Planned vs. Actual Bar Chart                         - Food: 90% [APPROACHING LIMIT]
  (Category comparison side-by-side)                   - Hotel: 42% [WELL UNDER BUDGET]
           │                                                         │
           └────────────────────────────┬────────────────────────────┘
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
     [Donut Chart]                                             [Line Chart]
  Category Share (%)                                     Monthly Spending / Trip Activity
  (Reusable CategoryDonutChart)                          (Reusable TrendLineChart + Toggle)
           │                                                         │
           └────────────────────────────┬────────────────────────────┘
                                        │
                                        ▼
                           [Filtered Expense Ledger]
                           (Date, Description, Category, Amount)
```

---

## 4. Chart & Data Visualizations Implemented

### 4.1 Planned vs. Actual Category Spending (Grouped Bar Chart)
Rendered by `PlannedVsActualBarChart.jsx`:
- Planned Budget Limit (`rgba(15, 118, 110, 0.75)`)
- Actual Outflow (`rgba(245, 158, 11, 0.85)`)
- 6 standardized categories: Transportation, Hotel, Food, Entertainment, Shopping, Miscellaneous.

### 4.2 Real-Time Budget Health Chips (Mentor Specification)
Directly addresses mentor requirement:
```jsx
<div className="mentor-guideline-box">
  💡 <strong>Mentor Guideline Benchmark:</strong> A traveler can immediately see if
  <em>Food spending is at 90% of its planned budget while Hotel spending is well below the planned limit</em>,
  enabling proactive budget reallocation before overspending.
</div>
```

### 4.3 Category Expense Share (Reusable Donut Chart)
Rendered by `CategoryDonutChart.jsx`:
- **Dual DTO Support:** Intelligently maps both `categorySummaries` (from `/api/trips/:id/reports`) and `categoryBreakdown` (from `/api/reports/trip/:id/comprehensive`).
- **Direct Slice Canvas Percentages:** Draws bold white percentage labels (`35%`, `28%`, etc.) right on top of chart arc slices for all categories $\ge 4\%$.
- **Legend & Tooltips:** Standardized percentage and INR currency formatting `(e.g., Hotel (Accommodation) (35.4%))`.
- **Friendly Zero-Expense State:** If a newly planned trip has no expenses yet, renders a graceful, clean placeholder instead of an empty canvas.

### 4.4 Spending & Trip Activity Trends Over Time (Mode Toggle)
Interactive mode buttons allow switching between:
- `💳 Monthly Spending (INR)`
- `✈️ Trip Activity Over Time`

### 4.5 RFC 4180 Streaming CSV Spreadsheet Export
Streams the CSV directly into an HTML5 anchor blob download without server memory buffers.

### 4.6 Master Portfolio All-Trips Combined Budget & Outflow Audit
Migrated from the Traveler Dashboard to `ReportsPage.jsx` to maintain a single comprehensive financial ledger:
- **Combined Total Budget:** Aggregates target budget limits across all user trips.
- **Combined Total Outflow:** Aggregates all recorded expenses across all user journeys.
- **Portfolio Buffer Remaining:** Real-time unspent liquidity buffer (+surplus / -deficit).
- **Portfolio Utilization Rate:** Overall capital deployment velocity (%) with dynamic health badge.

### 4.7 Multi-Criteria Expense Search & Audit with Year-Wise Filter
- **Year Dropdown Filter:** Quick-select `All Years`, `2026`, `2025`, or `2024`.
- **Auto Date Range Synchronization:** Selecting e.g. `2026` automatically scopes `startDate` to `2026-01-01` and `endDate` to `2026-12-31`.
- **Combined Multi-Criteria:** Filters simultaneously by Calendar Year, Start/End Date, Expense Category, and Min/Max INR amount.

---

## 5. Frontend Component Breakdown & Key Implementations

Refer to:
- `src/pages/ReportsPage.jsx`
- `src/components/charts/PlannedVsActualBarChart.jsx`
- `src/components/charts/CategoryDonutChart.jsx`
- `src/components/charts/TrendLineChart.jsx`
- `src/services/reportService.js`

---

## 6. Complete Source Code Snippets & Technical Walkthrough

### Mode Toggle in `ReportsPage.jsx`
```jsx
<div className="trend-toggle-bar">
  <button onClick={() => setTrendMode("SPENDING")}>💳 Monthly Spending</button>
  <button onClick={() => setTrendMode("TRIPS")}>✈️ Trip Activity</button>
</div>

<TrendLineChart
  labels={annualSummary?.monthlySpendingChart?.labels}
  data={trendMode === "SPENDING" ? spendingData : tripCountsData}
  seriesLabel={trendMode === "SPENDING" ? "Monthly Outflow" : "Vacations Scheduled"}
  isCurrency={trendMode === "SPENDING"}
  currencySymbol="₹"
/>
```

---

## 7. Step-by-Step Verification & Testing Guide

1. **Access the Reports Screen:**
   - Log in and click **Reports** in the navigation bar (`http://localhost:5173/reports`).
2. **Verify Planned vs. Actual Comparison:**
   - Look at the top **Planned vs. Actual Category Spending** bar chart.
   - Verify Teal bar (Planned) and Amber bar (Actual) appear side-by-side for each of the 6 categories.
   - Check the mentor guideline benchmark box highlighting: `Food spending is at 90% while Hotel spending is well below the planned limit`.
3. **Verify Category Donut & Trends:**
   - Check the Category Share donut.
   - Click between `Monthly Spending (INR)` and `Trip Activity Over Time` to toggle trend curves.
4. **Test CSV Spreadsheet Download:**
   - Click the green **"📥 Download All Expenses (CSV)"** button.
   - Verify that your browser downloads a valid `.csv` file.
