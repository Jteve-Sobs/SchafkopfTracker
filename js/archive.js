import { generateTimestamp } from "./storage.js";
import { toastColor, toastBackgroundColor } from "./theme.js";
import { updateLocalStorage } from "./input.js";
import { updateBalance } from "./gameLogic.js";
import { updateChart } from "./chart.js";
import { updateSelectedAmount } from "./input.js";

function archiveData() {
  // Hole die aktuellen Daten (Balance und History)
  const archivedData = {
    balance: window.App.balance,
    history: window.App.history,
  };

  // Hole das existierende Archiv aus dem Local Storage, falls vorhanden
  let archive = JSON.parse(localStorage.getItem("archive")) || [];

  // Füge die neuen archivierten Daten hinzu
  archive.push({
    timestamp: generateTimestamp(),
    data: archivedData,
  });

  // Speichere das Archiv zurück im Local Storage
  localStorage.setItem("archive", JSON.stringify(archive));

  displayArchive(); // Aktualisiere die Anzeige des Archivs

  // Benachrichtige den Benutzer
  var timerInterval;
  Swal.fire({
    title: "Archiviert!",
    text: "Die aktuellen Daten wurden archiviert.",
    icon: "success",
    toast: true,
    position: "bottom",
    background: toastBackgroundColor,
    color: toastColor,
    timer: 1200,
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
}
function loadArchivedData(timestamp) {
  // Lade das Archiv aus dem Local Storage
  let archive = JSON.parse(localStorage.getItem("archive")) || [];

  // Finde das archivierte Set basierend auf dem Zeitstempel
  const archivedData = archive.find((item) => item.timestamp === timestamp);

  if (archivedData) {
    if (window.App.history.length > 1) {
      archiveData();
    }
    // Lade die archivierten Daten in die Variablen
    window.App.balance = archivedData.data.balance;
    window.App.history = archivedData.data.history;

    // Aktualisiere den Graphen und die Balance
    updateLocalStorage();
    updateBalance();
    updateChart();
    updateSelectedAmount(window.App.tempAmount);

    var timerInterval;
    Swal.fire({
      title: "Archiv geladen!",
      text: `Die Daten vom ${timestamp} wurden geladen.`,
      icon: "success",
      toast: true,
      position: "bottom",
      background: toastBackgroundColor,
      color: toastColor,
      timer: 1200,
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
  } else {
    Swal.fire({
      title: "Fehler!",
      text: "Das Archiv mit diesem Zeitstempel wurde nicht gefunden.",
      icon: "error",
      toast: true,
      position: "bottom",
      background: toastBackgroundColor,
      color: toastColor,
    });
  }
}
export function displayArchive() {
  let archive = JSON.parse(localStorage.getItem("archive")) || [];
  let archiveList = document.getElementById("archiveList");
  archiveList.innerHTML = "";

  if (archive.length === 0) {
    archiveList.innerHTML = "<li>Keine archivierten Daten vorhanden</li>";
  } else {
    archive.forEach((item) => {
      const listItem = document.createElement("li");

      const timestampText = document.createElement("span");
      timestampText.textContent = item.timestamp;
      timestampText.style.marginRight = "10px";

      const loadButton = document.createElement("button");
      loadButton.textContent = "Laden";
      loadButton.classList.add("buttonSmol");
      loadButton.style.marginRight = "5px";
      loadButton.addEventListener("click", () => {
        loadArchivedData(item.timestamp);
      });

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Löschen";
      deleteButton.classList.add("buttonSmol");
      deleteButton.addEventListener("click", () => {
        deleteArchivedData(item.timestamp);
      });

      listItem.appendChild(timestampText);
      listItem.appendChild(loadButton);
      listItem.appendChild(deleteButton);

      archiveList.appendChild(listItem);
    });
  }
}

function deleteArchivedData(timestamp) {
  var timerInterval;
  Swal.fire({
    title: `Wollen Sie das Archiv ${timestamp} wirklich löschen?`,
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
      let archive = JSON.parse(localStorage.getItem("archive")) || [];

      // Filtere den Eintrag mit dem passenden Zeitstempel heraus
      const updatedArchive = archive.filter(
        (item) => item.timestamp !== timestamp
      );

      // Speichere die gefilterte Liste zurück
      localStorage.setItem("archive", JSON.stringify(updatedArchive));

      // Liste neu anzeigen
      displayArchive();

      Swal.fire({
        title: "Gelöscht!",
        text: `Archiv vom ${timestamp} wurde entfernt.`,
        icon: "success",
        toast: true,
        position: "bottom",
        background: toastBackgroundColor,
        color: toastColor,
        timer: 1200,
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
    }
  });
}

// Archivieren Button Event Listener
document.getElementById("archiveButton").addEventListener("click", () => {
  archiveData();
});

// Archiv-Liste beim Laden der Seite anzeigen
window.onload = function () {
  displayArchive();
};
