// The shared forum and the marketplace board live on a Supabase project (free tier). This file is the whole client:
// plain fetch calls to its REST interface, no library. The address and the public ("anon") key come from config.js.
// That key is meant to be public: the database rules in supabase/schema.sql let it submit rows as 'pending' and read
// approved rows, nothing else. While config.js has no address, enabled() is false and the app says the forum is not open.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js?v=20261126223326";

export const enabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const TOPICS = ["variety", "fert", "pest", "water", "cost", "lesson"];
const clip = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export function deviceId() {
  try { let d = localStorage.getItem("km-device"); if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); localStorage.setItem("km-device", d); } return d; } catch { return "nodevice"; }
}
// The same limits as the database, checked first on the phone so the farmer gets a plain message instead of a server error.
export function cleanPost(p) {
  const row = { district: clip(p.district, 40), crop: clip(p.crop, 40), topic: TOPICS.includes(p.topic) ? p.topic : null, body: String(p.body ?? "").trim().slice(0, 1200), author: clip(p.author, 40) };
  if (row.district.length < 2) return { ok: false, error: "district" };
  if (!row.topic) return { ok: false, error: "topic" };
  if (row.body.length < 20) return { ok: false, error: "short" };
  return { ok: true, row };
}
export function cleanListing(l) {
  const phone = String(l.phone ?? "").replace(/[^0-9]/g, "").replace(/^(91|0)(?=[6-9][0-9]{9}$)/, "");
  const qty = +l.qty_qtl, price = l.price === "" || l.price == null ? null : +l.price;
  const row = { kind: l.kind === "buy" ? "buy" : l.kind === "sell" ? "sell" : null, district: clip(l.district, 40), crop: clip(l.crop, 40), variety: clip(l.variety, 40), qty_qtl: qty, price, ready_from: /^\d{4}-\d\d-\d\d$/.test(l.ready_from || "") ? l.ready_from : null, name: clip(l.name, 40), phone, note: clip(l.note, 300) };
  if (!row.kind) return { ok: false, error: "kind" };
  if (row.district.length < 2) return { ok: false, error: "district" };
  if (!row.crop) return { ok: false, error: "crop" };
  if (!(qty > 0 && qty < 100000)) return { ok: false, error: "qty" };
  if (price != null && !(price > 0 && price < 1000000)) return { ok: false, error: "price" };
  if (row.name.length < 2) return { ok: false, error: "name" };
  if (!/^[6-9][0-9]{9}$/.test(phone)) return { ok: false, error: "phone" };
  if (!l.consent) return { ok: false, error: "consent" };
  return { ok: true, row };
}
// PostgREST query string: filters is { column: "eq.value" }; values are encoded here
export function query(table, { select = "*", filters = {}, order = "created_at.desc", limit = 50 } = {}) {
  const q = [`select=${encodeURIComponent(select)}`];
  for (const [k, v] of Object.entries(filters)) if (v != null && v !== "") q.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  if (order) q.push(`order=${encodeURIComponent(order)}`);
  q.push(`limit=${Math.max(1, Math.min(200, +limit || 50))}`);
  return `${SUPABASE_URL}/rest/v1/${table}?${q.join("&")}`;
}
async function call(url, { method = "GET", body, token, prefer } = {}, ms = 15000) {
  if (!enabled()) throw new Error("not connected");
  const c = new AbortController(), timer = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { method, signal: c.signal, headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`, ...(body ? { "Content-Type": "application/json" } : {}), ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text(); let j = null; try { j = text ? JSON.parse(text) : null; } catch {}
    if (!r.ok) { const e = new Error((j && (j.message || j.error_description || j.msg)) || `${r.status}`); e.status = r.status; throw e; }
    return j;
  } finally { clearTimeout(timer); }
}
const POST_COLS = "id,created_at,district,crop,topic,body,author,kind";
const LIST_COLS = "id,created_at,kind,district,crop,variety,qty_qtl,price,ready_from,name,phone,note,verified";
export const listPosts = ({ district, topic } = {}) => call(query("posts", { select: POST_COLS, filters: { district: district ? `eq.${district}` : null, topic: topic ? `eq.${topic}` : null } }));
export const addPost = (row) => call(`${SUPABASE_URL}/rest/v1/posts`, { method: "POST", body: { ...row, device: deviceId() }, prefer: "return=minimal" });
export const listListings = ({ kind, district, crop } = {}) => call(query("listings", { select: LIST_COLS, filters: { kind: kind ? `eq.${kind}` : null, district: district ? `eq.${district}` : null, crop: crop ? `ilike.*${String(crop).replace(/[*,()]/g, "")}*` : null } }));
export const addListing = (row) => call(`${SUPABASE_URL}/rest/v1/listings`, { method: "POST", body: { ...row, device: deviceId() }, prefer: "return=minimal" });
export const report = (table, id, reason) => call(`${SUPABASE_URL}/rest/v1/reports`, { method: "POST", body: { target_table: table, target_id: id, reason: clip(reason, 200), device: deviceId() }, prefer: "return=minimal" });

/* ---------------- the owner's side: sign in, then approve, reject, verify, remove ---------------- */
export const signIn = (email, password) => call(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", body: { email, password } });
export const adminList = (table, token, status = "pending") => call(query(table, { filters: table === "reports" ? {} : { status: `eq.${status}` }, limit: 100 }), { token });
export const adminSet = (table, id, patch, token) => call(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: patch, token, prefer: "return=minimal" });
export const adminDelete = (table, id, token) => call(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", token, prefer: "return=minimal" });
export const amAdmin = async (token) => { const r = await call(query("admins", { select: "user_id", order: null, limit: 1 }), { token }); return Array.isArray(r) && r.length > 0; };
