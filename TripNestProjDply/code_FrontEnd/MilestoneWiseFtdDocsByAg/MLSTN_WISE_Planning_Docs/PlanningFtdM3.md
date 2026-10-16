# TripNest — Milestone 3 Frontend Master Blueprint (`PlanningFtdM3.md`)

> **Module:** Milestone 3 Frontend Blueprint (Tasks 7 to 12: Financial Transparency, Collaboration & Media Hub)  
> **Tech Stack:** React 19, Vite, Axios, React Router 7, HTML5 / CSS3  
> **Authors:** Shreyas (Azn / Alpha1zln - Software Engineer) & Antigravity (Ag - AI Pair Programmer)  
> **File Location:** `code_FrontEnd/MilestoneWiseFtdDocsByAg/MLSTN_WISE_Planning_Docs/PlanningFtdM3.md`  

---

## 📌 Executive Summary
Milestone 3 transforms TripNest from a single-user itinerary planner into a **collaborative, multi-party group travel platform with real-time financial tracking and digital media storage**.

This document is divided into two distinct sections:
1. **Part 1: Non-Technical Blueprint (Stakeholder & Evaluator Presentation)** — Written in clear, engaging layman terms explaining what problem each task solves, how it works for real travelers, and its business value.
2. **Part 2: Technical Engineering Architecture (Developer Roadmap)** — Detailed component hierarchies, API service layer contracts, state management strategies, and tab orchestrator integrations for Tasks 7 through 12.

---

# 🌟 PART 1: NON-TECHNICAL BLUEPRINT (EXECUTIVE & EVALUATOR PRESENTATION)

### The Core Traveler Problem
Traveling with family or college friends is exciting, but organizing it is notorious for three major headaches:
1. **Financial Anxiety & Budget Overruns:** People spend money blindly on the first two days and run out of cash by the end of the trip.
2. **"Who Owes Whom How Much?" Confusion:** Group dinners, taxi rides, and grocery bills get paid by different people, leading to awkward arguments, lost receipts, and messy math.
3. **Scattered Documents & Lost Reminders:** Flight tickets, hotel vouchers, and ID cards get buried in WhatsApp chats or lost email threads.

**Milestone 3 Frontend solves all three problems through 6 specialized, connected modules (Tasks 7 to 12).**

---

### 💰 Task 7: Budget Management UI (The Digital Envelopes)
* **What Problem It Solves:** Travelers need to set a hard spending limit before leaving home and allocate target funds across categories so they don't overspend on luxury stays and starve on food.
* **How It Works for the User:**
  - When opening a trip, the user sees a **"💰 Budget"** tab.
  - **Three Top Metric Cards:** Planned Budget (e.g. ₹50,000), Total Allocated (₹42,000), and Free Margin (₹8,000).
  - **Category Progress Bars:** Five visual colored progress bars (🏨 Stays, ✈️ Transit, 🍽️ Dining, 🎟️ Sightseeing, 📦 Misc).
  - **Interactive Setup Modal:** A popup where users type category targets with live validation that stops them if category allocations exceed the total budget.
* **Business & User Value:** Eliminates mid-vacation budget stress and empowers travelers with proactive monetary planning.

---

### 🧾 Task 8: Expense Tracking UI (The Digital Cash Register)
* **What Problem It Solves:** A budget is useless if you don't track your actual real-world expenditures as they happen.
* **How It Works for the User:**
  - A clean chronological ledger listing every expense incurred during the trip.
  - An **"[+ Log Expense]"** button opens a quick-entry form: Title ("Taxi to Hotel"), Amount (₹2,200), Date, Category, and Payer ("Aln").
  - Quick action buttons to edit typos or delete canceled purchases.
  - Instant badges showing the currency (₹ INR) and category icons.
* **Business & User Value:** Provides a transparent transaction history that matches bank accounts and credit card receipts.

---

### 📊 Task 9: Expense Categories & Reports UI (The Financial Health Meter)
* **What Problem It Solves:** Staring at a list of 50 raw numbers makes it impossible to see where the bulk of the money actually went.
* **How It Works for the User:**
  - **Visual Spending Breakdown:** Progress bars and percentage meters showing total spent per category.
  - **Budget vs. Actual Meter:** Compares planned allocation against actual spending (e.g., Planned Food: ₹8,000 vs Actual Spent: ₹6,500 $\rightarrow$ 🟢 ₹1,500 under budget).
  - **Threshold Warnings:** If spending hits 85% of a category ceiling, the bar turns yellow; if it exceeds 100%, it turns red with an alert badge.
* **Business & User Value:** Gives travelers real-time self-correcting financial insights while on the move.

---

### 👥 Task 10: Group Collaboration UI (The Travel Party Roster)
* **What Problem It Solves:** Travel is inherently social. Typing every friend's email address is tedious, and groups need clear roles (Who is the planner? Who is a companion?).
* **How It Works for the User:**
  - **Travel Party Roster:** Displays all companions with their avatar initials, names, and contact emails.
  - **Instant 6-Character Join Code:** A prominent banner with a one-click copy button (e.g. `Join Code: H9X4KQ`). Any friend can enter this code in their app and join the trip in 2 seconds!
  - **Three-Tier Role Badges:** Clearly labels who is the `GROUP_OWNER`, who is a `GROUP_ADMIN`, and who is a regular `GROUP_MEMBER`.
  - **Admin Controls:** Trip owners can promote friends to admins or remove members who cancel.
* **Business & User Value:** Viral user onboarding—inviting friends to trips naturally drives new user signups.

---

### 🤝 Task 11: Shared Expenses & Settlements UI (The Split-Wise Engine)
* **What Problem It Solves:** When Aln pays ₹3,000 for dinner with Pi and Kim, nobody should have to do complex manual math to figure out who owes what.
* **How It Works for the User:**
  - **Equal & Custom Bill Split Popup:** When viewing any bill, click **"[Split Bill]"**. Choose "Equal Split" (divided evenly with penny balancing) or "Custom Split" (assign specific amounts).
  - **Member Contribution Passbook:** A scorecard showing for each companion: Total Paid, Fair Share, Net Balance, and a colored status badge:
    - 🟢 `RECEIVES ₹6,333.33` (Creditor)
    - 🔴 `OWES ₹3,166.67` (Debtor)
    - ⚪ `SETTLED ₹0.00`
  - **Smart Debt Settlement Cards (Min-Cash-Flow DSA):** Minimizes peer-to-peer transactions down to the simplest possible payments (e.g. *"Pi pays ₹3,166.67 directly to Aln"*). Includes a single-click **"[Mark Settled]"** button!
* **Business & User Value:** Eliminates post-trip financial awkwardness and guarantees fair, mathematically exact settlements.

---

### 🔔 Task 12: Notifications Hub & Media Vault UI (The Digital Safety Locker)
* **What Problem It Solves:** Flight tickets, hotel confirmations, and boarding passes get lost in emails or physical bags. Travelers also miss early morning excursions because they forget the itinerary schedule.
* **How It Works for the User:**
  - **Media & Document Vault:** A clean grid where companions can drag-and-drop or upload PDF tickets, hotel booking confirmations, and vacation photos (up to 10 MB).
  - **Category Tabs:** Filter documents by `Tickets`, `Bookings`, `Receipts`, and `Photos`.
  - **Direct Previews & Downloads:** Click any document to view it in-browser or download the original file stream.
  - **Top Navbar Notification Bell (🔔):** A live bell icon in the top header displaying an unread counter badge. Clicking it opens a dropdown feed showing morning briefing reminders, new bill split notices, and trip updates, with a **"[Mark All Read]"** button.
* **Business & User Value:** A central digital vault replaces physical paper documents and ensures seamless on-trip communication.

---

# 🏗️ PART 2: TECHNICAL ENGINEERING BLUEPRINT

```text
                                [ TripDetails.jsx ] (Master Tab Orchestrator)
                                        │
    ┌────────────────┬──────────────────┼─────────────────┬──────────────────┬─────────────────┐
    ▼                ▼                  ▼                 ▼                  ▼                 ▼
[ 🗓️ Itinerary ] [ 💰 BudgetTab ]  [ 🧾 ExpenseTab ] [ 📊 ReportsTab ]  [ 👥 GroupTab ]  [ 🤝 SplitsTab ]  [ 📁 VaultTab ]
  (Task 2)          (Task 7)           (Task 8)          (Task 9)           (Task 10)         (Task 11)         (Task 12)
                        │                  │                 │                  │                 │                 │
                        ▼                  ▼                 ▼                  ▼                 ▼                 ▼
                 budgetService.js   expenseService.js expenseService.js   groupService.js   splitService.js   vaultService.js
```

---

## 1. Technical Architecture & File Inventory (Tasks 7 to 12)

| Task | Module | New UI Component (`src/components/`) | API Service Layer (`src/services/`) | Backend Endpoints Connected |
| :---: | :--- | :--- | :--- | :--- |
| **T7** | Budget Management UI | `BudgetTab.jsx` *(Completed)* | `budgetService.js` *(Completed)* | `GET/POST/PUT/DELETE /api/trips/{id}/budgets` |
| **T8** | Expense Tracking UI | `ExpenseListTab.jsx`, `ExpenseModal.jsx` | `expenseService.js` | `GET/POST/PUT/DELETE /api/expenses` |
| **T9** | Categories & Reports UI | `ExpenseReportsTab.jsx` | `expenseService.js` | `GET /api/trips/{id}/expenses/summary` |
| **T10**| Travel Group UI | `TravelGroupTab.jsx`, `JoinGroupModal.jsx`| `groupService.js` | `POST/GET /api/trips/{id}/groups`, `POST /api/groups/join` |
| **T11**| Shared Expenses UI | `SharedExpensesTab.jsx`, `SplitModal.jsx` | `splitService.js` | `POST /split`, `GET /contributions`, `GET /debts/settle` |
| **T12**| Media Vault & Notifications | `DocumentVaultTab.jsx`, `NotificationBell.jsx` | `vaultService.js`, `notificationService.js` | `POST/GET /documents`, `GET/PUT /notifications` |

---

## 2. Detailed Technical Breakdown for Remaining Tasks (T8 to T12)

### 🔹 Task 8: Expense Tracking UI
* **Components to Build:**
  1. `ExpenseListTab.jsx`: Renders the table/cards of logged expenses, filterable by date and category.
  2. `ExpenseModal.jsx`: Modal popup with fields for description, numeric amount, expense date, category dropdown, and payer selection.
* **Service:** `expenseService.js`
  - `getExpensesByTrip(tripId, category)`
  - `createExpense(tripId, expenseData)`
  - `updateExpense(expenseId, expenseData)`
  - `deleteExpense(expenseId)`
* **Key State:** `expenses` array, `selectedExpense` for editing, `isModalOpen`.

---

### 🔹 Task 9: Expense Categories & Reports UI
* **Components to Build:**
  1. `ExpenseReportsTab.jsx`: Consumes backend summary endpoint (`/summary`) to render:
     - Total spent metric card.
     - Planned vs. Actual budget difference indicator.
     - Category breakdown bars (Accommodation, Transportation, Food, Activities, Shopping, Misc) with dynamic percentage calculations.
* **Key Visuals:** CSS-based progress tracks with alert states (Green: $< 80\%$, Yellow: $80-99\%$, Red: $\ge 100\%$).

---

### 🔹 Task 10: Group Collaboration UI
* **Components to Build:**
  1. `TravelGroupTab.jsx`: Displays group header, member cards, role badges (`GROUP_OWNER`, `GROUP_ADMIN`, `GROUP_MEMBER`), and copyable 6-character Join Code.
  2. `JoinGroupModal.jsx`: Quick modal for entering join codes.
* **Service:** `groupService.js`
  - `getGroup(tripId)`
  - `createGroup(tripId, groupData)`
  - `joinGroup(joinCode)`
  - `updateMemberRole(tripId, userId, newRole)`
  - `removeMember(tripId, userId)`

---

### 🔹 Task 11: Shared Expenses & Settlements UI
* **Components to Build:**
  1. `SharedExpensesTab.jsx`: Two-panel view:
     - Top Panel: **Member Contribution Passbook** (Total Paid, Fair Share, Net Balance, Badges).
     - Bottom Panel: **Min-Cash-Flow Settlement Cards** ("Pi owes Aln ₹3,166.67") with single-click settlement action.
  2. `SplitModal.jsx`: Form to execute `EQUAL` or `CUSTOM` split allocations on any expense.
* **Service:** `splitService.js`
  - `splitExpense(expenseId, splitPayload)`
  - `getTripSplits(tripId)`
  - `getMemberContributions(tripId)`
  - `getMinCashFlowSettlements(tripId)`
  - `settleSplit(splitId)`

---

### 🔹 Task 12: Notifications Hub & Media Vault UI
* **Components to Build:**
  1. `DocumentVaultTab.jsx`: File drag-and-drop zone, category filtering chips, thumbnail grid for photos/PDFs, and download triggers.
  2. `NotificationBell.jsx`: Positioned in `Navbar.jsx` with an unread badge counter (🔔 3) and a dropdown feed with timestamped alerts (`timeAgo`) and mark-all-read buttons.
* **Services:**
  - `vaultService.js`: `uploadDocument(tripId, formData)`, `listDocuments(tripId, category)`, `deleteDocument(id)`.
  - `notificationService.js`: `getNotifications()`, `getUnreadCount()`, `markAllRead()`.

---

## 3. Global Integration Roadmap & Execution Sequence

```text
  Step 1 (T7):  Budget Planning UI           ──> [DONE & VERIFIED]
  Step 2 (T8):  Expense Tracking UI          ──> NEXT
  Step 3 (T9):  Categories & Reports UI      ──> Connects to T7 & T8
  Step 4 (T10): Group Collaboration UI       ──> Prepares members for T11
  Step 5 (T11): Shared Expenses & Splits     ──> Combines T8 & T10
  Step 6 (T12): Media Vault & Notifications  ──> Milestone 3 Complete!
```

---

## 4. Architectural Defense Talking Points (Evaluator / Interview Ready)

> **Q: How does TripNest maintain UI performance while managing complex multi-tab trip workspaces (Itinerary, Budget, Expenses, Groups, Splits, Media)?**
>
> *"We utilize a modular tab-driven component architecture orchestrated by `TripDetails.jsx`. Each tab component (e.g. `BudgetTab`, `SharedExpensesTab`) is completely decoupled and lazy-fetches its own domain data via dedicated Axios services only when mounted. Shared authentication tokens are centralized through an Axios request interceptor, and local form validations prevent redundant network traffic. This guarantees sub-second initial page loads and isolates state mutations to the active tab without causing unnecessary re-renders across the application."*
