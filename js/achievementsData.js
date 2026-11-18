// Reine, DOM-freie Achievement-Logik. Getrennt von achievements.js, damit sie
// ohne window/document testbar ist (siehe test/achievements.test.js).
//
// Gezählt werden alle Runden seit Beginn der Aufzeichnung, auch alte ohne
// eigenen Zeitstempel. Die bekommen das Datum ihres archivierten Abends
// (sessionTime, siehe withSessionTime). Alte Runden ohne Spielart ("-")
// zählen damit für Runden, Abende, Serien und Geld, aber nicht für die
// spielartabhängigen Achievements. Für die Nachteule zählt nur eine echte
// Uhrzeit der Runde.
// Freischaltungen werden mit den Daten abgeglichen (siehe applyUnlocks).

import { parseGame, withSessionTime, roundDate } from "./statsData.js";

export const CATEGORIES = [
  { id: "milestones", label: "Meilensteine" },
  { id: "rare", label: "Seltene Spiele" },
  { id: "streaks", label: "Serien" },
  { id: "money", label: "Geld" },
  { id: "roles", label: "Rollen" },
  { id: "time", label: "Zeit" },
];

export const TIER_ICONS = ["🥉", "🥈", "🥇", "💎"];

// Ohne Sie: das kann man als Nichtspieler nicht gewinnen
const SOLO_TYPES = ["Solo", "Wenz", "Geier"];
const COLLECTOR_TYPES = ["Sauspiel", "Geier", "Wenz", "Solo"];

const cents = (value) => Math.round(value * 100);
const isWin = (r) => r.amount > 0;

// Tag-Index (lokales Datum) -> Wochen-Index mit Montag als Wochenbeginn.
// 01.01.1970 war ein Donnerstag, daher +3.
function weekIndex(date) {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5;
  return Math.floor((day + 3) / 7);
}

// Schlüssel zum Erkennen doppelter Sessions (geladenes Archiv). Alte Runden
// ohne Zeitstempel werden über ihre Position im Abend erkannt.
function roundKey(r, index) {
  if (r.time) return `${new Date(r.time).getTime()}|${r.game}|${r.amount}`;
  return `#${index}|${r.game}|${r.amount}`;
}

function longestRun(rounds, predicate) {
  let best = 0;
  let current = 0;
  for (const r of rounds) {
    current = predicate(r) ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

// Archiv + aktuelle Runde in Sessions mit nur den zählenden Runden umwandeln.
// Wird ein Archiv geladen, steht dieselbe Session danach doppelt drin (im
// Archiv und als aktuelle Runde, später evtl. als zweites Archiv). Sessions,
// deren Runden alle schon in einer größeren Session vorkommen, fliegen raus.
export function collectSessions({ archive = [], current = [] }) {
  const raw = [
    ...archive.map((entry) => ({
      history: withSessionTime(entry.data?.history ?? [], entry.timestamp),
      ended: true,
    })),
    { history: current, ended: false },
  ];

  const sessions = raw
    .map(({ history, ended }) => ({ ended, rounds: history.slice(1) }))
    .filter((s) => s.rounds.length > 0)
    .sort((a, b) => b.rounds.length - a.rounds.length || a.ended - b.ended);

  const seen = new Set();
  const unique = [];
  for (const s of sessions) {
    const keys = s.rounds.map((r, i) => roundKey(r, i));
    if (keys.every((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    unique.push(s);
  }

  // Abende ohne Datum (sollte es nicht geben) ans Ende; sort ist stabil.
  const firstTime = (s) => roundDate(s.rounds[0])?.getTime() ?? Infinity;
  return unique.sort((a, b) => firstTime(a) - firstTime(b));
}

// Ab so vielen Runden zählt die Gesamtbilanz für "Im Plus". Vorher reicht
// ein Glückstreffer am ersten Abend.
export const LIFETIME_MIN_ROUNDS = 100;

// Gesamtbilanz über alle Runden (Duplikate nur einmal, siehe collectSessions).
// best = höchster Zwischenstand der Gesamtbilanz nach einer Runde, in
// zeitlicher Reihenfolge, frühestens nach der LIFETIME_MIN_ROUNDS-ten Runde.
// Damit bleibt "Im Plus" erreicht, wenn die Bilanz danach wieder fällt.
export function lifetimeBalance(data, sessions = collectSessions(data)) {
  let total = 0;
  let best = null;
  let n = 0;
  for (const s of sessions) {
    for (const r of s.rounds) {
      total += r.amount;
      n++;
      if (n >= LIFETIME_MIN_ROUNDS) best = best === null ? total : Math.max(best, total);
    }
  }
  return { total, best };
}

// Alle Kennzahlen, die die Achievements brauchen, in einem Durchlauf.
export function computeAchievementStats(data) {
  const sessions = collectSessions(data);
  const lifetime = lifetimeBalance(data, sessions);
  const rounds = sessions.flatMap((s) => s.rounds);
  const parsed = rounds.map((r) => ({ ...r, ...parseGame(r.game) }));

  const count = (predicate) => parsed.filter(predicate).length;
  const asPlayer = (types) => (r) => types.includes(r.type) && r.role === "Spieler";

  let bestSessionCents = 0;
  let comeback = false;
  let longestWinStreak = 0;
  let zeroSessions = 0;
  let maxRoundsPerSession = 0;
  for (const s of sessions) {
    let running = 0;
    let wasDown = false;
    for (const r of s.rounds) {
      running += cents(r.amount);
      if (running <= -500) wasDown = true;
      if (wasDown && running > 0) comeback = true;
      bestSessionCents = Math.max(bestSessionCents, running);
    }
    // "Ohne Geld"-Runden (0 €) unterbrechen eine Serie, wie in der Statistik
    longestWinStreak = Math.max(longestWinStreak, longestRun(s.rounds, isWin));
    if (s.ended && s.rounds.length >= 10 && running === 0) zeroSessions++;
    maxRoundsPerSession = Math.max(maxRoundsPerSession, s.rounds.length);
  }

  const weeks = [
    ...new Set(rounds.map(roundDate).filter(Boolean).map(weekIndex)),
  ].sort((a, b) => a - b);
  let consecutiveWeeks = 0;
  let run = 0;
  weeks.forEach((w, i) => {
    run = i > 0 && w === weeks[i - 1] + 1 ? run + 1 : 1;
    consecutiveWeeks = Math.max(consecutiveWeeks, run);
  });

  const wenzAsPlayer = parsed.filter(asPlayer(["Wenz"]));
  const ramsch = parsed.filter((r) => r.type === "Ramsch");

  return {
    // Diese Auswertung läuft nur in der geöffneten App -> immer erreicht
    appOpened: 1,
    rounds: rounds.length,
    sessions: sessions.length,
    sauspielAsPlayer: count(asPlayer(["Sauspiel"])),
    soloAsPlayer: count(asPlayer(["Solo"])),
    wenzGeierAsPlayer: count(asPlayer(["Wenz", "Geier"])),
    collectedTypes: COLLECTOR_TYPES.filter((t) => parsed.some(asPlayer([t]))).length,
    // wie oft die seltenste der vier Spielarten als Spieler gespielt wurde
    collectorMin: Math.min(...COLLECTOR_TYPES.map((t) => count(asPlayer([t])))),
    sie: count((r) => r.type === "Sie"),
    toutWon: count((r) => r.multiplier === "Tout" && isWin(r)),
    schwarzWon: count((r) => r.multiplier === "Schwarz" && isWin(r)),
    wenzWinStreak: longestRun(wenzAsPlayer, isWin),
    longestWinStreak,
    comeback: comeback ? 1 : 0,
    bestSessionCents,
    bestRoundCents: Math.max(0, ...rounds.map((r) => cents(r.amount))),
    zeroSessions,
    lifetimeCents: cents(lifetime.total),
    lifetimeBestCents: lifetime.best === null ? 0 : cents(lifetime.best),
    partnerWins: count((r) => r.type === "Sauspiel" && r.role === "Mitspieler" && isWin(r)),
    defenderWins: count(
      (r) => SOLO_TYPES.includes(r.type) && r.role === "Nichtspieler" && isWin(r)
    ),
    ramschNoLossStreak: longestRun(ramsch, (r) => r.amount >= 0),
    nightOwl: count((r) => {
      if (!r.time) return false;
      const hour = new Date(r.time).getHours();
      return hour >= 1 && hour < 5;
    }),
    maxRoundsPerSession,
    consecutiveWeeks,
  };
}

// value: Kennzahl aus computeAchievementStats, target: Schwelle.
// money: true -> Werte sind Cent-Beträge und werden als € angezeigt.
const tiered = (base, stat, steps) =>
  steps.map(([target, title], i) => ({
    ...base,
    id: `${base.id}-${target}`,
    title,
    tier: i,
    stat,
    target: base.money ? Math.round(target * 100) : target,
    description: base.description(target),
  }));

export const ACHIEVEMENTS = [
  { id: "first-open", category: "milestones", icon: "📲", title: "Hello World", description: "Die App das erste Mal geöffnet", stat: "appOpened", target: 1 },
  ...tiered(
    { id: "rounds", category: "milestones", description: (n) => `${n} Runden gespielt` },
    "rounds",
    [[100, "Anfänger"], [500, "Stammspieler"], [1000, "Veteran"], [2500, "Legende"]]
  ),
  ...tiered(
    { id: "sessions", category: "milestones", description: (n) => `${n} Abende gespielt` },
    "sessions",
    [[10, "Gast"], [50, "Stammgast"], [100, "Inventar"]]
  ),
  ...tiered(
    { id: "sauspiel", category: "milestones", description: (n) => `${n} Sauspiele als Spieler` },
    "sauspielAsPlayer",
    [[50, "Sauspieler"], [200, "Sau-Meister"]]
  ),
  ...tiered(
    { id: "solo", category: "milestones", description: (n) => `${n} Soli als Spieler` },
    "soloAsPlayer",
    [[10, "Solist"], [50, "Solo-Künstler"]]
  ),
  ...tiered(
    { id: "wenzgeier", category: "milestones", description: (n) => `${n} Wenz oder Geier als Spieler` },
    "wenzGeierAsPlayer",
    [[10, "Unter & Ober"], [25, "Unter- und Ober-Profi"]]
  ),
  {
    id: "collector",
    category: "milestones",
    icon: "🃏",
    title: "Sammler",
    description: "Sauspiel, Geier, Wenz und Solo je einmal als Spieler",
    stat: "collectedTypes",
    target: COLLECTOR_TYPES.length,
  },
  { id: "collector-10", category: "milestones", icon: "🃏", title: "Allrounder", description: "Sauspiel, Geier, Wenz und Solo je 10-mal als Spieler", stat: "collectorMin", target: 10 },
  { id: "collector-25", category: "milestones", icon: "🃏", title: "Alleskönner", description: "Sauspiel, Geier, Wenz und Solo je 25-mal als Spieler", stat: "collectorMin", target: 25 },

  { id: "sie", category: "rare", icon: "👑", title: "Sie!", description: "Ein Sie gespielt", stat: "sie", target: 1 },
  { id: "tout", category: "rare", icon: "🎯", title: "Tout", description: "Ein Tout gewonnen", stat: "toutWon", target: 1 },
  { id: "schwarz", category: "rare", icon: "🖤", title: "Schwarz", description: "Ein Spiel schwarz gewonnen", stat: "schwarzWon", target: 1 },
  { id: "schwarz-10", category: "rare", icon: "🖤", title: "Schwarzmaler", description: "10 Spiele schwarz gewonnen", stat: "schwarzWon", target: 10 },
  { id: "schwarz-25", category: "rare", icon: "🖤", title: "Schwarz-Meister", description: "25 Spiele schwarz gewonnen", stat: "schwarzWon", target: 25 },
  { id: "wenz-king", category: "rare", icon: "🤴", title: "Wenz-König", description: "5 Wenz als Spieler in Folge gewonnen", stat: "wenzWinStreak", target: 5 },

  ...tiered(
    { id: "streak", category: "streaks", description: (n) => `${n} Runden in Folge an einem Abend gewonnen` },
    "longestWinStreak",
    [[5, "Lauf"], [10, "Unaufhaltsam"], [15, "Unbesiegbar"]]
  ),
  { id: "comeback", category: "streaks", icon: "🔄", title: "Comeback", description: "An einem Abend von −5 € oder tiefer wieder ins Plus", stat: "comeback", target: 1 },

  ...tiered(
    {
      id: "evening",
      category: "money",
      money: true,
      description: (n) => `An einem Abend +${n.toLocaleString("de-DE", { minimumFractionDigits: 2 })} € erreicht`,
    },
    "bestSessionCents",
    [[2.5, "Guter Abend"], [5, "Großer Abend"], [10, "Goldener Abend"]]
  ),
  { id: "big-win", category: "money", icon: "💰", title: "Großer Fang", description: "Eine Runde mit mindestens 5 € gewonnen", stat: "bestRoundCents", target: 500, money: true },
  { id: "zero", category: "money", icon: "⚖️", title: "Schwarze Null", description: "Einen archivierten Abend mit mindestens 10 Runden auf genau 0,00 € beendet", stat: "zeroSessions", target: 1 },
  { id: "lifetime-plus", category: "money", icon: "📈", title: "Im Plus", description: `Gesamtbilanz nach mindestens ${LIFETIME_MIN_ROUNDS} Runden im Plus`, stat: "lifetimeBestCents", valueStat: "lifetimeCents", target: 1, money: true, showValue: true },

  { id: "partner", category: "roles", icon: "🤝", title: "Treuer Partner", description: "25 Sauspiele als Mitspieler gewonnen", stat: "partnerWins", target: 25 },
  { id: "partner-50", category: "roles", icon: "🤝", title: "Verlässlicher Partner", description: "50 Sauspiele als Mitspieler gewonnen", stat: "partnerWins", target: 50 },
  { id: "partner-100", category: "roles", icon: "🤝", title: "Partner fürs Leben", description: "100 Sauspiele als Mitspieler gewonnen", stat: "partnerWins", target: 100 },
  { id: "defender", category: "roles", icon: "🛡️", title: "Verteidiger", description: "50 Soli, Wenz oder Geier als Nichtspieler gewonnen", stat: "defenderWins", target: 50 },
  { id: "ramsch-pro", category: "roles", icon: "🐷", title: "Ramsch-Profi", description: "10 Ramsch in Folge ohne Verlust", stat: "ramschNoLossStreak", target: 10 },

  { id: "night-owl", category: "time", icon: "🦉", title: "Nachteule", description: "Eine Runde zwischen 1 und 5 Uhr nachts gespielt", stat: "nightOwl", target: 1 },
  { id: "marathon", category: "time", icon: "🏃", title: "Marathon", description: "40 Runden an einem Abend", stat: "maxRoundsPerSession", target: 40 },
  { id: "regulars", category: "time", icon: "🍺", title: "Stammtisch", description: "4 Wochen in Folge gespielt", stat: "consecutiveWeeks", target: 4 },
];

export function evaluateAchievements(stats) {
  return ACHIEVEMENTS.map((a) => {
    const value = stats[a.stat];
    return {
      ...a,
      icon: a.icon ?? TIER_ICONS[a.tier],
      value,
      shownValue: stats[a.valueStat ?? a.stat],
      reached: value >= a.target,
    };
  });
}

// State an die aktuellen Daten angleichen: neu Erreichtes bekommt das
// heutige Datum, schon Freigeschaltetes behält sein Datum. Was nicht mehr
// erreicht ist (Runde gelöscht, Reset ohne Archivieren), wird wieder gesperrt,
// sonst könnte man z.B. ein Sie eingeben und gleich wieder löschen.
// Alle Kennzahlen steigen beim normalen Weiterspielen nur an, gesperrt wird
// also nur durch Löschen.
export function applyUnlocks(state, results, now = new Date()) {
  const unlocked = {};
  const newlyUnlocked = [];
  for (const a of results) {
    if (!a.reached) continue;
    if (state.unlocked?.[a.id]) {
      unlocked[a.id] = state.unlocked[a.id];
    } else {
      unlocked[a.id] = now.toISOString();
      newlyUnlocked.push(a);
    }
  }
  return { state: { ...state, unlocked }, newlyUnlocked };
}
