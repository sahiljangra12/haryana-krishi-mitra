import test from "node:test";
import assert from "node:assert/strict";
import { estimate, actual, totals, overLand, cleanPlan, HEADS } from "../docs/js/planner.js";
import { isLeafYellow, leafRead, QUESTIONS } from "../docs/js/doctor.js";
import { CROPS } from "../docs/js/crops.js";

const wheat = CROPS.find((c) => c.id === "wheat"), msp = { price: wheat.msp, basis: "msp" };

test("estimate for wheat on 2 acres: cost heads add up to the middle of the range, income is a range", () => {
  const e = estimate({ acres: 2, over: {} }, wheat, msp);
  assert.equal(e.cost, 54000); // (24000+30000)/2 x 2
  assert.deepEqual(e.costRange, [48000, 60000]);
  assert.equal(HEADS.filter((h) => e.heads[h].basis === "estimate").length, 6);
  assert.equal(e.heads.transport.basis, "none"); assert.equal(e.heads.transport.used, 0);
  assert.deepEqual(e.production, [34, 46]);
  assert.deepEqual(e.revenue, [34 * 2610 + 18000, 46 * 2610 + 18000]);
  assert.deepEqual(e.profit, [e.revenue[0] - 54000, e.revenue[1] - 54000]);
  assert.equal(e.costBasis, "estimate"); assert.equal(e.yieldBasis, "estimate"); assert.equal(e.complete, true);
});
test("the farmer's own figures replace the estimate and are marked as theirs", () => {
  const e = estimate({ acres: 2, over: { seed: 9000, transport: 3000, yield: 20, price: 2700 } }, wheat, msp);
  assert.equal(e.heads.seed.basis, "mine"); assert.equal(e.heads.seed.used, 9000); assert.equal(e.heads.seed.estimate, 6480);
  assert.equal(e.heads.transport.basis, "mine");
  assert.equal(e.cost, 54000 - 6480 + 9000 + 3000);
  assert.equal(e.costBasis, "mixed"); assert.equal(e.costRange, null);
  assert.deepEqual(e.production, [40, 40]); assert.equal(e.price.basis, "mine");
  assert.deepEqual(e.revenue, [108000, 108000]); // own yield: the straw estimate is not added
  assert.equal(e.breakEven, Math.round(e.cost / 40));
});
test("a crop the app has no data for (tomato): nothing is invented", () => {
  const empty = estimate({ acres: 1, over: {} }, null, null);
  assert.equal(empty.cost, 0); assert.equal(empty.revenue, null); assert.equal(empty.complete, false); assert.equal(empty.yieldBasis, "none");
  assert.ok(HEADS.every((h) => empty.heads[h].basis === "none"));
  const mine = estimate({ acres: 1, over: { seed: 4000, labour: 20000, yield: 100, price: 800 } }, null, null);
  assert.equal(mine.cost, 24000); assert.deepEqual(mine.profit, [56000, 56000]); assert.equal(mine.complete, true); assert.equal(mine.costBasis, "mine");
});
test("actual spending and the whole plan", () => {
  const l1 = { id: "a", season: "rabi", cropId: "wheat", acres: 2, over: {}, actual: { costs: [{ head: "seed", amount: 6000 }, { head: "seed", amount: 500 }, { head: "labour", amount: 4000 }], received: 130000, harvestQtl: 41 } };
  const a = actual(l1); assert.equal(a.spent, 10500); assert.equal(a.byHead.seed, 6500); assert.equal(a.profit, 119500);
  assert.equal(actual({}).profit, null);
  const l2 = { id: "b", season: "rabi", name: "Tomato", acres: 1.5, over: {}, actual: {} };
  const t = totals([l1, l2], (l) => (l.cropId ? wheat : null), () => msp);
  assert.equal(t.acres.rabi, 3.5); assert.equal(t.cost, 54000); assert.equal(t.incomplete, 1); assert.equal(t.spent, 10500); assert.equal(t.received, 130000);
  assert.deepEqual(overLand(t.acres, 3), ["rabi"]); assert.deepEqual(overLand(t.acres, 4), []); assert.deepEqual(overLand(t.acres, null), []);
});
test("a stored plan is cleaned", () => {
  const p = cleanPlan({ lines: [{ season: "rabi", cropId: "wheat", acres: "2", over: { seed: "9000", junk: 5, yield: -3 }, actual: { costs: [{ head: "seed", amount: "600" }, { head: "bribe", amount: 5 }], received: "x" } }, { season: "winter", cropId: "wheat", acres: 2 }, { season: "rabi", cropId: "wheat", acres: 0 }, null] });
  assert.equal(p.lines.length, 1); assert.deepEqual(p.lines[0].over, { seed: 9000 }); assert.equal(p.lines[0].actual.costs.length, 1); assert.equal(p.lines[0].actual.received, null);
  assert.deepEqual(cleanPlan(null).lines, []);
});
test("yellow leaves: recognised in Hindi and English, read with two answers, never sure", () => {
  assert.equal(isLeafYellow("भाई मेरे खेत में टमाटर के पत्ते पीले हो रहे हैं"), true);
  assert.equal(isLeafYellow("my wheat leaves are turning yellow"), true);
  assert.equal(isLeafYellow("गेहूं में पानी कब दूं"), false);
  assert.equal(leafRead({ where: "old", pattern: "whole" }).nutrient, "n");
  assert.equal(leafRead({ where: "old", pattern: "veins" }).nutrient, "mg");
  assert.equal(leafRead({ where: "old", pattern: "edge" }).nutrient, "k");
  assert.equal(leafRead({ where: "new", pattern: "whole" }).nutrient, "s");
  assert.equal(leafRead({ where: "new", pattern: "veins" }).nutrient, "fe");
  assert.deepEqual(leafRead({ where: "new", pattern: "spots" }), { nutrient: null, see: "disease" });
  assert.equal(leafRead({ where: "unsure", pattern: "edge" }).nutrient, null);
  assert.equal(QUESTIONS.length, 2);
});
