// Crop knowledge base for Haryana.
// MSP values are official (Government of India, CCEA):
//   Rabi Marketing Season 2027-28 (approved 30 Sep 2026) — for crops sown Oct–Dec 2026
//   Kharif Marketing Season 2026-27 (approved 13 May 2026)
// Yield, cost and water figures are INDICATIVE per-acre ranges for Haryana, compiled from
// CCS HAU package-of-practices and CACP cost-of-cultivation reports. Edit them freely —
// every number the advisor uses lives in this file.
//
// units: yield in quintals/acre, cost in ₹/acre (paid-out cost incl. hired labour, excl. land rent),
// byproduct = straw/fodder value in ₹/acre (e.g. wheat bhusa)
// water in mm per season, refPrice in ₹/quintal (used only when no live mandi price and no MSP).

export const MSP_SOURCE = {
  rabi: "MSP Rabi Marketing Season 2027-28 (CCEA, 30 Sep 2026)",
  kharif: "MSP Kharif Marketing Season 2026-27 (CCEA, 13 May 2026)",
};

export const SEASONS = {
  rabi: { en: "Rabi (winter)", hi: "रबी (सर्दी)", sow: [10, 11, 12], harvest: [3, 4, 5] },
  kharif: { en: "Kharif (monsoon)", hi: "खरीफ (बरसात)", sow: [5, 6, 7], harvest: [9, 10, 11] },
  zaid: { en: "Zaid (summer)", hi: "जायद (गर्मी)", sow: [3, 4], harvest: [5, 6] },
};

// soil: which textures the crop tolerates. water: 1 = low, 2 = medium, 3 = high need.
// zones: NE = north-eastern (canal/tubewell, alluvial), SW = south-western (sandy, semi-arid)
export const CROPS = [
  {
    id: "wheat", byproduct: 9000, en: "Wheat", hi: "गेहूं", season: "rabi", msp: 2610,
    yield: [17, 23], cost: [24000, 30000], water: 450, waterNeed: 2,
    soil: ["loam", "clay loam", "sandy loam", "silty loam"], zones: ["NE", "SW"],
    salinityTol: "medium", duration: 145, sowWindow: "1–25 Nov (timely), up to 15 Dec (late varieties)",
    agmark: /^wheat/i,
    varieties: "HD 3086, DBW 187, DBW 222, WH 1105, HD 3226 (timely); WH 1124, HD 3059 (late)",
    precautions: {
      en: [
        "Do not burn paddy straw — sow with Happy Seeder / Super Seeder (subsidy available).",
        "Yellow rust risk in Jan–Feb in Ambala, Yamunanagar, Panchkula: scout leaves, spray propiconazole 25 EC @ 200 ml/acre on first sign.",
        "First irrigation at crown root initiation (21–25 days after sowing) is the most important.",
        "Termites in sandy soils: seed treatment with chlorpyriphos.",
        "Heat above 34°C in March during grain filling: give light irrigation in the evening.",
      ],
      hi: [
        "पराली न जलाएं — हैप्पी सीडर / सुपर सीडर से बुवाई करें (सब्सिडी उपलब्ध)।",
        "जनवरी–फरवरी में अंबाला, यमुनानगर, पंचकूला में पीला रतुआ का खतरा: पत्तियों की जांच करें, लक्षण दिखते ही प्रोपिकोनाजोल 25 EC 200 मि.ली./एकड़ छिड़कें।",
        "पहली सिंचाई (बुवाई के 21–25 दिन बाद, CRI अवस्था) सबसे ज़रूरी है।",
        "रेतीली मिट्टी में दीमक: बीज का क्लोरपायरीफॉस से उपचार करें।",
        "मार्च में दाना भरते समय 34°C से अधिक गर्मी हो तो शाम को हल्की सिंचाई करें।",
      ],
    },
    costSplit: { seed: 0.12, fertilizer: 0.22, protection: 0.08, irrigation: 0.12, labour: 0.18, machinery: 0.28 },
  },
  {
    id: "mustard", byproduct: 1000, en: "Mustard", hi: "सरसों", season: "rabi", msp: 6613,
    yield: [7, 10], cost: [13000, 17000], water: 250, waterNeed: 1,
    soil: ["sandy loam", "loam", "sand", "loamy sand", "clay loam"], zones: ["SW", "NE"],
    salinityTol: "high", duration: 135, sowWindow: "1–31 Oct (best 10–25 Oct); late sowing up to mid-Nov lowers yield",
    agmark: /mustard|rapeseed/i,
    varieties: "RH 725, RH 761, RH 1424, RH 1706 (CCS HAU)",
    precautions: {
      en: [
        "Aphids peak late Dec–Jan: spray dimethoate 30 EC @ 250–400 ml/acre if 10–15% plants infested.",
        "Frost nights (min temp below 3°C): give a light irrigation to protect pods.",
        "White rust and Alternaria blight in humid, cloudy weather: mancozeb spray.",
        "Apply sulphur (gypsum or SSP) — it raises oil content.",
      ],
      hi: [
        "दिसंबर अंत–जनवरी में चेपा (एफिड): 10–15% पौधे प्रभावित हों तो डाइमेथोएट 30 EC 250–400 मि.ली./एकड़ छिड़कें।",
        "पाले की रातों (न्यूनतम तापमान 3°C से कम) में हल्की सिंचाई करें।",
        "नम, बादल वाले मौसम में सफेद रतुआ और झुलसा: मैंकोजेब का छिड़काव।",
        "गंधक (जिप्सम या SSP) डालें — इससे तेल की मात्रा बढ़ती है।",
      ],
    },
    costSplit: { seed: 0.05, fertilizer: 0.25, protection: 0.12, irrigation: 0.08, labour: 0.25, machinery: 0.25 },
  },
  {
    id: "gram", byproduct: 1500, en: "Gram (Chana)", hi: "चना", season: "rabi", msp: 5958,
    yield: [6, 9], cost: [12000, 16000], water: 200, waterNeed: 1,
    soil: ["sandy loam", "loamy sand", "loam", "sand"], zones: ["SW"],
    salinityTol: "low", duration: 140, sowWindow: "10 Oct–5 Nov (barani: first fortnight of Oct)",
    agmark: /bengal gram|gram|chana/i,
    varieties: "HC 1, HC 3, HC 5, GNG 1581",
    precautions: {
      en: [
        "Pod borer at flowering/pod stage: install pheromone traps; spray indoxacarb if 1 larva per plant.",
        "Wilt in poorly drained soils: treat seed with Trichoderma; avoid fields with standing water.",
        "Do not over-irrigate — one irrigation at pre-flowering is usually enough.",
        "Rhizobium seed inoculation reduces urea need.",
      ],
      hi: [
        "फूल/फली अवस्था में फली छेदक: फेरोमोन ट्रैप लगाएं; प्रति पौधा 1 सुंडी हो तो इंडोक्साकार्ब छिड़कें।",
        "जल-भराव वाली मिट्टी में उखेड़ा (विल्ट): बीज का ट्राइकोडर्मा से उपचार करें।",
        "ज़्यादा सिंचाई न करें — फूल आने से पहले एक सिंचाई प्रायः पर्याप्त है।",
        "राइजोबियम टीका लगाने से यूरिया की ज़रूरत घटती है।",
      ],
    },
    costSplit: { seed: 0.2, fertilizer: 0.12, protection: 0.15, irrigation: 0.05, labour: 0.23, machinery: 0.25 },
  },
  {
    id: "barley", byproduct: 5000, en: "Barley", hi: "जौ", season: "rabi", msp: 2286,
    yield: [14, 19], cost: [14000, 18000], water: 250, waterNeed: 1,
    soil: ["sandy loam", "loamy sand", "loam", "sand", "clay loam"], zones: ["SW"],
    salinityTol: "high", duration: 130, sowWindow: "25 Oct–25 Nov",
    agmark: /barley|jau/i,
    varieties: "BH 393, BH 946, BH 959 (malt & feed)",
    precautions: {
      en: [
        "Best choice for saline or alkaline patches where wheat struggles.",
        "Malt-barley contracts with breweries can pay above MSP — check before sowing.",
        "Aphids and stripe rust: same management as wheat.",
      ],
      hi: [
        "जहाँ गेहूं ठीक नहीं होता उन लवणीय/क्षारीय खेतों के लिए सबसे अच्छा विकल्प।",
        "माल्ट-जौ के लिए ब्रुअरी से अनुबंध MSP से ज़्यादा दाम दे सकता है — बुवाई से पहले पता करें।",
        "चेपा और रतुआ: गेहूं जैसा ही प्रबंधन।",
      ],
    },
    costSplit: { seed: 0.12, fertilizer: 0.2, protection: 0.06, irrigation: 0.1, labour: 0.22, machinery: 0.3 },
  },
  {
    id: "potato", en: "Potato", hi: "आलू", season: "rabi", msp: null, refPrice: 1100,
    yield: [90, 130], cost: [75000, 95000], water: 500, waterNeed: 2,
    soil: ["sandy loam", "loam", "silty loam"], zones: ["NE"],
    salinityTol: "low", duration: 100, sowWindow: "1–25 Oct",
    agmark: /^potato/i,
    varieties: "Kufri Pukhraj, Kufri Bahar, Kufri Mohan",
    precautions: {
      en: [
        "High price risk — no MSP. Book cold-storage space or a buyer before planting.",
        "Late blight in foggy, humid weather (Dec–Jan): preventive mancozeb, then cymoxanil+mancozeb.",
        "Keep soil moist but never waterlogged; stop irrigation 10 days before digging.",
      ],
      hi: [
        "दाम का बड़ा जोखिम — MSP नहीं। बुवाई से पहले कोल्ड-स्टोरेज या खरीदार तय करें।",
        "कोहरे और नमी (दिसंबर–जनवरी) में पछेती झुलसा: पहले मैंकोजेब, फिर साइमोक्सानिल+मैंकोजेब।",
        "मिट्टी नम रखें पर पानी न भरे; खुदाई से 10 दिन पहले सिंचाई बंद करें।",
      ],
    },
    costSplit: { seed: 0.4, fertilizer: 0.15, protection: 0.1, irrigation: 0.08, labour: 0.17, machinery: 0.1 },
  },
  {
    id: "onion_rabi", en: "Onion", hi: "प्याज", season: "rabi", msp: null, refPrice: 1500,
    yield: [80, 110], cost: [55000, 70000], water: 450, waterNeed: 2,
    soil: ["sandy loam", "loam", "silty loam", "clay loam"], zones: ["NE", "SW"],
    salinityTol: "low", duration: 150, sowWindow: "Nursery Oct–Nov, transplant Dec–mid Jan",
    agmark: /^onion/i,
    varieties: "Hisar 2, Hisar Onion 3, Agrifound Light Red",
    precautions: {
      en: [
        "Very volatile prices — sell in stages, use proper ventilated storage.",
        "Thrips and purple blotch: spray when first seen, add sticker.",
        "Stop irrigation 10–15 days before harvest for better storage life.",
      ],
      hi: [
        "दाम बहुत अस्थिर — धीरे-धीरे बेचें, हवादार भंडारण रखें।",
        "थ्रिप्स और बैंगनी धब्बा: दिखते ही छिड़काव करें।",
        "अच्छे भंडारण के लिए कटाई से 10–15 दिन पहले सिंचाई बंद करें।",
      ],
    },
    costSplit: { seed: 0.15, fertilizer: 0.18, protection: 0.12, irrigation: 0.1, labour: 0.35, machinery: 0.1 },
  },
  {
    id: "paddy", byproduct: 1000, en: "Paddy (non-basmati)", hi: "धान (परमल)", season: "kharif", msp: 2441,
    yield: [26, 32], cost: [32000, 40000], water: 1300, waterNeed: 3,
    soil: ["clay", "clay loam", "silty clay", "loam", "silty loam", "silty clay loam"], zones: ["NE"],
    salinityTol: "medium", duration: 125, sowWindow: "Transplant from 15 June (state rule); nursery from 15 May",
    agmark: /paddy.*common|paddy\(dhan\)\(common\)|^paddy/i,
    varieties: "PR 126, PR 131, HKR 47 (short duration saves water)",
    precautions: {
      en: [
        "Very high water use in districts with falling groundwater — consider DSR or maize/cotton (state crop-diversification incentives available).",
        "Do not transplant before the date notified by the state (subsoil-water law).",
        "Brown plant hopper (Sept): look at stem base; avoid excess urea.",
        "Plan straw management now (in-situ / ex-situ) — burning is penalised.",
      ],
      hi: [
        "गिरते भूजल वाले जिलों में बहुत ज़्यादा पानी — DSR या मक्का/कपास पर विचार करें (राज्य फसल-विविधीकरण प्रोत्साहन उपलब्ध)।",
        "राज्य की अधिसूचित तारीख से पहले रोपाई न करें (भूजल संरक्षण कानून)।",
        "भूरा फुदका (सितंबर): तने के निचले हिस्से की जांच करें; ज़्यादा यूरिया न डालें।",
        "पराली प्रबंधन की योजना अभी बनाएं — जलाने पर जुर्माना है।",
      ],
    },
    costSplit: { seed: 0.05, fertilizer: 0.18, protection: 0.12, irrigation: 0.18, labour: 0.25, machinery: 0.22 },
  },
  {
    id: "basmati", byproduct: 1000, en: "Basmati rice", hi: "बासमती धान", season: "kharif", msp: null, refPrice: 3500,
    yield: [16, 22], cost: [30000, 36000], water: 1100, waterNeed: 3,
    soil: ["clay", "clay loam", "silty clay", "loam", "silty loam", "silty clay loam"], zones: ["NE"],
    salinityTol: "medium", duration: 135, sowWindow: "Transplant 1–20 July",
    agmark: /basmati|1121|1509|1718/i,
    varieties: "Pusa Basmati 1121, 1509, 1718, 1885, 1886",
    precautions: {
      en: [
        "No MSP — price follows export demand. Watch mandi trend before selling.",
        "Use only pesticides allowed for export (residue limits) — avoid tricyclazole/buprofezin near harvest.",
        "Bakanae disease: seed treatment with carbendazim.",
      ],
      hi: [
        "MSP नहीं — दाम निर्यात मांग पर निर्भर। बेचने से पहले मंडी का रुझान देखें।",
        "केवल निर्यात-स्वीकृत कीटनाशक ही प्रयोग करें — कटाई के पास ट्राइसाइक्लाज़ोल/बुप्रोफेज़िन से बचें।",
        "बकाने रोग: बीज का कार्बेन्डाजिम से उपचार करें।",
      ],
    },
    costSplit: { seed: 0.06, fertilizer: 0.15, protection: 0.12, irrigation: 0.17, labour: 0.28, machinery: 0.22 },
  },
  {
    id: "cotton", en: "Cotton (American)", hi: "कपास (नरमा)", season: "kharif", msp: 8267,
    yield: [7, 10], cost: [32000, 42000], water: 700, waterNeed: 2,
    soil: ["sandy loam", "loam", "clay loam", "loamy sand"], zones: ["SW"],
    salinityTol: "high", duration: 180, sowWindow: "15 Apr–15 May",
    agmark: /^cotton|kapas/i,
    varieties: "Approved Bt hybrids for Haryana; desi cotton (HD 123, HD 432) for low input",
    precautions: {
      en: [
        "Pink bollworm: destroy previous season's stalks before Feb; use pheromone traps from 45 days.",
        "Whitefly: avoid early synthetic pyrethroids; monitor yellow sticky traps.",
        "Sow before 15 May — late crop gets more pest attack.",
      ],
      hi: [
        "गुलाबी सुंडी: फरवरी से पहले पिछली फसल की छड़ियां नष्ट करें; 45 दिन से फेरोमोन ट्रैप लगाएं।",
        "सफेद मक्खी: शुरू में पायरेथ्रॉइड न छिड़कें; पीले चिपचिपे ट्रैप से निगरानी करें।",
        "15 मई से पहले बुवाई करें — पछेती फसल पर कीट ज़्यादा।",
      ],
    },
    costSplit: { seed: 0.1, fertilizer: 0.15, protection: 0.2, irrigation: 0.12, labour: 0.3, machinery: 0.13 },
  },
  {
    id: "bajra", byproduct: 3000, en: "Bajra (pearl millet)", hi: "बाजरा", season: "kharif", msp: 2900,
    yield: [8, 12], cost: [11000, 15000], water: 350, waterNeed: 1,
    soil: ["sand", "loamy sand", "sandy loam", "loam"], zones: ["SW"],
    salinityTol: "high", duration: 85, sowWindow: "1–20 July (with monsoon)",
    agmark: /bajra|pearl millet/i,
    varieties: "HHB 67 Improved, HHB 272, HHB 299 (iron-rich)",
    precautions: {
      en: [
        "Downy mildew (green ear): treat seed with metalaxyl; remove infected plants early.",
        "Very drought tolerant — good fallback in rainfed sandy fields.",
        "Bird damage at grain stage: harvest on time.",
      ],
      hi: [
        "जोगिया (डाउनी मिल्ड्यू): बीज का मेटालेक्सिल से उपचार करें; रोगी पौधे जल्दी उखाड़ें।",
        "सूखा बहुत सहन करता है — बारानी रेतीले खेतों के लिए अच्छा।",
        "दाना बनने पर पक्षियों से नुकसान: समय पर कटाई करें।",
      ],
    },
    costSplit: { seed: 0.08, fertilizer: 0.2, protection: 0.06, irrigation: 0.04, labour: 0.27, machinery: 0.35 },
  },
  {
    id: "maize", byproduct: 2000, en: "Maize", hi: "मक्का", season: "kharif", msp: 2410,
    yield: [16, 24], cost: [20000, 26000], water: 500, waterNeed: 2,
    soil: ["loam", "sandy loam", "clay loam", "silty loam"], zones: ["NE"],
    salinityTol: "low", duration: 100, sowWindow: "25 June–15 July",
    agmark: /^maize/i,
    varieties: "HQPM 1, HM 10, HM 11, private hybrids",
    precautions: {
      en: [
        "Uses less than half the water of paddy — eligible for crop-diversification incentives.",
        "Fall armyworm: check leaf whorls weekly; spray emamectin benzoate early.",
        "Needs good drainage — waterlogging for 2 days damages the crop.",
      ],
      hi: [
        "धान से आधे से भी कम पानी — फसल-विविधीकरण प्रोत्साहन के योग्य।",
        "फॉल आर्मीवर्म: हर हफ्ते गोभ की जांच करें; शुरुआत में इमामेक्टिन बेंजोएट छिड़कें।",
        "अच्छी जल-निकासी ज़रूरी — 2 दिन पानी भरा रहे तो नुकसान।",
      ],
    },
    costSplit: { seed: 0.2, fertilizer: 0.22, protection: 0.08, irrigation: 0.1, labour: 0.18, machinery: 0.22 },
  },
  {
    id: "moong", byproduct: 1000, en: "Moong (green gram)", hi: "मूंग", season: "kharif", msp: 8780,
    yield: [4, 6], cost: [10000, 13000], water: 300, waterNeed: 1,
    soil: ["sandy loam", "loamy sand", "loam", "sand"], zones: ["SW", "NE"],
    salinityTol: "low", duration: 65, sowWindow: "Kharif: 1–15 July. Summer moong: 15 Mar–15 Apr after wheat",
    agmark: /green gram|moong/i,
    varieties: "MH 421, MH 1142, MH 1762 (CCS HAU)",
    precautions: {
      en: [
        "Yellow mosaic virus spread by whitefly: uproot infected plants, spray if whitefly high.",
        "Short crop that fixes nitrogen — saves fertilizer for the next crop.",
        "Summer moong after wheat earns extra income in 65 days.",
      ],
      hi: [
        "पीला मोज़ेक (सफेद मक्खी से): रोगी पौधे उखाड़ें, सफेद मक्खी ज़्यादा हो तो छिड़काव करें।",
        "कम समय की फसल जो नाइट्रोजन देती है — अगली फसल में खाद बचती है।",
        "गेहूं के बाद गर्मी की मूंग 65 दिन में अतिरिक्त आय देती है।",
      ],
    },
    costSplit: { seed: 0.18, fertilizer: 0.1, protection: 0.15, irrigation: 0.07, labour: 0.25, machinery: 0.25 },
  },
  {
    id: "guar", byproduct: 1500, en: "Guar (cluster bean)", hi: "ग्वार", season: "kharif", msp: null, refPrice: 5000,
    yield: [4, 7], cost: [9000, 12000], water: 300, waterNeed: 1,
    soil: ["sand", "loamy sand", "sandy loam"], zones: ["SW"],
    salinityTol: "high", duration: 100, sowWindow: "1–20 July",
    agmark: /guar/i,
    varieties: "HG 365, HG 563, HG 2-20",
    precautions: {
      en: [
        "Price depends on guar-gum export demand — check trend before sowing.",
        "Bacterial blight: seed treatment with streptocycline.",
        "Good for sandy rainfed land; improves soil nitrogen.",
      ],
      hi: [
        "दाम ग्वार-गम निर्यात पर निर्भर — बुवाई से पहले रुझान देखें।",
        "जीवाणु झुलसा: बीज का स्ट्रेप्टोसाइक्लिन से उपचार करें।",
        "रेतीली बारानी ज़मीन के लिए अच्छी; मिट्टी में नाइट्रोजन बढ़ाती है।",
      ],
    },
    costSplit: { seed: 0.15, fertilizer: 0.1, protection: 0.1, irrigation: 0.03, labour: 0.27, machinery: 0.35 },
  },
  {
    id: "sugarcane", en: "Sugarcane", hi: "गन्ना", season: "zaid", msp: null, refPrice: 400,
    yield: [300, 380], cost: [65000, 85000], water: 1800, waterNeed: 3,
    soil: ["loam", "clay loam", "silty loam", "sandy loam"], zones: ["NE"],
    salinityTol: "medium", duration: 330, sowWindow: "Spring: Feb–Mar. Autumn: Oct",
    agmark: /sugarcane/i, priceNote: "State Advised Price (SAP) is paid by sugar mills — check the current Haryana SAP.",
    varieties: "CoH 160, CoH 167, Co 0238, Co 15023",
    precautions: {
      en: [
        "Long crop (11–12 months) with very high water need; plan only with assured irrigation and a mill tie-up.",
        "Top borer and pyrilla: release Trichogramma cards; avoid excess nitrogen.",
        "Payments from mills can be delayed — budget your cash flow.",
      ],
      hi: [
        "लंबी फसल (11–12 महीने), बहुत ज़्यादा पानी; पक्की सिंचाई और मिल से अनुबंध हो तभी लगाएं।",
        "चोटी बेधक और पाइरिला: ट्राइकोग्रामा कार्ड छोड़ें; ज़्यादा नाइट्रोजन न दें।",
        "मिल से भुगतान देर से आ सकता है — नकदी की योजना बनाएं।",
      ],
    },
    costSplit: { seed: 0.2, fertilizer: 0.15, protection: 0.08, irrigation: 0.15, labour: 0.27, machinery: 0.15 },
  },
  {
    id: "moong_summer", byproduct: 1000, en: "Summer moong", hi: "गर्मी की मूंग", season: "zaid", msp: 8780,
    yield: [3.5, 5], cost: [9000, 12000], water: 250, waterNeed: 1,
    soil: ["sandy loam", "loamy sand", "loam", "clay loam"], zones: ["NE", "SW"],
    salinityTol: "low", duration: 65, sowWindow: "15 Mar–15 Apr, right after wheat harvest",
    agmark: /green gram|moong/i,
    varieties: "MH 421, MH 1142, SML 668",
    precautions: {
      en: [
        "Fits the gap between wheat and paddy — adds income and nitrogen.",
        "Needs 3–4 light irrigations in April–May heat.",
        "Harvest before monsoon rains to avoid pod damage.",
      ],
      hi: [
        "गेहूं और धान के बीच के खाली समय में फिट — आय और नाइट्रोजन दोनों।",
        "अप्रैल–मई की गर्मी में 3–4 हल्की सिंचाई चाहिए।",
        "बारिश से पहले कटाई करें ताकि फलियां खराब न हों।",
      ],
    },
    costSplit: { seed: 0.2, fertilizer: 0.1, protection: 0.15, irrigation: 0.12, labour: 0.2, machinery: 0.23 },
  },
];

export const COST_LABELS = {
  seed: { en: "Seed", hi: "बीज" },
  fertilizer: { en: "Fertilizer", hi: "खाद" },
  protection: { en: "Pest & disease control", hi: "कीट व रोग नियंत्रण" },
  irrigation: { en: "Irrigation / power", hi: "सिंचाई / बिजली" },
  labour: { en: "Labour", hi: "मज़दूरी" },
  machinery: { en: "Machinery / tractor", hi: "मशीनरी / ट्रैक्टर" },
};
