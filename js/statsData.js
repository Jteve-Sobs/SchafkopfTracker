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
      roles: subRoles.map((role) => ({
        role,
        label: role || "ohne Rolle",
        rounds: ofType.filter((r) => parseGame(r.game).role === role),
      })),
    };
  }).filter((g) => !g.legacy || g.rounds.length > 0);
}
