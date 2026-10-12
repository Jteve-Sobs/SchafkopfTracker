// Reine, DOM-freie Hilfsfunktionen für die Statistik. Getrennt von stats.js,
// damit sie ohne window/document testbar sind (siehe test/stats.test.js).

export const ROLES = ["Spieler", "Mitspieler", "Nichtspieler"];
const SOLO_ROLES = ["Spieler", "Nichtspieler"];

// type = erster Teil des game-Strings, roles = Rollen, in die die Spielart
// aufgeschlüsselt wird. Mitspieler gibt es nur dort, wo der Button in der
// Eingabe aktiv ist (Ramsch, Sauspiel - siehe activateButtonsForGameModes).
export const GAME_TYPES = [
  { type: "Ramsch", label: "Ramsch", roles: ROLES },
  { type: "Sauspiel", label: "Sauspiele", roles: ROLES },
  { type: "Geier", label: "Geier", roles: SOLO_ROLES },
  { type: "Wenz", label: "Wenz", roles: SOLO_ROLES },
  { type: "Solo", label: "Solo", roles: SOLO_ROLES },
  { type: "Sie", label: "Sie", roles: SOLO_ROLES },
  // Altes kombiniertes Format aus früheren Versionen, nur angezeigt, wenn
  // tatsächlich solche Runden vorhanden sind.
  { type: "Geier/Wenz", label: "Geier/Wenz (alt)", roles: SOLO_ROLES, legacy: true },
];

export const MULTIPLIERS = ["Schneiderfrei", "Schneider", "Schwarz", "Tout"];

// "Sauspiel, Nichtspieler, Schneider" -> { type, role, multiplier }.
// Exakter Vergleich statt includes(): "Nichtspieler".includes("Spieler")
// wäre sonst true und Spieler-Statistiken würden alle Rollen mitzählen.
export function parseGame(game) {
  const [type = "", role = "", multiplier = ""] = String(game ?? "")
    .split(",")
    .map((part) => part.trim());
  return { type, role, multiplier };
}

export function filterRounds(rounds, { type, role, multiplier } = {}) {
  return rounds.filter((r) => {
    const g = parseGame(r.game);
    return (
      (type === undefined || g.type === type) &&
      (role === undefined || g.role === role) &&
      (multiplier === undefined || g.multiplier === multiplier)
    );
  });
}

export function summarize(rounds) {
  const count = rounds.length;
  const wins = rounds.filter((r) => r.amount > 0).length;
  const sum = rounds.reduce((s, r) => s + r.amount, 0);
  return {
    count,
    wins,
    sum,
    avg: count ? sum / count : null,
    winRate: count ? wins / count : null,
  };
}

// Spielarten mit ihren Rollen-Unterteilungen. Rollen, die für die Spielart
// eigentlich nicht vorgesehen sind, tauchen trotzdem auf, falls es Runden
// damit gibt - sonst würden Runden in der Aufschlüsselung verschwinden.
export function breakdownByGameType(rounds) {
  return GAME_TYPES.map(({ type, label, roles, legacy }) => {
    const ofType = filterRounds(rounds, { type });
    const rolesPresent = new Set(ofType.map((r) => parseGame(r.game).role));
    const subRoles = [
      ...roles,
      ...[...rolesPresent].filter((role) => !roles.includes(role)),
    ];
    return {
      type,
      label,
      legacy: Boolean(legacy),
      rounds: ofType,
      roles: subRoles.map((role) => {
        const ofRole = ofType.filter((r) => parseGame(r.game).role === role);
        return {
          role,
          label: role || "ohne Rolle",
          rounds: ofRole,
          multipliers: breakdownByMultiplier(ofRole),
        };
      }),
    };
  }).filter((g) => !g.legacy || g.rounds.length > 0);
}

// Unterteilung einer Rolle nach Schneiderfrei/Schneider/Schwarz/Tout. Nur
// Modifikatoren, die tatsächlich vorkommen - Ramsch und Sie haben keinen,
// dort bleibt die Liste leer.
export function breakdownByMultiplier(rounds) {
  const present = new Set(rounds.map((r) => parseGame(r.game).multiplier).filter(Boolean));
  return [...MULTIPLIERS, ...[...present].filter((m) => !MULTIPLIERS.includes(m))]
    .filter((m) => present.has(m))
    .map((multiplier) => ({
      multiplier,
      label: multiplier,
      rounds: rounds.filter((r) => parseGame(r.game).multiplier === multiplier),
    }));
}

// Archiv-Zeitstempel haben das Format "DD-MM-YYYY_HH-MM-SS" (generateTimestamp
// in storage.js). Für Sortierung und schöne Anzeige zurück in ein Date parsen.
export function parseArchiveTimestamp(ts) {
  const [datePart = "", timePart] = String(ts ?? "").split("_");
  const [day, month, year] = datePart.split("-").map(Number);
  const [hour, minute, second] = (timePart || "").split("-").map(Number);
  return new Date(year, (month || 1) - 1, day, hour || 0, minute || 0, second || 0);
}

// Runden aus älteren Versionen haben kein eigenes "time". Für die zeitliche
// Auswertung reicht aber das Datum - das liefert der Zeitstempel der
// archivierten Session. Er wird als sessionTime angehängt (nicht als time),
// damit klar bleibt, dass es keine echte Uhrzeit der Runde ist.
export function withSessionTime(history, timestamp) {
  const sessionTime = parseArchiveTimestamp(timestamp);
  if (Number.isNaN(sessionTime.getTime())) return history;
  return history.map((r) => (r.time ? r : { ...r, sessionTime }));
}

// Datum einer Runde: eigene Uhrzeit, sonst Datum der Session, sonst null.
export function roundDate(r) {
  if (r.time) return new Date(r.time);
  return r.sessionTime ?? null;
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Montag..Sonntag (JS: 0 = Sonntag)

export function computeTimeTrends(rounds) {
  const dated = rounds.filter((r) => roundDate(r));
  if (dated.length === 0) return null;

  const byMonth = new Map();
  const byWeekday = new Map();

  const add = (map, key, label, amount) => {
    if (!map.has(key)) map.set(key, { label, count: 0, sum: 0 });
    const entry = map.get(key);
    entry.count++;
    entry.sum += amount;
  };

  for (const r of dated) {
    const date = roundDate(r);
    add(
      byMonth,
      `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`,
      date.toLocaleDateString("de-DE", { year: "numeric", month: "long" }),
      r.amount
    );
    add(
      byWeekday,
      date.getDay(),
      date.toLocaleDateString("de-DE", { weekday: "long" }),
      r.amount
    );
  }

  const months = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const weekdays = WEEKDAY_ORDER.filter((d) => byWeekday.has(d)).map((d) => byWeekday.get(d));

  return {
    months,
    weekdays,
    sessionDatedCount: dated.filter((r) => !r.time).length,
    untrackedCount: rounds.length - dated.length,
  };
}
