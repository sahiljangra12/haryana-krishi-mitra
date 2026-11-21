// Remote-sensing layers: recent Sentinel-2 imagery (Microsoft Planetary Computer) and NASA daily layers (GIBS).
// Nothing here needs a key. All endpoints were checked to answer cross-origin requests from the browser.

const PC = "https://planetarycomputer.microsoft.com/api";
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const HR = [[[74.4, 27.6], [77.6, 27.6], [77.6, 31.0], [74.4, 31.0], [74.4, 27.6]]];

async function json(url, opts = {}, ms = 20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: c.signal });
    if (!r.ok) throw new Error(r.status + " " + r.statusText);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ---------- Sentinel-2 band combinations ----------
   Processing baseline 04.00+ adds 1000 to every band, so ratios subtract 2000 in the denominator.
   Mosaics mix baselines; recent Haryana scenes are all >= 05.x, so the offset version is used. */
export const VIEWS = {
  true: { q: "assets=visual&asset_bidx=visual%7C1,2,3&nodata=0", en: "True colour", hi: "असली रंग" },
  ndvi: { q: `expression=${encodeURIComponent("(B08-B04)/(B08+B04-2000)")}&asset_as_band=true&rescale=-0.1,0.9&colormap_name=rdylgn&nodata=0`, en: "Crop health (NDVI)", hi: "फसल सेहत (NDVI)" },
  false: { q: "assets=B08&assets=B04&assets=B03&nodata=0&rescale=1000,5000&color_formula=" + encodeURIComponent("gamma RGB 1.3"), en: "False colour (crops red)", hi: "फ़ॉल्स कलर (फसल लाल)" },
  ndmi: { q: `expression=${encodeURIComponent("(B8A-B11)/(B8A+B11-2000)")}&asset_as_band=true&rescale=-0.4,0.5&colormap_name=rdbu&nodata=0`, en: "Water stress (NDMI)", hi: "पानी तनाव (NDMI)" },
};

// A "latest" mosaic: every Sentinel-2 scene over Haryana in the last N days, least cloudy on top.
export async function latestMosaic(days = 30, maxCloud = 20) {
  const key = `km-mosaic-${days}-${maxCloud}`;
  try {
    const c = JSON.parse(sessionStorage.getItem(key) || "null");
    if (c && Date.now() - c.at < 6 * 3600e3) return c;
  } catch {}
  const end = new Date(), start = new Date(Date.now() - days * 864e5);
  const body = {
    collections: ["sentinel-2-l2a"],
    "filter-lang": "cql2-json",
    filter: { op: "and", args: [
      { op: "s_intersects", args: [{ property: "geometry" }, { type: "Polygon", coordinates: HR }] },
      { op: "anyinteracts", args: [{ property: "datetime" }, { interval: [start.toISOString(), end.toISOString()] }] },
      { op: "<=", args: [{ property: "eo:cloud_cover" }, maxCloud] },
    ] },
    sortby: [{ field: "eo:cloud_cover", direction: "asc" }],
  };
  const j = await json(`${PC}/data/v1/mosaic/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = { sid: j.searchid || j.id, from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), at: Date.now() };
  try { sessionStorage.setItem(key, JSON.stringify(out)); } catch {}
  return out;
}
export const mosaicTiles = (sid, view = "true") =>
  `${PC}/data/v1/mosaic/${sid}/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&${VIEWS[view].q}&format=png`;
export const sceneTiles = (itemId, view = "true") =>
  `${PC}/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&item=${encodeURIComponent(itemId)}&${VIEWS[view].q}&format=png`;
// A picture of one area from one scene (lon/lat box), for the hero and the field snapshot
export const sceneImage = (itemId, [w, s, e, n], width, height, view = "true") =>
  `${PC}/data/v1/item/bbox/${w},${s},${e},${n}/${width}x${height}.jpg?collection=sentinel-2-l2a&item=${encodeURIComponent(itemId)}&${VIEWS[view].q}`;

// Clear Sentinel-2 passes over a point, newest first, one per day
export async function scenesAt(lat, lon, days = 120, maxCloud = 40) {
  const end = new Date(), start = new Date(Date.now() - days * 864e5);
  const j = await json(`${PC}/stac/v1/search`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collections: ["sentinel-2-l2a"], intersects: { type: "Point", coordinates: [lon, lat] }, datetime: `${start.toISOString()}/${end.toISOString()}`, query: { "eo:cloud_cover": { lt: maxCloud } }, limit: 100, sortby: [{ field: "datetime", direction: "desc" }] }),
  });
  const byDay = new Map();
  for (const f of j.features || []) {
    const d = f.properties.datetime.slice(0, 10);
    const prev = byDay.get(d);
    if (!prev || f.properties["eo:cloud_cover"] < prev.properties["eo:cloud_cover"]) byDay.set(d, f);
  }
  return [...byDay.values()].map((f) => ({ id: f.id, date: f.properties.datetime, cloud: f.properties["eo:cloud_cover"], platform: f.properties.platform || f.id.slice(0, 3) }));
}

/* ---------- NASA GIBS daily layers ---------- */
export const NASA = {
  modis: { id: "MODIS_Terra_CorrectedReflectance_TrueColor", lvl: 9, ext: "jpg", en: "NASA daily true colour (MODIS Terra, 250 m)", hi: "NASA दैनिक असली रंग (MODIS, 250 मी.)" },
  noaa20: { id: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", lvl: 9, ext: "jpg", en: "NASA daily true colour (VIIRS NOAA-20)", hi: "NASA दैनिक असली रंग (VIIRS)" },
  fires: { id: "VIIRS_NOAA20_Thermal_Anomalies_375m_All", lvl: 8, ext: "mvt", vector: true, en: "Fires / stubble burning (VIIRS 375 m)", hi: "आग / पराली जलाना (VIIRS 375 मी.)", legend: "fire" },
  ndvi8: { id: "VIIRS_NOAA20_NDVI_8Day", lvl: 8, ext: "png", period: 8, en: "Crop greenness, 8-day (VIIRS NDVI)", hi: "फसल हरियाली, 8 दिन (VIIRS NDVI)", legend: "ndvi" },
  lst: { id: "MODIS_Terra_Land_Surface_Temp_Day", lvl: 7, ext: "png", en: "Land surface temperature, day (MODIS)", hi: "ज़मीन का तापमान, दिन (MODIS)", legend: "temp" },
  soil: { id: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", lvl: 6, ext: "png", lag: 3, en: "Root-zone soil moisture (NASA SMAP)", hi: "जड़ क्षेत्र मिट्टी की नमी (NASA SMAP)", legend: "moist" },
  rain: { id: "IMERG_Precipitation_Rate", lvl: 6, ext: "png", lag: 1, en: "Rainfall (NASA GPM IMERG)", hi: "बारिश (NASA GPM IMERG)", legend: "rain" },
};
export const gibsTiles = (key, date) => {
  const L = NASA[key];
  return `${GIBS}/${L.id}/default/${date}/GoogleMapsCompatible_Level${L.lvl}/{z}/{y}/{x}.${L.ext}`;
};
// Products arrive with a delay: use the newest date that should exist
export function nasaDate(key, chosen) {
  const L = NASA[key];
  const d = new Date(chosen + "T00:00:00Z");
  if (L.lag) {
    const latest = new Date(Date.now() - L.lag * 864e5);
    if (d > latest) d.setTime(latest.getTime());
  }
  return d.toISOString().slice(0, 10);
}

// VectorGrid (for NASA fire points) loads only when the fire layer is first switched on
let vgP = null;
export function loadVectorGrid() {
  if (window.L?.vectorGrid) return Promise.resolve();
  if (!vgP) vgP = new Promise((res, rej) => {
    // VectorGrid predates Leaflet 1.8, which renamed this helper
    if (!L.DomEvent.fakeStop) L.DomEvent.fakeStop = L.DomEvent._fakeStop || function () { return true; };
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.bundled.min.js";
    s.onload = () => res(); s.onerror = () => rej(new Error("Could not load fire layer"));
    document.head.appendChild(s);
  });
  return vgP;
}

export const LEGENDS = {
  ndvi: { ramp: "linear-gradient(90deg,#a50026,#f46d43,#fee08b,#a6d96a,#1a9850,#006837)", lo: { en: "Bare", hi: "खाली" }, hi_: { en: "Dense crop", hi: "घनी फसल" } },
  ndmi: { ramp: "linear-gradient(90deg,#b2182b,#ef8a62,#fddbc7,#d1e5f0,#67a9cf,#2166ac)", lo: { en: "Dry", hi: "सूखा" }, hi_: { en: "Moist", hi: "नम" } },
  temp: { ramp: "linear-gradient(90deg,#2c7bb6,#abd9e9,#ffffbf,#fdae61,#d7191c)", lo: { en: "Cool", hi: "ठंडा" }, hi_: { en: "Hot", hi: "गर्म" } },
  moist: { ramp: "linear-gradient(90deg,#8c510a,#d8b365,#f6e8c3,#c7eae5,#5ab4ac,#01665e)", lo: { en: "Dry", hi: "सूखी" }, hi_: { en: "Wet", hi: "गीली" } },
  rain: { ramp: "linear-gradient(90deg,#c6dbef,#6baed6,#2171b5,#08306b,#7a0177)", lo: { en: "Light", hi: "हल्की" }, hi_: { en: "Heavy", hi: "भारी" } },
  fire: { ramp: "linear-gradient(90deg,#ff3b1f,#ff3b1f)", lo: { en: "Fire detected by satellite", hi: "सैटेलाइट ने आग देखी" }, hi_: { en: "", hi: "" } },
};
