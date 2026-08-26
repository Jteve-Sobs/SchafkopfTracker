// Reine, DOM-freie Migrationslogik für die History- und Archiv-Daten.
// Extrahiert aus main.js, damit sie unabhängig von window/localStorage/DOM
// testbar ist (siehe test/migration.test.js). Verhalten bewusst unverändert
// gegenüber der ursprünglichen main.js-Implementierung.

// Konvertiert Einträge aus dem ganz alten Legacy-Format (plain number[])
// in das aktuelle Objekt-Format. Bereits-Objekt-Einträge bleiben unverändert.
export function normalizeLegacyEntries(history) {
  return history.map((entry) =>
    typeof entry === "number"
      ? { amount: entry, game: "-", teammates: [] }
      : entry
  );
}

// Wandelt eine History mit kumulierten Bilanzwerten (Format vor
// historyVersion 2) in eine mit Pro-Runde-Deltas (Gewinn/Verlust) um.
// Eintrag 0 ("Start") bleibt unverändert, da sein kumulierter Wert immer 0 ist.
export function toDeltaHistory(history) {
  return history.map((entry, i) => {
    if (i === 0) return { ...entry, amount: entry.amount };
    const diff = entry.amount - history[i - 1].amount;
    return { ...entry, amount: diff };
  });
}

// Wendet toDeltaHistory auf jeden Archiv-Eintrag an. Historien im ältesten
// Zahlen-Format (aus Archiven von vor dem Objekt-Format) werden vorher durch
// normalizeLegacyEntries geschickt, genau wie window.App.history in main.js -
// sonst gehen game/teammates verloren und amount wird NaN (siehe Testfall
// "Archiv-Einträge im ältesten Zahlen-Format" in migration.test.js).
export function upgradeArchive(archive) {
  if (archive === null) return null;
  return archive.map((archiveEntry) => ({
    ...archiveEntry,
    data: {
      ...archiveEntry.data,
      history: toDeltaHistory(normalizeLegacyEntries(archiveEntry.data.history)),
    },
  }));
}

// Führt das einmalige historyVersion-Upgrade gegen den übergebenen Storage
// aus (alles mit getItem/setItem-Interface, z.B. localStorage oder ein Mock).
// Gibt bei durchgeführter Migration { history, archive } zurück, sonst null
// (Storage ist bereits auf dem aktuellen Stand).
export function migrateIfNeeded(storage, currentHistory) {
  const historyVersion = storage.getItem("historyVersion");
  if (historyVersion !== null) {
    return null;
  }

  const newHistory = toDeltaHistory(currentHistory);

  const archiveRaw = storage.getItem("archive");
  const archive = archiveRaw === null ? null : JSON.parse(archiveRaw);
  const newArchive = upgradeArchive(archive);
  if (newArchive !== null) {
    storage.setItem("archive", JSON.stringify(newArchive));
  }

  storage.setItem("historyVersion", 2);

  return { history: newHistory, archive: newArchive };
}
