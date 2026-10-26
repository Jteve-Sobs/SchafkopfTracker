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
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SINCE = "2026-10-01T00:00:00";
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
const stats = (data) => computeAchievementStats(data, SINCE);
const reached = (data) =>
  evaluateAchievements(stats(data))
    .filter((a) => a.reached)
    .map((a) => a.id);

describe("collectSessions", () => {
  test("Runden vor der Einführung und ohne Zeitstempel zählen nicht", () => {
    const old = session([["Sauspiel, Spieler", 0.2]], "2026-09-01T20:00:00");
    const legacy = [START, { amount: 1, game: "Solo, Spieler", teammates: [] }];
    const fresh = session([["Sauspiel, Spieler", 0.2]]);
    const sessions = collectSessions(
      { archive: [archived(old), archived(legacy)], current: fresh },
      SINCE
    );
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].rounds.length, 1);
  });

  test("geladenes Archiv wird nicht doppelt gezählt", () => {
    const h = session([["Sauspiel, Spieler", 0.2], ["Ramsch, Spieler", -0.2]]);
    const continued = [...h, ...session([["Solo, Spieler", 0.5]], "2026-10-02T21:00:00").slice(1)];
    const sessions = collectSessions({ archive: [archived(h)], current: continued }, SINCE);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].rounds.length, 3);
  });

  test("nach Datum sortiert", () => {
    const a = session([["Sauspiel, Spieler", 0.2]], "2026-10-05T20:00:00");
    const b = session([["Sauspiel, Spieler", 0.2], ["Sauspiel, Spieler", 0.2]], "2026-10-03T20:00:00");
    const sessions = collectSessions({ archive: [archived(a), archived(b)], current: [START] }, SINCE);
    assert.deepEqual(sessions.map((s) => s.rounds.length), [2, 1]);
  });
});

describe("lifetimeBalance", () => {
  test("zählt alte Runden mit, Duplikate nur einmal", () => {
    const legacy = [START, { amount: -5, game: "-", teammates: [] }];
    const h = session([["Sauspiel, Spieler", 2]]);
    assert.equal(lifetimeBalance({ archive: [archived(legacy), archived(h)], current: h }).total, -3);
  });

  test("Im Plus bleibt erreicht, wenn die Bilanz wieder fällt", () => {
    const h = session([["Solo, Spieler", 1], ["Solo, Spieler", -2]]);
    const s = stats({ archive: [], current: h });
    assert.equal(s.lifetimeCents, -100);
    assert.ok(reached({ archive: [], current: h }).includes("lifetime-plus"));
  });

  test("Plus aus der Zeit vor der Einführung zählt nicht", () => {
    const old = session([["Solo, Spieler", 5]], "2026-09-01T20:00:00");
    const h = session([["Solo, Spieler", -6]]);
    assert.ok(!reached({ archive: [archived(old)], current: h }).includes("lifetime-plus"));
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

  test("IDs sind eindeutig", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("applyUnlocks", () => {
  test("schaltet neu Erreichtes frei, behält Datum und sperrt nicht mehr Erreichtes", () => {
    const state = {
      since: SINCE,
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
  const data = JSON.parse(readFileSync(path.join(dir, file), "utf8"));

  test("ab Einführung zählt nichts vom alten Export", () => {
    const s = computeAchievementStats(data, new Date().toISOString());
    assert.equal(s.rounds, 0);
    assert.equal(s.sessions, 0);
  });

  test("rückwirkend gerechnet ergeben sich plausible Werte", () => {
    const s = computeAchievementStats(data, "2000-01-01");
    // nur zeitgestempelte Runden zählen
    assert.ok(s.rounds > 0 && s.rounds < 891);
    assert.ok(s.lifetimeCents < 0);
  });
});
