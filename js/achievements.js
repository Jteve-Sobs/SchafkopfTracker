import { toastColor, toastBackgroundColor } from "./theme.js";
import { formatCurrency } from "./input.js";
import {
  CATEGORIES,
  computeAchievementStats,
  evaluateAchievements,
  applyUnlocks,
} from "./achievementsData.js";

const STORAGE_KEY = "achievements";

// { since: ISO-Datum der Einführung, unlocked: { id: ISO-Datum } }.
// Beim ersten Laden wird since auf "jetzt" gesetzt: alte Runden zählen nicht.
export function getAchievementState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (state && state.since) return { unlocked: {}, ...state };
  } catch (e) {
    // kaputter Eintrag -> neu anfangen
  }
  const state = { since: new Date().toISOString(), unlocked: {} };
  setAchievementState(state);
  return state;
}

export function setAchievementState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentResults(state) {
  const data = {
    archive: JSON.parse(localStorage.getItem("archive") || "[]"),
    current: window.App.history,
  };
  return evaluateAchievements(computeAchievementStats(data, state.since));
}

// Gleicht die Freischaltungen mit den aktuellen Daten ab (sperrt auch wieder,
// siehe applyUnlocks) und gibt die neu erreichten zurück (ohne Anzeige).
export function checkAchievements() {
  const current = getAchievementState();
  const { state, newlyUnlocked } = applyUnlocks(current, currentResults(current));
  setAchievementState(state);
  return newlyUnlocked;
}

export function notifyAchievements(achievements) {
  if (achievements.length === 0) return;
  Swal.fire({
    title: achievements.length === 1 ? "Achievement freigeschaltet!" : "Achievements freigeschaltet!",
    html: achievements
      .map((a) => `<div class="achievementToastItem">${a.icon} <strong>${a.title}</strong><br><small>${a.description}</small></div>`)
      .join(""),
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: toastBackgroundColor,
    color: toastColor,
  });
}

export function checkAndNotifyAchievements() {
  notifyAchievements(checkAchievements());
}

function formatValue(a, value) {
  return a.money ? formatCurrency(value / 100) : value;
}

function achievementCard(a, unlockedAt) {
  const done = Boolean(unlockedAt);
  let status;
  if (done) {
    status = `Freigeschaltet am ${new Date(unlockedAt).toLocaleDateString("de-DE")}`;
  } else if (a.showValue) {
    status = `Aktuell ${formatValue(a, a.shownValue)}`;
  } else if (a.target > 1) {
    const percent = Math.max(0, Math.min(100, (a.value / a.target) * 100));
    status = `<div class="achievementProgress"><div style="width: ${percent}%"></div></div>${formatValue(
      a,
      Math.max(0, Math.min(a.value, a.target))
    )} / ${formatValue(a, a.target)}`;
  } else {
    status = "Noch nicht erreicht";
  }
  return `<div class="achievementCard${done ? " unlocked" : ""}">
    <div class="achievementIcon">${a.icon}</div>
    <div class="achievementText">
      <strong>${a.title}</strong>
      <div>${a.description}</div>
      <small>${status}</small>
    </div>
  </div>`;
}

function renderAchievements() {
  const state = getAchievementState();
  const results = currentResults(state);
  const unlockedCount = results.filter((a) => state.unlocked[a.id]).length;

  const sections = CATEGORIES.map(({ id, label }) => {
    const cards = results
      .filter((a) => a.category === id)
      .map((a) => achievementCard(a, state.unlocked[a.id]))
      .join("");
    return `<h2>${label}</h2><div class="achievementGrid">${cards}</div>`;
  }).join("");

  document.getElementById("achievementsContent").innerHTML = `<p class="statsSummary"><strong>${unlockedCount} / ${
    results.length
  }</strong> freigeschaltet</p><p><small>Es zählen alle Runden seit ${new Date(state.since).toLocaleDateString(
    "de-DE"
  )}.</small></p>${sections}`;
}

const modal = document.getElementById("achievementsModal");

document.getElementById("achievementsBtn").addEventListener("click", () => {
  // Falls sich die Daten geändert haben, ohne dass geprüft wurde
  checkAchievements();
  renderAchievements();
  modal.style.display = "block";
});

document.getElementById("closeAchievements").addEventListener("click", () => {
  modal.style.display = "none";
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) modal.style.display = "none";
});

// Legt beim ersten Laden den Startzeitpunkt fest
getAchievementState();
