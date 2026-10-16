import React from "react";
import { Bar } from "react-chartjs-2";
import "../../utils/chartSetup";

/**
 * Reusable Top Booked Destinations Bar Chart.
 * Renders high-contrast, large visualization of platform destination frequencies.
 */
export default function DestinationsBarChart({
  destinations = [],
  height = "380px",
}) {
  const hasData = destinations && destinations.length > 0;
  const labels = hasData ? destinations.map((d) => d.destination) : ["No Data"];
  const bookingsData = hasData ? destinations.map((d) => d.totalTrips) : [0];
  const travelersData = hasData ? destinations.map((d) => d.totalTravelers) : [0];

  const chartData = {
    labels,
    datasets: [
      {
        label: "Bookings",
        data: bookingsData,
        backgroundColor: "rgba(59, 130, 246, 0.8)", // Blue-500
        borderRadius: 6,
      },
      {
        label: "Travelers Serviced",
        data: travelersData,
        backgroundColor: "rgba(16, 185, 129, 0.8)", // Emerald-500
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
        labels: { boxWidth: 14, font: { size: 13, weight: "bold" }, color: "#1e293b" },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 13, weight: "700" }, color: "#334155" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: { font: { size: 12, weight: "600" }, color: "#64748b", precision: 0 },
      },
    },
  };

  return (
    <div style={{ height, position: "relative" }}>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}
