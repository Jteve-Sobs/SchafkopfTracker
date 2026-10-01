import { formatCurrency, formatCurrencyPrecise } from "./input.js";
import {
  ROLES,
  MULTIPLIERS,
  filterRounds,
  summarize,
  breakdownByGameType,
} from "./statsData.js";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Montag..Sonntag (JS: 0 = Sonntag)
const CATEGORY_COLUMNS = 5;

const formatPercent = (value) =>
  value === null ? "–" : `${(value * 100).toFixed(2)}%`;

// Eine Tabellenzeile mit Vorkommen, Gewinnquote und Netto innerhalb der Kategorie.
function categoryRow(label, rounds, totalGames, extraClass = "") {
  const s = summarize(rounds);
  const occPercent = formatPercent(totalGames ? s.count / totalGames : 0);
  const cls = extraClass ? ` class="${extraClass}"` : "";
  return `<tr${cls}><td>${label}</td><td>${s.count}</td><td>${occPercent}</td><td>${formatPercent(
    s.winRate
  )}</td><td>${s.count ? formatCurrency(s.sum) : "–"}</td></tr>`;
}

function groupHeaderRow(label) {
  return `<tr class="statsGroupHeader"><td colspan="${CATEGORY_COLUMNS}">${label}</td></tr>`;
}

// Spielart-Zeile, direkt darunter die Aufteilung nach Rolle.
function gameTypeRows(group, totalGames) {
  if (group.rounds.length === 0) {
    return categoryRow(group.label, group.rounds, totalGames);
  }
  return (
    categoryRow(group.label, group.rounds, totalGames) +
    group.roles.map((r) => categoryRow(r.label, r.rounds, totalGames, "statsSubRow")).join("")
  );
}

function formatRoundRef(entry) {
  const when = entry.time
    ? ` – ${new Date(entry.time).toLocaleDateString("de-DE")}`
    : "";
  return `${formatCurrency(entry.amount)} (${entry.game}${when})`;
}

// Beste/schlechteste Runde, Durchschnitt und längste Gewinn-/Verlust-Serie.
// "Ohne Geld"-Runden (amount === 0) zählen weder als Gewinn noch als Verlust
// und unterbrechen eine laufende Serie.
function computeKeyMetrics(rounds) {
  const sorted = [...rounds].sort((a, b) => a.amount - b.amount);
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const avg = rounds.reduce((s, r) => s + r.amount, 0) / rounds.length;

  let longestWin = 0;
  let longestLoss = 0;
  let streak = 0;
  let streakSign = 0;
  for (const r of rounds) {
    const sign = r.amount > 0 ? 1 : r.amount < 0 ? -1 : 0;
    if (sign === 0) {
      streak = 0;
      streakSign = 0;
      continue;
    }
    streak = sign === streakSign ? streak + 1 : 1;
    streakSign = sign;
    if (sign > 0) longestWin = Math.max(longestWin, streak);
    else longestLoss = Math.max(longestLoss, streak);
  }

  return { best, worst, avg, longestWin, longestLoss };
}

// data = kompletter history-Array inkl. führendem Start-Eintrag (amount 0)
function archiveContent(data) {
  if (data.length <= 1) {
    return "<p>Keine Daten vorhanden</p>";
  }

  const rounds = data.slice(1); // ohne Start-Eintrag
  const currentBalance = data.reduce((sum, entry) => sum + entry.amount, 0);
  const currentGames = rounds.length;
  const gewonnen = rounds.filter((r) => r.amount > 0).length;
  const metrics = computeKeyMetrics(rounds);

  const summary = `<p class="statsSummary"><strong>${formatCurrency(
    currentBalance
  )}</strong> · ${currentGames} Spiele · ${gewonnen} gewonnen (${(
    (gewonnen / currentGames) *
    100
  ).toFixed(2)}%)</p>`;

  const categoryRows = [
    groupHeaderRow("Rolle"),
    ...ROLES.map((role) => categoryRow(role, filterRounds(rounds, { role }), currentGames)),
    groupHeaderRow("Spielart"),
    ...breakdownByGameType(rounds).map((group) => gameTypeRows(group, currentGames)),
    groupHeaderRow("Modifikator"),
    ...MULTIPLIERS.map((multiplier) =>
      categoryRow(multiplier, filterRounds(rounds, { multiplier }), currentGames)
    ),
  ].join("");

  const categoryTable = `<div class="statsTableWrapper"><table class="statsTable"><thead><tr><th>Kategorie</th><th>Anzahl</th><th>% aller Runden</th><th>% gewonnen</th><th>Netto</th></tr></thead><tbody>${categoryRows}</tbody></table></div>`;

  const metricsRows = [
    ["Beste Runde", formatRoundRef(metrics.best)],
    ["Schlechteste Runde", formatRoundRef(metrics.worst)],
    ["Ø pro Runde", formatCurrencyPrecise(metrics.avg)],
    ["Längste Gewinn-Serie", `${metrics.longestWin} Runde(n)`],
    ["Längste Verlust-Serie", `${metrics.longestLoss} Runde(n)`],
  ]
    .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
    .join("");
  const metricsTable = `<table class="statsTable metricsTable"><tbody>${metricsRows}</tbody></table>`;

  return summary + categoryTable + metricsTable;
}

function computeTimeTrends(rounds) {
  const timed = rounds.filter((r) => r.time);
  if (timed.length === 0) return null;

  const byMonth = new Map();
  const byWeekday = new Map();

  for (const r of timed) {
    const date = new Date(r.time);

    const monthSortKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    if (!byMonth.has(monthSortKey)) {
      byMonth.set(monthSortKey, {
        label: date.toLocaleDateString("de-DE", { year: "numeric", month: "long" }),
        count: 0,
        sum: 0,
      });
    }
    const m = byMonth.get(monthSortKey);
    m.count++;
    m.sum += r.amount;

    const weekday = date.getDay();
    if (!byWeekday.has(weekday)) {
      byWeekday.set(weekday, {
        label: date.toLocaleDateString("de-DE", { weekday: "long" }),
        count: 0,
        sum: 0,
      });
    }
    const w = byWeekday.get(weekday);
    w.count++;
    w.sum += r.amount;
  }

  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const weekdays = WEEKDAY_ORDER.filter((d) => byWeekday.has(d)).map((d) => byWeekday.get(d));

  return { months, weekdays, untrackedCount: rounds.length - timed.length };
}

function renderTrendsTable(rows, headerLabel) {
  const body = rows
    .map(
      (r) =>
        `<tr><td>${r.label}</td><td>${r.count}</td><td>${formatCurrency(r.sum)}</td></tr>`
    )
    .join("");
  return `<table class="statsTable"><thead><tr><th>${headerLabel}</th><th>Runden</th><th>Netto</th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderTimeTrends(rounds) {
  const trends = computeTimeTrends(rounds);
  if (!trends) return "";

  let html = "<h2>Zeitliche Trends</h2>";
  html += "<h3>Nach Monat</h3>";
  html += renderTrendsTable(trends.months, "Monat");
  html += "<h3>Nach Wochentag</h3>";
  html += renderTrendsTable(trends.weekdays, "Wochentag");
  if (trends.untrackedCount > 0) {
    html += `<p><small>${trends.untrackedCount} Runde(n) ohne Zeitstempel nicht berücksichtigt.</small></p>`;
  }
  return html;
}

// Archiv-Zeitstempel haben das Format "DD-MM-YYYY_HH-MM-SS" (generateTimestamp
// in storage.js). Für Sortierung und schöne Anzeige zurück in ein Date parsen.
function parseArchiveTimestamp(ts) {
  const [datePart, timePart] = ts.split("_");
  const [day, month, year] = datePart.split("-").map(Number);
  const [hour, minute, second] = (timePart || "").split("-").map(Number);
  return new Date(year, (month || 1) - 1, day, hour || 0, minute || 0, second || 0);
}

function formatArchiveTimestamp(ts) {
  const date = parseArchiveTimestamp(ts);
  if (Number.isNaN(date.getTime())) return ts; // Fallback bei unerwartetem Format
  return date.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
}

// Kompakte Liste statt eines vollen Statistik-Blocks pro Session direkt im
// Fließtext - bei vielen Archiven (in der Praxis z.B. 48+ Sessions) wäre das
// sonst ein riesiger, unlesbarer Scroll-Block. Details klappen bei Bedarf auf.
function renderArchiveList(archive) {
  if (archive.length === 0) {
    return "<h2>Archiv</h2><p>Keine archivierten Daten vorhanden</p>";
  }

  const sorted = [...archive].sort(
    (a, b) => parseArchiveTimestamp(b.timestamp) - parseArchiveTimestamp(a.timestamp)
  );

  const entriesHTML = sorted
    .map((entry) => {
      const rounds = entry.data.history.length - 1;
      const summary = `${formatArchiveTimestamp(entry.timestamp)} · ${formatCurrency(
        entry.data.balance
      )} · ${rounds} Runde(n)`;
      return `<details class="archiveEntry"><summary>${summary}</summary>${archiveContent(
        entry.data.history
      )}</details>`;
    })
    .join("");

  return `<h2>Archiv (${archive.length})</h2>${entriesHTML}`;
}

function renderStatistics() {
  const currentStatsDiv = document.getElementById("currentStats");
  const allStatsDiv = document.getElementById("allStats");
  const archiveStatsDiv = document.getElementById("archiveStats");

  const data = {
    current: window.App.history,
    archive: JSON.parse(localStorage.getItem("archive") || "[]"),
  };

  currentStatsDiv.innerHTML = "<h2>Aktueller Stand</h2>" + archiveContent(data.current);

  // Nur die eigentlichen Runden einsammeln (ohne die Start-Marker jeder
  // einzelnen Session), dann EINEN gemeinsamen Start-Eintrag davorsetzen.
  // Sonst zählt jede archivierte Session ihren eigenen Start-Marker als
  // Phantom-Runde mit (bei 48 Archiven z.B. 938 statt 890 echte Runden).
  const allRounds = [
    ...data.archive.flatMap((entry) => entry.data.history.slice(1)),
    ...data.current.slice(1),
  ];
  const allEntries = [{ amount: 0, game: "Start", teammates: [] }, ...allRounds];
  allStatsDiv.innerHTML =
    "<h2>Gesamte Statistik</h2>" + archiveContent(allEntries) + renderTimeTrends(allRounds);

  archiveStatsDiv.innerHTML = renderArchiveList(data.archive);
}

// Modal logic
const modal = document.getElementById("statsModal");
const btn = document.getElementById("showStatsBtn");
const span = document.getElementById("closeModal");

btn.onclick = function () {
  renderStatistics();
  modal.style.display = "block";
};

span.onclick = function () {
  modal.style.display = "none";
};

window.onclick = function (event) {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};
