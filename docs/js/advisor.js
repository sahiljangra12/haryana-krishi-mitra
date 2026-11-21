// Recommendation engine: transparent, rule-based scoring. No black box —
// every score component is shown to the farmer in the UI.
import { CROPS, SEASONS } from "./crops.js?v=20261120210040";

// Which season is the farmer planning for, given today's month?
export function upcomingSeason(month = new Date().getMonth() + 1) {
  if (month >= 9 && month <= 12) return "rabi";
  if (month >= 1 && month <= 2) return "zaid"; // spring sugarcane / summer moong next
  if (month >= 3 && month <= 4) return "zaid";
  return "kharif"; // May–Aug
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};

// Latest mandi price for a crop: prefer the farmer's district, else all-Haryana median.
export function livePrice(crop, prices, district) {
  const recs = prices?.latest?.records?.filter((r) => crop.agmark.test(r.commodity)) || [];
  if (!recs.length) return null;
  const local = recs.filter((r) => r.district?.toLowerCase() === district?.toLowerCase());
  const use = local.length ? local : recs;
  return {
    modal: median(use.map((r) => +r.modal)),
    min: Math.min(...use.map((r) => +r.min)),
    max: Math.max(...use.map((r) => +r.max)),
    n: use.length,
    scope: local.length ? "district" : "state",
    date: use.map((r) => r.date).sort().pop(),
    markets: [...new Set(use.map((r) => r.market))].slice(0, 6),
  };
}

// Price used for planning:
//  MSP crops -> max(MSP, live modal) because government procurement sets a floor (wheat, paddy are procured in Haryana;
//               for mustard/gram/bajra/moong procurement is partial, so we blend toward the market price)
//  non-MSP crops -> live modal, else reference price (flagged)
export function planningPrice(crop, live) {
  const strongProcurement = ["wheat", "paddy"].includes(crop.id);
  if (crop.msp) {
    if (!live) return { price: crop.msp, basis: "msp" };
    if (strongProcurement) return { price: Math.max(crop.msp, live.modal), basis: live.modal > crop.msp ? "market" : "msp" };
    // partial procurement: assume half the crop gets MSP when market is below it
    const p = live.modal >= crop.msp ? live.modal : 0.5 * crop.msp + 0.5 * live.modal;
    return { price: Math.round(p), basis: "blend" };
  }
  if (live) return { price: live.modal, basis: "market" };
  return { price: crop.refPrice, basis: "reference" };
}

export function budget(crop, acres, price) {
  const cost = crop.cost.map((c) => c * acres);
  const revenue = crop.yield.map((y) => (y * price + (crop.byproduct || 0)) * acres);
  const profit = [revenue[0] - cost[1], revenue[1] - cost[0]]; // pessimistic / optimistic
  const mid = (revenue[0] + revenue[1]) / 2 - (cost[0] + cost[1]) / 2;
  const breakEven = Math.round(((crop.cost[0] + crop.cost[1]) / 2) / ((crop.yield[0] + crop.yield[1]) / 2));
  const lines = Object.entries(crop.costSplit).map(([k, share]) => ({ key: k, amount: Math.round(((cost[0] + cost[1]) / 2) * share) }));
  return { cost, revenue, profit, mid, perAcreMid: mid / acres, breakEven, lines };
}

const textureGroup = (t = "") => (t.includes("sand") && !t.includes("clay") ? "sandy" : t.includes("clay") && !t.includes("loam") ? "clayey" : "loamy");

/**
 * Score every crop of the chosen season.
 * ctx: { season, district, soil, water: 'good'|'limited'|'rainfed', acres, prices, ndmi, annualRain, risk: 'low'|'medium'|'high' }
 */
export function recommend(ctx) {
  const crops = CROPS.filter((c) => c.season === ctx.season);
  const rows = crops.map((crop) => {
    const live = livePrice(crop, ctx.prices, ctx.district?.name);
    const pp = planningPrice(crop, live);
    const b = budget(crop, ctx.acres || 1, pp.price);
    const reasons = [];
    let s = 0;

    // 1) profitability (0–40)
    const pa = b.perAcreMid;
    // non-MSP crops: discount expected profit for price volatility, more so for cautious farmers
    let volatility = crop.msp ? 1 : { low: 0.5, medium: 0.7, high: 0.9 }[ctx.risk || "medium"];
    if (pp.basis === "reference") volatility *= 0.8;
    const prof = Math.max(0, Math.min(40, ((pa * volatility) / 60000) * 40));
    s += prof;

    // 2) soil fit (0–20)
    const tex = ctx.soil?.texture || "loam";
    let soilFit = crop.soil.includes(tex) ? 20 : crop.soil.some((x) => textureGroup(x) === textureGroup(tex)) ? 12 : 4;
    const ph = ctx.soil?.phh2o;
    if (ph && ph > 8.5) {
      if (crop.salinityTol === "high") soilFit += 0; else if (crop.salinityTol === "medium") soilFit -= 4; else soilFit -= 8;
      reasons.push({ k: "alkaline", v: ph.toFixed(1) });
    }
    const ec = ctx.soil?.ec;
    if (ec && ec > 3) {
      soilFit -= crop.salinityTol === "high" ? 0 : crop.salinityTol === "medium" ? 6 : 12;
      reasons.push({ k: "saline", v: ec.toFixed(1) });
    }
    s += Math.max(0, soilFit);

    // 3) water fit (0–25)
    let w = 25;
    const water = ctx.water || "good";
    if (water === "limited") w = [25, 15, 3][crop.waterNeed - 1];
    if (water === "rainfed") w = [22, 6, 0][crop.waterNeed - 1];
    if (ctx.district?.gw === "stressed" && crop.waterNeed === 3) { w -= 8; reasons.push({ k: "gwStress" }); }
    if (ctx.district?.gw === "saline" && crop.salinityTol === "low") { w -= 4; reasons.push({ k: "gwSaline" }); }
    s += Math.max(0, w);

    // 4) zone fit (0–10)
    const zone = crop.zones.includes(ctx.district?.zone) ? 10 : 3;
    s += zone;

    // 5) price risk (0–5): MSP crops are safer; risk-seeking farmers penalised less
    const riskPenalty = crop.msp ? 0 : ctx.risk === "high" ? 1 : ctx.risk === "medium" ? 3 : 5;
    s += 5 - riskPenalty;
    if (!crop.msp) reasons.push({ k: "noMsp" });
    if (pp.basis === "reference") reasons.push({ k: "refPrice" });

    return { crop, live, pp, budget: b, score: Math.round(s), parts: { prof, soilFit, w, zone, risk: 5 - riskPenalty }, reasons };
  });
  return rows.sort((a, b) => b.score - a.score);
}

// Weather-based precautions for the next 10 days (Open-Meteo daily forecast)
export function weatherAlerts(fc, lang) {
  const d = fc?.daily;
  if (!d) return [];
  const A = [];
  const T = (en, hi) => (lang === "hi" ? hi : en);
  d.time.forEach((day, i) => {
    const tmin = d.temperature_2m_min[i], tmax = d.temperature_2m_max[i], rain = d.precipitation_sum[i], wind = d.wind_speed_10m_max[i], rh = d.relative_humidity_2m_mean?.[i];
    const date = new Date(day).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" });
    if (tmin <= 3) A.push({ level: "high", date, text: T(`Frost risk (min ${tmin.toFixed(0)}°C). Give a light irrigation in the evening; protect mustard, potato and vegetables.`, `पाले का खतरा (न्यूनतम ${tmin.toFixed(0)}°C)। शाम को हल्की सिंचाई करें; सरसों, आलू और सब्ज़ियों को बचाएं।`) });
    if (tmax >= 40) A.push({ level: "high", date, text: T(`Severe heat (${tmax.toFixed(0)}°C). Irrigate early morning/evening; avoid spraying at midday.`, `तेज़ गर्मी (${tmax.toFixed(0)}°C)। सुबह/शाम सिंचाई करें; दोपहर में छिड़काव न करें।`) });
    else if (tmax >= 34 && [2, 3].includes(new Date(day).getMonth())) A.push({ level: "medium", date, text: T(`Hot spell (${tmax.toFixed(0)}°C) during wheat grain filling — light irrigation helps.`, `गेहूं में दाना भरते समय गर्मी (${tmax.toFixed(0)}°C) — हल्की सिंचाई करें।`) });
    if (rain >= 50) A.push({ level: "high", date, text: T(`Heavy rain expected (${rain.toFixed(0)} mm). Clear field drains; postpone irrigation, fertilizer and spraying.`, `भारी बारिश संभव (${rain.toFixed(0)} मि.मी.)। नालियां साफ रखें; सिंचाई, खाद और छिड़काव टालें।`) });
    else if (rain >= 10) A.push({ level: "low", date, text: T(`Rain likely (${rain.toFixed(0)} mm) — skip irrigation, don't spray the day before.`, `बारिश संभव (${rain.toFixed(0)} मि.मी.) — सिंचाई न करें, एक दिन पहले छिड़काव न करें।`) });
    if (wind >= 30) A.push({ level: "medium", date, text: T(`Strong wind (${wind.toFixed(0)} km/h) — don't spray pesticides; risk of lodging if field is irrigated.`, `तेज़ हवा (${wind.toFixed(0)} कि.मी./घंटा) — दवा न छिड़कें; सिंचित खेत में फसल गिर सकती है।`) });
    if (rh >= 85 && tmax <= 25 && tmax >= 12) A.push({ level: "medium", date, text: T(`Cool and humid — favourable for rust/blight. Scout wheat, mustard and potato.`, `ठंडा और नम मौसम — रतुआ/झुलसा के लिए अनुकूल। गेहूं, सरसों और आलू की जांच करें।`) });
  });
  return A;
}

// Read the NDVI time series like an agronomist: which seasons was the field cropped?
export function interpretSeries(series, lang) {
  const T = (en, hi) => (lang === "hi" ? hi : en);
  if (!series?.length) return [];
  const notes = [];
  const inMonths = (r, ms) => ms.includes(new Date(r.date).getMonth() + 1);
  const peak = (ms) => Math.max(-1, ...series.filter((r) => inMonths(r, ms)).map((r) => r.ndvi));
  const rabiPeak = peak([1, 2, 3]);
  const kharifPeak = peak([8, 9, 10]);
  if (rabiPeak > 0.55) notes.push(T(`A healthy Rabi crop was grown last winter (peak NDVI ${rabiPeak.toFixed(2)} in Jan–Mar).`, `पिछली सर्दी में अच्छी रबी फसल थी (जनवरी–मार्च में अधिकतम NDVI ${rabiPeak.toFixed(2)})।`));
  else if (rabiPeak > 0.35) notes.push(T(`Rabi crop last winter was moderate (peak NDVI ${rabiPeak.toFixed(2)}) — check nutrition or late sowing.`, `पिछली रबी फसल मध्यम रही (अधिकतम NDVI ${rabiPeak.toFixed(2)}) — पोषण या देर से बुवाई की जांच करें।`));
  else if (rabiPeak > -1) notes.push(T(`Little green cover in Jan–Mar (peak NDVI ${rabiPeak.toFixed(2)}): the field may have been fallow in Rabi.`, `जनवरी–मार्च में हरियाली कम (NDVI ${rabiPeak.toFixed(2)}): रबी में खेत खाली रहा हो सकता है।`));
  if (kharifPeak > 0.6) notes.push(T(`Strong Kharif crop (peak NDVI ${kharifPeak.toFixed(2)} in Aug–Oct) — typical of paddy, cotton or maize.`, `खरीफ में अच्छी फसल (अगस्त–अक्टूबर में NDVI ${kharifPeak.toFixed(2)}) — धान, कपास या मक्का जैसी।`));
  else if (kharifPeak > 0.35) notes.push(T(`Moderate Kharif cover (peak NDVI ${kharifPeak.toFixed(2)}) — typical of bajra, guar or a stressed crop.`, `खरीफ में मध्यम हरियाली (NDVI ${kharifPeak.toFixed(2)}) — बाजरा, ग्वार या तनावग्रस्त फसल जैसी।`));
  else if (kharifPeak > -1) notes.push(T(`Low Kharif cover (peak NDVI ${kharifPeak.toFixed(2)}) — field likely fallow or rainfed in monsoon.`, `खरीफ में कम हरियाली (NDVI ${kharifPeak.toFixed(2)}) — खेत खाली या बारानी रहा होगा।`));
  const last = series[series.length - 1];
  const stage =
    last.ndvi < 0.2 ? T("bare or just sown", "खाली या अभी बोया गया") :
    last.ndvi < 0.4 ? T("early growth / sparse cover", "शुरुआती बढ़वार / कम हरियाली") :
    last.ndvi < 0.6 ? T("growing crop, moderate vigour", "बढ़ती फसल, मध्यम ताकत") :
    T("dense, healthy canopy", "घनी, स्वस्थ फसल");
  notes.push(T(`Latest image (${last.date}): ${stage}.`, `नवीनतम चित्र (${last.date}): ${stage}।`));
  if (last.ndmi != null) {
    if (last.ndmi < -0.1 && last.ndvi > 0.3) notes.push(T("Moisture index is low for a growing crop — it may need irrigation soon.", "बढ़ती फसल के लिए नमी सूचकांक कम है — जल्द सिंचाई की ज़रूरत हो सकती है।"));
    else if (last.ndmi > 0.2) notes.push(T("Canopy moisture is good.", "फसल में नमी अच्छी है।"));
  }
  if (series.length >= 3) {
    const a = series[series.length - 3].ndvi, b = last.ndvi;
    const month = new Date(last.date).getMonth() + 1;
    if (b < a - 0.15 && ![3, 4, 10, 11].includes(month)) notes.push(T("NDVI dropped sharply in recent images outside harvest time — inspect the field for pest, disease or water stress.", "कटाई के समय के बिना हाल में NDVI तेज़ी से गिरा — कीट, रोग या पानी की कमी की जांच करें।"));
  }
  return notes;
}

export function uniformity(row, lang) {
  if (!row?.ndviStd || row.ndvi < 0.25) return null;
  const cv = row.ndviStd / row.ndvi;
  const T = (en, hi) => (lang === "hi" ? hi : en);
  if (cv < 0.12) return T("Crop growth is even across the field.", "पूरे खेत में फसल की बढ़वार एक जैसी है।");
  if (cv < 0.25) return T("Some patches are weaker than the rest — check irrigation reach and soil in those spots.", "कुछ हिस्से कमज़ोर हैं — वहां सिंचाई और मिट्टी की जांच करें।");
  return T("Growth is very uneven — likely waterlogging, salinity, or uneven irrigation. Laser levelling may help.", "बढ़वार बहुत असमान — जल-भराव, लवणता या असमान सिंचाई संभव। लेज़र लेवलिंग मदद कर सकती है।");
}

export { SEASONS };
