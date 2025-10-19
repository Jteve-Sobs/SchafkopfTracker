# Schafkopf Tracker

Ein einfacher **Schafkopf-Bilanz-Tracker** im Browser.  
Dieses Projekt ermöglicht das Erfassen von Spielrunden, Berechnung von Gewinnen/Verlusten, Anzeige des Verlaufs der Runden in einem Graphen und Archivierung der Daten.

## 📦 Features

- Dark/Light Mode mit lokalem Speicher
- Eingabefeld für Beträge (+/- 0,10 Buttons, Clear-Funktion)
- Auswahl von Spielmodi (Ramsch, Sauspiel, Geier, Wenz, Solo, Sie)
- Multiplikatoren für Schneider, Schwarz, Tout
- Berechnung der Bilanz pro Runde
- Historie der Runden im LocalStorage gespeichert
- Grafische Darstellung der Bilanz (Chart.js)
- Export & Import der History als JSON
- Archivierung von Spielständen
- Statistiken über aktuelle Spiele, Gesamthistorie und Archiv
- Keine Backend-Installation erforderlich, wird im LocalStorage gespeichert

## 🛠️ Technologien

- Vanilla JavaScript (ES6, Modularisierung über window.App)
- Chart.js für Graphen
- SweetAlert2 für Alerts/Modals
- HTML/CSS für Layout & Styling

## 📝 Nutzung

- Auswahl der gespielten Runde und ob verloren oder geonnen wurde und welche Multipikatoren aktiv sind oder Betrag eingeben oder anpassen danach mit den - und + Buttons
- Runde bestätigen mit Hinzufügen Button
- Historie verwalten: Reset, Runde löschen
- Daten exportieren/importieren: JSON-Dateien
- Archivieren & laden: Archiv Button & Archiv-Liste
- Statistiken anzeigen: Statistik-Modal öffnen
