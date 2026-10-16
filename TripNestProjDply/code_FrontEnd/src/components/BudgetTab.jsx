import { useState, useEffect } from "react";
import { budgetService } from "../services/budgetService";
import { expenseService } from "../services/expenseService";

/**
 * BudgetTab Component (Milestone 3 Task 7 & Task 9 Integration)
 * Displays:
 * 1. Overview Financial Cards: Planned Budget, Actual Spent, Remaining Balance, Utilization Rate
 * 2. Visual Progress Bars for 5 Planned Categories (Accommodation, Transit, Food, Activities, Misc)
 * 3. Actual Expense Breakdown by Category with Comparative Health Gauges
 * 4. Interactive Set / Edit Budget Modal with validation
 */
export default function BudgetTab({ tripId }) {
  const [budget, setBudget] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form state for creating/updating budget
  const [formData, setFormData] = useState({
    totalBudget: "",
    currency: "INR",
    accommodationLimit: "",
    transportationLimit: "",
    foodLimit: "",
    activitiesLimit: "",
    shoppingLimit: "",
    miscLimit: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchBudget() {
      try {
        const [budgetData, expensesData, spentSummary] = await Promise.all([
          budgetService.getBudget(tripId).catch(() => null),
          expenseService.getExpenses(tripId).catch(() => []),
          expenseService.getTotalSpent(tripId).catch(() => ({ totalSpent: 0 })),
        ]);
        if (!isMounted) return;
        setBudget(budgetData);
        setExpenses(expensesData || []);
        setTotalSpent(spentSummary?.totalSpent || 0);
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load financial records");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBudget();
    return () => {
      isMounted = false;
    };
  }, [tripId]);

  // Pre-fill modal fields when opening
  function openEditModal() {
    if (budget) {
      setFormData({
        totalBudget: budget.totalBudget || "",
        currency: budget.currency || "INR",
        accommodationLimit: budget.accommodationLimit || "",
        transportationLimit: budget.transportationLimit || "",
        foodLimit: budget.foodLimit || "",
        activitiesLimit: budget.activitiesLimit || "",
        shoppingLimit: budget.shoppingLimit || "",
        miscLimit: budget.miscLimit || "",
      });
    } else {
      setFormData({
        totalBudget: "",
        currency: "INR",
        accommodationLimit: "",
        transportationLimit: "",
        foodLimit: "",
        activitiesLimit: "",
        shoppingLimit: "",
        miscLimit: "",
      });
    }
    setModalError("");
    setIsModalOpen(true);
  }

  // Form input change handler
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Save budget handler
  async function handleSaveBudget(e) {
    e.preventDefault();
    setModalError("");

    const totalVal = parseFloat(formData.totalBudget);
    if (!totalVal || totalVal <= 0) {
      setModalError("Please enter a valid total budget greater than 0.");
      return;
    }

    const payload = {
      totalBudget: totalVal,
      currency: formData.currency || "INR",
      accommodationLimit: parseFloat(formData.accommodationLimit) || 0,
      transportationLimit: parseFloat(formData.transportationLimit) || 0,
      foodLimit: parseFloat(formData.foodLimit) || 0,
      activitiesLimit: parseFloat(formData.activitiesLimit) || 0,
      shoppingLimit: parseFloat(formData.shoppingLimit) || 0,
      miscLimit: parseFloat(formData.miscLimit) || 0,
    };

    // Client-side validation: allocations cannot exceed total budget
    const sumAllocations =
      payload.accommodationLimit +
      payload.transportationLimit +
      payload.foodLimit +
      payload.activitiesLimit +
      payload.shoppingLimit +
      payload.miscLimit;

    if (sumAllocations > payload.totalBudget) {
      setModalError(
        `Category allocations (₹${sumAllocations.toLocaleString()}) exceed the total budget (₹${payload.totalBudget.toLocaleString()}) by ₹${(sumAllocations - payload.totalBudget).toLocaleString()}.`
      );
      return;
    }

    setModalSubmitting(true);
    try {
      let saved;
      if (budget && budget.id) {
        saved = await budgetService.updateBudget(tripId, payload);
      } else {
        saved = await budgetService.createBudget(tripId, payload);
      }
      setBudget(saved);
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.message || "Failed to save budget plan.");
    } finally {
      setModalSubmitting(false);
    }
  }

  // Reset / Delete budget handler
  async function handleResetBudget() {
    if (!window.confirm("Are you sure you want to reset this trip budget? All category allocations will be cleared.")) {
      return;
    }
    try {
      await budgetService.deleteBudget(tripId);
      setBudget(null);
    } catch (err) {
      setError(err.message || "Failed to reset budget.");
    }
  }

  // Helper to format currency
  function formatCurrency(amount, currency = "INR") {
    const num = Number(amount || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(num);
  }

  // Total budget
  const total = Number(budget?.totalBudget || 0);

  // Actual spending calculations by category
  const spentByCategory = {
    ACCOMMODATION: 0,
    TRANSPORTATION: 0,
    FOOD: 0,
    ACTIVITIES: 0,
    SHOPPING: 0,
    MISCELLANEOUS: 0,
  };

  expenses.forEach((exp) => {
    const cat = exp.category || "MISCELLANEOUS";
    if (spentByCategory[cat] !== undefined) {
      spentByCategory[cat] += Number(exp.amount || 0);
    } else {
      spentByCategory.MISCELLANEOUS += Number(exp.amount || 0);
    }
  });

  const remainingBudget = total - totalSpent;
  const spentPercentage = total > 0 ? Math.min(100, Math.round((totalSpent / total) * 100)) : 0;
  const isOverBudget = total > 0 && totalSpent > total;

  if (loading) {
    return (
      <div className="budget-loading" style={{ padding: "40px 0", textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
        <p style={{ color: "var(--muted)" }}>Loading financial budget details...</p>
      </div>
    );
  }

  return (
    <div className="budget-tab-container" style={{ marginTop: "24px" }}>
      {error && (
        <div className="message error" style={{ marginBottom: "20px" }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* TOP HEADER & ACTION BUTTONS */}
      <div
        className="budget-header-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
          background: "linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)",
          padding: "20px 24px",
          borderRadius: "14px",
          border: "1px solid #ccfbf1",
          borderLeft: "6px solid #0f766e",
          boxShadow: "0 2px 10px rgba(15, 118, 110, 0.06)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ccfbf1",
              color: "#0f766e",
              padding: "3px 10px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            <span>🎯 Financial Target</span>
          </div>
          <h2 style={{ margin: "0 0 6px", color: "#0f172a", fontSize: "22px", fontWeight: "800", letterSpacing: "-0.01em" }}>
            💰 Budget Planning & Target Allocations
          </h2>
          <p style={{ margin: 0, color: "#475569", fontSize: "14px", fontWeight: "500" }}>
            Plan category expenditure limits and prevent budget overruns before traveling.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="secondary-btn"
            onClick={openEditModal}
            style={{
              padding: "10px 20px",
              fontWeight: "700",
              background: "var(--teal)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(15, 118, 110, 0.2)",
            }}
          >
            {budget ? "⚙️ Modify Budget" : "➕ Set Trip Budget"}
          </button>

          {budget && (
            <button
              type="button"
              onClick={handleResetBudget}
              style={{
                padding: "10px 18px",
                fontWeight: "700",
                color: "#dc2626",
                border: "1.5px solid #f87171",
                background: "#fef2f2",
                borderRadius: "8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#dc2626";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "#dc2626";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fef2f2";
                e.currentTarget.style.color = "#dc2626";
                e.currentTarget.style.borderColor = "#f87171";
              }}
            >
              <span>🗑</span> Reset Budget
            </button>
          )}
        </div>
      </div>

      {/* IF NO BUDGET CONFIGURED */}
      {!budget ? (
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
          <h3 style={{ margin: "0 0 8px", color: "var(--navy)", fontSize: "18px" }}>
            No Budget Configured Yet
          </h3>
          <p style={{ margin: "0 auto 24px", color: "var(--muted)", maxWidth: "460px", fontSize: "14px", lineHeight: "1.6" }}>
            Assign a total spending limit and allocate target amounts for hotel stays, transit, meals, and activities to track your spending.
          </p>
          <button
            onClick={openEditModal}
            style={{
              padding: "12px 28px",
              fontWeight: "700",
              background: "var(--teal)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            ➕ Setup Budget Now
          </button>
        </div>
      ) : (
        /* IF BUDGET EXISTS: RENDER METRICS & BARS */
        <>
          {/* FOUR TOP FINANCIAL METRICS CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
              marginBottom: "30px",
            }}
          >
            {/* Card 1: Total Planned Budget */}
            <div
              style={{
                background: "#ffffff",
                padding: "20px 22px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                PLANNED TOTAL BUDGET
              </div>
              <div style={{ color: "var(--navy)", fontSize: "26px", fontWeight: "800" }}>
                {formatCurrency(total, budget.currency)}
              </div>
              <div style={{ color: "var(--teal)", fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>
                🛡️ Spending ceiling cap
              </div>
            </div>

            {/* Card 2: Actual Total Spent */}
            <div
              style={{
                background: "#ffffff",
                padding: "20px 22px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                ACTUAL TOTAL SPENT
              </div>
              <div style={{ color: "#2563eb", fontSize: "26px", fontWeight: "800" }}>
                {formatCurrency(totalSpent, budget.currency)}
              </div>
              <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>
                🧾 Across {expenses.length} {expenses.length === 1 ? "receipt" : "receipts"} logged
              </div>
            </div>

            {/* Card 3: Remaining Balance */}
            <div
              style={{
                background: "#ffffff",
                padding: "20px 22px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                REMAINING BALANCE
              </div>
              <div style={{ color: remainingBudget >= 0 ? "#16a34a" : "#dc2626", fontSize: "26px", fontWeight: "800" }}>
                {formatCurrency(remainingBudget, budget.currency)}
              </div>
              <div style={{ color: remainingBudget >= 0 ? "#16a34a" : "#dc2626", fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>
                {remainingBudget >= 0 ? "🟢 Within total budget" : `⚠️ Overspent by ${formatCurrency(Math.abs(remainingBudget), budget.currency)}`}
              </div>
            </div>

            {/* Card 4: Budget Utilization */}
            <div
              style={{
                background: "#ffffff",
                padding: "20px 22px",
                borderRadius: "14px",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                BUDGET UTILIZATION
              </div>
              <div style={{ color: isOverBudget ? "#dc2626" : spentPercentage >= 90 ? "#ea580c" : spentPercentage >= 80 ? "#f59e0b" : "#0f766e", fontSize: "26px", fontWeight: "800" }}>
                {spentPercentage}%
              </div>
              <div style={{ color: "var(--muted)", fontSize: "12px", fontWeight: "600", marginTop: "8px" }}>
                {isOverBudget ? "🚨 Limit exceeded" : spentPercentage >= 90 ? "🚨 About to exhaust budget" : spentPercentage >= 80 ? "⚠️ Approaching limit" : "✅ Healthy spending pace"}
              </div>
            </div>
          </div>

          {/* SECTION 1: TARGET CATEGORY ALLOCATIONS */}
          <div
            style={{
              background: "#ffffff",
              padding: "24px 28px 28px",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)",
                border: "1px solid #ccfbf1",
                borderLeft: "6px solid #0f766e",
                borderRadius: "12px",
                padding: "14px 20px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#ccfbf1",
                  color: "#0f766e",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  fontSize: "10px",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                <span>🎯 Allocation Caps</span>
              </div>
              <h3 style={{ margin: "2px 0 4px", color: "#0f172a", fontSize: "18px", fontWeight: "800" }}>
                📊 Target Category Allocations
              </h3>
              <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
                Pre-assigned spending ceilings for stays, transportation, food, and excursions
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              {/* Category 1: Accommodation */}
              <CategoryBar
                icon="🏨"
                title="Accommodation"
                subtitle="Resorts, hotels, homestays"
                amount={budget.accommodationLimit}
                total={total}
                currency={budget.currency}
                color="#0f766e"
              />

              {/* Category 2: Transportation */}
              <CategoryBar
                icon="✈️"
                title="Transportation"
                subtitle="Flights, trains, car rentals, cabs"
                amount={budget.transportationLimit}
                total={total}
                currency={budget.currency}
                color="#2563eb"
              />

              {/* Category 3: Food & Dining */}
              <CategoryBar
                icon="🍽️"
                title="Food & Dining"
                subtitle="Restaurants, cafes, street eats"
                amount={budget.foodLimit}
                total={total}
                currency={budget.currency}
                color="#e86f51"
              />

              {/* Category 4: Activities */}
              <CategoryBar
                icon="🎟️"
                title="Activities & Excursions"
                subtitle="Sightseeing, tour guides, entry tickets"
                amount={budget.activitiesLimit}
                total={total}
                currency={budget.currency}
                color="#8b5cf6"
              />

              {/* Category 5: Shopping */}
              <CategoryBar
                icon="🛍️"
                title="Shopping Purchases"
                subtitle="Souvenirs, local markets, apparel"
                amount={budget.shoppingLimit || 0}
                total={total}
                currency={budget.currency}
                color="#ec4899"
              />

              {/* Category 6: Miscellaneous */}
              <CategoryBar
                icon="📦"
                title="Miscellaneous"
                subtitle="Buffer fund, emergency cash, tips"
                amount={budget.miscLimit}
                total={total}
                currency={budget.currency}
                color="#d97706"
              />
            </div>
          </div>

          {/* SECTION 2: ACTUAL EXPENSE BREAKDOWN BY CATEGORY */}
          <div
            style={{
              background: "#ffffff",
              padding: "24px 28px 28px",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                border: "1px solid #fde68a",
                borderLeft: "6px solid #d97706",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 2px 8px rgba(217, 119, 6, 0.08)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#fde68a",
                    color: "#92400e",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "4px",
                  }}
                >
                  <span>🔥 Live Spending Audit</span>
                </div>
                <h3 style={{ margin: "4px 0 4px", color: "#78350f", fontSize: "19px", fontWeight: "800" }}>
                  🧾 Actual Expenses & Category Spending Breakdown
                </h3>
                <p style={{ margin: 0, color: "#92400e", fontSize: "13px", fontWeight: "500" }}>
                  Live comparison of actual money spent vs your planned limits for each category
                </p>
              </div>

              <div
                style={{
                  background: isOverBudget ? "#fee2e2" : "#f0fdf4",
                  color: isOverBudget ? "#dc2626" : "#16a34a",
                  border: isOverBudget ? "1.5px solid #fca5a5" : "1.5px solid #86efac",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontWeight: "700",
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <span>{isOverBudget ? "⚠️ Over Total Budget" : "✅ Within Total Budget"}</span>
                <span>•</span>
                <span>{formatCurrency(totalSpent, budget.currency)} Total Spent</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <ActualCategorySpendingBar
                icon="🏨"
                title="Stays & Accommodation"
                spent={spentByCategory.ACCOMMODATION}
                limit={budget.accommodationLimit}
                currency={budget.currency}
              />
              <ActualCategorySpendingBar
                icon="✈️"
                title="Transit & Transportation"
                spent={spentByCategory.TRANSPORTATION}
                limit={budget.transportationLimit}
                currency={budget.currency}
              />
              <ActualCategorySpendingBar
                icon="🍽️"
                title="Food & Dining"
                spent={spentByCategory.FOOD}
                limit={budget.foodLimit}
                currency={budget.currency}
              />
              <ActualCategorySpendingBar
                icon="🎟️"
                title="Tours & Activities"
                spent={spentByCategory.ACTIVITIES}
                limit={budget.activitiesLimit}
                currency={budget.currency}
              />
              <ActualCategorySpendingBar
                icon="🛍️"
                title="Shopping Purchases"
                spent={spentByCategory.SHOPPING}
                limit={budget.shoppingLimit || 0}
                currency={budget.currency}
              />
              <ActualCategorySpendingBar
                icon="📦"
                title="Miscellaneous & Others"
                spent={spentByCategory.MISCELLANEOUS}
                limit={budget.miscLimit}
                currency={budget.currency}
              />
            </div>
          </div>
        </>
      )}

      {/* POPUP MODAL: SET / EDIT BUDGET */}
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
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "var(--navy)", fontSize: "20px", fontWeight: "700" }}>
                {budget ? "⚙️ Modify Trip Budget" : "➕ Setup Trip Budget"}
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

            <form onSubmit={handleSaveBudget}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>
                    Total Budget *
                  </label>
                  <input
                    type="number"
                    name="totalBudget"
                    value={formData.totalBudget}
                    onChange={handleInputChange}
                    placeholder="e.g. 50000"
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      fontSize: "15px",
                    }}
                  />
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
                      fontSize: "15px",
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

              <div style={{ margin: "20px 0 10px", fontSize: "14px", fontWeight: "700", color: "var(--navy)" }}>
                Category Target Limits (Optional)
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <ModalCategoryInput
                  icon="🏨"
                  label="Accommodation Limit"
                  name="accommodationLimit"
                  value={formData.accommodationLimit}
                  onChange={handleInputChange}
                />
                <ModalCategoryInput
                  icon="✈️"
                  label="Transportation Limit"
                  name="transportationLimit"
                  value={formData.transportationLimit}
                  onChange={handleInputChange}
                />
                <ModalCategoryInput
                  icon="🍽️"
                  label="Food & Dining Limit"
                  name="foodLimit"
                  value={formData.foodLimit}
                  onChange={handleInputChange}
                />
                <ModalCategoryInput
                  icon="🎟️"
                  label="Activities Limit"
                  name="activitiesLimit"
                  value={formData.activitiesLimit}
                  onChange={handleInputChange}
                />
                <ModalCategoryInput
                  icon="🛍️"
                  label="Shopping Limit"
                  name="shoppingLimit"
                  value={formData.shoppingLimit}
                  onChange={handleInputChange}
                />
                <ModalCategoryInput
                  icon="📦"
                  label="Miscellaneous Limit"
                  name="miscLimit"
                  value={formData.miscLimit}
                  onChange={handleInputChange}
                />
              </div>

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
                  {modalSubmitting ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Subcomponent for Category Progress Bars
 */
function CategoryBar({ icon, title, subtitle, amount, total, currency, color }) {
  const num = Number(amount || 0);
  const percentage = total > 0 ? Math.min(100, Math.round((num / total) * 100)) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>{icon}</span>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--navy)" }}>{title}</div>
            <div style={{ fontSize: "14px", color: "#000000", fontWeight: "500" }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--navy)" }}>
            {new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR" }).format(num)}
          </div>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)" }}>{percentage}% of total</div>
        </div>
      </div>

      {/* Visual Progress Bar Track */}
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#f1f5f9",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: color,
            borderRadius: "999px",
            transition: "width 0.4s ease-in-out",
          }}
        ></div>
      </div>
    </div>
  );
}

/**
 * Subcomponent for Category Input in Modal
 */
function ModalCategoryInput({ icon, label, name, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ fontSize: "18px", width: "24px", textAlign: "center" }}>{icon}</span>
      <div style={{ flex: 1, fontSize: "13px", fontWeight: "600", color: "var(--navy)" }}>{label}</div>
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder="0.00"
        style={{
          width: "140px",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          fontSize: "14px",
          textAlign: "right",
        }}
      />
    </div>
  );
}

/**
 * Subcomponent for Category-wise Actual Spending vs Limit (Task 9 Integration)
 */
function ActualCategorySpendingBar({ icon, title, spent, limit, currency }) {
  const numSpent = Number(spent || 0);
  const numLimit = Number(limit || 0);
  const hasLimit = numLimit > 0;
  const percentage = hasLimit ? Math.round((numSpent / numLimit) * 100) : 0;
  const isOver = hasLimit && numSpent > numLimit;
  const diff = hasLimit ? Math.abs(numLimit - numSpent) : 0;

  // Dynamic visual status colors: Green (<80%), Amber (80-89%), Orange (90-99%), Red (>=100%)
  const statusColor = !hasLimit
    ? "#64748b"
    : isOver
    ? "#dc2626"
    : percentage >= 90
    ? "#ea580c"
    : percentage >= 80
    ? "#d97706"
    : "#0f766e";

  const barWidth = hasLimit ? Math.min(100, percentage) : numSpent > 0 ? 100 : 0;

  return (
    <div
      style={{
        padding: "16px 20px",
        background: "#f8fafc",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "22px" }}>{icon}</span>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--navy)" }}>{title}</div>
            <div style={{ fontSize: "14px", color: "#000000", fontWeight: "600" }}>
              {hasLimit
                ? `Planned Target Limit: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR" }).format(numLimit)}`
                : "No specific ceiling target set"}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "16px", fontWeight: "800", color: statusColor }}>
            {new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR" }).format(numSpent)}
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)", marginLeft: "4px" }}>spent</span>
          </div>

          {hasLimit && (
            <div style={{ fontSize: "12px", fontWeight: "700", color: statusColor, marginTop: "2px" }}>
              {isOver
                ? `⚠️ Over limit by ${new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR" }).format(diff)} (${percentage}%)`
                : percentage === 100
                ? "🟡 100% of target limit reached"
                : `🟢 ${new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR" }).format(diff)} available (${percentage}% used)`}
            </div>
          )}
        </div>
      </div>

      {/* Progress track */}
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#e2e8f0",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            background: statusColor,
            borderRadius: "999px",
            transition: "width 0.4s ease-in-out",
          }}
        />
      </div>
    </div>
  );
}

