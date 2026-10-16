/**
 * TripNest Grand Unified Settlement Engine
 * 
 * Centralized, pure calculation engine that unifies:
 * - Way 1 (Master Pool Equal Split)
 * - Way 2 (Selective Activity Splits)
 * - Grand Unified Final Settlement Plan (Combined Transparent Sum)
 * 
 * Used by:
 * 1. MyTrips > SharedExpensesTab.jsx (trip-level ledger)
 * 2. Dashboard.jsx > Section 5: Shared Expenses & Debt Settlement (cross-trip portfolio passbook)
 */

/**
 * Distribute an expense amount equally among participant userIds with penny-rounding adjustment.
 * Allocates remainder cents to the earliest participants so that sum of shares strictly equals totalAmount.
 */
export function allocatePenniesEqually(totalAmount, participantUserIds) {
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
 * Resolves payer name defensively from an expense record.
 */
export function resolvePayerName(exp, currentUser = null) {
  if (!exp) return "Trip Member";
  if (exp.paidByName) return exp.paidByName;
  if (exp.paidByUserName) return exp.paidByUserName;
  if (exp.paidByUserId && currentUser && Number(exp.paidByUserId) === Number(currentUser.id)) {
    return currentUser.name || "You";
  }
  if (exp.paidBy) {
    if (typeof exp.paidBy === "object") return exp.paidBy.name || "Trip Member";
    return String(exp.paidBy);
  }
  return "Trip Member";
}

/**
 * Computes the complete Grand Unified Settlement Plan for a single trip.
 * 
 * @param {Object} params
 * @param {number|string} params.tripId
 * @param {string} params.tripTitle
 * @param {string} params.startDate
 * @param {string} params.createdAt
 * @param {Array} params.groupMembers - from groupService.getGroupByTripId
 * @param {Array} params.contributions - from splitExpenseService.getMemberContributions
 * @param {Array} params.splits - from splitExpenseService.getSplitsByTrip
 * @param {Array} params.expenses - from expenseService.getExpenses
 * @param {Object} params.currentUser - logged-in user { id, name, email }
 * 
 * @returns {Array} List of consolidated settlement transfers
 */
export function computeTripGrandUnifiedSettlement({
  tripId,
  tripTitle = "Trip",
  startDate,
  createdAt,
  groupMembers = [],
  contributions = [],
  splits = [],
  expenses = [],
  currentUser = null,
}) {
  // 1. Resolve full companion list by merging group members and contributors
  const companionMap = new Map();
  groupMembers.forEach((m) => {
    if (m.userId) {
      companionMap.set(m.userId, { userId: m.userId, name: m.name, email: m.email });
    }
  });
  contributions.forEach((c) => {
    if (c.userId && !companionMap.has(c.userId)) {
      companionMap.set(c.userId, { userId: c.userId, name: c.userName, email: c.userEmail });
    }
  });

  // If no companions found yet, fallback to expenses payers
  if (companionMap.size === 0 && expenses.length > 0) {
    expenses.forEach((e) => {
      const uid = e.paidByUserId || (currentUser ? currentUser.id : 1);
      const uname = resolvePayerName(e, currentUser);
      if (!companionMap.has(uid)) {
        companionMap.set(uid, { userId: uid, name: uname, email: "" });
      }
    });
  }

  const allCompanions = Array.from(companionMap.values());
  const totalMembers = allCompanions.length || 1;

  // 2. Index splits by expenseId
  const splitsByExpenseId = {};
  splits.forEach((s) => {
    if (!splitsByExpenseId[s.expenseId]) {
      splitsByExpenseId[s.expenseId] = [];
    }
    splitsByExpenseId[s.expenseId].push(s);
  });

  // 3. Classify into Track 1 (Pool) vs Track 2 (Subset Selective)
  const poolExpenses = expenses.filter((e) => {
    const s = splitsByExpenseId[e.id] || [];
    return s.length === totalMembers || s.length === 0;
  });

  const subsetExpenses = expenses.filter((e) => {
    const s = splitsByExpenseId[e.id] || [];
    return s.length > 0 && s.length < totalMembers;
  });

  // =========================================================================
  // WAY 1: MASTER POOL TRANSFERS
  // =========================================================================
  const totalPoolSpent = poolExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const fairSharePerMember = Math.floor((totalPoolSpent / totalMembers) * 100) / 100;
  const poolPennyShares = allocatePenniesEqually(
    totalPoolSpent,
    allCompanions.map((c) => c.userId)
  );

  const poolMemberContributions = allCompanions.map((m) => {
    const totalPaid = poolExpenses
      .filter((e) => {
        if (e.paidByUserId && Number(e.paidByUserId) === Number(m.userId)) return true;
        const payer = resolvePayerName(e, currentUser);
        return (
          payer.toLowerCase().trim() === m.name.toLowerCase().trim() ||
          (currentUser && m.userId === currentUser.id && payer === "You")
        );
      })
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const fairShare =
      poolPennyShares[m.userId] !== undefined ? poolPennyShares[m.userId] : fairSharePerMember;
    const netBalance = Math.round((totalPaid - fairShare) * 100) / 100;

    return {
      userId: m.userId,
      userName: m.name,
      totalPaid,
      fairShare,
      netBalance,
    };
  });

  const poolDebtors = [];
  const poolCreditors = [];
  poolMemberContributions.forEach((c) => {
    if (c.netBalance < -0.05) {
      poolDebtors.push({ userId: c.userId, name: c.userName, amount: Math.abs(c.netBalance) });
    } else if (c.netBalance > 0.05) {
      poolCreditors.push({ userId: c.userId, name: c.userName, amount: c.netBalance });
    }
  });

  poolDebtors.sort((a, b) => b.amount - a.amount);
  poolCreditors.sort((a, b) => b.amount - a.amount);

  const poolTransfers = [];
  let d1 = 0;
  let c1 = 0;
  const dList1 = poolDebtors.map((x) => ({ ...x }));
  const cList1 = poolCreditors.map((x) => ({ ...x }));

  while (d1 < dList1.length && c1 < cList1.length) {
    const debtor = dList1[d1];
    const creditor = cList1[c1];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.01) {
      poolTransfers.push({
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
    if (debtor.amount < 0.01) d1++;
    if (creditor.amount < 0.01) c1++;
  }

  // =========================================================================
  // WAY 2: SELECTIVE ACTIVITIES TRANSFERS
  // =========================================================================
  const perExpensePennyMap = {};
  subsetExpenses.forEach((e) => {
    const s = splitsByExpenseId[e.id] || [];
    perExpensePennyMap[e.id] = allocatePenniesEqually(
      e.amount,
      s.map((x) => x.userId)
    );
  });

  const subsetMemberContributions = allCompanions.map((m) => {
    const totalPaid = subsetExpenses
      .filter((e) => {
        if (e.paidByUserId && Number(e.paidByUserId) === Number(m.userId)) return true;
        const payer = resolvePayerName(e, currentUser);
        return (
          payer.toLowerCase().trim() === m.name.toLowerCase().trim() ||
          (currentUser && m.userId === currentUser.id && payer === "You")
        );
      })
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    let consumedShare = 0;
    subsetExpenses.forEach((e) => {
      const s = splitsByExpenseId[e.id] || [];
      const isParticipant = s.some((x) => Number(x.userId) === Number(m.userId));
      if (isParticipant) {
        const share =
          perExpensePennyMap[e.id]?.[m.userId] !== undefined
            ? perExpensePennyMap[e.id][m.userId]
            : parseFloat(e.amount) / (s.length || 1);
        consumedShare += share;
      }
    });

    consumedShare = Math.round(consumedShare * 100) / 100;
    const netBalance = Math.round((totalPaid - consumedShare) * 100) / 100;

    return {
      userId: m.userId,
      userName: m.name,
      totalPaid,
      consumedShare,
      netBalance,
    };
  });

  const subDebtors = [];
  const subCreditors = [];
  subsetMemberContributions.forEach((c) => {
    if (c.netBalance < -0.05) {
      subDebtors.push({ userId: c.userId, name: c.userName, amount: Math.abs(c.netBalance) });
    } else if (c.netBalance > 0.05) {
      subCreditors.push({ userId: c.userId, name: c.userName, amount: c.netBalance });
    }
  });

  subDebtors.sort((a, b) => b.amount - a.amount);
  subCreditors.sort((a, b) => b.amount - a.amount);

  const subsetTransfers = [];
  let d2 = 0;
  let c2 = 0;
  const dList2 = subDebtors.map((x) => ({ ...x }));
  const cList2 = subCreditors.map((x) => ({ ...x }));

  while (d2 < dList2.length && c2 < cList2.length) {
    const debtor = dList2[d2];
    const creditor = cList2[c2];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.01) {
      subsetTransfers.push({
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
    if (debtor.amount < 0.01) d2++;
    if (creditor.amount < 0.01) c2++;
  }

  // =========================================================================
  // GRAND UNIFIED FINAL SETTLEMENT PLAN (WAY 1 + WAY 2 COMBINED DIRECT SUM)
  // =========================================================================
  // Load settlement records from localStorage
  let poolSettledList = [];
  let subsetSettledList = [];
  let globalSettledTransfers = {};
  let debtsMap = {};

  try {
    const p = localStorage.getItem(`tripnest_pool_settled_${tripId}`);
    if (p) poolSettledList = JSON.parse(p);
  } catch { /* ignore */ }

  try {
    const s = localStorage.getItem(`tripnest_subset_settled_${tripId}`);
    if (s) subsetSettledList = JSON.parse(s);
  } catch { /* ignore */ }

  try {
    globalSettledTransfers = JSON.parse(localStorage.getItem("tripnest_settled_transfers") || "{}");
  } catch { /* ignore */ }

  try {
    debtsMap = JSON.parse(localStorage.getItem("tripnest_settled_debts") || "{}");
  } catch { /* ignore */ }

  const poolSettledSet = new Set(poolSettledList);
  const subsetSettledSet = new Set(subsetSettledList);

  function isTransferSettled(tId, fromId, toId, fromName, toName, isPool) {
    const fName = (fromName || "").toLowerCase().trim();
    const tName = (toName || "").toLowerCase().trim();
    const specificKey = tripId && fromId && toId ? (isPool ? `pool_${tripId}_${fromId}_${toId}` : `subset_${tripId}_${fromId}_${toId}`) : null;

    // 1. Direct transfer ID check in global maps
    if (tId && (debtsMap[tId] || globalSettledTransfers[tId])) return true;
    if (specificKey && (debtsMap[specificKey] || globalSettledTransfers[specificKey])) return true;

    // 2. Track-specific lists from localStorage
    if (isPool) {
      if (tId && poolSettledSet.has(tId)) return true;
      for (const pid of poolSettledList) {
        if (pid === tId || pid === specificKey) return true;
        const parts = String(pid).split("-");
        // pool-transfer-{debtorId}-{creditorId}-{amount}
        if (parts.length >= 4 && Number(parts[2]) === Number(fromId) && Number(parts[3]) === Number(toId)) {
          return true;
        }
      }
    } else {
      if (tId && subsetSettledSet.has(tId)) return true;
      for (const sid of subsetSettledList) {
        if (sid === tId || sid === specificKey) return true;
        const parts = String(sid).split("-");
        // subset-transfer-{debtorId}-{creditorId}-{amount}
        if (parts.length >= 4 && Number(parts[2]) === Number(fromId) && Number(parts[3]) === Number(toId)) {
          return true;
        }
      }
    }

    return false;
  }

  // Combine by debtor -> creditor pair
  const combinedMap = new Map();

  poolTransfers.forEach((p) => {
    const key = `${p.fromUserId}_${p.toUserId}`;
    const settled = isTransferSettled(p.id, p.fromUserId, p.toUserId, p.fromUserName, p.toUserName, true);
    combinedMap.set(key, {
      key,
      tripId,
      tripTitle,
      startDate,
      createdAt,
      fromUserId: p.fromUserId,
      fromUserName: p.fromUserName,
      toUserId: p.toUserId,
      toUserName: p.toUserName,
      poolTransfer: p,
      poolAmount: Number(p.amount || 0),
      isPoolSettled: settled,
      subsetTransfer: null,
      subsetAmount: 0,
      isSubsetSettled: false,
    });
  });

  subsetTransfers.forEach((s) => {
    const key = `${s.fromUserId}_${s.toUserId}`;
    const settled = isTransferSettled(s.id, s.fromUserId, s.toUserId, s.fromUserName, s.toUserName, false);
    if (combinedMap.has(key)) {
      const existing = combinedMap.get(key);
      existing.subsetTransfer = s;
      existing.subsetAmount = Number(s.amount || 0);
      existing.isSubsetSettled = settled;
    } else {
      combinedMap.set(key, {
        key,
        tripId,
        tripTitle,
        startDate,
        createdAt,
        fromUserId: s.fromUserId,
        fromUserName: s.fromUserName,
        toUserId: s.toUserId,
        toUserName: s.toUserName,
        poolTransfer: null,
        poolAmount: 0,
        isPoolSettled: false,
        subsetTransfer: s,
        subsetAmount: Number(s.amount || 0),
        isSubsetSettled: settled,
      });
    }
  });

  const combinedList = Array.from(combinedMap.values()).map((item) => {
    const totalAmount = item.poolAmount + item.subsetAmount;
    const hasPool = item.poolAmount > 0.01;
    const hasSubset = item.subsetAmount > 0.01;

    let isFullySettled = false;
    let status = "UNSETTLED";

    if (hasPool && hasSubset) {
      if (item.isPoolSettled && item.isSubsetSettled) {
        status = "SETTLED";
        isFullySettled = true;
      } else if (item.isPoolSettled || item.isSubsetSettled) {
        status = "PARTIAL";
        isFullySettled = false;
      } else {
        status = "UNSETTLED";
        isFullySettled = false;
      }
    } else if (hasPool) {
      status = item.isPoolSettled ? "SETTLED" : "UNSETTLED";
      isFullySettled = item.isPoolSettled;
    } else if (hasSubset) {
      status = item.isSubsetSettled ? "SETTLED" : "UNSETTLED";
      isFullySettled = item.isSubsetSettled;
    }

    const breakdownParts = [];
    if (item.poolAmount > 0.01) {
      breakdownParts.push(`Pool: ₹${item.poolAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    if (item.subsetAmount > 0.01) {
      breakdownParts.push(`Selective: ₹${item.subsetAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }

    return {
      ...item,
      id: `unified-${tripId}-${item.fromUserId}-${item.toUserId}-${Math.round(totalAmount)}`,
      totalAmount,
      status,
      isFullySettled,
      breakdown: breakdownParts.join(" • "),
      description: `Grand Unified Plan • ${tripTitle}`,
      date: startDate || createdAt,
    };
  });

  return combinedList.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Filters unified transfers specifically for the logged-in user.
 * 
 * @param {Array} unifiedTransfers - List of combined settlements
 * @param {Object} currentUser - { id, name, email }
 * @returns {Object} { debtsOwedByMe, debtsOwedToMe }
 */
export function extractUserUnifiedDebts(unifiedTransfers, currentUser) {
  if (!currentUser) return { debtsOwedByMe: [], debtsOwedToMe: [] };

  const myId = currentUser.id != null ? Number(currentUser.id) : null;
  const myName = (currentUser.name || currentUser.fullName || (currentUser.email ? currentUser.email.split("@")[0] : "")).toLowerCase().trim();
  const myEmail = (currentUser.email || "").toLowerCase().trim();

  const debtsOwedByMe = [];
  const debtsOwedToMe = [];

  unifiedTransfers.forEach((item) => {
    const fromId = item.fromUserId != null ? Number(item.fromUserId) : null;
    const toId = item.toUserId != null ? Number(item.toUserId) : null;
    const fromName = (item.fromUserName || "").toLowerCase().trim();
    const toName = (item.toUserName || "").toLowerCase().trim();

    const isMeDebtor =
      (myId != null && fromId === myId) ||
      (myName && fromName === myName) ||
      (myEmail && fromName.includes(myEmail.split("@")[0]));

    const isMeCreditor =
      (myId != null && toId === myId) ||
      (myName && toName === myName) ||
      (myEmail && toName.includes(myEmail.split("@")[0]));

    const debtItem = {
      id: item.id,
      tripId: item.tripId,
      tripTitle: item.tripTitle,
      debtorId: item.fromUserId,
      debtorName: item.fromUserName,
      creditorId: item.toUserId,
      creditorName: item.toUserName,
      amount: item.totalAmount,
      poolAmount: item.poolAmount,
      subsetAmount: item.subsetAmount,
      poolTransferId: item.poolTransfer?.id,
      subsetTransferId: item.subsetTransfer?.id,
      description: item.description,
      breakdown: item.breakdown,
      date: item.date,
      isSettled: item.isFullySettled,
      status: item.status,
    };

    if (isMeCreditor && !isMeDebtor) {
      debtsOwedToMe.push(debtItem);
    } else if (isMeDebtor && !isMeCreditor) {
      debtsOwedByMe.push(debtItem);
    }
  });

  return { debtsOwedByMe, debtsOwedToMe };
}

/**
 * Toggles a unified settlement between Settled and Unsettled across all storage maps.
 * 
 * @param {Object} debtItem
 * @param {boolean} isNowSettled
 */
export function toggleUnifiedSettlement(debtItem, isNowSettled) {
  try {
    const tripId = debtItem.tripId;
    const debtorId = debtItem.debtorId;
    const creditorId = debtItem.creditorId;
    const debtorName = (debtItem.debtorName || "").toLowerCase().trim();
    const creditorName = (debtItem.creditorName || "").toLowerCase().trim();

    const keyPair = tripId && debtorId && creditorId ? `${tripId}_${debtorId}_${creditorId}` : null;
    const keyName = tripId && debtorName && creditorName ? `${tripId}_${debtorName}_${creditorName}` : null;

    // 1. Update tripnest_settled_debts
    const debtsKey = "tripnest_settled_debts";
    const debtsMap = JSON.parse(localStorage.getItem(debtsKey) || "{}");
    if (isNowSettled) {
      debtsMap[debtItem.id] = true;
      if (keyPair) debtsMap[keyPair] = true;
      if (keyName) debtsMap[keyName] = true;
    } else {
      delete debtsMap[debtItem.id];
      if (keyPair) delete debtsMap[keyPair];
      if (keyName) delete debtsMap[keyName];
    }
    localStorage.setItem(debtsKey, JSON.stringify(debtsMap));

    // 2. Update tripnest_settled_transfers (shared with SharedExpensesTab)
    const transferKey = "tripnest_settled_transfers";
    const transferMap = JSON.parse(localStorage.getItem(transferKey) || "{}");
    if (isNowSettled) {
      transferMap[debtItem.id] = true;
      if (keyPair) transferMap[keyPair] = true;
      if (keyName) transferMap[keyName] = true;
      if (debtItem.poolTransferId) transferMap[debtItem.poolTransferId] = true;
      if (debtItem.subsetTransferId) transferMap[debtItem.subsetTransferId] = true;
    } else {
      delete transferMap[debtItem.id];
      if (keyPair) delete transferMap[keyPair];
      if (keyName) delete transferMap[keyName];
      if (debtItem.poolTransferId) delete transferMap[debtItem.poolTransferId];
      if (debtItem.subsetTransferId) delete transferMap[debtItem.subsetTransferId];
    }
    localStorage.setItem(transferKey, JSON.stringify(transferMap));

    // 3. Update tripnest_pool_settled_${tripId}
    if (tripId && debtItem.poolAmount > 0) {
      const poolKey = `tripnest_pool_settled_${tripId}`;
      const poolList = JSON.parse(localStorage.getItem(poolKey) || "[]");
      const poolSet = new Set(poolList);
      const poolId = debtItem.poolTransferId || `pool-transfer-${debtorId}-${creditorId}-${Math.round(debtItem.poolAmount)}`;

      if (isNowSettled) {
        poolSet.add(poolId);
      } else {
        poolSet.delete(poolId);
      }
      localStorage.setItem(poolKey, JSON.stringify(Array.from(poolSet)));
    }

    // 4. Update tripnest_subset_settled_${tripId}
    if (tripId && debtItem.subsetAmount > 0) {
      const subsetKey = `tripnest_subset_settled_${tripId}`;
      const subsetList = JSON.parse(localStorage.getItem(subsetKey) || "[]");
      const subsetSet = new Set(subsetList);
      const subsetId = debtItem.subsetTransferId || `subset-transfer-${debtorId}-${creditorId}-${Math.round(debtItem.subsetAmount)}`;

      if (isNowSettled) {
        subsetSet.add(subsetId);
      } else {
        subsetSet.delete(subsetId);
      }
      localStorage.setItem(subsetKey, JSON.stringify(Array.from(subsetSet)));
    }

    // 5. Notify all listeners across tabs/components
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("tripnest_settlement_update", { detail: { tripId, isNowSettled } }));
  } catch (err) {
    console.warn("Storage sync error on toggleUnifiedSettlement:", err);
  }
}

/**
 * Resets all settlement records across all trips back to Unsettled state.
 */
export function resetAllSettlementsEverywhere() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith("tripnest_pool_settled_") ||
          k.startsWith("tripnest_subset_settled_") ||
          k === "tripnest_settled_transfers" ||
          k === "tripnest_settled_debts" ||
          k === "tripnest_settled_splits")
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("tripnest_settlement_update", { detail: { resetAll: true } }));
  } catch (e) {
    console.warn("Error resetting settlements:", e);
  }
}
