import { formatCurrency } from "./input.js";

export const inputField = document.querySelector("input");
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
  Ramsch: "Ramsch",
  Sauspiel: "Sauspiel",
  Geier: "Geier",
  Wenz: "Wenz",
  Solo: "Solo",
  Sie: "Sie",
};

var ramschButton = document.getElementById("Ramsch");
var sauspielButton = document.getElementById("Sauspiel");
var geierButton = document.getElementById("Geier");
var wenzButton = document.getElementById("Wenz");
var soloButton = document.getElementById("Solo");
var sieButton = document.getElementById("Sie");
var mitspielerButton = document.getElementById("Mitspieler");
var spielerButton = document.getElementById("Spieler");
var schneiderfreiButton = document.getElementById("Schneiderfrei");
var schneiderButton = document.getElementById("Schneider");
var schwarzButton = document.getElementById("Schwarz");
var toutButton = document.getElementById("Tout");
export var currentlySelectedGame =
  gameModes[
    document.querySelector(".selectorButtons").querySelector(".active")?.id
  ];
export var currentlySelectedPlayType;
export var currentlySelectedMultiplier;

function activateButtonsForGameModes(gameMode) {
  switch (gameMode) {
    case gameModes.Ramsch:
      // Deactivate all invalid options
      schneiderfreiButton.disabled = true;
      schneiderButton.disabled = true;
      schwarzButton.disabled = true;
      toutButton.disabled = true;
      // Unset all options
      schneiderfreiButton.classList.remove("active");
      schneiderButton.classList.remove("active");
      schwarzButton.classList.remove("active");
      toutButton.classList.remove("active");
      // Enable Mitspieler button
      mitspielerButton.disabled = false;
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
      // Enable Mitspieler button
      mitspielerButton.disabled = false;
      break;
    case gameModes.Geier:
    case gameModes.Wenz:
      // Activate all valid options
      schneiderfreiButton.disabled = false;
      schneiderButton.disabled = false;
      schwarzButton.disabled = false;
      toutButton.disabled = false;
      // Disable Mitspieler button
      mitspielerButton.disabled = true;
      // Set option to Spieler if Mitspieler is active
      if (mitspielerButton.classList.contains("active")) {
        mitspielerButton.classList.remove("active");
        spielerButton.classList.add("active");
      }
      break;
    case gameModes.Solo:
      // Activate all valid options
      schneiderfreiButton.disabled = false;
      schneiderButton.disabled = false;
      schwarzButton.disabled = false;
      toutButton.disabled = false;
      // Disable Mitspieler button
      mitspielerButton.disabled = true;
      // Set option to Spieler if Mitspieler is active
      if (mitspielerButton.classList.contains("active")) {
        mitspielerButton.classList.remove("active");
        spielerButton.classList.add("active");
      }
      break;
    case gameModes.Sie:
      // Deactivate all invalid options
      schneiderfreiButton.disabled = true;
      schneiderButton.disabled = true;
      schwarzButton.disabled = true;
      toutButton.disabled = true;
      // Unset all options
      schneiderfreiButton.classList.remove("active");
      schneiderButton.classList.remove("active");
      schwarzButton.classList.remove("active");
      toutButton.classList.remove("active");
      // Disable Mitspieler button
      mitspielerButton.disabled = true;
      // Set option to Spieler if Mitspieler is active
      if (mitspielerButton.classList.contains("active")) {
        mitspielerButton.classList.remove("active");
        spielerButton.classList.add("active");
      }
      break;
    default:
      console.log("Invalid game mode selected.", gameMode);
      break;
  }
}

export function resetSelectorButtonsActionvationToDefault() {
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

// Buttons for selecting amount +/- 0.10
export function adjustAmount(sign) {
  let currentValue = parseFloat(inputField.value.replace(",", "."));
  if (isNaN(currentValue)) {
    currentValue = 0;
  }
  const adjustment = sign === "+" ? 0.1 : -0.1;
  const newValue = (currentValue + adjustment).toFixed(2);
  inputField.value = formatCurrency(newValue);
}

export function updateAmount() {
  currentlySelectedGame =
    gameModes[
      document.querySelector(".selectorButtons").querySelector(".active")?.id
    ];
  activateButtonsForGameModes(currentlySelectedGame);

  // Spielarten mit ihren Grundbeträgen
  const gameValues = {
    Ramsch: 0.1,
    Sauspiel: 0.2,
    Geier: 0.3,
    Wenz: 0.3,
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

  currentlySelectedPlayType = selectedPlayType;
  currentlySelectedMultiplier = selectedMultiplier;

  let baseAmount = gameValues[selectedGame] || 0;
  let multiplier = multipliers[selectedMultiplier] || 1;
  let amount = baseAmount * multiplier;

  // Wenn Spieler und ein Solo Spiel, dann nochmal x3
  if (
    selectedPlayType === "Spieler" &&
    ["Ramsch", "Geier", "Wenz", "Solo", "Sie"].includes(selectedGame)
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
  return amount;
}

const balanceElement = document.getElementById("balance");
export function updateBalance() {
  balanceElement.innerText = formatCurrency(window.App.balance);
}

window.adjustAmount = adjustAmount;
