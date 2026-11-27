// "My leaves are turning yellow": two questions, then what it could be. This is the first guided problem in the assistant.
// It never names a chemical or a dose, and it never claims to be sure: the same yellowing can come from more than one nutrient,
// and disease or insect damage can look like a shortage (ICAR, Indian Farming, October 2022).
// Rules and their sources:
//   older leaves turn yellow first: nitrogen; older leaves yellow between green veins: magnesium (TNAU Agritech, mineral nutrition)
//   edges of older leaves yellow then scorch: potassium; young leaves yellow between green veins: iron, often on high-pH soil (Univ. of Maryland)
//   young leaves evenly pale: sulphur (ICAR, Indian Farming, May 2025)
//   nutrients the plant can move show on old leaves, those it cannot move show on new leaves (Cornell University, soil health notes)

export const SOURCES = [
  { en: "TNAU Agritech Portal: mineral nutrition, deficiency symptoms", url: "https://agritech.tnau.ac.in/agriculture/agri_min_nutri_def_symptoms.html" },
  { en: "ICAR, Indian Farming (Oct 2022): micronutrient deficiency in rice", url: "https://epubs.icar.org.in/index.php/IndFarm/article/download/125515/48454/339365" },
  { en: "ICAR, Indian Farming (May 2025): symptoms of nutrient deficiencies", url: "https://epubs.icar.org.in/index.php/IndFarm/article/download/155681/62905/493522" },
  { en: "University of Maryland: plant nutrient deficiency symptoms", url: "https://enst.umd.edu/index.php/research/research-centers-labs/soil-quality-lab/plant-deficiencies" },
  { en: "Cornell University: diagnosing deficiencies from leaf symptoms", url: "https://blogs.cornell.edu/soilnow/ph/how-to-diagnose-plant-nutrient-deficiencies-using-leaf-symptoms" },
];
// does this sentence describe yellowing leaves?
export const isLeafYellow = (text) => { const s = String(text || "").toLowerCase(); return /(पत्त|पत्ती|पात|leaf|leaves)/.test(s) && /(पील|पीळ|yellow)/.test(s); };

export const QUESTIONS = [
  { id: "where", q: { en: "Which leaves are turning yellow?", hi: "कौन से पत्ते पीले हो रहे हैं?" }, opts: [["old", { en: "The old leaves at the bottom", hi: "नीचे के पुराने पत्ते" }], ["new", { en: "The new leaves at the top", hi: "ऊपर के नए पत्ते" }], ["all", { en: "The whole plant", hi: "पूरा पौधा" }], ["unsure", { en: "I am not sure", hi: "पता नहीं" }]] },
  { id: "pattern", q: { en: "What does the yellowing look like?", hi: "पीलापन कैसा दिखता है?" }, opts: [["whole", { en: "The whole leaf is yellow", hi: "पूरा पत्ता पीला है" }], ["veins", { en: "Veins green, yellow in between", hi: "नसें हरी हैं, बीच का हिस्सा पीला" }], ["edge", { en: "Yellow or burnt at the edges", hi: "किनारे पीले या जले हुए" }], ["spots", { en: "Spots or patches", hi: "धब्बे या चकत्ते" }]] },
];
// answers: { where, pattern } -> { nutrient: id | null, see: "disease" | null }
export function leafRead(a) {
  if (a.pattern === "spots") return { nutrient: null, see: "disease" };
  const key = `${a.where}:${a.pattern}`;
  const map = { "old:whole": "n", "old:veins": "mg", "old:edge": "k", "new:whole": "s", "new:veins": "fe", "all:whole": "n" };
  return { nutrient: map[key] || null, see: null };
}
