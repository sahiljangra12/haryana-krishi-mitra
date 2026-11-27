// The year's farming plan and its money. Pure arithmetic, so it can be tested without a browser.
// Every figure carries where it came from:
//   "estimate"  the indicative Haryana per-acre range in crops.js (compiled from CCS HAU and CACP reports)
//   "mine"      typed by the farmer
//   "none"      nobody has given this figure, so it counts as zero and the page says so
// Transport and "other" have no estimate in the data: they are the farmer's to enter.

export const HEADS = ["seed", "fertilizer", "protection", "irrigation", "labour", "machinery", "transport", "other"];
export const PLAN_KEY = "km-plan";
const num = (v) => (v === "" || v == null || !Number.isFinite(+v) || +v < 0 ? null : +v);

// line: { acres, over: { <head>: ₹ for the whole line, yield: qtl per acre, price: ₹ per qtl } }
// crop: an entry of CROPS, or null for a crop the app has no data for. price: { price, basis } from the price logic, or null.
export function estimate(line, crop, price) {
  const acres = num(line.acres) || 0, over = line.over || {}, heads = {};
  let cost = 0, anyMine = false;
  for (const h of HEADS) {
    const est = crop && crop.costSplit[h] != null ? Math.round(((crop.cost[0] + crop.cost[1]) / 2) * crop.costSplit[h] * acres) : null;
    const mine = num(over[h]);
    const used = mine != null ? mine : est != null ? est : 0;
    heads[h] = { estimate: est, mine, used, basis: mine != null ? "mine" : est != null ? "estimate" : "none" };
    cost += used; if (mine != null) anyMine = true;
  }
  const myYield = num(over.yield), myPrice = num(over.price);
  const yieldPerAcre = myYield != null ? [myYield, myYield] : crop ? crop.yield : null;
  const p = myPrice != null ? { price: myPrice, basis: "mine" } : price || null;
  const by = crop && myYield == null ? (crop.byproduct || 0) * acres : 0; // straw value belongs to the estimate only
  const production = yieldPerAcre ? yieldPerAcre.map((y) => y * acres) : null;
  const revenue = production && p ? production.map((q) => Math.round(q * p.price + by)) : null;
  const profit = revenue ? revenue.map((r) => r - cost) : null;
  const midQ = production ? (production[0] + production[1]) / 2 : 0;
  return {
    acres, heads, cost, costBasis: !crop ? "mine" : anyMine ? "mixed" : "estimate",
    costRange: crop && !anyMine ? crop.cost.map((c) => Math.round(c * acres)) : null,
    yieldPerAcre, yieldBasis: myYield != null ? "mine" : crop ? "estimate" : "none",
    production, price: p, byproduct: by, revenue, profit,
    breakEven: midQ > 0 ? Math.round(cost / midQ) : null,
    complete: !!(acres && revenue),
  };
}

// What has really been spent and earned on a line so far
export function actual(line) {
  const a = line.actual || {}, byHead = {}; let spent = 0;
  for (const e of a.costs || []) { const v = num(e.amount); if (v == null) continue; byHead[e.head] = (byHead[e.head] || 0) + v; spent += v; }
  const harvest = num(a.harvestQtl), received = num(a.received);
  return { byHead, spent, entries: (a.costs || []).length, harvest, received, profit: received != null ? received - spent : null };
}

// The whole plan: land per season, money planned, money really spent and received
export function totals(lines, cropOf, priceOf) {
  const out = { acres: {}, cost: 0, revenue: [0, 0], profit: [0, 0], incomplete: 0, spent: 0, received: 0, anyReceived: false };
  for (const l of lines) {
    const crop = cropOf(l), e = estimate(l, crop, crop ? priceOf(crop) : null), a = actual(l);
    out.acres[l.season] = (out.acres[l.season] || 0) + e.acres;
    out.cost += e.cost;
    if (e.revenue) { out.revenue[0] += e.revenue[0]; out.revenue[1] += e.revenue[1]; out.profit[0] += e.profit[0]; out.profit[1] += e.profit[1]; } else out.incomplete++;
    out.spent += a.spent; if (a.received != null) { out.received += a.received; out.anyReceived = true; }
  }
  return out;
}
// Seasons in which more land is planned than the farmer has
export const overLand = (acresBySeason, land) => (land ? Object.keys(acresBySeason).filter((s) => acresBySeason[s] > land + 1e-9) : []);

// Anything read back from storage is checked, so a damaged entry cannot break the page
export function cleanPlan(raw) {
  const lines = Array.isArray(raw && raw.lines) ? raw.lines : [];
  return { version: 1, lines: lines.filter((l) => l && typeof l === "object" && ["rabi", "kharif", "zaid"].includes(l.season) && num(l.acres) > 0 && (typeof l.cropId === "string" || typeof l.name === "string")).slice(0, 40).map((l) => ({
    id: String(l.id || Math.random().toString(36).slice(2)), season: l.season, cropId: typeof l.cropId === "string" ? l.cropId : null, name: typeof l.name === "string" ? l.name.slice(0, 40) : "", acres: num(l.acres),
    over: l.over && typeof l.over === "object" ? Object.fromEntries(Object.entries(l.over).filter(([k, v]) => [...HEADS, "yield", "price"].includes(k) && num(v) != null).map(([k, v]) => [k, num(v)])) : {},
    actual: { costs: Array.isArray(l.actual && l.actual.costs) ? l.actual.costs.filter((e) => e && HEADS.includes(e.head) && num(e.amount) != null).slice(0, 200).map((e) => ({ id: String(e.id || Math.random().toString(36).slice(2)), head: e.head, amount: num(e.amount), date: typeof e.date === "string" ? e.date.slice(0, 10) : "", note: typeof e.note === "string" ? e.note.slice(0, 80) : "" })) : [], harvestQtl: num(l.actual && l.actual.harvestQtl), received: num(l.actual && l.actual.received) },
  })) };
}
