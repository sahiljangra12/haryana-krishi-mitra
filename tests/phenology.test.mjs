import test from "node:test";
import assert from "node:assert/strict";
import { read, seasonOf, cycle } from "../docs/js/phenology.js";

// build a year of observations from [date, ndvi, ndmi] triples
const rows = (list) => list.map(([date, ndvi, ndmi = 0]) => ({ date, ndvi, ndmi }));

test("season of a date", () => {
  assert.equal(seasonOf("2026-11-21").id, "rabi");
  assert.equal(seasonOf("2026-02-10").year, 2025);
  assert.equal(seasonOf("2026-08-01").id, "kharif");
});

const paddyWheat = rows([
  ["2025-12-05", 0.25], ["2025-12-25", 0.45], ["2026-01-15", 0.6], ["2026-02-10", 0.78], ["2026-03-05", 0.74], ["2026-03-28", 0.5], ["2026-04-12", 0.22],
  ["2026-05-10", 0.12], ["2026-06-20", 0.08, 0.35], ["2026-07-05", 0.2, 0.3], ["2026-07-25", 0.5, 0.25], ["2026-08-20", 0.75, 0.3], ["2026-09-15", 0.8, 0.28],
  ["2026-10-10", 0.55, 0.1], ["2026-10-28", 0.22, 0], ["2026-11-11", 0.13, -0.1],
]);

test("paddy after wheat in the north-east: last finished crop is read as paddy", () => {
  const r = read(paddyWheat, "2026-11-21", "NE", "Agriculture");
  assert.equal(r.cover, "crop");
  assert.equal(r.guess.id, "paddy");
  assert.equal(r.guess.season.id, "kharif");
  assert.equal(r.stage, "bare");
  assert.ok(["low", "medium"].includes(r.guess.confidence));
});

test("the same field read in March names wheat", () => {
  const r = read(paddyWheat.filter((x) => x.date <= "2026-03-28"), "2026-03-30", "NE", "Agriculture");
  assert.equal(r.enough, false); // under five months of data
  const full = read([...rows([["2025-07-20", 0.5, 0.25], ["2025-08-25", 0.78, 0.3], ["2025-10-05", 0.5], ["2025-10-30", 0.2]]), ...paddyWheat.filter((x) => x.date <= "2026-03-28")], "2026-03-30", "NE", "Agriculture");
  assert.equal(full.guess.id, "wheat");
});

test("mustard: early sowing, December-January peak, March harvest", () => {
  const r = read(rows([
    ["2025-06-15", 0.1], ["2025-07-20", 0.4], ["2025-08-20", 0.62], ["2025-09-10", 0.55], ["2025-10-01", 0.2],
    ["2025-10-25", 0.32], ["2025-11-20", 0.55], ["2025-12-20", 0.72], ["2026-01-15", 0.66], ["2026-02-15", 0.5], ["2026-03-10", 0.24], ["2026-04-05", 0.12],
  ]), "2026-04-10", "SW", "Agriculture");
  assert.equal(r.guess.id, "mustard");
});

test("a built-up plot is not called a crop", () => {
  const r = read(rows(Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, "0")}-10`, 0.1 + (i % 3) * 0.02])), "2026-12-20", "SW", "Builtup");
  assert.equal(r.cover, "builtup");
  assert.equal(r.guess, undefined);
});

test("trees or sugarcane: green all year", () => {
  const r = read(rows(Array.from({ length: 12 }, (_, i) => [`2026-${String(i + 1).padStart(2, "0")}-10`, 0.55 + (i % 4) * 0.05])), "2026-12-20", "NE", "Agriculture");
  assert.equal(r.cover, "evergreen");
});

test("too few observations gives no guess", () => {
  const r = read(rows([["2026-11-01", 0.2], ["2026-11-11", 0.3]]), "2026-11-21");
  assert.equal(r.cover, "unknown");
});

test("a cycle that never greened is not 'grown'", () => {
  const c = cycle(rows([["2026-06-10", 0.1], ["2026-08-01", 0.15], ["2026-10-01", 0.12]]), { start: "2026-06-01", end: "2026-11-25" });
  assert.equal(c.grown, false);
});
