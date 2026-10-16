# 📑 Milestone 4 Task 9: Reports & Data Visualizer UI (`M4T9_README.md`)

> **Project:** TripNest Travel Management System (Milestone 4 Frontend)  
> **Task Name:** Charts & Reports UI  
> **Author & Implementation:** Antigravity AI (Ag) pair-programming with Shreyas (Azn / Alpha1zln)  
> **Directory Location:** `code_FrontEnd/MilestoneWiseFtdDocsByAg/MLSTN_WISE_FTD_README/M4_FTD_README/M4T9_README.md`  
> **Related Backend Task:** Milestone 4 Task 3 (`ReportController.java`, `ReportAggregationService.java`)  
> **Verification Status:** Fully bundled & verified with Vite (`npm run build` -> 0 errors)  

---

## 📌 1. Layman's Explanation (Non-Technical Analogy)

Imagine you are reviewing your household budget and personal investments at year-end.
You don't want a disorganized pile of receipts. You want a **Professional Visual Financial Portfolio**:
* ⚖️ **Planned vs. Actual:** A bar chart with two bars per category: "Planned Budget" vs "What We Actually Spent". You can immediately see: *Food spending reached 90% of its budget envelope, while Hotel spending stayed well below at 48%!*
* 🍩 **Where It Went:** A colorful donut chart breaking down total expenses into Transportation, Hotels, Food, Activities, Shopping, and Misc.
* 📈 **Spending Over Time:** A smooth trend line graph showing your spending velocity from January to December.
* 📥 **Export to Spreadsheet:** A single button that instantly generates and downloads an Excel/Google Sheets-compatible `.csv` ledger.

---

## 🏗️ 2. Technical Architecture & Chart Implementations

```
┌────────────────────────────────────────────────────────┐
│         Spring Boot Backend (Port 8080)                │
│  - GET /api/reports/trips/{tripId}/comprehensive       │
│  - GET /api/reports/expenses/filtered                  │
│  - GET /api/reports/expenses/csv/export (Streaming)    │
│  - GET /api/reports/travel/yearly/{year}               │
└───────────────────────────┬────────────────────────────┘
                            │ JSON & Octet-Stream
                            ▼
┌────────────────────────────────────────────────────────┐
│       code_FrontEnd/src/services/reportService.js      │
│  - getTripReport(tripId)                               │
│  - getFilteredExpenses(params)                         │
│  - downloadExpenseCsv(params) -> browser blob download │
│  - getAnnualSummary(year)                              │
└───────────────────────────┬────────────────────────────┘
                            │ React State
                            ▼
┌────────────────────────────────────────────────────────┐
│         code_FrontEnd/src/pages/ReportsPage.jsx        │
├────────────────────────────────────────────────────────┤
│ 1. Header Banner with 1-Click CSV Streaming Export     │
│ 2. Trip Selector & Planned vs. Actual Budget Audit:    │
│    - Bar Chart: Planned Limit vs. Actual Spent per cat │
│    - Donut Chart: Percentage share per category        │
│    - Real-Time Utilization Badges (e.g. 90% Spent)     │
│ 3. Year-in-Review & Spending Trajectory:               │
│    - Line Chart: 12-Month Spending Trend Curve         │
│    - 4 Key Metrics: Trips, Total Spend, Spots, Max Trip│
│ 4. Multi-Criteria Filter Panel & Filtered Ledger Table │
└────────────────────────────────────────────────────────┘
```

---

## 📂 3. Chart.js Visual Components Used

1. **Bar Chart (`BarElement`, `CategoryScale`, `LinearScale`):** Used for Planned vs. Actual budget comparison side-by-side per category.
2. **Donut Chart (`ArcElement`, `Legend`, `Tooltip`):** Used for category expense distribution.
3. **Line Chart (`PointElement`, `LineElement`):** Used for monthly spending trajectories over time with smooth bezier curves.

---

## 🔍 4. Verification & Testing

1. Open `http://localhost:5173/reports`.
2. Verify:
   - Select any trip from the dropdown $\rightarrow$ Planned vs. Actual bar chart renders immediately.
   - Budget health badges display utilization percentages.
   - 12-month trend line chart plots monthly expenses.
   - Filtering by category (e.g. `FOOD`) updates the table immediately.
   - Clicking **"Download All Expenses (CSV)"** saves a real `.csv` file with headers and currency columns.
