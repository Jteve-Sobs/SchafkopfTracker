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
} from "../js/statsData.js";

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
