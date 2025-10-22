import { toastColor, toastBackgroundColor } from "./theme.js";
import { updateLocalStorage } from "./input.js";
import { updateBalance } from "./gameLogic.js";
import { updateChart } from "./chart.js";
import { displayArchive } from "./archive.js";

export function generateTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Monat ist 0-basiert
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;
}
function exportHistory() {
  const data = {
    historyVersion: 2,
    current: window.App.history,
    archive: JSON.parse(localStorage.getItem("archive") || "{}"),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `schafkopf_tracker_history_${generateTimestamp()}.json`;
  link.click();
}
document
  .getElementById("importHistoryFile")
  .addEventListener("change", (event) => {
    // Sobald eine Datei ausgewählt wird, importieren wir sie
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = function (e) {
        try {
          // Hier nehmen wir den Inhalt der Datei und setzen ihn als History
          const imported = JSON.parse(e.target.result);

          var errorOccurred = false;
          var errorMessage = "";

          if (imported.historyVersion) {
          }

          if (imported.current && Array.isArray(imported.current)) {
            localStorage.setItem("history", imported.current);
            window.App.history = imported.current;
            window.App.balance =
              window.App.history[window.App.history.length - 1].amount;
            updateLocalStorage();
            updateChart();
            updateBalance();
          } else {
            errorOccurred = true;
            errorMessage =
              "Die Historie konnte nicht geladen werden. Bitte überprüfen Sie die Datei.";
          }
          if (imported.archive) {
            localStorage.setItem("archive", JSON.stringify(imported.archive));
            displayArchive();
          } else {
            errorOccurred = true;
            errorMessage +=
              "Das Archiv konnte nicht geladen werden. Bitte überprüfen Sie die Datei.";
          }

          var timerInterval;
          Swal.fire({
            title: "Import erfolgreich!",
            text: errorMessage,
            icon: "success",
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
        } catch (error) {
          Swal.fire({
            title: "Fehler!",
            text:
              "Die Datei konnte nicht importiert werden. Stellen Sie sicher, dass sie das richtige Format hat. Details: " +
              error,
            icon: "error",
            background: toastBackgroundColor,
            color: toastColor,
          });
        }
      };

      reader.readAsText(file);
    }
  });
document
  .getElementById("exportHistoryButton")
  .addEventListener("click", exportHistory);
document.getElementById("importHistoryButton").addEventListener("click", () => {
  // Der Button löst die Datei-Auswahl aus
  document.getElementById("importHistoryFile").click();
});
