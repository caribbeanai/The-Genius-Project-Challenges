// GET /.netlify/functions/canvases?key=ADMIN_KEY
// Facilitator view: lists every team's saved canvas. Guarded by
// HURRICANE_ADMIN_KEY so only the facilitator can see all teams' work.
import { getStore } from "@netlify/blobs";

const GAME_ID = process.env.HURRICANE_GAME_ID || "melissa-2026";
const PREFIX = `canvas:${GAME_ID}:`;

export default async (req) => {
  const url = new URL(req.url);
  const provided = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  const admin = process.env.HURRICANE_ADMIN_KEY;
  if (!admin) return json({ error: "Set HURRICANE_ADMIN_KEY in Netlify to use this view." }, 403);
  if (provided !== admin) return json({ error: "Forbidden" }, 403);

  const store = getStore({ name: "hurricane-melissa", consistency: "strong" });
  const listing = await store.list({ prefix: PREFIX });
  const blobs = (listing && listing.blobs) || [];

  const teams = [];
  for (const b of blobs) {
    const rec = await store.get(b.key, { type: "json" });
    if (!rec) continue;
    teams.push({
      team: rec.team,
      teamSlug: rec.teamSlug,
      members: rec.members || "",
      updatedAt: rec.updatedAt,
      fieldsFilled: rec.data ? Object.values(rec.data).filter((v) => (Array.isArray(v) ? v.length : String(v).trim())).length : 0,
      data: rec.data || {},
    });
  }
  teams.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return json({ gameId: GAME_ID, count: teams.length, teams });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
