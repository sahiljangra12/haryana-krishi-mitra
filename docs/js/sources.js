// All live data access lives here. Every source is free and open, no API keys in the browser.
//  - Sentinel-2 L2A imagery: Microsoft Planetary Computer (STAC search + titiler statistics/tiles)
//  - Soil: ISRIC SoilGrids 2.0 (250 m)
//  - Weather forecast: Open-Meteo
//  - Climate history: NASA POWER
//  - Mandi prices: data/prices.json, refreshed daily by a GitHub Action from data.gov.in (Agmarknet)

const STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
const PCDATA = "https://planetarycomputer.microsoft.com/api/data/v1";

async function getJSON(url, opts = {}, timeoutMs = 25000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// run async jobs with limited concurrency
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        try { out[k] = await fn(items[k], k); } catch (e) { out[k] = null; }
      }
    })
  );
  return out;
}

/* ---------------- Satellite ---------------- */

const iso = (d) => d.toISOString().slice(0, 19) + "Z";

export async function searchScenes(geometry, monthsBack = 13, maxCloud = 35) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - monthsBack);
  const body = {
    collections: ["sentinel-2-l2a"],
    intersects: geometry,
    datetime: `${iso(start)}/${iso(end)}`,
    query: { "eo:cloud_cover": { lt: maxCloud } },
    limit: 200,
    sortby: [{ field: "datetime", direction: "asc" }],
  };
  const j = await getJSON(STAC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  // one scene per day (adjacent tiles overlap), keep the clearest
  const byDay = new Map();
  for (const f of j.features || []) {
    const day = f.properties.datetime.slice(0, 10);
    const prev = byDay.get(day);
    if (!prev || f.properties["eo:cloud_cover"] < prev.properties["eo:cloud_cover"]) byDay.set(day, f);
  }
  return [...byDay.values()].sort((a, b) => a.properties.datetime.localeCompare(b.properties.datetime));
}

// Processing baseline >= 04.00 adds +1000 to digital numbers; correct for it in band math.
function off(item) {
  const pb = parseFloat(item.properties["s2:processing_baseline"] || "0");
  return pb >= 4 ? 2000 : 0;
}
export const ndviExpr = (item) => `(B08-B04)/(B08+B04-${off(item)})`;
export const ndmiExpr = (item) => `(B8A-B11)/(B8A+B11-${off(item)})`;

async function stats(item, feature, query) {
  const url = `${PCDATA}/item/statistics?collection=sentinel-2-l2a&item=${encodeURIComponent(item.id)}&${query}`;
  const j = await getJSON(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(feature) }, 40000);
  return Object.values(j.properties.statistics)[0];
}
const exprQuery = (e) => `expression=${encodeURIComponent(e)}&asset_as_band=true`;

// Share of field pixels that are cloud / cloud shadow / snow according to the Scene Classification Layer
async function cloudShare(item, feature) {
  const s = await stats(item, feature, "assets=SCL&categorical=true");
  const [counts, values] = s.histogram;
  let bad = 0, tot = 0;
  values.forEach((v, i) => { tot += counts[i]; if ([0, 1, 3, 8, 9, 10, 11].includes(Math.round(v))) bad += counts[i]; });
  return tot ? bad / tot : 1;
}

// Pick roughly one scene every `stepDays` so the time series is light on the network
function thin(scenes, stepDays = 12) {
  const out = [];
  let last = -Infinity;
  for (const s of scenes) {
    const t = Date.parse(s.properties.datetime);
    if (t - last >= stepDays * 864e5) { out.push(s); last = t; }
  }
  return out;
}

export async function fieldTimeSeries(feature, onProgress) {
  const scenes = await searchScenes(feature.geometry);
  const picked = thin(scenes, 12);
  let done = 0;
  const rows = await pool(picked, 4, async (item) => {
    const cs = await cloudShare(item, feature);
    let row = { date: item.properties.datetime.slice(0, 10), item, cloud: cs, sceneCloud: item.properties["eo:cloud_cover"] };
    if (cs < 0.3) {
      const [nd, nm] = await Promise.all([stats(item, feature, exprQuery(ndviExpr(item))), stats(item, feature, exprQuery(ndmiExpr(item)))]);
      row = { ...row, ndvi: nd.mean, ndviStd: nd.std, ndviHist: nd.histogram, ndmi: nm.mean, pixels: nd.count };
    }
    onProgress && onProgress(++done, picked.length);
    return row;
  });
  return { scenesFound: scenes.length, series: rows.filter((r) => r && r.ndvi != null) };
}

export async function neighbourhoodNdvi(item, lat, lon, radiusM = 1000) {
  const feature = squareFeature(lat, lon, radiusM);
  const s = await stats(item, feature, exprQuery(ndviExpr(item)));
  return s.mean;
}

export function ndviTileUrl(item) {
  return `${PCDATA}/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&item=${encodeURIComponent(item.id)}&${exprQuery(ndviExpr(item))}&rescale=-0.1,0.9&colormap_name=rdylgn&format=png`;
}
export function trueColorTileUrl(item) {
  return `${PCDATA}/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&item=${encodeURIComponent(item.id)}&assets=visual&asset_bidx=visual%7C1,2,3&nodata=0&format=png`;
}

export function squareFeature(lat, lon, halfSideM) {
  const dLat = halfSideM / 111320;
  const dLon = halfSideM / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: "Feature", properties: {},
    geometry: { type: "Polygon", coordinates: [[[lon - dLon, lat - dLat], [lon + dLon, lat - dLat], [lon + dLon, lat + dLat], [lon - dLon, lat + dLat], [lon - dLon, lat - dLat]]] },
  };
}

/* ---------------- Soil (SoilGrids) ---------------- */

export async function soilProfile(lat, lon) {
  const props = ["clay", "sand", "silt", "phh2o", "soc", "nitrogen", "cec", "bdod"];
  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(5)}&lat=${lat.toFixed(5)}&${props.map((p) => "property=" + p).join("&")}&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean`;
  const j = await getJSON(url, {}, 30000);
  const out = {};
  for (const layer of j.properties.layers) {
    const f = layer.unit_measure.d_factor || 1;
    const vals = layer.depths.map((d) => (d.values.mean == null ? null : d.values.mean / f)).filter((v) => v != null);
    out[layer.name] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null; // 0–30 cm average
  }
  if (out.clay == null && out.sand == null) throw new Error("No SoilGrids data at this point");
  out.texture = textureClass(out.sand, out.clay, out.silt);
  return out; // clay/sand/silt %, phh2o pH, soc g/kg, nitrogen g/kg, cec cmol/kg, bdod kg/dm3
}

// USDA texture triangle (simplified)
export function textureClass(sand, clay, silt) {
  if (sand == null || clay == null) return "loam";
  silt = silt ?? 100 - sand - clay;
  if (clay >= 40) return silt >= 40 ? "silty clay" : sand > 45 ? "sandy clay" : "clay";
  if (clay >= 27) return sand <= 20 ? "silty clay loam" : sand > 45 ? "sandy clay loam" : "clay loam";
  if (silt >= 80 && clay < 12) return "silt";
  if (silt >= 50) return "silty loam";
  if (sand >= 85) return "sand";
  if (sand >= 70 && clay < 15) return "loamy sand";
  if (clay < 20 && sand > 52) return "sandy loam";
  if (clay >= 20 && sand > 45) return "sandy clay loam";
  return "loam";
}

/* ---------------- Weather ---------------- */

export async function forecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=Asia%2FKolkata&forecast_days=10` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,relative_humidity_2m_mean,weather_code`;
  return getJSON(url);
}

// 5 full years of monthly rainfall + temperature from NASA POWER
export async function climateHistory(lat, lon) {
  const y = new Date().getFullYear();
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR,T2M_MAX,T2M_MIN&community=AG&longitude=${lon}&latitude=${lat}&start=${y - 5}&end=${y - 1}&format=JSON`;
  const j = await getJSON(url, {}, 40000);
  const p = j.properties.parameter;
  const years = {};
  for (const [k, v] of Object.entries(p.PRECTOTCORR)) {
    const yr = k.slice(0, 4), mo = +k.slice(4);
    if (mo < 1 || mo > 12 || v < 0) continue; // month 13 = annual
    const days = new Date(+yr, mo, 0).getDate();
    years[yr] = (years[yr] || 0) + v * days; // mm/day -> mm/month
  }
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const vals = Object.entries(p.PRECTOTCORR).filter(([k]) => +k.slice(4) === i + 1).map(([k, v]) => v * new Date(+k.slice(0, 4), i + 1, 0).getDate());
    const tmax = Object.entries(p.T2M_MAX).filter(([k]) => +k.slice(4) === i + 1).map(([, v]) => v);
    const tmin = Object.entries(p.T2M_MIN).filter(([k]) => +k.slice(4) === i + 1).map(([, v]) => v);
    const avg = (a) => (a.length ? a.reduce((x, z) => x + z, 0) / a.length : null);
    return { rain: avg(vals), tmax: avg(tmax), tmin: avg(tmin) };
  });
  const annual = Object.values(years);
  return { annualRain: annual.reduce((a, b) => a + b, 0) / annual.length, years, monthly };
}

/* ---------------- Mandi prices ---------------- */

let _prices = null;
export async function mandiPrices() {
  if (_prices) return _prices;
  const base = new URL("./data/", document.baseURI);
  const [latest, history] = await Promise.all([
    getJSON(new URL("prices.json", base) + "?v=" + Date.now()).catch(() => null),
    getJSON(new URL("price_history.json", base) + "?v=" + Date.now()).catch(() => null),
  ]);
  _prices = { latest, history };
  // data.gov.in is geo-fenced to India, so the GitHub Action (US servers) may not reach it.
  // Farmers' browsers in India can: fetch live prices directly when the saved file is missing or stale.
  const stale = !latest?.records?.length || Date.now() - Date.parse(latest.updated) > 36 * 3600e3;
  if (stale) {
    try {
      const live = await liveMandiFromBrowser();
      if (live.records.length) _prices.latest = live;
    } catch (e) { /* outside India or API down: keep whatever we have */ }
  }
  return _prices;
}

const OGD_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";
const OGD_SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";
function toIso(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
}
async function liveMandiFromBrowser() {
  let key = OGD_SAMPLE_KEY;
  try { key = localStorage.getItem("km-ogd-key") || key; } catch {}
  const limit = key === OGD_SAMPLE_KEY ? 10 : 1000;
  const page = (offset) => getJSON(`https://api.data.gov.in/resource/${OGD_RESOURCE}?api-key=${key}&format=json&limit=${limit}&offset=${offset}&filters%5Bstate.keyword%5D=Haryana`, {}, 15000);
  const first = await page(0);
  let recs = first.records || [];
  const total = Math.min(+first.total || recs.length, 400);
  if (total > recs.length) {
    const offsets = [];
    for (let o = limit; o < total; o += limit) offsets.push(o);
    const more = await pool(offsets, 6, page);
    more.forEach((m) => m && (recs = recs.concat(m.records || [])));
  }
  const records = recs
    .filter((r) => String(r.state).toLowerCase() === "haryana" && +r.modal_price > 0)
    .map((r) => ({ district: r.district, market: r.market, commodity: r.commodity, variety: r.variety, grade: r.grade, date: toIso(r.arrival_date), min: +r.min_price || +r.modal_price, max: +r.max_price || +r.modal_price, modal: +r.modal_price }));
  return { updated: new Date().toISOString(), source: "Agmarknet via data.gov.in (live, fetched by your browser)", records };
}

/* ---------------- Geocoding (OpenStreetMap Nominatim) ---------------- */

export async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(q + ", Haryana")}`;
  return getJSON(url);
}
