// The farmer comes first: what kind of farming, and what that means for the advice.
// Everything here is either the farmer's own answer or a statement taken from a named public source (SOURCES).
// No yields, prices or profit figures are given for fruit or timber: no verified Haryana figures were found, so none are invented.

export const SOURCES = {
  aaz: { en: "ICAR, Annals of Arid Zone: fruit crops that suit arid conditions; frost risk", url: "https://epubs.icar.org.in/index.php/AAZ/article/view/63322/25931" },
  ciah: { en: "ICAR-CIAH, All India Coordinated Research Project on Arid Zone Fruits (a centre is at CCS HAU, Bawal, Rewari)", url: "https://ciah.icar.gov.in/aicrp.php" },
  ber: { en: "CCS HAU Regional Research Station, Bawal: ber cultivars for Haryana", url: "https://epubs.icar.org.in/index.php/AAZ/article/download/65085/27414/163630" },
  grant: { en: "Haryana Horticulture Department announcement, November 2025 (PTI)", url: "https://www.theweek.in/wire-updates/business/2025/11/09/nrg3-hr-horticulture.html" },
  citrus: { en: "Hisar district administration on orchard grants for citrus and guava (The Tribune)", url: "https://www.tribuneindia.com/news/haryana/utilise-govt-crop-diversification-schemes-hisar-dc-to-farmers/amp" },
  young: { en: "ICAR, Indian Journal of Agricultural Sciences: intercrops before fruit trees start bearing", url: "https://epubs.icar.org.in/index.php/IJAgS/article/download/98534/39133/341431" },
  forest: { en: "Haryana Forest Department: agroforestry models (poplar)", url: "https://haryanaforest.gov.in/agro-forestry-models/" },
  age: { en: "CCS HAU, Hisar (Nandal and Hooda): crops under poplar over seven years", url: "https://epubs.icar.org.in/index.php/IJA/article/view/100625" },
  line: { en: "ICAR-NIASM and CCS HAU: poplar on field boundaries and crop yield", url: "https://www.mdpi.com/2071-1050/14/14/8663" },
  lease: { en: "The Haryana Lease of Agricultural Land Act, 2024 (Haryana Act 23 of 2024)", url: "https://prsindia.org/files/bills_acts/acts_states/haryana/2024/Act23of2024HR.pdf" },
};

export const FARMER_TYPES = {
  seasonal: {
    icon: "wheat", en: "Seasonal farmer", hi: "सीजनल किसान",
    desc: { en: "You sow and harvest every season.", hi: "हर सीजन में बोना और काटना।" },
    eg: { en: "Wheat, mustard, bajra, vegetables", hi: "गेहूं, सरसों, बाजरा, सब्ज़ी" },
  },
  medium_term: {
    icon: "apple", en: "Medium-term farmer", hi: "मिड-टर्म किसान",
    desc: { en: "Fruit trees that take a few years to start giving.", hi: "फलों का बाग, जो कुछ साल में फल देने लगता है।" },
    eg: { en: "Amla, ber, guava, kinnow", hi: "आंवला, बेर, अमरूद, किन्नू" },
  },
  long_term: {
    icon: "trees", en: "Long-term farmer", hi: "लॉन्ग-टर्म किसान",
    desc: { en: "Timber trees that are cut after many years.", hi: "लकड़ी के पेड़, जो कई साल बाद कटते हैं।" },
    eg: { en: "Poplar, eucalyptus (safeda)", hi: "पॉपलर, सफेदा" },
  },
};
export const TYPE_IDS = Object.keys(FARMER_TYPES);

/* ---------------- the stored profile ---------------- */
export const PROFILE_KEY = "km-profile";
export const emptyProfile = () => ({
  version: 1, language: null, location: { district: null },
  farmer_category: null,            // seasonal | medium_term | long_term
  land_ownership: null,             // own | leased_in | both | none
  land_size_acres: null,
  primary_crops: [],
  irrigation: null,                 // good | limited | rainfed (same words as the Crops page)
  interest_land_sharing: null,      // true | false
  interest_intercropping: null,     // true | false
  plantation: { tree_age: null, tractor_access: null },   // tree_age: new | young | grown ; tractor_access: yes | no | unsure
  land_share: { role: null, trees: null },                 // role: owner | cultivator ; trees: none | young | grown
  updated_at: null,
});
// Anything read back from storage is checked field by field, so a damaged or hand-edited entry cannot break the app
export function cleanProfile(raw) {
  const p = emptyProfile(), r = raw && typeof raw === "object" ? raw : {};
  const one = (v, list) => (list.includes(v) ? v : null), bool = (v) => (v === true || v === false ? v : null);
  p.language = one(r.language, ["hi", "en"]);
  p.location.district = typeof r.location?.district === "string" ? r.location.district.slice(0, 40) : null;
  p.farmer_category = one(r.farmer_category, TYPE_IDS);
  p.land_ownership = one(r.land_ownership, ["own", "leased_in", "both", "none"]);
  p.land_size_acres = Number.isFinite(+r.land_size_acres) && +r.land_size_acres > 0 && +r.land_size_acres < 5000 ? +r.land_size_acres : null;
  p.primary_crops = Array.isArray(r.primary_crops) ? r.primary_crops.filter((x) => typeof x === "string").slice(0, 8) : [];
  p.irrigation = one(r.irrigation, ["good", "limited", "rainfed"]);
  p.interest_land_sharing = bool(r.interest_land_sharing);
  p.interest_intercropping = bool(r.interest_intercropping);
  p.plantation.tree_age = one(r.plantation?.tree_age, ["new", "young", "grown"]);
  p.plantation.tractor_access = one(r.plantation?.tractor_access, ["yes", "no", "unsure"]);
  p.land_share.role = one(r.land_share?.role, ["owner", "cultivator"]);
  p.land_share.trees = one(r.land_share?.trees, ["none", "young", "grown"]);
  p.updated_at = typeof r.updated_at === "string" ? r.updated_at : null;
  return p;
}

// The four basic answers the app needs before it starts: language, district, kind of farming, water
export const isComplete = (p) => !!(p && p.language && p.location && p.location.district && p.farmer_category && p.irrigation);

/* ---------------- fruit orchards ---------------- */
// dry: named by ICAR among fruit crops that do well in arid conditions. frost: the same source warns that frost hurts it.
export const FRUITS = [
  { id: "ber", en: "Ber", hi: "बेर", dry: true, frost: true, src: ["aaz", "ber"], note: { en: "Varieties preferred in Haryana: Kaithli, Gola, Umran, Mudia Murhara.", hi: "हरियाणा में पसंद की जाने वाली किस्में: कैथली, गोला, उमरान, मुड़िया मुरहरा।" } },
  { id: "aonla", en: "Amla (aonla)", hi: "आंवला", dry: true, frost: true, src: ["aaz", "ciah"], note: { en: "Varieties found promising across the arid region: NA-7, Chakaiya, Kanchan, NA-6. Plant NA-6 with NA-7 for pollination.", hi: "सूखे इलाकों में अच्छी पाई गई किस्में: एनए-7, चकैया, कंचन, एनए-6। एनए-7 के साथ एनए-6 लगाएं, इससे फल अच्छा बैठता है।" } },
  { id: "bael", en: "Bael", hi: "बेल", dry: true, src: ["aaz"] },
  { id: "lasoda", en: "Lasoda (gonda)", hi: "लसोड़ा (गोंदा)", dry: true, frost: true, src: ["aaz"] },
  { id: "pomegranate", en: "Pomegranate", hi: "अनार", dry: true, src: ["aaz"] },
  { id: "datepalm", en: "Date palm", hi: "खजूर", dry: true, src: ["aaz"] },
  { id: "kinnow", en: "Kinnow and other citrus", hi: "किन्नू और नींबू वर्गीय", dry: false, src: ["aaz", "citrus"] },
  { id: "guava", en: "Guava", hi: "अमरूद", dry: false, src: ["citrus"] },
];
// How each fruit sits with this farmer's water. Returns the list ordered best first, each with fit: "good" | "water" (needs assured water)
export function fruitFit(zone, water) {
  const short = water === "limited" || water === "rainfed";
  return FRUITS.map((f) => ({ ...f, fit: f.dry ? "good" : short ? "water" : "good", first: f.dry ? short || zone === "SW" : !short && zone !== "SW" }))
    .sort((a, b) => (b.first ? 1 : 0) - (a.first ? 1 : 0) || (a.fit === "water" ? 1 : 0) - (b.fit === "water" ? 1 : 0));
}

/* ---------------- poplar and crops between the rows ---------------- */
// The Forest Department says poplar suits fertile soil with a high water table. So: assured water in the canal and tubewell belt = fits;
// short water anywhere = not advised; assured water in the dry belt = ask locally first.
export function poplarFit(zone, water) {
  if (water === "limited" || water === "rainfed") return "no";
  return zone === "NE" ? "yes" : "ask";
}
export const UNDER_POPLAR = {
  winter: { en: ["wheat", "potato", "mustard", "gram", "pea", "lentil"], hi: ["गेहूं", "आलू", "सरसों", "चना", "मटर", "मसूर"] },
  summer: { en: ["sugarcane", "sorghum (fodder)", "maize", "soybean"], hi: ["गन्ना", "ज्वार (चारा)", "मक्का", "सोयाबीन"] },
  shade: { en: ["turmeric", "ginger"], hi: ["हल्दी", "अदरक"] },
  veg: { en: ["tomato", "chilli", "radish"], hi: ["टमाटर", "मिर्च", "मूली"] },
};
// age: new | young (1 to 3 years) | grown (4 years and more). tractor: yes | no | unsure
export function underPoplar(age, tractor) {
  const groups = age === "grown" ? ["winter", "shade"] : ["winter", "summer", "shade", "veg"];
  // without tractor access only crops worked by hand are practical
  const use = tractor === "no" ? groups.filter((g) => g === "shade" || g === "veg") : groups;
  return { groups: use.length ? use : ["shade"], lower: age === "grown", handOnly: tractor === "no", checkTractor: tractor !== "yes" };
}

/* ---------------- land sharing ---------------- */
// Plain cautions for a land-sharing talk, from the farmer's own answers. Nothing here is a promise or a legal opinion.
export function shareNotes({ role, acres, irrigation, trees, tractor }) {
  const notes = [];
  if (trees === "grown" && tractor !== "yes") notes.push("handOnly");
  else if (trees && trees !== "none" && tractor !== "yes") notes.push("checkTractor");
  if (trees && trees !== "none") notes.push("protectTrees");
  if (irrigation === "rainfed") notes.push("rainfed");
  if (irrigation === "limited") notes.push("limitedWater");
  if (acres != null && acres < 0.5) notes.push("small");
  if (role === "owner") notes.push("ownerPapers");
  if (role === "cultivator") notes.push("seeLand");
  return notes;
}
