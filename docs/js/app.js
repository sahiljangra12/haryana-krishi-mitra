import { t, getLang, setLang, rupee } from "./i18n.js?v=20261120221402";
import { CROPS, SEASONS, COST_LABELS, MSP_SOURCE } from "./crops.js?v=20261120221402";
import { DISTRICTS, nearestDistrict, HARYANA_BBOX } from "./districts.js?v=20261120221402";
import * as Voice from "./voice.js?v=20261120221402";
import * as Field from "./field.js?v=20261120221402";
import * as RS from "./rs.js?v=20261120221402";
import * as src from "./sources.js?v=20261120221402";
import { recommend, upcomingSeason, weatherAlerts, interpretSeries, uniformity, livePrice } from "./advisor.js?v=20261120221402";
import * as card from "./soilcard.js?v=20261120221402";
import { TECHNIQUES, CATEGORIES, relevantTechniques } from "./techniques.js?v=20261120221402";
import { PHOTOS, CROP_PHOTO, TECH_PHOTO } from "./images.js?v=20261120221402";
import { exposures, scenarios, MARKET, HAZARD_LABEL, INCENTIVE_LABEL } from "./risk.js?v=20261120221402";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const L_ = (o) => (getLang() === "hi" ? o.hi : o.en);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const alpha = (hex, a) => { const h = hex.replace("#", ""); if (h.length !== 6) return hex; return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; };
function chartTheme() {
  if (!window.Chart) return;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.color = css("--soil-2");
  Chart.defaults.borderColor = css("--line");
  Chart.defaults.font.family = "Hind, system-ui, sans-serif";
}
const C = () => ({ green: css("--green"), canal: css("--canal"), risk: css("--risk"), mustard: css("--mustard"), soil2: css("--soil-2") });
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
  techFocus: null, techCat: "",
  searched: false, busy: false, placeName: "", areaLabel: "", verdicts: null, reportFor: null, voiceOn: false,
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
const TABS = ["land", "advice", "soilcard", "techniques", "prices", "weather", "about"];
let navDepth = 0; // how many steps the phone's back button can take inside the app
function showTab(name, push = true) {
  const was = state.tab || "land";
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  Voice.stop();
  window.scrollTo(0, 0);
  if (name === "land") setTimeout(() => map.invalidateSize(), 50);
  if (name === "advice") renderAdvice();
  if (name === "prices") renderPrices();
  if (name === "weather") renderWeather();
  if (name === "about") renderAbout();
  if (name === "soilcard") renderCard();
  if (name === "techniques") renderTechniques();
  state.tab = name;
  if (push && name !== was) { try { history.pushState({ tab: name }, "", "#" + name); navDepth++; } catch {} }
}
// Back: the arrow at the top of every page and the phone's own back button do the same thing
function goBack() {
  if (navDepth > 0) history.back();
  else if (!closeLayerPanel()) showTab("land");
}
function closeLayerPanel() {
  const p = $("#layerPanel");
  if (!p || p.classList.contains("hidden")) return false;
  p.classList.add("hidden");
  return true;
}
window.addEventListener("popstate", (e) => {
  navDepth = Math.max(0, navDepth - 1);
  closeLayerPanel();
  const h = location.hash.slice(1), tab = (e.state && e.state.tab) || (TABS.includes(h) ? h : "land");
  showTab(tab, false);
});
document.addEventListener("click", (e) => { if (e.target.closest("[data-back]")) goBack(); });

/* ---------------- map: sharp photo base that never shows blank tiles ----------------
   Esri World Imagery has real tiles to zoom 18 in rural Haryana (checked); beyond that it returns a grey
   "no data" tile, so deeper zooms enlarge level 18 instead. Live satellite layers are drawn on top. */
const map = L.map("map", { zoomControl: false, maxZoom: 21 }).setView([29.2, 76.3], 8);
map.attributionControl.setPrefix("");
map.createPane("names"); map.getPane("names").style.zIndex = 450; map.getPane("names").style.pointerEvents = "none";
const yesterday = () => new Date(Date.now() + 5.5 * 3600e3 - 864e5).toISOString().slice(0, 10);
const rs = { overlay: "none", scene: null, auto: null, photo: null, scenes: [], mosaic: null, nasa: { fires: false, ndvi8: false, lst: false, soil: false, rain: false }, isro: false, date: yesterday(), opacity: 0.6, names: true, fireCount: null };
const ATTR_S2 = "Copernicus Sentinel-2, Microsoft Planetary Computer", ATTR_NASA = "NASA GIBS";
const photo = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 18, maxZoom: 21, zIndex: 1, crossOrigin: "anonymous", keepBuffer: 4, attribution: "Esri, Maxar, Earthstar Geographics" }).addTo(map);
const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxNativeZoom: 17, maxZoom: 21, pane: "names" }).addTo(map);
let s2Layer = null, modisLayer = null, isroLayer = null;
const nasaOverlays = {};
let marker = null, poly = null, square = null, searchPin = null;
const vertexLayer = L.layerGroup().addTo(map);
const fmtDate = (iso) => new Date(iso).toLocaleDateString(getLang() === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const T2 = (en, hi) => (getLang() === "hi" ? hi : en);

map.on("click", (e) => {
  $("#searchResults").innerHTML = "";
  if (state.drawing) {
    state.vertices.push([e.latlng.lat, e.latlng.lng]);
    L.circleMarker(e.latlng, { radius: 6, color: "#fff", weight: 2, fillColor: "#f5a300", fillOpacity: 1 }).addTo(vertexLayer);
    if (poly) map.removeLayer(poly);
    poly = L.polygon(state.vertices, { color: "#f5a300", weight: 3, fillOpacity: 0.12 }).addTo(map);
    renderGuide(false);
    return;
  }
  // a tap from far away is too rough to mean one field: come closer first
  if (map.getZoom() < 14) { map.setView(e.latlng, Math.min(16, map.getZoom() + 3)); toast(t("zoomMore")); return; }
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
  showPlaceName(lat, lon);
  renderGuide();
}
async function showPlaceName(lat, lon) {
  state.placeName = "";
  const name = await src.reverseGeocode(lat, lon);
  if (state.point && Math.abs(state.point[0] - lat) < 1e-9) { state.placeName = name || L_(state.district); const el = $("#placeName"); if (el) el.textContent = state.placeName; }
}
function drawSquare() {
  if (square) map.removeLayer(square);
  if (!state.point || state.vertices.length >= 3) return;
  const half = Math.sqrt((+$("#acres").value || 2) * 4046.86) / 2;
  square = L.geoJSON(src.squareFeature(state.point[0], state.point[1], half), { style: { color: "#f5a300", weight: 3, fillOpacity: 0.1 } }).addTo(map);
}
function clearShape() {
  [marker, poly, square, searchPin].forEach((l) => l && map.removeLayer(l));
  marker = poly = square = searchPin = null;
  vertexLayer.clearLayers();
  state.vertices = []; state.point = null; state.feature = null;
}
const outsideHaryana = (lat, lon) => { const b = HARYANA_BBOX; return lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon; };
function currentFeature() {
  if (state.vertices.length >= 3) {
    const ring = state.vertices.map(([a, b]) => [b, a]); ring.push(ring[0]);
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
  }
  if (!state.point) return null;
  return src.squareFeature(state.point[0], state.point[1], Math.sqrt((+$("#acres").value || 2) * 4046.86) / 2);
}
function areaAcres(feature) {
  const ring = feature.geometry.coordinates[0], lat0 = (ring[0][1] * Math.PI) / 180, R = 6378137;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = (ring[i][0] * Math.PI) / 180 * R * Math.cos(lat0), y1 = (ring[i][1] * Math.PI) / 180 * R;
    const x2 = (ring[i + 1][0] * Math.PI) / 180 * R * Math.cos(lat0), y2 = (ring[i + 1][1] * Math.PI) / 180 * R;
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2) / 4046.86;
}
function startDraw() { const c = state.point; clearShape(); state.drawing = true; if (c) map.setView(c, Math.max(map.getZoom(), 17)); renderGuide(); }
function finishDraw(keep) {
  state.drawing = false;
  if (keep && state.vertices.length >= 3) {
    const c = poly.getBounds().getCenter();
    state.point = [c.lat, c.lng];
    state.district = nearestDistrict(c.lat, c.lng); fillSelects(); showPlaceName(c.lat, c.lng);
  } else clearShape();
  renderGuide();
}
function resetField() { clearShape(); state.drawing = false; state.report = null; state.reportFor = null; $("#report").classList.add("hidden"); try { localStorage.removeItem("km-field"); } catch {} renderGuide(); }

/* ---------------- search: PIN code, village, coordinates, voice ---------------- */
const KIND_LABEL = { exact: { en: "Exact point", hi: "सटीक जगह" }, address: { en: "Address", hi: "पता" }, place: { en: "Village / town", hi: "गाँव / कस्बा" }, road: { en: "Road", hi: "सड़क" }, pin: { en: "PIN area", hi: "पिन क्षेत्र" } };
function goTo(p) {
  $("#searchResults").innerHTML = "";
  if (p.kind === "exact") { setPoint(p.lat, p.lon, false); map.setView([p.lat, p.lon], 18); return; }
  clearShape();
  searchPin = L.circleMarker([p.lat, p.lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#1466a8", fillOpacity: 1 }).addTo(map);
  // A village opens at field level (16-17): fields and their boundaries are clear straight away. A PIN code covers many villages, so it opens one step wider.
  let z = p.kind === "pin" ? 14 : 16;
  if (p.kind !== "pin" && p.extent) { try { z = Math.min(17, Math.max(16, map.getBoundsZoom([[p.extent.ymin, p.extent.xmin], [p.extent.ymax, p.extent.xmax]]))); } catch {} }
  map.setView([p.lat, p.lon], z);
  state.searched = true; state.areaLabel = p.label;
  renderGuide();
}
function showResults(list, note = "") {
  const box = $("#searchResults");
  box.innerHTML = (note ? `<p class="note">${note}</p>` : "") + list.map((p, i) => `<button type="button" data-i="${i}"><span class="kind k-${p.fallback ? "pin" : p.kind}">${p.fallback ? t("townArea") : L_(KIND_LABEL[p.kind] || KIND_LABEL.place)}</span><span class="lbl">${esc(p.label)}</span></button>`).join("");
  $$("button[data-i]", box).forEach((b) => (b.onclick = () => goTo(list[+b.dataset.i])));
  addResultsClose();
}
function addResultsClose() {
  const box = $("#searchResults");
  if (!box.children.length) return;
  box.insertAdjacentHTML("beforeend", `<button type="button" class="res-close">${ic("x")}${T2("Close list", "सूची बंद करें")}</button>`);
  $(".res-close", box).onclick = () => (box.innerHTML = "");
}
// Villages inside a PIN code (India Post). Tapping one opens that village at field level.
function showVillages(pin, list) {
  const box = $("#searchResults");
  box.innerHTML = `<p class="note">${T2(`Villages in PIN ${pin}. Choose yours:`, `पिन ${pin} के गाँव। अपना गाँव चुनें:`)}</p>` + list.slice(0, 14).map((v, i) => `<button type="button" data-v="${i}"><span class="kind k-village">${T2("Village", "गाँव")}</span><span class="lbl">${esc(v.name)}${v.block && v.block !== "NA" ? `<small>, ${esc(v.block)}</small>` : ""}</span></button>`).join("");
  $$("button[data-v]", box).forEach((b) => (b.onclick = async () => {
    const v = list[+b.dataset.v];
    box.innerHTML = `<p class="note">${t("searching")}</p>`;
    const r = await src.geocode(`${v.name}, ${v.district}, Haryana`).catch(() => []);
    const hit = r.find((x) => !x.fallback) || null;
    if (hit) goTo({ ...hit, kind: hit.kind === "exact" ? "place" : hit.kind, label: `${v.name}, ${v.district}` });
    else { box.innerHTML = ""; toast(T2(`${v.name} is not on the map yet. Move the map to your village and tap your field.`, `${v.name} नक्शे में नहीं मिला। नक्शा खिसकाकर अपने गाँव पर ले जाएं और खेत पर उंगली रखें।`), 6000); }
  }));
  addResultsClose();
}
async function runSearch(q) {
  const box = $("#searchResults");
  q = q.trim().replace(/[०-९]/g, (d) => "०१२३४५६७८९".indexOf(d));
  if (!q) return;
  $("#q").blur();
  if (src.isShortMapsLink(q)) { box.innerHTML = `<p class="note">${t("shortLink")}</p>`; return; }
  box.innerHTML = `<p class="note">${t("searching")}</p>`;
  try {
    const pin = q.replace(/\s/g, "");
    if (/^\d{6}$/.test(pin)) {
      const [p, vill] = await Promise.all([src.pinLookup(pin).catch(() => null), src.pinVillages(pin).catch(() => [])]);
      if (!p && !vill.length) { box.innerHTML = `<p class="note">${t("pinNotFound")}</p>`; return; }
      if ((p && p.region && !/haryana/i.test(p.region)) || (vill[0] && vill[0].state && !/haryana/i.test(vill[0].state))) toast(t("outside"));
      if (p) goTo({ ...p, kind: "pin", label: `${pin}, ${p.label}` }); else box.innerHTML = "";
      if (vill.length > 1 || (!p && vill.length)) showVillages(pin, vill);
      return;
    }
    const r = await src.geocode(q);
    if (!r.length) { box.innerHTML = `<p class="note">${t("notFound")}</p>`; return; }
    if (r.length === 1 || r[0].kind === "exact") return goTo(r[0]);
    showResults(r, r.note === "notExact" ? t("notExact", { what: esc(r.missing), where: esc(r.anchorLabel) }) : r.note === "approx" ? t("approx") : "");
  } catch (err) { box.innerHTML = `<p class="note">${t("error")}: ${esc(err.message)}</p>`; }
}
$("#searchForm").onsubmit = (e) => { e.preventDefault(); runSearch($("#q").value); };
let sugTimer = null, sugSeq = 0;
$("#q").addEventListener("input", () => {
  clearTimeout(sugTimer);
  const text = $("#q").value;
  if (/^[\d\s०-९]*$/.test(text)) { $("#searchResults").innerHTML = ""; return; }
  sugTimer = setTimeout(async () => {
    const seq = ++sugSeq;
    const list = await src.suggest(text).catch(() => []);
    if (seq !== sugSeq || !list.length) return;
    const box = $("#searchResults");
    box.innerHTML = list.map((s, i) => `<button type="button" data-i="${i}"><span class="kind">${ic("search")}</span><span class="lbl">${esc(s.text.replace(/, IND$/, ""))}</span></button>`).join("");
    $$("button", box).forEach((b) => (b.onclick = async () => { const p = await src.resolveSuggestion(list[+b.dataset.i]).catch(() => null); if (p) goTo(p); }));
  }, 300);
});
const MIC_MSG = {
  unsupported: { en: "This browser cannot listen. Tap the mic on your keyboard and speak, or type.", hi: "यह ब्राउज़र सुन नहीं सकता। कीबोर्ड का माइक दबाकर बोलें, या लिखें।" },
  service: { en: "Voice typing is off on this phone. Tap the mic on your keyboard and speak, or type.", hi: "इस फ़ोन में बोलकर लिखना बंद है। कीबोर्ड का माइक दबाकर बोलें, या लिखें।" },
  network: { en: "Listening needs the internet and it did not connect. Try again, or type.", hi: "सुनने के लिए इंटरनेट चाहिए, जुड़ नहीं पाया। दोबारा दबाएं, या लिखें।" },
  denied: { en: "The microphone is blocked. Allow the microphone for this site in the browser, then press the mic again.", hi: "माइक बंद है। ब्राउज़र में इस साइट के लिए माइक की इजाज़त दें, फिर माइक दोबारा दबाएं।" },
  nospeech: { en: "Nothing was heard. Press the mic and speak clearly.", hi: "कुछ सुनाई नहीं दिया। माइक दबाकर साफ़ बोलें।" },
  error: { en: "Could not listen. Try again, or type.", hi: "सुन नहीं पाया। दोबारा दबाएं, या लिखें।" },
};
function micProblem(code) {
  if (code === "aborted") return;
  $("#micBtn").classList.remove("on");
  toast(L_(MIC_MSG[code] || MIC_MSG.error), 6000);
  if (code === "unsupported" || code === "service" || code === "network") { try { $("#q").focus(); } catch {} }
}
// A few spoken commands; anything else is treated as a place to search
function voiceCommand(s) {
  const x = s.toLowerCase().trim();
  if (x.split(/\s+/).length > 5) return false;
  const ac = x.match(/(\d+)\s*(एकड़|एकर|acre)/);
  if (ac && state.point) { $("#acres").value = Math.max(0.25, Math.min(200, +ac[1])); drawSquare(); renderGuide(false); return true; }
  if (/(नतीजा|रिज़ल्ट|रिजल्ट|result|जांच करो|check)/.test(x) && state.point) { analyse(); return true; }
  if (/(मेरी लोकेशन|my location|मैं कहाँ|मैं कहां)/.test(x)) { locateMe(); return true; }
  const go = [[/(मंडी भाव|भाव बताओ|mandi (rate|price)|^भाव$|^prices?$)/, "prices"], [/(मौसम|weather)/, "weather"], [/(क्या बो|कौन सी फसल|what to grow|which crop)/, "advice"], [/(मिट्टी कार्ड|मृदा कार्ड|soil card)/, "soilcard"], [/(तकनीक|वीडियो|technique|video)/, "techniques"], [/(नक्शा दिखाओ|^नक्शा$|^map$|वापस जाओ|go back)/, "land"]].find(([re]) => re.test(x));
  if (go) { showTab(go[1]); return true; }
  return false;
}
function heard(text) {
  const s = Voice.tidyHeard(text);
  $("#q").value = s;
  if (s && !voiceCommand(s)) runSearch(s);
}
$("#micBtn").onclick = () => {
  const b = $("#micBtn");
  if (b.classList.contains("on")) { Voice.stopListening(); b.classList.remove("on"); return; }
  if (!Voice.canListen) return micProblem("unsupported");
  Voice.listen(getLang(), {
    onState: (on) => { b.classList.toggle("on", on); if (on) toast(t("speakNow"), 3500); },
    onPartial: (tx) => ($("#q").value = tx),
    onText: heard,
    onError: micProblem,
  });
};
function locateMe() {
  if (!navigator.geolocation) { toast(t("noGps")); return; }
  toast(t("findingYou"));
  navigator.geolocation.getCurrentPosition((p) => { map.setView([p.coords.latitude, p.coords.longitude], 17); setPoint(p.coords.latitude, p.coords.longitude, false); }, () => toast(t("gpsDenied")), { enableHighAccuracy: true, timeout: 15000 });
}
$("#fabLocate").onclick = locateMe;
$("#fabIn").onclick = () => map.zoomIn();
$("#fabOut").onclick = () => map.zoomOut();

/* ---------------- the three-step guide ---------------- */
const G = {
  start: { hi: ["अपना पिन कोड लिखें", "ऊपर के डिब्बे में पिन कोड या गाँव का नाम लिखें। या लोकेशन बटन दबाएं।"], en: ["Enter your PIN code", "Type your PIN code or village name in the box above. Or press the location button."] },
  tap: { hi: ["अपने खेत पर उंगली रखें", "नक्शे को दो उंगलियों से बड़ा करें, फिर अपने खेत के बीच में एक बार उंगली रखें।"], en: ["Tap on your field", "Pinch to make the map bigger, then tap once in the middle of your field."] },
  size: { hi: ["खेत कितना बड़ा है?", "एकड़ चुनें, फिर हरा बटन दबाएं।"], en: ["How big is the field?", "Choose the acres, then press the green button."] },
  draw: { hi: ["खेत के कोनों पर उंगली रखें", "एक-एक करके हर कोने पर उंगली रखें। पूरा होने पर 'हो गया' दबाएं।"], en: ["Tap the corners of the field", "Tap each corner one by one. Press Done when finished."] },
  load: { hi: ["सैटेलाइट आपका खेत देख रहा है", "थोड़ा रुकें, आधा मिनट लगेगा।"], en: ["The satellite is reading your field", "Please wait, it takes about half a minute."] },
  done: { hi: ["नतीजा तैयार है", "नीचे अपने खेत का पूरा हाल देखें।"], en: ["Your result is ready", "See the full picture of your field below."] },
};
const SAY_GUIDE = {
  start: { hi: "नमस्ते। यह ऐप सैटेलाइट से आपके खेत की जांच करता है। सबसे पहले, ऊपर के सफ़ेद डिब्बे में अपना पिन कोड या गाँव का नाम लिखें, और खोजें दबाएं। आप माइक दबाकर बोल भी सकते हैं। या फिर, मेरी लोकेशन वाला हरा बटन दबाएं।", en: "Hello. This app checks your field from a satellite. First, type your PIN code or village name in the white box at the top and press search. You can also press the microphone and speak. Or press the green My location button." },
  tap: { hi: "नक्शा आपके इलाके पर आ गया है। अब दो उंगलियों से नक्शे को बड़ा करें और अपना खेत ढूंढें। फिर अपने खेत के बीच में एक बार उंगली रखें।", en: "The map has moved to your area. Now pinch with two fingers to make it bigger and find your field. Then tap once in the middle of your field." },
  size: { hi: "खेत चुन लिया गया है। पीला डिब्बा आपका खेत दिखा रहा है। अब बताएं कि खेत कितने एकड़ का है। एक, दो, तीन, पांच या दस में से चुनें। अगर खेत का आकार अलग है, तो सीमा बनाएं दबाएं। फिर हरा बटन, नतीजा देखें, दबाएं।", en: "Your field is selected. The yellow box shows it. Now choose how many acres it is. If the shape is different, press Draw boundary. Then press the green See result button." },
  draw: { hi: "अब अपने खेत के हर कोने पर एक-एक करके उंगली रखें। जब सारे कोने हो जाएं, तो हो गया दबाएं।", en: "Now tap each corner of your field, one by one. When all corners are done, press Done." },
  load: { hi: "सैटेलाइट की तस्वीरों से आपके खेत की जांच हो रही है। आधा मिनट रुकें।", en: "Your field is being checked from satellite images. Please wait half a minute." },
  done: { hi: "नतीजा तैयार है। नीचे देखें। हर डिब्बे के पास बने स्पीकर को दबाकर आप उसे सुन सकते हैं।", en: "Your result is ready. Look below. Press the speaker on any box to hear it." },
};
const step = () => (state.busy ? "load" : state.drawing ? "draw" : state.report && state.reportFor === fieldParam() ? "done" : state.point ? "size" : state.searched ? "tap" : "start");
let lastSpoken = "";
function renderGuide(sayIt = true) {
  const s = step(), [title, text] = G[s][getLang()];
  const n = { start: 1, tap: 2 }[s] || 3;
  const acres = +$("#acres").value || 2, drawn = state.vertices.length >= 3 && !state.drawing;
  let body = "";
  if (s === "start") body = `<button class="btn big" id="gLocate" type="button">${ic("locate")}${t("myLoc")}</button>`;
  if (s === "tap") body = `<p class="place">${ic("map-pin")}<span>${esc(state.areaLabel || "")}</span></p>`;
  if (s === "size") body = `<p class="place">${ic("map-pin")}<span id="placeName">${esc(state.placeName || `${state.point[0].toFixed(4)}, ${state.point[1].toFixed(4)}`)}</span></p>
    ${drawn ? `<p class="place">${ic("scale")}<span>${areaAcres(currentFeature()).toFixed(2)} ${t("acres")}</span></p>` : `<div class="sizes">${[1, 2, 3, 5, 10].map((a) => `<button type="button" data-ac="${a}" class="${acres === a ? "on" : ""}"><b>${a}</b><small>${t("acres")}</small></button>`).join("")}<button type="button" id="gDraw">${ic("pencil-line")}<small>${t("drawOwn")}</small></button></div>`}
    <div class="row"><button class="btn big" id="gGo" type="button">${ic("satellite")}${t("seeResult")}</button><button class="iconbtn" id="gClear" type="button" aria-label="${t("clear")}">${ic("x")}</button></div>`;
  if (s === "draw") body = `<div class="row"><button class="btn big" id="gDone" type="button" ${state.vertices.length < 3 ? "disabled" : ""}>${ic("circle-check")}${t("done")} (${state.vertices.length})</button><button class="btn line big" id="gCancel" type="button">${t("clear")}</button></div>`;
  if (s === "load") body = `<div id="progress" class="progress"><div class="bar"></div><span class="ptext"></span></div>`;
  if (s === "done") body = `<div class="row"><button class="btn big" id="gShow" type="button">${ic("circle-check")}${t("seeResult")}</button><button class="btn line big" id="gNew" type="button">${t("newField")}</button></div>`;
  $("#guide").innerHTML = `<div class="ghead"><span class="gstep">${n}<small>/3</small></span><div class="gtext"><h2>${title}</h2><p>${text}</p></div><button class="say big" type="button" data-say="guide" aria-label="${t("listen")}">${ic("volume-2")}</button></div>${body}`;
  const on = (id, fn) => { const el = $("#" + id); if (el) el.onclick = fn; };
  on("gLocate", locateMe); on("gDraw", startDraw); on("gGo", analyse); on("gClear", resetField);
  on("gDone", () => finishDraw(true)); on("gCancel", () => finishDraw(false));
  on("gShow", () => $("#report").scrollIntoView({ behavior: "smooth" })); on("gNew", resetField);
  $$("#guide [data-ac]").forEach((b) => (b.onclick = () => { $("#acres").value = b.dataset.ac; drawSquare(); renderGuide(false); }));
  setTimeout(() => map.invalidateSize(), 60);
  if (sayIt && state.voiceOn && s !== lastSpoken) { lastSpoken = s; say(L_(SAY_GUIDE[s]), $("#guide .say")); }
}
function progress(done, total) {
  const p = $("#progress"); if (!p) return;
  $(".bar", p).style.width = total ? `${(100 * done) / total}%` : "6%";
  $(".ptext", p).textContent = total ? `${t("working")} ${done}/${total}` : t("working");
}

/* ---------------- map layers ---------------- */
async function applyLayers() {
  [s2Layer, modisLayer, isroLayer].forEach((l) => l && map.removeLayer(l));
  s2Layer = modisLayer = isroLayer = null;
  const ov = rs.overlay;
  if (ov === "nasa") modisLayer = L.tileLayer(RS.gibsTiles("modis", rs.date), { maxNativeZoom: 9, maxZoom: 21, zIndex: 2, attribution: ATTR_NASA }).addTo(map);
  else if (ov !== "none") {
    const opacity = ov === "true" || ov === "false" ? 1 : rs.opacity;
    const sc = rs.scene || rs.auto;
    if (sc) s2Layer = L.tileLayer(RS.sceneTiles(sc.id, ov), { minZoom: 8, maxNativeZoom: 15, maxZoom: 21, zIndex: 3, opacity, crossOrigin: "anonymous", attribution: ATTR_S2 });
    else {
      rs.mosaic = rs.mosaic || (await RS.latestMosaic(30, 5).catch(() => null));
      if (rs.mosaic && rs.overlay === ov) s2Layer = L.tileLayer(RS.mosaicTiles(rs.mosaic.sid, ov), { minZoom: 9, maxNativeZoom: 15, maxZoom: 21, zIndex: 3, opacity, attribution: ATTR_S2 });
    }
    if (s2Layer) s2Layer.addTo(map);
  }
  if (rs.isro) isroLayer = L.tileLayer.wms(src.BHUVAN_WMS, { layers: src.BHUVAN_LULC, format: "image/png", transparent: true, version: "1.1.1", opacity: 0.55, maxZoom: 21, zIndex: 4, attribution: "ISRO Bhuvan (NRSC)" }).addTo(map);
  await applyNasa();
  labels[rs.names ? "addTo" : "remove"](map);
  updateBadge(); renderLegend(); renderViewChips();
}
async function applyNasa() {
  for (const k of Object.keys(rs.nasa)) {
    if (nasaOverlays[k]) { map.removeLayer(nasaOverlays[k]); delete nasaOverlays[k]; }
    if (!rs.nasa[k]) continue;
    if (RS.NASA[k].vector) {
      const pts = await RS.firesOn(RS.nasaDate(k, rs.date)).catch(() => []);
      rs.fireCount = pts.length;
      nasaOverlays[k] = L.layerGroup(pts.map((f) => L.circleMarker([f.lat, f.lon], { radius: 5, color: "#fff", weight: 1, fillColor: "#ff3b1f", fillOpacity: 0.95 })
        .bindPopup(`<b>${T2("Fire seen by satellite", "सैटेलाइट ने आग देखी")}</b><br>${f.date}<br>VIIRS NOAA-20`)));
    } else nasaOverlays[k] = L.tileLayer(RS.gibsTiles(k, RS.nasaDate(k, rs.date)), { maxNativeZoom: RS.NASA[k].lvl, maxZoom: 21, zIndex: 5, opacity: rs.opacity, attribution: ATTR_NASA });
    nasaOverlays[k].addTo(map);
  }
}
function updateBadge() {
  const ov = rs.overlay;
  let txt = ov === "none" ? (rs.photo ? T2(`Photo taken ${monthYear(rs.photo.date)}. It is not today's picture.`, `यह फोटो ${monthYear(rs.photo.date)} की है। आज की नहीं।`) : T2("Sharp photo (older picture)", "साफ़ फोटो (पुरानी तस्वीर)"))
    : ov === "nasa" ? `NASA MODIS, ${fmtDate(rs.date)}`
    : rs.scene || rs.auto ? T2(`Satellite image of ${fmtDate((rs.scene || rs.auto).date)} (${agoText((rs.scene || rs.auto).date)})`, `सैटेलाइट तस्वीर ${fmtDate((rs.scene || rs.auto).date)} की (${agoText((rs.scene || rs.auto).date)})`)
    : T2("Newest clear satellite image", "सबसे नई साफ़ सैटेलाइट तस्वीर");
  if (ov !== "none" && ov !== "nasa" && map.getZoom() < 9) txt = T2("Zoom in to see the satellite image", "सैटेलाइट तस्वीर देखने के लिए नक्शा बड़ा करें");
  if (rs.nasa.fires && rs.fireCount != null) txt += `, ${rs.fireCount} ${T2("fires", "जगह आग")}`;
  $("#imgBadge").innerHTML = `${ic(ov === "none" ? "image" : "satellite")}<span>${esc(txt)}</span>`;
}
map.on("zoomend", updateBadge);
function renderLegend() {
  const keys = [];
  if (rs.overlay === "ndvi" || rs.overlay === "ndmi") keys.push(rs.overlay);
  for (const k of Object.keys(rs.nasa)) if (rs.nasa[k] && RS.NASA[k].legend) keys.push(RS.NASA[k].legend);
  const box = $("#legendBox");
  box.classList.toggle("hidden", !keys.length);
  box.innerHTML = keys.map((k) => { const g = RS.LEGENDS[k]; return `<div class="lg"><span>${L_(g.lo)}</span><div class="ramp" style="background:${g.ramp}"></div><span>${L_(g.hi_)}</span></div>`; }).join("");
}
const VIEW_CHIPS = [["none", "image", { en: "Sharp photo", hi: "साफ़ फोटो" }], ["true", "satellite", { en: "Latest image", hi: "ताज़ा तस्वीर" }], ["ndvi", "leaf", { en: "Crop health", hi: "फसल सेहत" }]];
const monthYear = (iso) => new Date(iso).toLocaleDateString(getLang() === "hi" ? "hi-IN" : "en-IN", { month: "short", year: "numeric" });
const dayMonth = (iso) => new Date(iso).toLocaleDateString(getLang() === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const daysAgo = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 864e5));
const agoText = (iso) => { const d = daysAgo(iso); return d === 0 ? T2("today", "आज") : d === 1 ? T2("yesterday", "कल") : T2(`${d} days ago`, `${d} दिन पहले`); };
function chipDate(k) {
  if (k === "none") return rs.photo ? monthYear(rs.photo.date) : "";
  const sc = rs.scene || rs.auto;
  return sc ? dayMonth(sc.date) : "";
}
function renderViewChips() {
  $("#viewChips").innerHTML = VIEW_CHIPS.map(([k, icn, lab]) => { const d = chipDate(k); return `<button type="button" data-ov="${k}" class="${rs.overlay === k ? "on" : ""}">${ic(icn)}<span>${L_(lab)}${d ? `<small>${d}</small>` : ""}</span></button>`; }).join("") + `<button type="button" id="moreLayers" aria-label="${T2("More layers", "और परतें")}">${ic("layers")}</button>`;
  $$("#viewChips [data-ov]").forEach((b) => (b.onclick = () => { rs.overlay = b.dataset.ov; if (rs.overlay !== "none" && map.getZoom() < 10) toast(T2("Zoom in to see the satellite image", "सैटेलाइट तस्वीर देखने के लिए नक्शा बड़ा करें")); applyLayers(); }));
  $("#moreLayers").onclick = () => {
    const p = $("#layerPanel");
    if (!p.classList.contains("hidden")) return goBack();
    renderLayerPanel(); p.classList.remove("hidden");
    try { history.pushState({ tab: state.tab || "land", panel: true }, ""); navDepth++; } catch {}
  };
}
// Real dates for what is on the map: when the sharp photo was taken here, and the newest satellite pass here
let whenTimer = null;
function refreshMapDates() {
  clearTimeout(whenTimer);
  whenTimer = setTimeout(async () => {
    if (map.getZoom() < 11) return;
    const c = map.getCenter();
    const [photo, scenes] = await Promise.all([src.photoDate(c.lat, c.lng), rs.scene ? null : RS.scenesAt(c.lat, c.lng, 30, 40).catch(() => null)]);
    rs.photo = photo;
    if (scenes && scenes.length) {
      // newest pass that is clear enough to look at; the map shows exactly this pass, so its date is exact
      const best = scenes.find((s) => s.cloud <= 10) || scenes[0], changed = !rs.auto || rs.auto.id !== best.id;
      rs.auto = best;
      if (changed && !rs.scene && rs.overlay !== "none" && rs.overlay !== "nasa") return applyLayers();
    }
    renderViewChips(); updateBadge();
  }, 700);
}
map.on("moveend", refreshMapDates);
function renderLayerPanel() {
  const p = $("#layerPanel"), hi = getLang() === "hi";
  const opt = (type, attr, checked, label, sub = "") => `<label class="opt"><input type="${type}" ${attr} ${checked ? "checked" : ""}><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span></label>`;
  const views = [["none", t("lpPhoto"), t("lpPhotoSub")], ["true", L_(RS.VIEWS.true), ""], ["ndvi", L_(RS.VIEWS.ndvi), ""], ["false", L_(RS.VIEWS.false), ""], ["ndmi", L_(RS.VIEWS.ndmi), ""], ["nasa", t("lpNasa"), t("lpNasaSub")]];
  p.innerHTML = `<div class="lp-head"><b>${ic("layers")}${t("layersTitle")}</b><button class="iconbtn" type="button" id="lpClose" aria-label="Close">${ic("x")}</button></div>
    <div class="lp-sec"><h4>${t("lpImage")}</h4>${views.map(([k, l, s]) => opt("radio", `name="ov" value="${k}"`, rs.overlay === k, l, s)).join("")}</div>
    <div class="lp-sec"><h4>${T2("Sentinel-2 date", "Sentinel-2 की तारीख")}</h4>
      <select id="lpScene"><option value="">${t("lpLatest")}</option>${rs.scenes.map((s) => `<option value="${s.id}" ${rs.scene?.id === s.id ? "selected" : ""}>${fmtDate(s.date)}, ${hi ? "बादल" : "cloud"} ${Math.round(s.cloud)}%</option>`).join("")}</select>
      <p class="hint">${t("lpSceneSub")}</p></div>
    <div class="lp-sec"><h4>ISRO</h4>${opt("checkbox", 'id="lpIsro"', rs.isro, T2("Land use map (ISRO Bhuvan, NRSC)", "भूमि उपयोग नक्शा (ISRO भुवन, NRSC)"), T2("Crop land, built-up, water, forest. Survey of 2015-16.", "खेती, आबादी, पानी, जंगल। 2015-16 का सर्वे।"))}</div>
    <div class="lp-sec"><h4>${t("lpNasaLayers")}</h4>${Object.keys(rs.nasa).map((k) => opt("checkbox", `data-nasa="${k}"`, rs.nasa[k], L_(RS.NASA[k]))).join("")}
      <div class="row"><button class="iconbtn" type="button" id="lpPrev" aria-label="Previous day">${ic("chevron-right", "flip")}</button><input type="date" id="lpDate" value="${rs.date}" max="${yesterday()}" min="2015-01-01"><button class="iconbtn" type="button" id="lpNext" aria-label="Next day">${ic("chevron-right")}</button></div>
      <p class="hint">${t("lpDateHint")}</p></div>
    <div class="lp-sec">${opt("checkbox", 'id="lpNames"', rs.names, t("lpNames"))}<label class="f"><span>${t("lpOpacity")}</span><input type="range" id="lpOpacity" min="0.2" max="1" step="0.05" value="${rs.opacity}"></label></div>`;
  $("#lpClose").onclick = goBack;
  $$('input[name="ov"]', p).forEach((r) => (r.onchange = () => { rs.overlay = r.value; applyLayers(); }));
  $("#lpScene").onchange = (e) => { rs.scene = rs.scenes.find((s) => s.id === e.target.value) || null; if (rs.overlay === "none" || rs.overlay === "nasa") rs.overlay = "true"; applyLayers().then(renderLayerPanel); };
  $("#lpIsro").onchange = (e) => { rs.isro = e.target.checked; applyLayers(); };
  $$("[data-nasa]", p).forEach((c) => (c.onchange = () => { rs.nasa[c.dataset.nasa] = c.checked; applyNasa().then(() => { updateBadge(); renderLegend(); }); }));
  $("#lpNames").onchange = (e) => { rs.names = e.target.checked; applyLayers(); };
  const setDate = (d) => { rs.date = d > yesterday() ? yesterday() : d; $("#lpDate").value = rs.date; applyLayers(); };
  $("#lpDate").onchange = (e) => e.target.value && setDate(e.target.value);
  const stepDay = (n) => { const d = new Date(rs.date + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); setDate(d.toISOString().slice(0, 10)); };
  $("#lpPrev").onclick = () => stepDay(-1); $("#lpNext").onclick = () => stepDay(1);
  $("#lpOpacity").oninput = (e) => { rs.opacity = +e.target.value; if (s2Layer && rs.overlay !== "true" && rs.overlay !== "false") s2Layer.setOpacity(rs.opacity); Object.values(nasaOverlays).forEach((l) => l.setOpacity?.(rs.opacity)); };
  if (!rs.scenes.length) { const c = map.getCenter(); RS.scenesAt(c.lat, c.lng, 120, 40).then((s) => { rs.scenes = s; if (!p.classList.contains("hidden") && s.length) renderLayerPanel(); }).catch(() => {}); }
}
applyLayers();

/* ---------------- analysis ---------------- */
let analyseRun = 0;
const within = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), ms))]);
// Redraw the result when late data lands, without closing what the farmer has open
function refreshReport() {
  const open = $("#moreBox")?.open;
  renderReport();
  if (open && $("#moreBox")) $("#moreBox").open = true;
}
const isS2 = (row) => row && row.sensor !== "landsat";
const latestS2 = (r) => [...r.series].reverse().find(isS2) || null;
// opts.auto: started by the app itself (saved field on opening, or a new satellite pass) - no scrolling, no talking
async function analyse(opts = {}) {
  const auto = opts.auto === true;
  const feature = currentFeature();
  if (!feature || state.busy) return;
  const [lat, lon] = state.point, run = ++analyseRun;
  if (outsideHaryana(lat, lon) && !auto) toast(t("outside"));
  state.busy = true; state.feature = feature; state.areaAcres = areaAcres(feature);
  if (!auto) state.fpMode = null;
  saveField(); renderGuide(!auto); progress(0, 0);
  // Quick answer first: newest satellite passes, soil wetness, land use and forecast. History, soil map and climate fill in after.
  const soilP = src.soilProfile(lat, lon), climP = src.climateHistory(lat, lon), histP = src.fieldHistory(feature, (d, n) => { const h = $("#histNote"); if (h && run === analyseRun) h.textContent = `${T2("Reading older images", "पुरानी तस्वीरें पढ़ रहे हैं")} ${d}/${n}`; });
  [soilP, climP, histP].forEach((p) => p.catch(() => {}));
  const satP = src.fieldLatest(feature);
  // the cell-by-cell picture of the field starts the moment the newest passes are known
  const pxP = satP.then((s) => within(Field.analyse(feature, s.series), 12000)).catch(() => null);
  const tasks = { sat: satP, px: pxP, soil: within(soilP, 6000), fc: src.forecast(lat, lon), prices: src.mandiPrices(), wet: src.soilWetness(lat, lon), lulc: src.landUse(lat, lon) };
  let n = 0; const total = Object.keys(tasks).length;
  Object.values(tasks).forEach((p) => p.catch(() => {}).finally(() => run === analyseRun && state.busy && progress(++n, total)));
  const keys = Object.keys(tasks), settled = await Promise.allSettled(Object.values(tasks)), R = {};
  if (run !== analyseRun) return;
  settled.forEach((s, i) => (R[keys[i]] = s.status === "fulfilled" ? s.value : { error: s.reason?.message || String(s.reason) }));
  const ok = (k) => (R[k] && !R[k].error ? R[k] : null);
  const series = R.sat?.series || [];
  const r = (state.report = { lat, lon, series, px: ok("px"), scenesFound: R.sat?.scenesFound, newestPass: R.sat?.newestPass, satError: R.sat?.error, soil: ok("soil"), soilPending: !ok("soil"), historyPending: true, climate: null, wet: ok("wet"), lulc: ok("lulc"), neighbour: null, photo: null, at: new Date(), checkedAt: Date.now() });
  state.reportFor = fieldParam();
  if (ok("fc")) { state.forecast = R.fc; state.forecastFor = { lat, lon, label: L_(state.district) }; }
  if (ok("prices")) { state.prices = R.prices; watchLivePrices(); }
  const s2 = latestS2(r);
  if (s2) { const p = s2.item.properties; rs.scene = { id: s2.item.id, date: p.datetime, cloud: p["eo:cloud_cover"], platform: p.platform || "" }; if (!auto) rs.overlay = "ndvi"; applyLayers(); }
  state.busy = false;
  renderGuide(false); renderReport();
  if (!auto) { $("#report").scrollIntoView({ behavior: "smooth" }); if (state.voiceOn) say(sayText("all"), $("#sayAll")); }
  const mine = () => run === analyseRun && state.report === r;
  src.photoDate(lat, lon).then((p) => { if (mine() && p) { r.photo = p; refreshReport(); } });
  if (s2) src.neighbourhoodNdvi(s2.item, lat, lon, 1000).then((v) => { if (mine() && v != null) { r.neighbour = v; refreshReport(); } }).catch(() => {});
  if (r.soilPending) soilP.then((s) => { if (mine()) { r.soil = s; r.soilPending = false; refreshReport(); } }).catch((e) => { if (mine()) { r.soilPending = false; r.soilError = e?.message || String(e); refreshReport(); } });
  climP.then((cl) => { if (mine()) { r.climate = cl; refreshReport(); } }).catch(() => {});
  // A second satellite: if Landsat 8/9 had a clear view after the newest clear Sentinel-2 view, use its reading too
  const lastClear = [...series].reverse().find((x) => x.cloud <= 0.05);
  src.landsatNewer(feature, lastClear ? lastClear.date : null).then((row) => { if (mine() && row) { r.series = [...r.series, row].sort((x, y) => x.date.localeCompare(y.date)); refreshReport(); } }).catch(() => {});
  histP.then(async (h) => {
    if (!mine()) return;
    const seen = new Set(r.series.map((x) => x.date));
    r.series = [...h.filter((x) => !seen.has(x.date)), ...r.series].sort((x, y) => x.date.localeCompare(y.date));
    r.historyPending = false;
    // with the older passes in hand, a comparison picture can be made if the newest few passes could not give one
    if (!r.px || !r.px.ref) { const px = await within(Field.analyse(feature, r.series), 12000).catch(() => null); if (mine() && px && (px.ref || !r.px)) r.px = px; }
    if (mine()) refreshReport();
  }).catch(() => { if (mine()) { r.historyPending = false; refreshReport(); } });
}

/* ---------------- automatic refresh: a new satellite pass shows up by itself ---------------- */
async function checkForNewPass() {
  const r = state.report;
  if (!r || state.busy || document.hidden || !state.feature || state.reportFor !== fieldParam()) return;
  if (Date.now() - (r.checkedAt || 0) < 15 * 60e3) return;
  r.checkedAt = Date.now();
  const d = await src.newestPass(state.feature).catch(() => null);
  if (d && r.newestPass && d > r.newestPass) {
    src.forgetScenes();
    toast(T2(`A new satellite image has come (${fmtDate(d)}). Updating your field.`, `नई सैटेलाइट तस्वीर आई है (${fmtDate(d)})। आपका खेत दोबारा देख रहे हैं।`), 5000);
    analyse({ auto: true });
  } else if ($("#lastCheck")) $("#lastCheck").textContent = checkedText(r);
}
const checkedText = (r) => `${T2("Last checked", "पिछली जांच")}: ${new Date(r.checkedAt || r.at).toLocaleTimeString(getLang() === "hi" ? "hi-IN" : "en-IN", { hour: "numeric", minute: "2-digit" })}`;
setInterval(checkForNewPass, 5 * 60e3);
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkForNewPass(); });

/* ---------------- plain-language verdicts ---------------- */
const TEXTURE_WORD = { clay: { en: "Heavy clay soil", hi: "चिकनी मिट्टी" }, "silty clay": { en: "Heavy clay soil", hi: "चिकनी मिट्टी" }, "sandy clay": { en: "Clay soil with sand", hi: "रेत वाली चिकनी मिट्टी" }, "clay loam": { en: "Clay loam (good, holds water)", hi: "चिकनी दोमट (अच्छी, पानी रोकती है)" }, "silty clay loam": { en: "Clay loam (good, holds water)", hi: "चिकनी दोमट (अच्छी, पानी रोकती है)" }, "sandy clay loam": { en: "Loam soil", hi: "दोमट मिट्टी" }, loam: { en: "Loam (best for most crops)", hi: "दोमट (ज़्यादातर फसलों के लिए सबसे अच्छी)" }, "silty loam": { en: "Silty loam (fertile)", hi: "गाद वाली दोमट (उपजाऊ)" }, silt: { en: "Silty soil", hi: "गाद वाली मिट्टी" }, "sandy loam": { en: "Sandy loam (light, drains fast)", hi: "रेतीली दोमट (हल्की, पानी जल्दी सोखती है)" }, "loamy sand": { en: "Sandy soil", hi: "रेतीली मिट्टी" }, sand: { en: "Sandy soil", hi: "रेतीली मिट्टी" } };
const LULC_WORD = { Agriculture: { en: "farm land", hi: "खेती की ज़मीन" }, Builtup: { en: "built-up area", hi: "आबादी / मकान" }, Forest: { en: "forest", hi: "जंगल" }, Wastelands: { en: "waste land", hi: "बंजर ज़मीन" }, Waterbodies: { en: "water", hi: "पानी" }, "Grass/Grazing": { en: "grazing land", hi: "चरागाह" } };
const SIDE_WORD = { n: { en: "north", hi: "उत्तर" }, s: { en: "south", hi: "दक्षिण" }, e: { en: "east", hi: "पूरब" }, w: { en: "west", hi: "पश्चिम" }, ne: { en: "north-east", hi: "उत्तर-पूरब" }, nw: { en: "north-west", hi: "उत्तर-पश्चिम" }, se: { en: "south-east", hi: "दक्षिण-पूरब" }, sw: { en: "south-west", hi: "दक्षिण-पश्चिम" } };
const sideText = (s) => (s && SIDE_WORD[s] ? T2(` (${SIDE_WORD[s].en} side)`, ` (${SIDE_WORD[s].hi} की तरफ़)`) : "");
const partIn = (f) => (f >= 0.85 ? T2("in almost the whole field", "लगभग पूरे खेत में") : f >= 0.6 ? T2("in most of the field", "खेत के ज़्यादातर हिस्से में") : f >= 0.38 ? T2("in about half of the field", "लगभग आधे खेत में") : f >= 0.2 ? T2("in about a quarter of the field", "खेत के लगभग चौथाई हिस्से में") : T2("in a small part of the field", "खेत के छोटे हिस्से में"));
const partWord = (f) => (f >= 0.85 ? T2("almost the whole field", "लगभग पूरा खेत") : f >= 0.6 ? T2("most of the field", "खेत का ज़्यादातर हिस्सा") : f >= 0.38 ? T2("about half of the field", "लगभग आधा खेत") : f >= 0.2 ? T2("about a quarter of the field", "खेत का लगभग चौथाई हिस्सा") : T2("a small part of the field", "खेत का छोटा हिस्सा"));
const satName = (row) => { const p = (row.item.properties.platform || "").toLowerCase(); return p.startsWith("landsat") ? `Landsat ${p.slice(-1)} (30 m)` : `Sentinel-2${p.slice(-1) ? p.slice(-1).toUpperCase() : ""} (10 m)`; };
// What changed in the field between two clear satellite passes: cut (harvested), less green, greener, or the same
function changeVerdict(r) {
  const base = { key: "change", icon: "scissors", title: T2("What changed", "क्या बदला") };
  const px = r.px, ch = px && px.change;
  if (ch) {
    const a = dayMonth(px.ref.date), b = dayMonth(px.now.date), foot = `Sentinel-2: ${fmtDate(px.ref.date)} → ${fmtDate(px.now.date)}`;
    if (ch.cut >= 0.1) {
      const whole = ch.cut >= 0.85, standing = px.health[2] + px.health[3] >= 0.2;
      return { ...base, level: "info", foot, big: whole ? T2("Field looks harvested", "फसल कट गई लगती है") : T2(`${partWord(ch.cut)} looks cut`, `${partWord(ch.cut)} कटा लगता है`).replace(/^./, (m) => m.toUpperCase()),
        text: T2(`Between ${a} and ${b} the green cover went ${partIn(ch.cut)}${sideText(ch.cutSide)}. It looks harvested or cut.`, `${a} से ${b} के बीच ${partIn(ch.cut)}${sideText(ch.cutSide)} हरियाली खत्म हुई है। वहाँ कटाई हुई लगती है।`) + (!whole && standing ? " " + T2("The rest of the crop is still standing.", "बाकी खेत में फसल अभी खड़ी है।") : "") };
    }
    if (ch.down >= 0.3) return { ...base, level: "warn", foot, big: T2("Greenness has gone down", "हरियाली घटी है"), text: T2(`Between ${a} and ${b} the crop became less green ${partIn(ch.down)}${sideText(ch.downSide)}. If the crop is ripening this is normal. If not, check water, fertiliser and disease in the field.`, `${a} से ${b} के बीच ${partIn(ch.down)}${sideText(ch.downSide)} हरियाली घटी है। फसल पक रही है तो यह ठीक है। नहीं तो खेत में जाकर पानी, खाद और बीमारी देखें।`) };
    if (ch.up >= 0.3) return { ...base, level: "good", foot, big: T2("Crop is growing", "फसल बढ़ रही है"), text: T2(`Between ${a} and ${b} the crop became greener ${partIn(ch.up)}.`, `${a} से ${b} के बीच ${partIn(ch.up)} हरियाली बढ़ी है।`) };
    return { ...base, level: "info", foot, big: T2("No big change", "कोई बड़ा बदलाव नहीं"), text: T2(`Between ${a} and ${b} the field stayed about the same.`, `${a} से ${b} के बीच खेत लगभग वैसा ही है।`) };
  }
  // no cell-by-cell picture: compare the field's average between two clear passes
  const rows = r.series.filter((x) => x.cloud <= 0.05), now = rows[rows.length - 1];
  const before = now && [...rows].reverse().find((x) => Date.parse(now.date) - Date.parse(x.date) >= 5 * 864e5);
  if (!now || !before) return { ...base, level: "info", foot: "", big: T2("Nothing to compare yet", "अभी तुलना नहीं हो सकती"), text: T2("There is no earlier clear image to compare with. Look again after the next satellite pass.", "तुलना के लिए पहले की साफ़ तस्वीर नहीं है। अगली सैटेलाइट तस्वीर के बाद दोबारा देखें।") };
  const d = now.ndvi - before.ndvi, a = dayMonth(before.date), b = dayMonth(now.date), foot = `${fmtDate(before.date)} → ${fmtDate(now.date)}`;
  if (before.ndvi >= 0.35 && d <= -0.15 && now.ndvi < 0.3) return { ...base, level: "info", foot, big: T2("Field looks harvested", "फसल कट गई लगती है"), text: T2(`Between ${a} and ${b} the green cover of the field went. It looks harvested or cut.`, `${a} से ${b} के बीच खेत की हरियाली खत्म हुई है। कटाई हुई लगती है।`) };
  if (before.ndvi >= 0.3 && d <= -0.1) return { ...base, level: "warn", foot, big: T2("Greenness has gone down", "हरियाली घटी है"), text: T2(`Between ${a} and ${b} the field became less green. If the crop is ripening this is normal. If not, check water, fertiliser and disease.`, `${a} से ${b} के बीच खेत की हरियाली घटी है। फसल पक रही है तो यह ठीक है। नहीं तो पानी, खाद और बीमारी देखें।`) };
  if (now.ndvi >= 0.3 && d >= 0.1) return { ...base, level: "good", foot, big: T2("Crop is growing", "फसल बढ़ रही है"), text: T2(`Between ${a} and ${b} the field became greener.`, `${a} से ${b} के बीच खेत में हरियाली बढ़ी है।`) };
  return { ...base, level: "info", foot, big: T2("No big change", "कोई बड़ा बदलाव नहीं"), text: T2(`Between ${a} and ${b} the field stayed about the same.`, `${a} से ${b} के बीच खेत लगभग वैसा ही है।`) };
}
function verdicts(r) {
  const V = [], latest = r.series[r.series.length - 1], prev = r.series[r.series.length - 2];
  if (latest) {
    const n = latest.ndvi, rising = prev && n - prev.ndvi > 0.04, diff = r.neighbour != null ? n - r.neighbour : 0;
    let level, big, text;
    if (n < 0.2) { level = "info"; big = T2("Field is empty", "खेत खाली है"); text = T2("The satellite sees bare soil. The field is empty or was sown recently.", "सैटेलाइट को खाली मिट्टी दिख रही है। खेत खाली है या अभी-अभी बुवाई हुई है।"); }
    else if (n < 0.4) { level = rising ? "good" : "warn"; big = rising ? T2("Crop is coming up", "फसल उग रही है") : T2("Crop is thin", "फसल कमज़ोर है"); text = rising ? T2("Green cover is growing. Young crop looks normal.", "हरियाली बढ़ रही है। छोटी फसल ठीक दिख रही है।") : T2("Green cover is low and not growing. Check water, fertilizer and pests.", "हरियाली कम है और बढ़ नहीं रही। पानी, खाद और कीड़े की जांच करें।"); }
    else if (n < 0.6) { level = "good"; big = T2("Crop is fine", "फसल ठीक है"); text = T2("The crop is growing with medium strength.", "फसल ठीक-ठाक बढ़ रही है।"); }
    else { level = "good"; big = T2("Crop is very good", "फसल बहुत अच्छी है"); text = T2("Dense, healthy green crop.", "घनी और हरी-भरी फसल है।"); }
    if (n >= 0.2 && diff < -0.1) { level = "warn"; text += " " + T2("It is weaker than the fields around it.", "यह आसपास के खेतों से कमज़ोर है।"); }
    else if (n >= 0.2 && diff > 0.1) text += " " + T2("It is better than the fields around it.", "यह आसपास के खेतों से बेहतर है।");
    if (n > 0.5 && latest.ndre != null && latest.ndre < 0.28) text += " " + T2("Leaves look pale: the crop may need nitrogen (urea).", "पत्ते हल्के रंग के दिख रहे हैं: फसल को नाइट्रोजन (यूरिया) की ज़रूरत हो सकती है।");
    const px = r.px && r.px.now.date === latest.date ? r.px : null;
    if (px && px.patchy && n >= 0.25) text += " " + (px.weakShare < 0.5
      ? T2(`${partWord(px.weakShare)}${sideText(px.weakSide)} is weaker than the rest.`, `${partWord(px.weakShare)}${sideText(px.weakSide)} बाकी से कमज़ोर है।`).replace(/^./, (m) => m.toUpperCase())
      : T2(`The crop is not even across the field${px.weakSide ? `: it is weaker on the ${SIDE_WORD[px.weakSide].en} side` : ""}.`, `फसल पूरे खेत में एक जैसी नहीं है${px.weakSide ? `: ${SIDE_WORD[px.weakSide].hi} की तरफ़ ज़्यादा कमज़ोर है` : ""}।`)) + " " + T2("See it in the picture above.", "ऊपर तस्वीर में देखें।");
    else { const uni = uniformity(latest, getLang()); if (uni && n >= 0.3) text += " " + uni; }
    V.push({ key: "crop", icon: "leaf", level, title: T2("Crop health", "फसल की सेहत"), big, text, foot: `${satName(latest)}, ${fmtDate(latest.item.properties.datetime)}` });
    V.push(changeVerdict(r));
    // water
    const rain3 = state.forecast?.daily ? state.forecast.daily.precipitation_sum.slice(0, 3).reduce((a, b) => a + b, 0) : 0;
    const wet = r.wet?.root;
    let wl = "good", wb = T2("Water is fine", "पानी ठीक है"), wt = T2("The crop does not look thirsty.", "फसल में पानी की कमी नहीं दिख रही।");
    if (n >= 0.3 && latest.ndmi != null && latest.ndmi < -0.05) { wl = "warn"; wb = T2("Crop needs water", "फसल को पानी चाहिए"); wt = T2("Moisture in the crop is low. Irrigate soon.", "फसल में नमी कम है। जल्दी सिंचाई करें।"); }
    else if (n < 0.3) { wl = wet != null && wet < 0.3 ? "warn" : "info"; wb = wet != null ? (wet < 0.3 ? T2("Soil is dry", "मिट्टी सूखी है") : wet < 0.6 ? T2("Soil has some moisture", "मिट्टी में नमी है") : T2("Soil is wet", "मिट्टी गीली है")) : T2("No crop to check", "फसल नहीं है"); wt = wet != null ? T2(`NASA shows soil in your area is ${Math.round(wet * 100)}% wet at root depth.`, `NASA के अनुसार आपके इलाके की मिट्टी में जड़ों की गहराई पर ${Math.round(wet * 100)}% नमी है।`) : ""; }
    if (rain3 >= 10) wt += " " + T2(`Rain of about ${Math.round(rain3)} mm is expected in 3 days: hold irrigation.`, `अगले 3 दिन में लगभग ${Math.round(rain3)} मि.मी. बारिश आ सकती है: अभी सिंचाई रोकें।`);
    V.push({ key: "water", icon: "droplets", level: wl, title: T2("Water", "पानी"), big: wb, text: wt.trim(), foot: wet != null ? `NASA POWER, ${fmtDate(r.wet.date)}` : "" });
  } else V.push({ key: "crop", icon: "leaf", level: "info", title: T2("Crop health", "फसल की सेहत"), big: T2("No clear image", "साफ़ तस्वीर नहीं मिली"), text: t("cloudy"), foot: "" });
  // soil
  const s = adviceSoil();
  if (s) {
    const ph = s.phh2o, oc = s.soc != null ? s.soc / 10 : null;
    let level = "good", text = "";
    if (ph != null) { if (ph > 8.5) { level = "warn"; text += T2("Soil is alkaline (usar). Gypsum can help.", "मिट्टी क्षारीय (ऊसर) है। जिप्सम डालने से फ़ायदा होगा।"); } else if (ph > 7.8) text += T2("Soil is slightly alkaline, normal for Haryana.", "मिट्टी हल्की क्षारीय है, जो हरियाणा में आम है।"); else text += T2("Soil reaction is normal.", "मिट्टी सामान्य है।"); }
    if (oc != null && oc < 0.5) { level = "warn"; text += " " + T2("Organic matter is low: add farmyard manure or green manure.", "मिट्टी में जीवांश कम है: गोबर की खाद या हरी खाद डालें।"); }
    V.push({ key: "soil", icon: "mountain", level, title: T2("Soil", "मिट्टी"), big: s.texture ? L_(TEXTURE_WORD[s.texture] || TEXTURE_WORD.loam) : level === "warn" ? T2("Soil needs care", "मिट्टी को सुधार चाहिए") : T2("Soil is fine", "मिट्टी ठीक है"), text: text.trim(), foot: s.fromCard ? T2("From your Soil Health Card", "आपके मृदा स्वास्थ्य कार्ड से") : T2("Estimate from soil map. Scan your Soil Health Card for exact values.", "मिट्टी के नक्शे से अनुमान। सही मान के लिए मृदा कार्ड स्कैन करें।") , row: true, go: "soilcard" });
  }
  if (!s) V.push({ key: "soil", icon: "mountain", level: "info", title: T2("Soil", "मिट्टी"), big: r.soilPending ? T2("Reading the soil map", "मिट्टी का नक्शा पढ़ रहे हैं") : T2("Soil map did not answer", "मिट्टी का नक्शा नहीं खुला"), text: r.soilPending ? T2("This takes a few more seconds.", "इसमें कुछ सेकंड और लगेंगे।") : T2("For the most exact advice, take a photo of your Soil Health Card in the Soil tab.", "सबसे सही सलाह के लिए मिट्टी वाले पन्ने पर अपने मृदा स्वास्थ्य कार्ड की फोटो डालें।"), foot: "" , row: true, go: "soilcard" });
  // weather
  if (state.forecast) {
    const al = weatherAlerts(state.forecast, getLang()), top = al.find((a) => a.level === "high") || al.find((a) => a.level === "medium") || al[0];
    V.push({ key: "weather", icon: "cloud-sun", level: top ? (top.level === "high" ? "bad" : top.level === "medium" ? "warn" : "info") : "good", title: T2("Weather, next 10 days", "मौसम, अगले 10 दिन"), big: top ? T2("Be careful", "सावधान रहें") : T2("Weather is fine", "मौसम ठीक है"), text: top ? `${top.date}: ${top.text}` : T2("No frost, storm or heavy rain is expected.", "पाला, आंधी या भारी बारिश की उम्मीद नहीं है।"), foot: "Open-Meteo" , row: true, go: "weather" });
  }
  // best crop
  try {
    const top = recommend({ season: state.season, district: state.district, soil: s, water: $("#water").value, risk: $("#risk").value, acres: 1, prices: state.prices })[0];
    if (top) V.push({ key: "best", icon: "sprout", level: "good", title: `${T2("Best crop for", "सबसे अच्छी फसल")}: ${L_(SEASONS[state.season])}`, big: L_(top.crop), text: T2(`Expected profit about ${rupee(top.budget.perAcreMid)} per acre in a normal year.`, `सामान्य साल में एक एकड़ से लगभग ${rupee(top.budget.perAcreMid)} का मुनाफ़ा।`), sayText: T2(`Expected profit about ${Voice.sayMoney(top.budget.perAcreMid, "en")} per acre in a normal year.`, `सामान्य साल में एक एकड़ से लगभग ${Voice.sayMoney(top.budget.perAcreMid, "hi")} का मुनाफ़ा हो सकता है।`), foot: "", action: "advice" , row: true, go: "advice" });
  } catch {}
  return V;
}

/* ---------------- result ---------------- */
let ndviChart = null, climChart = null;
const FP_MODES = { health: { en: "Health", hi: "सेहत" }, change: { en: "What changed", hi: "क्या बदला" }, sat: { en: "Latest image", hi: "ताज़ा तस्वीर" }, photo: { en: "Sharp photo", hi: "साफ़ फोटो" } };
function fpAvailable(r) { return [r.px && "health", r.px && r.px.ref && "change", latestS2(r) && "sat", "photo"].filter(Boolean); }
// The picture of the field: the sharp photo to recognise the land, with the satellite's 10 m cells drawn inside the boundary
function applyFieldPic() {
  const r = state.report, pic = $("#fieldPic");
  if (!r || !pic) return;
  const modes = fpAvailable(r), mode = modes.includes(state.fpMode) ? state.fpMode : modes[0], px = r.px, s2 = latestS2(r);
  state.fpMode = mode;
  $$("#fpModes button").forEach((b) => b.classList.toggle("on", b.dataset.m === mode));
  $("#fpPhoto").classList.toggle("hidden", mode === "sat");
  if ($("#fpSat")) $("#fpSat").classList.toggle("hidden", mode !== "sat");
  if (px) Field.draw($("#fpCells"), px, mode);
  $("#fpCells").classList.toggle("hidden", !(px && (mode === "health" || mode === "change")));
  const sw = (col, lab) => `<span><i style="background:${col}"></i>${lab}</span>`;
  let label = "", legend = "";
  if (mode === "health") {
    label = `${fmtDate(px.now.date)}, ${agoText(px.now.date)}`;
    legend = sw(Field.HEALTH_COLOURS[0], T2("Bare", "खाली")) + sw(Field.HEALTH_COLOURS[1], T2("Weak", "कमज़ोर")) + sw(Field.HEALTH_COLOURS[2], T2("Fair", "ठीक")) + sw(Field.HEALTH_COLOURS[3], T2("Strong", "बढ़िया"));
  } else if (mode === "change") {
    label = `${dayMonth(px.ref.date)} → ${dayMonth(px.now.date)}`;
    legend = sw(Field.CHANGE_COLOURS.cut, T2("Cut", "कटा")) + sw(Field.CHANGE_COLOURS.down, T2("Less green", "हरियाली घटी")) + sw(Field.CHANGE_COLOURS.up, T2("Greener", "हरियाली बढ़ी")) + `<span>${T2("No colour: same", "बिना रंग: वैसा ही")}</span>`;
  } else if (mode === "sat") {
    label = `${fmtDate(s2.item.properties.datetime)}, ${agoText(s2.item.properties.datetime)}`;
    legend = `<span>${T2("This satellite sees the ground in 10 metre squares, so small things look soft.", "यह सैटेलाइट ज़मीन को 10 मीटर के खानों में देखता है, इसलिए छोटी चीज़ें धुंधली दिखती हैं।")}</span>`;
  } else {
    label = r.photo ? T2(`Photo of ${monthYear(r.photo.date)}, not today`, `${monthYear(r.photo.date)} की फोटो, आज की नहीं`) : T2("Older photo, not today", "पुरानी फोटो, आज की नहीं");
    legend = `<span>${T2("This sharp photo is for recognising your field. Today's condition is in Health and Latest image.", "यह साफ़ फोटो खेत पहचानने के लिए है। आज का हाल 'सेहत' और 'ताज़ा तस्वीर' में देखें।")}</span>`;
  }
  $("#fpLabel").textContent = label;
  $("#fpLegend").innerHTML = legend;
}
function fieldPicHTML(r) {
  if (!state.feature) return "";
  const box = r.px ? r.px.box : Field.fieldBox(state.feature), [w, s, e, n] = box.bbox, s2 = latestS2(r), clear = [...r.series].reverse().find((x) => x.cloud <= 0.05) || r.series[r.series.length - 1];
  const pts = state.feature.geometry.coordinates[0].map(([x, y]) => `${(((x - w) / (e - w)) * 800).toFixed(1)},${(((n - y) / (n - s)) * 600).toFixed(1)}`).join(" ");
  // Ask for the photo no finer than it exists (zoom 18) and in the frame's own lat/lon shape, so the cells sit exactly on it
  const pw = Math.max(120, Math.min(800, Math.floor(((e - w) / 5.364e-6) * 0.97))), ph = Math.max(60, Math.round((pw * (n - s)) / (e - w)));
  const photo = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${w},${s},${e},${n}&bboxSR=4326&imageSR=4326&size=${pw},${ph}&format=jpg&f=image`;
  const cloudy = clear && r.newestPass && r.newestPass > clear.date ? T2(` The pass of ${dayMonth(r.newestPass)} had cloud over the field.`, ` ${dayMonth(r.newestPass)} की तस्वीर में खेत पर बादल थे।`) : "";
  return `<div class="card fieldcard">
      <div class="fieldpic" id="fieldPic">
        <img id="fpPhoto" src="${photo}" alt="${esc(t("fieldFromSky"))}">
        ${s2 ? `<img id="fpSat" class="hidden" src="${RS.sceneImage(s2.item.id, [w, s, e, n], 800, 600, "true")}" alt="" loading="lazy">` : ""}
        <canvas id="fpCells"></canvas>
        <svg viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true"><polygon points="${pts}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><polygon points="${pts}" fill="none" stroke="#f5a300" stroke-width="2.5" stroke-linejoin="round"/></svg>
        <span class="fp-label" id="fpLabel"></span>
      </div>
      <div class="fp-modes" id="fpModes">${fpAvailable(r).map((m) => `<button type="button" data-m="${m}">${L_(FP_MODES[m])}</button>`).join("")}</div>
      <div class="fp-legend" id="fpLegend"></div>
      <ul class="fp-meta">
        <li>${ic("calendar")}<span>${clear ? `${T2("Satellite image", "सैटेलाइट तस्वीर")}: <b>${fmtDate(clear.item.properties.datetime)}</b> (${agoText(clear.item.properties.datetime)}).${cloudy}` : esc(r.satError || t("cloudy"))}</span></li>
        <li>${ic("scale")}<span>${T2("Field", "खेत")}: <b>${state.areaAcres.toFixed(2)} ${t("acres")}</b>, ${esc(state.placeName || L_(state.district))}</span></li>
        <li>${ic("refresh-cw")}<span>${T2("A new image comes every 2 to 5 days and shows here by itself.", "नई तस्वीर हर 2 से 5 दिन में आती है और यहाँ अपने आप दिखती है।")} <span id="lastCheck">${checkedText(r)}</span></span></li>
      </ul>
    </div>`;
}
function renderReport() {
  const r = state.report;
  if (!r) return;
  const el = $("#report"), lang = getLang(), hi = lang === "hi";
  el.classList.remove("hidden");
  const latest = r.series[r.series.length - 1], s = r.soil;
  const V = (state.verdicts = verdicts(r));
  const notes = interpretSeries(r.series, lang);
  const idx = latest ? [["NDVI", latest.ndvi, T2("Greenness of the crop", "फसल की हरियाली")], ["NDMI", latest.ndmi, T2("Moisture in crop and soil", "फसल और मिट्टी की नमी")], ["NDRE", latest.ndre, T2("Leaf colour (nitrogen hint)", "पत्तों का रंग (नाइट्रोजन का संकेत)")], ["BSI", latest.bsi, T2("Bare soil showing", "खाली मिट्टी कितनी दिख रही है")]].filter((x) => x[1] != null) : [];
  el.innerHTML = `
    <div class="result-head">
      <div><h2>${T2("Your field today", "आपके खेत का हाल")}</h2></div>
      <button class="say big" type="button" id="sayAll" data-say="all" aria-label="${t("listen")}">${ic("volume-2")}</button>
    </div>
    ${fieldPicHTML(r)}
    <div class="verdicts">${V.filter((v) => !v.row).map((v) => `<article class="verdict ${v.level}">
        <div class="vhead"><span class="vicon">${ic(v.icon)}</span><div class="vt"><div class="vlabel">${esc(v.title)}</div><div class="vbig">${esc(v.big)}</div></div><button class="say" type="button" data-say="v:${v.key}" aria-label="${t("listen")}">${ic("volume-2")}</button></div>
        ${v.text ? `<p>${esc(v.text)}</p>` : ""}${v.foot ? `<p class="vfoot">${esc(v.foot)}</p>` : ""}
      </article>`).join("")}</div>
    <div class="card rowlist">${V.filter((v) => v.row).map((v) => `<button type="button" class="rowlink ${v.level}" data-go="${v.go}"><span class="vicon">${ic(v.icon)}</span><span class="rl-t"><small>${esc(v.title)}</small><b>${esc(v.big)}</b></span>${ic("chevron-right")}</button>`).join("")}</div>
    <div class="actionsrow noprint">
      <button class="btn mustard" id="shareBtn" type="button">${ic("share-2")}${t("shareReport")}</button>
      <button class="btn ghost" id="toCard" type="button">${ic("flask-conical")}${t("goCard")}</button>
      <button class="btn ghost" id="toTech" type="button">${ic("book-open-text")}${t("goTech")}</button>
      <button class="btn line" id="printBtn" type="button">${ic("printer")}${t("printReport")}</button>
    </div>
    <details class="card more" id="moreBox"><summary>${ic("satellite")}${T2("Full satellite details", "सैटेलाइट की पूरी जानकारी")}</summary>
      <div class="status">${[["Sentinel-2", r.series.length], ["SoilGrids", s], ["NASA POWER", r.climate || r.wet], ["ISRO Bhuvan", r.lulc], ["Open-Meteo", state.forecast]].map(([n, okk]) => `<span><i class="${okk ? "" : "bad"}"></i>${n}</span>`).join("")}</div>
      <div class="report-head"><div>
        ${latest ? passPanel(latest, lang) : `<p class="hint">${esc(r.satError || t("cloudy"))}</p>`}
        ${r.lulc ? `<p class="isro">${ic("landmark")}<span>${T2("ISRO land-use map (2015-16) marks this place as", "ISRO के भूमि-उपयोग नक्शे (2015-16) में यह जगह")}: <b>${esc(L_(LULC_WORD[r.lulc.group] || { en: r.lulc.group, hi: r.lulc.group }))}</b> (${esc(r.lulc.cls)})</span></p>` : ""}
      </div></div>
      ${idx.length ? `<h3>${T2("What the satellite measured", "सैटेलाइट ने क्या नापा")}</h3><div class="idx">${idx.map(([k, v, d]) => `<div><b>${v.toFixed(2)}</b><span>${k}</span><small>${d}</small></div>`).join("")}</div>` : ""}
      ${notes.length ? notes.map((n) => `<div class="finding">${ic("satellite")}<span>${esc(n)}</span></div>`).join("") : ""}
      ${r.series.length ? `<h3>${t("history")}</h3><div class="chartbox"><canvas id="ndviChart"></canvas></div>${r.historyPending ? `<p class="hint" id="histNote">${T2("Reading older images", "पुरानी तस्वीरें पढ़ रहे हैं")}</p>` : ""}<p class="hint">${hi ? `${r.series.length} साफ़ सैटेलाइट तस्वीरें पढ़ी गईं (कुल ${r.scenesFound ?? 0} में से)।` : `${r.series.length} clear satellite images read (of ${r.scenesFound ?? 0}).`}</p>` : ""}
      <h3>${t("soil")}</h3>
      ${s ? `<div class="soilgrid">
        <div><div class="l">${t("texture")}</div><b>${esc(s.texture)}</b></div>
        <div><div class="l">pH</div><b>${s.phh2o?.toFixed(1) ?? "-"}</b></div>
        <div><div class="l">${t("clay")}</div><b>${[s.clay, s.sand, s.silt].map((v) => (v == null ? "-" : Math.round(v) + "%")).join(" / ")}</b></div>
        <div><div class="l">${t("soc")}</div><b>${s.soc != null ? (s.soc / 10).toFixed(2) + "%" : "-"}</b></div>
        <div><div class="l">${t("nitrogen")}</div><b>${s.nitrogen != null ? s.nitrogen.toFixed(2) + " g/kg" : "-"}</b></div>
        ${r.wet ? `<div><div class="l">${T2("Root-zone wetness (NASA)", "जड़ क्षेत्र की नमी (NASA)")}</div><b>${Math.round(r.wet.root * 100)}%</b></div>` : ""}
      </div><p class="hint">${t("soilTip")}</p>` : `<p class="hint">${t("error")}: ${esc(r.soilError || "")}</p>`}
      ${r.climate ? `<h3>${t("climate")}</h3><div class="chartbox"><canvas id="climChart"></canvas></div>` : ""}
    </details>
    <button class="btn line noprint" id="toMap" type="button">${ic("arrow-up")}${T2("Back to the map", "नक्शे पर वापस")}</button>`;
  $("#shareBtn").onclick = () => shareReport();
  $("#printBtn").onclick = () => { $("#moreBox").open = true; drawCharts(); setTimeout(() => window.print(), 300); };
  $("#toCard").onclick = () => showTab("soilcard");
  $("#toTech").onclick = () => { state.techCat = "star"; showTab("techniques"); };
  $$("#report [data-go]").forEach((b) => (b.onclick = () => showTab(b.dataset.go)));
  $$("#fpModes button").forEach((b) => (b.onclick = () => { state.fpMode = b.dataset.m; applyFieldPic(); }));
  applyFieldPic();
  $("#toMap").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  $("#moreBox").addEventListener("toggle", () => $("#moreBox").open && drawCharts());
}
function drawCharts() {
  const r = state.report, lang = getLang();
  if (!r) return;
  chartTheme();
  if (ndviChart) ndviChart.destroy();
  if (climChart) climChart.destroy();
  if (r.series.length && $("#ndviChart")) ndviChart = new Chart($("#ndviChart"), { type: "line", data: { labels: r.series.map((x) => x.date), datasets: [
    { label: T2("Greenness (NDVI)", "हरियाली (NDVI)"), data: r.series.map((x) => x.ndvi), borderColor: C().green, backgroundColor: alpha(C().green, 0.14), fill: true, tension: 0.3, pointRadius: 2 },
    { label: T2("Moisture (NDMI)", "नमी (NDMI)"), data: r.series.map((x) => x.ndmi), borderColor: C().canal, borderDash: [5, 4], tension: 0.3, pointRadius: 0 }] },
    options: { scales: { y: { min: -0.3, max: 1 } }, plugins: { legend: { position: "bottom" } } } });
  if (r.climate && $("#climChart")) {
    const months = lang === "hi" ? ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुला", "अग", "सित", "अक्टू", "नव", "दिस"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    climChart = new Chart($("#climChart"), { data: { labels: months, datasets: [
      { type: "bar", label: T2("Rain (mm)", "बारिश (मि.मी.)"), data: r.climate.monthly.map((m) => m.rain), backgroundColor: alpha(C().canal, 0.45), yAxisID: "y" },
      { type: "line", label: T2("Hottest day °C", "सबसे गर्म दिन °C"), data: r.climate.monthly.map((m) => m.tmax), borderColor: C().risk, yAxisID: "y1" },
      { type: "line", label: T2("Coldest night °C", "सबसे ठंडी रात °C"), data: r.climate.monthly.map((m) => m.tmin), borderColor: C().canal, yAxisID: "y1" }] },
      options: { scales: { y: { position: "left" }, y1: { position: "right", grid: { drawOnChartArea: false } } }, plugins: { legend: { position: "bottom" } } } });
  }
}

/* ---------------- voice guide: what each speaker button says ---------------- */
function sayText(key, el) {
  const lang = getLang();
  if (key === "guide") return L_(SAY_GUIDE[step()]);
  if (key.startsWith("v:")) { const v = state.verdicts?.find((x) => x.key === key.slice(2)); return v ? `${v.title}. ${v.big}. ${v.sayText || v.text}` : ""; }
  if (key === "all") return (state.verdicts || []).map((v) => `${v.title}. ${v.big}. ${v.sayText || v.text}`).join(" ");
  if (key === "crop") {
    const c = CROPS.find((x) => x.id === el.dataset.id); if (!c) return "";
    return `${L_(c)}. ${T2("Take care of these things.", "इन बातों का ध्यान रखें।")} ${L_(c.precautions).join(" ")}`;
  }
  if (key === "tech") {
    const q = TECHNIQUES.find((x) => x.id === el.dataset.id); if (!q) return "";
    return `${L_(q)}. ${L_(q.what)} ${T2("Benefits.", "फ़ायदे।")} ${L_(q.benefits).join(". ")}. ${T2("How to do it.", "कैसे करें।")} ${L_(q.steps).join(". ")}. ${q.subsidy ? L_(q.subsidy) : ""}`;
  }
  if (key === "tab") {
    const tab = el.dataset.tab, soil = adviceSoil();
    if (tab === "advice") {
      let top = null; try { top = recommend({ season: state.season, district: state.district, soil, water: $("#water").value, risk: $("#risk").value, acres: 1, prices: state.prices })[0]; } catch {}
      return T2("This page shows which crop suits your field. The crop at the top is the best match. For every crop you can see the cost, and the profit in a bad year, a normal year and a good year. First choose whether you have sure water or little water.", "इस पन्ने पर दिखता है कि आपके खेत में कौन सी फसल ठीक रहेगी। सबसे ऊपर वाली फसल सबसे अच्छी है। हर फसल के साथ लागत, और ख़राब साल, सामान्य साल और अच्छे साल का मुनाफ़ा लिखा है। पहले यह चुनें कि आपके पास पानी पक्का है या कम है।") +
        (top ? " " + T2(`Right now the best crop is ${top.crop.en}, with a profit of about ${Voice.sayMoney(top.budget.perAcreMid, "en")} per acre.`, `अभी सबसे अच्छी फसल ${top.crop.hi} है। इसमें एक एकड़ से लगभग ${Voice.sayMoney(top.budget.perAcreMid, "hi")} का मुनाफ़ा हो सकता है।`) : "");
    }
    if (tab === "soilcard") {
      const adv = Object.keys(state.card).length ? card.cardAdvice(state.card, lang).map((a) => a.text).join(" ") : "";
      return T2("Here you can scan your Soil Health Card. Press the big camera box and take a clear photo of the table on your card. The app reads the numbers and tells you how many bags of urea, D A P and potash you need.", "यहाँ आप अपना मृदा स्वास्थ्य कार्ड स्कैन कर सकते हैं। बड़े कैमरे वाले डिब्बे को दबाएं और कार्ड की तालिका की साफ़ फोटो खींचें। ऐप अंक पढ़कर बताएगा कि यूरिया, डी ए पी और पोटाश की कितनी बोरी चाहिए।") + (adv ? " " + T2("About your card.", "आपके कार्ड के बारे में।") + " " + adv : "");
    }
    if (tab === "techniques") return T2("Here are new ways of farming that save water and money. Each card has a photo, the benefits and the government help. Press the red button to watch videos. Press the speaker on a card to hear it.", "यहाँ खेती के नए तरीके हैं जो पानी और पैसा बचाते हैं। हर कार्ड में फोटो, फ़ायदे और सरकारी मदद लिखी है। वीडियो देखने के लिए लाल बटन दबाएं। किसी कार्ड को सुनने के लिए उसका स्पीकर दबाएं।");
    if (tab === "prices") {
      const msp = CROPS.filter((c) => c.msp && c.season === state.season).slice(0, 4).map((c) => T2(`${c.en}, ${c.msp} rupees.`, `${c.hi}, ${c.msp} रुपये।`)).join(" ");
      return T2("This page shows mandi prices and the government support price, per quintal.", "इस पन्ने पर मंडी के भाव और सरकारी समर्थन मूल्य दिखते हैं, प्रति क्विंटल।") + " " + T2("Support prices.", "सरकारी भाव।") + " " + msp;
    }
    if (tab === "weather") {
      const fc = state.forecast, al = fc ? weatherAlerts(fc, lang) : [];
      const d = fc?.daily;
      return T2("This is the weather for the next 10 days.", "यह अगले 10 दिन का मौसम है।") + " " + (d ? T2(`Today the highest temperature is ${Math.round(d.temperature_2m_max[0])} degrees and the lowest is ${Math.round(d.temperature_2m_min[0])} degrees.`, `आज सबसे ज़्यादा तापमान ${Math.round(d.temperature_2m_max[0])} डिग्री और सबसे कम ${Math.round(d.temperature_2m_min[0])} डिग्री रहेगा।`) : "") + " " + (al.length ? al.slice(0, 3).map((a) => `${a.date}. ${a.text}`).join(" ") : T2("No frost, storm or heavy rain is expected.", "पाला, आंधी या भारी बारिश की उम्मीद नहीं है।"));
    }
  }
  return "";
}
function setVoice(on) {
  state.voiceOn = on;
  try { localStorage.setItem("km-voice", on ? "1" : "0"); } catch {}
  const b = $("#voiceBtn");
  b.classList.toggle("on", on);
  b.innerHTML = ic(on ? "volume-2" : "volume-x");
  b.setAttribute("aria-label", on ? T2("Voice guide is on", "आवाज़ गाइड चालू है") : T2("Voice guide is off", "आवाज़ गाइड बंद है"));
  if (!on) Voice.stop();
}
$("#voiceBtn").onclick = () => { setVoice(!state.voiceOn); toast(state.voiceOn ? T2("Voice guide on", "आवाज़ गाइड चालू") : T2("Voice guide off", "आवाज़ गाइड बंद")); if (state.voiceOn) { lastSpoken = ""; renderGuide(); } };
// The reading bar shows the sentence being spoken, with a stop button. If the phone cannot speak, it shows the whole text to read.
const SAY_FAIL = {
  unsupported: { en: "This browser cannot read aloud. Open the site in Chrome or Safari. The text is below.", hi: "यह ब्राउज़र बोलकर नहीं सुना सकता। साइट को Chrome या Safari में खोलें। नीचे लिखा हुआ पढ़ें।" },
  novoice: { en: "This device has no voice for this language. Add one in Settings, Text-to-speech. The text is below.", hi: "इस फ़ोन में इस भाषा की आवाज़ नहीं है। सेटिंग, टेक्स्ट-टू-स्पीच में हिंदी आवाज़ जोड़ें। नीचे लिखा हुआ पढ़ें।" },
  silent: { en: "No sound came. Turn the volume up, switch off silent mode and press the speaker again. The text is below.", hi: "आवाज़ नहीं आई। फ़ोन की आवाज़ बढ़ाएं, साइलेंट बंद करें और स्पीकर दोबारा दबाएं। नीचे लिखा हुआ पढ़ें।" },
};
SAY_FAIL.blocked = SAY_FAIL.error = SAY_FAIL.silent;
Voice.onSpeech((e) => {
  const bar = $("#sayBar"), note = $("#sayNote"), now = $("#sayNow");
  if (e.state === "start") { bar.classList.remove("hidden", "failed"); note.classList.add("hidden"); now.textContent = ""; }
  else if (e.state === "sentence") { bar.classList.remove("hidden"); now.textContent = e.text; }
  else if (e.state === "fail") { bar.classList.remove("hidden"); bar.classList.add("failed"); note.textContent = L_(SAY_FAIL[e.reason] || SAY_FAIL.silent); note.classList.remove("hidden"); now.textContent = e.text; }
  else if (!bar.classList.contains("failed")) bar.classList.add("hidden");
});
$("#sayStop").onclick = () => { $("#sayBar").classList.remove("failed"); $("#sayBar").classList.add("hidden"); Voice.stop(); };
// iPhones only speak after a touch has "unlocked" speech; do that on the first touch anywhere
["pointerdown", "touchend", "keydown"].forEach((ev) => document.addEventListener(ev, () => { if (state.voiceOn) Voice.prime(); }, { capture: true, passive: true }));
const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let silentHintShown = false;
function say(text, btn) {
  $("#sayBar").classList.remove("failed");
  const ok = Voice.speak(text, getLang(), btn);
  if (ok && isApple && !silentHintShown) { silentHintShown = true; toast(T2("No sound? Switch off silent mode and turn the volume up.", "आवाज़ न आए तो फ़ोन का साइलेंट बटन बंद करें और आवाज़ बढ़ाएं।"), 5000); }
  return ok;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-say]");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  if (Voice.isPlaying(b)) { Voice.stop(); return; }
  say(sayText(b.dataset.say, b), b);
  if (b.dataset.say === "guide" && !state.voiceOn) setVoice(true);
}, true);

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
  chartTheme();
  compareChart = new Chart($("#compareChart"), {
    type: "bar",
    data: {
      labels: top.map((x) => L_(x.crop)),
      datasets: [
        { label: t("bad"), data: top.map((x) => Math.round(x.sc.bad)), backgroundColor: alpha(C().risk, 0.75), borderRadius: 4 },
        { label: t("normal"), data: top.map((x) => Math.round(x.sc.normal)), backgroundColor: C().mustard, borderRadius: 4 },
        { label: t("good"), data: top.map((x) => Math.round(x.sc.good)), backgroundColor: C().green, borderRadius: 4 },
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
        <div class="cap"><div><div class="rank">${lang === "hi" ? "क्रम" : "Rank"} ${i + 1}</div><h3>${esc(L_(c))}</h3></div><div class="capr"><button class="say" type="button" data-say="crop" data-id="${c.id}" aria-label="${t("listen")}">${ic("volume-2")}</button>${meter(x.score)}</div></div>
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
  legend.innerHTML = `<span><i style="background:var(--mustard)"></i>${lang === "hi" ? "बुवाई" : "Sowing"}</span><span><i style="background:var(--green)"></i>${lang === "hi" ? "बढ़वार" : "Growing"}</span><span><i style="background:#c98a4b"></i>${lang === "hi" ? "कटाई" : "Harvest"}</span>`;
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
    const gauge = p.id === "ec" ? "" : `<div class="gauge" title="${p.id === "ph" ? "5.5 - 10" : p.th.join(" / ")}">${p.id === "ph" ? '<span style="background:#e0715c"></span><span style="background:#62b671"></span><span style="background:#e0715c;border-radius:0 5px 5px 0"></span>' : "<span></span><span></span><span></span>"}${g != null ? `<i style="left:${g}%"></i>` : ""}</div>`;
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
        <div class="th"><h3>${esc(L_(tq))}</h3><button class="say" type="button" data-say="tech" data-id="${tq.id}" aria-label="${t("listen")}">${ic("volume-2")}</button></div>
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
      chartTheme();
      trendChart = new Chart($("#trendChart"), {
        type: "line",
        data: { labels: pts.map((p) => p.date), datasets: [{ label: `${L_(crop)} ₹/q`, data: pts.map((p) => p.modal), borderColor: C().mustard, tension: 0.25 }, ...(crop.msp ? [{ label: "MSP", data: pts.map(() => crop.msp), borderColor: "#2e7d32", borderDash: [6, 4], pointRadius: 0 }] : [])] },
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

/* ---------------- satellite pass panel ---------------- */
function passPanel(row, lang) {
  const p = row.item.properties;
  const when = new Date(p.datetime);
  const fmt = (d) => d.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const days = Math.max(0, Math.round((Date.now() - when) / 864e5));
  const sat = p.platform ? p.platform.replace("sentinel", "Sentinel").replace("-2", "-2").toUpperCase().replace("SENTINEL", "Sentinel") : row.item.id.slice(0, 3);
  return `<div class="pass">
    <div><div class="l">${lang === "hi" ? "उपग्रह" : "Satellite"}</div><b>${esc(sat)}</b></div>
    <div><div class="l">${lang === "hi" ? "आख़िरी साफ़ चित्र (IST)" : "Last clear pass (IST)"}</div><b>${fmt(when)}</b></div>
    <div><div class="l">${lang === "hi" ? "कितने दिन पहले" : "Age"}</div><b>${days} ${lang === "hi" ? "दिन" : "days"}</b></div>
    <div><div class="l">${lang === "hi" ? "खेत पर बादल" : "Cloud over field"}</div><b>${Math.round((row.cloud || 0) * 100)}%</b></div>
    <div><div class="l">${lang === "hi" ? "रिज़ॉल्यूशन" : "Resolution"}</div><b>${row.sensor === "landsat" ? "30 m" : "10 m"}</b></div>
    <div><div class="l">${lang === "hi" ? "दोबारा चित्र" : "Revisit"}</div><b>${lang === "hi" ? "हर 2 से 5 दिन" : "every 2 to 5 days"}</b></div>
  </div>`;
}

/* ---------------- share, remember field ---------------- */
function fieldParam() {
  if (state.vertices.length >= 3) return "poly=" + state.vertices.map(([a, b]) => `${a.toFixed(5)}:${b.toFixed(5)}`).join(";");
  if (state.point) return `field=${state.point[0].toFixed(5)},${state.point[1].toFixed(5)},${(+$("#acres").value || 2)}`;
  return "";
}
function saveField() { try { localStorage.setItem("km-field", fieldParam()); } catch {} }
function restoreField(param) {
  if (!param) return false;
  const p = new URLSearchParams(param);
  if (p.get("poly")) {
    const pts = p.get("poly").split(";").map((x) => x.split(":").map(Number)).filter((x) => x.length === 2 && x.every(isFinite));
    if (pts.length >= 3) {
      clearShape();
      state.vertices = pts;
      poly = L.polygon(pts, { color: "#f2c230", weight: 3, fillOpacity: 0.12 }).addTo(map);
      const c = poly.getBounds().getCenter();
      state.point = [c.lat, c.lng];
      state.district = nearestDistrict(c.lat, c.lng);
      fillSelects();
      map.fitBounds(poly.getBounds(), { maxZoom: 17, padding: [30, 30] });
      showPlaceName(c.lat, c.lng);
      return true;
    }
  }
  if (p.get("field")) {
    const [lat, lon, acres] = p.get("field").split(",").map(Number);
    if (isFinite(lat) && isFinite(lon)) {
      if (acres) $("#acres").value = acres;
      setPoint(lat, lon, false);
      map.setView([lat, lon], 16);
      return true;
    }
  }
  return false;
}
function toast(msg, ms = 2800) {
  $$(".toast").forEach((x) => x.remove());
  const el = document.createElement("div");
  el.className = "toast"; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
async function shareReport() {
  const r = state.report;
  const latest = r?.series?.[r.series.length - 1];
  const url = `${location.origin}${location.pathname}#${fieldParam()}`;
  const lang = getLang();
  const text = lang === "hi"
    ? `मेरे खेत की सैटेलाइट रिपोर्ट (${L_(state.district)}): हरियाली NDVI ${latest ? latest.ndvi.toFixed(2) : "-"}, मिट्टी ${r?.soil?.texture || "-"}, pH ${r?.soil?.phh2o?.toFixed(1) || "-"}। कृषि मित्र हरियाणा पर देखें:`
    : `Satellite report for my field (${L_(state.district)}): greenness NDVI ${latest ? latest.ndvi.toFixed(2) : "-"}, soil ${r?.soil?.texture || "-"}, pH ${r?.soil?.phh2o?.toFixed(1) || "-"}. See it on Krishi Mitra Haryana:`;
  if (navigator.share) {
    try { await navigator.share({ title: t("appName"), text, url }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank", "noopener");
}

/* ---------------- theme ---------------- */
function setTheme(th) {
  document.documentElement.dataset.theme = th;
  try { localStorage.setItem("km-theme2", th); } catch {}
  $("#themeBtn").innerHTML = th === "sun" ? ic("moon") : ic("sun");
  $("#themeBtn").setAttribute("aria-label", th === "sun" ? t("nightMode") : t("sunMode"));
  document.querySelector('meta[name="theme-color"]').content = th === "sun" ? "#ffffff" : "#0d1512";
  chartTheme();
  const active = $(".tab.active")?.dataset.tab;
  if (state.report) renderReport();
  if (active && active !== "land") showTab(active);
}
$("#themeBtn").onclick = () => setTheme(document.documentElement.dataset.theme === "sun" ? "night" : "sun");
$("#aboutBtn").onclick = () => showTab("about");

/* ---------------- install as app, offline notice ---------------- */
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvt = e;
  const box = $("#installBox");
  box.innerHTML = `<span>${ic("download")} ${t("installApp")}</span><button class="btn mustard" type="button" id="installBtn">${t("install")}</button>`;
  box.classList.remove("hidden");
  $("#installBtn").onclick = async () => { box.classList.add("hidden"); installEvt.prompt(); installEvt = null; };
});
window.addEventListener("offline", () => toast(t("offline")));

/* ---------------- boot ---------------- */
$$(".tab").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
$$(".lang button").forEach((b) => (b.onclick = () => {
  setLang(b.dataset.lang);
  Voice.stop();
  paintStatic();
  renderGuide(false); renderViewChips(); updateBadge(); renderLegend();
  if (state.report) renderReport();
  const active = $(".tab.active")?.dataset.tab;
  if (active && active !== "land") showTab(active);
}));
paintStatic();
setTheme(document.documentElement.dataset.theme || "night");
if (restoreField(location.hash.slice(1))) { try { history.replaceState(null, "", location.pathname + location.search); } catch {} } // a shared link is used once; after that the app remembers the field itself
else { try { restoreField(localStorage.getItem("km-field")); } catch {} }
let savedVoice = false; try { savedVoice = localStorage.getItem("km-voice") === "1"; } catch {}
setVoice(savedVoice);
renderGuide(false);
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
const initial = location.hash.slice(1);
state.tab = "land";
try { history.replaceState({ tab: TABS.includes(initial) ? initial : "land" }, ""); } catch {}
if (TABS.includes(initial) && initial !== "land") showTab(initial, false);
refreshMapDates();
// A saved or shared field is checked straight away, so the farmer opens the app and sees today's condition
if (state.point) setTimeout(() => { if (state.point && !state.report && !state.busy) analyse({ auto: true }); }, 600);
window.__km = { state, map }; // handy for debugging in the console
