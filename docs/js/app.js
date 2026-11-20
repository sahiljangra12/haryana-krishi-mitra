import { t, getLang, setLang, rupee } from "./i18n.js?v=202611200102";
import { CROPS, SEASONS, COST_LABELS, MSP_SOURCE } from "./crops.js?v=202611200102";
import { DISTRICTS, nearestDistrict, HARYANA_BBOX } from "./districts.js?v=202611200102";
import * as src from "./sources.js?v=202611200102";
import { recommend, upcomingSeason, weatherAlerts, interpretSeries, uniformity, livePrice } from "./advisor.js?v=202611200102";
import * as card from "./soilcard.js?v=202611200102";
import { TECHNIQUES, CATEGORIES, relevantTechniques } from "./techniques.js?v=202611200102";
import { PHOTOS, CROP_PHOTO, TECH_PHOTO } from "./images.js?v=202611200102";
import { exposures, scenarios, MARKET, HAZARD_LABEL, INCENTIVE_LABEL } from "./risk.js?v=202611200102";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const L_ = (o) => (getLang() === "hi" ? o.hi : o.en);
const ic = (name, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
// circular match meter for crop cards
const meter = (score) => {
  const r = 26, c = 2 * Math.PI * r, f = Math.max(0, Math.min(100, score)) / 100;
  return `<svg class="meter" viewBox="0 0 64 64" role="img" aria-label="${score}/100"><circle cx="32" cy="32" r="${r}" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.25)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="#f0be1e" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle">${score}</text></svg>`;
};

const state = {
  point: null, vertices: [], drawing: false, feature: null, areaAcres: null,
  district: DISTRICTS.find((d) => d.name === "Karnal"),
  report: null, prices: null, forecast: null, forecastFor: null,
  season: upcomingSeason(),
  card: (() => { try { return JSON.parse(localStorage.getItem("km-card") || "{}"); } catch { return {}; } })(),
  opts: { leavingPaddy: false, dsr: false, straw: false },
  techFocus: null,
};

/* ---------------- i18n paint ---------------- */
function paintStatic() {
  document.documentElement.lang = getLang();
  $$("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  $$("[data-tph]").forEach((el) => (el.placeholder = t(el.dataset.tph)));
  $$(".lang button").forEach((b) => b.classList.toggle("on", b.dataset.lang === getLang()));
  fillSelects();
}
function fillSelects() {
  const dOpts = DISTRICTS.map((d) => `<option value="${d.name}">${getLang() === "hi" ? d.hi : d.name}</option>`).join("");
  for (const id of ["districtSel", "weatherDistrict"]) { const s = $("#" + id); s.innerHTML = dOpts; s.value = state.district.name; }
  const pd = $("#priceDistrict"); const keep = pd.value;
  pd.innerHTML = `<option value="">${t("all")}</option>` + dOpts; pd.value = keep || "";
  const ss = $("#seasonSel");
  ss.innerHTML = Object.entries(SEASONS).map(([k, v]) => `<option value="${k}">${L_(v)}</option>`).join("");
  ss.value = state.season;
  const pc = $("#priceCrop"); const keepC = pc.value;
  pc.innerHTML = `<option value="">${t("all")}</option>` + CROPS.filter((c, i, a) => a.findIndex((x) => x.agmark.source === c.agmark.source) === i).map((c) => `<option value="${c.id}">${L_(c)}</option>`).join("");
  pc.value = keepC || "";
}

/* ---------------- live prices arriving later ---------------- */
let watching = false;
function watchLivePrices() {
  if (watching || !state.prices?.livePromise) return;
  watching = true;
  state.prices.livePromise.then((ok) => {
    if (!ok) return;
    const active = $(".tab.active")?.dataset.tab;
    if (active === "advice") renderAdvice();
    if (active === "prices") renderPrices();
  });
}

/* ---------------- tabs ---------------- */
function showTab(name) {
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  $("#hero").classList.toggle("hidden", name !== "land");
  if (name === "land") setTimeout(() => map.invalidateSize(), 50);
  if (name === "advice") renderAdvice();
  if (name === "prices") renderPrices();
  if (name === "weather") renderWeather();
  if (name === "about") renderAbout();
  if (name === "soilcard") renderCard();
  if (name === "techniques") renderTechniques();
  try { history.replaceState(null, "", "#" + name); } catch {}
}

/* ---------------- map ---------------- */
const map = L.map("map", { zoomControl: true }).setView([29.1, 76.4], 8);
const esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" }).addTo(map);
const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }).addTo(map);
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
L.control.layers({ Satellite: esri, "Street map": osm }, { Labels: labels }, { position: "topright" }).addTo(map);
let marker = null, poly = null, square = null, overlay = null;
const vertexLayer = L.layerGroup().addTo(map);

map.on("click", (e) => {
  if (state.drawing) {
    state.vertices.push([e.latlng.lat, e.latlng.lng]);
    L.circleMarker(e.latlng, { radius: 5, color: "#ffd54f", weight: 2, fillOpacity: 1 }).addTo(vertexLayer);
    if (poly) map.removeLayer(poly);
    poly = L.polygon(state.vertices, { color: "#ffd54f", weight: 3, fillOpacity: 0.1 }).addTo(map);
    $("#doneBtn").disabled = state.vertices.length < 3;
    return;
  }
  setPoint(e.latlng.lat, e.latlng.lng, false);
});

function setPoint(lat, lon, fly = true) {
  clearShape();
  state.point = [lat, lon];
  marker = L.marker([lat, lon]).addTo(map);
  drawSquare();
  if (fly) map.setView([lat, lon], 16);
  state.district = nearestDistrict(lat, lon);
  fillSelects();
  checkInside(lat, lon);
}
function drawSquare() {
  if (square) map.removeLayer(square);
  if (!state.point || state.vertices.length >= 3) return;
  const acres = +$("#acres").value || 2;
  const half = Math.sqrt(acres * 4046.86) / 2;
  const f = src.squareFeature(state.point[0], state.point[1], half);
  square = L.geoJSON(f, { style: { color: "#ffd54f", weight: 2, dashArray: "6 4", fillOpacity: 0.08 } }).addTo(map);
}
function clearShape() {
  [marker, poly, square].forEach((l) => l && map.removeLayer(l));
  marker = poly = square = null;
  vertexLayer.clearLayers();
  state.vertices = []; state.point = null; state.feature = null;
}
function checkInside(lat, lon) {
  const b = HARYANA_BBOX;
  $("#msg").textContent = lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon ? t("outside") : "";
}

$("#drawBtn").onclick = () => {
  clearShape();
  state.drawing = true;
  $("#drawBtn").classList.add("on");
  map.getContainer().style.cursor = "crosshair";
};
$("#doneBtn").onclick = () => {
  state.drawing = false;
  $("#drawBtn").classList.remove("on");
  $("#doneBtn").disabled = true;
  map.getContainer().style.cursor = "";
  if (state.vertices.length >= 3) {
    const c = poly.getBounds().getCenter();
    state.point = [c.lat, c.lng];
    state.district = nearestDistrict(c.lat, c.lng);
    fillSelects();
    checkInside(c.lat, c.lng);
  }
};
$("#clearBtn").onclick = () => { clearShape(); state.drawing = false; $("#drawBtn").classList.remove("on"); };
$("#acres").oninput = drawSquare;

$("#searchForm").onsubmit = async (e) => {
  e.preventDefault();
  const q = $("#q").value.trim();
  if (!q) return;
  const box = $("#searchResults");
  box.textContent = "…";
  try {
    const r = await src.geocode(q);
    box.innerHTML = r.length ? r.map((p, i) => `<button type="button" data-i="${i}">${esc(p.display_name)}</button>`).join("") : "—";
    $$("button", box).forEach((b) => (b.onclick = () => { const p = r[+b.dataset.i]; map.setView([+p.lat, +p.lon], 15); box.innerHTML = ""; }));
  } catch (err) { box.textContent = t("error") + ": " + err.message; }
};
$("#locBtn").onclick = () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((p) => setPoint(p.coords.latitude, p.coords.longitude), (e) => ($("#msg").textContent = e.message), { enableHighAccuracy: true, timeout: 15000 });
};

function currentFeature() {
  if (state.vertices.length >= 3) {
    const ring = state.vertices.map(([a, b]) => [b, a]);
    ring.push(ring[0]);
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
  }
  if (!state.point) return null;
  const acres = +$("#acres").value || 2;
  return src.squareFeature(state.point[0], state.point[1], Math.sqrt(acres * 4046.86) / 2);
}
function areaAcres(feature) {
  const ring = feature.geometry.coordinates[0];
  const lat0 = ring[0][1] * Math.PI / 180;
  const R = 6378137;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = [ring[i][0] * Math.PI / 180 * R * Math.cos(lat0), ring[i][1] * Math.PI / 180 * R];
    const [x2, y2] = [ring[i + 1][0] * Math.PI / 180 * R * Math.cos(lat0), ring[i + 1][1] * Math.PI / 180 * R];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2) / 4046.86;
}

/* ---------------- overlays ---------------- */
$$('input[name="layer"]').forEach((r) => (r.onchange = setOverlay));
function setOverlay() {
  const v = $('input[name="layer"]:checked').value;
  if (overlay) map.removeLayer(overlay);
  overlay = null;
  $("#ndviLegend").classList.toggle("hidden", v !== "ndvi");
  const item = state.report?.latestItem;
  if (!item || v === "none") return;
  const url = v === "ndvi" ? src.ndviTileUrl(item) : src.trueColorTileUrl(item);
  overlay = L.tileLayer(url, { opacity: v === "ndvi" ? 0.75 : 1, maxZoom: 19, maxNativeZoom: 15, attribution: "Copernicus Sentinel-2 / Microsoft Planetary Computer" }).addTo(map);
  [poly, square].forEach((l) => l && l.bringToFront());
}

/* ---------------- analysis ---------------- */
function progress(done, total, label) {
  const p = $("#progress");
  p.classList.remove("hidden");
  $(".bar", p).style.width = total ? `${(100 * done) / total}%` : "8%";
  $(".ptext", p).textContent = label || `${t("working")} ${done}/${total}`;
}

$("#analyseBtn").onclick = async () => {
  const feature = currentFeature();
  if (!feature) { $("#msg").textContent = t("pickFirst"); return; }
  if (state.drawing) $("#doneBtn").click();
  $("#msg").textContent = "";
  $("#analyseBtn").disabled = true;
  state.feature = feature;
  state.areaAcres = areaAcres(feature);
  const [lat, lon] = state.point;
  progress(0, 0, t("working"));

  const tasks = {
    sat: src.fieldTimeSeries(feature, (d, n) => progress(d, n)),
    soil: src.soilProfile(lat, lon),
    climate: src.climateHistory(lat, lon),
    fc: src.forecast(lat, lon),
    prices: src.mandiPrices(),
  };
  const keys = Object.keys(tasks);
  const settled = await Promise.allSettled(Object.values(tasks));
  const R = {};
  settled.forEach((s, i) => (R[keys[i]] = s.status === "fulfilled" ? s.value : { error: s.reason?.message || String(s.reason) }));

  const series = R.sat?.series || [];
  const latest = series[series.length - 1];
  let neighbour = null;
  if (latest) { try { neighbour = await src.neighbourhoodNdvi(latest.item, lat, lon, 1000); } catch {} }

  state.report = { lat, lon, series, scenesFound: R.sat?.scenesFound, satError: R.sat?.error, soil: R.soil?.error ? null : R.soil, soilError: R.soil?.error, climate: R.climate?.error ? null : R.climate, latestItem: latest?.item, neighbour, at: new Date() };
  if (!R.fc?.error) { state.forecast = R.fc; state.forecastFor = { lat, lon, label: L_(state.district) }; }
  if (!R.prices?.error) { state.prices = R.prices; watchLivePrices(); }

  $$('input[name="layer"]').forEach((r) => (r.disabled = r.value !== "none" && !latest));
  if (latest) { $('input[name="layer"][value="ndvi"]').checked = true; setOverlay(); }
  $("#progress").classList.add("hidden");
  $("#analyseBtn").disabled = false;
  renderReport();
  $("#report").scrollIntoView({ behavior: "smooth" });
};

let ndviChart = null;
function renderReport() {
  const r = state.report;
  if (!r) return;
  const el = $("#report");
  el.classList.remove("hidden");
  const lang = getLang();
  const latest = r.series[r.series.length - 1];
  const notes = interpretSeries(r.series, lang);
  const uni = uniformity(latest, lang);
  if (uni) notes.push(uni);
  const s = r.soil;
  const diff = latest && r.neighbour != null ? latest.ndvi - r.neighbour : null;
  const ndviWord = (v) => (v < 0.2 ? (lang === "hi" ? "खाली या अभी बोया गया" : "Bare or just sown") : v < 0.4 ? (lang === "hi" ? "कम हरियाली" : "Low cover") : v < 0.6 ? (lang === "hi" ? "मध्यम हरियाली" : "Moderate cover") : lang === "hi" ? "घनी, स्वस्थ फसल" : "Dense, healthy crop");
  const pos = (v) => `${Math.max(0, Math.min(100, ((v + 0.1) / 1.0) * 100))}%`;
  // satellite snapshot with the field boundary drawn on top, in Web Mercator so the outline lines up exactly
  let snap = "", outline = "";
  if (state.feature) {
    const R = 6378137, mx = (lon) => (R * lon * Math.PI) / 180, my = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const ring = state.feature.geometry.coordinates[0].map(([x, y]) => [mx(x), my(y)]);
    const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const W = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.2, 350) * 3.2, H = W / 1.2;
    const x0 = cx - W / 2, x1 = cx + W / 2, y0 = cy - H / 2, y1 = cy + H / 2;
    snap = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${x0},${y0},${x1},${y1}&bboxSR=3857&imageSR=3857&size=600,500&format=jpg&f=image`;
    const pts = ring.map(([x, y]) => `${(((x - x0) / W) * 600).toFixed(1)},${(((y1 - y) / H) * 500).toFixed(1)}`).join(" ");
    outline = `<svg viewBox="0 0 600 500" preserveAspectRatio="none" aria-hidden="true"><polygon points="${pts}" fill="rgba(240,190,30,0.12)" stroke="#f0be1e" stroke-width="3"/></svg>`;
  }
  el.innerHTML = `
    <div class="card">
      <div class="section-head" style="margin-top:0">
        <div><h2>${t("tabLand")}: ${esc(L_(state.district))}</h2><p class="hint">${r.lat.toFixed(4)}, ${r.lon.toFixed(4)}</p></div>
        <button class="btn line noprint" id="printBtn">${ic("printer")}${t("printReport")}</button>
      </div>
      <div class="report-head">
        ${snap ? `<div class="snapwrap"><img class="snap" src="${snap}" alt="${esc(t("fieldFromSky"))}" title="${esc(t("fieldFromSky"))}">${outline}</div>` : ""}
        <div class="kpis">
          <div class="kpi gold"><div class="l">${ic("scale")}${t("area")}</div><div class="v">${state.areaAcres.toFixed(2)}</div><div class="s">${t("acres")}, ${(state.areaAcres * 0.4047).toFixed(2)} ha</div></div>
          <div class="kpi"><div class="l">${ic("leaf")}${t("ndviNow")}</div><div class="v">${latest ? latest.ndvi.toFixed(2) : "-"}</div>
            ${latest ? `<div class="ndvi-scale"><i style="left:${pos(latest.ndvi)}"></i></div><div class="s">${ndviWord(latest.ndvi)}, ${latest.date}</div>` : `<div class="s">${esc(r.satError || t("cloudy"))}</div>`}</div>
          <div class="kpi water"><div class="l">${ic("droplets")}${t("ndmiNow")}</div><div class="v">${latest?.ndmi != null ? latest.ndmi.toFixed(2) : "-"}</div><div class="s">${lang === "hi" ? "-1 सूखा, +1 नम" : "-1 dry, +1 moist"}</div></div>
          <div class="kpi"><div class="l">${ic("chart-column")}${t("vsNeighbours")}</div><div class="v ${diff == null ? "" : diff >= 0 ? "pos" : "neg"}">${diff == null ? "-" : (diff >= 0 ? "+" : "") + diff.toFixed(2)}</div><div class="s">${r.neighbour != null ? (lang === "hi" ? "आसपास का NDVI " : "Area NDVI ") + r.neighbour.toFixed(2) : ""}</div></div>
          <div class="kpi water"><div class="l">${ic("cloud-rain")}${t("annualRain")}</div><div class="v">${r.climate ? Math.round(r.climate.annualRain) : "-"}</div><div class="s">${lang === "hi" ? "मि.मी. प्रति वर्ष" : "mm per year"}</div></div>
        </div>
      </div>
    </div>
    <div class="card">
      <h2>${t("findings")}</h2>
      ${notes.length ? notes.map((n) => `<div class="finding">${ic("satellite")}<span>${esc(n)}</span></div>`).join("") : `<p class="hint">${t("cloudy")}</p>`}
      <h3 style="margin-top:1.2rem">${t("history")}</h3>
      <canvas id="ndviChart" height="100"></canvas>
      <p class="hint">${lang === "hi" ? `${r.series.length} साफ़ सैटेलाइट चित्र (Sentinel-2) पढ़े गए, कुल ${r.scenesFound ?? 0} उपलब्ध।` : `${r.series.length} clear Sentinel-2 images read out of ${r.scenesFound ?? 0} available.`}</p>
    </div>
    <div class="card">
      <h2>${t("soil")}</h2>
      ${s ? `<div class="soilgrid">
        <div><div class="l">${t("texture")}</div><b>${esc(s.texture)}</b></div>
        <div><div class="l">${t("ph")}</div><b>${s.phh2o?.toFixed(1) ?? "-"}</b><span class="s">${s.phh2o > 8.5 ? (lang === "hi" ? "क्षारीय, जिप्सम की ज़रूरत हो सकती है" : "Alkaline, may need gypsum") : s.phh2o < 6.5 ? (lang === "hi" ? "अम्लीय" : "Acidic") : lang === "hi" ? "सामान्य" : "Normal"}</span></div>
        <div><div class="l">${t("clay")}</div><b>${[s.clay, s.sand, s.silt].map((v) => (v == null ? "-" : Math.round(v) + "%")).join(" / ")}</b></div>
        <div><div class="l">${t("soc")}</div><b>${s.soc != null ? (s.soc / 10).toFixed(2) + "%" : "-"}</b><span class="s">${s.soc != null ? (s.soc / 10 < 0.4 ? (lang === "hi" ? "कम, गोबर या हरी खाद डालें" : "Low, add manure or green manure") : s.soc / 10 < 0.75 ? (lang === "hi" ? "मध्यम" : "Medium") : lang === "hi" ? "अच्छा" : "Good") : ""}</span></div>
        <div><div class="l">${t("nitrogen")}</div><b>${s.nitrogen != null ? s.nitrogen.toFixed(2) + " g/kg" : "-"}</b></div>
        <div><div class="l">${t("cec")}</div><b>${s.cec != null ? s.cec.toFixed(1) + " cmol/kg" : "-"}</b></div>
      </div>` : `<p class="hint">${t("error")}: ${esc(r.soilError || "")}</p>`}
      <p class="hint" style="margin-top:0.8rem">${t("soilTip")}</p>
      ${r.climate ? `<h3 style="margin-top:1.2rem">${t("climate")}</h3><canvas id="climChart" height="90"></canvas>` : ""}
    </div>
    <div class="row wrap noprint" style="margin-bottom:1rem">
      <button class="btn" id="toAdvice">${ic("sprout")}${t("goAdvice")}</button>
      <button class="btn mustard" id="toCard">${ic("flask-conical")}${t("goCard")}</button>
      <button class="btn ghost" id="toTech">${ic("book-open-text")}${t("goTech")}</button>
    </div>`;

  $("#printBtn").onclick = () => window.print();
  $("#toAdvice").onclick = () => showTab("advice");
  $("#toCard").onclick = () => showTab("soilcard");
  $("#toTech").onclick = () => { state.techCat = "star"; showTab("techniques"); };

  if (ndviChart) ndviChart.destroy();
  if (r.series.length) {
    ndviChart = new Chart($("#ndviChart"), {
      type: "line",
      data: {
        labels: r.series.map((x) => x.date),
        datasets: [
          { label: lang === "hi" ? "हरियाली (NDVI)" : "Greenness (NDVI)", data: r.series.map((x) => x.ndvi), borderColor: "#2f6b3a", backgroundColor: "rgba(47,107,58,0.14)", fill: true, tension: 0.3, pointRadius: 2 },
          { label: lang === "hi" ? "नमी (NDMI)" : "Moisture (NDMI)", data: r.series.map((x) => x.ndmi), borderColor: "#2d6e8e", borderDash: [5, 4], tension: 0.3, pointRadius: 0 },
        ],
      },
      options: { scales: { y: { min: -0.3, max: 1 } }, plugins: { legend: { position: "bottom" } } },
    });
  }
  if (r.climate) {
    const months = lang === "hi" ? ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    new Chart($("#climChart"), {
      data: {
        labels: months,
        datasets: [
          { type: "bar", label: (lang === "hi" ? "बारिश" : "Rain") + " (mm)", data: r.climate.monthly.map((m) => m.rain), backgroundColor: "rgba(45,110,142,0.45)", yAxisID: "y" },
          { type: "line", label: lang === "hi" ? "सबसे गर्म दिन °C" : "Hottest day °C", data: r.climate.monthly.map((m) => m.tmax), borderColor: "#b3412e", yAxisID: "y1" },
          { type: "line", label: lang === "hi" ? "सबसे ठंडी रात °C" : "Coldest night °C", data: r.climate.monthly.map((m) => m.tmin), borderColor: "#2d6e8e", yAxisID: "y1" },
        ],
      },
      options: { scales: { y: { position: "left", title: { display: true, text: "mm" } }, y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "°C" } } }, plugins: { legend: { position: "bottom" } } },
    });
  }
}

/* ---------------- advice ---------------- */
$("#seasonSel").onchange = (e) => { state.season = e.target.value; renderAdvice(); };
$("#districtSel").onchange = (e) => { state.district = DISTRICTS.find((d) => d.name === e.target.value); renderAdvice(); };
for (const [id, k] of [["optPaddy", "leavingPaddy"], ["optDsr", "dsr"], ["optStraw", "straw"]]) {
  $("#" + id).onchange = (e) => { state.opts[k] = e.target.checked; renderAdvice(); };
}

function adviceSoil() {
  const base = state.report?.soil || null;
  return state.card && Object.keys(state.card).length ? card.cardToSoil(state.card, base || {}) : base;
}

let compareChart = null;
const whatIf = {}; // crop id -> {yield, price, cost}

async function renderAdvice() {
  if (!state.prices) { try { state.prices = await src.mandiPrices(); watchLivePrices(); } catch {} }
  const lang = getLang();
  const r = state.report;
  const soil = adviceSoil();
  const latest = r?.series?.[r.series.length - 1];
  const acres = state.areaAcres || +$("#acres").value || 1;
  const chips = [L_(state.district)];
  if (soil?.texture) chips.push(soil.texture);
  if (soil?.phh2o) chips.push("pH " + soil.phh2o.toFixed(1));
  if (soil?.fromCard) chips.push(lang === "hi" ? "मृदा कार्ड जोड़ा गया" : "Soil card added");
  chips.push(acres.toFixed(2) + " " + t("acres"));
  $("#adviceNote").innerHTML = r || soil?.fromCard ? chips.map((c) => `<span>${esc(c)}</span>`).join("") : `<p class="hint" style="margin:0">${t("needReport")}</p>`;
  ["optPaddy", "optDsr", "optStraw"].forEach((id, i) => ($("#" + id).checked = !!state.opts[["leavingPaddy", "dsr", "straw"][i]]));

  const recs = recommend({
    season: state.season, district: state.district, soil, water: $("#water").value, risk: $("#risk").value,
    acres, prices: state.prices, ndmi: latest?.ndmi, annualRain: r?.climate?.annualRain,
  });
  const exp = exposures({ climate: r?.climate, forecast: state.forecast, soil, water: $("#water").value });
  const fertCostPerAcre = {};
  if (state.card && Object.keys(state.card).length) for (const x of recs) { const fp = card.fertilizerPlan(x.crop.id, state.card, 1); if (fp) fertCostPerAcre[x.crop.id] = fp.total; }
  const ctx = { acres, exposures: exp, opts: state.opts, fertCostPerAcre };
  recs.forEach((x) => (x.sc = scenarios(x, ctx, whatIf[x.crop.id])));

  const top = recs.slice(0, 7);
  if (compareChart) compareChart.destroy();
  compareChart = new Chart($("#compareChart"), {
    type: "bar",
    data: {
      labels: top.map((x) => L_(x.crop)),
      datasets: [
        { label: t("bad"), data: top.map((x) => Math.round(x.sc.bad)), backgroundColor: "#e5a596", borderRadius: 4 },
        { label: t("normal"), data: top.map((x) => Math.round(x.sc.normal)), backgroundColor: "#f0be1e", borderRadius: 4 },
        { label: t("good"), data: top.map((x) => Math.round(x.sc.good)), backgroundColor: "#2f6b3a", borderRadius: 4 },
      ],
    },
    options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${rupee(c.raw)}` } } }, scales: { y: { ticks: { callback: (v) => "₹" + (v / 1000).toFixed(0) + "k" } } } },
  });
  const safest = [...top].sort((a, b) => b.sc.bad - a.sc.bad)[0];
  const best = [...top].sort((a, b) => b.sc.expected - a.sc.expected)[0];
  $("#riskSummary").innerHTML = `
    <div>${ic("trending-up")}<span>${lang === "hi" ? "जोखिम-समायोजित सबसे ज़्यादा मुनाफ़ा" : "Highest risk-adjusted profit"}: <b>${esc(L_(best.crop))}</b>, ${rupee(best.sc.expected)}</span></div>
    <div>${ic("shield")}<span>${lang === "hi" ? "ख़राब साल में सबसे सुरक्षित" : "Safest in a bad year"}: <b>${esc(L_(safest.crop))}</b>, ${rupee(safest.sc.bad)}</span></div>
    <div>${ic("cloud-sun")}<span class="hint">${r?.climate ? t("climateBasis") : t("climateDefault")}</span></div>`;

  renderCalendar(top);

  const maxPart = { prof: 40, soilFit: 20, w: 25, zone: 10, risk: 5 };
  const partNames = { prof: "partProfit", soilFit: "partSoil", w: "partWater", zone: "partZone", risk: "partRisk" };
  const lvl = (v) => (v < 0.15 ? ["low", t("low_")] : v < 0.3 ? ["medium", t("med_")] : ["high", t("high_")]);
  $("#advice").innerHTML = `<div class="section-head"><h2>${t("topPicks")}: ${L_(SEASONS[state.season])}</h2></div>` + recs.map((x, i) => {
    const c = x.crop, b = x.budget, sc = x.sc;
    const liveTxt = x.live ? `${rupee(x.live.modal)}, ${x.live.scope === "district" ? L_(state.district) : "Haryana"}, ${x.live.date}` : (lang === "hi" ? "आज का भाव उपलब्ध नहीं" : "No live price today");
    const fp = state.card && Object.keys(state.card).length ? card.fertilizerPlan(c.id, state.card, acres) : null;
    const techs = TECHNIQUES.filter((tq) => tq.crops.includes(c.id)).slice(0, 4);
    const w = whatIf[c.id] || {};
    const yMax = Math.ceil(c.yield[1] * 1.5), pMax = Math.ceil((x.pp.price * 2) / 100) * 100, cMax = Math.ceil((c.cost[1] * 1.6) / 1000) * 1000;
    const photo = PHOTOS[CROP_PHOTO[c.id]];
    const [cl, cll] = lvl(sc.climate.score), [ml, mll] = lvl(sc.marketRisk);
    return `<article class="card crop" data-crop="${c.id}">
      <div class="photo" style="background-image:url('${photo?.src || ""}')" role="img" aria-label="${esc(photo?.title || L_(c))}">
        ${i === 0 ? `<span class="best">${ic("star")}${t("bestMatch")}</span>` : ""}
        <div class="cap"><div><div class="rank">${lang === "hi" ? "क्रम" : "Rank"} ${i + 1}</div><h3>${esc(L_(c))}</h3></div>${meter(x.score)}</div>
      </div>
      <div class="body">
        <div class="scen">
          <div class="bad">${t("bad")}<b class="${sc.bad >= 0 ? "" : "neg"}">${rupee(sc.bad)}</b></div>
          <div>${t("normal")}<b>${rupee(sc.normal)}</b></div>
          <div>${t("good")}<b class="pos">${rupee(sc.good)}</b></div>
          <div class="exp">${t("riskAdj")}<b>${rupee(sc.expected)}</b></div>
        </div>
        <div class="money">
          <div><div class="l">${t("totalCost")}</div><b>${rupee(sc.costMid * acres)}</b><div class="s">${rupee(sc.costMid)} ${t("perAcre")}</div></div>
          <div><div class="l">${t("priceUsed")}</div><b>${rupee(x.pp.price)} / q</b><div class="s">${t("basis_" + x.pp.basis)}${c.msp && x.pp.basis !== "msp" ? `, MSP ${rupee(c.msp)}` : ""}<br>${liveTxt}</div></div>
          <div><div class="l">${t("breakEven")}</div><b>${rupee(b.breakEven)} / q</b><div class="s">${t("breakEvenYield")}: ${Math.max(0, sc.breakEvenYield).toFixed(1)} q / ${t("acres")}</div></div>
          ${sc.incentives.perAcre ? `<div><div class="l">${t("incentiveIncl")}</div><b class="pos">${rupee(sc.incentives.perAcre * acres)}</b><div class="s">${sc.incentives.list.map((l) => esc(L_(INCENTIVE_LABEL[l.key])) + ": " + rupee(l.amount) + " / " + t("acres")).join("<br>")}</div></div>` : ""}
        </div>
        <div class="twocol">
          <div>
            <h4>${ic("cloud-lightning")}${t("climateRisk")} <span class="level ${cl}">${cll}</span></h4>
            <p class="hint" style="margin:0 0 0.4rem">${lang === "hi" ? "ख़राब साल में उपज हानि लगभग" : "Bad-year yield loss about"} ${Math.round(sc.climate.score * 100)}%</p>
            <div class="hz">${Object.entries(sc.climate.parts).filter(([, v]) => v > 0.01).map(([k, v]) => `<span>${L_(HAZARD_LABEL[k])}</span><div class="t"><div class="b" style="width:${Math.min(100, v * 160)}%"></div></div><span class="num">${Math.round(v * 100)}</span>`).join("")}</div>
          </div>
          <div>
            <h4>${ic("store")}${t("marketRisk")} <span class="level ${ml}">${mll}</span></h4>
            <p style="margin:0;font-size:0.94rem">${esc(L_(MARKET[c.id].demand))}</p>
          </div>
        </div>
        ${x.reasons.length ? `<div class="tags">${x.reasons.map((r) => `<span>${esc(t("r_" + r.k, { v: r.v }))}</span>`).join("")}</div>` : ""}
        <div class="facts"><div><b>${t("sowing")}:</b> ${esc(c.sowWindow)}</div><div><b>${t("varieties")}:</b> ${esc(c.varieties)}</div>${c.priceNote ? `<div><i>${esc(c.priceNote)}</i></div>` : ""}</div>
        <details class="whatif"><summary>${ic("sliders-horizontal")}${t("whatIf")}</summary>
          <div class="sl"><span>${t("yieldPA")}</span><input type="range" data-k="yield" min="0" max="${yMax}" step="0.5" value="${w.yield ?? sc.yMid}"><span class="num v-yield">${(w.yield ?? sc.yMid).toFixed(1)}</span></div>
          <div class="sl"><span>${t("pricePQ")}</span><input type="range" data-k="price" min="0" max="${pMax}" step="25" value="${w.price ?? sc.price}"><span class="num v-price">${rupee(w.price ?? sc.price)}</span></div>
          <div class="sl"><span>${t("costPA")}</span><input type="range" data-k="cost" min="0" max="${cMax}" step="500" value="${Math.round(w.cost ?? sc.costMid)}"><span class="num v-cost">${rupee(w.cost ?? sc.costMid)}</span></div>
          <div class="out">${t("profitIs")}, ${acres.toFixed(2)} ${t("acres")}: <span class="v-profit ${sc.normal >= 0 ? "pos" : "neg"}">${rupee(sc.normal)}</span><button class="btn line reset" type="button">${ic("rotate-ccw")}${t("reset")}</button></div>
        </details>
        <details ${i === 0 ? "open" : ""}><summary>${ic("triangle-alert")}${t("precautions")}</summary><ul class="notes">${L_(c.precautions).map((p) => `<li>${esc(p)}</li>`).join("")}</ul></details>
        ${fp ? `<details><summary>${ic("flask-conical")}${t("fertFromCard")}: ${rupee(fp.total)}</summary>${fertTable(fp)}</details>` : ""}
        <details><summary>${ic("indian-rupee")}${t("budgetSplit")}, ${acres.toFixed(2)} ${t("acres")}</summary>
          <div class="bars">${b.lines.map((l) => `<span>${L_(COST_LABELS[l.key])}</span><div class="t"><div class="b" style="width:${(100 * c.costSplit[l.key]) / 0.45}%"></div></div><span class="num">${rupee(l.key === "fertilizer" && fp ? fp.total : l.amount)}</span>`).join("")}</div>
        </details>
        <details><summary>${ic("chart-column")}${t("why")}</summary>
          <div class="bars">${Object.entries(x.parts).map(([k, v]) => `<span>${t(partNames[k])}</span><div class="t"><div class="b g" style="width:${(100 * Math.max(0, v)) / maxPart[k]}%"></div></div><span class="num">${Math.round(Math.max(0, v))} / ${maxPart[k]}</span>`).join("")}</div>
        </details>
        ${techs.length ? `<details><summary>${ic("play")}${t("learnMore")}</summary><div class="vids">${techs.map((tq) => { const p = PHOTOS[TECH_PHOTO[tq.id]]; return `<div class="v">${p ? `<img src="${p.src}" alt="" loading="lazy">` : `<div class="noimg cat-${tq.cat}" style="display:grid;place-items:center">${ic(CATEGORIES[tq.cat].icon, "lg")}</div>`}<div><b>${esc(L_(tq))}</b><div class="row wrap" style="margin-top:0.3rem"><a class="btn vbtn" href="${tq.video}" target="_blank" rel="noopener">${ic("play")}${t("watch")}</a><a class="btn line" href="#techniques" data-goto="${tq.id}">${t("howTo")}</a></div></div></div>`; }).join("")}</div></details>` : ""}
      </div>
    </article>`;
  }).join("");

  $$("#advice .crop").forEach((el) => {
    const id = el.dataset.crop;
    const row = recs.find((x) => x.crop.id === id);
    const upd = () => {
      const ov = {};
      $$("input[type=range]", el).forEach((s) => (ov[s.dataset.k] = +s.value));
      whatIf[id] = ov;
      const sc = scenarios(row, ctx, ov);
      $(".v-yield", el).textContent = ov.yield.toFixed(1);
      $(".v-price", el).textContent = rupee(ov.price);
      $(".v-cost", el).textContent = rupee(ov.cost);
      const out = $(".v-profit", el);
      out.textContent = rupee(sc.normal);
      out.className = "v-profit " + (sc.normal >= 0 ? "pos" : "neg");
    };
    $$("input[type=range]", el).forEach((s) => (s.oninput = upd));
    $(".reset", el).onclick = () => { delete whatIf[id]; renderAdvice(); };
  });
  $$("#advice [data-goto]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); state.techFocus = a.dataset.goto; showTab("techniques"); }));
}

function renderCalendar(rows) {
  const lang = getLang();
  const months = lang === "hi" ? ["ज", "फ", "मा", "अ", "म", "जू", "जु", "अ", "सि", "अ", "न", "दि"] : ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  let html = `<div></div>` + months.map((m) => `<div class="h">${m}</div>`).join("");
  for (const x of rows) {
    const c = x.crop;
    const sow = SEASONS[c.season].sow;
    const SOW_MONTH = { wheat: 11, mustard: 10, gram: 10, barley: 11, potato: 10, onion_rabi: 11, paddy: 6, basmati: 7, cotton: 4, bajra: 7, maize: 7, moong: 7, guar: 7, sugarcane: 2, moong_summer: 4 };
    const start = SOW_MONTH[c.id] ?? sow[Math.floor(sow.length / 2)];
    const months_ = Math.max(2, Math.round(c.duration / 30));
    const cells = Array(12).fill("");
    for (let k = 0; k <= months_; k++) {
      const m = (start - 1 + k) % 12;
      cells[m] = k === 0 ? "sow" : k === months_ ? "harv" : "grow";
    }
    html += `<div class="n">${esc(L_(c))}</div>` + cells.map((cl) => `<div class="c ${cl}"></div>`).join("");
  }
  $("#calendar").innerHTML = html + `</div>`;
  $("#calendar").insertAdjacentHTML("afterend", "");
  const legend = $("#calLegend") || Object.assign(document.createElement("div"), { id: "calLegend", className: "legendrow" });
  legend.innerHTML = `<span><i style="background:#c9a227"></i>${lang === "hi" ? "बुवाई" : "Sowing"}</span><span><i style="background:#8bc34a"></i>${lang === "hi" ? "बढ़वार" : "Growing"}</span><span><i style="background:#e65100"></i>${lang === "hi" ? "कटाई" : "Harvest"}</span>`;
  $("#calendar").after(legend);
}
$("#water").onchange = () => $("#tab-advice").classList.contains("active") && renderAdvice();
$("#risk").onchange = $("#water").onchange;

/* ---------------- soil health card ---------------- */
function fertTable(fp) {
  const lang = getLang();
  const diff = fp.generalCost - fp.total;
  const bags = (n) => { const full = Math.floor(n), half = n - full >= 0.25; return `<span class="bagrow">${"<i></i>".repeat(Math.min(full, 30))}${half ? '<i class="half"></i>' : ""}</span>`; };
  return `<div class="tablewrap"><table><tr><th>${t("product")}</th><th class="num">${t("qty")}</th><th>${t("bags")}</th><th class="num">${t("cost")}</th></tr>` +
    fp.items.map((it) => `<tr><td>${L_(card.FERT[it.f])}</td><td class="num">${Math.round(it.kg)} kg</td><td>${bags(it.bags)} ${it.bags.toFixed(1)}</td><td class="num">${rupee(it.cost)}</td></tr>`).join("") +
    `<tr><th>${lang === "hi" ? "कुल" : "Total"}</th><td></td><td></td><th class="num">${rupee(fp.total)}</th></tr></table></div>
    <p class="hint">${t("nutrientNeed")}: N ${Math.round(fp.N)} kg, P₂O₅ ${Math.round(fp.P2O5)} kg, K₂O ${Math.round(fp.K2O)} kg. ${t("vsGeneral")}: ${rupee(fp.generalCost)}. <b class="${diff >= 0 ? "pos" : "neg"}">${diff >= 0 ? t("saving") + " " + rupee(diff) : rupee(-diff) + " " + t("extra")}</b></p>`;
}

function renderCardTable() {
  const lang = getLang();
  const gaugePos = (p, v) => {
    if (v == null) return null;
    if (p.id === "ph") return Math.max(0, Math.min(100, ((v - 5.5) / 4.5) * 100));
    const [lo, hi] = p.th;
    const max = hi * 2;
    return Math.max(0, Math.min(100, v <= lo ? (v / lo) * 33.3 : v <= hi ? 33.3 + ((v - lo) / (hi - lo)) * 33.3 : 66.6 + Math.min(1, (v - hi) / (max - hi)) * 33.4));
  };
  $("#cardTable").innerHTML = card.PARAMS.map((p) => {
    const v = state.card[p.id];
    const r = card.rate(p.id, v);
    const lab = r ? card.RATING_LABEL[r] : null;
    const g = gaugePos(p, v);
    const warn = state.cardFlags?.[p.id] ? ` <span class="badge neg">${ic("circle-alert")}${t("check")}</span>` : "";
    const cls = !lab ? "" : lab.cls === "neg" ? "neg" : lab.cls === "pos" ? "" : "mid";
    const gauge = p.id === "ec" ? "" : `<div class="gauge" title="${p.id === "ph" ? "5.5 - 10" : p.th.join(" / ")}">${p.id === "ph" ? '<span style="background:#f1c7bd"></span><span style="background:#c5ddb8"></span><span style="background:#f1c7bd"></span>' : "<span></span><span></span><span></span>"}${g != null ? `<i style="left:${g}%"></i>` : ""}</div>`;
    return `<div class="param"><div>${esc(L_(p))}${warn}<div class="u">${p.unit}</div></div><input type="number" step="any" data-p="${p.id}" value="${v ?? ""}" aria-label="${esc(L_(p))}">${gauge || "<div></div>"}<div class="rt">${lab ? `<span class="badge ${cls}">${L_(lab)}</span>` : ""}</div></div>`;
  }).join("");
  $$("#cardTable input").forEach((inp) => (inp.onchange = () => {
    const v = inp.value === "" ? null : +inp.value;
    if (v == null) delete state.card[inp.dataset.p]; else state.card[inp.dataset.p] = v;
    if (state.cardFlags) delete state.cardFlags[inp.dataset.p];
    saveCard();
    renderCard();
  }));
}
function saveCard() { try { localStorage.setItem("km-card", JSON.stringify(state.card)); } catch {} }

function renderCard() {
  renderCardTable();
  const lang = getLang();
  const has = Object.keys(state.card).length > 0;
  const adv = has ? card.cardAdvice(state.card, lang) : [];
  const icFor = (l) => (l === "high" ? "triangle-alert" : l === "medium" ? "circle-alert" : "info");
  $("#cardAdvice").innerHTML = !has ? `<p class="hint">${t("cardEmpty")}</p>` :
    (adv.length ? adv.map((a) => `<div class="alert ${a.lvl}">${ic(icFor(a.lvl))}<span>${esc(a.text)}</span></div>`).join("") : `<p class="ok">${ic("circle-check")}${t("soilOk")}</p>`) +
    `<p class="ok hint">${ic("circle-check")}${t("cardUsed")}</p>`;
  const fc = $("#fertCrop");
  if (!fc.options.length || fc.dataset.lang !== lang) {
    const keep = fc.value || "wheat";
    fc.innerHTML = CROPS.filter((c) => card.RDF[c.id]).map((c) => `<option value="${c.id}">${esc(L_(c))}</option>`).join("");
    fc.value = keep; fc.dataset.lang = lang;
  }
  const fp = has ? card.fertilizerPlan(fc.value, state.card, +$("#fertAcres").value || 1) : null;
  $("#fertPlan").innerHTML = fp ? fertTable(fp) : `<p class="hint">${t("cardEmpty")}</p>`;
}
$("#fertCrop").onchange = renderCard;
$("#fertAcres").oninput = renderCard;
$("#cardClear").onclick = () => { state.card = {}; state.cardFlags = {}; saveCard(); $("#cardPreview").classList.add("hidden"); $("#ocrText").textContent = ""; renderCard(); };
$("#cardSample").onclick = () => {
  const r = card.parseCard(card.SAMPLE_TEXT);
  state.card = r.values; saveCard();
  $("#ocrText").textContent = card.SAMPLE_TEXT;
  renderCard();
};
$("#cardFile").onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const pr = $("#cardProgress");
  pr.classList.remove("hidden");
  const setP = (f) => { $(".bar", pr).style.width = `${Math.round(f * 100)}%`; $(".ptext", pr).textContent = `${t("cardReading")} ${Math.round(f * 100)}%`; };
  setP(0.02);
  if (file.type.startsWith("image/")) { const img = $("#cardPreview"); img.src = URL.createObjectURL(file); img.classList.remove("hidden"); }
  try {
    const res = await card.scanCard(file, (f) => setP(f));
    $("#ocrText").textContent = res.text;
    state.card = { ...state.card, ...res.values };
    state.cardFlags = res.flags || {};
    saveCard();
    $(".ptext", pr).textContent = `${res.found} ${t("cardFound")}`;
    $(".bar", pr).style.width = "100%";
    renderCard();
  } catch (err) {
    $(".ptext", pr).textContent = t("error") + ": " + err.message;
  }
  e.target.value = "";
};

/* ---------------- techniques ---------------- */
state.techCat = "";
$("#techSearch").oninput = renderTechniques;
function renderTechniques() {
  const soil = adviceSoil();
  const latest = state.report?.series?.[state.report.series.length - 1];
  const uneven = latest?.ndviStd && latest.ndvi > 0.25 && latest.ndviStd / latest.ndvi > 0.12;
  let top = [];
  try { top = recommend({ season: state.season, district: state.district, soil, water: $("#water").value, risk: $("#risk").value, acres: 1, prices: state.prices }).slice(0, 3).map((x) => x.crop.id); } catch {}
  const rel = relevantTechniques({ district: state.district, soil, uneven, cardDone: Object.keys(state.card).length > 0, topCrops: top });
  $("#techChips").innerHTML = [`<button class="chip ${state.techCat === "" ? "on" : ""}" data-c="">${t("all")}</button>`, `<button class="chip ${state.techCat === "star" ? "on" : ""}" data-c="star">${ic("star")}${t("forYou")}</button>`]
    .concat(Object.entries(CATEGORIES).map(([k, v]) => `<button class="chip ${state.techCat === k ? "on" : ""}" data-c="${k}">${ic(v.icon)}${L_(v)}</button>`)).join("");
  $$("#techChips .chip").forEach((b) => (b.onclick = () => { state.techCat = b.dataset.c; renderTechniques(); }));
  const q = $("#techSearch").value.trim().toLowerCase();
  let list = TECHNIQUES.filter((tq) => (state.techCat === "" || (state.techCat === "star" ? rel.has(tq.id) : tq.cat === state.techCat)));
  if (q) list = list.filter((tq) => [tq.en, tq.hi, tq.what.en, tq.what.hi, ...tq.crops].join(" ").toLowerCase().includes(q));
  list.sort((a, b) => (rel.has(b.id) ? 1 : 0) - (rel.has(a.id) ? 1 : 0));
  $("#techList").innerHTML = list.map((tq) => {
    const p = PHOTOS[TECH_PHOTO[tq.id]];
    const cat = CATEGORIES[tq.cat];
    return `<article class="card tech" id="tech-${tq.id}">
      <div class="photo ${p ? "" : "icon cat-" + tq.cat}" ${p ? `style="background-image:url('${p.src}')" role="img" aria-label="${esc(p.title)}"` : ""}>
        ${p ? "" : ic(cat.icon)}
        <span class="cat">${ic(cat.icon)}${L_(cat)}</span>
        ${rel.has(tq.id) ? `<span class="star">${ic("star")}${t("forYou")}</span>` : ""}
      </div>
      <div class="body">
        <h3>${esc(L_(tq))}</h3>
        <p>${esc(L_(tq.what))}</p>
        <ul class="notes">${L_(tq.benefits).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <details><summary>${ic("list-checks")}${t("howTo")}</summary><ol class="notes">${L_(tq.steps).map((x) => `<li>${esc(x)}</li>`).join("")}</ol></details>
        ${tq.subsidy ? `<div class="sub">${ic("landmark")}<span><b>${t("support")}:</b> ${esc(L_(tq.subsidy))}</span></div>` : ""}
        <div class="tags">${tq.crops.map((id) => { const c = CROPS.find((x) => x.id === id); return c ? `<span>${esc(L_(c))}</span>` : ""; }).join("")}</div>
        <div class="actions">
          <a class="btn vbtn" href="${tq.video}" target="_blank" rel="noopener">${ic("play")}${t("watch")}</a>
          <a class="btn line" href="${tq.link}" target="_blank" rel="noopener">${ic("external-link")}${t("official")}</a>
        </div>
      </div>
    </article>`;
  }).join("") || `<p class="hint">${getLang() === "hi" ? "कोई तकनीक नहीं मिली। दूसरा शब्द खोजें।" : "No techniques match. Try another word."}</p>`;
  if (state.techFocus) {
    const el = $("#tech-" + state.techFocus);
    state.techFocus = null;
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.querySelector("details")?.setAttribute("open", ""); }
  }
}

/* ---------------- prices ---------------- */
let trendChart = null;
$("#priceCrop").onchange = renderPrices;
$("#priceDistrict").onchange = renderPrices;
async function renderPrices() {
  if (!state.prices) { try { state.prices = await src.mandiPrices(); watchLivePrices(); } catch {} }
  const lang = getLang();
  // MSP table
  const seen = new Set();
  $("#mspTable").innerHTML = `<tr><th>${t("filterCrop")}</th><th>${t("season")}</th><th class="num">MSP ₹/q</th><th class="num">${t("tabPrices")} (Haryana)</th></tr>` +
    CROPS.filter((c) => c.msp && !seen.has(c.msp) && seen.add(c.msp)).map((c) => {
      const lp = livePrice(c, state.prices, null);
      const cmp = lp ? `${rupee(lp.modal)} <span class="${lp.modal >= c.msp ? "pos" : "neg"}">(${lp.modal >= c.msp ? "+" : ""}${Math.round((100 * (lp.modal - c.msp)) / c.msp)}%)</span>` : "—";
      return `<tr><td>${esc(L_(c))}</td><td>${esc(L_(SEASONS[c.season]))}</td><td class="num">${rupee(c.msp)}</td><td class="num">${cmp}</td></tr>`;
    }).join("");
  $("#mspSource").textContent = `${MSP_SOURCE.rabi}; ${MSP_SOURCE.kharif}.`;

  const latest = state.prices?.latest;
  if (!latest?.records?.length) {
    $("#priceMeta").textContent = t("pricesNone");
    $("#priceTable").innerHTML = "";
    $("#trendBox").classList.add("hidden");
    return;
  }
  const cropId = $("#priceCrop").value, dist = $("#priceDistrict").value;
  const crop = CROPS.find((c) => c.id === cropId);
  let recs = latest.records;
  if (crop) recs = recs.filter((r) => crop.agmark.test(r.commodity));
  if (dist) recs = recs.filter((r) => r.district?.toLowerCase() === dist.toLowerCase());
  recs = [...recs].sort((a, b) => a.commodity.localeCompare(b.commodity) || +b.modal - +a.modal);
  $("#priceMeta").textContent = `${t("pricesUpdated")}: ${new Date(latest.updated).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}. ${latest.records.length} ${lang === "hi" ? "रिकॉर्ड" : "records"} from Agmarknet (data.gov.in).`;
  $("#priceTable").innerHTML = `<tr><th>${t("commodity")}</th><th>${t("market")}</th><th>${t("district")}</th><th>${lang === "hi" ? "तारीख" : "Date"}</th><th class="num">${t("min")}</th><th class="num">${t("max")}</th><th class="num">${t("modal")}</th></tr>` +
    (recs.length ? recs.slice(0, 400).map((r) => `<tr><td>${esc(r.commodity)}${r.variety && r.variety !== "Other" ? ` <span class="hint">${esc(r.variety)}</span>` : ""}</td><td>${esc(r.market)}</td><td>${esc(r.district)}</td><td>${esc(r.date)}</td><td class="num">${rupee(r.min)}</td><td class="num">${rupee(r.max)}</td><td class="num"><b>${rupee(r.modal)}</b></td></tr>`).join("") : `<tr><td colspan="7">—</td></tr>`);

  // trend
  const hist = state.prices?.history?.series;
  const box = $("#trendBox");
  if (crop && hist) {
    const key = Object.keys(hist).find((k) => crop.agmark.test(k));
    const pts = key ? hist[key] : null;
    if (pts?.length >= 2) {
      box.classList.remove("hidden");
      if (trendChart) trendChart.destroy();
      trendChart = new Chart($("#trendChart"), {
        type: "line",
        data: { labels: pts.map((p) => p.date), datasets: [{ label: `${L_(crop)} ₹/q`, data: pts.map((p) => p.modal), borderColor: "#c9a227", tension: 0.25 }, ...(crop.msp ? [{ label: "MSP", data: pts.map(() => crop.msp), borderColor: "#2e7d32", borderDash: [6, 4], pointRadius: 0 }] : [])] },
        options: { plugins: { legend: { position: "bottom" } } },
      });
      return;
    }
  }
  box.classList.add("hidden");
}

/* ---------------- weather ---------------- */
$("#weatherDistrict").onchange = async (e) => {
  const d = DISTRICTS.find((x) => x.name === e.target.value);
  state.district = d;
  state.forecast = null;
  state.forecastFor = { lat: d.lat, lon: d.lon, label: L_(d) };
  renderWeather();
};
const wIcon = (c) => (c === 0 ? "sun" : c <= 2 ? "cloud-sun" : c === 3 ? "cloud" : c <= 48 ? "cloud-fog" : c <= 57 ? "cloud-drizzle" : c <= 67 ? "cloud-rain" : c <= 77 ? "cloud-snow" : c <= 82 ? "cloud-sun-rain" : "cloud-lightning");
async function renderWeather() {
  const lang = getLang();
  if (!state.forecastFor) state.forecastFor = { lat: state.district.lat, lon: state.district.lon, label: L_(state.district) };
  const f = state.forecastFor;
  $("#weatherWhere").textContent = `${f.label} (${f.lat.toFixed(3)}, ${f.lon.toFixed(3)}), Open-Meteo`;
  if (!state.forecast) {
    $("#forecast").textContent = lang === "hi" ? "पूर्वानुमान लोड हो रहा है" : "Loading forecast";
    try { state.forecast = await src.forecast(f.lat, f.lon); } catch (e) { $("#forecast").textContent = t("error") + ": " + e.message; return; }
  }
  const fc = state.forecast;
  const al = weatherAlerts(fc, lang);
  const icFor = (l) => (l === "high" ? "triangle-alert" : l === "medium" ? "circle-alert" : "info");
  $("#alerts").innerHTML = al.length ? al.map((a) => `<div class="alert ${a.level}">${ic(icFor(a.level))}<span><b>${esc(a.date)}:</b> ${esc(a.text)}</span></div>`).join("") : `<p class="ok">${ic("circle-check")}${t("noAlerts")}</p>`;
  const d = fc.daily;
  $("#forecast").innerHTML = d.time.map((day, i) => {
    const w = wIcon(d.weather_code[i]);
    return `<div class="day">
      <div class="d">${new Date(day).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" })}</div>
      ${ic(w, w === "sun" ? "sun" : "")}
      <div class="t">${Math.round(d.temperature_2m_max[i])}° <small>${Math.round(d.temperature_2m_min[i])}°</small></div>
      <div class="m">${t("rain")} ${d.precipitation_sum[i].toFixed(1)} mm, ${d.precipitation_probability_max[i] ?? "-"}%</div>
      <div class="m">${t("wind")} ${Math.round(d.wind_speed_10m_max[i])} km/h</div>
      <div class="m">ET₀ ${d.et0_fao_evapotranspiration[i].toFixed(1)} mm</div>
    </div>`;
  }).join("");
}

/* ---------------- about ---------------- */
function renderAbout() {
  const hi = getLang() === "hi";
  const credits = `<h3>${t("credits")}</h3><ul class="credits">${Object.values(PHOTOS).map((p) => `<li><a href="${p.page}" target="_blank" rel="noopener">${esc(p.title)}</a>, ${esc(p.author)}, ${esc(p.license)}</li>`).join("")}</ul><p class="hint">${hi ? "आइकन: Lucide (ISC लाइसेंस)। सैटेलाइट चित्र: Esri World Imagery, Copernicus Sentinel-2।" : "Icons: Lucide (ISC licence). Satellite imagery: Esri World Imagery, Copernicus Sentinel-2."}</p>`;
  $("#aboutBox").innerHTML = hi ? `
    <h2>कृषि मित्र हरियाणा क्या है?</h2>
    <p>यह एक मुफ़्त, खुला वेब ऐप है जो हरियाणा के किसानों को खुले सैटेलाइट, मौसम, मिट्टी और मंडी डेटा से फसल योजना बनाने में मदद करता है। कोई लॉगिन नहीं, कोई डेटा इकट्ठा नहीं किया जाता।</p>
    <h3>यह कैसे काम करता है</h3>
    <ul>
      <li><b>ज़मीन रिपोर्ट:</b> यूरोपीय Sentinel-2 सैटेलाइट (10 मीटर, हर 5 दिन) के पिछले 12 महीनों के चित्रों से आपके खेत की हरियाली (NDVI) और नमी (NDMI) निकाली जाती है। बादल वाले चित्र अपने-आप हटा दिए जाते हैं।</li>
      <li><b>मिट्टी:</b> ISRIC SoilGrids (250 मीटर) से अनुमान। सटीक खाद मात्रा के लिए मृदा स्वास्थ्य कार्ड जांच कराएं।</li>
      <li><b>फसल सलाह:</b> हर फसल को मुनाफ़ा (40), पानी (25), मिट्टी (20), क्षेत्र (10) और दाम सुरक्षा (5) पर अंक मिलते हैं। हर अंक का कारण दिखाया जाता है।</li>
      <li><b>भाव:</b> MSP सरकारी अधिसूचना से; मंडी भाव Agmarknet (data.gov.in) से दिन में दो बार अपडेट।</li>
      <li><b>मौसम:</b> Open-Meteo का 10 दिन का पूर्वानुमान, पाला, भारी बारिश, गर्मी और तेज़ हवा की चेतावनी के साथ।</li>
      <li><b>मृदा कार्ड स्कैनर:</b> फोटो या PDF से 12 मापदंड पढ़कर (फ़ोन पर ही, Tesseract OCR) बोरियों में खाद योजना और लागत।</li>
      <li><b>जोखिम लेखा:</b> हर फसल के लिए ख़राब/सामान्य/अच्छे साल का मुनाफ़ा — आपकी जगह के 5 साल के मौसम (पाला, गर्मी, सूखा, जल-भराव), बाज़ार जोखिम, मांग और सरकारी प्रोत्साहन जोड़कर। स्लाइडर से "अगर ऐसा हो तो" देखें।</li>
      <li><b>तकनीकें:</b> DSR, लेज़र लेवलिंग, हैप्पी सीडर, ड्रिप, IPM आदि — चरण, फायदे, सरकारी सहायता और वीडियो।</li>
    </ul>
    <h3>सीमाएं</h3>
    <p>लागत और उपज के आंकड़े हरियाणा के औसत अनुमान हैं, आपके खेत के नहीं। भविष्य के दाम की भविष्यवाणी नहीं की जाती — आज के भाव और MSP का उपयोग होता है। बड़े फैसलों से पहले KVK या कृषि विभाग से सलाह लें।</p>
    <h3>उपयोगी सरकारी पोर्टल</h3>
    <ul>
      <li><a href="https://agriharyana.gov.in" target="_blank" rel="noopener">कृषि एवं किसान कल्याण विभाग, हरियाणा</a></li>
      <li><a href="https://fasal.haryana.gov.in" target="_blank" rel="noopener">मेरी फसल मेरा ब्योरा</a></li>
      <li><a href="https://soilhealth.dac.gov.in" target="_blank" rel="noopener">मृदा स्वास्थ्य कार्ड</a></li>
      <li><a href="https://enam.gov.in" target="_blank" rel="noopener">e-NAM</a></li>
      <li><a href="https://agmarknet.gov.in" target="_blank" rel="noopener">Agmarknet</a></li>
      <li><a href="https://www.hau.ac.in" target="_blank" rel="noopener">CCS हरियाणा कृषि विश्वविद्यालय</a></li>
    </ul>${credits}` : `
    <h2>What is Krishi Mitra Haryana?</h2>
    <p>A free, open web app that helps Haryana farmers plan crops using open satellite, weather, soil and market data. No login, and no data about you is collected.</p>
    <h3>How it works</h3>
    <ul>
      <li><b>Land report:</b> 12 months of Copernicus Sentinel-2 imagery (10 m, every ~5 days) give your field's greenness (NDVI) and canopy moisture (NDMI). Cloudy images are dropped automatically using the scene classification layer.</li>
      <li><b>Soil:</b> estimates from ISRIC SoilGrids (250 m). For exact fertilizer doses, get a Soil Health Card test.</li>
      <li><b>Crop advice:</b> each crop is scored on profit (40), water fit (25), soil fit (20), region fit (10) and price safety (5). Every score is explained.</li>
      <li><b>Prices:</b> MSP from the official Government of India notifications; mandi prices from Agmarknet (data.gov.in), refreshed twice a day.</li>
      <li><b>Weather:</b> 10-day Open-Meteo forecast with frost, heavy-rain, heat and wind alerts.</li>
      <li><b>Soil Health Card scanner:</b> reads 12 parameters from a photo or PDF (on your phone, Tesseract OCR) and gives a fertilizer plan in bags with cost.</li>
      <li><b>Risk accounting:</b> bad / normal / good-year profit per crop combining 5-year local climate (frost, heat, drought, waterlogging), market risk and demand, and government incentives. Sliders let you test "what if".</li>
      <li><b>Techniques:</b> DSR, laser levelling, Happy Seeder, drip, IPM and more — steps, benefits, government support and videos.</li>
    </ul>
    <h3>Limitations</h3>
    <p>Cost and yield numbers are Haryana-average estimates, not measured on your field. The app does not forecast future prices — it uses today's mandi price and MSP. Confirm big decisions with your KVK or agriculture officer.</p>
    <h3>Useful government portals</h3>
    <ul>
      <li><a href="https://agriharyana.gov.in" target="_blank" rel="noopener">Department of Agriculture & Farmers Welfare, Haryana</a></li>
      <li><a href="https://fasal.haryana.gov.in" target="_blank" rel="noopener">Meri Fasal Mera Byora</a></li>
      <li><a href="https://soilhealth.dac.gov.in" target="_blank" rel="noopener">Soil Health Card</a></li>
      <li><a href="https://enam.gov.in" target="_blank" rel="noopener">e-NAM</a></li>
      <li><a href="https://agmarknet.gov.in" target="_blank" rel="noopener">Agmarknet</a></li>
      <li><a href="https://www.hau.ac.in" target="_blank" rel="noopener">CCS Haryana Agricultural University</a></li>
    </ul>${credits}`;
}

/* ---------------- boot ---------------- */
$$(".tab").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
$$(".lang button").forEach((b) => (b.onclick = () => {
  setLang(b.dataset.lang);
  paintStatic();
  if (state.report) renderReport();
  const active = $(".tab.active")?.dataset.tab;
  if (active && active !== "land") showTab(active);
}));
paintStatic();
const initial = location.hash.slice(1);
if (["advice", "soilcard", "techniques", "prices", "weather", "about"].includes(initial)) showTab(initial);
window.__km = { state, map }; // handy for debugging in the console
