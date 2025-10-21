import { formatCurrency } from "./input.js";

function renderStatistics() {
  const currentStatsDiv = document.getElementById("currentStats");
  const allStatsDiv = document.getElementById("allStats");
  const archiveStatsDiv = document.getElementById("archiveStats");

  var data = {
    current: window.App.history,
    archive: JSON.parse(localStorage.getItem("archive") || "[]"),
  };

  currentStatsDiv.innerHTML =
    "<h2>Aktueller Stand</h2>" + archiveContent(data.current);

  const allHistories = data.archive.flatMap((entry) => entry.data.history);
  const allEntries = [...allHistories, ...data.current];
  allStatsDiv.innerHTML =
    "<h2>Gesamte Statistik</h2>" + archiveContent(allEntries);

  let archiveHTML = "<h2>Archiv</h2>";
  let previousBalance = 0;
  data.archive.forEach((entry) => {
    archiveHTML += entry.timestamp + "<br>";
    archiveHTML += archiveContent(entry.data.history);
    previousBalance = window.App.balance;
  });
  if (data.archive.length === 0) {
    archiveHTML += "<p>Keine archivierten Daten vorhanden</p>";
  }

  archiveStatsDiv.innerHTML = archiveHTML;
}

function archiveContent(data) {
  if (data.length <= 1) {
    return "<p>Keine Daten vorhanden</p>";
  } else {
    const currentBalance = data[data.length - 1].amount;
    const currentGames = data.length - 1; // minus 1 for the initial entry
    const gewonnen = data.filter((entry, index, arr) => {
      if (index === 0) return false; // erstes Element überspringen
      return entry.amount > arr[index - 1].amount;
    }).length;
    const spieler = data.filter((n) => n.game.includes("Spieler")).length;
    const mitspieler = data.filter((n) => n.game.includes("Mitspieler")).length;
    const nichtspieler = data.filter((n) =>
      n.game.includes("Nichtspieler")
    ).length;
    const sauspiele = data.filter((n) => n.game.includes("Sauspiel")).length;
    const geier = data.filter((n) => n.game.includes("Geier")).length;
    const wenz = data.filter((n) => n.game.includes("Wenz")).length;
    const solo = data.filter((n) => n.game.includes("Solo")).length;
    const sie = data.filter((n) => n.game.includes("Sie")).length;
    const schneiderfrei = data.filter((n) =>
      n.game.includes("Schneiderfrei")
    ).length;
    const schneider = data.filter(
      (n) => n.game.includes("Schneider") && !n.game.includes("Schneiderfrei")
    ).length;
    const schwarz = data.filter((n) => n.game.includes("Schwarz")).length;
    const tout = data.filter((n) => n.game.includes("Tout")).length;
    const ramsch = data.filter((n) => n.game.includes("Ramsch")).length;
    return `<pre>Letzter Betrag: ${formatCurrency(currentBalance)}
Anzahl Spiele: ${currentGames}
Gewonnen: ${gewonnen} (${((gewonnen / currentGames) * 100).toFixed(2)}%)
Spieler: ${spieler} (${((spieler / currentGames) * 100).toFixed(2)}%)
Mitspieler: ${mitspieler} (${((mitspieler / currentGames) * 100).toFixed(2)}%)
Nichtspieler: ${nichtspieler} (${((nichtspieler / currentGames) * 100).toFixed(
      2
    )}%)

Ramsch: ${ramsch} (${((ramsch / currentGames) * 100).toFixed(2)}%)
Sauspiele: ${sauspiele} (${((sauspiele / currentGames) * 100).toFixed(2)}%)
Geier: ${geier} (${((geier / currentGames) * 100).toFixed(2)}%)
Wenz: ${wenz} (${((wenz / currentGames) * 100).toFixed(2)}%)
Solo: ${solo} (${((solo / currentGames) * 100).toFixed(2)}%)
Sie: ${sie} (${((sie / currentGames) * 100).toFixed(2)}%)

Schneiderfrei: ${schneiderfrei} (${(
      (schneiderfrei / currentGames) *
      100
    ).toFixed(2)}%)
Schneider: ${schneider} (${((schneider / currentGames) * 100).toFixed(2)}%)
Schwartz: ${schwarz} (${((schwarz / currentGames) * 100).toFixed(2)}%)
Tout: ${tout} (${((tout / currentGames) * 100).toFixed(2)}%)
</pre>`;
  }
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
