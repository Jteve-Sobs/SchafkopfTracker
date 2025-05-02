import { getVersion } from "./version.js";

// Clear the reload flag after the page reloads
if (localStorage.getItem("swUpdated")) {
  localStorage.removeItem("swUpdated");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then((reg) => {
    fetch("https://tracker.florian-reichert.de/version.json", {
      cache: "reload",
    }).then((response) => response.json());
    // .then((data) => console.log(data));

    reg.onupdatefound = () => {
      const newWorker = reg.installing;
      newWorker.onstatechange = () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          console.log("Neue Version verfügbar!");

          // Prevent infinite reloads
          if (!localStorage.getItem("swUpdated")) {
            localStorage.setItem("swUpdated", "true");
            setTimeout(() => {
              window.location.reload(); // Reload to fetch new files
            }, 1000); // Shorter delay for testing
          }
        }
      };
    };
  });
}

async function displayVersion() {
  const version = await getVersion();
  document.getElementById("version").textContent = `V${version}`;
}

displayVersion();
