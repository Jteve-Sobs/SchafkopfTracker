import { formatCurrency } from "./input.js";

export function updateChart() {
  chart.data.labels = window.App.history.map((_, i) => `Runde ${i}`);
  chart.data.labels[0] = "Start";
  chart.data.datasets[0].data = window.App.history.map((x) => x.amount);

  var borderColor = balance < 0 ? "red" : "green";
  chart.data.datasets[0].borderColor = borderColor;

  // Dark mode colors in chart
  const darkMode = localStorage.getItem("darkmode") === "true";
  const gridColor = darkMode ? "#444" : "#ccc";
  const textColor = darkMode ? "#f0f0f0" : "#333";
  const y0Color = darkMode ? "#f0f0f0" : "#333";

  chart.options.scales.x.grid.color = gridColor;
  chart.options.scales.y.grid.color = gridColor;
  chart.options.scales.y.grid.lineWidth = function (context) {
    return context.tick.value === 0 ? 1.2 : 1;
  };
  chart.options.scales.y.grid.color = function (context) {
    return context.tick.value === 0 ? y0Color : gridColor;
  };
  chart.options.scales.x.ticks.color = textColor;
  chart.options.scales.y.ticks.color = textColor;
  chart.options.plugins.legend.labels.color = textColor;

  chart.update();
}
export let chart;
export function initChart() {
  const ctx = document.getElementById("chart").getContext("2d");
  console.log(window.App.history.map((x) => x.amount));
  var borderColor = balance < 0 ? "red" : "green";
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: window.App.history.map((_, i) => `Runde ${i + 1}`),
      datasets: [
        {
          label: "Bilanz",
          data: window.App.history.map((x) => x.amount),
          borderColor: borderColor,
          fill: false,
          pointhoverradius: 10,
          hitRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: { display: true },
        y: {
          display: true,
          ticks: {
            callback: function (value, index, values) {
              return formatCurrency(value);
            },
          },
          grid: {
            // thicker line at y=0
            drawBorder: true,
            color: (context) =>
              context.tick.value === 0 ? "black" : "rgba(0, 0, 0, 0.1)",
            lineWidth: (context) => (context.tick.value === 0 ? 1.01 : 1),
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hides the legend
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              // handle the start value differently
              if (context.dataIndex === 0) {
                return "Gesamt: " + formatCurrency(context.parsed.y);
              } else {
                return [
                  "Gesamt: " + formatCurrency(context.parsed.y),
                  "Differenz: " +
                    formatCurrency(
                      context.parsed.y -
                        context.dataset.data[context.dataIndex - 1]
                    ),
                  "Spiel: " + window.App.history[context.dataIndex].game,
                ];
              }
            },
          },
          title: function (context) {
            return `Runde ${context[0].dataIndex + 1}`;
          },
        },
      },
    },
  });
  updateChart();
}
