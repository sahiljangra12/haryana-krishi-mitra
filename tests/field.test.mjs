import test from "node:test";
import assert from "node:assert/strict";
import { changeClass, healthClass, fieldBox } from "../docs/js/field.js";
import { radarReading } from "../docs/js/sources.js";
import { tidyHeard, sentences } from "../docs/js/voice.js";

test("health classes", () => {
  assert.deepEqual([0.05, 0.25, 0.5, 0.8].map(healthClass), [0, 1, 2, 3]);
});

test("change classes: harvest needs a crop before and bare ground after", () => {
  assert.equal(changeClass(0.7, 0.2), "cut");
  assert.equal(changeClass(0.7, 0.5), "down");
  assert.equal(changeClass(0.3, 0.6), "up");
  assert.equal(changeClass(0.6, 0.62), "same");
});

test("bare soil that changes a little is not a change", () => {
  assert.equal(changeClass(0.2, 0.08), "same");
  assert.equal(changeClass(0.1, 0.22), "same");
});

test("picture frame is 4:3 and holds the field", () => {
  const d = 0.0005, lat = 29.9, lon = 76.95;
  const f = { geometry: { coordinates: [[[lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d], [lon - d, lat + d], [lon - d, lat - d]]] } };
  const b = fieldBox(f);
  assert.ok(Math.abs(b.widthM / b.heightM - 4 / 3) < 0.01);
  assert.ok(b.bbox[0] < lon - d && b.bbox[2] > lon + d && b.bbox[1] < lat - d && b.bbox[3] > lat + d);
  assert.ok(b.W >= 8 && b.H >= 6);
});

test("radar: compares only passes from the same direction", () => {
  const r = radarReading([{ date: "2026-11-04", orbit: "ascending", vh: -18 }, { date: "2026-11-12", orbit: "descending", vh: -14 }, { date: "2026-11-16", orbit: "ascending", vh: -15.9 }]);
  assert.equal(r.prev.date, "2026-11-04");
  assert.equal(r.trend, "up");
  assert.equal(radarReading([{ date: "2026-11-16", orbit: "ascending", vh: -15 }]).trend, "none");
});

test("spoken PIN codes become digits", () => {
  assert.equal(tidyHeard("1 3 2 0 0 1"), "132001");
  assert.equal(tidyHeard("एक तीन दो शून्य शून्य एक"), "132001");
  assert.equal(tidyHeard("१३२००१।"), "132001");
  assert.equal(tidyHeard("बैरसाल करनाल"), "बैरसाल करनाल");
});

test("long text is cut into short pieces for the speech engine", () => {
  const parts = sentences("पहला वाक्य। दूसरा वाक्य है। Third one.");
  assert.equal(parts.length, 3);
  assert.ok(sentences("a, ".repeat(200)).every((p) => p.length <= 181));
});

import { recommend } from "../docs/js/advisor.js";
const ctx = { season: "rabi", district: { name: "Karnal", zone: "NE", gw: "stressed" }, soil: { texture: "loam" }, water: "good", risk: "medium", acres: 1, prices: null };

test("recommendation: every rabi crop is ranked with a score between 0 and 100", () => {
  const r = recommend(ctx);
  assert.ok(r.length >= 5);
  assert.ok(r.every((x) => x.score >= 0 && x.score <= 100));
  assert.ok(r.every((x, i) => i === 0 || r[i - 1].score >= x.score));
});

test("recommendation: a pulse before helps a cereal, and repeating a crop costs points", () => {
  const score = (extra, id) => recommend({ ...ctx, ...extra }).find((x) => x.crop.id === id).score;
  assert.equal(score({ prevCrop: "moong" }, "wheat") - score({}, "wheat"), 3);
  assert.equal(score({ prevCrop: "wheat" }, "wheat") - score({}, "wheat"), -6);
  assert.equal(score({ prevCrop: "moong" }, "gram"), score({}, "gram"));
});

test("recommendation: drip stretches limited water for a crop that needs a fair amount", () => {
  const score = (extra) => recommend({ ...ctx, water: "limited", ...extra }).find((x) => x.crop.id === "wheat").score;
  assert.ok(score({ irrigation: "drip" }) > score({}));
});

import { daysPastSowing } from "../docs/js/advisor.js";
test("sowing window: late only in the months just after it closes", () => {
  assert.equal(daysPastSowing("mustard", new Date("2026-11-21T00:00:00Z")), 6);
  assert.equal(daysPastSowing("wheat", new Date("2026-11-21T00:00:00Z")), null);
  assert.equal(daysPastSowing("mustard", new Date("2026-06-01T00:00:00Z")), null); // next October is ahead
  assert.equal(daysPastSowing("paddy", new Date("2026-08-01T00:00:00Z")), null);
});
test("recommendation on 21 November: wheat ranks above mustard, whose sowing has closed", () => {
  const r = recommend({ ...ctx, today: new Date("2026-11-21T00:00:00Z") });
  const pos = (id) => r.findIndex((x) => x.crop.id === id);
  assert.ok(pos("wheat") < pos("mustard"));
  assert.ok(r.find((x) => x.crop.id === "mustard").late > 0);
});
test("a costly crop without MSP does not top the list for a medium-risk farmer", () => {
  const r = recommend({ ...ctx, today: new Date("2026-11-21T00:00:00Z") });
  assert.equal(r[0].crop.id, "wheat");
  const bold = recommend({ ...ctx, risk: "high", today: new Date("2026-11-21T00:00:00Z") });
  assert.ok(bold.find((x) => x.crop.id === "onion_rabi").score > r.find((x) => x.crop.id === "onion_rabi").score);
});
