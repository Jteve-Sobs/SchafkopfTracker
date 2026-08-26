import { toastColor, toastBackgroundColor } from "./theme.js";
import {
  inputField,
  currentlySelectedGame,
  currentlySelectedPlayType,
  currentlySelectedMultiplier,
  updateBalance,
  resetSelectorButtonsActionvationToDefault,
  updateAmount,
} from "./gameLogic.js";
import { updateChart } from "./chart.js";

export function formatCurrency(value) {
  return parseFloat(value).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export function formatToGermanDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("de-DE", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Berlin",
  });
}

export function updateSelectedAmount(tempAmount) {
  if (document.getElementById("selectedAmount") === null) {
    return;
  }
  var value = formatCurrency(tempAmount);
  document.getElementById("selectedAmount").innerText = value;
}

function reset() {
  if (window.App.history.length <= 1) {
    return;
  }
  var timerInterval;
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
          // timerInterval = setInterval(() => {
          //   timer.textContent = `${Swal.getTimerLeft()}`;
          // }, 100);
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
      });

      // Functionality here
      window.App.tempAmount = 0;
      window.App.balance = 0;
      window.App.history = [{ amount: 0, game: "Start", teammates: [] }];
      updateLocalStorage();
      updateBalance();
      updateChart();
      updateSelectedAmount(window.App.tempAmount);
      updateAmount();
    }
  });
}

function addAmount(amount) {
  window.App.tempAmount += amount;
  updateSelectedAmount(window.App.tempAmount);
}

function deleteLastRound() {
  if (window.App.history.length <= 1) {
    return;
  }

  var timerInterval;
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
      window.App.history.pop();
      if (window.App.history.length > 1) {
        window.App.balance =
          window.App.history[window.App.history.length - 1].amount;
      } else {
        window.App.balance = 0;
      }

      updateBalance();
      updateSelectedAmount(window.App.tempAmount);
      updateLocalStorage();
      updateChart();
    }
  });
}

function resetChoice() {
  window.App.tempAmount = 0;
  updateSelectedAmount(window.App.tempAmount);
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

  window.App.balance = window.App.balance + currentValue;
  window.App.balance = Math.round(window.App.balance * 100) / 100;

  var gameDetails = currentlySelectedGame + ", " + currentlySelectedPlayType;
  if (currentlySelectedMultiplier !== undefined) {
    gameDetails += ", " + currentlySelectedMultiplier;
  }
  let tempItem = {
    amount: currentValue,
    game: gameDetails,
    teammates: [],
    time: new Date(),
  };
  window.App.history.push(tempItem);
  updateBalance();
  updateLocalStorage();
  updateChart();
  // tempAmount = 0;
  resetSelectorButtonsActionvationToDefault();

  updateSelectedAmount(window.App.balance);
}

export function updateLocalStorage() {
  localStorage.setItem("balance", window.App.balance);
  localStorage.setItem("history", JSON.stringify(window.App.history));

  setDeleteButtonsEnabled();
}

var resetButton = document.getElementById("resetButton");
var deleteLastRoundButton = document.getElementById("deleteLastRoundButton");
export function setDeleteButtonsEnabled() {
  if (window.App.history.length > 1) {
    resetButton.disabled = false;
    deleteLastRoundButton.disabled = false;
  } else {
    resetButton.disabled = true;
    deleteLastRoundButton.disabled = true;
  }
}

window.reset = reset;
window.addAmount = addAmount;
window.deleteLastRound = deleteLastRound;
window.resetChoice = resetChoice;
window.confirmTransaction = confirmTransaction;
