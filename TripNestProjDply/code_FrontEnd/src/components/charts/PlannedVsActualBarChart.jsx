import React from "react";
import { Bar } from "react-chartjs-2";
import "../../utils/chartSetup";

/**
 * Reusable Planned vs. Actual Category Spending Bar Chart.
 * Compares the allocated budget cap against actual expenses per category.
 */
export default function PlannedVsActualBarChart({
  categories = [],
  tripData = [],
  labels: customLabels,
  plannedValues: customPlanned,
  actualValues: customActual,
  height = "290px",
  currencySymbol = "₹",
  plannedLabel = "Planned Budget",
  actualLabel = "Actual Outflow",
}) {
  const formatCategory = (cat) => {
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
        return cat;
    }
  };

  let labels = [];
  let plannedValues = [];
  let actualValues = [];

  if (customLabels && customLabels.length > 0) {
    labels = customLabels;
    plannedValues = customPlanned || [];
    actualValues = customActual || [];
  } else if (tripData && tripData.length > 0) {
    labels = tripData.map((t) => t.title || t.name || t.destination || "Trip");
    plannedValues = tripData.map((t) => Number(t.plannedBudget ?? t.budget ?? t.totalBudget ?? 0));
    actualValues = tripData.map((t) => Number(t.actualSpent ?? t.spent ?? t.totalSpent ?? 0));
  } else if (categories && categories.length > 0) {
    labels = categories.map((c) => formatCategory(c.category));
    plannedValues = categories.map((c) => Number(c.allocatedLimit || 0));
    actualValues = categories.map((c) => Number(c.totalSpent || 0));
  } else {
    labels = ["Transportation", "Hotel", "Food", "Entertainment", "Shopping", "Miscellaneous"];
    plannedValues = [10000, 18000, 8000, 6000, 4000, 2000];
    actualValues = [8500, 9200, 7200, 4100, 2500, 800];
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: `${plannedLabel} (${currencySymbol})`,
        data: plannedValues,
        backgroundColor: "rgba(15, 118, 110, 0.75)", // Teal/Cyan
        borderColor: "#0f766e",
        borderWidth: 1.5,
        borderRadius: 6,
      },
      {
        label: `${actualLabel} (${currencySymbol})`,
        data: actualValues,
        backgroundColor: "rgba(245, 158, 11, 0.85)", // Amber/Orange
        borderColor: "#d97706",
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 14, font: { size: 12, weight: "700" }, color: "#1e293b" },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        padding: 10,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${currencySymbol}${Number(ctx.raw).toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12, weight: "600" }, color: "#334155" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          font: { size: 11 },
          color: "#64748b",
          callback: (v) => `${currencySymbol}${v.toLocaleString("en-IN")}`,
        },
      },
    },
  };

  return (
    <div style={{ height, position: "relative" }}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
