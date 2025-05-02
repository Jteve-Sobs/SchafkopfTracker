const toastDarkModeColor = "#ffffff";
const toastDarkModeBackgroundColor = "#19191a";
const toastLightModeColor = "#545454";
const toastLightModeBackgroundColor = "#ffffff";
var toastColor = toastLightModeColor;
var toastBackgroundColor = toastLightModeBackgroundColor;
const toggleBtn = document.getElementById("toggleDark");
toggleBtn.innerHTML = "🌗";
if (localStorage.getItem("darkmode") === "true") {
  document.body.classList.add("dark");
  toastBackgroundColor = toastDarkModeBackgroundColor;
  toastColor = toastDarkModeColor;
  toggleBtn.innerHTML = "🌕";
  try {
    updateChart();
  } catch (e) {}
}
// Beim Klicken toggeln & speichern
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkmode", document.body.classList.contains("dark"));
  if (document.body.classList.contains("dark")) {
    toastBackgroundColor = toastDarkModeBackgroundColor;
    toastColor = toastDarkModeColor;
    toggleBtn.innerHTML = "🌕";
  } else {
    toastBackgroundColor = toastLightModeBackgroundColor;
    toastColor = toastLightModeColor;
    toggleBtn.innerHTML = "🌗";
  }
  try {
    updateChart();
  } catch (e) {}
});

let tempAmount = 0;

// Logic for the clear button
const inputField = document.querySelector("input");
const clearBtn = document.getElementById("clearBtn");

function toggleClearButton() {
  if (inputField.value && !inputField.validity.valid) {
    clearBtn.style.display = "inline";
  } else {
    clearBtn.style.display = "none";
  }
}
inputField.addEventListener("input", toggleClearButton);
clearBtn.addEventListener("click", () => {
  inputField.value = formatCurrency(0);
  inputField.focus();
  toggleClearButton();
});

const pattern = inputField.pattern;
const regex = new RegExp(pattern);
const confirmButton = document.getElementById("confirmButton");
inputField.addEventListener("input", () => {
  if (regex.test(inputField.value)) {
    confirmButton.disabled = false;
  } else {
    confirmButton.disabled = true;
  }
});

const gameModes = {
  Ramsch,
  Sauspiel,
  GeierWenz,
  Solo,
  Sie,
};

var ramschButton = document.getElementById("Ramsch");
var sauspielButton = document.getElementById("Sauspiel");
var geierWenzButton = document.getElementById("GeierWenz");
var soloButton = document.getElementById("Solo");
var sieButton = document.getElementById("Sie");
var schneiderfreiButton = document.getElementById("Schneiderfrei");
var schneiderButton = document.getElementById("Schneider");
var schwarzButton = document.getElementById("Schwarz");
var toutButton = document.getElementById("Tout");

function activateButtonsForGameModes(gameMode) {
  switch (gameMode) {
    case gameModes.Ramsch:
      // Deactivate all invalid options
      schneiderfreiButton.disabled = true;
      schneiderButton.disabled = true;
      schwarzButton.disabled = true;
      toutButton.disabled = true;
      // Set option to schneiderfrei
      schneiderfreiButton.classList.add("active");
      schneiderButton.classList.remove("active");
      schwarzButton.classList.remove("active");
      toutButton.classList.remove("active");
      break;
    case gameModes.Sauspiel:
      // Activate all valid options
      schneiderfreiButton.disabled = false;
      schneiderButton.disabled = false;
      schwarzButton.disabled = false;
      // Deactivate all invalid options
      toutButton.disabled = true;
      // Set option to schneiderfrei if tout is active
      if (toutButton.classList.contains("active")) {
        toutButton.classList.remove("active");
        schneiderfreiButton.classList.add("active");
      }
      break;
    case gameModes.GeierWenz:
      // Activate all valid options
      schneiderfreiButton.disabled = false;
      schneiderButton.disabled = false;
      schwarzButton.disabled = false;
      toutButton.disabled = false;
      break;
    case gameModes.Solo:
      // Activate all valid options
      schneiderfreiButton.disabled = false;
      schneiderButton.disabled = false;
      schwarzButton.disabled = false;
      toutButton.disabled = false;
      break;
    case gameModes.Sie:
      // Deactivate all invalid options
      schneiderfreiButton.disabled = true;
      schneiderButton.disabled = true;
      schwarzButton.disabled = true;
      toutButton.disabled = true;
      // Set option to schneiderfrei
      schneiderfreiButton.classList.add("active");
      schneiderButton.classList.remove("active");
      schwarzButton.classList.remove("active");
      toutButton.classList.remove("active");
      break;
    default:
      console.log("Invalid game mode selected.", gameMode);
      break;
  }
}

function resetSelectorButtonsActionvationToDefault() {
  const buttons = document.querySelectorAll(".selectorButtons");
  buttons.forEach((button) => {
    button.querySelectorAll(".buttonSmol").forEach((btn) => {
      btn.classList.remove("active");
    });
    button.querySelector('[data-type="default"]').classList.add("active");
  });
  updateAmount();
  activateButtonsForGameModes(gameModes.Sauspiel);
}
resetSelectorButtonsActionvationToDefault();

// Buttons for selecting amount +/- 0.10
function adjustAmount(sign) {
  let currentValue = parseFloat(inputField.value.replace(",", "."));
  if (isNaN(currentValue)) {
    currentValue = 0;
  }
  const adjustment = sign === "+" ? 0.1 : -0.1;
  const newValue = (currentValue + adjustment).toFixed(2);
  inputField.value = formatCurrency(newValue);
}

function updateAmount() {
  activateButtonsForGameModes(
    gameModes[
      document.querySelector(".selectorButtons").querySelector(".active")?.id
    ]
  );

  // Spielarten mit ihren Grundbeträgen
  const gameValues = {
    Ramsch: 0.1,
    Sauspiel: 0.2,
    "Geier/Wenz": 0.3,
    Solo: 0.4,
    Sie: 6.4,
  };

  // Multiplikatoren für Schneider und Schwarz
  const multipliers = {
    Schneiderfrei: 1,
    Schneider: 2,
    Schwarz: 4,
    Tout: 8,
  };

  // Spielauswahl
  let selctorsButtons = document.querySelectorAll(".selectorButtons");
  let selectedGame = selctorsButtons[0]
    .querySelector(".active")
    ?.textContent.trim();
  let selectedPlayType = selctorsButtons[1]
    .querySelector(".active")
    ?.textContent.trim();
  let selectedMultiplier = selctorsButtons[2]
    .querySelector(".active")
    ?.textContent.trim();
  let selectedResult = selctorsButtons[3]
    .querySelector(".active")
    ?.textContent.trim();

  let baseAmount = gameValues[selectedGame] || 0;
  let multiplier = multipliers[selectedMultiplier] || 1;
  let amount = baseAmount * multiplier;

  // Wenn verloren und ein bestimmtes Spiel, dann nochmal x3
  if (
    selectedPlayType === "Spieler" &&
    ["Ramsch", "Geier/Wenz", "Solo", "Sie"].includes(selectedGame)
  ) {
    amount *= 3;
  }

  // Möglichkeiten bei Ramsch
  // Durchmarsch/Notspiel Spieler gewinnen: -> 0,30€
  // Durchmarsch/Notspiel Nichtspieler gewinnen: -> 0,10€
  // nicht gewinnen oder verlieren -> 0,00€
  // Ramsch verlieren: -> -0,20€
  // Notspiel verlieren: -> -0,20€
  // Durchmarsch/Notspiel Spieler verlieren: -> -0,60€

  // Ramsch verlieren -> einzahlen von 30cent in die Kasse
  if (selectedResult === "Verloren" && "Ramsch".includes(selectedGame)) {
    amount *= 2;
  }

  // Gewinn oder Verlust berechnen
  if (selectedResult === "Verloren") {
    amount *= -1;
  }

  // Betrag in das Input-Feld schreiben
  inputField.value = formatCurrency(amount);
  tempAmount = amount;
}

// Initiale Berechnung beim Laden
updateAmount();

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

var resetButton = document.getElementById("resetButton");
var deleteLastRoundButton = document.getElementById("deleteLastRoundButton");

let balance = parseFloat(localStorage.getItem("balance")) || 0;
let history = JSON.parse(localStorage.getItem("history")) || [0];
for (let i = 0; i < history.length; i++) {
  // Convert from legacy format to new format
  if (typeof history[i] === "number") {
    history[i] = { amount: history[i], game: "-", teammates: [] };
  }
}
// New format example
// let history = [
//   { amount: 1, game: "Geier", teammates: ["Flo"] },
//   { amount: 1.2, game: "test1", teammates: ["Test"] },
// ];

updateSelectedAmount(tempAmount);

setDeleteButtonsEnabled();

const balanceElement = document.getElementById("balance");

const ctx = document.getElementById("chart").getContext("2d");
console.log(history.map((x) => x.amount));
var borderColor = balance < 0 ? "red" : "green";
let chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: history.map((_, i) => `Runde ${i + 1}`),
    datasets: [
      {
        label: "Bilanz",
        data: history.map((x) => x.amount),
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
                "Spiel: " + history[context.dataIndex].game,
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

updateBalance(balance);

function formatCurrency(value) {
  return parseFloat(value).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function updateBalance(balance) {
  balanceElement.innerText = formatCurrency(balance);
}

function updateSelectedAmount(tempAmount) {
  if (document.getElementById("selectedAmount") === null) {
    return;
  }
  var value = formatCurrency(tempAmount);
  document.getElementById("selectedAmount").innerText = value;
}

function reset() {
  if (history.length <= 1) {
    return;
  }

  Swal.fire({
    title: "Wollen Sie wirklich alle Runden löschen?",
    text: "Dies kann nicht mehr rückgängig gemacht werden!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Ja, löschen!",
    cancelButtonText: "Abbrechen",
    background: toastBackgroundColor,
    color: toastColor,
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Gelöscht!",
        text: "Alle Runden wurde gelöscht.",
        icon: "success",
        timer: 1200,
        timerProgressBar: true,
        toast: true,
        position: "bottom",
        background: toastBackgroundColor,
        color: toastColor,
        didOpen: () => {
          // Swal.showLoading();
          const timer = Swal.getPopup().querySelector("b");
          timerInterval = setInterval(() => {
            timer.textContent = `${Swal.getTimerLeft()}`;
          }, 100);
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
      });

      // Functionality here
      tempAmount = 0;
      balance = 0;
      history = [0];
      updateLocalStorage();
      updateBalance(balance);
      updateChart();
      updateSelectedAmount(tempAmount);
      updateAmount();
    }
  });
}

function addAmount(amount) {
  tempAmount += amount;
  updateSelectedAmount(tempAmount);
}

function deleteLastRound() {
  if (history.length <= 1) {
    return;
  }

  Swal.fire({
    title: "Wollen Sie die letzte Runde wirklich löschen?",
    text: "Dies kann nicht mehr rückgängig gemacht werden!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Ja, löschen!",
    cancelButtonText: "Abbrechen",
    background: toastBackgroundColor,
    color: toastColor,
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: "Gelöscht!",
        text: "Die letzte Runde wurde gelöscht.",
        icon: "success",
        timer: 1200,
        timerProgressBar: true,
        toast: true,
        position: "bottom",
        background: toastBackgroundColor,
        color: toastColor,
        didOpen: () => {
          // Swal.showLoading();
          const timer = Swal.getPopup().querySelector("b");
          timerInterval = setInterval(() => {
            timer.textContent = `${Swal.getTimerLeft()}`;
          }, 100);
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
      });

      // Functionality here
      history.pop();
      if (history.length > 1) {
        balance = history[history.length - 1];
      } else {
        balance = 0;
      }

      updateBalance(balance);
      updateSelectedAmount(tempAmount);
      updateLocalStorage();
      updateChart();
    }
  });
}

function resetChoice() {
  tempAmount = 0;
  updateSelectedAmount(tempAmount);
}

function confirmTransaction(type = "plus") {
  let currentValue = parseFloat(inputField.value.replace(",", "."));
  if (isNaN(currentValue)) {
    Swal.fire({
      title: "Ungültiger Betrag",
      text: "Bitte geben Sie einen gültigen Betrag ein.",
      icon: "error",
      background: toastBackgroundColor,
      color: toastColor,
    });
    return;
  }

  balance = balance + currentValue;
  balance = Math.round(balance * 100) / 100;
  let tempItem = {
    amount: balance,
    game: "-",
    teammates: [],
  };
  history.push(tempItem);
  updateBalance(balance);
  updateLocalStorage();
  updateChart();
  // tempAmount = 0;
  resetSelectorButtonsActionvationToDefault();

  updateSelectedAmount(tempAmount);
}

function updateLocalStorage() {
  localStorage.setItem("balance", balance);
  localStorage.setItem("history", JSON.stringify(history));

  setDeleteButtonsEnabled();
}

function setDeleteButtonsEnabled() {
  if (history.length > 1) {
    resetButton.disabled = false;
    deleteLastRoundButton.disabled = false;
  } else {
    resetButton.disabled = true;
    deleteLastRoundButton.disabled = true;
  }
}

function updateChart() {
  chart.data.labels = history.map((_, i) => `Runde ${i}`);
  chart.data.labels[0] = "Start";
  chart.data.datasets[0].data = history.map((x) => x.amount);

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

window.adjustAmount = adjustAmount;
window.reset = reset;
window.addAmount = addAmount;
window.deleteLastRound = deleteLastRound;
window.resetChoice = resetChoice;
window.confirmTransaction = confirmTransaction;
