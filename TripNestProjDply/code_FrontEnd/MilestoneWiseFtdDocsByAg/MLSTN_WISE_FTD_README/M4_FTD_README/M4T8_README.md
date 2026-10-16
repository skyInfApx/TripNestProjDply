# 🛡️ Milestone 4 Task 8: Admin Control Tower UI (`M4T8_README.md`)

> **Project:** TripNest Travel Management System (Milestone 4 Frontend)  
> **Task Name:** Admin Analytics Dashboard  
> **Author & Implementation:** Antigravity AI (Ag) pair-programming with Shreyas (Azn / Alpha1zln)  
> **Directory Location:** `code_FrontEnd/MilestoneWiseFtdDocsByAg/MLSTN_WISE_FTD_README/M4_FTD_README/M4T8_README.md`  
> **Related Backend Task:** Milestone 4 Task 2 (`AdminAnalyticsController.java`, `AdminAnalyticsService.java`)  
> **Verification Status:** Fully bundled & verified with Vite (`npm run build` -> 0 errors)  

---

## 📌 1. Layman's Explanation (Non-Technical Analogy)

Imagine you are the airport chief operations officer.
While individual passengers only care about their own flight gate and baggage claim, you sit in the **Air Traffic Control Tower**:
* 🌐 **Total Traffic:** How many travelers entered the airport today?
* 🛫 **Flight Statuses:** How many flights are scheduled, active in the air, or completed?
* 📍 **Top Routes:** Are most travelers flying to Paris, Tokyo, or New York?
* 💰 **Financial Flow:** What is the total transaction volume passing through airline counters and duty-free shops?
* 🌟 **Frequent Flyers:** Who are the top global globetrotters racking up the most miles?

**Task 8 (Admin Control Tower)** provides this exact bird's-eye view for system administrators of TripNest. It aggregates platform-wide metrics across every registered traveler.

---

## 🏗️ 2. Technical Architecture & Chart Layout

```
┌────────────────────────────────────────────────────────┐
│         Spring Boot Backend (Port 8080)                │
│  GET /api/admin/analytics/dashboard                    │
└───────────────────────────┬────────────────────────────┘
                            │ JSON Payload (AdminDashboardDTO)
                            ▼
┌────────────────────────────────────────────────────────┐
│      code_FrontEnd/src/services/analyticsService.js    │
│  axios.get('/api/admin/analytics/dashboard')           │
└───────────────────────────┬────────────────────────────┘
                            │ React State
                            ▼
┌────────────────────────────────────────────────────────┐
│      code_FrontEnd/src/pages/AdminDashboard.jsx        │
├────────────────────────────────────────────────────────┤
│ 1. Platform Master KPI Cards:                          │
│    - Total Users, Total Trips, Bookings, Gross Spend   │
├────────────────────────────────────────────────────────┤
│ 2. Row of 2 Donut Charts (Side by Side):               │
│    - Trip Distribution by Status Donut Chart           │
│    - System-Wide Category Volume Donut Chart           │
├────────────────────────────────────────────────────────┤
│ 3. Big Prominent Destination Chart (Full Width Below): │
│    - 380px High Bar Chart for Top Booked Destinations  │
│    - Shows total bookings and traveler headcount       │
├────────────────────────────────────────────────────────┤
│ 4. Platform Power Travelers Leaderboard Table          │
└────────────────────────────────────────────────────────┘
```

---

## 🔐 3. Role-Based Access Control (RBAC) & Protected Routing

1. **Backend Verification:** `AdminAnalyticsController` strictly verifies the user holds the `ADMIN` role. Unprivileged requests are immediately rejected with HTTP 403 Forbidden.
2. **Client-Side Protected Route:** In `src/App.jsx`, `/admin` is guarded by `<ProtectedRoute adminOnly>`. Any traveler attempting to browse to `/admin` is redirected back to `/dashboard`.
3. **Navbar Dynamic Visibility:** `Navbar.jsx` checks `isAdmin` and only displays the **Admin Tower** menu item if the user is authenticated with administrative credentials.
4. **Manual Role Authentication:** Users enter their credentials manually into the standard login form (e.g., `admin@tripnest.com` / `admin123` for administrators, or personal traveler accounts).

---

## 📂 4. Files Implemented & Modified

| File Path | Description |
|---|---|
| `src/pages/AdminDashboard.jsx` | Full Admin Control Tower interface with big full-width destination chart below the 2 donut charts. |
| `src/components/ProtectedRoute.jsx` | Enhanced with `adminOnly` prop to protect admin routes. |
| `src/components/Navbar.jsx` | Dedicated navigation entry: "Admin Tower", rendered conditionally for admins. |
| `src/pages/Login.jsx` | Includes 1-click test login presets for Traveler and Admin roles. |
| `src/pages/Register.jsx` | Allows selecting account role (`Traveler` or `Admin`). |
| `src/App.jsx` | Route registered at `/admin` with `adminOnly` protection. |

---

## 🔍 5. Verification & Testing

1. Sign in with **Demo Admin** (`admin@tripnest.com` / `admin123`).
2. Verify:
   - "Admin Tower" link appears in Navbar with red `ADMIN` badge.
   - High-level platform KPIs render.
   - 2 Donut charts render side-by-side.
   - Big, full-width Top Booked Destinations bar chart renders prominently below the 2 donut charts.
   - Power Travelers leaderboard displays usernames and spend totals.
3. Sign out and sign in with **Demo Traveler** (`traveler@tripnest.com` / `traveler123`).
   - "Admin Tower" is not in the navbar.
   - Navigating to `/admin` directly redirects to `/dashboard`.
