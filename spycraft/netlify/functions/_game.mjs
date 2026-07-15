// Pure game logic for Spycraft, kept free of any Netlify APIs so it can be
// unit-tested on its own.
//
// Selection rule (simple, instant, saved by click order): spies are the players
// whose click order lands on a Fibonacci number, starting from the 3rd click.
// The Fibonacci numbers from 3 up are 3, 5, 8, 13, 21, ... and the first five of
// them are the 5 spy slots:
//
//     click #:  1  2 [3] 4 [5] 6 7 [8] 9 10 11 12 [13] ... [21]
//     role:     .  .  S  .  S  . .  S  .  .  .  .   S       S
//
// So the 3rd, 5th, 8th, 13th and 21st people to tap are the spies. Everyone else
// is clean. This gives exactly five spies once at least 21 people have tapped.

export function spyIndices(count = 5) {
  const fib = [1, 1];
  while (fib[fib.length - 1] < 100000) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
  const fromThird = [];
  for (const f of fib) {
    if (f >= 3 && !fromThird.includes(f)) fromThird.push(f);
  }
  return fromThird.slice(0, Math.max(0, count)); // e.g. [3, 5, 8, 13, 21]
}

export function initState({ gameId, spies = 5 }) {
  return {
    gameId,
    spies,
    spyIndices: spyIndices(spies),
    assigned: 0, // how many players have tapped so far
    assignments: {}, // playerId -> { role, clickIndex, name, ts }
    createdAt: Date.now(),
  };
}

// Assigns a role to a player, mutating `state`. Idempotent: a player who has
// already tapped keeps the same role forever. The role is decided purely by the
// player's click order, so no randomness and no re-rolling. Their first name and
// email are saved alongside the role.
export function assign(state, playerId, name, email) {
  const existing = state.assignments[playerId];
  if (existing) {
    return { role: existing.role, clickIndex: existing.clickIndex, already: true };
  }
  const clickIndex = state.assigned + 1; // 1-based position in the tap order
  state.assigned = clickIndex;
  const role = state.spyIndices.includes(clickIndex) ? "spy" : "civilian";
  state.assignments[playerId] = {
    role,
    clickIndex,
    name: String(name || "").slice(0, 60),
    email: String(email || "").slice(0, 120),
    ts: Date.now(),
  };
  return { role, clickIndex, already: false };
}
