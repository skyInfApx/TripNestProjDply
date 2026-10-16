import React from "react";
import { Line } from "react-chartjs-2";
import "../../utils/chartSetup";

/**
 * Reusable Trend Line Chart.
 * Used for monthly spending trajectories and platform trip activity over time.
 */
export default function TrendLineChart({
  labels = [],
  data = [],
  seriesLabel = "Trend",
  height = "260px",
  color = "#0f766e",
  fillColor = "rgba(15, 118, 110, 0.12)",
  isCurrency = true,
  currencySymbol = "₹",
}) {
  const chartData = {
    labels: labels.length > 0 ? labels : ["No Data"],
    datasets: [
      {
        label: seriesLabel,
        data: data.length > 0 ? data : [0],
        borderColor: color,
        backgroundColor: fillColor,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 12, font: { size: 12, weight: "600" }, color: "#334155" },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw || 0;
            return isCurrency
              ? ` ${ctx.dataset.label}: ${currencySymbol}${Number(val).toLocaleString("en-IN")}`
              : ` ${ctx.dataset.label}: ${val}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: "600" }, color: "#64748b" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          font: { size: 11 },
          color: "#64748b",
          precision: isCurrency ? undefined : 0,
          callback: (v) => (isCurrency ? `${currencySymbol}${v.toLocaleString("en-IN")}` : v),
        },
      },
    },
  };

  return (
    <div style={{ height, position: "relative" }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
