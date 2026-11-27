import test from "node:test";
import assert from "node:assert/strict";
import { cleanPost, cleanListing, query, enabled } from "../docs/js/remote.js";

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
test("query strings are encoded, and nothing is connected until config.js has an address", () => {
  const q = query("posts", { select: "id,body", filters: { district: "eq.Charkhi Dadri", topic: null }, limit: 9999 });
  assert.match(q, /\/rest\/v1\/posts\?select=id%2Cbody&district=eq\.Charkhi%20Dadri&order=created_at\.desc&limit=200$/);
  assert.equal(enabled(), false);
});
