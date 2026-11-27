import test from "node:test";
import assert from "node:assert/strict";
import { classify, shares, IO_CLASS, WC_CLASS } from "../docs/js/landtype.js";
import { fruitFit, poplarFit, underPoplar, shareNotes, cleanProfile, emptyProfile, FRUITS, SOURCES } from "../docs/js/farmer.js";

const io = (s, year = 2023) => ({ year, shares: s }), wc = (s) => ({ year: 2021, shares: s });

test("class histogram becomes shares", () => {
  assert.deepEqual(shares([[99], [7]], IO_CLASS), { built: 1 });
  const s = shares([[4, 128, 0], [10, 50, 80]], WC_CLASS);
  assert.ok(Math.abs(s.built - 128 / 132) < 1e-9 && Math.abs(s.trees - 4 / 132) < 1e-9 && s.water === undefined);
  assert.equal(shares(null, IO_CLASS), null);
  assert.equal(shares([[0, 0], [5, 7]], IO_CLASS), null);
});
test("buildings and water are blocked, a field is not (live readings of 27 Nov 2026)", () => {
  // Karnal city centre: IO 100% built, WorldCover 97% built
  let r = classify({ io: io({ built: 1 }), wc: wc({ built: 0.97, trees: 0.03 }), ndvi: 0.12 });
  assert.equal(r.kind, "built"); assert.equal(r.block, true);
  // Tilyar lake, Rohtak: IO 100% water, WorldCover 84% water
  r = classify({ io: io({ water: 1 }), wc: wc({ water: 0.84, trees: 0.16 }), ndvi: -0.1, waterNow: 0.9, month: 11 });
  assert.equal(r.kind, "water"); assert.equal(r.block, true);
  // Karnal field: both maps 100% crops
  r = classify({ io: io({ crops: 1 }), wc: wc({ crops: 1 }), ndvi: 0.35 });
  assert.equal(r.kind, "farm"); assert.equal(r.block, false);
});
test("the maps disagree or the place is green: caution, not a block", () => {
  // one map says buildings, the other says crops
  let r = classify({ io: io({ built: 1 }), wc: wc({ crops: 1 }), ndvi: 0.2 });
  assert.equal(r.kind, "unsure"); assert.equal(r.block, false);
  // ... and a whole year of clear passes never showed green cover: it is built-up (live case east of Karnal, 27 Nov 2026)
  r = classify({ io: io({ built: 1 }), wc: wc({ crops: 1 }), ndvi: 0.12, yearMax: 0.18 });
  assert.equal(r.kind, "built"); assert.equal(r.block, true);
  // ... but a crop was seen during the year: stay with "the maps disagree"
  r = classify({ io: io({ built: 1 }), wc: wc({ crops: 1 }), ndvi: 0.12, yearMax: 0.7 });
  assert.equal(r.kind, "unsure");
  // both say buildings but the satellite sees a dense crop today: the maps are old
  r = classify({ io: io({ built: 0.8, crops: 0.2 }), wc: wc({ built: 0.7, crops: 0.3 }), ndvi: 0.6 });
  assert.equal(r.block, false); assert.equal(r.kind, "mixed");
  // a square that takes in part of a village
  r = classify({ io: io({ built: 0.3, crops: 0.7 }), wc: wc({ built: 0.2, crops: 0.8 }), ndvi: 0.3 });
  assert.equal(r.kind, "mixed");
});
test("a flooded paddy field in July is not called a pond", () => {
  const r = classify({ io: io({ crops: 1 }), wc: wc({ crops: 1 }), ndvi: 0.1, waterNow: 0.8, month: 7 });
  assert.equal(r.kind, "farm");
  const nov = classify({ io: io({ crops: 1 }), wc: wc({ crops: 1 }), ndvi: 0.05, waterNow: 0.8, month: 11 });
  assert.equal(nov.kind, "mixed"); assert.equal(nov.block, false);
});
test("trees, one map only, no map, and the farmer's own word", () => {
  assert.equal(classify({ io: io({ trees: 0.7, crops: 0.3 }), wc: wc({ trees: 0.6, crops: 0.4 }) }).kind, "trees");
  assert.equal(classify({ io: io({ built: 0.9, crops: 0.1 }) }).kind, "built");
  assert.equal(classify({}).kind, "unknown");
  const mine = classify({ io: io({ built: 1 }), wc: wc({ built: 1 }), told: "farm" });
  assert.equal(mine.kind, "built"); assert.equal(mine.block, false); assert.equal(mine.overruled, true);
});

test("fruit list: dry-area fruits first where water is short, and every fruit names a source", () => {
  const dry = fruitFit("SW", "limited");
  assert.equal(dry[0].dry, true);
  assert.equal(dry.find((f) => f.id === "kinnow").fit, "water");
  assert.equal(dry[dry.length - 1].dry, false);
  const wet = fruitFit("NE", "good");
  assert.equal(wet[0].dry, false); assert.equal(wet.find((f) => f.id === "guava").fit, "good");
  for (const f of FRUITS) { assert.ok(f.src.length); for (const s of f.src) assert.ok(SOURCES[s], s); }
});
test("poplar: not advised with short water, fits the canal belt, ask first in the dry belt", () => {
  assert.equal(poplarFit("SW", "limited"), "no"); assert.equal(poplarFit("NE", "rainfed"), "no");
  assert.equal(poplarFit("NE", "good"), "yes"); assert.equal(poplarFit("SW", "good"), "ask");
});
test("crops under poplar by tree age and tractor access", () => {
  assert.deepEqual(underPoplar("young", "yes").groups, ["winter", "summer", "shade", "veg"]);
  const old = underPoplar("grown", "yes"); assert.deepEqual(old.groups, ["winter", "shade"]); assert.equal(old.lower, true);
  const hand = underPoplar("grown", "no"); assert.deepEqual(hand.groups, ["shade"]); assert.equal(hand.handOnly, true);
  assert.deepEqual(underPoplar("young", "no").groups, ["shade", "veg"]);
  assert.equal(underPoplar("young", "unsure").checkTractor, true);
});
test("land-sharing cautions follow the answers", () => {
  assert.deepEqual(shareNotes({ role: "owner", acres: 4, irrigation: "good", trees: "grown", tractor: "no" }), ["handOnly", "protectTrees", "ownerPapers"]);
  assert.deepEqual(shareNotes({ role: "cultivator", acres: 0.25, irrigation: "rainfed", trees: "none", tractor: "yes" }), ["rainfed", "small", "seeLand"]);
});
test("a stored profile is cleaned field by field", () => {
  const p = cleanProfile({ farmer_category: "long_term", irrigation: "lots", land_size_acres: "3.5", plantation: { tree_age: "grown", tractor_access: "maybe" }, primary_crops: ["poplar", 7], language: "hr", interest_land_sharing: true, location: { district: "Rewari" } });
  assert.equal(p.farmer_category, "long_term"); assert.equal(p.irrigation, null); assert.equal(p.land_size_acres, 3.5);
  assert.equal(p.plantation.tree_age, "grown"); assert.equal(p.plantation.tractor_access, null);
  assert.deepEqual(p.primary_crops, ["poplar"]); assert.equal(p.language, null); assert.equal(p.interest_land_sharing, true); assert.equal(p.location.district, "Rewari");
  assert.deepEqual(cleanProfile("junk"), emptyProfile());
});
