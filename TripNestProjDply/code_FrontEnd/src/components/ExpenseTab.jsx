import { useState, useEffect, useMemo } from "react";
import { expenseService } from "../services/expenseService";
import { budgetService } from "../services/budgetService";
import { groupService } from "../services/groupService";
import { splitExpenseService } from "../services/splitExpenseService";
import { useAuth } from "../context/useAuth";
import { formatDisplayDate } from "../utils/dateUtils";

/**
 * ExpenseTab Component (Milestone 3 Task 8)
 * Displays:
 * 1. Summary Banner: Total Money Spent & Total Receipts Count
 * 2. Category Filter Pills: Quick filtering by FOOD, ACCOMMODATION, TRANSIT, etc.
 * 3. Itemized Receipt Cards: Date, Title, Category Badge, Payer name, Amount, Edit/Delete
 * 4. Interactive Add/Edit Expense Modal with live client-side validation, Payer selection,
 *    and Pre-Selected Companion Checkboxes for automatic Pool vs Selective splitting.
 */
export default function ExpenseTab({ tripId, onNavigateToSplits }) {
  const { user } = useAuth();

  // Core state
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [budget, setBudget] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedCompanionIds, setSelectedCompanionIds] = useState([]);
  // Split mode state ("EQUAL" | "CUSTOM")
  const [splitType, setSplitType] = useState("EQUAL");
  // Custom shares map: { [userId]: amount }
  const [customShares, setCustomShares] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sort order preference ("CHRONOLOGICAL" = Exp 1 -> Exp N, "NEWEST" = Exp N -> Exp 1)
  const [sortOrder, setSortOrder] = useState("CHRONOLOGICAL");

  // Category filter state ("ALL", "FOOD", "TRANSPORTATION", etc.)
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form inputs state
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    entryDate: new Date().toISOString().split("T")[0],
    category: "FOOD",
    currency: "INR",
    paidByUserId: "",
  });

  // Available categories with visual emoji icons
  const CATEGORIES = [
    { key: "ALL", label: "All Receipts", icon: "🧾" },
    { key: "ACCOMMODATION", label: "Stays & Hotels", icon: "🏨" },
    { key: "TRANSPORTATION", label: "Transit & Cabs", icon: "✈️" },
    { key: "FOOD", label: "Food & Dining", icon: "🍽️" },
    { key: "ACTIVITIES", label: "Tours & Sightseeing", icon: "🎟️" },
    { key: "SHOPPING", label: "Shopping", icon: "🛍️" },
    { key: "MISCELLANEOUS", label: "Misc & Others", icon: "📦" },
  ];

  // Load expenses and total spent on mount or when tripId changes
  useEffect(() => {
    loadExpenseData();
  }, [tripId, selectedCategory]);

  async function loadExpenseData() {
    setLoading(true);
    setError("");
    try {
      const catParam = selectedCategory === "ALL" ? null : selectedCategory;
      const [allData, data, spentSummary, groupData, budgetData] = await Promise.all([
        expenseService.getExpenses(tripId).catch(() => []),
        catParam ? expenseService.getExpenses(tripId, catParam).catch(() => []) : null,
        expenseService.getTotalSpent(tripId).catch(() => ({ totalSpent: 0 })),
        groupService.getGroupByTripId(tripId).catch(() => null),
        budgetService.getBudget(tripId).catch(() => null),
      ]);
      const rawAll = Array.isArray(allData) ? allData : [];
      setAllExpenses(rawAll);
      setExpenses(catParam ? (Array.isArray(data) ? data : []) : rawAll);
      setTotalSpent(spentSummary?.totalSpent || 0);
      setBudget(budgetData);
      if (groupData?.members && Array.isArray(groupData.members)) {
        setGroupMembers(groupData.members);
      }
    } catch (err) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }

  // Permanent Chronological Expense Number Mapping:
  // First entered expense (lowest id) -> 1, next -> 2, latest -> N, future -> N+1
  const expenseNumberMap = useMemo(() => {
    if (!Array.isArray(allExpenses)) return new Map();
    const sorted = [...allExpenses].sort((a, b) => Number(a.id) - Number(b.id));
    const map = new Map();
    sorted.forEach((exp, idx) => {
      if (exp && exp.id != null) {
        map.set(exp.id, idx + 1);
      }
    });
    return map;
  }, [allExpenses]);

  // Displayed expenses based on active sort order (defaults to Chronological 1 -> N)
  const displayedExpenses = useMemo(() => {
    if (!Array.isArray(expenses)) return [];
    const list = [...expenses];
    if (sortOrder === "CHRONOLOGICAL") {
      return list.sort((a, b) => Number(a.id) - Number(b.id));
    } else {
      return list.sort((a, b) => Number(b.id) - Number(a.id));
    }
  }, [expenses, sortOrder]);

  // Open modal in CREATE mode (pre-selects ALL companions by default)
  function openCreateModal() {
    setEditingExpense(null);
    const todayStr = new Date().toISOString().split("T")[0];
    setFormData({
      description: "",
      amount: "",
      expenseDate: todayStr,
      entryDate: todayStr,
      category: "FOOD",
      currency: "INR",
      paidByUserId: user?.id || (groupMembers.length > 0 ? groupMembers[0].userId : ""),
    });
    // Default: ALL companions checked for Full Squad Pool if group exists, else current user
    const allIds = groupMembers.length > 0 ? groupMembers.map((m) => m.userId) : (user?.id ? [user.id] : []);
    setSelectedCompanionIds(allIds);
    setSplitType("EQUAL");
    const initialCustom = {};
    allIds.forEach((uid) => {
      initialCustom[uid] = "";
    });
    setCustomShares(initialCustom);
    setModalError("");
    setIsModalOpen(true);
  }

  // Open modal in EDIT mode (pre-fills existing receipt details and companions)
  async function openEditModal(expense) {
    setEditingExpense(expense);
    const todayStr = new Date().toISOString().split("T")[0];
    const initialEntryDate = expense.entryDate
      ? String(expense.entryDate).split("T")[0]
      : (expense.createdAt ? String(expense.createdAt).split("T")[0] : todayStr);

    setFormData({
      description: expense.description || "",
      amount: expense.amount || "",
      expenseDate: expense.expenseDate ? String(expense.expenseDate).split("T")[0] : todayStr,
      entryDate: initialEntryDate,
      category: expense.category || "FOOD",
      currency: expense.currency || "INR",
      paidByUserId: expense.paidByUserId || user?.id || "",
    });

    try {
      const existingSplits = await splitExpenseService.getSplitsByExpense(expense.id);
      if (existingSplits && existingSplits.length > 0) {
        const uids = existingSplits.map((s) => s.userId);
        setSelectedCompanionIds(uids);

        // Check if existing shares were custom unequal shares
        const firstVal = parseFloat(existingSplits[0].shareAmount || 0);
        const hasUnequalShares = existingSplits.some(
          (s) => Math.abs(parseFloat(s.shareAmount || 0) - firstVal) > 0.05
        );
        setSplitType(hasUnequalShares ? "CUSTOM" : "EQUAL");

        const customMap = {};
        existingSplits.forEach((s) => {
          customMap[s.userId] = s.shareAmount != null ? String(s.shareAmount) : "";
        });
        setCustomShares(customMap);
      } else {
        const allIds = groupMembers.length > 0 ? groupMembers.map((m) => m.userId) : (user?.id ? [user.id] : []);
        setSelectedCompanionIds(allIds);
        setSplitType("EQUAL");
        setCustomShares({});
      }
    } catch {
      const allIds = groupMembers.length > 0 ? groupMembers.map((m) => m.userId) : (user?.id ? [user.id] : []);
      setSelectedCompanionIds(allIds);
      setSplitType("EQUAL");
      setCustomShares({});
    }

    setModalError("");
    setIsModalOpen(true);
  }

  // Toggle companion checkbox for sharing expense
  function handleToggleCompanion(userId) {
    setSelectedCompanionIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  // Handle custom share amount input change
  function handleCustomAmountChange(userId, value) {
    setCustomShares((prev) => ({
      ...prev,
      [userId]: value,
    }));
  }

  // Universal input handler
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Handle Form Submission (Create or Update + Auto-Split)
  async function handleSaveExpense(e) {
    e.preventDefault();
    setModalError("");

    if (!formData.description.trim()) {
      setModalError("Please provide an expense title/memo (e.g. Dinner, Taxi).");
      return;
    }

    const numericAmount = parseFloat(formData.amount);
    if (!numericAmount || numericAmount <= 0) {
      setModalError("Please enter a valid monetary amount greater than 0.");
      return;
    }

    // Enforce companion selection only if this trip has a travel squad
    if (groupMembers.length > 0 && selectedCompanionIds.length === 0) {
      setModalError("Please select at least one companion to share this expense.");
      return;
    }

    let splitPayload = null;
    if (groupMembers.length > 0 && selectedCompanionIds.length > 0) {
      if (splitType === "EQUAL") {
        splitPayload = {
          splitType: "EQUAL",
          userIds: selectedCompanionIds,
        };
      } else {
        const customSharesList = [];
        let runningSum = 0;
        for (const uid of selectedCompanionIds) {
          const amtStr = customShares[uid];
          const amt = parseFloat(amtStr);
          if (isNaN(amt) || amt <= 0) {
            setModalError("Each selected companion must have a valid positive amount in Custom mode.");
            return;
          }
          runningSum += amt;
          customSharesList.push({ userId: uid, amount: amt });
        }

        if (Math.abs(runningSum - numericAmount) > 0.05) {
          setModalError(
            `Custom shares total (₹${runningSum.toFixed(2)}) must match the bill amount (₹${numericAmount.toFixed(2)}). Difference: ₹${(numericAmount - runningSum).toFixed(2)}`
          );
          return;
        }

        splitPayload = {
          splitType: "CUSTOM",
          customShares: customSharesList,
        };
      }
    }

    const payload = {
      description: formData.description.trim(),
      amount: numericAmount,
      expenseDate: formData.expenseDate,
      entryDate: formData.entryDate || formData.expenseDate,
      category: formData.category,
      currency: formData.currency || "INR",
      paidByUserId: formData.paidByUserId ? Number(formData.paidByUserId) : undefined,
    };

    setModalSubmitting(true);
    try {
      let savedExpense;
      if (editingExpense) {
        // Update existing expense (PUT)
        savedExpense = await expenseService.updateExpense(tripId, editingExpense.id, payload);
      } else {
        // Create new expense (POST)
        savedExpense = await expenseService.createExpense(tripId, payload);
      }

      // Automatically split among selected companions if a group exists
      const targetExpenseId = savedExpense?.id || editingExpense?.id;
      if (targetExpenseId && splitPayload && groupMembers.length > 0) {
        try {
          await splitExpenseService.splitExpense(targetExpenseId, splitPayload);
        } catch (splitErr) {
          console.warn("Auto-split after expense creation failed:", splitErr);
        }
      }

      setIsModalOpen(false);
      // Reload expenses and new total spent
      await loadExpenseData();
    } catch (err) {
      setModalError(err.message || "Failed to save expense");
    } finally {
      setModalSubmitting(false);
    }
  }

  // Handle Delete Expense
  async function handleDeleteExpense(expenseId) {
    if (!window.confirm("Are you sure you want to delete this expense record?")) {
      return;
    }

    try {
      await expenseService.deleteExpense(tripId, expenseId);
      // Immediately remove from local state for instant UI responsiveness
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
      setAllExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));

      // Refresh total spent
      const spentSummary = await expenseService.getTotalSpent(tripId);
      setTotalSpent(spentSummary?.totalSpent || 0);
    } catch (err) {
      setError(err.message || "Failed to delete expense");
    }
  }

  // Format currency helper
  function formatCurrency(amount, currency = "INR") {
    const num = Number(amount || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(num);
  }

  // Get matching icon for a category
  function getCategoryIcon(catKey) {
    const match = CATEGORIES.find((c) => c.key === catKey);
    return match ? match.icon : "🏷️";
  }

  // Active modal calculations for equal vs custom split sharing
  const modalNumericAmount = parseFloat(formData.amount) || 0;
  const equalPerPerson =
    selectedCompanionIds.length > 0
      ? (modalNumericAmount / selectedCompanionIds.length).toFixed(2)
      : "0.00";
  const customSum = selectedCompanionIds.reduce((sum, uid) => {
    const val = parseFloat(customShares[uid]);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="expense-tab-container" style={{ marginTop: "24px" }}>
      {error && (
        <div className="message error" style={{ marginBottom: "20px" }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* HEADER ROW WITH SUMMARY CARD & ACTION BUTTON */}
      <div
        className="expense-header-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, #fff7ed 0%, #f8fafc 100%)",
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid #fed7aa",
          borderLeft: "6px solid #ea580c",
          boxShadow: "0 2px 10px rgba(234, 88, 12, 0.06)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffedd5",
              color: "#c2410c",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            <span>🧾 Transaction Ledger</span>
          </div>
          <h2 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.01em" }}>
            🧾 Expense Tracking & Receipts Ledger
          </h2>
          <p style={{ margin: 0, color: "#475569", fontSize: "14px", fontWeight: "500" }}>
            Record actual trip spending, track who paid, and categorize purchases in real time.
          </p>
        </div>

        <button
          className="secondary-btn"
          onClick={openCreateModal}
          style={{
            padding: "10px 22px",
            fontWeight: "700",
            background: "var(--teal)",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(15, 118, 110, 0.2)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <span>➕</span> Log New Expense
        </button>
      </div>

      {/* SUMMARY STATS BANNER */}
      {(() => {
        const totalBudgetNum = Number(budget?.totalBudget || 0);
        const spentPct = totalBudgetNum > 0 ? Math.round((totalSpent / totalBudgetNum) * 100) : 0;
        return (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "20px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px 24px",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  TOTAL MONEY SPENT
                </div>
                <div style={{ color: "var(--navy)", fontSize: "28px", fontWeight: "800" }}>
                  {formatCurrency(totalSpent)}
                </div>
                <div style={{ color: "var(--teal)", fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>
                  📊 Cumulative expenditures logged
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  padding: "20px 24px",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  TOTAL RECEIPTS RECORDED
                </div>
                <div style={{ color: "#2563eb", fontSize: "28px", fontWeight: "800" }}>
                  {expenses.length} {expenses.length === 1 ? "Receipt" : "Receipts"}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>
                  {selectedCategory === "ALL" ? "Across all categories" : `Filtered by ${selectedCategory}`}
                </div>
              </div>

              {/* Card 3: Real-Time Budget Pace & Threshold Health */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "20px 24px",
                  borderRadius: "14px",
                  border: spentPct >= 100 ? "1.5px solid #fca5a5" : spentPct >= 90 ? "1.5px solid #fed7aa" : spentPct >= 80 ? "1.5px solid #fde68a" : "1px solid var(--border)",
                  boxShadow: "var(--shadow)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ color: "var(--muted)", fontSize: "13px", fontWeight: "600" }}>
                    BUDGET UTILIZATION
                  </span>
                  {totalBudgetNum > 0 && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: spentPct >= 100 ? "#fee2e2" : spentPct >= 90 ? "#ffedd5" : spentPct >= 80 ? "#fef3c7" : "#ecfdf5",
                        color: spentPct >= 100 ? "#b91c1c" : spentPct >= 90 ? "#c2410c" : spentPct >= 80 ? "#b45309" : "#047857",
                      }}
                    >
                      {spentPct >= 100 ? "🚨 100%+ EXCEEDED" : spentPct >= 90 ? "🚨 90% ABOUT TO EXHAUST" : spentPct >= 80 ? "⚠️ 80% APPROACHING" : "✅ HEALTHY PACE"}
                    </span>
                  )}
                </div>
                <div style={{ color: spentPct >= 100 ? "#dc2626" : spentPct >= 90 ? "#ea580c" : spentPct >= 80 ? "#d97706" : "var(--navy)", fontSize: "28px", fontWeight: "800" }}>
                  {totalBudgetNum > 0 ? `${spentPct}%` : "—"}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>
                  {totalBudgetNum > 0 ? `${formatCurrency(totalSpent)} of ${formatCurrency(totalBudgetNum)}` : "No planned budget set"}
                </div>
                {totalBudgetNum > 0 && (
                  <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginTop: "10px" }}>
                    <div
                      style={{
                        width: `${Math.min(100, spentPct)}%`,
                        height: "100%",
                        background: spentPct >= 100 ? "#ef4444" : spentPct >= 90 ? "#ea580c" : spentPct >= 80 ? "#f59e0b" : "#10b981",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* REAL-TIME BUDGET HEALTH ALERT BANNER */}
            {totalBudgetNum > 0 && spentPct >= 80 && (
              <div
                style={{
                  background: spentPct >= 100
                    ? "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)"
                    : spentPct >= 90
                    ? "linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)"
                    : "linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)",
                  border: spentPct >= 100
                    ? "1.5px solid #fca5a5"
                    : spentPct >= 90
                    ? "1.5px solid #fed7aa"
                    : "1.5px solid #fde68a",
                  borderLeft: spentPct >= 100
                    ? "6px solid #ef4444"
                    : spentPct >= 90
                    ? "6px solid #ea580c"
                    : "6px solid #f59e0b",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "26px" }}>{spentPct >= 90 ? "🚨" : "⚠️"}</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: spentPct >= 100 ? "#991b1b" : spentPct >= 90 ? "#9a3412" : "#92400e" }}>
                      {spentPct >= 100
                        ? `Budget Exceeded: ${spentPct}% Spent!`
                        : spentPct >= 90
                        ? `90% Budget Alert: ${spentPct}% Spent — About to Exhaust Budget!`
                        : `80% Budget Warning: ${spentPct}% Spent — Approaching Limit!`}
                    </div>
                    <div style={{ fontSize: "12px", color: spentPct >= 100 ? "#b91c1c" : spentPct >= 90 ? "#c2410c" : "#b45309", marginTop: "2px" }}>
                      {spentPct >= 100
                        ? `You have exceeded your ${formatCurrency(totalBudgetNum)} planned budget by ${formatCurrency(totalSpent - totalBudgetNum)}. Please adjust allocations.`
                        : `You have spent ${formatCurrency(totalSpent)} of your ${formatCurrency(totalBudgetNum)} ceiling. Only ${formatCurrency(Math.max(0, totalBudgetNum - totalSpent))} remaining.`}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    background: spentPct >= 100 ? "#ef4444" : spentPct >= 90 ? "#ea580c" : "#f59e0b",
                    color: "#ffffff",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    fontWeight: "800",
                    letterSpacing: "0.03em",
                  }}
                >
                  {spentPct >= 100 ? "🚨 EXCEEDED" : spentPct >= 90 ? "🚨 ABOUT TO EXHAUST" : "⚠️ APPROACHING LIMIT"}
                </span>
              </div>
            )}
          </>
        );
      })()}

      {/* CATEGORY FILTER CHIPS */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "12px",
          marginBottom: "20px",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: isActive ? "1px solid var(--teal)" : "1px solid var(--border)",
                background: isActive ? "var(--teal)" : "#ffffff",
                color: isActive ? "#ffffff" : "var(--navy)",
                fontWeight: isActive ? "700" : "600",
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          );
        })}
      </div>

      {/* EXPENSE LEDGER LIST */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <p style={{ color: "var(--muted)" }}>Loading logged expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            padding: "48px 24px",
            borderRadius: "14px",
            border: "1px dashed #cbd5e1",
            textAlign: "center",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ fontSize: "44px", marginBottom: "12px" }}>🧾</div>
          <h3 style={{ margin: "0 0 8px", color: "var(--navy)", fontSize: "18px" }}>
            No Receipts Logged in This Category
          </h3>
          <p style={{ margin: "0 auto 20px", color: "var(--muted)", maxWidth: "420px", fontSize: "14px" }}>
            Keep your group travel expenses organized. Log meals, taxi rides, tickets, and bookings as they occur.
          </p>
          <button
            onClick={openCreateModal}
            style={{
              padding: "10px 24px",
              fontWeight: "700",
              background: "var(--teal)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            ➕ Log First Expense
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Header Bar with Count & Sort Toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 8px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--navy)" }}>
              Showing {displayedExpenses.length} {displayedExpenses.length === 1 ? "Receipt" : "Receipts"}
              {selectedCategory !== "ALL" && ` in ${CATEGORIES.find((c) => c.key === selectedCategory)?.label || selectedCategory}`}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "600" }}>Sort Order:</span>
              <button
                type="button"
                onClick={() => setSortOrder("CHRONOLOGICAL")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: sortOrder === "CHRONOLOGICAL" ? "1.5px solid var(--teal)" : "1px solid var(--border)",
                  background: sortOrder === "CHRONOLOGICAL" ? "#f0fdfa" : "#ffffff",
                  color: sortOrder === "CHRONOLOGICAL" ? "var(--teal)" : "var(--muted)",
                  fontWeight: sortOrder === "CHRONOLOGICAL" ? "800" : "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                ⬇️ Oldest First (Exp 1 ➔ Exp N)
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("NEWEST")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: sortOrder === "NEWEST" ? "1.5px solid var(--teal)" : "1px solid var(--border)",
                  background: sortOrder === "NEWEST" ? "#f0fdfa" : "#ffffff",
                  color: sortOrder === "NEWEST" ? "var(--teal)" : "var(--muted)",
                  fontWeight: sortOrder === "NEWEST" ? "800" : "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                ⬆️ Newest First (Exp N ➔ Exp 1)
              </button>
            </div>
          </div>

          {displayedExpenses.map((expense, idx) => {
            const expNumber = expenseNumberMap.get(expense.id) || (idx + 1);
            return (
              <div
                key={expense.id}
                style={{
                  background: "#ffffff",
                  padding: "18px 22px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "14px",
                }}
              >
                {/* Left Column: Icon & Details */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "var(--sky)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "24px",
                    }}
                  >
                    {getCategoryIcon(expense.category)}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          background: "var(--teal)",
                          color: "#ffffff",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "800",
                        }}
                      >
                        Expense #{expNumber}
                      </span>
                      <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--navy)" }}>
                        {expense.description}
                      </h4>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                      <span
                        title="Date printed on the bill/receipt when the purchase occurred"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "#f8fafc",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        🧾 <strong>Bill Date:</strong> {formatDisplayDate(expense.expenseDate)}
                      </span>

                      <span
                        title="Date this expense was entered and recorded into TripNest"
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
                        }}
                      >
                        📝 <strong>Entry Date:</strong> {formatDisplayDate(expense.entryDate || expense.createdAt)}
                      </span>

                      <span>•</span>

                      <span style={{ fontWeight: "600", color: "var(--teal)" }}>
                        👤 Paid by {expense.paidByName || expense.paidByUserName || (expense.paidByUserId === user?.id ? (user?.name || "You") : "Trip Member")}
                      </span>

                      <span>•</span>

                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "#f1f5f9",
                          fontSize: "11px",
                          fontWeight: "700",
                        }}
                      >
                        {expense.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Amount & Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--navy)" }}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>
                      Expense #{expNumber} • Receipt #{expense.id}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {onNavigateToSplits && (
                      <button
                        onClick={() => onNavigateToSplits(expense.id)}
                        title="Split this expense among group companions"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1.5px solid #a7f3d0",
                          background: "#ecfdf5",
                          color: "#065f46",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        🤝 Split
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(expense)}
                      title="Edit Expense"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "#ffffff",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      title="Delete Expense"
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #fca5a5",
                        background: "#ffffff",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP MODAL: ADD / EDIT EXPENSE */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "620px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "var(--navy)", fontSize: "20px", fontWeight: "700" }}>
                {editingExpense ? "✎ Edit Expense Receipt" : "➕ Log New Expense"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="message error" style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "8px" }}>
                <span>⚠️ {modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                  Expense Description *
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g. Dinner at Heritage Cafe, Taxi to Hotel"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Row 2: Amount & Currency */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "14px",
                    }}
                  />
                  {Number(budget?.totalBudget || 0) > 0 && formData.amount && !isNaN(parseFloat(formData.amount)) && (
                    <div style={{ marginTop: "6px", fontSize: "11px", fontWeight: "700" }}>
                      {(() => {
                        const inputAmt = parseFloat(formData.amount) || 0;
                        const totalBudgetNum = Number(budget.totalBudget);
                        const projected = (editingExpense ? (totalSpent - Number(editingExpense.amount || 0)) : totalSpent) + inputAmt;
                        const projPct = Math.round((projected / totalBudgetNum) * 100);
                        if (projPct >= 100) return <span style={{ color: "#dc2626" }}>🚨 Pushes spending to {projPct}% — Budget Exceeded!</span>;
                        if (projPct >= 90) return <span style={{ color: "#ea580c" }}>🚨 Pushes spending to {projPct}% — About to Exhaust Budget!</span>;
                        if (projPct >= 80) return <span style={{ color: "#d97706" }}>⚠️ Pushes spending to {projPct}% — Approaching Budget Limit ({projPct}%)</span>;
                        return <span style={{ color: "#059669" }}>✅ Spending remains healthy at {projPct}% of budget</span>;
                      })()}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "14px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Dual Dates Grid (Bill Date vs Entry Date) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "16px",
                  background: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                      🧾 Bill Date *
                    </label>
                    <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: "600" }}>On Receipt</span>
                  </div>
                  <input
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "13px",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                  <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                    When purchase physically occurred
                  </span>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "700", color: "#0f766e" }}>
                      📝 Entry Date *
                    </label>
                    <span style={{ fontSize: "10px", color: "#0f766e", fontWeight: "700", background: "#ccfbf1", padding: "1px 6px", borderRadius: "4px" }}>
                      System Log
                    </span>
                  </div>
                  <input
                    type="date"
                    name="entryDate"
                    value={formData.entryDate}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1.5px solid #99f6e4",
                      fontSize: "13px",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                  <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                    {editingExpense ? "Record entry / logging date" : "Today (Record entry timestamp)"}
                  </span>
                </div>
              </div>

              {/* Row 4: Category */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "14px",
                    background: "#ffffff",
                  }}
                >
                  <option value="FOOD">🍽️ Food & Dining</option>
                  <option value="ACCOMMODATION">🏨 Accommodation</option>
                  <option value="TRANSPORTATION">✈️ Transportation</option>
                  <option value="ACTIVITIES">🎟️ Activities & Tours</option>
                  <option value="SHOPPING">🛍️ Shopping</option>
                  <option value="MISCELLANEOUS">📦 Miscellaneous</option>
                </select>
              </div>

              {/* Payer Selector (Who paid this bill?) */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                  👤 Paid By *
                </label>
                <select
                  name="paidByUserId"
                  value={formData.paidByUserId}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "14px",
                    background: "#ffffff",
                    outline: "none",
                  }}
                >
                  {groupMembers.length > 0 ? (
                    groupMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name || m.email} {m.userId === user?.id ? "(You)" : ""}
                      </option>
                    ))
                  ) : (
                    <option value={user?.id || ""}>{user?.name || user?.email || "You"}</option>
                  )}
                </select>
              </div>

              {groupMembers.length > 0 ? (
                <>
                  {/* Split Method Selector (Equal vs Custom) */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                      Split Method *
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setSplitType("EQUAL")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: splitType === "EQUAL" ? "2px solid #059669" : "1.5px solid #cbd5e1",
                          background: splitType === "EQUAL" ? "#ecfdf5" : "#ffffff",
                          color: splitType === "EQUAL" ? "#065f46" : "#475569",
                          fontWeight: "700",
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        ⚖️ Equal Split
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitType("CUSTOM")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: splitType === "CUSTOM" ? "2px solid #059669" : "1.5px solid #cbd5e1",
                          background: splitType === "CUSTOM" ? "#ecfdf5" : "#ffffff",
                          color: splitType === "CUSTOM" ? "#065f46" : "#475569",
                          fontWeight: "700",
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        ✏️ Custom Amounts
                      </button>
                    </div>
                  </div>

                  {/* Companion Checkboxes: Shared Among Whom (Way 1 Pool vs Way 2 Selective) */}
                  <div style={{ marginBottom: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                        👥 Shared Among Companions ({selectedCompanionIds.length} of {groupMembers.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCompanionIds.length === groupMembers.length) {
                            setSelectedCompanionIds([]);
                          } else {
                            setSelectedCompanionIds(groupMembers.map((m) => m.userId));
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--teal)",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        {selectedCompanionIds.length === groupMembers.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div style={{ marginBottom: "8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: selectedCompanionIds.length === groupMembers.length ? "#ecfdf5" : "#f0f9ff",
                          color: selectedCompanionIds.length === groupMembers.length ? "#059669" : "#0284c7",
                          border: selectedCompanionIds.length === groupMembers.length ? "1px solid #a7f3d0" : "1px solid #bae6fd",
                        }}
                      >
                        {selectedCompanionIds.length === groupMembers.length
                          ? "🏁 Full Squad Pool (Way 1: Master Pool Split)"
                          : `🧾 Selective Split (${selectedCompanionIds.length} Members • Way 2: ExpenseWise)`}
                      </span>
                    </div>

                    <div
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "8px 12px",
                        maxHeight: "160px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        background: "#f8fafc",
                      }}
                    >
                      {groupMembers.map((m) => {
                        const isChecked = selectedCompanionIds.includes(m.userId);
                        return (
                          <div
                            key={m.userId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              background: isChecked ? "#f0fdf4" : "transparent",
                              gap: "8px",
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
                                onChange={() => handleToggleCompanion(m.userId)}
                                style={{ width: "16px", height: "16px", accentColor: "#059669" }}
                              />
                              <span style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b" }}>
                                {m.name || m.email} {m.userId === user?.id ? "(You)" : ""}
                              </span>
                            </label>

                            {isChecked && (
                              <div>
                                {splitType === "EQUAL" ? (
                                  <span style={{ fontWeight: "700", color: "#059669", fontSize: "12px" }}>
                                    ₹{equalPerPerson}
                                  </span>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={customShares[m.userId] ?? ""}
                                      onChange={(e) => handleCustomAmountChange(m.userId, e.target.value)}
                                      style={{
                                        width: "90px",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        border: "1.5px solid #cbd5e1",
                                        fontSize: "13px",
                                        textAlign: "right",
                                        outline: "none",
                                        background: "#ffffff",
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Balance / Allocation Meter */}
                    {selectedCompanionIds.length > 0 && modalNumericAmount > 0 && (
                      <div
                        style={{
                          marginTop: "10px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                          color: "#475569",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {splitType === "EQUAL" ? (
                          <span>
                            ₹{modalNumericAmount.toFixed(2)} ÷ {selectedCompanionIds.length} members ={" "}
                            <strong style={{ color: "#059669" }}>₹{equalPerPerson} each</strong>
                          </span>
                        ) : (
                          <span>
                            Allocated: <strong>₹{customSum.toFixed(2)}</strong> / ₹{modalNumericAmount.toFixed(2)}{" "}
                            {Math.abs(modalNumericAmount - customSum) > 0.05 ? (
                              <span style={{ color: "#dc2626", fontWeight: "700" }}>
                                (Diff: ₹{(modalNumericAmount - customSum).toFixed(2)})
                              </span>
                            ) : (
                              <span style={{ color: "#059669", fontWeight: "700" }}>✅ Matches 100%</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    marginBottom: "18px",
                    padding: "14px 16px",
                    background: "#f0fdf4",
                    borderRadius: "10px",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>👤</span>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#166534", marginBottom: "2px" }}>
                      Personal Solo Trip Expense
                    </div>
                    <div style={{ fontSize: "12px", color: "#15803d", lineHeight: "1.4" }}>
                      No travel squad created for this trip. This receipt will be logged directly into your personal trip ledger and budget without group splits.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--teal)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  {modalSubmitting ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
