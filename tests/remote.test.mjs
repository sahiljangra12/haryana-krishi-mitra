import test from "node:test";
import assert from "node:assert/strict";
import { cleanPost, cleanListing, query, enabled, notReady, adminActions, adminPatch } from "../docs/js/remote.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../docs/js/config.js";

test("a forum post is checked on the phone with the database's own limits", () => {
  assert.deepEqual(cleanPost({ district: "Rewari", topic: "water", body: "short" }), { ok: false, error: "short" });
  assert.equal(cleanPost({ district: "Rewari", topic: "gossip", body: "x".repeat(30) }).error, "topic");
  assert.equal(cleanPost({ district: "", topic: "water", body: "x".repeat(30) }).error, "district");
  const ok = cleanPost({ district: " Rewari ", crop: "आंवला", topic: "water", body: "  मेरी जमीन में पानी कम था, इसलिए मैंने यह फसल ट्राई की।  ", author: "राम", status: "approved", kind: "expert" });
  assert.equal(ok.ok, true); assert.equal(ok.row.district, "Rewari"); assert.ok(!("status" in ok.row) && !("kind" in ok.row)); // the phone can never ask for approval or expert status
  assert.equal(cleanPost({ district: "Rewari", topic: "cost", body: "y".repeat(5000) }).row.body.length, 1200);
});
test("a marketplace listing needs a real mobile number and the farmer's consent to show it", () => {
  const base = { kind: "sell", district: "Hisar", crop: "सरसों", qty_qtl: 12, price: 5500, name: "राम कुमार", phone: "+91 98765 43210", consent: true };
  const ok = cleanListing(base); assert.equal(ok.ok, true); assert.equal(ok.row.phone, "9876543210"); assert.ok(!("verified" in ok.row) && !("status" in ok.row) && !("consent" in ok.row));
  assert.equal(cleanListing({ ...base, consent: false }).error, "consent");
  assert.equal(cleanListing({ ...base, phone: "12345" }).error, "phone");
  assert.equal(cleanListing({ ...base, phone: "5876543210" }).error, "phone");
  assert.equal(cleanListing({ ...base, qty_qtl: 0 }).error, "qty");
  assert.equal(cleanListing({ ...base, price: -5 }).error, "price");
  assert.equal(cleanListing({ ...base, price: "" }).row.price, null);
  assert.equal(cleanListing({ ...base, kind: "steal" }).error, "kind");
  assert.equal(cleanListing({ ...base, ready_from: "27/11/2026" }).row.ready_from, null);
});
test("query strings are encoded, and the app is connected only when config.js has both values", () => {
  const q = query("posts", { select: "id,body", filters: { district: "eq.Charkhi Dadri", topic: null }, limit: 9999 });
  assert.match(q, /\/rest\/v1\/posts\?select=id%2Cbody&district=eq\.Charkhi%20Dadri&order=created_at\.desc&limit=200$/);
  assert.equal(enabled(), !!(SUPABASE_URL && SUPABASE_ANON_KEY));
});
test("only a public key may sit in config.js, and missing tables read as 'not open yet'", () => {
  // a service_role JWT carries "service_role" in its payload; a secret key starts with sb_secret_
  const payload = SUPABASE_ANON_KEY.startsWith("eyJ") ? Buffer.from(SUPABASE_ANON_KEY.split(".")[1] || "", "base64").toString() : "";
  assert.ok(!SUPABASE_ANON_KEY.startsWith("sb_secret_") && !/service_role/.test(payload), "a secret key must never be in the website");
  if (SUPABASE_URL) assert.match(SUPABASE_URL, /^https:\/\/[a-z0-9]+\.supabase\.co$/);
  assert.equal(notReady({ code: "PGRST205" }), true);
  assert.equal(notReady({ code: "42P01" }), true);
  assert.equal(notReady({ status: 401, code: "" }), false);
  assert.equal(notReady(null), false);
});

test("the owner's buttons fit where an entry is: waiting, shown to everyone, or rejected", () => {
  const names = (v, t, r) => adminActions(v, t, r).map((a) => a[0]);
  assert.deepEqual(names("pending", "posts"), ["approved", "expert", "rejected", "delete"]);
  assert.deepEqual(names("pending", "listings"), ["approved", "verified", "rejected", "delete"]);
  assert.deepEqual(names("approved", "posts", { kind: "personal" }), ["rejected", "expert", "delete"]);
  assert.deepEqual(names("approved", "posts", { kind: "expert" }), ["rejected", "personal", "delete"]);
  assert.deepEqual(names("approved", "listings", { verified: true }), ["rejected", "unverified", "delete"]);
  assert.deepEqual(names("approved", "listings", { verified: false }), ["rejected", "verified", "delete"]);
  assert.deepEqual(names("rejected", "posts"), ["approved", "delete"]);
  // every view lets the owner delete, and exactly one button is the main one
  for (const v of ["pending", "approved", "rejected"]) for (const t of ["posts", "listings"]) {
    const a = adminActions(v, t, {});
    assert.equal(a.at(-1)[0], "delete");
    assert.equal(a.filter((x) => x[3]).length, 1);
    for (const x of a) assert.notEqual(adminPatch(x[0]), undefined, x[0]);
  }
});
test("each owner action changes only what it says", () => {
  assert.equal(adminPatch("delete"), null);
  assert.equal(adminPatch("dismiss"), null);
  assert.deepEqual(adminPatch("rejected"), { status: "rejected" });
  assert.deepEqual(adminPatch("verified"), { status: "approved", verified: true });
  assert.deepEqual(adminPatch("unverified"), { verified: false });
  assert.deepEqual(adminPatch("personal"), { kind: "personal" });
  assert.equal(adminPatch("drop table"), undefined);
});
