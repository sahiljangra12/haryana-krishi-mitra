// What is on the chosen ground: a field, buildings, water or trees. No crop advice is given for buildings or water.
// Evidence, in order of weight:
//   io  Impact Observatory 10 m land-cover map, newest year (class shares inside the field outline)
//   wc  ESA WorldCover 10 m map of 2021 (a second opinion)
//   ndvi      greenness on the newest clear Sentinel-2 pass
//   waterNow  share of the field that Sentinel-2's own scene classification called water, averaged over the newest clear passes
// Both maps are a year or more old, so the result is a check, not a certainty: the farmer can overrule it.

export const IO_CLASS = { 1: "water", 2: "trees", 4: "flooded", 5: "crops", 7: "built", 8: "bare", 9: "snow", 10: "cloud", 11: "range" };
export const WC_CLASS = { 10: "trees", 20: "range", 30: "range", 40: "crops", 50: "built", 60: "bare", 70: "snow", 80: "water", 90: "flooded", 95: "flooded", 100: "bare" };

// histogram [counts, values] of a class raster -> share of each named class
export function shares(hist, names) {
  const out = {}; let tot = 0;
  if (!hist) return null;
  const [counts, values] = hist;
  values.forEach((v, i) => { const c = counts[i] || 0; if (!c) return; const k = names[Math.round(v)] || "other"; out[k] = (out[k] || 0) + c; tot += c; });
  if (!tot) return null;
  for (const k of Object.keys(out)) out[k] /= tot;
  return out;
}

export function classify({ io = null, wc = null, ndvi = null, waterNow = null, month = null, told = null } = {}) {
  const maps = [io, wc].filter((m) => m && m.shares);
  const mean = (k) => (maps.length ? maps.reduce((a, m) => a + (m.shares[k] || 0), 0) / maps.length : 0);
  const least = (k) => (maps.length ? Math.min(...maps.map((m) => m.shares[k] || 0)) : 0);
  const out = { kind: "unknown", block: false, built: mean("built"), water: mean("water"), trees: mean("trees"), crops: mean("crops"), year: io?.year || wc?.year || null, maps: maps.length, waterNow, told: told || null };
  // June to August is paddy transplanting: a flooded field looks like water to the satellite, so "water now" alone proves nothing then
  const paddyTime = month != null && month >= 6 && month <= 8;
  const wetNow = waterNow != null && waterNow >= 0.5 && !paddyTime && (ndvi == null || ndvi < 0.2);
  if (!maps.length && !wetNow) return out;
  const nonFarm = out.built + out.water;
  if (out.water >= 0.5 && least("water") >= 0.25) out.kind = "water";
  else if (wetNow && out.water >= 0.15) out.kind = "water";
  else if (out.built >= 0.5 && least("built") >= 0.25 && (ndvi == null || ndvi < 0.45)) out.kind = "built";
  else if (nonFarm >= 0.5 && Math.min(least("built") + least("water"), 1) >= 0.25 && (ndvi == null || ndvi < 0.45)) out.kind = out.built >= out.water ? "built" : "water";
  else if (wetNow) out.kind = "mixed"; // the satellite sees water today but the map does not: say so, do not block
  else if (nonFarm >= 0.15) out.kind = "mixed";
  else if (out.trees >= 0.5) out.kind = "trees";
  else out.kind = "farm";
  if (wetNow && out.kind === "mixed") out.water = Math.max(out.water, waterNow);
  out.block = out.kind === "built" || out.kind === "water";
  // the farmer's word comes first: "this is my field" lifts the block but keeps the finding
  if (told === "farm" && out.block) { out.block = false; out.overruled = true; }
  return out;
}
