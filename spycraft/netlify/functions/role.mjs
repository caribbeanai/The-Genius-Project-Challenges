// POST /.netlify/functions/role   body: { playerId, name, email }
// Assigns (and persists) this player's secret role from their click order, and
// saves their first name and email.
//
// Netlify Blobs (v8) has no compare-and-swap, so we keep ordering correct under
// simultaneous taps with a write-then-verify loop: write the whole state, then
// read it straight back (the store is strongly consistent). If our own record
// survived with the click number we claimed, we are done. If a racing writer
// clobbered us (our record is missing), we retry with a little jittered backoff
// and pick the next free number. This converges to clean, distinct click numbers
// without ever persisting a duplicate.
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

  for (let attempt = 0; attempt < 30; attempt++) {
    if (attempt > 0) await sleep(15 + Math.random() * 60 * attempt);

    let state = await store.get(KEY, { type: "json" });
    if (!state) state = initState({ gameId: GAME_ID, spies: SPIES });

    // Already assigned on an earlier tap? Return the same role, no re-roll.
    if (state.assignments[playerId]) {
      const a = state.assignments[playerId];
      return json(reveal({ role: a.role, already: true }));
    }

    const outcome = assign(state, playerId, name, email);
    await store.setJSON(KEY, state);

    // Verify our write survived a possible race (strongly consistent read-back).
    const check = await store.get(KEY, { type: "json" });
    const mine = check && check.assignments && check.assignments[playerId];
    if (mine && mine.clickIndex === outcome.clickIndex) {
      return json(reveal({ role: mine.role }));
    }
    // Our write was clobbered by a simultaneous tap. Retry for the next number.
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
