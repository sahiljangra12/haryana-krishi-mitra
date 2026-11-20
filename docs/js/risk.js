// Full-picture accounting for each crop: budget + incentives + climate risk + market risk/demand,
// rolled into good / normal / bad-year profit. All rules are simple and shown to the farmer.

// Crop sensitivity to each hazard (0 = not affected, 1 = very sensitive)
const SENS = {
  wheat: { frost: 0.2, heat: 0.8, drought: 0.5, waterlog: 0.4, hail: 0.5 },
  barley: { frost: 0.2, heat: 0.5, drought: 0.3, waterlog: 0.3, hail: 0.4 },
  mustard: { frost: 0.7, heat: 0.4, drought: 0.3, waterlog: 0.5, hail: 0.5 },
  gram: { frost: 0.7, heat: 0.5, drought: 0.3, waterlog: 0.8, hail: 0.5 },
  potato: { frost: 0.8, heat: 0.3, drought: 0.6, waterlog: 0.6, hail: 0.3 },
  onion_rabi: { frost: 0.3, heat: 0.5, drought: 0.6, waterlog: 0.6, hail: 0.4 },
  paddy: { frost: 0, heat: 0.3, drought: 0.9, waterlog: 0.1, hail: 0.2 },
  basmati: { frost: 0, heat: 0.3, drought: 0.9, waterlog: 0.1, hail: 0.3 },
  cotton: { frost: 0, heat: 0.3, drought: 0.5, waterlog: 0.7, hail: 0.4 },
  bajra: { frost: 0, heat: 0.2, drought: 0.2, waterlog: 0.5, hail: 0.3 },
  maize: { frost: 0, heat: 0.4, drought: 0.6, waterlog: 0.8, hail: 0.3 },
  moong: { frost: 0, heat: 0.3, drought: 0.4, waterlog: 0.8, hail: 0.3 },
  moong_summer: { frost: 0, heat: 0.6, drought: 0.6, waterlog: 0.5, hail: 0.2 },
  guar: { frost: 0, heat: 0.2, drought: 0.2, waterlog: 0.6, hail: 0.2 },
  sugarcane: { frost: 0.4, heat: 0.3, drought: 0.7, waterlog: 0.3, hail: 0.2 },
};

// Market structure: price risk 0–1 (how far price can fall in a bad year) and a demand outlook note.
// Notes are qualitative and deliberately cautious — no price forecasts.
export const MARKET = {
  wheat: { risk: 0.05, demand: { en: "Assured government procurement at MSP in Haryana; strong demand for food security stocks.", hi: "हरियाणा में MSP पर सरकारी खरीद पक्की; खाद्य सुरक्षा भंडार के लिए मज़बूत मांग।" } },
  paddy: { risk: 0.05, demand: { en: "Procured at MSP, but state policy pushes farmers away from paddy because of groundwater.", hi: "MSP पर खरीद, पर भूजल के कारण राज्य नीति धान से हटने को प्रोत्साहित करती है।" } },
  mustard: { risk: 0.2, demand: { en: "India imports a large share of its edible oil, so demand for mustard is steady; procurement at MSP is partial, so market price matters.", hi: "भारत खाद्य तेल का बड़ा हिस्सा आयात करता है, इसलिए सरसों की मांग स्थिर; MSP पर खरीद आंशिक, बाज़ार भाव अहम।" } },
  gram: { risk: 0.25, demand: { en: "Pulses are a national priority (import substitution); prices can dip below MSP at harvest — store and sell in stages.", hi: "दालें राष्ट्रीय प्राथमिकता (आयात कम करना); कटाई पर भाव MSP से नीचे जा सकते हैं — भंडारण कर किस्तों में बेचें।" } },
  barley: { risk: 0.2, demand: { en: "Malt and feed demand; malting contracts can beat MSP.", hi: "माल्ट और पशु-आहार की मांग; माल्ट अनुबंध MSP से बेहतर हो सकते हैं।" } },
  potato: { risk: 0.6, demand: { en: "Very volatile — gluts after harvest are common. Cold storage or a processing contract reduces risk.", hi: "बहुत अस्थिर — कटाई के बाद भरमार आम। कोल्ड स्टोरेज या प्रोसेसिंग अनुबंध से जोखिम घटता है।" } },
  onion_rabi: { risk: 0.65, demand: { en: "Prices swing widely year to year; export policy changes affect prices quickly.", hi: "हर साल भाव बहुत बदलते हैं; निर्यात नीति बदलने से भाव जल्दी प्रभावित।" } },
  basmati: { risk: 0.35, demand: { en: "Export-driven; prices follow international demand and residue rules.", hi: "निर्यात पर निर्भर; भाव अंतरराष्ट्रीय मांग और अवशेष नियमों पर।" } },
  cotton: { risk: 0.25, demand: { en: "Textile demand; CCI buys at MSP when prices fall. Extra state incentive for cotton instead of paddy.", hi: "कपड़ा उद्योग की मांग; भाव गिरने पर CCI MSP पर खरीदती है। धान की जगह कपास पर राज्य प्रोत्साहन।" } },
  bajra: { risk: 0.3, demand: { en: "Millet demand is growing; procurement is limited, so market price often decides income.", hi: "मोटे अनाज की मांग बढ़ रही है; खरीद सीमित, इसलिए आय अक्सर बाज़ार भाव से तय।" } },
  maize: { risk: 0.25, demand: { en: "Strong demand from poultry feed and ethanol; counts for paddy-diversification incentives.", hi: "पोल्ट्री फ़ीड और एथेनॉल से मज़बूत मांग; धान-विविधीकरण प्रोत्साहन के योग्य।" } },
  moong: { risk: 0.25, demand: { en: "Pulses priority; partial MSP procurement.", hi: "दालों को प्राथमिकता; MSP पर आंशिक खरीद।" } },
  moong_summer: { risk: 0.25, demand: { en: "Pulses priority; partial MSP procurement.", hi: "दालों को प्राथमिकता; MSP पर आंशिक खरीद।" } },
  guar: { risk: 0.5, demand: { en: "Tied to guar-gum exports for the oil industry — boom-and-bust prices.", hi: "तेल उद्योग के लिए ग्वार-गम निर्यात से जुड़ा — भाव कभी बहुत ऊपर, कभी नीचे।" } },
  sugarcane: { risk: 0.1, demand: { en: "Price fixed by the state (SAP) and paid by mills; risk is delayed payment, not price.", hi: "भाव राज्य (SAP) तय करता है, भुगतान मिलें करती हैं; जोखिम भाव का नहीं, देर से भुगतान का।" } },
};

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// Exposure of THIS location to each hazard, from NASA POWER climate + 10-day forecast + soil + irrigation
export function exposures(ctx) {
  const m = ctx.climate?.monthly;
  const yrs = ctx.climate?.years ? Object.values(ctx.climate.years) : [];
  const mean = yrs.length ? yrs.reduce((a, b) => a + b, 0) / yrs.length : null;
  const cv = yrs.length > 1 ? Math.sqrt(yrs.reduce((a, b) => a + (b - mean) ** 2, 0) / (yrs.length - 1)) / mean : 0.25;
  // NASA POWER monthly T2M_MIN / T2M_MAX are the month's EXTREMES (coldest night, hottest day), averaged over 5 years
  const decJanMin = m ? (m[11].tmin + m[0].tmin) / 2 : 4.5;
  const marMax = m ? m[2].tmax : 36;
  const julAugRain = m ? (m[6].rain + m[7].rain) / 2 : 200;
  const fcMin = ctx.forecast?.daily ? Math.min(...ctx.forecast.daily.temperature_2m_min) : 99;
  const clayey = /clay/.test(ctx.soil?.texture || "") && !/sandy/.test(ctx.soil?.texture || "");
  const water = ctx.water || "good";
  return {
    frost: clamp((6 - decJanMin) / 5 + (fcMin <= 3 ? 0.2 : 0)),
    heat: clamp((marMax - 33) / 7),
    drought: clamp((water === "good" ? 0.1 : water === "limited" ? 0.45 : 0.75) + (mean != null && mean < 450 ? 0.15 : 0) + clamp(cv - 0.2) * 0.8),
    waterlog: clamp((julAugRain - 120) / 250 + (clayey ? 0.2 : 0)),
    hail: 0.15,
    meta: { decJanMin, marMax, julAugRain, annualRain: mean, rainCV: cv },
  };
}

// Expected yield loss fraction in a bad year from climate (0–0.5)
export function climateRisk(cropId, exp, season) {
  const s = SENS[cropId] || {};
  // monsoon waterlogging matters far less for winter crops
  const seasonal = { waterlog: season === "rabi" ? 0.3 : 1 };
  const parts = Object.fromEntries(["frost", "heat", "drought", "waterlog", "hail"].map((k) => [k, (s[k] || 0) * (exp[k] || 0) * (seasonal[k] ?? 1)]));
  // only seasonally relevant hazards: kharif crops can't get frost; summer moong can't get frost either
  const combined = 1 - Object.values(parts).reduce((a, p) => a * (1 - p * 0.3), 1);
  return { score: clamp(combined, 0, 0.5), parts };
}

// Haryana incentives (Kharif 2026 announcements). Only applied when the farmer ticks the matching box.
export function incentives(crop, opts) {
  const list = [];
  const diversifier = ["maize", "cotton", "bajra", "moong", "guar"].includes(crop.id);
  const bonusCrop = ["cotton", "moong"].includes(crop.id); // pulses, oilseeds, cotton
  if (opts.leavingPaddy && diversifier) list.push({ key: "mpmv", amount: 8000 });
  if (opts.leavingPaddy && bonusCrop) list.push({ key: "mpmvBonus", amount: 2000 });
  if (opts.dsr && ["paddy", "basmati"].includes(crop.id)) list.push({ key: "dsr", amount: 4500 });
  if (opts.straw && ["paddy", "basmati"].includes(crop.id)) list.push({ key: "straw", amount: 1200 });
  return { list, perAcre: list.reduce((a, b) => a + b.amount, 0) };
}

/**
 * Three scenarios per crop.
 *  normal: mid yield × planning price
 *  good:   high yield × price +10%
 *  bad:    low yield × (1 − climate loss) × price × (1 − market risk) and high cost
 * Optional overrides from the what-if sliders: {yield, price, cost} per acre.
 */
export function scenarios(row, ctx, ov = {}) {
  const c = row.crop;
  const acres = ctx.acres || 1;
  const fertDelta = ctx.fertCostPerAcre?.[c.id] != null ? ctx.fertCostPerAcre[c.id] - c.cost.reduce((a, b) => a + b, 0) / 2 * c.costSplit.fertilizer : 0;
  const costMid = (ov.cost ?? (c.cost[0] + c.cost[1]) / 2 + fertDelta);
  const yMid = ov.yield ?? (c.yield[0] + c.yield[1]) / 2;
  const price = ov.price ?? row.pp.price;
  const cr = climateRisk(c.id, ctx.exposures, c.season);
  const mr = MARKET[c.id]?.risk ?? 0.3;
  const inc = incentives(c, ctx.opts || {});
  const by = c.byproduct || 0;
  const spread = (c.yield[1] - c.yield[0]) / 2;
  const normal = (yMid * price + by + inc.perAcre - costMid) * acres;
  const good = ((yMid + spread) * price * 1.1 + by + inc.perAcre - costMid * 0.95) * acres;
  const bad = ((yMid - spread) * (1 - cr.score) * price * (1 - mr) + by * 0.7 + inc.perAcre - costMid * 1.08) * acres;
  // probability-weighted (25% bad, 50% normal, 25% good) = "risk-adjusted" expectation
  const expected = 0.25 * bad + 0.5 * normal + 0.25 * good;
  return { normal, good, bad, expected, climate: cr, marketRisk: mr, incentives: inc, costMid, yMid, price, breakEvenYield: (costMid - by - inc.perAcre) / price };
}

export const HAZARD_LABEL = {
  frost: { en: "Frost", hi: "पाला" }, heat: { en: "Terminal heat", hi: "अंतिम गर्मी" }, drought: { en: "Water shortage", hi: "पानी की कमी" },
  waterlog: { en: "Waterlogging", hi: "जल-भराव" }, hail: { en: "Hail / storm", hi: "ओले / आंधी" },
};
export const INCENTIVE_LABEL = {
  mpmv: { en: "Mera Pani Meri Virasat", hi: "मेरा पानी मेरी विरासत" },
  mpmvBonus: { en: "Pulses/oilseed/cotton bonus", hi: "दाल/तिलहन/कपास बोनस" },
  dsr: { en: "DSR incentive", hi: "DSR प्रोत्साहन" },
  straw: { en: "Straw management", hi: "पराली प्रबंधन" },
};
