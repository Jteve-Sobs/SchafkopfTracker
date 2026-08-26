// Tests für die History-/Archiv-Datenmigration (js/migration.js).
//
// Ausführen mit:  node --test test/
//
// Nutzt ausschließlich Node-Bordmittel (node:test, node:assert) - keine
// zusätzliche Abhängigkeit nötig, passt zum Vanilla-JS-Ansatz des Projekts.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeLegacyEntries,
  toDeltaHistory,
  upgradeArchive,
  migrateIfNeeded,
} from "../js/migration.js";

// Einfacher In-Memory-Ersatz für localStorage, protokolliert zusätzlich
// alle setItem-Aufrufe, damit Tests prüfen können, was geschrieben wurde.
class FakeStorage {
  constructor(initial = {}) {
    this.data = { ...initial };
    this.setCalls = [];
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key)
      ? this.data[key]
      : null;
  }
  setItem(key, value) {
    this.data[key] = String(value);
    this.setCalls.push([key, String(value)]);
  }
  removeItem(key) {
    delete this.data[key];
  }
}

function assertCloseTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message}: erwartet ~${expected}, erhalten ${actual}`
  );
}

describe("normalizeLegacyEntries", () => {
  test("wandelt reine Zahlen-History (ältestes Format) in Objekte um", () => {
    const result = normalizeLegacyEntries([0, 0.2, 0.4]);
    assert.deepEqual(result, [
      { amount: 0, game: "-", teammates: [] },
      { amount: 0.2, game: "-", teammates: [] },
      { amount: 0.4, game: "-", teammates: [] },
    ]);
  });

  test("lässt bereits-objektbasierte Einträge unangetastet", () => {
    const entry = { amount: 0.3, game: "Sauspiel, Spieler", teammates: [] };
    const result = normalizeLegacyEntries([entry]);
    assert.deepEqual(result, [entry]);
  });

  test("kommt mit gemischtem Zahlen-/Objekt-Array klar", () => {
    const objEntry = { amount: 0.4, game: "Solo, Spieler", teammates: [] };
    const result = normalizeLegacyEntries([0, objEntry]);
    assert.deepEqual(result, [
      { amount: 0, game: "-", teammates: [] },
      objEntry,
    ]);
  });

  test("leeres Array bleibt leer", () => {
    assert.deepEqual(normalizeLegacyEntries([]), []);
  });
});

describe("toDeltaHistory", () => {
  test("rechnet kumulierte Bilanz in Pro-Runde-Deltas um", () => {
    const cumulative = [
      { amount: 0, game: "Start", teammates: [] },
      { amount: 0.2, game: "Sauspiel, Spieler", teammates: [] }, // +0.20
      { amount: 0.4, game: "Sauspiel, Spieler", teammates: [] }, // +0.20
      { amount: 0.2, game: "Sauspiel, Verloren", teammates: [] }, // -0.20
    ];
    const result = toDeltaHistory(cumulative);
    assert.deepEqual(
      result.map((e) => e.amount),
      [0, 0.2, 0.2, -0.2]
    );
  });

  test("Start-Eintrag (Index 0) bleibt unverändert", () => {
    const result = toDeltaHistory([{ amount: 0, game: "Start" }]);
    assert.deepEqual(result, [{ amount: 0, game: "Start" }]);
  });

  test("erhält alle Nicht-amount-Felder der Einträge", () => {
    const cumulative = [
      { amount: 0, game: "Start", teammates: [] },
      {
        amount: 0.3,
        game: "Geier, Spieler, Schneider",
        teammates: ["Flo"],
        time: "2025-01-01T00:00:00.000Z",
      },
    ];
    const result = toDeltaHistory(cumulative);
    assert.equal(result[1].game, "Geier, Spieler, Schneider");
    assert.deepEqual(result[1].teammates, ["Flo"]);
    assert.equal(result[1].time, "2025-01-01T00:00:00.000Z");
    assertCloseTo(result[1].amount, 0.3, "Delta des zweiten Eintrags");
  });

  test("Invariante: Summe der Deltas ergibt wieder den letzten kumulierten Wert", () => {
    // Ein paar unterschiedlich lange, wechselnde Verläufe durchprobieren.
    const sequences = [
      [0, 0.2, 0.4, 0.2, -0.1, -0.1, 0.5],
      [0, -0.4, -0.2, 0.6, 0.6, 0],
      [0, 6.4, 6.0, 12.4],
      [0],
    ];
    for (const seq of sequences) {
      const cumulative = seq.map((amount) => ({ amount }));
      const deltas = toDeltaHistory(cumulative);
      const sum = deltas.reduce((acc, e) => acc + e.amount, 0);
      assertCloseTo(
        sum,
        seq[seq.length - 1],
        `Summe der Deltas für Sequenz ${JSON.stringify(seq)}`
      );
    }
  });
});

describe("upgradeArchive", () => {
  test("null bleibt null (kein Archiv vorhanden)", () => {
    assert.equal(upgradeArchive(null), null);
  });

  test("leeres Archiv bleibt leer", () => {
    assert.deepEqual(upgradeArchive([]), []);
  });

  test("diffed die History jedes Archiv-Eintrags und behält timestamp/balance", () => {
    const archive = [
      {
        timestamp: "01-01-2025_10-00-00",
        data: {
          balance: 0.4,
          history: [
            { amount: 0, game: "Start", teammates: [] },
            { amount: 0.2, game: "Sauspiel, Spieler", teammates: [] },
            { amount: 0.4, game: "Sauspiel, Spieler", teammates: [] },
          ],
        },
      },
    ];
    const result = upgradeArchive(archive);
    assert.equal(result[0].timestamp, "01-01-2025_10-00-00");
    assert.equal(result[0].data.balance, 0.4); // balance selbst wird nicht migriert
    assert.deepEqual(
      result[0].data.history.map((e) => e.amount),
      [0, 0.2, 0.2]
    );
  });

  test("verarbeitet mehrere Archiv-Einträge unabhängig voneinander", () => {
    const archive = [
      {
        timestamp: "a",
        data: { balance: 0.2, history: [{ amount: 0 }, { amount: 0.2 }] },
      },
      {
        timestamp: "b",
        data: { balance: -0.3, history: [{ amount: 0 }, { amount: -0.3 }] },
      },
    ];
    const result = upgradeArchive(archive);
    assert.equal(result[0].data.history[1].amount, 0.2);
    assert.equal(result[1].data.history[1].amount, -0.3);
  });

  test("Archiv-Einträge im ältesten Zahlen-Format (number[]) werden vor dem Diffen normalisiert (Regressionstest für früheren Bug)", () => {
    // Anders als bei window.App.history (siehe main.js/normalizeLegacyEntries)
    // liefen Archiv-Historien früher NICHT durch normalizeLegacyEntries, bevor
    // sie gedifft wurden. Ein sehr altes Archiv (aus der Zeit vor dem
    // Objekt-Format) verlor dadurch beim Upgrade seine Daten (amount wurde
    // NaN, game/teammates gingen komplett verloren). Jetzt gefixt.
    const archive = [
      {
        timestamp: "alt",
        data: { balance: 4, history: [0, 5, 7, 4] }, // ganz altes Format
      },
    ];
    const result = upgradeArchive(archive);
    const history = result[0].data.history;

    assert.deepEqual(
      history,
      [
        { amount: 0, game: "-", teammates: [] },
        { amount: 5, game: "-", teammates: [] },
        { amount: 2, game: "-", teammates: [] },
        { amount: -3, game: "-", teammates: [] },
      ],
      "Zahlen-Legacy-Archiv sollte wie window.App.history normalisiert und korrekt gedifft werden"
    );
  });

  test("normalisiert nur die Einträge, die es brauchen - gemischtes Archiv bleibt korrekt", () => {
    const archive = [
      {
        timestamp: "gemischt",
        data: {
          balance: 0.5,
          history: [
            0, // Legacy-Zahl
            { amount: 0.3, game: "Sauspiel, Spieler", teammates: [] },
            0.5, // wieder Legacy-Zahl
          ],
        },
      },
    ];
    const result = upgradeArchive(archive);
    const history = result[0].data.history;
    assert.deepEqual(
      history.map((e) => e.amount),
      [0, 0.3, 0.2]
    );
    assert.equal(history[1].game, "Sauspiel, Spieler");
  });
});

describe("migrateIfNeeded (Gesamtablauf wie main.js ihn nutzt)", () => {
  test("frischer Storage ohne historyVersion: History wird gedifft, historyVersion gesetzt", () => {
    const storage = new FakeStorage(); // keine historyVersion, kein archive
    const currentHistory = [
      { amount: 0, game: "Start", teammates: [] },
      { amount: 0.2, game: "Sauspiel, Spieler", teammates: [] },
      { amount: 0.4, game: "Sauspiel, Spieler", teammates: [] },
    ];

    const result = migrateIfNeeded(storage, currentHistory);

    assert.ok(result, "Migration sollte durchgeführt worden sein");
    assert.deepEqual(
      result.history.map((e) => e.amount),
      [0, 0.2, 0.2]
    );
    assert.equal(storage.getItem("historyVersion"), "2");
    // Kein Archiv vorhanden -> archive-Key darf nicht angefasst werden
    assert.ok(
      !storage.setCalls.some(([key]) => key === "archive"),
      "archive sollte nicht geschrieben werden, wenn keins existiert"
    );
  });

  test("bereits migrierter Storage wird nicht nochmal migriert (Idempotenz)", () => {
    const storage = new FakeStorage({ historyVersion: "2" });
    const currentHistory = [
      { amount: 0, game: "Start" },
      { amount: 0.2, game: "x" },
    ];
    const result = migrateIfNeeded(storage, currentHistory);
    assert.equal(result, null);
    assert.equal(storage.setCalls.length, 0);
  });

  test("vorhandenes Archiv wird mitmigriert und persistiert", () => {
    const archive = [
      {
        timestamp: "t1",
        data: {
          balance: 0.5,
          history: [{ amount: 0 }, { amount: 0.3 }, { amount: 0.5 }],
        },
      },
    ];
    const storage = new FakeStorage({ archive: JSON.stringify(archive) });
    const currentHistory = [{ amount: 0 }, { amount: 0.1 }];

    const result = migrateIfNeeded(storage, currentHistory);

    assert.ok(result);
    const persisted = JSON.parse(storage.getItem("archive"));
    assert.deepEqual(
      persisted[0].data.history.map((e) => e.amount),
      [0, 0.3, 0.2]
    );
  });

  test("zwei aufeinanderfolgende Aufrufe migrieren nur einmal", () => {
    const storage = new FakeStorage();
    const currentHistory = [{ amount: 0 }, { amount: 0.2 }];

    const first = migrateIfNeeded(storage, currentHistory);
    const second = migrateIfNeeded(storage, currentHistory);

    assert.ok(first, "erster Aufruf migriert");
    assert.equal(second, null, "zweiter Aufruf tut nichts mehr");
  });
});
