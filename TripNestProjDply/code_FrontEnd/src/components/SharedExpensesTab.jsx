/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import splitExpenseService from "../services/splitExpenseService";
import expenseService from "../services/expenseService";
import groupService from "../services/groupService";
import { useAuth } from "../context/useAuth";
import { formatDisplayDate } from "../utils/dateUtils";

/**
 * Visual Theme palette for expense categories.
 * Provides distinct category badges, icons, and left-border accents.
 */
const CATEGORY_THEMES = {
  ACCOMMODATION: {
    label: "Stays & Hotels",
    icon: "🏨",
    primary: "#0d9488",
    bg: "#f0fdfa",
    lightBg: "#ccfbf1",
    border: "#99f6e4",
  },
  TRANSPORTATION: {
    label: "Transit & Cabs",
    icon: "✈️",
    primary: "#0284c7",
    bg: "#f0f9ff",
    lightBg: "#e0f2fe",
    border: "#bae6fd",
  },
  FOOD: {
    label: "Food & Dining",
    icon: "🍽️",
    primary: "#ea580c",
    bg: "#fff7ed",
    lightBg: "#ffedd5",
    border: "#fed7aa",
  },
  ACTIVITIES: {
    label: "Tours & Sightseeing",
    icon: "🎟️",
    primary: "#7c3aed",
    bg: "#f5f3ff",
    lightBg: "#ede9fe",
    border: "#ddd6fe",
  },
  SHOPPING: {
    label: "Shopping",
    icon: "🛍️",
    primary: "#db2777",
    bg: "#fdf2f8",
    lightBg: "#fce7f3",
    border: "#fbcfe8",
  },
  MISCELLANEOUS: {
    label: "Misc & Others",
    icon: "📦",
    primary: "#d97706",
    bg: "#fffbeb",
    lightBg: "#fef3c7",
    border: "#fde68a",
  },
};

function getCategoryTheme(cat) {
  const key = cat ? String(cat).toUpperCase() : "MISCELLANEOUS";
  return (
    CATEGORY_THEMES[key] || {
      label: key || "Expense",
      icon: "🧾",
      primary: "#059669",
      bg: "#f0fdf4",
      lightBg: "#d1fae5",
      border: "#a7f3d0",
    }
  );
}

/**
 * Distribute an expense amount equally among participant userIds with penny-rounding adjustment.
 * Allocates remainder cents to the earliest participants so that sum of shares strictly equals totalAmount.
 * e.g. ₹100.00 among 3 -> [₹33.34, ₹33.33, ₹33.33]. Sum = ₹100.00 exactly!
 */
function allocatePenniesEqually(totalAmount, participantUserIds) {
  const count = participantUserIds.length;
  if (!count) return {};
  const totalCents = Math.round(parseFloat(totalAmount || 0) * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  const result = {};
  participantUserIds.forEach((uid, idx) => {
    const cents = idx < remainderCents ? baseCents + 1 : baseCents;
    result[uid] = cents / 100;
  });
  return result;
}

/**
 * SharedExpensesTab Component (Milestone 3 Task 11)
 * Features Dual-Track Settlement Architecture:
 * - Way 1: Pool Settlement Way (Trip-End Master Pool Settlement: Total Expenses ÷ Total No. of Members)
 * - Way 2: ExpenseWise Settlement Way (Aggregated Passbook, Greedy Settlement & Itemized Receipts for Subsets)
 * - Section 3: Summary of All 10 Expenses & Final Reconciled Master Settlement
 */
export default function SharedExpensesTab({ tripId, trip }) {
  const { user } = useAuth();

  // Core Data States
  const [contributions, setContributions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [splits, setSplits] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);

  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [batchSplitting, setBatchSplitting] = useState(false);

  // Pool Transfer Settled Tracking (Row-level toggle for Way 1 with localStorage persistence)
  const [settledPoolTransferIds, setSettledPoolTransferIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`tripnest_pool_settled_${tripId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist settledPoolTransferIds whenever it changes
  useEffect(() => {
    if (tripId) {
      try {
        localStorage.setItem(
          `tripnest_pool_settled_${tripId}`,
          JSON.stringify(Array.from(settledPoolTransferIds))
        );
      } catch {
        // ignore storage errors
      }
    }
  }, [settledPoolTransferIds, tripId]);

  // Subset Transfer Settled Tracking (Row-level toggle for Way 2 with localStorage persistence)
  const [settledSubsetTransferIds, setSettledSubsetTransferIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`tripnest_subset_settled_${tripId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist settledSubsetTransferIds whenever it changes
  useEffect(() => {
    if (tripId) {
      try {
        localStorage.setItem(
          `tripnest_subset_settled_${tripId}`,
          JSON.stringify(Array.from(settledSubsetTransferIds))
        );
      } catch {
        // ignore storage errors
      }
    }
  }, [settledSubsetTransferIds, tripId]);

  // Synchronize settlement state from Dashboard or other tabs
  useEffect(() => {
    function handleStorage() {
      if (tripId) {
        try {
          const poolSaved = localStorage.getItem(`tripnest_pool_settled_${tripId}`);
          if (poolSaved) setSettledPoolTransferIds(new Set(JSON.parse(poolSaved)));
          const subsetSaved = localStorage.getItem(`tripnest_subset_settled_${tripId}`);
          if (subsetSaved) setSettledSubsetTransferIds(new Set(JSON.parse(subsetSaved)));
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleStorage);
    };
  }, [tripId]);

  // Filter Mode for Section 3 Expense Summary ("ALL" | "POOL" | "SUBSET")
  const [summaryFilterMode, setSummaryFilterMode] = useState("ALL");

  // Split Modal States
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Split Form States
  const [selectedExpenseId, setSelectedExpenseId] = useState("");
  const [splitType, setSplitType] = useState("EQUAL"); // "EQUAL" | "CUSTOM"
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [customShares, setCustomShares] = useState({});

  useEffect(() => {
    fetchSharedData();
  }, [tripId]);

  // Auto-dismiss success alert after 4 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  /**
   * Fetch all necessary domain data concurrently
   */
  async function fetchSharedData() {
    setLoading(true);
    setError("");
    try {
      const [contribRes, settleRes, splitsRes, expRes, grpRes] = await Promise.allSettled([
        splitExpenseService.getMemberContributions(tripId),
        splitExpenseService.getOptimizedSettlements(tripId),
        splitExpenseService.getSplitsByTrip(tripId),
        expenseService.getExpenses(tripId),
        groupService.getGroupByTripId(tripId),
      ]);

      if (contribRes.status === "fulfilled") {
        setContributions(contribRes.value || []);
      }
      if (settleRes.status === "fulfilled") {
        setSettlements(settleRes.value || []);
      }
      if (splitsRes.status === "fulfilled") {
        setSplits(splitsRes.value || []);
      }
      if (expRes.status === "fulfilled") {
        setExpenses(expRes.value || []);
      }
      if (grpRes.status === "fulfilled" && grpRes.value?.members) {
        setGroupMembers(grpRes.value.members);
      }
    } catch (err) {
      setError(err.message || "Failed to load shared expense data.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Defensive resolution of companion list by merging group members and contributors.
   */
  const allCompanions = useMemo(() => {
    const map = new Map();
    groupMembers.forEach((m) => {
      if (m.userId) {
        map.set(m.userId, { userId: m.userId, name: m.name, email: m.email });
      }
    });
    contributions.forEach((c) => {
      if (c.userId && !map.has(c.userId)) {
        map.set(c.userId, { userId: c.userId, name: c.userName, email: c.userEmail });
      }
    });
    return Array.from(map.values());
  }, [groupMembers, contributions]);

  /**
   * Group all split records by expenseId for fast O(1) lookup.
   */
  const splitsByExpenseId = useMemo(() => {
    const map = {};
    splits.forEach((s) => {
      if (!map[s.expenseId]) {
        map[s.expenseId] = [];
      }
      map[s.expenseId].push(s);
    });
    return map;
  }, [splits]);

  /**
   * Defensive Payer Name Resolver:
   * Handles paidByName, paidByUserName, current user match, or object paidBy.
   */
  function resolvePayerName(exp) {
    if (!exp) return "Trip Member";
    if (exp.paidByName) return exp.paidByName;
    if (exp.paidByUserName) return exp.paidByUserName;
    if (exp.paidByUserId && user && exp.paidByUserId === user.id) return user.name || "You";
    if (exp.paidBy) {
      if (typeof exp.paidBy === "object") return exp.paidBy.name || "Trip Member";
      return String(exp.paidBy);
    }
    return "Trip Member";
  }

  // =========================================================================
  // DUAL-TRACK LEDGER CLASSIFICATION: WAY 1 (POOL) vs WAY 2 (SUBSET)
  // =========================================================================

  // Sort all trip expenses chronologically by entry order (ID ascending)
  const chronologicalExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => Number(a.id) - Number(b.id));
  }, [expenses]);

  // Permanent Chronological Expense Number Mapping:
  // First entered expense (lowest id) -> 1, next -> 2, latest -> N, future -> N+1
  const expenseNumberMap = useMemo(() => {
    const map = new Map();
    chronologicalExpenses.forEach((exp, idx) => {
      map.set(exp.id, idx + 1);
    });
    return map;
  }, [chronologicalExpenses]);

  /**
   * Track 1: Pool Expenses (Way 1)
   * Expenses where ALL members were present, or unsplit receipts (defaulting to whole group).
   */
  const poolExpenses = useMemo(() => {
    const totalMembers = allCompanions.length || groupMembers.length || 4;
    return expenses.filter((e) => {
      const s = splitsByExpenseId[e.id] || [];
      return s.length === totalMembers || s.length === 0;
    });
  }, [expenses, splitsByExpenseId, allCompanions.length, groupMembers.length]);

  /**
   * Track 2: Subset Expenses (Way 2)
   * Expenses where only a few members were present (e.g. 2 or 3 members out of 4).
   */
  const subsetExpenses = useMemo(() => {
    const totalMembers = allCompanions.length || groupMembers.length || 4;
    return expenses.filter((e) => {
      const s = splitsByExpenseId[e.id] || [];
      return s.length > 0 && s.length < totalMembers;
    });
  }, [expenses, splitsByExpenseId, allCompanions.length, groupMembers.length]);

  // Total amount spent in Pool
  const totalPoolSpent = useMemo(() => {
    return poolExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [poolExpenses]);

  // Fair share per member in Pool (floored to 2 decimals to ensure exact cents match across banner & table)
  const fairSharePerMember = useMemo(() => {
    const count = allCompanions.length || 1;
    return Math.floor((totalPoolSpent / count) * 100) / 100;
  }, [totalPoolSpent, allCompanions.length]);

  // List of receipt numbers included in Way 1 Master Pool (e.g. Exp 1, Exp 2, ...)
  const poolReceiptLabels = useMemo(() => {
    if (poolExpenses.length === 0) return "None";
    const sortedPool = [...poolExpenses].sort((a, b) => Number(a.id) - Number(b.id));
    return sortedPool
      .map((pe) => `Exp ${expenseNumberMap.get(pe.id) || pe.id}`)
      .join(", ");
  }, [poolExpenses, expenseNumberMap]);

  // Precalculate penny-precise fair share per companion for the Master Pool
  const poolPennyShares = useMemo(() => {
    return allocatePenniesEqually(totalPoolSpent, allCompanions.map((c) => c.userId));
  }, [totalPoolSpent, allCompanions]);

  /**
   * Member-wise Pool Contributions (Way 1)
   * How much paid upfront in pool, fair share, net position = paid - fairShare
   */
  const poolMemberContributions = useMemo(() => {
    return allCompanions.map((m) => {
      const totalPaid = poolExpenses
        .filter((e) => {
          if (e.paidByUserId && Number(e.paidByUserId) === Number(m.userId)) return true;
          const payer = resolvePayerName(e);
          return payer === m.name || (m.userId === user?.id && payer === "You");
        })
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      const fairShare = poolPennyShares[m.userId] !== undefined ? poolPennyShares[m.userId] : fairSharePerMember;
      const netBalance = Math.round((totalPaid - fairShare) * 100) / 100;
      let status = "SETTLED";
      if (netBalance > 0.05) status = "RECEIVES";
      else if (netBalance < -0.05) status = "OWES";

      return {
        userId: m.userId,
        userName: m.name,
        userEmail: m.email,
        totalPaid,
        fairShare,
        netBalance,
        status,
      };
    });
  }, [allCompanions, poolExpenses, poolPennyShares, fairSharePerMember, user]);

  /**
   * Logical Settlement Transfers for Way 1 ("Who Pays Whom")
   * Matches debtors (net < 0) with creditors (net > 0) in minimal transactions.
   */
  const poolSettlementTransfers = useMemo(() => {
    const debtors = [];
    const creditors = [];

    poolMemberContributions.forEach((c) => {
      if (c.netBalance < -0.05) {
        debtors.push({ userId: c.userId, name: c.userName, amount: Math.abs(c.netBalance) });
      } else if (c.netBalance > 0.05) {
        creditors.push({ userId: c.userId, name: c.userName, amount: c.netBalance });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let d = 0;
    let c = 0;

    const dList = debtors.map((x) => ({ ...x }));
    const cList = creditors.map((x) => ({ ...x }));

    while (d < dList.length && c < cList.length) {
      const debtor = dList[d];
      const creditor = cList[c];
      const transferAmount = Math.min(debtor.amount, creditor.amount);

      if (transferAmount > 0.01) {
        transfers.push({
          id: `pool-transfer-${debtor.userId}-${creditor.userId}-${Math.round(transferAmount)}`,
          fromUserId: debtor.userId,
          fromUserName: debtor.name,
          toUserId: creditor.userId,
          toUserName: creditor.name,
          amount: transferAmount,
        });
      }

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    return transfers;
  }, [poolMemberContributions]);

  /**
   * Check if Way 1 (Pool) is 100% fully settled:
   * True when pool expenses exist and either no transfers are needed (already even)
   * or ALL generated transfers are marked as Settled.
   */
  const isWay1FullySettled = useMemo(() => {
    if (poolExpenses.length === 0) return false;
    if (poolSettlementTransfers.length === 0) return true;
    return poolSettlementTransfers.every((t) => settledPoolTransferIds.has(t.id));
  }, [poolExpenses.length, poolSettlementTransfers, settledPoolTransferIds]);

  /**
   * Member-level settlement map for Way 1:
   * Computes whether each companion's debt transfers are paid (isDebtorPaid)
   * or credit transfers received (isCreditorReceived).
   */
  const memberPoolSettlementMap = useMemo(() => {
    const map = {};
    allCompanions.forEach((m) => {
      const outgoingTransfers = poolSettlementTransfers.filter(
        (t) => Number(t.fromUserId) === Number(m.userId)
      );
      const incomingTransfers = poolSettlementTransfers.filter(
        (t) => Number(t.toUserId) === Number(m.userId)
      );

      const isDebtorPaid =
        outgoingTransfers.length > 0 &&
        outgoingTransfers.every((t) => settledPoolTransferIds.has(t.id));

      const isCreditorReceived =
        incomingTransfers.length > 0 &&
        incomingTransfers.every((t) => settledPoolTransferIds.has(t.id));

      const isBalanced = outgoingTransfers.length === 0 && incomingTransfers.length === 0;

      const isFullySettled =
        isWay1FullySettled ||
        isBalanced ||
        (outgoingTransfers.length > 0 && isDebtorPaid && (incomingTransfers.length === 0 || isCreditorReceived)) ||
        (incomingTransfers.length > 0 && isCreditorReceived && outgoingTransfers.length === 0);

      map[m.userId] = {
        isDebtorPaid,
        isCreditorReceived,
        isBalanced,
        isFullySettled,
      };
    });
    return map;
  }, [allCompanions, poolSettlementTransfers, settledPoolTransferIds, isWay1FullySettled]);

  /**
   * Helper to sync settled transfer changes to the global cross-component ledger
   */
  function syncSettlementToGlobalStorage(transferId, fromUserId, toUserId, fromUserName, toUserName, isSettled) {
    try {
      const globalKey = "tripnest_settled_transfers";
      const gMap = JSON.parse(localStorage.getItem(globalKey) || "{}");
      const keyId = transferId;
      const keyPair = tripId && fromUserId && toUserId ? `${tripId}_${fromUserId}_${toUserId}` : null;
      const keyName = tripId && fromUserName && toUserName ? `${tripId}_${fromUserName.toLowerCase().trim()}_${toUserName.toLowerCase().trim()}` : null;

      if (isSettled) {
        gMap[keyId] = true;
        if (keyPair) gMap[keyPair] = true;
        if (keyName) gMap[keyName] = true;
      } else {
        delete gMap[keyId];
        if (keyPair) delete gMap[keyPair];
        if (keyName) delete gMap[keyName];
      }
      localStorage.setItem(globalKey, JSON.stringify(gMap));

      // Also sync to tripnest_settled_debts
      const debtsKey = "tripnest_settled_debts";
      const dMap = JSON.parse(localStorage.getItem(debtsKey) || "{}");
      if (isSettled) {
        dMap[keyId] = true;
        if (keyPair) dMap[keyPair] = true;
        if (keyName) dMap[keyName] = true;
      } else {
        delete dMap[keyId];
        if (keyPair) delete dMap[keyPair];
        if (keyName) delete dMap[keyName];
      }
      localStorage.setItem(debtsKey, JSON.stringify(dMap));

      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Storage sync error:", e);
    }
  }

  /**
   * Toggle a Way 1 pool transfer status between Settled and Unsettled
   */
  function handleTogglePoolTransfer(transferId) {
    const target = poolSettlementTransfers.find((t) => t.id === transferId);
    setSettledPoolTransferIds((prev) => {
      const next = new Set(prev);
      const isNowSettled = !next.has(transferId);
      if (isNowSettled) {
        next.add(transferId);
        setSuccess("Transfer marked as Settled / Paid!");
      } else {
        next.delete(transferId);
        setSuccess("Transfer status marked as Unsettled.");
      }

      if (target) {
        syncSettlementToGlobalStorage(
          transferId,
          target.fromUserId,
          target.toUserId,
          target.fromUserName,
          target.toUserName,
          isNowSettled
        );
      } else {
        syncSettlementToGlobalStorage(transferId, null, null, null, null, isNowSettled);
      }

      return next;
    });
  }

  /**
   * Mark all Way 1 pool transfers as Paid at once
   */
  function handleMarkAllPoolSettled() {
    const allIds = poolSettlementTransfers.map((t) => t.id);
    setSettledPoolTransferIds(new Set(allIds));
    poolSettlementTransfers.forEach((t) => {
      syncSettlementToGlobalStorage(t.id, t.fromUserId, t.toUserId, t.fromUserName, t.toUserName, true);
    });
    setSuccess("🎉 All pool settlement transfers marked as Paid! Way 1 Master Pool is fully settled.");
  }

  /**
   * Reset all Way 1 pool transfers back to Unsettled
   */
  function handleResetAllPoolTransfers() {
    poolSettlementTransfers.forEach((t) => {
      syncSettlementToGlobalStorage(t.id, t.fromUserId, t.toUserId, t.fromUserName, t.toUserName, false);
    });
    setSettledPoolTransferIds(new Set());
    setSuccess("Pool settlement transfers reset to Unsettled.");
  }

  // =========================================================================
  // WAY 2 AGGREGATION & GREEDY SETTLEMENT ENGINE
  // =========================================================================

  // Total amount spent across Way 2 subset activities
  const totalSubsetSpent = useMemo(() => {
    return subsetExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [subsetExpenses]);

  // List of receipt numbers included in Way 2 Subset (e.g. Exp 8, Exp 9, Exp 10)
  const subsetReceiptLabels = useMemo(() => {
    if (subsetExpenses.length === 0) return "None";
    const sortedSubset = [...subsetExpenses].sort((a, b) => Number(a.id) - Number(b.id));
    return sortedSubset
      .map((se) => `Exp ${expenseNumberMap.get(se.id) || se.id}`)
      .join(", ");
  }, [subsetExpenses, expenseNumberMap]);

  /**
   * Member-wise Subset Activity Balances (Way 2)
   * Computes each companion's total paid upfront in Way 2,
   * total cost share across all subset activities joined (with penny precision),
   * and net position = totalPaid - consumedShare.
   */
  const subsetMemberContributions = useMemo(() => {
    // Precalculate penny-precise shares for every subset expense
    const perExpensePennyMap = {};
    subsetExpenses.forEach((exp) => {
      const splitsForExp = splitsByExpenseId[exp.id] || [];
      const participantIds = splitsForExp.map((s) => s.userId);
      perExpensePennyMap[exp.id] = allocatePenniesEqually(exp.amount, participantIds);
    });

    return allCompanions.map((m) => {
      // How much did this member pay upfront across subsetExpenses?
      const totalPaid = subsetExpenses
        .filter((e) => {
          if (e.paidByUserId && Number(e.paidByUserId) === Number(m.userId)) return true;
          const payer = resolvePayerName(e);
          return payer === m.name || (m.userId === user?.id && payer === "You");
        })
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      // How much is this member's consumed cost share across all subset activities joined?
      const joinedExpenses = [];
      let consumedShare = 0;

      subsetExpenses.forEach((e) => {
        const splitsForExp = splitsByExpenseId[e.id] || [];
        const isParticipant = splitsForExp.some((s) => Number(s.userId) === Number(m.userId));
        if (isParticipant) {
          joinedExpenses.push(e);
          const share =
            perExpensePennyMap[e.id]?.[m.userId] !== undefined
              ? perExpensePennyMap[e.id][m.userId]
              : parseFloat(e.amount) / (splitsForExp.length || 1);
          consumedShare += share;
        }
      });

      consumedShare = Math.round(consumedShare * 100) / 100;
      const netBalance = Math.round((totalPaid - consumedShare) * 100) / 100;
      let status = "SETTLED";
      if (netBalance > 0.05) status = "RECEIVES";
      else if (netBalance < -0.05) status = "OWES";

      return {
        userId: m.userId,
        userName: m.name,
        userEmail: m.email,
        activitiesJoinedCount: joinedExpenses.length,
        joinedExpenseNumbers: joinedExpenses
          .sort((a, b) => Number(a.id) - Number(b.id))
          .map((je) => `Exp ${expenseNumberMap.get(je.id) || je.id}`),
        totalPaid,
        consumedShare,
        netBalance,
        status,
      };
    });
  }, [allCompanions, subsetExpenses, splitsByExpenseId, expenseNumberMap, user]);

  /**
   * Logical Settlement Transfers for Way 2 ("Who Pays Whom for Selective Activities")
   * Minimal direct peer-to-peer transfers to clear all Way 2 subset activity debts.
   */
  const subsetSettlementTransfers = useMemo(() => {
    const debtors = [];
    const creditors = [];

    subsetMemberContributions.forEach((c) => {
      if (c.netBalance < -0.05) {
        debtors.push({ userId: c.userId, name: c.userName, amount: Math.abs(c.netBalance) });
      } else if (c.netBalance > 0.05) {
        creditors.push({ userId: c.userId, name: c.userName, amount: c.netBalance });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let d = 0;
    let c = 0;

    const dList = debtors.map((x) => ({ ...x }));
    const cList = creditors.map((x) => ({ ...x }));

    while (d < dList.length && c < cList.length) {
      const debtor = dList[d];
      const creditor = cList[c];
      const transferAmount = Math.min(debtor.amount, creditor.amount);

      if (transferAmount > 0.01) {
        transfers.push({
          id: `subset-transfer-${debtor.userId}-${creditor.userId}-${Math.round(transferAmount)}`,
          fromUserId: debtor.userId,
          fromUserName: debtor.name,
          toUserId: creditor.userId,
          toUserName: creditor.name,
          amount: transferAmount,
        });
      }

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    return transfers;
  }, [subsetMemberContributions]);

  /**
   * Toggle a Way 2 selective transfer status between Settled and Unsettled
   */
  function handleToggleSubsetTransfer(transferId) {
    const target = subsetSettlementTransfers.find((t) => t.id === transferId);
    setSettledSubsetTransferIds((prev) => {
      const next = new Set(prev);
      const isNowSettled = !next.has(transferId);
      if (isNowSettled) {
        next.add(transferId);
        setSuccess("Selective activity transfer marked as Settled / Paid!");
      } else {
        next.delete(transferId);
        setSuccess("Selective activity transfer marked as Unsettled.");
      }

      if (target) {
        syncSettlementToGlobalStorage(
          transferId,
          target.fromUserId,
          target.toUserId,
          target.fromUserName,
          target.toUserName,
          isNowSettled
        );
      } else {
        syncSettlementToGlobalStorage(transferId, null, null, null, null, isNowSettled);
      }

      return next;
    });
  }

  // =========================================================================
  // OPTION A: COMBINED FINAL SETTLEMENT ENGINE (WAY 1 + WAY 2 DIRECT TRANSPARENT SUM)
  // =========================================================================
  const combinedFinalSettlements = useMemo(() => {
    const map = new Map();

    // 1. Ingest Way 1 (Master Pool) transfers
    poolSettlementTransfers.forEach((t) => {
      const key = `${t.fromUserId}_${t.toUserId}`;
      const isSettled = settledPoolTransferIds.has(t.id);
      map.set(key, {
        key,
        fromUserId: t.fromUserId,
        fromUserName: t.fromUserName,
        toUserId: t.toUserId,
        toUserName: t.toUserName,
        poolTransfer: t,
        poolAmount: Number(t.amount || 0),
        isPoolSettled: isSettled,
        subsetTransfer: null,
        subsetAmount: 0,
        isSubsetSettled: false,
      });
    });

    // 2. Ingest Way 2 (Selective Subset) transfers
    subsetSettlementTransfers.forEach((t) => {
      const key = `${t.fromUserId}_${t.toUserId}`;
      const isSettled = settledSubsetTransferIds.has(t.id);
      if (map.has(key)) {
        const existing = map.get(key);
        existing.subsetTransfer = t;
        existing.subsetAmount = Number(t.amount || 0);
        existing.isSubsetSettled = isSettled;
      } else {
        map.set(key, {
          key,
          fromUserId: t.fromUserId,
          fromUserName: t.fromUserName,
          toUserId: t.toUserId,
          toUserName: t.toUserName,
          poolTransfer: null,
          poolAmount: 0,
          isPoolSettled: false,
          subsetTransfer: t,
          subsetAmount: Number(t.amount || 0),
          isSubsetSettled: isSettled,
        });
      }
    });

    // 3. Compute combined total and overall settlement status
    const combinedList = Array.from(map.values()).map((item) => {
      const totalAmount = item.poolAmount + item.subsetAmount;
      const hasPool = item.poolAmount > 0.01;
      const hasSubset = item.subsetAmount > 0.01;

      let status = "UNSETTLED";
      if (hasPool && hasSubset) {
        if (item.isPoolSettled && item.isSubsetSettled) status = "SETTLED";
        else if (item.isPoolSettled || item.isSubsetSettled) status = "PARTIAL";
        else status = "UNSETTLED";
      } else if (hasPool) {
        status = item.isPoolSettled ? "SETTLED" : "UNSETTLED";
      } else if (hasSubset) {
        status = item.isSubsetSettled ? "SETTLED" : "UNSETTLED";
      }

      return {
        ...item,
        totalAmount,
        status,
        isFullySettled: status === "SETTLED",
      };
    });

    return combinedList.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [poolSettlementTransfers, subsetSettlementTransfers, settledPoolTransferIds, settledSubsetTransferIds]);

  const totalCombinedDebt = useMemo(() => {
    return combinedFinalSettlements.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [combinedFinalSettlements]);

  const pendingCombinedDebt = useMemo(() => {
    return combinedFinalSettlements.reduce((sum, item) => {
      let pending = 0;
      if (item.poolAmount > 0 && !item.isPoolSettled) pending += item.poolAmount;
      if (item.subsetAmount > 0 && !item.isSubsetSettled) pending += item.subsetAmount;
      return sum + pending;
    }, 0);
  }, [combinedFinalSettlements]);

  const settledCombinedCount = useMemo(() => {
    return combinedFinalSettlements.filter((item) => item.isFullySettled).length;
  }, [combinedFinalSettlements]);

  function handleToggleCombinedTransfer(item) {
    const willBeSettled = !item.isFullySettled;

    // Toggle Way 1 transfer
    if (item.poolTransfer) {
      const poolId = item.poolTransfer.id;
      setSettledPoolTransferIds((prev) => {
        const next = new Set(prev);
        if (willBeSettled) next.add(poolId);
        else next.delete(poolId);
        return next;
      });
      syncSettlementToGlobalStorage(
        poolId,
        item.fromUserId,
        item.toUserId,
        item.fromUserName,
        item.toUserName,
        willBeSettled
      );
    }

    // Toggle Way 2 transfer
    if (item.subsetTransfer) {
      const subsetId = item.subsetTransfer.id;
      setSettledSubsetTransferIds((prev) => {
        const next = new Set(prev);
        if (willBeSettled) next.add(subsetId);
        else next.delete(subsetId);
        return next;
      });
      syncSettlementToGlobalStorage(
        subsetId,
        item.fromUserId,
        item.toUserId,
        item.fromUserName,
        item.toUserName,
        willBeSettled
      );
    }

    setSuccess(
      willBeSettled
        ? `Consolidated transfer from ${item.fromUserName} to ${item.toUserName} (₹${item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}) marked as Settled!`
        : `Consolidated transfer status marked as Unsettled.`
    );
  }

  function handleMarkAllCombinedSettled() {
    handleMarkAllPoolSettled();
    const allSubsetIds = subsetSettlementTransfers.map((t) => t.id);
    setSettledSubsetTransferIds(new Set(allSubsetIds));
    subsetSettlementTransfers.forEach((t) => {
      syncSettlementToGlobalStorage(t.id, t.fromUserId, t.toUserId, t.fromUserName, t.toUserName, true);
    });
    setSuccess("🎉 All consolidated trip settlements (Way 1 + Way 2) marked as Paid!");
  }

  function handleResetAllCombined() {
    handleResetAllPoolTransfers();
    subsetSettlementTransfers.forEach((t) => {
      syncSettlementToGlobalStorage(t.id, t.fromUserId, t.toUserId, t.fromUserName, t.toUserName, false);
    });
    setSettledSubsetTransferIds(new Set());
    setSuccess("All consolidated settlement transfers reset to Unsettled.");
  }

  /**
   * Settle an individual split debt on backend (for Way 2 or specific share)
   */
  async function handleSettleSplit(splitId) {
    if (!window.confirm("Mark this debt share as settled / paid?")) return;
    setActionLoadingId(splitId);
    try {
      await splitExpenseService.settleSplit(splitId);
      try {
        const splitMap = JSON.parse(localStorage.getItem("tripnest_settled_splits") || "{}");
        splitMap[splitId] = true;
        localStorage.setItem("tripnest_settled_splits", JSON.stringify(splitMap));
        window.dispatchEvent(new Event("storage"));
      } catch {
        // ignore
      }
      setSuccess("Split debt marked as settled!");
      await fetchSharedData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to settle debt.");
    } finally {
      setActionLoadingId(null);
    }
  }

  /**
   * 1-Click Batch Split for All Unsplit Expenses
   */
  async function handleSplitAllUnsplitEvenly() {
    const targetMembers = allCompanions.length > 0 ? allCompanions : groupMembers;
    if (targetMembers.length === 0) {
      setError("No travel companions found to split expenses.");
      return;
    }

    const unsplitList = expenses.filter((e) => !(splitsByExpenseId[e.id] && splitsByExpenseId[e.id].length > 0));
    if (unsplitList.length === 0) {
      setSuccess("All expenses are already split!");
      return;
    }

    if (
      !window.confirm(
        `Split all ${unsplitList.length} unsplit ${unsplitList.length <= 1 ? "expense" : "expenses"} equally among all ${targetMembers.length} ${targetMembers.length <= 1 ? "companion" : "companions"}?`
      )
    ) {
      return;
    }

    setBatchSplitting(true);
    setError("");
    try {
      const userIds = targetMembers.map((m) => m.userId);
      for (const exp of unsplitList) {
        await splitExpenseService.splitExpense(exp.id, {
          splitType: "EQUAL",
          userIds,
        });
      }
      setSuccess(
        `🎉 Successfully split all ${unsplitList.length} ${unsplitList.length <= 1 ? "expense" : "expenses"} equally among all ${targetMembers.length} ${targetMembers.length <= 1 ? "companion" : "companions"}!`
      );
      await fetchSharedData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to split all expenses.");
    } finally {
      setBatchSplitting(false);
    }
  }

  /**
   * Open the Split Modal initialized with target expense and companions
   */
  function handleOpenSplitModal(preselectedExpenseId = null) {
    setModalError("");
    setSplitType("EQUAL");

    const targetExpenseId = preselectedExpenseId || (expenses.length > 0 ? expenses[0].id : "");
    setSelectedExpenseId(targetExpenseId);

    const companionsToUse = allCompanions.length > 0 ? allCompanions : groupMembers;
    const allIds = companionsToUse.map((m) => m.userId);
    setSelectedUserIds(allIds);

    const initialCustom = {};
    allIds.forEach((uid) => {
      initialCustom[uid] = "";
    });
    setCustomShares(initialCustom);

    setIsSplitModalOpen(true);
  }

  /**
   * Toggle a member checkbox in modal
   */
  function handleToggleUser(userId) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  /**
   * Handle Custom Split numeric input change
   */
  function handleCustomAmountChange(userId, value) {
    setCustomShares((prev) => ({
      ...prev,
      [userId]: value,
    }));
  }

  /**
   * Submit Expense Split from Modal
   */
  async function handleSubmitSplit(e) {
    e.preventDefault();
    setModalError("");

    if (!selectedExpenseId) {
      setModalError("Please select an expense to split.");
      return;
    }

    const currentExpense = expenses.find((exp) => String(exp.id) === String(selectedExpenseId));
    if (!currentExpense) {
      setModalError("Selected expense not found.");
      return;
    }

    setModalSubmitting(true);
    try {
      let payload;
      if (splitType === "EQUAL") {
        if (selectedUserIds.length === 0) {
          setModalError("Please select at least one traveler to share this expense.");
          setModalSubmitting(false);
          return;
        }
        payload = {
          splitType: "EQUAL",
          userIds: selectedUserIds,
        };
      } else {
        const customSharesList = [];
        let runningSum = 0;

        for (const uid of selectedUserIds) {
          const amtStr = customShares[uid];
          const amt = parseFloat(amtStr);
          if (isNaN(amt) || amt <= 0) {
            setModalError("Each selected member must have a valid positive amount.");
            setModalSubmitting(false);
            return;
          }
          runningSum += amt;
          customSharesList.push({ userId: uid, amount: amt });
        }

        const totalExpected = parseFloat(currentExpense.amount);
        if (Math.abs(runningSum - totalExpected) > 0.05) {
          setModalError(
            `Custom shares sum (₹${runningSum.toFixed(2)}) must equal the expense total (₹${totalExpected.toFixed(2)}). Difference: ₹${(totalExpected - runningSum).toFixed(2)}`
          );
          setModalSubmitting(false);
          return;
        }

        payload = {
          splitType: "CUSTOM",
          customShares: customSharesList,
        };
      }

      await splitExpenseService.splitExpense(selectedExpenseId, payload);
      setSuccess(`Expense "${currentExpense.description}" split successfully among companions!`);
      setIsSplitModalOpen(false);
      await fetchSharedData();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message || "Failed to split expense.");
    } finally {
      setModalSubmitting(false);
    }
  }

  // Active expense details helper for modal
  const activeExpense = expenses.find((e) => String(e.id) === String(selectedExpenseId));
  const activeExpenseAmount = activeExpense ? parseFloat(activeExpense.amount) : 0;
  const equalPerPerson =
    selectedUserIds.length > 0 ? (activeExpenseAmount / selectedUserIds.length).toFixed(2) : 0;

  const customSum = selectedUserIds.reduce((sum, uid) => {
    const val = parseFloat(customShares[uid]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  // Filtered expenses for Section 3 Summary sorted chronologically by entry order
  const displayedSummaryExpenses = useMemo(() => {
    let list = expenses;
    if (summaryFilterMode === "POOL") list = poolExpenses;
    else if (summaryFilterMode === "SUBSET") list = subsetExpenses;
    return [...list].sort((a, b) => Number(a.id) - Number(b.id));
  }, [summaryFilterMode, poolExpenses, subsetExpenses, expenses]);

  return (
    <section className="shared-expenses-section" style={{ minHeight: "450px" }}>
      {/* 1. Header Banner */}
      <div
        className="shared-expenses-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
          border: "1px solid #a7f3d0",
          borderLeft: "6px solid #059669",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "28px",
          boxShadow: "0 4px 15px rgba(5, 150, 105, 0.06)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h2 style={{ margin: 0, color: "#065f46", fontSize: "24px", fontWeight: "800" }}>
              🤝 Shared Expenses & Split Settlements
            </h2>
            <span
              style={{
                background: "#d1fae5",
                color: "#065f46",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                border: "1px solid #6ee7b7",
              }}
            >
              Dual-Track Engine
            </span>
          </div>
          <p style={{ margin: 0, color: "#047857", fontSize: "14px" }}>
            Dual-track financial settlement: Settle common group bills in a Master Pool (Way 1) or settle selective activities directly between participants (Way 2).
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={fetchSharedData}
            className="outline-btn"
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              fontWeight: "700",
              cursor: "pointer",
              background: "#ffffff",
              border: "1.5px solid #a7f3d0",
              color: "#065f46",
            }}
          >
            🔄 Refresh
          </button>

          <button
            type="button"
            onClick={() => handleOpenSplitModal()}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>➕</span> Split an Expense
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError("")}
            style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontWeight: "700" }}
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#f0fdf4",
            color: "#166534",
            border: "1px solid #bbf7d0",
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>✅ {success}</span>
          <button
            onClick={() => setSuccess("")}
            style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontWeight: "700" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "#065f46", fontWeight: "600" }}>Calculating dual-track settlement balances...</p>
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                padding: "20px 24px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                borderLeft: "5px solid #3b82f6",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
                🧾 Total Trip Expenses
              </span>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
                {expenses.length} {expenses.length <= 1 ? "Receipt" : "Receipts"}
              </div>
              <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600", marginTop: "4px", display: "block" }}>
                {poolExpenses.length} Pool (Way 1) • {subsetExpenses.length} Subset (Way 2)
              </span>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "20px 24px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                borderLeft: "5px solid #10b981",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
                🏁 Way 1 Pool Total
              </span>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
                ₹{totalPoolSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: "12px", color: "#059669", fontWeight: "600", marginTop: "4px", display: "block" }}>
                ₹{fairSharePerMember.toFixed(2)} each ({allCompanions.length || 4} {(allCompanions.length || 4) <= 1 ? "member" : "members"})
              </span>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "20px 24px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                borderLeft: "5px solid #8b5cf6",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
                👥 Squad Companions
              </span>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", marginTop: "6px" }}>
                {allCompanions.length || 4} {(allCompanions.length || 4) <= 1 ? "Member" : "Members"}
              </div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "4px", display: "block" }}>
                Active in group ledger
              </span>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "20px 24px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                borderLeft: poolSettlementTransfers.length > 0 ? "5px solid #f59e0b" : "5px solid #10b981",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
                ⚖️ Way 1 Transfers
              </span>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "800",
                  color: poolSettlementTransfers.length > 0 ? "#d97706" : "#059669",
                  marginTop: "6px",
                }}
              >
                {poolSettlementTransfers.length} {poolSettlementTransfers.length <= 1 ? "Transfer" : "Transfers"}
              </div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginTop: "4px", display: "block" }}>
                {settledPoolTransferIds.size === poolSettlementTransfers.length && poolSettlementTransfers.length > 0
                  ? "🎉 All transfers cleared"
                  : `${settledPoolTransferIds.size}/${poolSettlementTransfers.length} cleared`}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION A.1: 🏆 GRAND UNIFIED FINAL SETTLEMENT (WAY 1 + WAY 2 COMBINED)    */}
          {/* ========================================================================= */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              border: "2px solid #bfdbfe",
              borderLeft: "8px solid #2563eb",
              padding: "28px",
              marginBottom: "36px",
              boxShadow: "0 6px 20px rgba(37, 99, 235, 0.07)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "22px", fontWeight: "900" }}>
                    🏆 Grand Unified Final Settlement Plan (Way 1 + Way 2 Combined)
                  </h3>
                  <span
                    style={{
                      background: "#dbeafe",
                      color: "#1e40af",
                      padding: "3px 12px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: "800",
                      border: "1px solid #93c5fd",
                    }}
                  >
                    Direct Consolidated Math
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "14px" }}>
                  The master settlement plan combining common pool expenses (Way 1) and selective group activities (Way 2). One consolidated payment per person to settle all debts across the trip.
                </p>
              </div>
            </div>

            {/* Summary Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "14px",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px 18px",
                }}
              >
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase" }}>
                  Total Combined Outflow
                </span>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
                  ₹{totalCombinedDebt.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  Sum of Way 1 Pool + Way 2 Selective
                </span>
              </div>

              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "12px",
                  padding: "14px 18px",
                }}
              >
                <span style={{ fontSize: "11px", color: "#1e40af", fontWeight: "800", textTransform: "uppercase" }}>
                  Consolidated Transfers
                </span>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#1d4ed8", marginTop: "4px" }}>
                  {combinedFinalSettlements.length} {combinedFinalSettlements.length <= 1 ? "Transfer" : "Transfers"}
                </div>
                <span style={{ fontSize: "11.5px", color: "#3b82f6" }}>
                  Single payment per debtor to clear all debts
                </span>
              </div>
            </div>

            {/* Combined Transfers Table */}
            {combinedFinalSettlements.length === 0 ? (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  padding: "20px",
                  borderRadius: "12px",
                  textAlign: "center",
                  color: "#166534",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                🎉 No pending debt settlements! All trip expenses are currently balanced and cleared.
              </div>
            ) : (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #cbd5e1", color: "#334155" }}>
                      <th style={{ padding: "12px 14px", fontWeight: "700", width: "40px" }}>#</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700" }}>Debtor (Who Pays)</th>
                      <th style={{ padding: "12px 10px", fontWeight: "700", textAlign: "center" }}>➔</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700" }}>Creditor (Who Receives)</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700" }}>Transparent Breakdown</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700", textAlign: "right" }}>Final Amount to Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedFinalSettlements.map((item, idx) => {
                      const isMeDebtor = user?.id != null && Number(item.fromUserId) === Number(user.id);
                      const isMeCreditor = user?.id != null && Number(item.toUserId) === Number(user.id);

                      return (
                        <tr
                          key={item.key}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                            transition: "background 0.2s",
                          }}
                        >
                          <td style={{ padding: "14px", color: "#64748b", fontWeight: "700" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: "800", color: "#0f172a", textTransform: "capitalize" }}>
                                {item.fromUserName}
                              </span>
                              {isMeDebtor && (
                                <span
                                  style={{
                                    background: "#fee2e2",
                                    color: "#991b1b",
                                    fontSize: "10.5px",
                                    fontWeight: "800",
                                    padding: "2px 6px",
                                    borderRadius: "8px",
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "14px 10px", textAlign: "center", color: "#94a3b8", fontWeight: "800" }}>
                            ➔
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: "800", color: "#0f172a", textTransform: "capitalize" }}>
                                {item.toUserName}
                              </span>
                              {isMeCreditor && (
                                <span
                                  style={{
                                    background: "#dcfce7",
                                    color: "#166534",
                                    fontSize: "10.5px",
                                    fontWeight: "800",
                                    padding: "2px 6px",
                                    borderRadius: "8px",
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {item.poolAmount > 0.01 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                                  <span style={{ color: "#047857", fontWeight: "700" }}>Way 1 Pool:</span>
                                  <span style={{ fontWeight: "600", color: "#334155" }}>
                                    ₹{item.poolAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {item.subsetAmount > 0.01 && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                                  <span style={{ color: "#2563eb", fontWeight: "700" }}>Way 2 Selective:</span>
                                  <span style={{ fontWeight: "600", color: "#334155" }}>
                                    ₹{item.subsetAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <span style={{ fontSize: "16px", fontWeight: "900", color: "#1e3a8a" }}>
                              ₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION B: 🏁 WAY 1: POOL SETTLEMENT WAY (TRIP-END MASTER POOL)           */}
          {/* ========================================================================= */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              border: "2px solid #a7f3d0",
              borderLeft: "8px solid #059669",
              padding: "28px",
              marginBottom: "36px",
              boxShadow: "0 4px 16px rgba(5, 150, 105, 0.05)",
            }}
          >
            {/* Way 1 Header */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, color: "#065f46", fontSize: "20px", fontWeight: "800" }}>
                  🏁 Way 1: Pool Settlement Way: Trip-End Master Pool Settlement (Total Expenses ÷ Total No. of Members)
                </h3>
                <span
                  style={{
                    background: "#d1fae5",
                    color: "#065f46",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "800",
                    border: "1px solid #6ee7b7",
                  }}
                >
                  Common Pool ({poolExpenses.length} {poolExpenses.length <= 1 ? "Receipt" : "Receipts"})
                </span>
              </div>
              <p style={{ margin: "0 0 10px", color: "#047857", fontSize: "13px" }}>
                Applies to all shared group expenses where all companions were present. Total spent is pooled together and divided equally by total members ({allCompanions.length || 4}).
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #a7f3d0",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  📋 Included Pool Receipts: <strong style={{ color: "#047857" }}>{poolReceiptLabels}</strong>
                </span>
              </div>
            </div>

            {/* Way 1 Full-Width Single-Line Math Banner */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "12px",
                padding: "12px 20px",
                marginBottom: "24px",
                whiteSpace: "nowrap",
                overflowX: "auto",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.05)",
                fontSize: "13.5px",
                fontWeight: "700",
                color: "#166534",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span>
                Total Amt = Total of all Expenses (in Pool settlement way) ÷ Total No. of Members = ₹{totalPoolSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ÷ {allCompanions.length || 4} ={" "}
                <strong style={{ color: "#059669", fontSize: "15px" }}>₹{fairSharePerMember.toFixed(2)} each</strong>
              </span>
            </div>

            {/* Table 1: Member Wise Contribution Table (Net Position = Paid - Share) */}
            <div style={{ marginBottom: "28px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                📊 Member-Wise Contribution Passbook (Who Paid vs Fair Share)
              </h4>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "1.5px solid #cbd5e1", color: "#334155" }}>
                      <th style={{ padding: "12px 16px", fontWeight: "700" }}>Companion</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700" }}>Total Paid Upfront</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700" }}>Fair Share (Total ÷ Total Members: {allCompanions.length || 4})</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700" }}>Net Position (Paid − Share)</th>
                      <th style={{ padding: "12px 16px", fontWeight: "700", textAlign: "right" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poolMemberContributions.map((c) => {
                      const isPositive = c.netBalance > 0.05;
                      const isZero = Math.abs(c.netBalance) <= 0.05;
                      const isCurrentUser = c.userId === user?.id;
                      const memberState = memberPoolSettlementMap[c.userId];
                      const isDebtorPaid = memberState?.isDebtorPaid || isWay1FullySettled;
                      const isCreditorReceived = memberState?.isCreditorReceived || isWay1FullySettled;
                      const isMemberSettled =
                        isZero ||
                        isWay1FullySettled ||
                        (c.status === "OWES" && isDebtorPaid) ||
                        (c.status === "RECEIVES" && isCreditorReceived);

                      return (
                        <tr
                          key={c.userId}
                          style={{
                            borderBottom: "1px solid #e2e8f0",
                            background: isMemberSettled ? "#f0fdf4" : "transparent",
                          }}
                        >
                          <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  background: isMemberSettled
                                    ? "#d1fae5"
                                    : isPositive
                                    ? "#d1fae5"
                                    : isZero
                                    ? "#f1f5f9"
                                    : "#fee2e2",
                                  color: isMemberSettled
                                    ? "#065f46"
                                    : isPositive
                                    ? "#065f46"
                                    : isZero
                                    ? "#475569"
                                    : "#991b1b",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: "800",
                                }}
                              >
                                {(c.userName || "U")[0].toUpperCase()}
                              </span>
                              <span>
                                {c.userName} {isCurrentUser ? "(You)" : ""}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>
                            ₹{c.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#475569" }}>
                            ₹{c.fairShare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: "800" }}>
                            <span style={{ color: isPositive ? "#059669" : isZero ? "#64748b" : "#dc2626" }}>
                              {isPositive ? "+" : ""}₹{c.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: "800",
                                background: isMemberSettled
                                  ? "#ecfdf5"
                                  : isPositive
                                  ? "#eff6ff"
                                  : isZero
                                  ? "#f8fafc"
                                  : "#fef2f2",
                                color: isMemberSettled
                                  ? "#059669"
                                  : isPositive
                                  ? "#0284c7"
                                  : isZero
                                  ? "#64748b"
                                  : "#dc2626",
                                border: isMemberSettled
                                  ? "1px solid #6ee7b7"
                                  : isPositive
                                  ? "1px solid #bae6fd"
                                  : isZero
                                  ? "1px solid #cbd5e1"
                                  : "1px solid #fca5a5",
                              }}
                            >
                              {c.status === "OWES"
                                ? isDebtorPaid
                                  ? "✅ Paid"
                                  : "🔴 Owes"
                                : c.status === "RECEIVES"
                                ? isCreditorReceived
                                  ? "✅ Received"
                                  : "🟢 Receives"
                                : "✅ Settled"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1", fontWeight: "800", color: "#0f172a" }}>
                      <td style={{ padding: "12px 16px" }}>Grand Total</td>
                      <td style={{ padding: "12px 16px" }}>
                        ₹{totalPoolSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        ₹{totalPoolSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#059669" }}>
                        ₹0.00 (Balanced)
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: "800",
                            background: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #6ee7b7",
                          }}
                        >
                          ⚖️ 100% Balanced
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Table 2: Logical Direct Settlement Plan ("Who Pays Whom") */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                    ⚖️ Logical Settlement Plan (Who Has to Pay to Whom)
                  </h4>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Minimal direct transfers to zero out all pool balances at the end of the trip.
                  </span>
                </div>

                {poolSettlementTransfers.length > 0 && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleMarkAllPoolSettled}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#059669",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "700",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
                      }}
                    >
                      💳 Mark All as Paid
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAllPoolTransfers}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#ffffff",
                        color: "#64748b",
                        fontSize: "12px",
                        fontWeight: "700",
                        border: "1px solid #cbd5e1",
                        cursor: "pointer",
                      }}
                    >
                      ↩️ Reset All
                    </button>
                  </div>
                )}
              </div>

              {isWay1FullySettled && poolSettlementTransfers.length > 0 && (
                <div
                  style={{
                    background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                    border: "1.5px solid #6ee7b7",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#065f46",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "22px" }}>🎉</span>
                    <div>
                      <strong style={{ fontSize: "14px", display: "block" }}>
                        Way 1 Master Pool is 100% Fully Settled!
                      </strong>
                      <span style={{ fontSize: "12px", color: "#047857" }}>
                        All members have paid what they owe. All Way 1 pool expenses in the summary section below are marked as Settled.
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#059669",
                      color: "#ffffff",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "800",
                    }}
                  >
                    ✅ 100% Settled
                  </span>
                </div>
              )}

              {poolSettlementTransfers.length === 0 ? (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px dashed #6ee7b7",
                    borderRadius: "12px",
                    padding: "20px",
                    textAlign: "center",
                    color: "#065f46",
                    fontWeight: "700",
                  }}
                >
                  🎉 All companion pool balances are completely even! Nobody owes anything.
                </div>
              ) : (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: "1.5px solid #e2e8f0",
                    overflowX: "auto",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                        <th style={{ padding: "12px 16px", fontWeight: "700" }}>#</th>
                        <th style={{ padding: "12px 16px", fontWeight: "700" }}>Transfer Action</th>
                        <th style={{ padding: "12px 16px", fontWeight: "700" }}>Amount to Pay</th>
                        <th style={{ padding: "12px 16px", fontWeight: "700" }}>Status</th>
                        <th style={{ padding: "12px 16px", fontWeight: "700", textAlign: "right" }}>Quick Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poolSettlementTransfers.map((transfer, idx) => {
                        const isSettled = settledPoolTransferIds.has(transfer.id);

                        return (
                          <tr
                            key={transfer.id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: isSettled ? "#f0fdf4" : "transparent",
                            }}
                          >
                            <td style={{ padding: "12px 16px", fontWeight: "700", color: "#64748b" }}>
                              Row {idx + 1}
                            </td>
                            <td style={{ padding: "12px 16px", color: "#0f172a" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <strong style={{ color: "#991b1b" }}>{transfer.fromUserName}</strong>
                                <span style={{ color: "#64748b", fontSize: "12px" }}>pays</span>
                                <span style={{ fontSize: "14px" }}>➔</span>
                                <strong style={{ color: "#065f46" }}>{transfer.toUserName}</strong>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", fontWeight: "800", color: "#0f172a", fontSize: "14px" }}>
                              ₹{transfer.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              {isSettled ? (
                                <span
                                  style={{
                                    background: "#d1fae5",
                                    color: "#065f46",
                                    padding: "3px 10px",
                                    borderRadius: "10px",
                                    fontSize: "12px",
                                    fontWeight: "800",
                                    border: "1px solid #a7f3d0",
                                  }}
                                >
                                  ✅ Paid
                                </span>
                              ) : (
                                <span
                                  style={{
                                    background: "#fee2e2",
                                    color: "#991b1b",
                                    padding: "3px 10px",
                                    borderRadius: "10px",
                                    fontSize: "12px",
                                    fontWeight: "800",
                                    border: "1px solid #fca5a5",
                                  }}
                                >
                                  ⏳ Unsettled
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => handleTogglePoolTransfer(transfer.id)}
                                style={{
                                  padding: "6px 14px",
                                  borderRadius: "8px",
                                  border: isSettled ? "1px solid #cbd5e1" : "none",
                                  background: isSettled ? "#ffffff" : "#059669",
                                  color: isSettled ? "#475569" : "#ffffff",
                                  fontWeight: "700",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  boxShadow: isSettled ? "none" : "0 2px 6px rgba(5, 150, 105, 0.25)",
                                }}
                              >
                                {isSettled ? "↩️ Mark Unpaid" : "💳 Mark as Paid"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 1.3: Itemized Pool Receipts Breakdown */}
            <div style={{ marginTop: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                    🧾 Itemized Pool Receipts Breakdown ({poolExpenses.length} Common {poolExpenses.length <= 1 ? "Receipt" : "Receipts"})
                  </h4>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Granular details for every expense pooled equally across all {allCompanions.length || 4} {(allCompanions.length || 4) <= 1 ? "companion" : "companions"}.
                  </span>
                </div>
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#065f46",
                    border: "1px solid #a7f3d0",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "800",
                  }}
                >
                  Way 1 Master Pool
                </span>
              </div>

              {poolExpenses.length === 0 ? (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", color: "#64748b", textAlign: "center", fontSize: "13px" }}>
                  No pool receipts found.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {[...poolExpenses]
                    .sort((a, b) => Number(a.id) - Number(b.id))
                    .map((exp) => {
                      const theme = getCategoryTheme(exp.category);
                      const payerName = resolvePayerName(exp);
                      const expGlobalIndex = expenseNumberMap.get(exp.id) || exp.id;
                      const memberCount = allCompanions.length || 1;
                      const equalShare = (parseFloat(exp.amount) / memberCount).toFixed(2);

                      return (
                        <div
                          key={exp.id}
                          style={{
                            background: "#ffffff",
                            borderRadius: "14px",
                            border: "1px solid #a7f3d0",
                            borderLeft: "6px solid #059669",
                            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.04)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              padding: "14px 18px",
                              background: isWay1FullySettled ? "#f0fdf4" : "#f0fdfa",
                              borderBottom: "1px solid #ccfbf1",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <span
                                style={{
                                  background: "#059669",
                                  color: "#ffffff",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "800",
                                }}
                              >
                                Expense #{expGlobalIndex}
                              </span>
                              <span
                                style={{
                                  background: theme.lightBg,
                                  color: theme.primary,
                                  border: `1px solid ${theme.border}`,
                                  padding: "3px 10px",
                                  borderRadius: "16px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                }}
                              >
                                {theme.icon} {theme.label}
                              </span>
                              <strong style={{ fontSize: "15px", color: "#0f172a" }}>{exp.description}</strong>

                              {/* Dual Dates: Bill Date & Entry Date */}
                              <span
                                title="Date on bill/receipt"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: "#ffffff",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  fontWeight: "600",
                                  color: "#1e293b",
                                  fontSize: "12px",
                                }}
                              >
                                🧾 <strong>Bill:</strong> {formatDisplayDate(exp.expenseDate)}
                              </span>

                              <span
                                title="Date recorded into TripNest"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: "#ecfdf5",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #a7f3d0",
                                  fontWeight: "600",
                                  color: "#065f46",
                                  fontSize: "12px",
                                }}
                              >
                                📝 <strong>Entry:</strong> {formatDisplayDate(exp.entryDate || exp.createdAt)}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>
                                Paid by <strong style={{ color: "#059669" }}>{payerName}</strong>
                              </span>
                              <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                                ₹{parseFloat(exp.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </strong>
                              <span
                                style={{
                                  background: isWay1FullySettled ? "#d1fae5" : "#e0f2fe",
                                  color: isWay1FullySettled ? "#065f46" : "#0369a1",
                                  border: isWay1FullySettled ? "1px solid #6ee7b7" : "1px solid #bae6fd",
                                  padding: "3px 8px",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                }}
                              >
                                {isWay1FullySettled ? "✅ Settled via Master Pool" : `Shared by ${memberCount} ${memberCount <= 1 ? "member" : "members"} (≈₹${equalShare} each)`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION C: 🧾 WAY 2: EXPENSEWISE SETTLEMENT WAY (ITEMIZED SUBSETS)        */}
          {/* ========================================================================= */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              border: "2px solid #bae6fd",
              borderLeft: "8px solid #0284c7",
              padding: "28px",
              marginBottom: "36px",
              boxShadow: "0 4px 16px rgba(2, 132, 199, 0.06)",
            }}
          >
            {/* Way 2 Header */}
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, color: "#0369a1", fontSize: "20px", fontWeight: "800" }}>
                  🧾 Way 2: ExpenseWise Settlement Way: Itemized Receipt-by-Receipt Split (Granular Ledger)
                </h3>
                <span
                  style={{
                    background: "#e0f2fe",
                    color: "#0369a1",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "800",
                    border: "1px solid #7dd3fc",
                  }}
                >
                  Subset Activities ({subsetExpenses.length} {subsetExpenses.length <= 1 ? "Receipt" : "Receipts"})
                </span>
              </div>
              <p style={{ margin: "0 0 10px", color: "#0284c7", fontSize: "13px" }}>
                Dedicated settlement for selective expenses where only a few companions participated (e.g. only 2 or 3 members joined, like paragliding, private cabs, or specialty dinners).
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    background: "#f0f9ff",
                    color: "#0369a1",
                    border: "1px solid #bae6fd",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  📋 Included Selective Receipts: <strong style={{ color: "#0284c7" }}>{subsetReceiptLabels}</strong>
                </span>
                <span
                  style={{
                    background: "#f0f9ff",
                    color: "#0369a1",
                    border: "1px solid #bae6fd",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  💰 Total Spent on Selective Activities: <strong>₹{totalSubsetSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </div>

            {subsetExpenses.length === 0 ? (
              <div
                style={{
                  background: "#f0f9ff",
                  border: "1.5px dashed #bae6fd",
                  borderRadius: "14px",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: "32px", display: "block", marginBottom: "6px" }}>🏖️</span>
                <strong style={{ color: "#0369a1", fontSize: "15px" }}>
                  No subset expenses recorded yet!
                </strong>
                <p style={{ margin: "4px 0 0", color: "#0284c7", fontSize: "13px" }}>
                  Currently, all logged bills belong to the full squad pool (Way 1). When you log an expense and uncheck absent companions in the modal (e.g. Expense between Kim & Aln, or Kim, Aln & Bell), it will appear here for direct receipt-by-receipt settlement.
                </p>
              </div>
            ) : (
              <div>
                {/* Table 1: Member-Wise Activity Balance Passbook */}
                <div style={{ marginBottom: "28px" }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                    📊 Member-Wise Activity Balance Passbook (Selective Activities Ledger)
                  </h4>
                  <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#64748b" }}>
                    Aggregated summary across all selective receipts ({subsetReceiptLabels}). Tracks who paid upfront vs consumed share with penny-remainder precision.
                  </p>

                  <div
                    style={{
                      background: "#f8fafc",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      overflowX: "auto",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f0f9ff", borderBottom: "1.5px solid #bae6fd", color: "#0369a1" }}>
                          <th style={{ padding: "12px 16px", fontWeight: "700" }}>Companion</th>
                          <th style={{ padding: "12px 16px", fontWeight: "700" }}>Selective Activities Joined</th>
                          <th style={{ padding: "12px 16px", fontWeight: "700" }}>Total Paid Upfront</th>
                          <th style={{ padding: "12px 16px", fontWeight: "700" }}>Consumed Cost Share</th>
                          <th style={{ padding: "12px 16px", fontWeight: "700" }}>Net Position (Paid − Share)</th>
                          <th style={{ padding: "12px 16px", fontWeight: "700", textAlign: "right" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subsetMemberContributions.map((c) => {
                          const isPositive = c.netBalance > 0.05;
                          const isZero = Math.abs(c.netBalance) <= 0.05;
                          const isCurrentUser = c.userId === user?.id;

                          return (
                            <tr key={c.userId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      background: isPositive ? "#e0f2fe" : isZero ? "#f1f5f9" : "#fee2e2",
                                      color: isPositive ? "#0369a1" : isZero ? "#475569" : "#991b1b",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "12px",
                                      fontWeight: "800",
                                    }}
                                  >
                                    {(c.userName || "U")[0].toUpperCase()}
                                  </span>
                                  <span>
                                    {c.userName} {isCurrentUser ? "(You)" : ""}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                {c.activitiesJoinedCount > 0 ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                    <span
                                      style={{
                                        background: "#e0f2fe",
                                        color: "#0369a1",
                                        padding: "2px 8px",
                                        borderRadius: "8px",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                      }}
                                    >
                                      {c.activitiesJoinedCount} {c.activitiesJoinedCount === 1 ? "activity" : "activities"}
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                                      ({c.joinedExpenseNumbers.join(", ")})
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                                    0 activities (Not Joined)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>
                                ₹{c.totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "12px 16px", color: "#475569" }}>
                                ₹{c.consumedShare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: "12px 16px", fontWeight: "800" }}>
                                <span style={{ color: isPositive ? "#0284c7" : isZero ? "#64748b" : "#dc2626" }}>
                                  {isPositive ? "+" : ""}₹{c.netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                <span
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    background: isPositive ? "#e0f2fe" : isZero ? "#f8fafc" : "#fef2f2",
                                    color: isPositive ? "#0369a1" : isZero ? "#64748b" : "#dc2626",
                                    border: isPositive ? "1px solid #7dd3fc" : isZero ? "1px solid #cbd5e1" : "1px solid #fca5a5",
                                  }}
                                >
                                  {c.status === "RECEIVES" ? "🟢 Receives" : c.status === "OWES" ? "🔴 Owes" : "⚪ Settled"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#f8fafc", borderTop: "2px solid #bae6fd", fontWeight: "800", color: "#0f172a" }}>
                          <td style={{ padding: "12px 16px" }}>Grand Total</td>
                          <td style={{ padding: "12px 16px", color: "#0369a1" }}>
                            {subsetExpenses.length} {subsetExpenses.length <= 1 ? "Receipt" : "Receipts"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            ₹{totalSubsetSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            ₹{totalSubsetSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#0284c7" }}>
                            ₹0.00 (Balanced)
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: "800",
                                background: "#e0f2fe",
                                color: "#0369a1",
                                border: "1px solid #7dd3fc",
                              }}
                            >
                              ⚖️ 100% Balanced
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Table 2: Way 2 Logical Settlement Plan ("Who Pays Whom for Selective Activities") */}
                <div style={{ marginBottom: "28px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                        ⚖️ Way 2 Logical Settlement Plan (Who Pays Whom for Selective Activities)
                      </h4>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Minimal direct transfers calculated via Greedy Debt Minimization to settle all selective activities in 1 consolidated payment per debtor.
                      </span>
                    </div>
                  </div>

                  {subsetSettlementTransfers.length === 0 ? (
                    <div
                      style={{
                        background: "#f0f9ff",
                        border: "1px dashed #7dd3fc",
                        borderRadius: "12px",
                        padding: "20px",
                        textAlign: "center",
                        color: "#0369a1",
                        fontWeight: "700",
                      }}
                    >
                      🎉 All selective activity balances are completely even! Nobody owes anything.
                    </div>
                  ) : (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        border: "1.5px solid #e2e8f0",
                        overflowX: "auto",
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569" }}>
                            <th style={{ padding: "12px 16px", fontWeight: "700" }}>#</th>
                            <th style={{ padding: "12px 16px", fontWeight: "700" }}>Transfer Action</th>
                            <th style={{ padding: "12px 16px", fontWeight: "700" }}>Amount to Pay</th>
                            <th style={{ padding: "12px 16px", fontWeight: "700" }}>Status</th>
                            <th style={{ padding: "12px 16px", fontWeight: "700", textAlign: "right" }}>Quick Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subsetSettlementTransfers.map((transfer, idx) => {
                            const isSettled = settledSubsetTransferIds.has(transfer.id);

                            return (
                              <tr
                                key={transfer.id}
                                style={{
                                  borderBottom: "1px solid #f1f5f9",
                                  background: isSettled ? "#f0f9ff" : "transparent",
                                }}
                              >
                                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#64748b" }}>
                                  Row {idx + 1}
                                </td>
                                <td style={{ padding: "12px 16px", color: "#0f172a" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <strong style={{ color: "#991b1b" }}>{transfer.fromUserName}</strong>
                                    <span style={{ color: "#64748b", fontSize: "12px" }}>pays</span>
                                    <span style={{ fontSize: "14px" }}>➔</span>
                                    <strong style={{ color: "#0369a1" }}>{transfer.toUserName}</strong>
                                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                                      (clears all selective debts)
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: "12px 16px", fontWeight: "800", color: "#0f172a", fontSize: "14px" }}>
                                  ₹{transfer.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: "12px 16px" }}>
                                  <span
                                    style={{
                                      padding: "3px 10px",
                                      borderRadius: "10px",
                                      fontSize: "11px",
                                      fontWeight: "800",
                                      background: isSettled ? "#e0f2fe" : "#fef3c7",
                                      color: isSettled ? "#0369a1" : "#92400e",
                                      border: isSettled ? "1px solid #7dd3fc" : "1px solid #fcd34d",
                                    }}
                                  >
                                    {isSettled ? "✅ Paid" : "⏳ Unsettled"}
                                  </span>
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSubsetTransfer(transfer.id)}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: "8px",
                                      border: isSettled ? "1px solid #cbd5e1" : "none",
                                      background: isSettled ? "#ffffff" : "#0284c7",
                                      color: isSettled ? "#475569" : "#ffffff",
                                      fontWeight: "700",
                                      fontSize: "12px",
                                      cursor: "pointer",
                                      boxShadow: isSettled ? "none" : "0 2px 6px rgba(2, 132, 199, 0.25)",
                                    }}
                                  >
                                    {isSettled ? "↩️ Mark Unpaid" : "💳 Mark as Paid"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section 2.3: Itemized Receipts Breakdown */}
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                    🧾 Itemized Receipts Breakdown ({subsetExpenses.length} Selective {subsetExpenses.length <= 1 ? "Receipt" : "Receipts"})
                  </h4>
                  <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#64748b" }}>
                    Granular breakdown of each selective receipt with exact penny allocation across participants.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {[...subsetExpenses]
                      .sort((a, b) => Number(a.id) - Number(b.id))
                      .map((exp) => {
                        const theme = getCategoryTheme(exp.category);
                        const expenseSplits = splitsByExpenseId[exp.id] || [];
                        const payerName = resolvePayerName(exp);
                        const expGlobalIndex = expenseNumberMap.get(exp.id) || exp.id;
                        const memberCount = expenseSplits.length || 1;
                        const pennyMap = allocatePenniesEqually(exp.amount, expenseSplits.map((s) => s.userId));

                      return (
                        <div
                          key={exp.id}
                          style={{
                            background: "#ffffff",
                            borderRadius: "14px",
                            border: "1px solid #bae6fd",
                            borderLeft: `6px solid #0284c7`,
                            boxShadow: "0 2px 8px rgba(2, 132, 199, 0.04)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              padding: "14px 18px",
                              background: "#f0f9ff",
                              borderBottom: "1px solid #e0f2fe",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "10px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <span
                                style={{
                                  background: "#0284c7",
                                  color: "#ffffff",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "800",
                                }}
                              >
                                Expense #{expGlobalIndex}
                              </span>
                              <span
                                style={{
                                  background: theme.lightBg,
                                  color: theme.primary,
                                  border: `1px solid ${theme.border}`,
                                  padding: "3px 10px",
                                  borderRadius: "16px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                }}
                              >
                                {theme.icon} {theme.label}
                              </span>
                              <strong style={{ fontSize: "15px", color: "#0f172a" }}>{exp.description}</strong>

                              {/* Dual Dates: Bill Date & Entry Date */}
                              <span
                                title="Date on bill/receipt"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: "#ffffff",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  fontWeight: "600",
                                  color: "#1e293b",
                                  fontSize: "12px",
                                }}
                              >
                                🧾 <strong>Bill:</strong> {formatDisplayDate(exp.expenseDate)}
                              </span>

                              <span
                                title="Date recorded into TripNest"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: "#f0f9ff",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #bae6fd",
                                  fontWeight: "600",
                                  color: "#0369a1",
                                  fontSize: "12px",
                                }}
                              >
                                📝 <strong>Entry:</strong> {formatDisplayDate(exp.entryDate || exp.createdAt)}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>
                                Paid by <strong style={{ color: "#0284c7" }}>{payerName}</strong>
                              </span>
                              <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                                ₹{parseFloat(exp.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </strong>
                              <span
                                style={{
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                  border: "1px solid #bae6fd",
                                  padding: "3px 8px",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                }}
                              >
                                Shared among {memberCount} {memberCount <= 1 ? "member" : "members"} (≈₹{(parseFloat(exp.amount) / memberCount).toFixed(2)} each)
                              </span>
                            </div>
                          </div>

                          {/* Participant Shares */}
                          <div style={{ padding: "16px 18px" }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "10px",
                              }}
                            >
                              {expenseSplits.map((split) => {
                                const isPayer =
                                  (split.userId && exp.paidByUserId && Number(split.userId) === Number(exp.paidByUserId)) ||
                                  split.userName === payerName;
                                const participantShare =
                                  pennyMap[split.userId] !== undefined
                                    ? pennyMap[split.userId]
                                    : parseFloat(exp.amount) / memberCount;

                                return (
                                  <div
                                    key={split.id}
                                    style={{
                                      background: split.isSettled ? "#f0fdf4" : isPayer ? "#f8fafc" : "#ffffff",
                                      border: split.isSettled
                                        ? "1px solid #bbf7d0"
                                        : isPayer
                                        ? "1.5px solid #cbd5e1"
                                        : "1.5px solid #bae6fd",
                                      borderRadius: "10px",
                                      padding: "10px 12px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "8px",
                                    }}
                                  >
                                    <div>
                                      <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>
                                        {split.userName} {split.userId === user?.id ? "(You)" : ""}
                                      </strong>
                                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                                        {isPayer ? `Paid full bill (Own share)` : `Owes ${payerName}`}
                                      </span>
                                    </div>

                                    <div style={{ textAlign: "right" }}>
                                      <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>
                                        ₹{participantShare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </strong>

                                      {isPayer ? (
                                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#0284c7" }}>
                                          ✅ Paid Upfront
                                        </span>
                                      ) : split.isSettled ? (
                                        <span style={{ fontSize: "11px", fontWeight: "700", color: "#059669" }}>
                                          ✅ Settled
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={actionLoadingId === split.id}
                                          onClick={() => handleSettleSplit(split.id)}
                                          style={{
                                            marginTop: "2px",
                                            padding: "3px 8px",
                                            borderRadius: "6px",
                                            background: "#0284c7",
                                            color: "#ffffff",
                                            border: "none",
                                            fontWeight: "700",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                          }}
                                        >
                                          {actionLoadingId === split.id ? "Settling..." : "💳 Mark Settled"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: 📑 SUMMARY OF ALL EXPENSES & FINAL MASTER SETTLEMENT           */}
          {/* ========================================================================= */}
          <div style={{ marginBottom: "36px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: "20px", fontWeight: "800" }}>
                  📑 Section 3: Summary of Expenses & Final Master Settlement ({expenses.length} Total {expenses.length <= 1 ? "Receipt" : "Receipts"})
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                  Complete itemized breakdown of all {expenses.length} trip {expenses.length <= 1 ? "receipt" : "receipts"} with category color borders and companion share allocations.
                </p>
              </div>

              {/* Filter Pills */}
              <div
                style={{
                  display: "flex",
                  background: "#f1f5f9",
                  padding: "4px",
                  borderRadius: "12px",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSummaryFilterMode("ALL")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    background: summaryFilterMode === "ALL" ? "#ffffff" : "transparent",
                    color: summaryFilterMode === "ALL" ? "#0f172a" : "#64748b",
                    boxShadow: summaryFilterMode === "ALL" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  All ({expenses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryFilterMode("POOL")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    background: summaryFilterMode === "POOL" ? "#ffffff" : "transparent",
                    color: summaryFilterMode === "POOL" ? "#059669" : "#64748b",
                    boxShadow: summaryFilterMode === "POOL" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  🏁 Way 1 Pool ({poolExpenses.length})
                </button>
                  <button
                  type="button"
                  onClick={() => setSummaryFilterMode("SUBSET")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    background: summaryFilterMode === "SUBSET" ? "#ffffff" : "transparent",
                    color: summaryFilterMode === "SUBSET" ? "#0284c7" : "#64748b",
                    boxShadow: summaryFilterMode === "SUBSET" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  🧾 Way 2 Subset ({subsetExpenses.length})
                </button>
              </div>
            </div>

            {/* List of Individual Expense Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {displayedSummaryExpenses.map((exp, idx) => {
                const theme = getCategoryTheme(exp.category);
                const expenseSplits = splitsByExpenseId[exp.id] || [];
                const isSplit = expenseSplits.length > 0;
                const payerName = resolvePayerName(exp);
                const isFullPool = expenseSplits.length === (allCompanions.length || 4) || expenseSplits.length === 0;
                const pennyMap = allocatePenniesEqually(exp.amount, expenseSplits.map((s) => s.userId));

                return (
                  <div
                    key={exp.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      borderLeft: `6px solid ${theme.primary}`,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "16px 20px",
                        background: theme.bg,
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            background: theme.primary,
                            color: "#ffffff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "800",
                          }}
                        >
                          Expense #{expenseNumberMap.get(exp.id) || (idx + 1)}
                        </span>

                        <span
                          style={{
                            background: theme.lightBg,
                            color: theme.primary,
                            border: `1px solid ${theme.border}`,
                            padding: "3px 10px",
                            borderRadius: "16px",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          {theme.icon} {theme.label}
                        </span>

                        <strong style={{ fontSize: "15px", color: "#0f172a" }}>{exp.description}</strong>

                        {/* Dual Dates: Bill Date & Entry Date */}
                        <span
                          title="Date on bill/receipt"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#ffffff",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            fontWeight: "600",
                            color: "#1e293b",
                            fontSize: "12px",
                          }}
                        >
                          🧾 <strong>Bill:</strong> {formatDisplayDate(exp.expenseDate)}
                        </span>

                        <span
                          title="Date recorded into TripNest"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#f0fdfa",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: "1px solid #ccfbf1",
                            fontWeight: "600",
                            color: "#0f766e",
                            fontSize: "12px",
                          }}
                        >
                          📝 <strong>Entry:</strong> {formatDisplayDate(exp.entryDate || exp.createdAt)}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", display: "block" }}>
                            Total Bill
                          </span>
                          <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                            ₹{parseFloat(exp.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#334155",
                            padding: "4px 10px",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          👤 Paid by {payerName}
                        </span>

                        <span
                          style={{
                            background: isFullPool
                              ? isWay1FullySettled
                                ? "#d1fae5"
                                : "#e0f2fe"
                              : "#e0f2fe",
                            color: isFullPool
                              ? isWay1FullySettled
                                ? "#065f46"
                                : "#0369a1"
                              : "#0369a1",
                            border: isFullPool
                              ? isWay1FullySettled
                                ? "1px solid #6ee7b7"
                                : "1px solid #bae6fd"
                              : "1px solid #bae6fd",
                            padding: "4px 10px",
                            borderRadius: "14px",
                            fontSize: "11px",
                            fontWeight: "800",
                          }}
                        >
                          {isFullPool
                            ? isWay1FullySettled
                              ? "🏁 Way 1 (Pool) • ✅ Settled"
                              : "🏁 Way 1 (Pool)"
                            : `🧾 Way 2 (${expenseSplits.length} ${expenseSplits.length <= 1 ? "Member" : "Members"})`}
                        </span>
                      </div>
                    </div>

                    {/* Member Shares */}
                    <div style={{ padding: "16px 20px" }}>
                      {isSplit ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          {expenseSplits.map((s) => {
                            const computedShare =
                              pennyMap[s.userId] !== undefined
                                ? pennyMap[s.userId]
                                : expenseSplits.length > 0
                                ? parseFloat(exp.amount) / expenseSplits.length
                                : parseFloat(s.shareAmount || 0);

                            // Reactive settlement status:
                            // If it's a Way 1 pool expense, when the pool is fully settled OR when this member has paid what they owe,
                            // mark this share as Settled.
                            const memberState = memberPoolSettlementMap[s.userId];
                            const isMemberSettledInPool =
                              isFullPool &&
                              (isWay1FullySettled || memberState?.isDebtorPaid || memberState?.isBalanced);
                            const isShareSettled = s.isSettled || isMemberSettledInPool;

                            return (
                              <div
                                key={s.id}
                                style={{
                                  background: isShareSettled ? "#f0fdf4" : "#ffffff",
                                  border: isShareSettled ? "1px solid #bbf7d0" : "1.5px solid #fca5a5",
                                  borderRadius: "10px",
                                  padding: "10px 12px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                }}
                              >
                                <div>
                                  <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>
                                    {s.userName} {s.userId === user?.id ? "(You)" : ""}
                                  </strong>
                                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                                    {s.userName === payerName ? "Payer share" : "Companion share"}
                                  </span>
                                </div>

                                <div style={{ textAlign: "right" }}>
                                  <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>
                                    ₹{computedShare.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </strong>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      color: isShareSettled ? "#059669" : "#dc2626",
                                    }}
                                  >
                                    {isShareSettled ? "✅ Settled" : "⏳ Pending"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : isWay1FullySettled ? (
                        <div
                          style={{
                            background: "#ecfdf5",
                            border: "1px dashed #6ee7b7",
                            borderRadius: "10px",
                            padding: "12px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <span style={{ fontSize: "13px", color: "#065f46", fontWeight: "700" }}>
                            🎉 Settled via Way 1 Master Pool • All companion transfers completed!
                          </span>
                          <span
                            style={{
                              background: "#d1fae5",
                              color: "#065f46",
                              padding: "3px 10px",
                              borderRadius: "10px",
                              fontSize: "12px",
                              fontWeight: "800",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            ✅ 100% Settled
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            background: "#fffbeb",
                            border: "1px dashed #fcd34d",
                            borderRadius: "10px",
                            padding: "12px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "10px",
                          }}
                        >
                          <span style={{ fontSize: "13px", color: "#92400e", fontWeight: "600" }}>
                            Included in Way 1 Master Pool (Divided equally by {allCompanions.length || 4} {(allCompanions.length || 4) <= 1 ? "member" : "members"} at journey end).
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenSplitModal(exp.id)}
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            ✏️ Customize Shares
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Split Modal Dialog */}
      {isSplitModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="modal-card"
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid #e2e8f0",
              padding: "28px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>
                ✨ Split a Trip Expense
              </h3>
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  background: "#fef2f2",
                  color: "#991b1b",
                  border: "1px solid #fecaca",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitSplit}>
              {/* Select Expense Dropdown */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Select Expense to Split *
                </label>
                {expenses.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "#991b1b", margin: 0 }}>
                    No expenses found. Log an expense first before splitting!
                  </p>
                ) : (
                  <select
                    value={selectedExpenseId}
                    onChange={(e) => setSelectedExpenseId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  >
                    {expenses.map((exp, i) => (
                      <option key={exp.id} value={exp.id}>
                        #{i + 1} {exp.description} — ₹{parseFloat(exp.amount).toFixed(2)} ({exp.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bill Details Info Box */}
              {activeExpense && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Total Bill Amount</span>
                    <strong style={{ display: "block", fontSize: "18px", color: "#0f172a" }}>
                      ₹{activeExpenseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#475569" }}>🧾 Bill: {formatDisplayDate(activeExpense.expenseDate)}</span>
                      <span style={{ fontSize: "11px", color: "#0f766e" }}>📝 Entry: {formatDisplayDate(activeExpense.entryDate || activeExpense.createdAt)}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Paid By</span>
                    <strong style={{ display: "block", fontSize: "14px", color: "#059669" }}>
                      {resolvePayerName(activeExpense)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Split Mode Selector (Equal vs Custom) */}
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
                  Split Method *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setSplitType("EQUAL")}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: splitType === "EQUAL" ? "2px solid #059669" : "1.5px solid #cbd5e1",
                      background: splitType === "EQUAL" ? "#ecfdf5" : "#ffffff",
                      color: splitType === "EQUAL" ? "#065f46" : "#475569",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    ⚖️ Equal Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType("CUSTOM")}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: splitType === "CUSTOM" ? "2px solid #059669" : "1.5px solid #cbd5e1",
                      background: splitType === "CUSTOM" ? "#ecfdf5" : "#ffffff",
                      color: splitType === "CUSTOM" ? "#065f46" : "#475569",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Custom Shares
                  </button>
                </div>
              </div>

              {/* Select Members Section */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                    Select Companions to Share ({selectedUserIds.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const companionsToUse = allCompanions.length > 0 ? allCompanions : groupMembers;
                      if (selectedUserIds.length === companionsToUse.length) {
                        setSelectedUserIds([]);
                      } else {
                        setSelectedUserIds(companionsToUse.map((m) => m.userId));
                      }
                    }}
                    style={{ background: "none", border: "none", color: "#059669", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                  >
                    {selectedUserIds.length === (allCompanions.length || groupMembers.length) ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {(allCompanions.length > 0 ? allCompanions : groupMembers).map((member) => {
                    const isChecked = selectedUserIds.includes(member.userId);
                    return (
                      <div
                        key={member.userId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: isChecked ? "#f0fdf4" : "transparent",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                            flex: 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleUser(member.userId)}
                            style={{ width: "16px", height: "16px", accentColor: "#059669" }}
                          />
                          <div>
                            <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                              {member.name} {member.userId === user?.id ? "(You)" : ""}
                            </strong>
                            <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>
                              {member.email}
                            </span>
                          </div>
                        </label>

                        {isChecked && (
                          <div style={{ textAlign: "right" }}>
                            {splitType === "EQUAL" ? (
                              <span style={{ fontWeight: "700", color: "#059669", fontSize: "13px" }}>
                                ₹{equalPerPerson}
                              </span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={customShares[member.userId] || ""}
                                onChange={(e) => handleCustomAmountChange(member.userId, e.target.value)}
                                style={{
                                  width: "90px",
                                  padding: "6px 8px",
                                  borderRadius: "8px",
                                  border: "1.5px solid #cbd5e1",
                                  fontSize: "13px",
                                  textAlign: "right",
                                  outline: "none",
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedUserIds.length > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      fontSize: "12px",
                      color: "#475569",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    {splitType === "EQUAL" ? (
                      <span>
                        ₹{activeExpenseAmount.toFixed(2)} ÷ {selectedUserIds.length} {selectedUserIds.length <= 1 ? "member" : "members"} ={" "}
                        <strong style={{ color: "#059669" }}>₹{equalPerPerson} each</strong>
                      </span>
                    ) : (
                      <span>
                        Allocated: <strong>₹{customSum.toFixed(2)}</strong> / ₹{activeExpenseAmount.toFixed(2)}{" "}
                        {Math.abs(activeExpenseAmount - customSum) > 0.05 ? (
                          <span style={{ color: "#dc2626", fontWeight: "700" }}>
                            (Diff: ₹{(activeExpenseAmount - customSum).toFixed(2)})
                          </span>
                        ) : (
                          <span style={{ color: "#059669", fontWeight: "700" }}>✅ Matches 100%</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsSplitModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting || expenses.length === 0}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                    opacity: modalSubmitting ? 0.7 : 1,
                  }}
                >
                  {modalSubmitting ? "Splitting..." : "✨ Confirm & Split"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
