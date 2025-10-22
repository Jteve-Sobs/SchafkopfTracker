import { updateSelectedAmount, setDeleteButtonsEnabled } from "./input.js";
import {
  resetSelectorButtonsActionvationToDefault,
  updateAmount,
  updateBalance,
} from "./gameLogic.js";
import { initChart } from "./chart.js";
import "./theme.js";
import "./input.js";
import "./gameLogic.js";
import "./storage.js";
import "./chart.js";
import "./archive.js";
import "./stats.js";
import { updateLocalStorage } from "./input.js";

window.App = window.App || {};

window.App.tempAmount = 0;
window.App.balance = parseFloat(localStorage.getItem("balance")) || 0;
window.App.history = JSON.parse(localStorage.getItem("history")) || [
  { amount: 0, game: "Start", teammates: [] },
];

for (let i = 0; i < window.App.history.length; i++) {
  // Convert from legacy format to new format
  if (typeof window.App.history[i] === "number") {
    window.App.history[i] = {
      amount: window.App.history[i],
      game: "-",
      teammates: [],
    };
  }
}

// Upgrade history and archive if older historyVersion
const historyVersion = localStorage.getItem("historyVersion");
if (historyVersion === null) {
  const diffHistory = window.App.history.map((entry, i) => {
    if (i === 0) return { ...entry, amount: entry.amount }; // start value is 0
    const diff = entry.amount - window.App.history[i - 1].amount;
    return { ...entry, amount: diff };
  });
  window.App.history = diffHistory;

  //todo: update all archives

  localStorage.setItem("historyVersion", 2);
  updateLocalStorage();
}

initChart();

resetSelectorButtonsActionvationToDefault();

// Initiale Berechnung beim Laden
window.App.tempAmount = updateAmount();

document.querySelectorAll(".selectorButtons").forEach((div) => {
  div.addEventListener("click", (event) => {
    if (event.target.classList.contains("buttonSmol")) {
      div
        .querySelectorAll(".buttonSmol")
        .forEach((btn) => btn.classList.remove("active"));
      event.target.classList.add("active");
      updateAmount();
    }
  });
});

// New format example
// let history = [
//   { amount: 1, game: "Geier", teammates: ["Flo"] },
//   { amount: 1.2, game: "test1", teammates: ["Test"] },
// ];

updateSelectedAmount(window.App.tempAmount);

setDeleteButtonsEnabled();

updateBalance();
