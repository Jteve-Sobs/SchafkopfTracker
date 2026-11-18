// Tests für die DOM-freie Achievement-Logik (js/achievementsData.js).
//
// Ausführen mit:  node --test test/

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENTS,
  collectSessions,
  lifetimeBalance,
  computeAchievementStats,
  evaluateAchievements,
  applyUnlocks,
} from "../js/achievementsData.js";
import { migrateIfNeeded } from "../js/migration.js";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const START = { amount: 0, game: "Start", teammates: [] };

// Runden im Minutentakt ab einem Startzeitpunkt
function session(rounds, start = "2026-10-02T20:00:00") {
  const t0 = new Date(start).getTime();
  return [
    START,
    ...rounds.map(([game, amount], i) => ({
      amount,
      game,
      teammates: [],
      time: new Date(t0 + i * 60000).toISOString(),
    })),
  ];
}
const archived = (history, timestamp = "02-10-2026_23-00-00") => ({
  timestamp,
  data: { balance: history.reduce((s, r) => s + r.amount, 0), history },
});
const stats = (data) => computeAchievementStats(data);
const reached = (data) =>
  evaluateAchievements(stats(data))
    .filter((a) => a.reached)
    .map((a) => a.id);

describe("collectSessions", () => {
  test("alle Runden zählen, auch alte und ohne Zeitstempel", () => {
    const old = session([["Sauspiel, Spieler", 0.2]], "2025-09-01T20:00:00");
    const legacy = [START, { amount: 1, game: "-", teammates: [] }, { amount: -0.5, game: "-", teammates: [] }];
    const fresh = session([["Sauspiel, Spieler", 0.2]]);
    const sessions = collectSessions({
      archive: [archived(old, "01-09-2025_23-00-00"), archived(legacy, "04-05-2025_22-00-00")],
      current: fresh,
    });
    // chronologisch: Legacy-Abend (Datum aus dem Archiv-Zeitstempel) zuerst
    assert.deepEqual(sessions.map((s) => s.rounds.length), [2, 1, 1]);
    assert.equal(sessions[0].rounds[0].sessionTime.getFullYear(), 2025);
  });

  test("geladenes altes Archiv ohne Zeitstempel wird nicht doppelt gezählt", () => {
    const legacy = [START, { amount: 1, game: "-", teammates: [] }, { amount: -0.5, game: "-", teammates: [] }];
    const sessions = collectSessions({
      archive: [archived(legacy, "04-05-2025_22-00-00"), archived(legacy, "05-05-2025_10-00-00")],
      current: [START],
    });
    assert.equal(sessions.length, 1);
  });

  test("geladenes Archiv wird nicht doppelt gezählt", () => {
    const h = session([["Sauspiel, Spieler", 0.2], ["Ramsch, Spieler", -0.2]]);
    const continued = [...h, ...session([["Solo, Spieler", 0.5]], "2026-10-02T21:00:00").slice(1)];
    const sessions = collectSessions({ archive: [archived(h)], current: continued });
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].rounds.length, 3);
  });

  test("nach Datum sortiert", () => {
    const a = session([["Sauspiel, Spieler", 0.2]], "2026-10-05T20:00:00");
    const b = session([["Sauspiel, Spieler", 0.2], ["Sauspiel, Spieler", 0.2]], "2026-10-03T20:00:00");
    const sessions = collectSessions({ archive: [archived(a), archived(b)], current: [START] });
    assert.deepEqual(sessions.map((s) => s.rounds.length), [2, 1]);
  });
});

describe("lifetimeBalance", () => {
  test("zählt alte Runden mit, Duplikate nur einmal", () => {
    const legacy = [START, { amount: -5, game: "-", teammates: [] }];
    const h = session([["Sauspiel, Spieler", 2]]);
    assert.equal(lifetimeBalance({ archive: [archived(legacy), archived(h)], current: h }).total, -3);
  });

  // 99 Runden mit 0 €, danach die eigentlichen Runden: Runde 100 ist die erste zählende
  const warmup = Array(99).fill(["Ramsch, Spieler", 0]);

  test("Im Plus bleibt erreicht, wenn die Bilanz wieder fällt", () => {
    const h = session([...warmup, ["Solo, Spieler", 1], ["Solo, Spieler", -2]]);
    const s = stats({ archive: [], current: h });
    assert.equal(s.lifetimeCents, -100);
    assert.ok(reached({ archive: [], current: h }).includes("lifetime-plus"));
  });

  test("Im Plus zählt erst nach 100 Runden", () => {
    const h = session([["Solo, Spieler", 5], ...Array(98).fill(["Ramsch, Spieler", 0]), ["Solo, Spieler", -6]]);
    assert.ok(!reached({ archive: [], current: h }).includes("lifetime-plus"));
    // Plus genau ab Runde 100 zählt
    const h2 = session([["Solo, Spieler", 5], ...Array(98).fill(["Ramsch, Spieler", 0]), ["Ramsch, Spieler", 0]]);
    assert.ok(reached({ archive: [], current: h2 }).includes("lifetime-plus"));
  });

  test("Plus aus alten Abenden zählt auch", () => {
    const old = session([...warmup, ["Solo, Spieler", 5]], "2025-09-01T20:00:00");
    const h = session([["Solo, Spieler", -6]]);
    const data = { archive: [archived(old, "01-09-2025_23-00-00")], current: h };
    assert.equal(stats(data).lifetimeCents, -100);
    assert.ok(reached(data).includes("lifetime-plus"));
  });
});

describe("Achievements", () => {
  test("ohne Runden ist nichts erreicht", () => {
    assert.deepEqual(reached({ archive: [], current: [START] }), []);
  });

  test("Siegesserie wird von 0-€-Runden unterbrochen", () => {
    const wins = Array(4).fill(["Sauspiel, Spieler", 0.2]);
    const h = session([...wins, ["Ramsch, Spieler", 0], ...wins]);
    assert.equal(stats({ archive: [], current: h }).longestWinStreak, 4);
    const h2 = session([...wins, ["Sauspiel, Spieler", 0.2]]);
    assert.ok(reached({ archive: [], current: h2 }).includes("streak-5"));
  });

  test("Comeback: erst −5 €, dann im Plus", () => {
    const h = session([["Solo, Spieler", -5], ["Solo, Spieler", 5.1]]);
    assert.ok(reached({ archive: [], current: h }).includes("comeback"));
    const h2 = session([["Solo, Spieler", -4.9], ["Solo, Spieler", 5]]);
    assert.ok(!reached({ archive: [], current: h2 }).includes("comeback"));
  });

  test("Geld-Achievements rechnen in Cent", () => {
    const h = session(Array(20).fill(["Sauspiel, Spieler", 0.2]));
    const ids = reached({ archive: [], current: h });
    assert.ok(ids.includes("evening-2.5"));
    assert.ok(!ids.includes("evening-5"));
  });

  test("Schwarze Null nur für archivierte Abende mit mind. 10 Runden", () => {
    const rounds = Array(5).fill(null).flatMap(() => [["Sauspiel, Spieler", 0.1], ["Sauspiel, Spieler", -0.1]]);
    const h = session(rounds);
    assert.ok(!reached({ archive: [], current: h }).includes("zero"));
    assert.ok(reached({ archive: [archived(h)], current: [START] }).includes("zero"));
  });

  test("Rollen und seltene Spiele", () => {
    const h = session([
      ...Array(5).fill(["Wenz, Spieler, Schneiderfrei", 0.5]),
      ["Sie, Nichtspieler", -2],
      ["Solo, Nichtspieler, Schwarz", 1],
      ["Geier, Spieler, Tout", 3],
      ["Sauspiel, Spieler", 0.2],
      ["Solo, Spieler", 0.5],
    ]);
    const ids = reached({ archive: [], current: h });
    for (const id of ["wenz-king", "sie", "schwarz", "tout", "collector"]) {
      assert.ok(ids.includes(id), id);
    }
  });

  test("Nachteule und Stammtisch", () => {
    const weeks = [0, 7, 14, 21].map((d) =>
      archived(session([["Sauspiel, Spieler", 0.2]], new Date(2026, 9, 5 + d, 20).toISOString()))
    );
    assert.equal(stats({ archive: weeks, current: [START] }).consecutiveWeeks, 4);
    const night = session([["Sauspiel, Spieler", 0.2]], new Date(2026, 9, 3, 1, 30).toISOString());
    assert.ok(reached({ archive: [], current: night }).includes("night-owl"));
  });

  test("alte Runden ohne Uhrzeit: Stammtisch über Abend-Datum, keine Nachteule", () => {
    const legacy = [START, { amount: -0.3, game: "-", teammates: [] }];
    // Archiv-Zeitstempel 02:30 Uhr ist Ende des Abends, keine Rundenuhrzeit
    const weeks = ["05-05-2025_02-30-00", "12-05-2025_02-30-00", "19-05-2025_02-30-00", "26-05-2025_02-30-00"].map(
      (ts, i) => archived([START, { amount: 0.2 + i, game: "-", teammates: [] }], ts)
    );
    const s = stats({ archive: [archived(legacy, "01-04-2025_22-00-00"), ...weeks], current: [START] });
    assert.equal(s.consecutiveWeeks, 4);
    assert.equal(s.nightOwl, 0);
    assert.equal(s.rounds, 5);
  });

  test("Sammler-Stufen: die seltenste Spielart zählt", () => {
    const each = (n) => ["Sauspiel", "Geier", "Wenz", "Solo"].flatMap((t) => Array(n).fill([`${t}, Spieler`, 0.1]));
    let ids = reached({ archive: [], current: session([...each(9), ["Sauspiel, Spieler", 0.1]]) });
    assert.ok(ids.includes("collector") && !ids.includes("collector-10"));
    ids = reached({ archive: [], current: session(each(10)) });
    assert.ok(ids.includes("collector-10") && !ids.includes("collector-25"));
    assert.equal(stats({ archive: [], current: session(each(25)) }).collectorMin, 25);
    assert.ok(reached({ archive: [], current: session(each(25)) }).includes("collector-25"));
  });

  test("Schwarz und Treuer Partner in Stufen", () => {
    const schwarz = (n) => Array(n).fill(["Sauspiel, Spieler, Schwarz", 0.4]);
    let ids = reached({ archive: [], current: session(schwarz(10)) });
    assert.ok(ids.includes("schwarz-10") && !ids.includes("schwarz-25"));
    ids = reached({ archive: [], current: session(schwarz(25)) });
    assert.ok(ids.includes("schwarz-25"));
    // Schwarz verloren zählt nicht
    assert.ok(!reached({ archive: [], current: session(Array(10).fill(["Solo, Spieler, Schwarz", -1])) }).includes("schwarz"));
    const partner = (n) => Array(n).fill(["Sauspiel, Mitspieler", 0.2]);
    ids = reached({ archive: [], current: session(partner(50)) });
    assert.ok(ids.includes("partner") && ids.includes("partner-50") && !ids.includes("partner-100"));
    assert.ok(reached({ archive: [], current: session(partner(100)) }).includes("partner-100"));
  });

  test("IDs sind eindeutig", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("applyUnlocks", () => {
  test("schaltet neu Erreichtes frei, behält Datum und sperrt nicht mehr Erreichtes", () => {
    const state = {
      unlocked: { sie: "2026-10-03T00:00:00.000Z", schwarz: "2026-10-04T00:00:00.000Z" },
    };
    const results = [
      { id: "sie", reached: false },
      { id: "schwarz", reached: true },
      { id: "tout", reached: true },
    ];
    const now = new Date("2026-10-10T12:00:00Z");
    const { state: next, newlyUnlocked } = applyUnlocks(state, results, now);
    assert.deepEqual(newlyUnlocked.map((a) => a.id), ["tout"]);
    assert.deepEqual(next.unlocked, { schwarz: "2026-10-04T00:00:00.000Z", tout: now.toISOString() });
  });
});

describe("echte Daten", () => {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const file = readdirSync(dir).find((f) => f.startsWith("schafkopf_tracker_history_"));
  const raw = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  // Der Export ist im alten (kumulativen) Format; wie in der App migrieren
  const storage = new Map([["archive", JSON.stringify(raw.archive)]]);
  const fake = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
  const migrated = migrateIfNeeded(fake, raw.current);
  const current = migrated.history;
  const data = { archive: migrated.archive, current };

  test("alle Runden von Anfang an zählen, auch die ohne Zeitstempel", () => {
    const s = computeAchievementStats(data);
    const all = data.archive.reduce((n, e) => n + e.data.history.length - 1, 0) + current.length - 1;
    assert.ok(s.rounds > 534, `nur ${s.rounds} Runden`); // 534 = nur die mit Zeitstempel
    assert.ok(s.rounds <= all);
    assert.ok(s.sessions > 0);
  });
});
