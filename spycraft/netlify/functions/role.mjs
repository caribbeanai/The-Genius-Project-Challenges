// POST /.netlify/functions/role   body: { playerId, name }
// Assigns (and persists) this player's secret role from their click order.
// Concurrency-safe: reads the game state with its etag, then writes back only if
// nobody changed it in the meantime (onlyIfMatch). On a conflict it retries, so
// two players clicking at the same instant always get distinct click numbers.
import { getStore } from "@netlify/blobs";
import { initState, assign } from "./_game.mjs";

const SPIES = parseInt(process.env.SPYCRAFT_SPIES || "5", 10);
const GAME_ID = process.env.SPYCRAFT_GAME_ID || "default";
const KEY = `game:${GAME_ID}`;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let body = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  const playerId = String(body.playerId || "").slice(0, 80);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  if (!playerId) return json({ error: "Missing playerId" }, 400);
  if (!name) return json({ error: "Enter your first name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);

  const store = getStore({ name: "spycraft", consistency: "strong" });

  // Optimistic-concurrency retry loop. When a whole group taps at once, the
  // late writers lose the etag race and retry; a generous cap plus a little
  // jittered backoff lets everyone through with a clean, ordered click number.
  for (let attempt = 0; attempt < 40; attempt++) {
    if (attempt > 0) await sleep(10 + Math.random() * 40 * attempt);
    const current = await store.getWithMetadata(KEY, { type: "json" });

    // First player of the round creates the game.
    if (!current) {
      const state = initState({ gameId: GAME_ID, spies: SPIES });
      const outcome = assign(state, playerId, name, email);
      const res = await store.setJSON(KEY, state, { onlyIfNew: true });
      if (res.modified) return json(reveal(outcome));
      continue; // Someone else created it first, loop to read theirs.
    }

    const state = current.data;

    // Already revealed on a previous click? Return the same role.
    if (state.assignments[playerId]) {
      const a = state.assignments[playerId];
      return json(reveal({ role: a.role, already: true }));
    }

    const outcome = assign(state, playerId, name, email);
    const res = await store.setJSON(KEY, state, { onlyIfMatch: current.etag });
    if (res.modified) return json(reveal(outcome));
    // etag moved under us, retry.
  }

  return json({ error: "The game is busy right now, tap again." }, 409);
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function reveal(o) {
  return { role: o.role, isSpy: o.role === "spy", already: !!o.already };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
