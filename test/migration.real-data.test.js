// Prüft die Migration gegen einen echten Export aus der Produktion (siehe
// README-Hinweis unten). Läuft nur, wenn die Datei vorhanden ist - so bricht
// `node --test test/` auf anderen Rechnern/CI nicht, falls die (bewusst
// nicht eingecheckte) echte Datendatei fehlt.
//
// WICHTIG: schafkopf_tracker_history_*.json enthält echte persönliche Daten
// (Spielverlauf inkl. Zeitstempel) - siehe Hinweis in .gitignore/README, bevor
// diese Datei jemals committed wird.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { migrateIfNeeded } from "../js/migration.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const realDataFile = readdirSync(testDir).find((f) =>
  /^schafkopf_tracker_history_.*\.json$/.test(f)
);

class FakeStorage {
  constructor(initial = {}) {
    this.data = { ...initial };
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key)
      ? this.data[key]
      : null;
  }
  setItem(key, value) {
    this.data[key] = String(value);
  }
  removeItem(key) {
    delete this.data[key];
  }
}

describe("Migration gegen echten Produktions-Export", { skip: !realDataFile && "keine schafkopf_tracker_history_*.json in test/ gefunden" }, () => {
  const raw = JSON.parse(
    readFileSync(path.join(testDir, realDataFile), "utf-8")
  );

  test("Datei hat die erwartete Export-Struktur (current + archive)", () => {
    assert.ok(Array.isArray(raw.current), "current sollte ein Array sein");
    assert.ok(Array.isArray(raw.archive), "archive sollte ein Array sein");
  });

  test("Vorab-Check: Archiv-Historien sind kumuliert, nicht schon Delta (balance == letzter Eintrag)", () => {
    // Bestätigt die Annahme, auf der die Migration aufbaut: Bevor sie läuft,
    // ist data.balance identisch zum letzten (kumulierten) history-Eintrag,
    // nicht zur Summe aller Einträge. Wäre das nicht so, dürfte die Migration
    // hier gar nicht mehr laufen (Daten wären schon im Delta-Format).
    for (const entry of raw.archive) {
      const last = entry.data.history[entry.data.history.length - 1].amount;
      assert.ok(
        Math.abs(entry.data.balance - last) < 1e-9,
        `Archiv ${entry.timestamp}: balance (${entry.data.balance}) sollte dem letzten kumulierten Eintrag (${last}) entsprechen`
      );
    }
  });

  test("Migration läuft ohne Fehler durch und setzt historyVersion", () => {
    const storage = new FakeStorage({
      history: JSON.stringify(raw.current),
      archive: JSON.stringify(raw.archive),
    });

    assert.doesNotThrow(() => migrateIfNeeded(storage, raw.current));
    assert.equal(storage.getItem("historyVersion"), "2");
  });

  test("Bilanz-Invariante: Summe der neuen Deltas ergibt wieder den ursprünglichen Endstand - für jedes der Archive", () => {
    const storage = new FakeStorage({
      history: JSON.stringify(raw.current),
      archive: JSON.stringify(raw.archive),
    });
    migrateIfNeeded(storage, raw.current);
    const migratedArchive = JSON.parse(storage.getItem("archive"));

    assert.equal(migratedArchive.length, raw.archive.length);

    migratedArchive.forEach((entry, i) => {
      const originalLast =
        raw.archive[i].data.history[raw.archive[i].data.history.length - 1]
          .amount;
      const sum = entry.data.history.reduce((s, e) => s + e.amount, 0);
      assert.ok(
        Math.abs(sum - originalLast) < 1e-6,
        `${entry.timestamp}: Summe der Deltas (${sum}) weicht vom ursprünglichen Endstand (${originalLast}) ab`
      );
    });
  });

  test("Anzahl Runden, game- und teammates-Felder bleiben je Archiv-Eintrag erhalten", () => {
    const storage = new FakeStorage({
      history: JSON.stringify(raw.current),
      archive: JSON.stringify(raw.archive),
    });
    migrateIfNeeded(storage, raw.current);
    const migratedArchive = JSON.parse(storage.getItem("archive"));

    migratedArchive.forEach((entry, i) => {
      const original = raw.archive[i].data.history;
      assert.equal(entry.data.history.length, original.length);
      entry.data.history.forEach((e, j) => {
        assert.equal(e.game, original[j].game);
        assert.deepEqual(e.teammates, original[j].teammates);
        if ("time" in original[j]) assert.equal(e.time, original[j].time);
      });
    });
  });

  test("keine NaN/undefined-Beträge nach der Migration (über current + gesamtes Archiv)", () => {
    const storage = new FakeStorage({
      history: JSON.stringify(raw.current),
      archive: JSON.stringify(raw.archive),
    });
    const result = migrateIfNeeded(storage, raw.current);
    const migratedArchive = JSON.parse(storage.getItem("archive"));

    const allAmounts = [
      ...result.history.map((e) => e.amount),
      ...migratedArchive.flatMap((entry) =>
        entry.data.history.map((e) => e.amount)
      ),
    ];
    const bad = allAmounts.filter(
      (a) => typeof a !== "number" || Number.isNaN(a)
    );
    assert.deepEqual(bad, [], `${bad.length} ungültige Beträge gefunden`);
  });
});
