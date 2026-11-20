// Soil Health Card (SHC) scanner: OCR in the browser (Tesseract.js, English + Hindi),
// parse the 12 SHC parameters, rate them with the standard SHC thresholds, and turn the
// rating into a crop-wise fertilizer plan in bags of Urea / DAP / MOP with cost.
// Nothing is uploaded anywhere — the photo never leaves the phone.

// Fertilizer MRPs (Government of India): Urea ₹266.50 / 45 kg bag, DAP ₹1,350 / 50 kg bag (fixed);
// MOP is decontrolled — ₹1,710 / 50 kg bag is the 2025-26 national average. Edit if your dealer differs.
export const FERT = {
  urea: { n: 0.46, p: 0, k: 0, bagKg: 45, bagPrice: 266.5, en: "Urea", hi: "यूरिया" },
  dap: { n: 0.18, p: 0.46, k: 0, bagKg: 50, bagPrice: 1350, en: "DAP", hi: "डीएपी" },
  mop: { n: 0, p: 0, k: 0.6, bagKg: 50, bagPrice: 1710, en: "MOP (Potash)", hi: "एमओपी (पोटाश)" },
};

// Parameters printed on the SHC. unit = what the card prints. thresholds: [low/deficient below, high above]
export const PARAMS = [
  { id: "ph", en: "pH", hi: "पीएच", unit: "", keys: ["\\bp\\s?h\\b", "पीएच", "पी\\.?\\s?एच", "मृदा\\s*अभिक्रिया"], range: [3, 11] },
  { id: "ec", en: "Electrical conductivity (EC)", hi: "विद्युत चालकता (EC)", unit: "dS/m", keys: ["\\bE\\.?\\s?C\\b", "electrical\\s*conductivity", "conductivity", "विद्युत\\s*चालकता", "चालकता"], range: [0, 20], th: [1, 3] },
  { id: "oc", en: "Organic carbon (OC)", hi: "जैविक कार्बन (OC)", unit: "%", keys: ["organic\\s*carbon", "\\bO\\.?\\s?C\\b", "जैविक\\s*कार्बन", "कार्बनिक\\s*कार्बन"], range: [0, 5], th: [0.5, 0.75] },
  { id: "n", en: "Available nitrogen (N)", hi: "उपलब्ध नाइट्रोजन (N)", unit: "kg/ha", keys: ["nitrogen", "\\(N\\)", "नाइट्रोजन", "नत्रजन"], range: [20, 1500], th: [280, 560] },
  { id: "p", en: "Available phosphorus (P)", hi: "उपलब्ध फॉस्फोरस (P)", unit: "kg/ha", keys: ["phosph", "\\(P\\)", "फास्फोरस", "फॉस्फोरस", "स्फुर"], range: [0.5, 300], th: [10, 25] },
  { id: "k", en: "Available potassium (K)", hi: "उपलब्ध पोटाश (K)", unit: "kg/ha", keys: ["potas", "\\(K\\)", "पोटाश", "पोटैशियम", "पोटेशियम"], range: [10, 2000], th: [110, 280] },
  { id: "s", en: "Sulphur (S)", hi: "गंधक (S)", unit: "ppm", keys: ["sulph", "sulfur", "\\(S\\)", "गंधक", "सल्फर"], range: [0, 200], th: [10, 20] },
  { id: "zn", en: "Zinc (Zn)", hi: "जस्ता (Zn)", unit: "ppm", keys: ["zinc", "\\bZn\\b", "जस्ता", "जिंक"], range: [0, 50], th: [0.6, 1.2] },
  { id: "fe", en: "Iron (Fe)", hi: "लोहा (Fe)", unit: "ppm", keys: ["iron", "\\bFe\\b", "लोहा", "आयरन"], range: [0, 200], th: [4.5, 9] },
  { id: "cu", en: "Copper (Cu)", hi: "तांबा (Cu)", unit: "ppm", keys: ["copper", "\\bCu\\b", "तांबा", "कॉपर", "कापर"], range: [0, 50], th: [0.2, 0.4] },
  { id: "mn", en: "Manganese (Mn)", hi: "मैंगनीज (Mn)", unit: "ppm", keys: ["mangan", "\\bMn\\b", "मैंगनीज", "मैंगनीज़"], range: [0, 200], th: [2, 4] },
  { id: "b", en: "Boron (B)", hi: "बोरॉन (B)", unit: "ppm", keys: ["boron", "\\bB\\b", "बोरोन", "बोरॉन"], range: [0, 20], th: [0.5, 1] },
];

// General recommended dose, kg/ha N–P2O5–K2O, irrigated, Haryana (CCS HAU package of practices, rounded).
// The SHC rule: Low soil test -> +25 %, Medium -> as is, High -> −25 % (K: none if high).
export const RDF = {
  wheat: [150, 60, 30], barley: [60, 30, 0], mustard: [80, 30, 0], gram: [20, 40, 0], potato: [150, 80, 80], onion_rabi: [100, 50, 50],
  paddy: [150, 60, 60], basmati: [90, 30, 30], cotton: [175, 60, 60], bajra: [100, 40, 0], maize: [150, 60, 60], moong: [15, 40, 0],
  moong_summer: [15, 40, 0], guar: [20, 40, 0], sugarcane: [150, 60, 60],
};

/* ---------- OCR ---------- */

let tesseractP = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!tesseractP) {
    tesseractP = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = () => res(window.Tesseract);
      s.onerror = () => rej(new Error("Could not load OCR engine"));
      document.head.appendChild(s);
    });
  }
  return tesseractP;
}

async function pdfFirstPagesToCanvas(file, maxPages = 2) {
  const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const canvases = [];
  let text = "";
  for (let i = 1; i <= Math.min(maxPages, pdf.numPages); i++) {
    const page = await pdf.getPage(i);
    // digital PDFs (downloaded from soilhealth.dac.gov.in) already contain text — no OCR needed
    const tc = await page.getTextContent();
    text += tc.items.map((it) => it.str).join(" ") + "\n";
    const vp = page.getViewport({ scale: 2.2 });
    const c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    canvases.push(c);
  }
  return { canvases, text };
}

// Grayscale + contrast stretch + upscale small photos: improves OCR on phone pictures.
async function preprocess(file) {
  const img = await createImageBitmap(file);
  const scale = Math.min(3, Math.max(1, 2200 / Math.max(img.width, img.height)));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  let lo = 255, hi = 0;
  const g = new Uint8ClampedArray(d.data.length / 4);
  for (let i = 0, j = 0; i < d.data.length; i += 4, j++) {
    const v = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    g[j] = v; if (v < lo) lo = v; if (v > hi) hi = v;
  }
  const span = Math.max(1, hi - lo);
  for (let i = 0, j = 0; i < d.data.length; i += 4, j++) {
    const v = ((g[j] - lo) / span) * 255;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

export async function scanCard(file, onProgress) {
  let sources = [], pdfText = "";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    onProgress?.(0.05, "pdf");
    const r = await pdfFirstPagesToCanvas(file);
    pdfText = r.text;
    // if the PDF has a real text layer with numbers, skip OCR entirely
    if (parseCard(pdfText).found >= 4) return { text: pdfText, ...parseCard(pdfText), method: "pdf-text" };
    sources = r.canvases;
  } else {
    sources = [await preprocess(file)];
  }
  const T = await loadTesseract();
  let text = "";
  for (let i = 0; i < sources.length; i++) {
    const res = await T.recognize(sources[i], "eng+hin", {
      logger: (m) => m.status === "recognizing text" && onProgress?.((i + m.progress) / sources.length, "ocr"),
    });
    text += res.data.text + "\n";
  }
  return { text, ...parseCard(text + "\n" + pdfText), method: "ocr" };
}

/* ---------- Parsing ---------- */

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
function normalise(t) {
  return t
    .replace(/[०-९]/g, (d) => DEVANAGARI_DIGITS.indexOf(d))
    .replace(/(\d)\s*[,·]\s*(\d)/g, "$1.$2") // "0,45" or "0·45" -> 0.45
    .replace(/[Oo](?=\.\d)/g, "0") // "O.45" -> 0.45
    .replace(/\|/g, " ");
}

// Find the first plausible number after a parameter label on the same line (or the next line).
export function parseCard(raw) {
  const text = normalise(raw || "");
  const lines = text.split(/\n+/);
  const values = {};
  for (const p of PARAMS) {
    const re = new RegExp(p.keys.join("|"), "i");
    for (let li = 0; li < lines.length && values[p.id] == null; li++) {
      const m = re.exec(lines[li]);
      if (!m) continue;
      const after = lines[li].slice(m.index + m[0].length) + " " + (lines[li + 1] || "");
      const nums = [...after.matchAll(/(\d+(?:\.\d+)?)/g)].map((x) => parseFloat(x[1]));
      // skip things that look like the normal-range column, e.g. "280-560" or "6.5-7.5"
      const rangeLike = new Set();
      for (const r of after.matchAll(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/g)) { rangeLike.add(parseFloat(r[1])); rangeLike.add(parseFloat(r[2])); }
      const v = nums.find((n) => !rangeLike.has(n) && n >= p.range[0] && n <= p.range[1]);
      if (v != null) values[p.id] = v;
    }
  }
  return { values, found: Object.keys(values).length };
}

/* ---------- Rating & recommendations ---------- */

export function rate(id, v) {
  if (v == null || isNaN(v)) return null;
  if (id === "ph") return v < 6.5 ? "acidic" : v <= 7.5 ? "neutral" : v <= 8.5 ? "alkaline" : "sodic";
  if (id === "ec") return v < 1 ? "normal" : v <= 3 ? "moderate" : "saline";
  const p = PARAMS.find((x) => x.id === id);
  return v < p.th[0] ? "low" : v <= p.th[1] ? "medium" : "high";
}

export const RATING_LABEL = {
  low: { en: "Low", hi: "कम", cls: "neg" }, medium: { en: "Medium", hi: "मध्यम", cls: "" }, high: { en: "High", hi: "अधिक", cls: "pos" },
  acidic: { en: "Acidic", hi: "अम्लीय", cls: "neg" }, neutral: { en: "Normal", hi: "सामान्य", cls: "pos" }, alkaline: { en: "Alkaline", hi: "क्षारीय", cls: "" }, sodic: { en: "Strongly alkaline (sodic)", hi: "अत्यधिक क्षारीय (ऊसर)", cls: "neg" },
  normal: { en: "Normal", hi: "सामान्य", cls: "pos" }, moderate: { en: "Slightly saline", hi: "हल्की लवणता", cls: "" }, saline: { en: "Saline", hi: "लवणीय", cls: "neg" },
};

const factor = (r, isK = false) => (r === "low" ? 1.25 : r === "high" ? (isK ? 0 : 0.75) : 1);

// Nutrient need per acre (kg) and product bags for one crop
export function fertilizerPlan(cropId, card, acres = 1) {
  const rdf = RDF[cropId];
  if (!rdf) return null;
  const r = { n: rate("n", card.n), p: rate("p", card.p), k: rate("k", card.k) };
  const ha = acres / 2.471;
  // legumes: keep the small starter N regardless of soil N
  const legume = ["gram", "moong", "moong_summer", "guar"].includes(cropId);
  const N = rdf[0] * (legume ? 1 : factor(r.n)) * ha;
  const P2O5 = rdf[1] * factor(r.p) * ha;
  const K2O = rdf[2] * factor(r.k, true) * ha;
  const dapKg = P2O5 / FERT.dap.p;
  const ureaKg = Math.max(0, (N - dapKg * FERT.dap.n) / FERT.urea.n);
  const mopKg = K2O / FERT.mop.k;
  const items = [
    { f: "urea", kg: ureaKg }, { f: "dap", kg: dapKg }, { f: "mop", kg: mopKg },
  ].map((x) => ({ ...x, bags: x.kg / FERT[x.f].bagKg, cost: (x.kg / FERT[x.f].bagKg) * FERT[x.f].bagPrice }));
  const general = { N: rdf[0] * ha, P2O5: rdf[1] * ha, K2O: rdf[2] * ha };
  const genCost = (Math.max(0, (general.N - (general.P2O5 / 0.46) * 0.18) / 0.46) / 45) * 266.5 + (general.P2O5 / 0.46 / 50) * 1350 + (general.K2O / 0.6 / 50) * 1710;
  return { N, P2O5, K2O, items, total: items.reduce((a, b) => a + b.cost, 0), generalCost: genCost, ratings: r };
}

// Plain-language advice from the whole card
export function cardAdvice(card, lang) {
  const T = (en, hi) => (lang === "hi" ? hi : en);
  const out = [];
  const rp = rate("ph", card.ph), re = rate("ec", card.ec);
  if (rp === "sodic") out.push({ lvl: "high", text: T(`pH ${card.ph} is strongly alkaline (usar). Apply gypsum based on a gypsum-requirement test (usually 50% GR), add FYM/green manure, and prefer tolerant crops: barley, mustard, wheat (KRL 210/213), paddy in reclaimed fields.`, `pH ${card.ph} अत्यधिक क्षारीय (ऊसर) है। जिप्सम-आवश्यकता जांच के अनुसार जिप्सम डालें (आमतौर पर 50% GR), गोबर/हरी खाद डालें और सहनशील फसलें लें: जौ, सरसों, गेहूं (KRL 210/213)।`) });
  else if (rp === "alkaline") out.push({ lvl: "medium", text: T(`pH ${card.ph} is alkaline — zinc and iron become less available; use zinc sulphate and organic manure.`, `pH ${card.ph} क्षारीय है — जिंक और लोहा कम उपलब्ध होते हैं; जिंक सल्फेट और जैविक खाद डालें।`) });
  else if (rp === "acidic") out.push({ lvl: "medium", text: T(`pH ${card.ph} is acidic — rare in Haryana; recheck the sample, consider agricultural lime.`, `pH ${card.ph} अम्लीय है — हरियाणा में दुर्लभ; नमूना दोबारा जांचें, चूना डालने पर विचार करें।`) });
  if (re === "saline") out.push({ lvl: "high", text: T(`EC ${card.ec} dS/m — saline soil. Grow salt-tolerant crops (barley, mustard, cotton), irrigate with good canal water to leach salts, avoid saline tubewell water.`, `EC ${card.ec} dS/m — लवणीय मिट्टी। लवण-सहिष्णु फसलें (जौ, सरसों, कपास) लें, अच्छे नहरी पानी से सिंचाई कर लवण बहाएं, खारे ट्यूबवेल पानी से बचें।`) });
  else if (re === "moderate") out.push({ lvl: "medium", text: T(`EC ${card.ec} dS/m — slightly saline; sensitive crops (gram, maize, vegetables) may suffer.`, `EC ${card.ec} dS/m — हल्की लवणता; संवेदनशील फसलें (चना, मक्का, सब्ज़ी) प्रभावित हो सकती हैं।`) });
  const ro = rate("oc", card.oc);
  if (ro === "low") out.push({ lvl: "medium", text: T(`Organic carbon ${card.oc}% is low. Add 4–6 tonnes/acre FYM or compost, grow dhaincha green manure before paddy, and stop burning residue.`, `जैविक कार्बन ${card.oc}% कम है। 4–6 टन/एकड़ गोबर खाद या कम्पोस्ट डालें, धान से पहले ढैंचा हरी खाद लें, पराली न जलाएं।`) });
  if (rate("zn", card.zn) === "low") out.push({ lvl: "medium", text: T(`Zinc deficient (${card.zn} ppm): apply 10 kg/acre zinc sulphate (21%) at sowing, especially for paddy and wheat.`, `जिंक की कमी (${card.zn} ppm): बुवाई पर 10 कि.ग्रा./एकड़ जिंक सल्फेट (21%) डालें, ख़ासकर धान और गेहूं में।`) });
  if (rate("s", card.s) === "low") out.push({ lvl: "medium", text: T(`Sulphur low (${card.s} ppm): use SSP instead of DAP, or 100 kg/acre gypsum — important for mustard and pulses.`, `गंधक कम (${card.s} ppm): DAP की जगह SSP या 100 कि.ग्रा./एकड़ जिप्सम डालें — सरसों और दालों के लिए ज़रूरी।`) });
  if (rate("fe", card.fe) === "low") out.push({ lvl: "low", text: T(`Iron low (${card.fe} ppm): spray 0.5% ferrous sulphate if leaves turn yellow between veins (common in sandy soils, DSR paddy).`, `लोहा कम (${card.fe} ppm): पत्तियों की नसों के बीच पीलापन हो तो 0.5% फेरस सल्फेट छिड़कें (रेतीली मिट्टी, DSR धान में आम)।`) });
  if (rate("mn", card.mn) === "low") out.push({ lvl: "low", text: T(`Manganese low (${card.mn} ppm): 0.5% manganese sulphate spray on wheat at first sign.`, `मैंगनीज कम (${card.mn} ppm): गेहूं में लक्षण दिखते ही 0.5% मैंगनीज सल्फेट छिड़कें।`) });
  if (rate("b", card.b) === "low") out.push({ lvl: "low", text: T(`Boron low (${card.b} ppm): 4 kg/acre borax for mustard, cauliflower and other vegetables.`, `बोरॉन कम (${card.b} ppm): सरसों, फूलगोभी व सब्ज़ियों में 4 कि.ग्रा./एकड़ बोरेक्स डालें।`) });
  if (rate("cu", card.cu) === "low") out.push({ lvl: "low", text: T(`Copper low (${card.cu} ppm): rare; a 0.2% copper sulphate spray if deficiency symptoms appear.`, `तांबा कम (${card.cu} ppm): दुर्लभ; लक्षण दिखें तो 0.2% कॉपर सल्फेट छिड़कें।`) });
  if (rate("n", card.n) === "low") out.push({ lvl: "low", text: T("Nitrogen low: split urea in 2–3 doses, use a leaf colour chart to avoid waste.", "नाइट्रोजन कम: यूरिया 2–3 बार में दें, बर्बादी से बचने के लिए लीफ कलर चार्ट का प्रयोग करें।") });
  if (rate("p", card.p) === "high") out.push({ lvl: "low", text: T("Phosphorus already high — you can cut DAP by a quarter and save money.", "फॉस्फोरस पहले से ज़्यादा — DAP एक-चौथाई कम करके पैसा बचा सकते हैं।") });
  if (rate("k", card.k) === "high") out.push({ lvl: "low", text: T("Potash high — skip MOP this season.", "पोटाश ज़्यादा — इस मौसम में MOP न डालें।") });
  return out;
}

// Convert card values to the shape the advisor uses (overrides SoilGrids where the card has data)
export function cardToSoil(card, base = {}) {
  const s = { ...base };
  if (card.ph != null) s.phh2o = card.ph;
  if (card.oc != null) s.soc = card.oc * 10; // % -> g/kg
  if (card.ec != null) s.ec = card.ec;
  s.fromCard = true;
  return s;
}

// A tiny sample card so farmers (and testers) can see how it works without a photo
export const SAMPLE_TEXT = `SOIL HEALTH CARD
Farmer: Sample  Village: Gharaunda  District: Karnal
S.No Parameter Test Value Unit Rating
1 pH 8.6 Strongly alkaline
2 EC 0.62 dS/m Normal
3 Organic Carbon (OC) 0.38 % Low
4 Available Nitrogen (N) 196 kg/ha Low
5 Available Phosphorus (P) 18.5 kg/ha Medium
6 Available Potassium (K) 312 kg/ha High
7 Available Sulphur (S) 8.2 ppm Low
8 Available Zinc (Zn) 0.48 ppm Deficient
9 Available Boron (B) 0.62 ppm Sufficient
10 Available Iron (Fe) 6.1 ppm Sufficient
11 Available Manganese (Mn) 5.4 ppm Sufficient
12 Available Copper (Cu) 0.9 ppm Sufficient`;
