// Tests für die DOM-freien Statistik-Helfer (js/statsData.js).
//
// Ausführen mit:  node --test test/

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseGame,
  filterRounds,
  summarize,
  breakdownByGameType,
  parseArchiveTimestamp,
  withSessionTime,
  roundDate,
  computeTimeTrends,
} from "../js/statsData.js";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const round = (game, amount) => ({ amount, game, teammates: [] });

describe("parseGame", () => {
  test("zerlegt Spielart, Rolle und Modifikator", () => {
    assert.deepEqual(parseGame("Sauspiel, Nichtspieler, Schneider"), {
      type: "Sauspiel",
      role: "Nichtspieler",
      multiplier: "Schneider",
    });
  });

  test("Ramsch ohne Modifikator", () => {
    assert.deepEqual(parseGame("Ramsch, Spieler"), {
      type: "Ramsch",
      role: "Spieler",
      multiplier: "",
    });
  });

  test("Legacy-Einträge ohne Spielinfo", () => {
    assert.deepEqual(parseGame("-"), { type: "-", role: "", multiplier: "" });
    assert.deepEqual(parseGame(undefined), { type: "", role: "", multiplier: "" });
  });
});

describe("filterRounds", () => {
  const rounds = [
    round("Sauspiel, Spieler, Schneiderfrei", 0.2),
    round("Sauspiel, Mitspieler, Schneiderfrei", 0.2),
    round("Sauspiel, Nichtspieler, Schneider", -0.4),
    round("Solo, Nichtspieler, Schneiderfrei", -0.4),
  ];

  test("Rolle Spieler zählt keine Mit-/Nichtspieler mit", () => {
    assert.equal(filterRounds(rounds, { role: "Spieler" }).length, 1);
  });

  test("Schneider zählt kein Schneiderfrei mit", () => {
    assert.equal(filterRounds(rounds, { multiplier: "Schneider" }).length, 1);
  });

  test("Kombination aus Spielart und Rolle", () => {
    assert.equal(filterRounds(rounds, { type: "Sauspiel", role: "Nichtspieler" }).length, 1);
    assert.equal(filterRounds(rounds, { type: "Solo", role: "Nichtspieler" }).length, 1);
  });
});

describe("summarize", () => {
  test("Netto, Ø und Gewinnquote", () => {
    const s = summarize([round("x", 0.3), round("x", -0.2), round("x", 0)]);
    assert.equal(s.count, 3);
    assert.equal(s.wins, 1);
    assert.ok(Math.abs(s.sum - 0.1) < 1e-9);
    assert.ok(Math.abs(s.avg - 0.1 / 3) < 1e-9);
    assert.equal(s.winRate, 1 / 3);
  });

  test("leere Menge liefert null statt NaN", () => {
    const s = summarize([]);
    assert.equal(s.avg, null);
    assert.equal(s.winRate, null);
  });
});

describe("breakdownByGameType", () => {
  const rounds = [
    round("Sauspiel, Spieler, Schneiderfrei", 0.2),
    round("Sauspiel, Mitspieler, Schneiderfrei", 0.2),
    round("Sauspiel, Nichtspieler, Schneiderfrei", -0.2),
    round("Sauspiel, Nichtspieler, Schneider", -0.4),
    round("Solo, Spieler, Schneiderfrei", 1.2),
    round("Solo, Nichtspieler, Schneiderfrei", -0.4),
  ];
  const byType = Object.fromEntries(breakdownByGameType(rounds).map((g) => [g.type, g]));

  test("Sauspiel in Spieler, Mitspieler, Nichtspieler", () => {
    assert.deepEqual(
      byType.Sauspiel.roles.map((r) => [r.role, r.rounds.length]),
      [
        ["Spieler", 1],
        ["Mitspieler", 1],
        ["Nichtspieler", 2],
      ]
    );
  });

  test("Solo nur in Spieler und Nichtspieler", () => {
    assert.deepEqual(
      byType.Solo.roles.map((r) => [r.role, r.rounds.length]),
      [
        ["Spieler", 1],
        ["Nichtspieler", 1],
      ]
    );
  });

  test("Rolle nach Modifikator unterteilt, nur vorhandene", () => {
    const nicht = byType.Sauspiel.roles.find((r) => r.role === "Nichtspieler");
    assert.deepEqual(
      nicht.multipliers.map((m) => [m.multiplier, m.rounds.length]),
      [
        ["Schneiderfrei", 1],
        ["Schneider", 1],
      ]
    );
    const ramsch = breakdownByGameType([round("Ramsch, Spieler", 0.3)]).find(
      (g) => g.type === "Ramsch"
    );
    assert.deepEqual(ramsch.roles[0].multipliers, []);
  });

  test("Unterzeilen ergeben zusammen die Spielart", () => {
    for (const group of Object.values(byType)) {
      const sub = group.roles.reduce((n, r) => n + r.rounds.length, 0);
      assert.equal(sub, group.rounds.length, group.type);
    }
  });

  test("Geier/Wenz (alt) nur, wenn vorhanden", () => {
    assert.equal(byType["Geier/Wenz"], undefined);
    const withLegacy = breakdownByGameType([round("Geier/Wenz, Spieler, Schneiderfrei", 0.9)]);
    const legacy = withLegacy.find((g) => g.type === "Geier/Wenz");
    assert.equal(legacy.rounds.length, 1);
    // nicht zusätzlich bei Geier oder Wenz gezählt
    assert.equal(withLegacy.find((g) => g.type === "Geier").rounds.length, 0);
    assert.equal(withLegacy.find((g) => g.type === "Wenz").rounds.length, 0);
  });

  test("unerwartete Rolle verschwindet nicht aus der Aufteilung", () => {
    const [geier] = breakdownByGameType([round("Geier, Mitspieler, Schneiderfrei", 0.3)]).filter(
      (g) => g.type === "Geier"
    );
    assert.deepEqual(
      geier.roles.map((r) => [r.role, r.rounds.length]),
      [
        ["Spieler", 0],
        ["Nichtspieler", 0],
        ["Mitspieler", 1],
      ]
    );
  });
});

describe("Datum aus Archiv-Zeitstempel", () => {
  test("parseArchiveTimestamp liest DD-MM-YYYY_HH-MM-SS", () => {
    const d = parseArchiveTimestamp("17-09-2025_20-21-03");
    assert.deepEqual(
      [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()],
      [2025, 8, 17, 20, 21]
    );
  });

  test("Runden ohne time bekommen sessionTime, Runden mit time bleiben", () => {
    const timed = { ...round("Wenz, Spieler, Schneiderfrei", 1), time: "2025-10-22T16:15:46.982Z" };
    const [old, kept] = withSessionTime([round("-", 0.2), timed], "17-09-2025_20-21-03");
    assert.equal(roundDate(old).getDate(), 17);
    assert.equal(old.time, undefined);
    assert.equal(kept, timed);
  });

  test("ungültiger Zeitstempel lässt die Runden unverändert", () => {
    const history = [round("-", 0.2)];
    assert.equal(withSessionTime(history, "kaputt"), history);
  });

  test("Zeit-Trends zählen Runden mit Session-Datum mit", () => {
    const rounds = [
      ...withSessionTime([round("-", 0.2), round("-", -0.1)], "17-09-2025_20-21-03"),
      { ...round("Sauspiel, Spieler, Schneiderfrei", 0.5), time: "2025-10-22T18:00:00.000Z" },
      round("-", 1), // weder time noch Session
    ];
    const t = computeTimeTrends(rounds);
    assert.deepEqual(t.months.map((m) => m.count), [2, 1]);
    assert.deepEqual(t.weekdays.map((w) => [w.label, w.count]), [["Mittwoch", 3]]);
    assert.equal(t.sessionDatedCount, 2);
    assert.equal(t.untrackedCount, 1);
  });
});

const testDir = path.dirname(fileURLToPath(import.meta.url));
const realDataFile = readdirSync(testDir).find((f) =>
  /^schafkopf_tracker_history_.*\.json$/.test(f)
);

describe("Zeit-Trends mit echtem Export", { skip: !realDataFile && "keine schafkopf_tracker_history_*.json in test/ gefunden" }, () => {
  test("keine Archiv-Runde fällt mehr aus den Zeit-Trends heraus", () => {
    const { archive } = JSON.parse(readFileSync(path.join(testDir, realDataFile), "utf8"));
    const rounds = archive.flatMap((e) => withSessionTime(e.data.history.slice(1), e.timestamp));
    const t = computeTimeTrends(rounds);
    assert.equal(t.untrackedCount, 0);
    assert.ok(t.sessionDatedCount > 0);
    const total = t.months.reduce((s, m) => s + m.count, 0);
    assert.equal(total, rounds.length);
  });
});
