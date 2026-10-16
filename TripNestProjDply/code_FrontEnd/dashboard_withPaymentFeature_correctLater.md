# Dashboard with Payment & Shared Expenses Settlement Feature (Archive)

> **Purpose**: This file contains the complete snapshot of Dashboard.jsx with the **Shared Expenses & Debt Settlement** (Who Owes Whom) feature, including cross-component localStorage settlement synchronization, greedy debt minimization integration, companion debt summaries, and interactive [�� Mark Settled] / [↩️ Mark Unpaid] payment toggle buttons.
> 
> Preserved for later correction / re-integration as requested by the user.

## Complete Source Code Snapshot

``jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { analyticsService } from "../services/analyticsService";
import { tripService } from "../services/tripService";
import { reportService } from "../services/reportService";
import { splitExpenseService } from "../services/splitExpenseService";
import { vaultService } from "../services/vaultService";
import { groupService } from "../services/groupService";
import { formatDisplayDate } from "../utils/dateUtils";
import "../utils/chartSetup"; // Register Chart.js controllers
import CategoryDonutChart from "../components/charts/CategoryDonutChart";
import PlannedVsActualBarChart from "../components/charts/PlannedVsActualBarChart";

function Dashboard() {
  const { user } = useAuth();

  // Core analytics & trips state
  const [dashboardData, setDashboardData] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // 1. All Trips section state (3 per page + year filter)
  const [allTripsStatusFilter, setAllTripsStatusFilter] = useState("ALL");
  const [allTripsYearFilter, setAllTripsYearFilter] = useState("ALL");
  const [allTripsPage, setAllTripsPage] = useState(1);

  // 2. Trip-wise budget & expense comparison state (3 per page + year filter)
  const [tripBudgetsData, setTripBudgetsData] = useState([]);
  const [barChartYearFilter, setBarChartYearFilter] = useState("ALL");
  const [barChartPage, setBarChartPage] = useState(1);

  // 3. Shared expenses / debts state (Money owed / to pay)
  const [debtsOwedByMe, setDebtsOwedByMe] = useState([]);
  const [debtsOwedToMe, setDebtsOwedToMe] = useState([]);
  const [debtsOwedByMePage, setDebtsOwedByMePage] = useState(1);
  const [debtsOwedToMePage, setDebtsOwedToMePage] = useState(1);

  // 4. Bills & Receipts state (3 per page)
  const [bills, setBills] = useState([]);
  const [billTripFilter, setBillTripFilter] = useState("ALL");
  const [billYearFilter, setBillYearFilter] = useState("ALL");
  const [billStatusFilter, setBillStatusFilter] = useState("ALL"); // "ALL" | "PAID" | "PENDING"
  const [billsPage, setBillsPage] = useState(1);

  // 5. Travel Documents Vault state (3 per page)
  const [documents, setDocuments] = useState([]);
  const [docYearFilter, setDocYearFilter] = useState("ALL");
  const [docCategoryFilter, setDocCategoryFilter] = useState("ALL");
  const [docStorageFilter, setDocStorageFilter] = useState("ALL"); // "ALL" | "CLOUD" | "LOCAL"
  const [docsPage, setDocsPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState(null);

  // 6. Travel Groups created state (3 per page)
  const [groups, setGroups] = useState([]);
  const [groupYearFilter, setGroupYearFilter] = useState("ALL");
  const [groupTripFilter, setGroupTripFilter] = useState("ALL");
  const [groupsPage, setGroupsPage] = useState(1);

  // Fetch all initial data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadAllDashboardData() {
      try {
        // A. Load traveler dashboard analytics
        try {
          const analytics = await analyticsService.getTravelerDashboard();
          if (isMounted) setDashboardData(analytics);
        } catch (err) {
          console.warn("Analytics fetch error:", err);
        }

        // B. Load user trips
        const userTrips = await tripService.getMyTrips();
        const tripList = userTrips || [];
        if (isMounted) setTrips(tripList);

        if (tripList.length > 0) {
          // C. Fetch trip-wise budgets and actual spend for the bar chart
          const budgetPromises = tripList.map((t) =>
            reportService
              .getTripReport(t.id)
              .then((r) => ({
                id: t.id,
                title: t.title,
                startDate: t.startDate,
                plannedBudget: Number(r.totalBudget || 0),
                actualSpent: Number(r.totalSpent || 0),
              }))
              .catch(() => ({
                id: t.id,
                title: t.title,
                startDate: t.startDate,
                plannedBudget: 0,
                actualSpent: 0,
              }))
          );
          const resolvedBudgets = await Promise.all(budgetPromises);
          if (isMounted) setTripBudgetsData(resolvedBudgets);

          // D. Fetch shared expenses & debts across all trips (Final Settlement Engine)
          try {
            const tripSettlementPromises = tripList.map(async (t) => {
              try {
                const [settleRes, splitsRes] = await Promise.allSettled([
                  splitExpenseService.getOptimizedSettlements(t.id),
                  splitExpenseService.getSplitsByTrip(t.id),
                ]);
                const settlements =
                  settleRes.status === "fulfilled" && Array.isArray(settleRes.value)
                    ? settleRes.value
                    : [];
                const splits =
                  splitsRes.status === "fulfilled" && Array.isArray(splitsRes.value)
                    ? splitsRes.value
                    : [];
                return {
                  tripId: t.id,
                  tripTitle: t.title,
                  startDate: t.startDate,
                  createdAt: t.createdAt,
                  settlements,
                  splits,
                };
              } catch {
                return {
                  tripId: t.id,
                  tripTitle: t.title,
                  startDate: t.startDate,
                  createdAt: t.createdAt,
                  settlements: [],
                  splits: [],
                };
              }
            });

            const allTripData = await Promise.all(tripSettlementPromises);

            const myId = user?.id != null ? Number(user.id) : null;
            const myEmail = user?.email?.toLowerCase().trim() || "";
            const rawName =
              user?.name || user?.fullName || (user?.email ? user.email.split("@")[0] : "");
            const myName = rawName.toLowerCase().trim();

            // Load all settled tracking maps from localStorage
            let globalSettledTransfers = {};
            try {
              globalSettledTransfers = JSON.parse(
                localStorage.getItem("tripnest_settled_transfers") || "{}"
              );
            } catch { /* ignore */ }

            let localSettledDebts = {};
            try {
              localSettledDebts = JSON.parse(
                localStorage.getItem("tripnest_settled_debts") || "{}"
              );
            } catch { /* ignore */ }

            const owedByMe = [];
            const owedToMe = [];

            allTripData.forEach((td) => {
              const tripId = td.tripId;
              const tripTitle = td.tripTitle;
              const tripDate = td.startDate || td.createdAt;

              let poolSettledList = [];
              try {
                const p = localStorage.getItem(`tripnest_pool_settled_${tripId}`);
                if (p) poolSettledList = JSON.parse(p);
              } catch { /* ignore */ }

              let subsetSettledList = [];
              try {
                const s = localStorage.getItem(`tripnest_subset_settled_${tripId}`);
                if (s) subsetSettledList = JSON.parse(s);
              } catch { /* ignore */ }

              function checkIsSettled(debtId, fromId, toId, fromName, toName) {
                const fName = (fromName || "").toLowerCase().trim();
                const tName = (toName || "").toLowerCase().trim();
                const keyPair = tripId && fromId && toId ? `${tripId}_${fromId}_${toId}` : null;
                const keyName = tripId && fName && tName ? `${tripId}_${fName}_${tName}` : null;

                if (debtId && (localSettledDebts[debtId] || globalSettledTransfers[debtId])) return true;
                if (keyPair && (localSettledDebts[keyPair] || globalSettledTransfers[keyPair])) return true;
                if (keyName && (localSettledDebts[keyName] || globalSettledTransfers[keyName])) return true;

                // Check pool settled transfer IDs
                for (const pid of poolSettledList) {
                  if (pid === debtId || pid === keyPair || pid === keyName) return true;
                  const parts = String(pid).split("-");
                  if (parts.length >= 4) {
                    const dId = Number(parts[2]);
                    const cId = Number(parts[3]);
                    if (fromId != null && toId != null && dId === Number(fromId) && cId === Number(toId)) {
                      return true;
                    }
                  }
                }

                // Check subset settled transfer IDs
                for (const sid of subsetSettledList) {
                  if (sid === debtId || sid === keyPair || sid === keyName) return true;
                  const parts = String(sid).split("-");
                  if (parts.length >= 4) {
                    const dId = Number(parts[2]);
                    const cId = Number(parts[3]);
                    if (fromId != null && toId != null && dId === Number(fromId) && cId === Number(toId)) {
                      return true;
                    }
                  }
                }

                return false;
              }

              // Use optimized final settlement transfers
              if (td.settlements && td.settlements.length > 0) {
                td.settlements.forEach((s) => {
                  const fromId = s.fromUserId != null ? Number(s.fromUserId) : null;
                  const toId = s.toUserId != null ? Number(s.toUserId) : null;
                  const fromName = s.fromUserName || "Companion";
                  const toName = s.toUserName || "Companion";
                  const fromEmail = (s.fromUserEmail || "").toLowerCase().trim();
                  const toEmail = (s.toUserEmail || "").toLowerCase().trim();
                  const amount = Number(s.amount || 0);

                  const isMeDebtor =
                    (myId != null && fromId === myId) ||
                    (myEmail && fromEmail === myEmail) ||
                    (myName && fromName.toLowerCase().trim() === myName);

                  const isMeCreditor =
                    (myId != null && toId === myId) ||
                    (myEmail && toEmail === myEmail) ||
                    (myName && toName.toLowerCase().trim() === myName);

                  const debtId = `settle-${tripId}-${fromId || fromName}-${toId || toName}-${Math.round(amount)}`;
                  const isSettled = checkIsSettled(debtId, fromId, toId, fromName, toName);

                  const item = {
                    id: debtId,
                    tripId,
                    tripTitle,
                    debtorId: fromId,
                    debtorName: fromName,
                    creditorId: toId,
                    creditorName: toName,
                    amount,
                    description: `Final Settlement Balance • ${tripTitle}`,
                    date: tripDate,
                    isSettled,
                  };

                  if (isMeCreditor && !isMeDebtor) {
                    owedToMe.push(item);
                  } else if (isMeDebtor && !isMeCreditor) {
                    owedByMe.push(item);
                  }
                });
              } else if (td.splits && td.splits.length > 0) {
                // Fallback: Net position calculation from raw splits
                const memberPaid = {};
                const memberShare = {};
                const memberNames = {};

                td.splits.forEach((s) => {
                  const debtorId = s.userId != null ? Number(s.userId) : null;
                  const creditorId = s.paidByUserId != null ? Number(s.paidByUserId) : null;
                  const debtorName = s.userName || "Companion";
                  const creditorName = s.paidByUserName || "Companion";
                  const share = Number(s.shareAmount || 0);

                  if (debtorId) {
                    memberShare[debtorId] = (memberShare[debtorId] || 0) + share;
                    memberNames[debtorId] = debtorName;
                  }
                  if (creditorId) {
                    memberPaid[creditorId] = (memberPaid[creditorId] || 0) + share;
                    memberNames[creditorId] = creditorName;
                  }
                });

                const allIds = Array.from(
                  new Set([...Object.keys(memberPaid), ...Object.keys(memberShare)])
                ).map(Number);
                const debtors = [];
                const creditors = [];

                allIds.forEach((uid) => {
                  const paid = memberPaid[uid] || 0;
                  const share = memberShare[uid] || 0;
                  const net = Math.round((paid - share) * 100) / 100;
                  if (net < -0.05) {
                    debtors.push({ userId: uid, name: memberNames[uid] || "Companion", amount: Math.abs(net) });
                  } else if (net > 0.05) {
                    creditors.push({ userId: uid, name: memberNames[uid] || "Companion", amount: net });
                  }
                });

                debtors.sort((a, b) => b.amount - a.amount);
                creditors.sort((a, b) => b.amount - a.amount);

                const dList = debtors.map((x) => ({ ...x }));
                const cList = creditors.map((x) => ({ ...x }));
                let d = 0;
                let c = 0;

                while (d < dList.length && c < cList.length) {
                  const debtor = dList[d];
                  const creditor = cList[c];
                  const transferAmount = Math.min(debtor.amount, creditor.amount);

                  if (transferAmount > 0.01) {
                    const isMeDebtor = myId != null && debtor.userId === myId;
                    const isMeCreditor = myId != null && creditor.userId === myId;
                    const debtId = `settle-${tripId}-${debtor.userId}-${creditor.userId}-${Math.round(transferAmount)}`;
                    const isSettled = checkIsSettled(debtId, debtor.userId, creditor.userId, debtor.name, creditor.name);

                    const item = {
                      id: debtId,
                      tripId,
                      tripTitle,
                      debtorId: debtor.userId,
                      debtorName: debtor.name,
                      creditorId: creditor.userId,
                      creditorName: creditor.name,
                      amount: transferAmount,
                      description: `Net Settlement Plan • ${tripTitle}`,
                      date: tripDate,
                      isSettled,
                    };

                    if (isMeCreditor && !isMeDebtor) {
                      owedToMe.push(item);
                    } else if (isMeDebtor && !isMeCreditor) {
                      owedByMe.push(item);
                    }
                  }

                  debtor.amount -= transferAmount;
                  creditor.amount -= transferAmount;
                  if (debtor.amount < 0.01) d++;
                  if (creditor.amount < 0.01) c++;
                }
              }
            });

            if (isMounted) {
              setDebtsOwedByMe(owedByMe);
              setDebtsOwedToMe(owedToMe);
            }
          } catch (e) {
            console.warn("Shared debts fetch error:", e);
          }

          // E. Fetch documents across all trips
          try {
            const docPromises = tripList.map((t) =>
              vaultService
                .getDocumentsByTrip(t.id)
                .then((docs) =>
                  (docs || []).map((d) => ({
                    ...d,
                    tripTitle: t.title,
                    tripId: t.id,
                  }))
                )
                .catch(() => [])
            );
            const allDocsNested = await Promise.all(docPromises);
            if (isMounted) setDocuments(allDocsNested.flat());
          } catch (e) {
            console.warn("Docs fetch error:", e);
          }

          // F. Fetch groups across all trips
          try {
            const groupPromises = tripList.map((t) =>
              groupService
                .getGroupByTripId(t.id)
                .then((grp) => (grp ? [{ ...grp, tripTitle: t.title }] : []))
                .catch(() => [])
            );
            const allGroupsNested = await Promise.all(groupPromises);
            if (isMounted) setGroups(allGroupsNested.flat());
          } catch (e) {
            console.warn("Groups fetch error:", e);
          }
        }

        // G. Fetch bills & receipts (all expenses)
        try {
          const expenseReport = await reportService.getFilteredExpenses({});
          if (isMounted && expenseReport?.expenses) {
            setBills(expenseReport.expenses);
          }
        } catch (e) {
          console.warn("Bills fetch error:", e);
        }

        if (isMounted) setLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load dashboard metrics");
          setLoading(false);
        }
      }
    }

    loadAllDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email]);

  async function handleExportCsv() {
    try {
      setDownloadingCsv(true);
      await reportService.downloadExpensesCsv();
    } catch (err) {
      alert("Failed to export CSV: " + (err.message || "Unknown error"));
    } finally {
      setDownloadingCsv(false);
    }
  }

  // Format user display name with proper capitalization
  const rawName = user?.name || user?.fullName || (user?.email ? user.email.split("@")[0] : "Traveler");
  const displayName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "Traveler";

  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const stats = dashboardData?.travelStats || {};
  const categories = dashboardData?.categoryExpenses || [];
  const favorites = dashboardData?.favoriteDestinations || [];

  // Extract available years dynamically from trips
  const availableTripYears = useMemo(() => {
    const years = new Set(["2026", "2025", "2024"]);
    trips.forEach((t) => {
      if (t.startDate) {
        years.add(new Date(t.startDate).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }, [trips]);

  // ---------------------------------------------------------------------------
  // 1. ALL TRIPS: FILTERING & PAGINATION (3 TRIPS PER PAGE + YEAR FILTER)
  // ---------------------------------------------------------------------------
  const TRIPS_PER_PAGE = 3;

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (allTripsStatusFilter !== "ALL" && String(t.status).toUpperCase() !== allTripsStatusFilter) {
        return false;
      }
      if (allTripsYearFilter !== "ALL") {
        const yr = t.startDate ? new Date(t.startDate).getFullYear().toString() : "";
        if (yr !== allTripsYearFilter) return false;
      }
      return true;
    });
  }, [trips, allTripsStatusFilter, allTripsYearFilter]);

  const allTripsTotalPages = Math.max(1, Math.ceil(filteredTrips.length / TRIPS_PER_PAGE));
  const displayedTrips = useMemo(() => {
    const start = (allTripsPage - 1) * TRIPS_PER_PAGE;
    return filteredTrips.slice(start, start + TRIPS_PER_PAGE);
  }, [filteredTrips, allTripsPage]);

  // Reset trip page when filter changes
  useEffect(() => {
    setAllTripsPage(1);
  }, [allTripsStatusFilter, allTripsYearFilter]);

  // ---------------------------------------------------------------------------
  // 2. TRIP-WISE BAR CHART: FILTERING & PAGINATION (3 TRIPS PER PAGE + YEAR FILTER)
  // ---------------------------------------------------------------------------
  const BAR_CHART_PER_PAGE = 3;

  const chartTripSourceData = useMemo(() => {
    if (tripBudgetsData.length > 0) return tripBudgetsData;
    return trips.map((t) => ({
      id: t.id,
      title: t.title,
      startDate: t.startDate,
      plannedBudget: 25000,
      actualSpent: 18500,
    }));
  }, [tripBudgetsData, trips]);

  const yearFilteredChartTrips = useMemo(() => {
    if (barChartYearFilter === "ALL") return chartTripSourceData;
    return chartTripSourceData.filter((t) => {
      const yr = t.startDate ? new Date(t.startDate).getFullYear().toString() : "";
      return yr === barChartYearFilter;
    });
  }, [chartTripSourceData, barChartYearFilter]);

  const barChartTotalPages = Math.max(1, Math.ceil(yearFilteredChartTrips.length / BAR_CHART_PER_PAGE));
  const displayedChartTrips = useMemo(() => {
    const start = (barChartPage - 1) * BAR_CHART_PER_PAGE;
    return yearFilteredChartTrips.slice(start, start + BAR_CHART_PER_PAGE);
  }, [yearFilteredChartTrips, barChartPage]);

  useEffect(() => {
    setBarChartPage(1);
  }, [barChartYearFilter]);

  // Bar chart aggregate metrics (across the filtered year dataset)
  const totalBarBudget = yearFilteredChartTrips.reduce((acc, t) => acc + Number(t.plannedBudget || 0), 0);
  const totalBarSpent = yearFilteredChartTrips.reduce((acc, t) => acc + Number(t.actualSpent || 0), 0);
  const netVariance = totalBarBudget - totalBarSpent;

  // Helper for clean currency formatting
  function formatDebtAmount(amt) {
    const n = Number(amt || 0);
    if (n % 1 === 0) {
      return "₹" + n.toLocaleString("en-IN");
    }
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------------------------------------------------------------------------
  // 3. SHARED DEBTS: SUMMARY & PAGINATION (3 PER PAGE + LIVE SETTLEMENT SYNC)
  // ---------------------------------------------------------------------------
  // Debts owed to user (collections):
  const pendingDebtsOwedToMe = useMemo(() => {
    return debtsOwedToMe.filter((d) => !d.isSettled);
  }, [debtsOwedToMe]);

  const companionPendingTotals = useMemo(() => {
    const map = {};
    pendingDebtsOwedToMe.forEach((d) => {
      const name = d.debtorName || "Companion";
      map[name] = (map[name] || 0) + Number(d.amount || 0);
    });
    return map;
  }, [pendingDebtsOwedToMe]);

  const totalPendingToCollect = useMemo(() => {
    return pendingDebtsOwedToMe.reduce((acc, d) => acc + Number(d.amount || 0), 0);
  }, [pendingDebtsOwedToMe]);

  const sortedDebtsOwedToMe = useMemo(() => {
    return [...debtsOwedToMe].sort((a, b) => {
      if (a.isSettled !== b.isSettled) {
        return a.isSettled ? 1 : -1;
      }
      return Number(b.amount || 0) - Number(a.amount || 0);
    });
  }, [debtsOwedToMe]);

  const DEBT_PAGE_SIZE = 3;
  const owedToMeTotalPages = Math.max(1, Math.ceil(sortedDebtsOwedToMe.length / DEBT_PAGE_SIZE));
  const displayedDebtsOwedToMe = useMemo(() => {
    const start = (debtsOwedToMePage - 1) * DEBT_PAGE_SIZE;
    return sortedDebtsOwedToMe.slice(start, start + DEBT_PAGE_SIZE);
  }, [sortedDebtsOwedToMe, debtsOwedToMePage]);

  // Debts owed by user:
  const pendingDebtsOwedByMe = useMemo(() => {
    return debtsOwedByMe.filter((d) => !d.isSettled);
  }, [debtsOwedByMe]);

  const companionOwedByMeTotals = useMemo(() => {
    const map = {};
    pendingDebtsOwedByMe.forEach((d) => {
      const name = d.creditorName || "Creditor";
      map[name] = (map[name] || 0) + Number(d.amount || 0);
    });
    return map;
  }, [pendingDebtsOwedByMe]);

  const totalPendingOwedByMe = useMemo(() => {
    return pendingDebtsOwedByMe.reduce((acc, d) => acc + Number(d.amount || 0), 0);
  }, [pendingDebtsOwedByMe]);

  const sortedDebtsOwedByMe = useMemo(() => {
    return [...debtsOwedByMe].sort((a, b) => {
      if (a.isSettled !== b.isSettled) {
        return a.isSettled ? 1 : -1;
      }
      return Number(b.amount || 0) - Number(a.amount || 0);
    });
  }, [debtsOwedByMe]);

  const owedByMeTotalPages = Math.max(1, Math.ceil(sortedDebtsOwedByMe.length / DEBT_PAGE_SIZE));
  const displayedDebtsOwedByMe = useMemo(() => {
    const start = (debtsOwedByMePage - 1) * DEBT_PAGE_SIZE;
    return sortedDebtsOwedByMe.slice(start, start + DEBT_PAGE_SIZE);
  }, [sortedDebtsOwedByMe, debtsOwedByMePage]);

  /**
   * Interactive settlement toggle handler right on Dashboard debt cards
   */
  function handleToggleDebtSettled(debtItem) {
    const isNowSettled = !debtItem.isSettled;
    const debtId = debtItem.id;
    const tripId = debtItem.tripId;
    const debtorId = debtItem.debtorId;
    const creditorId = debtItem.creditorId;
    const debtorName = (debtItem.debtorName || "").toLowerCase().trim();
    const creditorName = (debtItem.creditorName || "").toLowerCase().trim();

    // 1. Update React states
    setDebtsOwedToMe((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, isSettled: isNowSettled } : d))
    );
    setDebtsOwedByMe((prev) =>
      prev.map((d) => (d.id === debtId ? { ...d, isSettled: isNowSettled } : d))
    );

    // 2. Persist across localStorage keys for full synchronization
    try {
      const keyPair = tripId && debtorId && creditorId ? `${tripId}_${debtorId}_${creditorId}` : null;
      const keyName = tripId && debtorName && creditorName ? `${tripId}_${debtorName}_${creditorName}` : null;

      // a. tripnest_settled_debts
      const debtsKey = "tripnest_settled_debts";
      const debtsMap = JSON.parse(localStorage.getItem(debtsKey) || "{}");
      if (isNowSettled) {
        debtsMap[debtId] = true;
        if (keyPair) debtsMap[keyPair] = true;
        if (keyName) debtsMap[keyName] = true;
      } else {
        delete debtsMap[debtId];
        if (keyPair) delete debtsMap[keyPair];
        if (keyName) delete debtsMap[keyName];
      }
      localStorage.setItem(debtsKey, JSON.stringify(debtsMap));

      // b. tripnest_settled_transfers (shared with SharedExpensesTab)
      const transferKey = "tripnest_settled_transfers";
      const transferMap = JSON.parse(localStorage.getItem(transferKey) || "{}");
      if (isNowSettled) {
        transferMap[debtId] = true;
        if (keyPair) transferMap[keyPair] = true;
        if (keyName) transferMap[keyName] = true;
      } else {
        delete transferMap[debtId];
        if (keyPair) delete transferMap[keyPair];
        if (keyName) delete transferMap[keyName];
      }
      localStorage.setItem(transferKey, JSON.stringify(transferMap));

      // c. tripnest_pool_settled_${tripId}
      if (tripId) {
        const poolKey = `tripnest_pool_settled_${tripId}`;
        const poolList = JSON.parse(localStorage.getItem(poolKey) || "[]");
        const poolSet = new Set(poolList);
        const altId1 = `pool-transfer-${debtorId}-${creditorId}-${Math.round(debtItem.amount)}`;
        if (isNowSettled) {
          poolSet.add(debtId);
          if (debtorId && creditorId) poolSet.add(altId1);
        } else {
          poolSet.delete(debtId);
          if (debtorId && creditorId) poolSet.delete(altId1);
        }
        localStorage.setItem(poolKey, JSON.stringify(Array.from(poolSet)));
      }

      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Storage sync error on debt toggle:", e);
    }
  }

  // Cross-component and multi-tab settlement listener
  useEffect(() => {
    function handleSync() {
      try {
        const globalTransfers = JSON.parse(localStorage.getItem("tripnest_settled_transfers") || "{}");
        const debtsMap = JSON.parse(localStorage.getItem("tripnest_settled_debts") || "{}");

        const checkSettled = (d) => {
          const keyPair = d.tripId && d.debtorId && d.creditorId ? `${d.tripId}_${d.debtorId}_${d.creditorId}` : null;
          const keyName =
            d.tripId && d.debtorName && d.creditorName
              ? `${d.tripId}_${d.debtorName.toLowerCase().trim()}_${d.creditorName.toLowerCase().trim()}`
              : null;

          if (debtsMap[d.id] || (keyPair && debtsMap[keyPair]) || (keyName && debtsMap[keyName])) return true;
          if (globalTransfers[d.id] || (keyPair && globalTransfers[keyPair]) || (keyName && globalTransfers[keyName])) return true;

          const poolSaved = JSON.parse(localStorage.getItem(`tripnest_pool_settled_${d.tripId}`) || "[]");
          for (const pid of poolSaved) {
            if (pid === d.id || pid === keyPair || pid === keyName) return true;
            const parts = String(pid).split("-");
            if (parts.length >= 4 && Number(parts[2]) === d.debtorId && Number(parts[3]) === d.creditorId) return true;
          }

          const subsetSaved = JSON.parse(localStorage.getItem(`tripnest_subset_settled_${d.tripId}`) || "[]");
          for (const sid of subsetSaved) {
            if (sid === d.id || sid === keyPair || sid === keyName) return true;
            const parts = String(sid).split("-");
            if (parts.length >= 4 && Number(parts[2]) === d.debtorId && Number(parts[3]) === d.creditorId) return true;
          }

          return false;
        };

        setDebtsOwedToMe((prev) => prev.map((d) => ({ ...d, isSettled: checkSettled(d) })));
        setDebtsOwedByMe((prev) => prev.map((d) => ({ ...d, isSettled: checkSettled(d) })));
      } catch {
        // ignore
      }
    }

    window.addEventListener("storage", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 4. BILLS & RECEIPTS: FILTERING & PAGINATION (3 PER PAGE)
  // ---------------------------------------------------------------------------
  const BILLS_PER_PAGE = 3;

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (billTripFilter !== "ALL" && String(b.tripId) !== String(billTripFilter)) return false;
      if (billYearFilter !== "ALL") {
        const year = b.expenseDate ? new Date(b.expenseDate).getFullYear().toString() : "";
        if (year !== billYearFilter) return false;
      }
      if (billStatusFilter === "PAID") {
        const isPaid = b.paidByName != null || b.isSettled === true;
        if (!isPaid) return false;
      }
      if (billStatusFilter === "PENDING") {
        const isPending = b.paidByName == null || b.isSettled === false;
        if (!isPending) return false;
      }
      return true;
    });
  }, [bills, billTripFilter, billYearFilter, billStatusFilter]);

  const billsTotalPages = Math.max(1, Math.ceil(filteredBills.length / BILLS_PER_PAGE));
  const displayedBills = useMemo(() => {
    const start = (billsPage - 1) * BILLS_PER_PAGE;
    return filteredBills.slice(start, start + BILLS_PER_PAGE);
  }, [filteredBills, billsPage]);

  useEffect(() => {
    setBillsPage(1);
  }, [billTripFilter, billYearFilter, billStatusFilter]);

  // ---------------------------------------------------------------------------
  // 5. DOCUMENTS: FILTERING & PAGINATION (3 PER PAGE)
  // ---------------------------------------------------------------------------
  const DOCS_PER_PAGE = 3;

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      if (docYearFilter !== "ALL") {
        const year = d.uploadedAt ? new Date(d.uploadedAt).getFullYear().toString() : "";
        if (year !== docYearFilter) return false;
      }
      if (docCategoryFilter !== "ALL" && String(d.category).toUpperCase() !== docCategoryFilter) {
        return false;
      }
      if (docStorageFilter !== "ALL" && String(d.storageType).toUpperCase() !== docStorageFilter) {
        return false;
      }
      return true;
    });
  }, [documents, docYearFilter, docCategoryFilter, docStorageFilter]);

  const docsTotalPages = Math.max(1, Math.ceil(filteredDocs.length / DOCS_PER_PAGE));
  const displayedDocs = useMemo(() => {
    const start = (docsPage - 1) * DOCS_PER_PAGE;
    return filteredDocs.slice(start, start + DOCS_PER_PAGE);
  }, [filteredDocs, docsPage]);

  useEffect(() => {
    setDocsPage(1);
  }, [docYearFilter, docCategoryFilter, docStorageFilter]);

  // ---------------------------------------------------------------------------
  // 6. TRAVEL GROUPS: FILTERING & PAGINATION (3 PER PAGE)
  // ---------------------------------------------------------------------------
  const GROUPS_PER_PAGE = 3;

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (groupTripFilter !== "ALL" && String(g.tripId) !== String(groupTripFilter)) return false;
      if (groupYearFilter !== "ALL") {
        const year = g.createdAt ? new Date(g.createdAt).getFullYear().toString() : "";
        if (year !== groupYearFilter) return false;
      }
      return true;
    });
  }, [groups, groupTripFilter, groupYearFilter]);

  const groupsTotalPages = Math.max(1, Math.ceil(filteredGroups.length / GROUPS_PER_PAGE));
  const displayedGroups = useMemo(() => {
    const start = (groupsPage - 1) * GROUPS_PER_PAGE;
    return filteredGroups.slice(start, start + GROUPS_PER_PAGE);
  }, [filteredGroups, groupsPage]);

  useEffect(() => {
    setGroupsPage(1);
  }, [groupTripFilter, groupYearFilter]);

  // Helper for category names & icons
  const formatCategoryName = (cat) => {
    switch (cat) {
      case "ACCOMMODATION": return "Hotel (Accommodation)";
      case "ACTIVITIES": return "Entertainment (Activities)";
      case "FOOD": return "Food & Dining";
      case "TRANSPORTATION": return "Transportation";
      case "SHOPPING": return "Shopping";
      case "MISCELLANEOUS": return "Miscellaneous";
      default: return cat;
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case "ACCOMMODATION": return "🏨";
      case "ACTIVITIES": return "🎟️";
      case "FOOD": return "🍽️";
      case "TRANSPORTATION": return "🚗";
      case "SHOPPING": return "🛍️";
      default: return "📦";
    }
  };

  return (
    <div className="content-page dashboard-page" style={{ padding: "24px 20px" }}>
      {/* --------------------------------------------------------------------- */}
      {/* 1. WELCOME HEADER BANNER                                              */}
      {/* --------------------------------------------------------------------- */}
      <section className="dashboard-welcome" style={{ marginBottom: "28px" }}>
        <div className="dashboard-welcome-main">
          <div className="welcome-badge-row">
            <span className="welcome-tag">
              <span className="welcome-tag-dot" aria-hidden="true"></span>
              TRIPNEST TRAVEL INTELLIGENCE
            </span>
            <span className="welcome-date">📅 {todayFormatted}</span>
          </div>

          <div className="welcome-user-heading">
            <div className="welcome-avatar-circle" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="welcome-text-group">
              <h1 style={{ margin: "4px 0" }}>
                Welcome back, <span className="welcome-name-highlight">{displayName}</span>! 👋
              </h1>
              <p style={{ margin: 0, color: "#64748b" }}>
                Your personal travel, finances, and group coordination command center.
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-top-actions">
          <Link to="/trips" className="welcome-action-btn">
            <span>+ Plan New Trip</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </Link>
          <button
            onClick={handleExportCsv}
            disabled={downloadingCsv}
            className="welcome-action-sub"
            title="Download formatted CSV spreadsheet"
          >
            <span>{downloadingCsv ? "Exporting..." : "📥 Export Expenses (CSV)"}</span>
          </button>
          <Link to="/reports" className="welcome-action-sub">
            <span>📊 Annual Reports</span>
          </Link>
        </div>
      </section>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "28px" }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "24px", minHeight: "120px" }}>
                <div style={{ height: "14px", width: "40%", background: "#e2e8f0", borderRadius: "6px", marginBottom: "12px" }}></div>
                <div style={{ height: "30px", width: "65%", background: "#cbd5e1", borderRadius: "8px", marginBottom: "8px" }}></div>
                <div style={{ height: "12px", width: "50%", background: "#f1f5f9", borderRadius: "4px" }}></div>
              </div>
            ))}
          </div>
          <div style={{ height: "260px", background: "#f1f5f9", borderRadius: "16px", marginBottom: "28px", border: "1px solid #e2e8f0" }}></div>
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "16px", borderRadius: "12px", margin: "20px 0" }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ========================================================================= */}
          {/* SECTION 1: TRAVEL STATISTICS (TASK 1 REQUIREMENT)                        */}
          {/* ========================================================================= */}
          <section style={{ marginBottom: "32px" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>✈️</span>
                <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                  Travel Statistics
                </h2>
              </div>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                Personal travel milestones, vacation velocity, and platform activity.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
              }}
            >
              {/* Card 1: Total Trips */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", letterSpacing: "0.5px" }}>TOTAL VACATIONS</span>
                <strong style={{ display: "block", fontSize: "32px", color: "var(--navy)", margin: "4px 0" }}>
                  {stats.totalTrips ?? trips.length}
                </strong>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  All journeys planned in TripNest
                </span>
              </div>

              {/* Card 2: Completed Trips */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#10b981", letterSpacing: "0.5px" }}>COMPLETED VACATIONS</span>
                <strong style={{ display: "block", fontSize: "32px", color: "#10b981", margin: "4px 0" }}>
                  {stats.completedTrips ?? trips.filter((t) => t.status === "COMPLETED").length}
                </strong>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  ✅ Successfully accomplished
                </span>
              </div>

              {/* Card 3: Upcoming & Active */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#3b82f6", letterSpacing: "0.5px" }}>UPCOMING & ACTIVE</span>
                <strong style={{ display: "block", fontSize: "32px", color: "#3b82f6", margin: "4px 0" }}>
                  {(stats.plannedTrips || 0) + (stats.ongoingTrips || 0) || trips.filter((t) => t.status !== "COMPLETED").length}
                </strong>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  🗓️ {stats.plannedTrips ?? trips.filter((t) => t.status === "PLANNED").length} Planned &bull; 🚀 {stats.ongoingTrips ?? trips.filter((t) => t.status === "ONGOING").length} Ongoing
                </span>
              </div>

              {/* Card 4: Unique Destinations */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#8b5cf6", letterSpacing: "0.5px" }}>DESTINATIONS EXPLORED</span>
                <strong style={{ display: "block", fontSize: "32px", color: "#8b5cf6", margin: "4px 0" }}>
                  {stats.uniqueDestinationsCount ?? new Set(trips.map((t) => t.destination)).size}
                </strong>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  📍 Unique cities & countries visited
                </span>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 2: ALL TRIPS (SHOW 3, NEXT 3 >> AT BOTTOM, YEAR-WISE OPTION)       */}
          {/* ========================================================================= */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🗺️</span>
                  <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                    All Trips
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                  Browse your personal vacation journeys with status filters and year selection.
                </p>
              </div>

              {/* Filters row: Year Selector + Status Switching Box */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Year Dropdown */}
                <select
                  value={allTripsYearFilter}
                  onChange={(e) => setAllTripsYearFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "700",
                    background: "#ffffff",
                    color: "#0f766e",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">🗓️ All Years</option>
                  {availableTripYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                {/* Status Switching Box (Tabs) */}
                <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "4px", borderRadius: "10px", flexWrap: "wrap" }}>
                  {[
                    { label: "All Trips", value: "ALL" },
                    { label: "Planned", value: "PLANNED" },
                    { label: "Ongoing", value: "ONGOING" },
                    { label: "Completed", value: "COMPLETED" },
                  ].map((tab) => {
                    const active = allTripsStatusFilter === tab.value;
                    const count = trips.filter((t) => {
                      if (tab.value !== "ALL" && String(t.status).toUpperCase() !== tab.value) return false;
                      if (allTripsYearFilter !== "ALL") {
                        const yr = t.startDate ? new Date(t.startDate).getFullYear().toString() : "";
                        if (yr !== allTripsYearFilter) return false;
                      }
                      return true;
                    }).length;

                    return (
                      <button
                        key={tab.value}
                        onClick={() => setAllTripsStatusFilter(tab.value)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "none",
                          background: active ? "#0f766e" : "transparent",
                          color: active ? "#ffffff" : "#475569",
                          fontWeight: active ? "700" : "600",
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tab.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {displayedTrips.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "18px",
                  marginBottom: "20px",
                }}
              >
                {displayedTrips.map((trip) => {
                  const isCompleted = String(trip.status).toUpperCase() === "COMPLETED";
                  const isOngoing = String(trip.status).toUpperCase() === "ONGOING";
                  const statusBg = isCompleted ? "#dcfce7" : isOngoing ? "#fef3c7" : "#dbeafe";
                  const statusColor = isCompleted ? "#15803d" : isOngoing ? "#b45309" : "#1d4ed8";

                  return (
                    <div
                      key={trip.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "18px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span
                            style={{
                              background: statusBg,
                              color: statusColor,
                              padding: "4px 10px",
                              borderRadius: "16px",
                              fontSize: "11px",
                              fontWeight: "800",
                            }}
                          >
                            {trip.status || "PLANNED"}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                            👥 {trip.numberOfTravelers || 1} {trip.numberOfTravelers === 1 ? "Traveler" : "Travelers"}
                          </span>
                        </div>

                        <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "var(--navy)" }}>
                          {trip.title}
                        </h3>
                        <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "13px" }}>
                          📍 <strong>{trip.destination}</strong>
                        </p>
                        <p style={{ margin: "0 0 14px", color: "#475569", fontSize: "12px" }}>
                          🗓️ {formatDisplayDate(trip.startDate)} → {formatDisplayDate(trip.endDate)}
                        </p>
                      </div>

                      <div style={{ paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                        <Link
                          to={`/trips/${trip.id}`}
                          style={{
                            background: "#0f766e",
                            color: "#ffffff",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            textDecoration: "none",
                            fontWeight: "700",
                            fontSize: "12px",
                          }}
                        >
                          View Itinerary →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "32px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🏖️</span>
                <p style={{ margin: 0, color: "#64748b", fontWeight: "600" }}>
                  No {allTripsStatusFilter !== "ALL" ? allTripsStatusFilter.toLowerCase() : ""}{" "}
                  trips found {allTripsYearFilter !== "ALL" ? `for ${allTripsYearFilter}` : ""}.
                </p>
              </div>
            )}

            {/* Pagination Controls (Show 3, then Next 3 >> at bottom) */}
            {filteredTrips.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "12px",
                  borderTop: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => setAllTripsPage((p) => Math.max(1, p - 1))}
                  disabled={allTripsPage <= 1}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: allTripsPage <= 1 ? "#f1f5f9" : "#ffffff",
                    color: allTripsPage <= 1 ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: allTripsPage <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  &lt;&lt; Prev (3)
                </button>

                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                  Page {allTripsPage} of {allTripsTotalPages} &bull; Showing {displayedTrips.length} of {filteredTrips.length} trips
                </span>

                <button
                  onClick={() => setAllTripsPage((p) => Math.min(allTripsTotalPages, p + 1))}
                  disabled={allTripsPage >= allTripsTotalPages}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: allTripsPage >= allTripsTotalPages ? "#f1f5f9" : "#ffffff",
                    color: allTripsPage >= allTripsTotalPages ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: allTripsPage >= allTripsTotalPages ? "not-allowed" : "pointer",
                  }}
                >
                  (3) Next &gt;&gt;
                </button>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 3: TRIP-WISE BUDGET VS. ACTUAL OUTFLOW (SHOW 3, NEXT 3 >>, YEAR-WISE) */}
          {/* ========================================================================= */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "26px",
              marginBottom: "32px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>📊</span>
                  <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                    Trip-Wise Budget vs. Actual Outflow Comparison
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                  Side-by-side financial audit showing planned budget envelopes against actual money spent (3 trips per page).
                </p>
              </div>

              {/* Controls: Year Selector & Summary KPIs */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                {/* Year Filter */}
                <select
                  value={barChartYearFilter}
                  onChange={(e) => setBarChartYearFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "700",
                    background: "#ffffff",
                    color: "#0f766e",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">🗓️ All Years</option>
                  {availableTripYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <span style={{ background: "#f0fdfa", color: "#0f766e", padding: "6px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", border: "1px solid #ccfbf1" }}>
                  Planned: ₹{totalBarBudget.toLocaleString("en-IN")}
                </span>
                <span style={{ background: "#fffbeb", color: "#d97706", padding: "6px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: "700", border: "1px solid #fef3c7" }}>
                  Spent: ₹{totalBarSpent.toLocaleString("en-IN")}
                </span>
                <span
                  style={{
                    background: netVariance >= 0 ? "#ecfdf5" : "#fef2f2",
                    color: netVariance >= 0 ? "#15803d" : "#b91c1c",
                    padding: "6px 12px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "700",
                    border: `1px solid ${netVariance >= 0 ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  {netVariance >= 0 ? `Surplus: +₹${netVariance.toLocaleString("en-IN")}` : `Deficit: -₹${Math.abs(netVariance).toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>

            {/* Big Prominent Bar Chart Rendering Exactly 3 Trips Per View */}
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
              <PlannedVsActualBarChart
                tripData={displayedChartTrips}
                height="360px"
                currencySymbol="₹"
                plannedLabel="Allocated Budget"
                actualLabel="Actual Spent"
              />
            </div>

            {/* Pagination Controls for Bar Chart (Show 3, then >>) */}
            {yearFilteredChartTrips.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "14px",
                  marginTop: "14px",
                  borderTop: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => setBarChartPage((p) => Math.max(1, p - 1))}
                  disabled={barChartPage <= 1}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: barChartPage <= 1 ? "#f1f5f9" : "#ffffff",
                    color: barChartPage <= 1 ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: barChartPage <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  &lt;&lt; Prev (3)
                </button>

                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                  Chart Page {barChartPage} of {barChartTotalPages} &bull; Showing {displayedChartTrips.length} of {yearFilteredChartTrips.length} trips {barChartYearFilter !== "ALL" ? `(${barChartYearFilter})` : ""}
                </span>

                <button
                  onClick={() => setBarChartPage((p) => Math.min(barChartTotalPages, p + 1))}
                  disabled={barChartPage >= barChartTotalPages}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: barChartPage >= barChartTotalPages ? "#f1f5f9" : "#ffffff",
                    color: barChartPage >= barChartTotalPages ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: barChartPage >= barChartTotalPages ? "not-allowed" : "pointer",
                  }}
                >
                  (3) Next &gt;&gt;
                </button>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 4: EXPENSE SUMMARY & CATEGORY DONUT CHART (WITH PERCENTAGE FIGURE)*/}
          {/* ========================================================================= */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🍩</span>
                  <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                    Expense Category Share
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                  Proportional percentage values rendered directly on the pie slices and itemized ledger.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "24px",
                alignItems: "center",
              }}
            >
              {/* Itemized Category Ledger */}
              <div>
                {categories.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {categories.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "18px" }}>{getCategoryIcon(c.category)}</span>
                          <div>
                            <strong style={{ display: "block", color: "#0f172a", fontSize: "14px" }}>
                              {formatCategoryName(c.category)}
                            </strong>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              {c.percentageOfTotal != null ? `${Number(c.percentageOfTotal).toFixed(1)}% of total` : ""}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <strong style={{ display: "block", color: "#0f766e", fontSize: "15px" }}>
                            ₹{Number(c.totalAmount || 0).toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#64748b" }}>No expense transactions recorded yet.</p>
                )}
              </div>

              {/* Category Donut Chart with Direct Figure Percentages */}
              <div>
                <CategoryDonutChart items={categories} height="280px" currencySymbol="₹" />
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 5: SHARED EXPENSES & DEBT SETTLEMENT (WHO OWES WHOM)              */}
          {/* ========================================================================= */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "26px",
              marginBottom: "32px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🤝</span>
                <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                  Shared Expenses & Debt Settlement
                </h2>
              </div>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                Companion balance passbook: Track who owes money to whom with exact pending amounts by companion.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "24px",
              }}
            >
              {/* Column A: Money You Owe to Others */}
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "14px",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#991b1b", fontWeight: "800" }}>
                    🔴 Money You Owe to Others
                  </h3>
                  <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }}>
                    {pendingDebtsOwedByMe.length} pending
                  </span>
                </div>

                {debtsOwedByMe.length > 0 ? (
                  <>
                    {/* Summary box of money owed by user */}
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #fca5a5",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        marginBottom: "14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "#991b1b", textTransform: "uppercase" }}>
                          Pending Debts Summary:
                        </span>
                        <strong style={{ fontSize: "16px", color: "#dc2626" }}>
                          {formatDebtAmount(totalPendingOwedByMe)}
                        </strong>
                      </div>

                      {Object.keys(companionOwedByMeTotals).length > 0 ? (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {Object.entries(companionOwedByMeTotals).map(([name, amt]) => (
                            <span
                              key={name}
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#991b1b",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "700",
                              }}
                            >
                              👤 Pay to {name}: {formatDebtAmount(amt)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#15803d", fontWeight: "700" }}>
                          🎉 All debts to others settled!
                        </span>
                      )}
                    </div>

                    {/* 3 details per page with (3) Next >> pagination */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {displayedDebtsOwedByMe.map((d, idx) => (
                        <div
                          key={d.id || idx}
                          style={{
                            background: d.isSettled ? "#f8fafc" : "#ffffff",
                            border: d.isSettled ? "1px solid #cbd5e1" : "1px solid #fca5a5",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            opacity: d.isSettled ? 0.85 : 1,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ display: "block", color: d.isSettled ? "#475569" : "#1e293b", fontSize: "14px" }}>
                                Pay to: {d.creditorName}
                              </strong>
                              {d.isSettled && (
                                <span
                                  style={{
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    padding: "2px 6px",
                                    borderRadius: "6px",
                                    border: "1px solid #86efac",
                                  }}
                                >
                                  PAID
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              Trip: {d.tripTitle} &bull; {d.date ? formatDisplayDate(d.date) : "Recent"}
                            </span>
                            <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>
                              {d.description}
                            </span>
                          </div>
                          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                            <strong style={{ color: d.isSettled ? "#64748b" : "#dc2626", fontSize: "16px" }}>
                              {formatDebtAmount(d.amount)}
                            </strong>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "11px", color: d.isSettled ? "#15803d" : "#ef4444", fontWeight: "700" }}>
                                {d.isSettled ? "Settled" : "Due"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleDebtSettled(d)}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: d.isSettled ? "1px solid #cbd5e1" : "none",
                                  background: d.isSettled ? "#ffffff" : "#dc2626",
                                  color: d.isSettled ? "#475569" : "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                {d.isSettled ? "↩️ Mark Unpaid" : "💳 Mark Settled"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination if more than 3 details */}
                    {sortedDebtsOwedByMe.length > DEBT_PAGE_SIZE && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "12px",
                          paddingTop: "10px",
                          borderTop: "1px solid #fecaca",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => setDebtsOwedByMePage((p) => Math.max(1, p - 1))}
                          disabled={debtsOwedByMePage <= 1}
                          style={{
                            padding: "4px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: debtsOwedByMePage <= 1 ? "#f1f5f9" : "#ffffff",
                            color: debtsOwedByMePage <= 1 ? "#94a3b8" : "#991b1b",
                            fontWeight: "700",
                            fontSize: "12px",
                            cursor: debtsOwedByMePage <= 1 ? "not-allowed" : "pointer",
                          }}
                        >
                          &lt;&lt; Prev (3)
                        </button>

                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                          Page {debtsOwedByMePage} of {owedByMeTotalPages} &bull; Showing {displayedDebtsOwedByMe.length} of {sortedDebtsOwedByMe.length}
                        </span>

                        <button
                          onClick={() => setDebtsOwedByMePage((p) => Math.min(owedByMeTotalPages, p + 1))}
                          disabled={debtsOwedByMePage >= owedByMeTotalPages}
                          style={{
                            padding: "4px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: debtsOwedByMePage >= owedByMeTotalPages ? "#f1f5f9" : "#ffffff",
                            color: debtsOwedByMePage >= owedByMeTotalPages ? "#94a3b8" : "#991b1b",
                            fontWeight: "700",
                            fontSize: "12px",
                            cursor: debtsOwedByMePage >= owedByMeTotalPages ? "not-allowed" : "pointer",
                          }}
                        >
                          (3) Next &gt;&gt;
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: "40px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontStyle: "italic" }}>
                    — No pending debts to pay (₹0.00) —
                  </div>
                )}
              </div>

              {/* Column B: Money Owed to You by Others (with companion totals breakdown) */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "14px",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#166534", fontWeight: "800" }}>
                    🟢 Money to be Paid by Other Users
                  </h3>
                  <span style={{ background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "700" }}>
                    {pendingDebtsOwedToMe.length} pending
                  </span>
                </div>

                {/* Companion Breakdown Summary Card (Pi, Tom, Kim, Bell) */}
                {Object.keys(companionPendingTotals).length > 0 ? (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #86efac",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#166534", textTransform: "uppercase" }}>
                        Pending Collections Summary:
                      </span>
                      <strong style={{ fontSize: "16px", color: "#15803d" }}>
                        {formatDebtAmount(totalPendingToCollect)}
                      </strong>
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {Object.entries(companionPendingTotals).map(([name, amt]) => (
                        <span
                          key={name}
                          style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            color: "#166534",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          👤 {name}: {formatDebtAmount(amt)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : debtsOwedToMe.length > 0 ? (
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #86efac",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#166534", fontWeight: "700" }}>
                      🎉 All collections settled! (₹0.00 pending)
                    </span>
                    <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>
                      100% Collected
                    </span>
                  </div>
                ) : null}

                {debtsOwedToMe.length > 0 ? (
                  <>
                    {/* 3 details per page with (3) Next >> pagination */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {displayedDebtsOwedToMe.map((d, idx) => (
                        <div
                          key={d.id || idx}
                          style={{
                            background: d.isSettled ? "#f8fafc" : "#ffffff",
                            border: d.isSettled ? "1px solid #cbd5e1" : "1px solid #86efac",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            opacity: d.isSettled ? 0.85 : 1,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ display: "block", color: d.isSettled ? "#475569" : "#1e293b", fontSize: "14px" }}>
                                Collect from: {d.debtorName}
                              </strong>
                              {d.isSettled && (
                                <span
                                  style={{
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    fontSize: "10px",
                                    fontWeight: "800",
                                    padding: "2px 6px",
                                    borderRadius: "6px",
                                    border: "1px solid #86efac",
                                  }}
                                >
                                  PAID
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              Trip: {d.tripTitle} &bull; {d.date ? formatDisplayDate(d.date) : "Recent"}
                            </span>
                            <span style={{ display: "block", fontSize: "11px", color: "#94a3b8" }}>
                              {d.description}
                            </span>
                          </div>
                          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                            <strong style={{ color: d.isSettled ? "#64748b" : "#16a34a", fontSize: "16px" }}>
                              {formatDebtAmount(d.amount)}
                            </strong>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "11px", color: d.isSettled ? "#15803d" : "#16a34a", fontWeight: "700" }}>
                                {d.isSettled ? "Settled" : "Due"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleDebtSettled(d)}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: d.isSettled ? "1px solid #cbd5e1" : "none",
                                  background: d.isSettled ? "#ffffff" : "#16a34a",
                                  color: d.isSettled ? "#475569" : "#ffffff",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                {d.isSettled ? "↩️ Mark Unpaid" : "💳 Mark Settled"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination if more than 3 details */}
                    {sortedDebtsOwedToMe.length > DEBT_PAGE_SIZE && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "12px",
                          paddingTop: "10px",
                          borderTop: "1px solid #bbf7d0",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() => setDebtsOwedToMePage((p) => Math.max(1, p - 1))}
                          disabled={debtsOwedToMePage <= 1}
                          style={{
                            padding: "4px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: debtsOwedToMePage <= 1 ? "#f1f5f9" : "#ffffff",
                            color: debtsOwedToMePage <= 1 ? "#94a3b8" : "#166534",
                            fontWeight: "700",
                            fontSize: "12px",
                            cursor: debtsOwedToMePage <= 1 ? "not-allowed" : "pointer",
                          }}
                        >
                          &lt;&lt; Prev (3)
                        </button>

                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                          Page {debtsOwedToMePage} of {owedToMeTotalPages} &bull; Showing {displayedDebtsOwedToMe.length} of {sortedDebtsOwedToMe.length}
                        </span>

                        <button
                          onClick={() => setDebtsOwedToMePage((p) => Math.min(owedToMeTotalPages, p + 1))}
                          disabled={debtsOwedToMePage >= owedToMeTotalPages}
                          style={{
                            padding: "4px 12px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: debtsOwedToMePage >= owedToMeTotalPages ? "#f1f5f9" : "#ffffff",
                            color: debtsOwedToMePage >= owedToMeTotalPages ? "#94a3b8" : "#166534",
                            fontWeight: "700",
                            fontSize: "12px",
                            cursor: debtsOwedToMePage >= owedToMeTotalPages ? "not-allowed" : "pointer",
                          }}
                        >
                          (3) Next &gt;&gt;
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 16px", background: "#ffffff", borderRadius: "10px", border: "1px dashed #bbf7d0" }}>
                    <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>✨</span>
                    <strong style={{ color: "#166534", fontSize: "14px", display: "block" }}>
                      All Settled Up!
                    </strong>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      No companions have pending dues owed to you.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 6: BILLS / RECEIPTS STATUS (TRIP-WISE, YEAR-WISE, PAID / PENDING) */}
          {/* ========================================================================= */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>🧾</span>
                  <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                    Bills & Receipts Status
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                  Audit expense receipts by trip, calendar year, and payment settlement status.
                </p>
              </div>

              {/* Filter controls row */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {/* Trip selector */}
                <select
                  value={billTripFilter}
                  onChange={(e) => setBillTripFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "#ffffff",
                    color: "#334155",
                  }}
                >
                  <option value="ALL">All Trips</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                {/* Year selector */}
                <select
                  value={billYearFilter}
                  onChange={(e) => setBillYearFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "#ffffff",
                    color: "#334155",
                  }}
                >
                  <option value="ALL">All Years</option>
                  {availableTripYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                {/* Paid / Pending Switcher */}
                <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
                  {[
                    { label: "All", value: "ALL" },
                    { label: "Paid", value: "PAID" },
                    { label: "Pending", value: "PENDING" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setBillStatusFilter(s.value)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: billStatusFilter === s.value ? "#0f766e" : "transparent",
                        color: billStatusFilter === s.value ? "#ffffff" : "#475569",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {displayedBills.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {displayedBills.map((b) => {
                  const isPaid = b.paidByName != null || b.isSettled === true;
                  return (
                    <div
                      key={b.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "16px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "18px" }}>{getCategoryIcon(b.category)}</span>
                          <span
                            style={{
                              background: isPaid ? "#dcfce7" : "#fee2e2",
                              color: isPaid ? "#15803d" : "#b91c1c",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "800",
                            }}
                          >
                            {isPaid ? "PAID" : "PENDING"}
                          </span>
                        </div>

                        <strong style={{ display: "block", color: "var(--navy)", fontSize: "15px", marginBottom: "4px" }}>
                          {b.description || "Expense Transaction"}
                        </strong>
                        <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: "12px" }}>
                          {formatCategoryName(b.category)} &bull; {b.expenseDate ? formatDisplayDate(b.expenseDate) : "Recent"}
                        </p>
                        <p style={{ margin: 0, color: "#475569", fontSize: "12px" }}>
                          Trip: <strong>{b.tripTitle || `Trip #${b.tripId}`}</strong>
                        </p>
                      </div>

                      <div style={{ paddingTop: "10px", marginTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          Paid by: {b.paidByName || "Self"}
                        </span>
                        <strong style={{ fontSize: "16px", color: "#0f766e" }}>
                          ₹{Number(b.amount || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "28px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>🧾</span>
                <p style={{ margin: 0, color: "#64748b", fontWeight: "600" }}>
                  No bills or receipts found matching the selected filters.
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredBills.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "12px",
                  borderTop: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                  disabled={billsPage <= 1}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: billsPage <= 1 ? "#f1f5f9" : "#ffffff",
                    color: billsPage <= 1 ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: billsPage <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  &lt;&lt; Prev (3)
                </button>

                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                  Page {billsPage} of {billsTotalPages} &bull; Showing {displayedBills.length} of {filteredBills.length} bills
                </span>

                <button
                  onClick={() => setBillsPage((p) => Math.min(billsTotalPages, p + 1))}
                  disabled={billsPage >= billsTotalPages}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: billsPage >= billsTotalPages ? "#f1f5f9" : "#ffffff",
                    color: billsPage >= billsTotalPages ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: billsPage >= billsTotalPages ? "not-allowed" : "pointer",
                  }}
                >
                  (3) Next &gt;&gt;
                </button>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 7: TRAVEL DOCUMENTS VAULT (YEAR, CATEGORY, CLOUD / LOCAL DEVICE)  */}
          {/* ========================================================================= */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>📁</span>
                  <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                    Travel Documents Vault
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                  Quick access to tickets, hotel vouchers, ID cards, and photos across Cloud and Local Device storage.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {/* Year */}
                <select
                  value={docYearFilter}
                  onChange={(e) => setDocYearFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "#ffffff",
                    color: "#334155",
                  }}
                >
                  <option value="ALL">All Years</option>
                  {availableTripYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                {/* Category */}
                <select
                  value={docCategoryFilter}
                  onChange={(e) => setDocCategoryFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "#ffffff",
                    color: "#334155",
                  }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="TICKET">Tickets 🎟️</option>
                  <option value="BOOKING">Hotel Bookings 🏨</option>
                  <option value="RECEIPT">Receipts 🧾</option>
                  <option value="PHOTO">Photos 📷</option>
                  <option value="OTHER">Other Documents 📄</option>
                </select>

                {/* Cloud vs Device */}
                <select
                  value={docStorageFilter}
                  onChange={(e) => setDocStorageFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "#ffffff",
                    color: "#334155",
                  }}
                >
                  <option value="ALL">All Storage Locations</option>
                  <option value="CLOUD">Cloud Storage ☁️</option>
                  <option value="LOCAL">Local Device 💻</option>
                </select>
              </div>
            </div>

            {displayedDocs.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {displayedDocs.map((doc) => {
                  const isCloud = String(doc.storageType).toUpperCase() === "CLOUD";
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setPreviewDoc(doc)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "16px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#0f766e";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(15, 118, 110, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.02)";
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span
                            style={{
                              background: "#f1f5f9",
                              color: "#334155",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            {doc.category || "DOCUMENT"}
                          </span>
                          <span
                            style={{
                              background: isCloud ? "#e0f2fe" : "#fef3c7",
                              color: isCloud ? "#0369a1" : "#92400e",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "700",
                            }}
                          >
                            {isCloud ? "☁️ Cloud" : "💻 Device"}
                          </span>
                        </div>

                        <strong
                          style={{
                            display: "block",
                            color: "var(--navy)",
                            fontSize: "14px",
                            marginBottom: "4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={doc.fileName}
                        >
                          {doc.fileName || "Vault Document"}
                        </strong>
                        <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: "12px" }}>
                          Trip: <strong>{doc.tripTitle}</strong>
                        </p>
                        <p style={{ margin: 0, color: "#94a3b8", fontSize: "11px" }}>
                          Uploaded: {doc.uploadedAt ? formatDisplayDate(doc.uploadedAt) : "Recently"} &bull; {doc.fileSizeFormatted || "File"}
                        </p>
                      </div>

                      <div style={{ paddingTop: "10px", marginTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {doc.fileType?.includes("pdf") ? "📄 PDF" : doc.fileType?.includes("image") ? "🖼️ Image" : "📁 File"}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDoc(doc);
                          }}
                          style={{
                            background: "#0f766e",
                            color: "#ffffff",
                            padding: "5px 12px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          👁️ View File
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "28px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>📁</span>
                <p style={{ margin: 0, color: "#64748b", fontWeight: "600" }}>
                  No travel documents found matching the selected filters.
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredDocs.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "12px",
                  borderTop: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => setDocsPage((p) => Math.max(1, p - 1))}
                  disabled={docsPage <= 1}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: docsPage <= 1 ? "#f1f5f9" : "#ffffff",
                    color: docsPage <= 1 ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: docsPage <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  &lt;&lt; Prev (3)
                </button>

                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                  Page {docsPage} of {docsTotalPages} &bull; Showing {displayedDocs.length} of {filteredDocs.length} documents
                </span>

                <button
                  onClick={() => setDocsPage((p) => Math.min(docsTotalPages, p + 1))}
                  disabled={docsPage >= docsTotalPages}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: docsPage >= docsTotalPages ? "#f1f5f9" : "#ffffff",
                    color: docsPage >= docsTotalPages ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: docsPage >= docsTotalPages ? "not-allowed" : "pointer",
                  }}
                >
                  (3) Next &gt;&gt;
                </button>
              </div>
            )}

            {/* Document Preview & Viewer Modal */}
            {previewDoc && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
                  padding: "20px",
                }}
                onClick={() => setPreviewDoc(null)}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    maxWidth: "800px",
                    width: "100%",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    overflow: "hidden",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      padding: "16px 22px",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#f8fafc",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: "17px", color: "var(--navy)", fontWeight: "800" }}>
                        📄 {previewDoc.fileName || "Travel Document"}
                      </h3>
                      <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                        Trip: <strong>{previewDoc.tripTitle}</strong> &bull; Category: <strong>{previewDoc.category || "DOCUMENT"}</strong> &bull; Storage: <strong>{String(previewDoc.storageType).toUpperCase() === "CLOUD" ? "☁️ Cloud" : "💻 Local Device"}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setPreviewDoc(null)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "22px",
                        cursor: "pointer",
                        color: "#64748b",
                        padding: "4px 8px",
                      }}
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Body / Preview */}
                  <div
                    style={{
                      padding: "20px",
                      overflowY: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#f1f5f9",
                      minHeight: "340px",
                    }}
                  >
                    {previewDoc.fileType?.startsWith("image/") || previewDoc.category === "PHOTO" ? (
                      <img
                        src={vaultService.getFileUrl(previewDoc.storageUrl)}
                        alt={previewDoc.fileName}
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) e.target.nextSibling.style.display = "block";
                        }}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "65vh",
                          objectFit: "contain",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      />
                    ) : previewDoc.fileType === "application/pdf" || (previewDoc.fileName && previewDoc.fileName.toLowerCase().endsWith(".pdf")) ? (
                      <iframe
                        src={vaultService.getFileUrl(previewDoc.storageUrl)}
                        title={previewDoc.fileName}
                        style={{
                          width: "100%",
                          height: "65vh",
                          border: "none",
                          borderRadius: "8px",
                        }}
                      />
                    ) : null}

                    {/* Metadata Card for documents without native browser preview or on error */}
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px 20px",
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        width: "100%",
                        maxWidth: "480px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        display: (previewDoc.fileType?.startsWith("image/") || previewDoc.fileType === "application/pdf" || previewDoc.fileName?.toLowerCase().endsWith(".pdf")) ? "none" : "block",
                      }}
                    >
                      <span style={{ fontSize: "52px", display: "block", marginBottom: "12px" }}>
                        {previewDoc.category === "TICKET" ? "🎟️" : previewDoc.category === "BOOKING" ? "🏨" : previewDoc.category === "RECEIPT" ? "🧾" : "📄"}
                      </span>
                      <h4 style={{ margin: "0 0 6px", fontSize: "16px", color: "var(--navy)" }}>
                        {previewDoc.fileName}
                      </h4>
                      <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "13px" }}>
                        File Format: <strong>{previewDoc.fileType || "Document"}</strong> &bull; Size: <strong>{previewDoc.fileSizeFormatted || "Standard"}</strong>
                      </p>
                      <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "16px", textAlign: "left", fontSize: "12px", color: "#475569" }}>
                        <div style={{ marginBottom: "4px" }}>• <strong>Trip Association:</strong> {previewDoc.tripTitle}</div>
                        <div style={{ marginBottom: "4px" }}>• <strong>Upload Date:</strong> {previewDoc.uploadedAt ? formatDisplayDate(previewDoc.uploadedAt) : "Recently"}</div>
                        <div>• <strong>Storage Location:</strong> {String(previewDoc.storageType).toUpperCase() === "CLOUD" ? "☁️ Cloudinary Storage" : "💻 Local Server Disk"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div
                    style={{
                      padding: "14px 22px",
                      borderTop: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "12px",
                      background: "#ffffff",
                    }}
                  >
                    <button
                      onClick={() => setPreviewDoc(null)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#475569",
                        fontWeight: "600",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                    {previewDoc.storageUrl ? (
                      <a
                        href={vaultService.getFileUrl(previewDoc.storageUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={previewDoc.fileName}
                        style={{
                          background: "#0f766e",
                          color: "#ffffff",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          fontSize: "13px",
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        ⬇️ Open / Download File
                      </a>
                    ) : (
                      <button
                        onClick={() => alert(`Document metadata: ${previewDoc.fileName} (${previewDoc.tripTitle})`)}
                        style={{
                          background: "#0f766e",
                          color: "#ffffff",
                          padding: "8px 18px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          fontSize: "13px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        ℹ️ View Info
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 8: GROUPS CREATED (YEAR-WISE & TRIP-WISE OPTIONS, TOP 4 WITH >>)   */}
          {/* ========================================================================= */}
          <section
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "32px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>👥</span>
                  <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                    Travel Groups Created
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                  Squad coordination, join codes, and companion rosters for group travel.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {/* Year */}
                <select
                  value={groupYearFilter}
                  onChange={(e) => setGroupYearFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "#ffffff",
                    color: "#334155",
                  }}
                >
                  <option value="ALL">All Years</option>
                  {availableTripYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                {/* Trip */}
                <select
                  value={groupTripFilter}
                  onChange={(e) => setGroupTripFilter(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "#ffffff",
                    color: "#334155",
                  }}
                >
                  <option value="ALL">All Trips</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {displayedGroups.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {displayedGroups.map((grp) => (
                  <div
                    key={grp.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "18px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#0f766e", background: "#f0fdfa", padding: "2px 8px", borderRadius: "12px" }}>
                          SQUAD
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                          👥 {grp.memberCount || grp.members?.length || 1} members
                        </span>
                      </div>

                      <h3 style={{ margin: "0 0 4px", fontSize: "16px", color: "var(--navy)" }}>
                        {grp.name || "Travel Squad"}
                      </h3>
                      <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: "13px" }}>
                        Trip: <strong>{grp.tripTitle}</strong>
                      </p>

                      <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>JOIN CODE:</span>
                        <strong style={{ fontSize: "13px", color: "#0f766e", letterSpacing: "1px" }}>
                          {grp.joinCode || "PENDING"}
                        </strong>
                      </div>
                    </div>

                    <div style={{ paddingTop: "12px", marginTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                      <Link
                        to={`/trips/${grp.tripId}`}
                        style={{
                          background: "#0f766e",
                          color: "#ffffff",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          textDecoration: "none",
                          fontWeight: "700",
                          fontSize: "12px",
                        }}
                      >
                        Manage Squad →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "28px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>👥</span>
                <p style={{ margin: 0, color: "#64748b", fontWeight: "600" }}>
                  No travel groups found matching the selected filters.
                </p>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredGroups.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "12px",
                  borderTop: "1px solid #f1f5f9",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <button
                  onClick={() => setGroupsPage((p) => Math.max(1, p - 1))}
                  disabled={groupsPage <= 1}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: groupsPage <= 1 ? "#f1f5f9" : "#ffffff",
                    color: groupsPage <= 1 ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: groupsPage <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  &lt;&lt; Prev (3)
                </button>

                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "600" }}>
                  Page {groupsPage} of {groupsTotalPages} &bull; Showing {displayedGroups.length} of {filteredGroups.length} groups
                </span>

                <button
                  onClick={() => setGroupsPage((p) => Math.min(groupsTotalPages, p + 1))}
                  disabled={groupsPage >= groupsTotalPages}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: groupsPage >= groupsTotalPages ? "#f1f5f9" : "#ffffff",
                    color: groupsPage >= groupsTotalPages ? "#94a3b8" : "#0f766e",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: groupsPage >= groupsTotalPages ? "not-allowed" : "pointer",
                  }}
                >
                  (3) Next &gt;&gt;
                </button>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 9: FAVORITE DESTINATIONS (TASK 1 REQUIREMENT)                     */}
          {/* ========================================================================= */}
          <section style={{ marginBottom: "40px" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "22px" }}>🌟</span>
                <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)", fontWeight: "800" }}>
                  Favorite Destinations
                </h2>
              </div>
              <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
                Your most frequented holiday locations ranked by booking frequency.
              </p>
            </div>

            {favorites.length === 0 ? (
              <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
                📍 Complete vacations to see your favorite travel destinations ranked here.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" }}>
                {favorites.map((fav, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "18px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>📍</span>
                    <strong style={{ display: "block", color: "var(--navy)", fontSize: "16px" }}>
                      {fav.destination}
                    </strong>
                    <p style={{ margin: "6px 0 0", color: "#0f766e", fontWeight: "700", fontSize: "13px" }}>
                      {fav.visitCount} {fav.visitCount === 1 ? "Vacation" : "Vacations"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Dashboard;

``
