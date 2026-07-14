// Pure game logic for Spycraft, kept free of any Netlify APIs so it can be
// unit-tested on its own. The whole design rests on one idea: build a deck of
// N cards with exactly `spies` spy cards, shuffle it once, then hand the cards
// out in order. Sequential hand-out from a fixed shuffled deck is what
// guarantees "exactly 5 spies, chosen at random" no matter how the clicks race.

export function makeDeck(total, spies) {
  const t = Math.max(0, Math.floor(total) || 0);
  const s = Math.max(0, Math.min(Math.floor(spies) || 0, t));
  const deck = [];
  for (let i = 0; i < t; i++) deck.push(i < s ? "spy" : "civilian");
  // Fisher-Yates shuffle.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export function initState({ gameId, total, spies }) {
  const t = Math.max(0, Math.floor(total) || 0);
  const s = Math.max(0, Math.min(Math.floor(spies) || 0, t));
  return {
    gameId,
    total: t,
    spies: s,
    deck: makeDeck(t, s),
    nextIndex: 0,
    assignments: {}, // playerId -> { role, index, name, ts }
    createdAt: Date.now(),
  };
}

// Assigns a role to a player, mutating `state`. Idempotent: a player who has
// already been assigned keeps the same role forever. Returns the outcome.
export function assign(state, playerId, name) {
  const existing = state.assignments[playerId];
  if (existing) {
    return { role: existing.role, index: existing.index, already: true, overflow: existing.index === -1 };
  }
  let role, index;
  if (state.nextIndex < state.deck.length) {
    index = state.nextIndex;
    role = state.deck[index];
    state.nextIndex += 1;
  } else {
    // More players than the deck was built for. They play as civilians, and
    // the record is flagged so the organizer knows the game was over-subscribed.
    index = -1;
    role = "civilian";
  }
  state.assignments[playerId] = {
    role,
    index,
    name: String(name || "").slice(0, 60),
    ts: Date.now(),
  };
  return { role, index, already: false, overflow: index === -1 };
}
