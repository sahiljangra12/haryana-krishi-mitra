// What kind of land is this, and which crop was probably on it?
// A rule-based reading of one year of greenness (NDVI) and moisture (NDMI) for the field, set against the crop calendar
// of Haryana. It is a guess from the shape and timing of the seasonal curve, never from one image, and it carries a
// confidence that is at most "medium" because it has not been checked against fields with known crops.
// The farmer can confirm or correct it; that answer always wins.

const DAY = 864e5;
const md = (date) => { const d = new Date(date + "T00:00:00Z"); return (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); };
// is month-day inside [from, to], where the window may wrap over New Year
const within = (x, from, to) => (from <= to ? x >= from && x <= to : x >= from || x <= to);

// Season that a date falls in. Kharif: 1 June to 31 October. Rabi: 1 November to 30 April. Zaid: May.
export function seasonOf(date) {
  const d = new Date(date + "T00:00:00Z"), m = d.getUTCMonth() + 1, y = d.getUTCFullYear();
  if (m >= 6 && m <= 10) return { id: "kharif", year: y, start: `${y}-06-01`, end: `${y}-11-25` };
  if (m >= 11) return { id: "rabi", year: y, start: `${y}-10-10`, end: `${y + 1}-05-10` };
  if (m <= 4) return { id: "rabi", year: y - 1, start: `${y - 1}-10-10`, end: `${y}-05-10` };
  return { id: "zaid", year: y, start: `${y}-03-15`, end: `${y}-06-20` };
}
const prevSeason = (s) => (s.id === "kharif" ? { id: "rabi", year: s.year - 1, start: `${s.year - 1}-10-10`, end: `${s.year}-05-10` } : s.id === "rabi" ? { id: "kharif", year: s.year, start: `${s.year}-06-01`, end: `${s.year}-11-25` } : seasonOf(`${s.year}-02-01`));

// One growing cycle inside a season window: when green cover came up, peaked and went
export function cycle(rows, season) {
  const obs = rows.filter((r) => r.date >= season.start && r.date <= season.end);
  if (obs.length < 3) return null;
  const peak = obs.reduce((a, b) => (b.ndvi > a.ndvi ? b : a));
  if (peak.ndvi < 0.35) return { obs, peak, grown: false };
  const before = obs.filter((r) => r.date <= peak.date), after = obs.filter((r) => r.date > peak.date);
  // green cover that only falls inside the window is the tail of the crop before, not a crop of this season
  if (peak.ndvi - Math.min(...before.map((r) => r.ndvi)) < 0.15) return { obs, peak, grown: false, tail: true };
  let rise = null;
  for (let i = before.length - 1; i >= 0; i--) { if (before[i].ndvi < 0.3) break; rise = before[i]; }
  // the cover is "gone" at the first look below 0.3 that the next look does not contradict (one low reading can be noise)
  const fall = after.find((r, i) => r.ndvi < 0.3 && (i === after.length - 1 || after[i + 1].ndvi < 0.33)) || null;
  return { obs, peak, rise, fall, grown: true, complete: !!fall, lastGreen: fall ? after[after.indexOf(fall) - 1] || peak : null };
}

// A cycle can be named only if the satellite saw it often enough: monsoon cloud can hide a field for two months,
// and a curve with a hole that size says little about its real peak.
export function wellObserved(c) {
  if (!c || !c.grown || c.obs.length < 5) return false;
  let gap = 0;
  for (let i = 1; i < c.obs.length; i++) gap = Math.max(gap, (Date.parse(c.obs[i].date) - Date.parse(c.obs[i - 1].date)) / DAY);
  return gap <= 40;
}

// Each crop: the calendar windows (month-day) its curve should hit, and extra tests. Windows follow the usual Haryana calendar.
const SIGNS = {
  wheat: { season: "rabi", rise: [1105, 1231], peak: [125, 320], fall: [401, 505], peakMin: 0.55 },
  mustard: { season: "rabi", rise: [1010, 1120], peak: [1205, 205], fall: [220, 331], peakMin: 0.45 },
  paddy: { season: "kharif", rise: [625, 810], peak: [815, 1010], fall: [1001, 1125], peakMin: 0.55, flooded: true },
  cotton: { season: "kharif", rise: [520, 715], peak: [801, 1005], fall: [1101, 1231], peakMin: 0.5, longTail: true },
  bajra: { season: "kharif", rise: [705, 805], peak: [810, 915], fall: [915, 1020], peakMin: 0.45 },
};

function scoreCrop(id, c, rows, zone) {
  const s = SIGNS[id];
  let got = 0, of = 0;
  const test = (cond) => { of++; if (cond) got++; };
  test(c.peak.ndvi >= s.peakMin);
  test(within(md(c.peak.date), s.peak[0], s.peak[1]));
  if (c.rise) test(within(md(c.rise.date), s.rise[0], s.rise[1]));
  if (c.fall) test(within(md(c.fall.date), s.fall[0], s.fall[1]));
  if (s.flooded !== undefined || id === "bajra" || id === "cotton") {
    // standing water before the canopy closes: low greenness with high moisture in the transplanting weeks
    const wet = rows.some((r) => within(md(r.date), 610, 805) && r.date.slice(0, 4) === c.peak.date.slice(0, 4) && r.ndvi < 0.35 && r.ndmi != null && r.ndmi > 0.15);
    test(s.flooded ? wet : !wet);
  }
  if (s.longTail) test(!c.fall || md(c.fall.date) >= 1101);
  let score = of ? got / of : 0;
  // a light push from where the crop is commonly grown: paddy and wheat in the north-east, bajra, cotton and mustard in the south-west
  if (zone === "NE" && (id === "paddy" || id === "wheat")) score += 0.05;
  if (zone === "SW" && (id === "bajra" || id === "cotton" || id === "mustard")) score += 0.05;
  return { id, score: Math.min(1, score), tests: of };
}

// rows: clear observations, oldest first, each { date, ndvi, ndmi }. today: "YYYY-MM-DD". zone: "NE" | "SW". lulc: ISRO class group or null.
export function read(rows, today, zone = null, lulc = null) {
  const obs = rows.filter((r) => r.ndvi != null).sort((a, b) => a.date.localeCompare(b.date));
  if (obs.length < 6) return { cover: "unknown", enough: false, crops: [], events: [] };
  const span = (Date.parse(obs[obs.length - 1].date) - Date.parse(obs[0].date)) / DAY;
  const max = Math.max(...obs.map((r) => r.ndvi)), min = Math.min(...obs.map((r) => r.ndvi));
  const mean = obs.reduce((a, r) => a + r.ndvi, 0) / obs.length;
  const wetAll = obs.filter((r) => r.ndvi < 0.1 && r.ndmi != null && r.ndmi > 0.2).length / obs.length;
  const out = { enough: span >= 150, span, max, min, mean, crops: [], events: [], season: seasonOf(today) };
  // land cover from the year as a whole
  if (wetAll >= 0.6) out.cover = "water";
  else if (max < 0.25) out.cover = lulc === "Builtup" ? "builtup" : "bare";
  else if (min >= 0.45 && span >= 240) out.cover = "evergreen"; // trees, an orchard, or sugarcane
  else out.cover = "crop";
  if (out.cover !== "crop") return out;

  const cur = out.season, last = prevSeason(cur), older = prevSeason(last);
  const cCur = cycle(obs, cur), cLast = cycle(obs, last), cOlder = cycle(obs, older);
  const push = (c, season) => {
    if (!wellObserved(c)) return; // no story from a season the satellite barely saw
    if (c.rise && c.rise.date !== c.peak.date) out.events.push({ date: c.rise.date, type: "rise", season: season.id });
    out.events.push({ date: c.peak.date, type: "peak", season: season.id, ndvi: c.peak.ndvi });
    if (c.fall) out.events.push({ date: c.fall.date, type: "fall", season: season.id });
  };
  push(cOlder, older); push(cLast, last); push(cCur, cur);
  out.events.sort((a, b) => a.date.localeCompare(b.date));
  // a fallow season: the window passed without green cover
  out.lastFallow = !!cLast && !cLast.grown;

  // which cycle to name: the current season once its peak is in, otherwise the last finished one
  const curUsable = cCur && cCur.grown && (cCur.complete || (Date.parse(today) - Date.parse(cCur.peak.date)) / DAY >= 20);
  // name the newest cycle that was seen well enough; note a newer one that cloud hid
  const cands = [curUsable ? { c: cCur, season: cur } : null, cLast && cLast.grown ? { c: cLast, season: last } : null, cOlder && cOlder.grown ? { c: cOlder, season: older } : null].filter(Boolean);
  const target = cands.find((x) => wellObserved(x.c)) || null;
  const hidden = cands.find((x) => !wellObserved(x.c));
  if (hidden && (!target || hidden.season.start > target.season.start)) out.sparse = hidden.season;
  if (target) {
    const ids = Object.keys(SIGNS).filter((id) => SIGNS[id].season === target.season.id);
    const ranked = ids.map((id) => scoreCrop(id, target.c, obs, zone)).sort((a, b) => b.score - a.score);
    const best = ranked[0], second = ranked[1];
    if (best && best.score >= 0.6) {
      const clear = !second || best.score - second.score >= 0.15;
      out.crops = ranked.filter((r) => r.score >= 0.5).slice(0, 2);
      out.guess = { id: best.id, season: target.season, confidence: best.score >= 0.8 && clear && target.c.complete ? "medium" : "low", lastObs: obs[obs.length - 1].date, complete: !!target.c.complete };
    }
    out.guessSeason = target.season;
  }
  // where the current season stands
  const latest = obs[obs.length - 1], prev = obs[obs.length - 2];
  const d = latest.ndvi - prev.ndvi;
  out.stage = latest.ndvi < 0.2 ? "bare" : cCur && cCur.grown && latest.date > cCur.peak.date && d < -0.03 ? "ripening" : d > 0.04 ? "growing" : latest.ndvi >= 0.6 ? "full" : latest.ndvi < 0.35 ? "early" : "steady";
  return out;
}
