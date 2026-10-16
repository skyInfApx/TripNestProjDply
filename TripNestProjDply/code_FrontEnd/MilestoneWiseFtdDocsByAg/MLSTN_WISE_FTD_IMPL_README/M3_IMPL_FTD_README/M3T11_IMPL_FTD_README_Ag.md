# Milestone 3 Task 11: Shared Expenses & Split Settlements UI — Frontend Implementation Guide

> **Author:** Antigravity (AI Pair Programmer)  
> **Milestone:** 3 (Advanced Travel Collaboration, Real-Time Splitting & Intelligence)  
> **Task:** 11 (Shared Expenses UI, Member Balance Passbook & Greedy Debt Minimization)  
> **Tech Stack:** React 19, Vite, Axios, React Router 7, Modern CSS  
> **Backend Counterpart:** Spring Boot `ExpenseSplitController.java`, `ExpenseSplitService.java`  

---

## 📌 1. Task Objective & Architecture

Task 11 equips TripNest with an enterprise-grade collaborative expense-splitting engine (similar to Splitwise), embedded directly inside the trip workspace. Travelers can:

1. **Equal & Custom Bill Splitting:** Select any trip receipt (e.g. ₹2,200 Taxi) and divide it evenly among companions with base-10 penny balancing (e.g. ₹100 / 3 = 33.34 + 33.33 + 33.33) or specify exact custom allocations.
2. **Member Balance Passbook:** View a personal financial scorecard for each companion displaying Total Paid upfront, Fair Share of group costs, Net Balance, and high-contrast status badges (`🟢 RECEIVES`, `🔴 OWES`, `⚪ SETTLED`).
3. **Smart Debt Minimization (Greedy Algorithm):** Visualizes the minimal peer-to-peer transaction graph computed by the backend, reducing $O(N^2)$ cross-debts down to the simplest possible direct transfers (e.g. `Ramanujan ➔ pays ₹1,100 ➔ Aln`).
4. **1-Click Debt Settlement:** Allows creditors and debtors to confirm payments and instantly mark debt shares as settled via `PUT /api/splits/{splitId}/settle`.
5. **Cross-Tab Deep Linking:** Jump directly from any receipt row in `ExpenseTab` into the split workflow with one click via `🤝 Split`.

---

## 🏗️ 2. Files Created & Modified

| # | File Path | Type | Role |
|---|---|---|---|
| 1 | `src/components/SharedExpensesTab.jsx` | Component | Master Splitwise hub with Passbook cards, Min-Cash-Flow settlements, Split Modal, and Audit Ledger. |
| 2 | `src/pages/TripDetails.jsx` | Page | Mounts the `🤝 Shared Expenses & Splits` tab on Line 2 of the 2-tier fast-access tab navigation bar. |
| 3 | `src/components/ExpenseTab.jsx` | Component | Enhances the expense ledger with a direct `🤝 Split` shortcut button on each receipt row. |
| 4 | `src/services/splitExpenseService.js` | Service | Connects React to the 7 Spring Boot endpoints in `ExpenseSplitController`. |
| 5 | `M3T11_IMPL_FTD_README_Ag.md` | Doc | Comprehensive AG architecture guide, algorithm deep-dive, and interview answers. |

---

## 🔌 3. REST API Endpoint Mapping

All calls use the pre-configured Axios instance (`apiClient.js`) with automatic JWT Bearer token injection.

| HTTP Method | Backend URL Path | Frontend Service Function | Description |
|---|---|---|---|
| `POST` | `/api/expenses/{expenseId}/split` | `splitExpenseService.splitExpense(id, payload)` | Divides an expense among companions (`EQUAL` or `CUSTOM`) |
| `GET` | `/api/trips/{tripId}/splits/contributions` | `splitExpenseService.getMemberContributions(tripId)` | Fetches member passbook balances (Total Paid, Fair Share, Net) |
| `GET` | `/api/trips/{tripId}/debts/settle` | `splitExpenseService.getOptimizedSettlements(tripId)` | Retrieves Greedy Debt Minimization settlement transactions |
| `GET` | `/api/trips/{tripId}/splits` | `splitExpenseService.getSplitsByTrip(tripId)` | Loads all recorded split shares across the entire trip |
| `GET` | `/api/trips/{tripId}/splits/my-debts` | `splitExpenseService.getMyPendingDebts(tripId)` | Fetches unsettled debts specifically owed by the logged-in user |
| `PUT` | `/api/splits/{splitId}/settle` | `splitExpenseService.settleSplit(splitId)` | Marks a specific companion's split debt as settled (paid) |
| `GET` | `/api/expenses/{expenseId}/splits` | `splitExpenseService.getSplitsByExpense(expenseId)` | Gets split shares for a specific receipt |

---

## 🎨 4. Design Language & Fresh Emerald Theme Palette

Following TripNest's color-coded executive tab pattern:
- **Tab Accent Color:** Fresh Emerald & Forest Teal (`#059669`, `#047857`, `#065f46`)
- **Header Banner Gradient:** `linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)`
- **Banner Border:** `1px solid #a7f3d0` with `borderLeft: 6px solid #059669`
- **Creditor Badge (Receives):** Mint Green (`#ecfdf5`, border `#6ee7b7`, text `#059669`)
- **Debtor Badge (Owes):** Soft Rose (`#fef2f2`, border `#fca5a5`, text `#dc2626`)
- **Settled Badge:** Neutral Slate (`#f8fafc`, border `#cbd5e1`, text `#64748b`)
- **Modal Backdrop:** Glassmorphism `rgba(15, 23, 42, 0.6)` with `backdropFilter: blur(4px)`

---

## ⚙️ 5. State Handling & Edge Cases

1. **Concurrent Data Hydration (`Promise.allSettled`):**
   - Loads 5 domain endpoints in parallel (contributions, settlements, splits, expenses, and group members).
   - Prevents total UI failure if one sub-service is empty or encounters an error.
2. **Dynamic Live Math & Validation:**
   - **Equal Mode:** Computes `billAmount / selectedCount` formatted to 2 decimals in real time.
   - **Custom Mode:** Sums user inputs dynamically using `Array.reduce()`. Blocks form submission if the custom sum differs from the total bill by more than 5 paise (`Math.abs(sum - total) > 0.05`).
3. **Empty & Celebratory States:**
   - When no expenses exist: Guides the user to log a receipt before splitting.
   - When all debts are settled: Displays a celebratory banner (`🎉 All companion debts are completely settled!`).
4. **Optimistic Loading Locks:**
   - Tracks `actionLoadingId` so only the clicked settlement row exhibits a spinner, preventing layout flicker across unaffected rows.

---

## 🎯 6. Interview Preparation: Key Architectural Highlights

### Q1: How does the frontend handle mathematical floating-point rounding errors when validating custom bill splits in JavaScript?
> *"In JavaScript, standard binary floating-point representation (`IEEE 754`) can cause rounding imprecisions (e.g. `0.1 + 0.2 === 0.30000000000000004`). When validating that custom split inputs sum up to the total bill, a strict equality check (`sum === total`) will frequently fail. To solve this, we implement an epsilon tolerance check: `Math.abs(runningSum - totalExpected) > 0.05`. This allows a sub-cent/paise margin of tolerance while guaranteeing that the user cannot accidentally submit an unbalanced financial record."*

### Q2: Why use `Promise.allSettled()` instead of `Promise.all()` when hydrating the Shared Expenses dashboard?
> *"In a multi-domain collaborative workspace, `Promise.all()` operates under a 'fail-fast' mechanism—if any single request rejects (such as group members returning 404 on an uninitialized group), the entire promise chain immediately rejects, causing a total page crash. In contrast, `Promise.allSettled()` allows all asynchronous requests to finish independently. The component inspects each result's `status === 'fulfilled'` and populates available domain state (such as expenses and passbook cards) while gracefully degrading missing features."*

### Q3: How does the Greedy Debt Minimization algorithm improve traveler UX compared to direct pairwise debt tracking?
> *"Direct pairwise debt tracking results in an $O(N^2)$ web of transactions where every person owes every other person small amounts (e.g. 5 travelers might require 10 separate transfers). The Greedy Debt Minimization algorithm computes each member's net balance, sorts debtors and creditors into max-heaps, and matches the largest debtor with the largest creditor iteratively. This reduces the total transactions down to a maximum of $N - 1$, meaning 5 travelers never make more than 4 total payments to become completely debt-free."*

### Q4: What happens if an undefined function is called inside the array passed to `Promise.allSettled()`?
> *"Arguments inside `Promise.allSettled([fn1(), fn2()])` are evaluated synchronously before the promise wrapper is ever executed. If an argument throws a synchronous `TypeError` (e.g., calling an undefined method name like `getAllExpenses` instead of `getExpenses`), execution aborts immediately into the enclosing `catch` block. Because `Promise.allSettled` is never called, no asynchronous responses are processed and none of the React state variables get populated. To fix this, service methods must match exact declarations, or backwards-compatible aliases should be supplied."*

---

## 🚀 7. Verification Status
- ✅ Build: `npm run build` completed with **0 errors** in **244ms** (115 modules transformed).
- ✅ Method Alignment: Canonical call `expenseService.getExpenses(tripId)` and alias `getAllExpenses` configured.
- ✅ Clean integration: Tab 7 (`🤝 Shared Expenses & Splits`) mounted on Line 2 of `TripDetails.jsx`.
- ✅ Cross-tab shortcut: `🤝 Split` button active on all receipt cards in `ExpenseTab.jsx`.

