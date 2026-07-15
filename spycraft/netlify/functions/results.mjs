// GET /.netlify/functions/results?key=ADMIN_KEY
// Organizer-only view of who is a spy. Guarded by SPYCRAFT_ADMIN_KEY so players
// cannot peek. Returns the spy list and the full roster.
import { getStore } from "@netlify/blobs";

const GAME_ID = process.env.SPYCRAFT_GAME_ID || "default";
const KEY = `game:${GAME_ID}`;

export default async (req) => {
  const url = new URL(req.url);
  const provided = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  const admin = process.env.SPYCRAFT_ADMIN_KEY;

  if (!admin) return json({ error: "Set SPYCRAFT_ADMIN_KEY in Netlify to use this view." }, 403);
  if (provided !== admin) return json({ error: "Forbidden" }, 403);

  const store = getStore({ name: "spycraft", consistency: "strong" });
  const state = await store.get(KEY, { type: "json" });
  if (!state) return json({ error: "No game has started yet." }, 404);

  const people = Object.entries(state.assignments).map(([playerId, a]) => ({
    playerId,
    name: a.name || "(no name)",
    role: a.role,
    spy: a.role === "spy",
    clickIndex: a.clickIndex,
    at: new Date(a.ts).toISOString(),
  }));
  people.sort((x, y) => (x.clickIndex || 0) - (y.clickIndex || 0));
  const spies = people.filter((p) => p.spy);

  return json({
    gameId: GAME_ID,
    spyCount: state.spies,
    spyClickPositions: state.spyIndices,
    revealed: people.length,
    spiesRevealed: spies.length,
    spies,
    everyone: people,
  });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
