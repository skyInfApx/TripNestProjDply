import React from "react";
import { Doughnut } from "react-chartjs-2";
import "../../utils/chartSetup";

/**
 * Reusable Category Expense / Volume Donut Chart.
 * Displays category distribution with explicit percentage values in labels and tooltips.
 * Used across Traveler Dashboard, Admin Telemetry Tower, and Reports & Auditing.
 */
export default function CategoryDonutChart({
  items = [],
  title = "Spending by Category",
  height = "260px",
  currencySymbol = "₹",
}) {
  const hasData =
    items &&
    items.length > 0 &&
    items.some((item) => Number(item.totalAmount || item.totalSpent || item.amount || 0) > 0);

  // Standard category display mapper
  const formatCategoryLabel = (cat) => {
    switch (cat) {
      case "ACCOMMODATION":
        return "Hotel";
      case "ACTIVITIES":
        return "Entertainment";
      case "FOOD":
        return "Food";
      case "TRANSPORTATION":
        return "Transportation";
      case "SHOPPING":
        return "Shopping";
      case "MISCELLANEOUS":
        return "Miscellaneous";
      default:
        return cat || "General";
    }
  };

  if (!hasData) {
    return (
      <div
        style={{
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          borderRadius: "12px",
          border: "1px dashed #cbd5e1",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "36px", marginBottom: "8px" }}>🍩</span>
        <strong style={{ color: "var(--navy)", fontSize: "15px", marginBottom: "4px" }}>
          No Expenses Recorded
        </strong>
        <span style={{ fontSize: "12px", color: "#64748b", maxWidth: "260px" }}>
          There are no category expenses logged for this selection yet.
        </span>
      </div>
    );
  }

  const rawValues = items.map((item) => Number(item.totalAmount || item.totalSpent || item.amount || 0));
  const totalSum = rawValues.reduce((acc, val) => acc + val, 0);

  // Percentage formatted labels (Directly satisfies user requirement: show percent value in pie chart)
  const labels = items.map((item) => {
    const val = Number(item.totalAmount || item.totalSpent || item.amount || 0);
    const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : 0;
    return `${formatCategoryLabel(item.category || item.name)} (${pct}%)`;
  });

  const backgroundColors = [
    "#3B82F6", // Blue - Transportation
    "#8B5CF6", // Purple - Hotel
    "#10B981", // Emerald - Food
    "#F59E0B", // Amber - Shopping
    "#EC4899", // Pink - Entertainment
    "#64748B", // Slate - Misc
  ];

  const chartData = {
    labels,
    datasets: [
      {
        data: rawValues,
        backgroundColor: hasData ? backgroundColors.slice(0, labels.length) : ["#e2e8f0"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          font: { size: 12, weight: "700" },
          color: "#334155",
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 13 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            if (!hasData) return " No transactions recorded";
            const val = context.raw || 0;
            const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : 0;
            return ` ${currencySymbol}${Number(val).toLocaleString("en-IN")} (${pct}%)`;
          },
        },
      },
    },
    cutout: "64%",
  };

  // Direct slice figure percentage renderer (satisfies: can in pie chart figure %age val be shown?)
  const sliceLabelsPlugin = {
    id: "sliceLabelsPlugin",
    afterDatasetsDraw(chart) {
      if (!hasData || totalSum <= 0) return;
      const { ctx } = chart;
      ctx.save();
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((element, index) => {
          const val = Number(dataset.data[index] || 0);
          const pct = (val / totalSum) * 100;
          // Only render text on slices that are large enough (>= 4%)
          if (pct >= 4) {
            const { x, y } = element.tooltipPosition();
            ctx.font = "bold 11px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 4;
            ctx.fillText(`${pct.toFixed(0)}%`, x, y);
          }
        });
      });
      ctx.restore();
    },
  };

  return (
    <div style={{ height, position: "relative" }}>
      <Doughnut data={chartData} options={chartOptions} plugins={[sliceLabelsPlugin]} />
      {hasData && (
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
            Total Share
          </span>
          <strong style={{ display: "block", fontSize: "18px", color: "var(--navy)", fontWeight: "800" }}>
            100%
          </strong>
        </div>
      )}
    </div>
  );
}
