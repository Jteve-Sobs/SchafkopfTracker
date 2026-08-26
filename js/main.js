import { updateSelectedAmount, setDeleteButtonsEnabled } from "./input.js";
import {
  resetSelectorButtonsActionvationToDefault,
  updateAmount,
  updateBalance,
} from "./gameLogic.js";
import { initChart } from "./chart.js";
import { normalizeLegacyEntries, migrateIfNeeded } from "./migration.js";
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

// Convert from legacy format (plain number[]) to the current object format
window.App.history = normalizeLegacyEntries(window.App.history);

// Upgrade history and archive if this is the first load since the
// historyVersion 2 (delta-based) format was introduced
const migrated = migrateIfNeeded(localStorage, window.App.history);
if (migrated) {
  window.App.history = migrated.history;
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
