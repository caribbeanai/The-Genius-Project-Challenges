// POST or GET /.netlify/functions/reset?key=ADMIN_KEY
// Wipes the current game so the next reveal reshuffles a fresh deck (new random
// 5 spies). Organizer-only.
import { getStore } from "@netlify/blobs";

const GAME_ID = process.env.SPYCRAFT_GAME_ID || "default";
const KEY = `game:${GAME_ID}`;

export default async (req) => {
  const url = new URL(req.url);
  const provided = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  const admin = process.env.SPYCRAFT_ADMIN_KEY;

  if (!admin || provided !== admin) return json({ error: "Forbidden" }, 403);

  const store = getStore({ name: "spycraft", consistency: "strong" });
  await store.delete(KEY);
  return json({ ok: true, message: "Round reset. The next reveal starts a fresh game with new spies." });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
