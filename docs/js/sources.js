import { DISTRICTS } from "./districts.js?v=20261120210410";
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
  // SoilGrids is a free research service that often answers "503 busy": retry, then fall back to a lighter query
  const light = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon.toFixed(5)}&lat=${lat.toFixed(5)}&property=clay&property=sand&property=silt&property=phh2o&property=soc&depth=0-5cm&depth=5-15cm&value=mean`;
  let j = null, lastErr = null;
  for (const [u, wait] of [[url, 0], [url, 1500], [light, 3000], [light, 5000]]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try { j = await getJSON(u, {}, 25000); break; } catch (e) { lastErr = e; }
  }
  if (!j) throw lastErr || new Error("SoilGrids unavailable");
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
    // don't block the page: fetch in the background and let the app re-render when it lands
    _prices.livePromise = liveMandiFromBrowser()
      .then((live) => { if (live.records.length) { _prices.latest = live; return true; } return false; })
      .catch(() => false);
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

/* ---------------- Geocoding ----------------
   Village-level addresses in India are patchy in every free database, so we:
   1. read exact coordinates or a Google Maps link if the farmer pastes one,
   2. clean filler words ("village", "tehsil", "district", PIN codes),
   3. ask Esri (best coverage of Haryana villages) and OpenStreetMap in parallel,
   4. retry with smaller parts of the address if nothing good comes back,
   5. keep only results inside Haryana, de-duplicated and ranked.
   The farmer then taps their exact field; reverseGeocode() names the nearest village to confirm. */

const HR_BBOX = "74.4,27.6,77.6,31.0";
const inHaryana = (lat, lon) => lat > 27.6 && lat < 31.0 && lon > 74.4 && lon < 77.6;
// Delhi, Chandigarh and parts of Punjab/UP/Rajasthan sit inside Haryana's bounding box, so also check the label
const OTHER_STATE = /\b(delhi|new delhi|chandigarh|punjab|rajasthan|uttar pradesh|himachal)\b|दिल्ली|चंडीगढ़|पंजाब|राजस्थान|उत्तर प्रदेश|हिमाचल/i;

// Simple Devanagari -> Latin transliteration, so Hindi village names can be matched against English-spelled gazetteers.
const DV_CONS = { क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "n", च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n", ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n", त: "t", थ: "th", द: "d", ध: "dh", न: "n", प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", ळ: "l", व: "v", श: "sh", ष: "sh", स: "s", ह: "h" };
const DV_VOW = { अ: "a", आ: "a", इ: "i", ई: "i", उ: "u", ऊ: "u", ऋ: "ri", ए: "e", ऐ: "ai", ओ: "o", औ: "au" };
const DV_SIGN = { "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au" };
export function transliterate(text) {
  return text.split(/(\s+|,)/).map((w) => {
    const ch = [...w.replace(/़/g, "")]; // drop nukta
    const syl = []; // {c, v, inherent}
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i];
      if (DV_CONS[c]) {
        const nx = ch[i + 1];
        if (nx === "्") { syl.push({ c: DV_CONS[c], v: "" }); i++; }
        else if (DV_SIGN[nx]) { syl.push({ c: DV_CONS[c], v: DV_SIGN[nx] }); i++; }
        else syl.push({ c: DV_CONS[c], v: "a", inh: true });
      } else if (DV_VOW[c]) syl.push({ c: "", v: DV_VOW[c] });
      else if (c === "ं" || c === "ँ") { if (syl.length) syl[syl.length - 1].v += "n"; }
      else if (c === "ः") { if (syl.length) syl[syl.length - 1].v += "h"; }
      else syl.push({ c, v: "" });
    }
    // schwa deletion: final inherent 'a', and a medial inherent 'a' between two vowelled syllables (कर-ना-ल -> karnal)
    if (syl.length > 1 && syl[syl.length - 1].inh) syl[syl.length - 1].v = "";
    for (let i = 1; i < syl.length - 1; i++) if (syl[i].inh && syl[i - 1].v && syl[i + 1].v && syl[i + 1].c) syl[i].v = "";
    return syl.map((x) => x.c + x.v).join("");
  }).join("");
}
const hasDevanagari = (t) => /[ऀ-ॿ]/.test(t);
const ESRI_GEO = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

// "29.7621, 76.8623", "29.7621 N 76.8623 E", Google Maps links (@lat,lon / q=lat,lon / !3dlat!4dlon)
export const isShortMapsLink = (t) => /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(t || "");
export function parseCoordinates(text) {
  const t = (text || "").trim();
  let m = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(t) || /[@?&](?:q=|ll=|query=|center=)?(-?\d{1,2}\.\d{2,}),\s*(-?\d{1,3}\.\d{2,})/.exec(t) || /^(-?\d{1,2}\.\d+)\s*°?\s*[N]?\s*[,\s]\s*(-?\d{1,3}\.\d+)\s*°?\s*[E]?$/i.exec(t);
  if (!m) return null;
  const lat = parseFloat(m[1]), lon = parseFloat(m[2]);
  return isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

// Words that carry no location (they confuse geocoders) and unit numbers no database has (ward, gali, house, plot, khasra).
const FILLER = /\b(vill(age)?|vpo|v\.?\s?p\.?\s?o\.?|gaon|gram|po|p\.o\.|post|teh(sil)?|teh\.|block|distt?\.?|district|dist\.|pin(\s*code)?|haryana|india|near|nr\.?|opp(osite)?|behind|in front of|back side|h\.?\s?no\.?|house\s*no\.?|mohalla|mohala)\b|गांव|गाँव|ग्राम|तहसील|ज़िला|जिला|डाकघर|हरियाणा|पिन|मोहल्ला|के पास|नज़दीक|नजदीक/gi;
const UNIT_NO = /\b(ward|gali|street|lane|plot|khasra|killa|murabba|flat|shop|house|h)\s*(no\.?|number|#)?\s*[-.:]?\s*\d+[a-z]?\b|वार्ड\s*(नं\.?|नंबर)?\s*\d+|गली\s*(नं\.?|नंबर)?\s*\d+/gi;
export function cleanAddress(q) {
  const pin = (/\b1[23]\d{4}\b/.exec(q) || [])[0] || null; // Haryana PINs start with 12/13
  const parts = q.replace(/\b1[23]\d{4}\b/g, " ").replace(UNIT_NO, " ").replace(FILLER, " ").split(/[,;\n]+/)
    .map((p) => p.replace(/[^\p{L}\p{M}\p{N}\s\-.]/gu, " ").replace(/\s+/g, " ").replace(/^[\s.\-]+|[\s.\-]+$/g, "").trim())
    .filter((p) => p.length > 1 && !/^[\d\s.\-]+$/.test(p));
  return { parts, pin };
}

const KIND = { Locality: "place", POI: "place", PointAddress: "address", StreetAddress: "address", StreetName: "road", Postal: "pin", PostalExt: "pin" };
const norm = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]/g, " ").replace(/\s+/g, " ").trim();
// Dice similarity on letter pairs: 1 = same name, handles small spelling differences (Nangal / Nagal)
function similar(a, b) {
  a = norm(a).replace(/ /g, ""); b = norm(b).replace(/ /g, "");
  if (!a || !b) return 0;
  if (a === b) return 1;
  const pairs = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = pairs(a), B = pairs(b);
  let hit = 0;
  for (const [k, n] of A) hit += Math.min(n, B.get(k) || 0);
  return (2 * hit) / (a.length - 1 + b.length - 1 || 1);
}
const kmBetween = (a, b) => { const dy = (a.lat - b.lat) * 111.3, dx = (a.lon - b.lon) * 111.3 * Math.cos((a.lat * Math.PI) / 180); return Math.sqrt(dx * dx + dy * dy); };

// District names (and older names people still use) -> centroid, to keep results inside the right district
const DISTRICT_ALIASES = { gurgaon: "Gurugram", mewat: "Nuh", dadri: "Charkhi Dadri", narnaul: "Mahendragarh", "yamuna nagar": "Yamunanagar", jagadhri: "Yamunanagar", thanesar: "Kurukshetra" };
function findDistrict(part) {
  const p = norm(part);
  const hit = DISTRICTS.find((d) => norm(d.name) === p || norm(d.hi) === p || (typeof transliterate === "function" && norm(d.name) === norm(transliterate(part))));
  if (hit) return hit;
  const alias = DISTRICT_ALIASES[p];
  return alias ? DISTRICTS.find((d) => d.name === alias) : null;
}

const extentAround = (c, km) => { const d = km / 111.3, e = km / (111.3 * Math.cos((c.lat * Math.PI) / 180)); return `${c.lon - e},${c.lat - d},${c.lon + e},${c.lat + d}`; };

async function esriFind(text, extent = HR_BBOX, near = null) {
  const loc = near ? `&location=${near.lon},${near.lat}` : "";
  const u = `${ESRI_GEO}/findAddressCandidates?f=json&singleLine=${encodeURIComponent(text)}&countryCode=IND&searchExtent=${extent}${loc}&maxLocations=8&outFields=Addr_type,PlaceName,City,Subregion,Region&forStorage=false`;
  const j = await getJSON(u, {}, 12000);
  return (j.candidates || []).map((c) => {
    const at = c.attributes || {};
    // POIs come back as just "Bus Stand": add town and district so the farmer can tell them apart
    const ctx = [at.City, at.Subregion].filter((x) => x && !norm(c.address).includes(norm(x))).join(", ");
    let label = ctx ? `${c.address}, ${ctx}` : c.address;
    if (at.PlaceName && !norm(label).includes(norm(at.PlaceName))) label = `${at.PlaceName}, ${label}`;
    return { label, name: at.PlaceName || c.address.split(",")[0], region: at.Region || "", lat: c.location.y, lon: c.location.x, score: c.score, kind: KIND[at.Addr_type] || "place", src: "Esri" };
  });
}
async function osmFind(text, extent = HR_BBOX) {
  const u = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=in&viewbox=${extent}&bounded=1&q=${encodeURIComponent(text)}`;
  const j = await getJSON(u, {}, 12000);
  return j.map((p) => {
    const a = p.address || {};
    return { label: p.display_name.split(",").slice(0, 4).join(","), name: p.name || p.display_name.split(",")[0], region: a.state || "", lat: +p.lat, lon: +p.lon, score: 78 + (p.importance || 0) * 10, kind: p.class === "place" || p.class === "boundary" ? "place" : p.class === "highway" ? "road" : "address", src: "OpenStreetMap" };
  });
}
async function photonFind(text, near) {
  const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=6&lat=${near.lat}&lon=${near.lon}&bbox=${extentAround(near, 12)}`;
  const j = await getJSON(u, {}, 10000);
  return (j.features || []).map((f) => {
    const p = f.properties || {};
    return { label: [p.name, p.street, p.city || p.district || p.county].filter(Boolean).join(", "), name: p.name || "", region: p.state || "", lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], score: 80, kind: p.osm_key === "place" ? "place" : p.osm_key === "highway" ? "road" : "address", src: "OpenStreetMap" };
  });
}

// keep Haryana only, merge near-duplicates, rank by name match + distance to the anchor/district
function rankAll(list, want, opts = {}) {
  const out = [];
  for (const r of list) {
    if (!r || !inHaryana(r.lat, r.lon)) continue;
    if (OTHER_STATE.test(norm(r.label)) || (r.region && !/haryana|हरियाणा/i.test(norm(r.region)))) continue;
    if (opts.near && kmBetween(r, opts.near) > opts.maxKm) continue;
    const dup = out.find((o) => kmBetween(o, r) < 0.4);
    const sim = Math.max(similar(want, r.name), similar(want, r.label.split(",")[0]));
    const kindBonus = { exact: 30, address: 12, place: 10, road: 4, pin: 0 }[r.kind] || 0;
    const distPenalty = opts.near ? Math.min(20, kmBetween(r, opts.near)) : 0;
    const rank = sim * 60 + kindBonus + (r.score || 0) * 0.2 - distPenalty;
    if (dup) { if (rank > dup.rank) Object.assign(dup, r, { rank }); continue; }
    out.push({ ...r, rank, sim });
  }
  return out.sort((a, b) => b.rank - a.rank);
}

async function search(text, extent, near) {
  const jobs = [esriFind(text, extent, near), osmFind(text, extent)];
  if (near) jobs.push(photonFind(text, near));
  const got = await Promise.allSettled(jobs);
  return got.flatMap((g) => (g.status === "fulfilled" ? g.value : []));
}

/**
 * Read an address the way a person does: right-most parts are the bigger places (district, town),
 * left-most part is the specific thing (landmark, colony, village).
 *  1. find the district (if named) and the town/village ("anchor"), within that district
 *  2. search the specific part only within a few km of the anchor
 *  3. if the specific part is in no database, return the anchor and say so
 */
export async function geocode(q) {
  const coord = parseCoordinates(q);
  if (coord) return Object.assign([{ label: `${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}`, ...coord, score: 100, kind: "exact", src: "coordinates" }], { note: "" });
  let { parts, pin } = cleanAddress(q);
  if (hasDevanagari(parts.join(" "))) parts = parts.map((p) => (hasDevanagari(p) ? transliterate(p) : p));
  // "Dhani Phogat Charkhi Dadri" has no commas: peel a district name off the end
  if (parts.length === 1) {
    const w = parts[0].split(" ");
    for (let k = Math.min(3, w.length - 1); k >= 1; k--) {
      if (findDistrict(w.slice(-k).join(" "))) { parts = [w.slice(0, -k).join(" "), w.slice(-k).join(" ")]; break; }
    }
  }
  let district = null;
  const places = [];
  for (const p of parts) { const d = findDistrict(p); if (d && !district) district = d; else places.push(p); }
  if (!places.length && district) places.push(district.name);
  const dCenter = district ? { lat: district.lat, lon: district.lon } : null;
  const dExtent = dCenter ? extentAround(dCenter, 45) : HR_BBOX;
  const dOpts = dCenter ? { near: dCenter, maxKm: 60 } : {};

  const specific = places[0];
  const anchorName = places.length > 1 ? places[places.length - 1] : null;

  // one place given (village/town/landmark, maybe with district)
  if (!anchorName) {
    const q1 = district ? `${specific}, ${district.name}` : specific;
    let res = rankAll(await search(q1, dExtent), specific, dOpts);
    if (!res.length && pin) res = rankAll(await search(`${specific} ${pin}`), specific, {});
    if (!res.length && district) res = rankAll(await search(district.name), district.name, {});
    return Object.assign(res.slice(0, 8), { note: res.length && res[0].sim < 0.75 ? "approx" : "" });
  }

  // anchor = town/village, then the specific landmark/colony near it
  const anchors = rankAll(await search(district ? `${anchorName}, ${district.name}` : anchorName, dExtent), anchorName, dOpts).filter((r) => r.kind !== "road" && r.sim >= 0.45);
  const anchor = anchors[0];
  if (!anchor) {
    const res = rankAll(await search(places.join(", ") + (district ? ", " + district.name : ""), dExtent), specific, dOpts);
    return Object.assign(res.slice(0, 8), { note: res.length ? "approx" : "" });
  }
  // a city spreads ~10 km, a village ~3 km: look for the landmark only that close to the anchor
  const bigTown = DISTRICTS.some((d) => similar(d.name, anchorName) > 0.8) || /city|nagar$/i.test(anchorName);
  const radius = bigTown ? 10 : 4;
  const nearRes = rankAll(await search(`${specific}, ${anchor.name || anchorName}`, extentAround(anchor, radius), anchor), specific, { near: anchor, maxKm: radius })
    .filter((r) => r.sim >= 0.5 && kmBetween(r, anchor) > 0.05);
  if (nearRes.length) return Object.assign([...nearRes.slice(0, 6), { ...anchor, fallback: true }], { note: "" });
  // the landmark/colony is in no database: show the town and let the farmer tap the field
  return Object.assign([{ ...anchor, fallback: true }, ...anchors.slice(1, 3)], { note: "notExact", missing: specific, anchorLabel: anchor.label });
}

// Type-ahead suggestions (Esri). Only Haryana suggestions are kept.
export async function suggest(text) {
  if (!text || text.trim().length < 3 || parseCoordinates(text)) return [];
  const { parts } = cleanAddress(text);
  const qtext = parts.join(", ") || text;
  const u = `${ESRI_GEO}/suggest?f=json&text=${encodeURIComponent(hasDevanagari(qtext) ? parts.map(transliterate).join(", ") : qtext)}&countryCode=IND&searchExtent=${HR_BBOX}&maxSuggestions=8`;
  const j = await getJSON(u, {}, 8000);
  return (j.suggestions || []).filter((s) => /haryana|हरियाणा/i.test(s.text)).slice(0, 6);
}
export async function resolveSuggestion(s) {
  const u = `${ESRI_GEO}/findAddressCandidates?f=json&singleLine=${encodeURIComponent(s.text)}&magicKey=${encodeURIComponent(s.magicKey)}&outFields=Addr_type&forStorage=false`;
  const j = await getJSON(u, {}, 10000);
  const c = (j.candidates || [])[0];
  return c ? { label: c.address, lat: c.location.y, lon: c.location.x, score: c.score, kind: KIND[c.attributes.Addr_type] || "place", src: "Esri" } : null;
}

// Name of the nearest village / locality for a tapped point
export async function reverseGeocode(lat, lon) {
  try {
    const j = await getJSON(`${ESRI_GEO}/reverseGeocode?f=json&location=${lon},${lat}&featureTypes=Locality,PointAddress,StreetAddress&forStorage=false`, {}, 8000);
    if (j.address) return [j.address.Neighborhood, j.address.City || j.address.District, j.address.Subregion].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
  } catch {}
  try {
    const j = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=${lat}&lon=${lon}`, {}, 8000);
    const a = j.address || {};
    return [a.village || a.hamlet || a.town || a.suburb || a.city, a.county || a.state_district].filter(Boolean).join(", ");
  } catch {}
  return "";
}
