import { updateChart } from "./chart.js";

const toastDarkModeColor = "#ffffff";
const toastDarkModeBackgroundColor = "#19191a";
const toastLightModeColor = "#545454";
const toastLightModeBackgroundColor = "#ffffff";
export var toastColor = toastLightModeColor;
export var toastBackgroundColor = toastLightModeBackgroundColor;
const toggleBtn = document.getElementById("toggleDark");
toggleBtn.innerHTML = "🌗";
if (localStorage.getItem("darkmode") === "true") {
  document.body.classList.add("dark");
  toastBackgroundColor = toastDarkModeBackgroundColor;
  toastColor = toastDarkModeColor;
  toggleBtn.innerHTML = "🌕";

  updateChart();
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

  updateChart();
});
