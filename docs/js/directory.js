// Who can help, which schemes exist, and the arithmetic for selling: the knowledge centre and the market pages.
// Every entry was read from an official or named public page on the date in CHECKED. Nothing here is live:
// offices move and schemes change, so every page shows the date and links to the official site.
// What is deliberately NOT here: phone numbers of individual staff, names of individual experts, buyers, transporters,
// cold stores and FPOs. No checked open list of those was found, and none is invented.

export const CHECKED = "2026-11-27";
export const KCC = { number: "1800-180-1551", hours: { en: "free call, 6 am to 10 pm, every day", hi: "मुफ़्त फोन, सुबह 6 से रात 10 बजे, हर दिन" }, url: "https://mkisan.gov.in/Home/AboutKCC" };

// Krishi Vigyan Kendras in Haryana as listed by ICAR (icar.org.in/en/node/15019): 18 centres. district = our district name.
export const KVK_SOURCE = { en: "Indian Council of Agricultural Research: list of KVKs in Haryana", url: "https://icar.org.in/en/node/15019" };
export const KVKS = [
  { district: "Ambala", addr: "Village Tepla, PO Saha, Ambala 133104", host: "Society for Creation of Heaven on Earth" },
  { district: "Bhiwani", addr: "Govt. Seed Farm, Kohlawas, Bhiwani 125021", host: "CCS HAU, Hisar" },
  { district: "Faridabad", addr: "Village Bhopani, PO Bhaskola, Jasana Road, Faridabad 121002", host: "CCS HAU, Hisar" },
  { district: "Fatehabad", addr: "Govt. Seed Farm, Fatehabad 125050", host: "CCS HAU, Hisar" },
  { district: "Gurugram", addr: "IARI, Shikohpur, Gurugram 122001", host: "IARI, New Delhi" },
  { district: "Hisar", addr: "Mandi Adampur, Village Sadalpur, Hisar 125052", host: "CCS HAU, Hisar" },
  { district: "Jhajjar", addr: "Govt. Agricultural Farm, Bir Sunarwala, Jhajjar 124103", host: "CCS HAU, Hisar" },
  { district: "Jind", addr: "Village Pandu Pindara, Jind 126102", host: "CCS HAU, Hisar" },
  { district: "Kaithal", addr: "New Peoda, P. Box 40, Kaithal 136027", host: "CCS HAU, Hisar" },
  { district: "Karnal", addr: "NDRI, Karnal 132001", host: "ICAR-NDRI, Karnal" },
  { district: "Kurukshetra", addr: "430/13, Urban Estate, near Railway Station, Kurukshetra 136118", host: "CCS HAU, Hisar" },
  { district: "Mahendragarh", addr: "Krishi Vigyan Kendra, Mahendragarh 123029", host: "CCS HAU, Hisar" },
  { district: "Panipat", addr: "Village Ujha, PO Risalu, Panipat 132104", host: "CCS HAU, Hisar" },
  { district: "Rewari", addr: "Shri B.B. Ashram, Rampura, Rewari 123401", host: "Bhagwat Bhakti Ashram, Rampura" },
  { district: "Rohtak", addr: "Near Jat College, Rohtak 124001", host: "CCS HAU, Hisar" },
  { district: "Sirsa", addr: "Tehsil Road, Sirsa 125055", host: "CCS HAU, Hisar" },
  { district: "Sonipat", addr: "Jagdishpur, Rathdhana, Narela Road, P. Box 28, Sonipat 131001", host: "CCS HAU, Hisar" },
  { district: "Yamunanagar", addr: "Damla, Yamunanagar 135001", host: "CCS HAU, Hisar" },
];
const km = (a, b) => { const r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r; return Math.round(Math.sqrt(x * x + y * y) * 6371); };
// The KVK for a district. Four districts have no centre in ICAR's list: for them the nearest listed centre is given, and that is said.
export function kvkFor(name, districts) {
  const own = KVKS.find((k) => k.district === name);
  if (own) return { kvk: own, own: true, km: 0 };
  const me = districts.find((d) => d.name === name); if (!me) return null;
  const near = KVKS.map((k) => ({ k, d: districts.find((x) => x.name === k.district) })).filter((x) => x.d).map((x) => ({ kvk: x.k, km: km(me, x.d) })).sort((a, b) => a.km - b.km)[0];
  return near ? { ...near, own: false } : null;
}
export const mapSearch = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const INSTITUTES = [
  { id: "hau", en: "CCS Haryana Agricultural University", hi: "चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय", place: { en: "Hisar", hi: "हिसार" }, url: "https://hau.ac.in", does: { en: "Field crops, soils, plant protection, farm machinery and extension. It runs most of the state's KVKs.", hi: "खेत की फसलें, मिट्टी, पौध संरक्षण, कृषि मशीनरी और प्रसार। राज्य के ज़्यादातर KVK यही चलाता है।" } },
  { id: "mhu", en: "Maharana Pratap Horticultural University", hi: "महाराणा प्रताप बागवानी विश्वविद्यालय", place: { en: "Anjanthali, Karnal", hi: "अंजनथली, करनाल" }, url: "https://mhu.ac.in", does: { en: "Fruit, vegetables, flowers and spices. Regional research stations at Ambala, Jind and Jhajjar.", hi: "फल, सब्ज़ी, फूल और मसाले। अंबाला, जींद और झज्जर में क्षेत्रीय अनुसंधान केंद्र।" } },
  { id: "iiwbr", en: "ICAR-Indian Institute of Wheat and Barley Research", hi: "ICAR-भारतीय गेहूं एवं जौ अनुसंधान संस्थान", place: { en: "Karnal", hi: "करनाल" }, url: "https://iiwbr.icar.gov.in", does: { en: "Wheat and barley varieties and their cultivation.", hi: "गेहूं और जौ की किस्में और उनकी खेती।" } },
  { id: "cssri", en: "ICAR-Central Soil Salinity Research Institute", hi: "ICAR-केंद्रीय मृदा लवणता अनुसंधान संस्थान", place: { en: "Karnal", hi: "करनाल" }, url: "https://cssri.res.in", does: { en: "Salty and alkaline (usar) soils and poor-quality irrigation water.", hi: "खारी और ऊसर ज़मीन, और खराब पानी से सिंचाई।" } },
  { id: "ndri", en: "ICAR-National Dairy Research Institute", hi: "ICAR-राष्ट्रीय डेरी अनुसंधान संस्थान", place: { en: "Karnal", hi: "करनाल" }, url: "https://ndri.res.in", does: { en: "Dairy animals and milk. It hosts the Karnal KVK.", hi: "दुधारू पशु और दूध। करनाल का KVK यहीं है।" } },
  { id: "bawal", en: "CCS HAU Regional Research Station, Bawal", hi: "CCS HAU क्षेत्रीय अनुसंधान केंद्र, बावल", place: { en: "Bawal, Rewari", hi: "बावल, रेवाड़ी" }, url: "https://hau.ac.in", does: { en: "Dry-area farming and arid fruits (ber, aonla): a centre of ICAR's arid-zone fruit project.", hi: "सूखे इलाके की खेती और वहाँ के फल (बेर, आंवला): ICAR की शुष्क क्षेत्र फल परियोजना का केंद्र।" } },
];

// status: "active" = the official page or a government statement in 2025-26 shows it running. src = where the figure was read.
export const SCHEMES = [
  { id: "pmkisan", level: "centre", en: "PM-KISAN", hi: "पीएम-किसान",
    gives: { en: "₹6,000 a year to an eligible land-holding farmer family, in three instalments of ₹2,000, paid into the bank account.", hi: "पात्र ज़मीन वाले किसान परिवार को साल में ₹6,000, ₹2,000 की तीन किस्तों में, सीधे बैंक खाते में।" },
    who: { en: "Farmer families that own cultivable land as per land records. Exclusions apply: see the official site.", hi: "वे किसान परिवार जिनके नाम ज़मीन के रिकॉर्ड में खेती की ज़मीन है। कुछ लोग बाहर रखे गए हैं: आधिकारिक साइट देखें।" },
    how: { en: "Register on the PM-KISAN portal or at a Common Service Centre. Aadhaar, bank account and land record are needed; e-KYC must be complete.", hi: "पीएम-किसान पोर्टल पर या कॉमन सर्विस सेंटर में पंजीकरण। आधार, बैंक खाता और ज़मीन का रिकॉर्ड चाहिए; e-KYC पूरा होना ज़रूरी।" },
    url: "https://pmkisan.gov.in", src: "PIB factsheet, Nov 2025" },
  { id: "pmfby", level: "centre", en: "PM Fasal Bima Yojana (crop insurance)", hi: "पीएम फसल बीमा योजना",
    gives: { en: "Insurance against crop loss from natural calamities. The farmer pays at most 2% of the sum insured for kharif crops, 1.5% for rabi and 5% for commercial and horticultural crops.", hi: "प्राकृतिक आपदा से फसल के नुकसान का बीमा। किसान बीमित राशि का ज़्यादा से ज़्यादा खरीफ में 2%, रबी में 1.5% और व्यावसायिक व बागवानी फसलों में 5% देता है।" },
    who: { en: "Farmers growing the notified crops in notified areas.", hi: "अधिसूचित इलाके में अधिसूचित फसल उगाने वाले किसान।" },
    how: { en: "Enrol before the season's last date through your bank, a Common Service Centre or the portal. Report local damage quickly: the usual limit is 72 hours.", hi: "मौसम की आख़िरी तारीख से पहले बैंक, कॉमन सर्विस सेंटर या पोर्टल से नाम लिखवाएं। नुकसान की सूचना जल्दी दें: आम तौर पर 72 घंटे के अंदर।" },
    url: "https://pmfby.gov.in", src: "Government of India scheme summaries, 2026" },
  { id: "shc", level: "centre", en: "Soil Health Card", hi: "मृदा स्वास्थ्य कार्ड",
    gives: { en: "A laboratory test of your soil with fertiliser advice for your crops.", hi: "आपकी मिट्टी की लैब जांच और आपकी फसलों के लिए खाद की सलाह।" },
    who: { en: "Every farmer.", hi: "हर किसान।" }, how: { en: "Ask your district agriculture office or KVK how to give a sample.", hi: "नमूना कैसे देना है, यह अपने जिला कृषि कार्यालय या KVK से पूछें।" },
    url: "https://soilhealth.dac.gov.in", src: "Soil Health Card portal" },
  { id: "mfmb", level: "haryana", en: "Meri Fasal Mera Byora (crop registration)", hi: "मेरी फसल मेरा ब्योरा",
    gives: { en: "Haryana's crop registration portal. Registration is required for most state benefits, including Mera Pani Meri Virasat.", hi: "हरियाणा का फसल पंजीकरण पोर्टल। राज्य के ज़्यादातर लाभों के लिए, 'मेरा पानी मेरी विरासत' सहित, इस पर पंजीकरण ज़रूरी है।" },
    who: { en: "Farmers of Haryana.", hi: "हरियाणा के किसान।" }, how: { en: "Register your crop every season on the portal.", hi: "हर मौसम में अपनी फसल पोर्टल पर दर्ज करें।" },
    url: "https://fasal.haryana.gov.in", src: "Haryana Agriculture Department; news reports, May 2026" },
  { id: "mpmv", level: "haryana", en: "Mera Pani Meri Virasat (shift from paddy)", hi: "मेरा पानी मेरी विरासत",
    gives: { en: "₹8,000 an acre for growing another crop in place of paddy.", hi: "धान की जगह दूसरी फसल उगाने पर ₹8,000 प्रति एकड़।" },
    who: { en: "Farmers who grew paddy in earlier years and shift to another crop.", hi: "वे किसान जो पहले के सालों में धान उगाते थे और अब दूसरी फसल लेते हैं।" },
    how: { en: "Register on Meri Fasal Mera Byora; the field is verified.", hi: "'मेरी फसल मेरा ब्योरा' पर पंजीकरण; खेत की जांच होती है।" },
    url: "https://agriharyana.gov.in", src: "Haryana Budget 2025-26; state statements, 2026" },
  { id: "micro", level: "haryana", en: "Drip and sprinkler (micro-irrigation) subsidy", hi: "टपक और फव्वारा सिंचाई पर अनुदान",
    gives: { en: "The state has said it gives up to 85% subsidy on micro-irrigation systems.", hi: "राज्य सरकार के अनुसार टपक और फव्वारा सिंचाई पर 85% तक अनुदान।" },
    who: { en: "Farmers of Haryana; rules differ by scheme.", hi: "हरियाणा के किसान; नियम योजना के हिसाब से अलग हैं।" }, how: { en: "Ask your district agriculture or horticulture office for the current scheme and form.", hi: "चालू योजना और फ़ॉर्म के लिए अपने जिला कृषि या बागवानी कार्यालय से पूछें।" },
    url: "https://agriharyana.gov.in", src: "Chief Minister's statements, March and May 2026" },
  { id: "orchard", level: "haryana", en: "New orchard grant (horticulture)", hi: "नया बाग लगाने पर अनुदान",
    gives: { en: "₹24,500 to ₹1,40,000 an acre for a new fruit orchard, for up to 5 acres; the rate differs by fruit.", hi: "नया फलों का बाग लगाने पर ₹24,500 से ₹1,40,000 प्रति एकड़, 5 एकड़ तक; दर हर फल की अलग।" },
    who: { en: "Farmers of Haryana.", hi: "हरियाणा के किसान।" }, how: { en: "Apply on Meri Fasal Mera Byora or the Hortnet portal.", hi: "'मेरी फसल मेरा ब्योरा' या Hortnet पोर्टल पर आवेदन।" },
    url: "https://hortharyana.gov.in", src: "Haryana Horticulture Department, Nov 2025" },
  { id: "bhavantar", level: "haryana", en: "Bhavantar Bharpai Yojana (horticulture prices)", hi: "भावांतर भरपाई योजना",
    gives: { en: "Haryana's price-support scheme for horticulture crops. The crops covered and the rules are on the official site.", hi: "बागवानी फसलों के भाव के लिए हरियाणा की योजना। कौन सी फसलें और क्या नियम, यह आधिकारिक साइट पर है।" },
    who: { en: "Farmers growing the listed horticulture crops.", hi: "सूची की बागवानी फसलें उगाने वाले किसान।" }, how: { en: "See the Haryana State Agricultural Marketing Board site.", hi: "हरियाणा राज्य कृषि विपणन बोर्ड की साइट देखें।" },
    url: "https://www.hsamb.org.in", src: "State statement, March 2026; HSAMB site" },
];

// Problem -> where to go. Each step is either a page of this app or a body that helps. Institutes by id, schemes by id.
export const PROBLEMS = [
  { id: "soil", icon: "flask-conical", en: "My soil is weak / which fertiliser", hi: "मिट्टी कमज़ोर है / कौन सी खाद", why: { en: "Fertiliser can only be matched to your soil from a laboratory test. A satellite cannot measure soil nutrients.", hi: "खाद आपकी मिट्टी से तभी मिलाई जा सकती है जब लैब में जांच हो। सैटेलाइट मिट्टी के पोषक तत्व नहीं नाप सकता।" }, go: [["soilcard", { en: "Add or read my soil report", hi: "मेरी मिट्टी की रिपोर्ट जोड़ें या पढ़ें" }]], inst: ["hau"], schemes: ["shc"] },
  { id: "disease", icon: "bug", en: "My crop is sick / pests", hi: "फसल में बीमारी या कीड़े", why: { en: "A disease has to be seen. Start with the questions here, then show the plant or photos to the KVK before using any spray.", hi: "बीमारी देखकर ही पहचानी जाती है। पहले यहाँ के सवालों से शुरू करें, फिर कोई दवा डालने से पहले पौधा या फोटो KVK को दिखाएं।" }, go: [["ask", { en: "Tell us the problem", hi: "समस्या बताएं" }]], inst: ["hau"], schemes: [] },
  { id: "water", icon: "droplets", en: "Water is short", hi: "पानी कम है", why: { en: "Less water-hungry crops and drip or sprinkler irrigation are the two real answers; both have state support.", hi: "कम पानी वाली फसलें और टपक या फव्वारा सिंचाई, यही दो असली रास्ते हैं; दोनों पर राज्य की मदद है।" }, go: [["tech:water", { en: "Ways to save water", hi: "पानी बचाने के तरीके" }], ["advice", { en: "Crops for my water", hi: "मेरे पानी के हिसाब से फसल" }]], inst: ["bawal"], schemes: ["micro", "mpmv"] },
  { id: "salt", icon: "waves", en: "Salty water or usar land", hi: "खारा पानी या ऊसर ज़मीन", why: { en: "Salty and alkaline soils need their own treatment and crop choice. There is a national institute for exactly this in Karnal.", hi: "खारी और ऊसर ज़मीन का अपना इलाज और अपनी फसलें होती हैं। ठीक इसी काम का राष्ट्रीय संस्थान करनाल में है।" }, go: [["soilcard", { en: "Check pH and EC in my soil report", hi: "मिट्टी की रिपोर्ट में pH और EC देखें" }]], inst: ["cssri"], schemes: ["shc"] },
  { id: "grow", icon: "sprout", en: "What should I grow", hi: "क्या बोऊं", why: { en: "It depends on your soil, water, district and the price. The app ranks the season's crops and shows the money for each.", hi: "यह आपकी मिट्टी, पानी, जिले और भाव पर टिका है। ऐप मौसम की फसलों को क्रम से दिखाता है और हर एक का हिसाब देता है।" }, go: [["advice", { en: "Crops for my land", hi: "मेरी ज़मीन के लिए फसल" }], ["year", { en: "Plan the year and the money", hi: "साल की योजना और हिसाब" }]], inst: ["hau", "iiwbr"], schemes: ["mpmv"] },
  { id: "orchard", icon: "apple", en: "I want to plant an orchard or trees", hi: "बाग या पेड़ लगाने हैं", why: { en: "An orchard is a decision for many years: match the fruit to your water first.", hi: "बाग कई साल का फ़ैसला है: पहले फल को अपने पानी से मिलाएं।" }, go: [["plan", { en: "Orchard and tree planning", hi: "बाग और पेड़ की योजना" }]], inst: ["mhu", "bawal"], schemes: ["orchard"] },
  { id: "sell", icon: "store", en: "I am not getting a fair price", hi: "फसल का सही भाव नहीं मिल रहा", why: { en: "Know the mandi price before you talk to a buyer, and look at more than one way to sell.", hi: "खरीदार से बात करने से पहले मंडी का भाव जान लें, और बेचने के एक से ज़्यादा रास्ते देखें।" }, go: [["prices", { en: "Today's mandi prices", hi: "आज के मंडी भाव" }], ["sell", { en: "Sell my crop", hi: "फसल बेचें" }], ["fpo", { en: "Farmer producer organisations", hi: "किसान उत्पादक संगठन (FPO)" }]], inst: [], schemes: ["bhavantar", "mfmb"] },
  { id: "money", icon: "landmark", en: "Government help and subsidy", hi: "सरकारी मदद और अनुदान", why: { en: "Most state benefits start with registration on Meri Fasal Mera Byora.", hi: "राज्य के ज़्यादातर लाभ 'मेरी फसल मेरा ब्योरा' पर पंजीकरण से शुरू होते हैं।" }, go: [["schemes", { en: "All schemes", hi: "सभी योजनाएं" }]], inst: [], schemes: ["mfmb", "pmkisan", "pmfby"] },
];

/* ---------------- selling: the farmer's own record of sales and payments ---------------- */
const DAY = 864e5, day = (s) => Math.round(Date.parse(s + "T00:00:00Z") / DAY);
// sale: { amount, saleDate, dueDate, paidDate }. today: "YYYY-MM-DD".
export function payStatus(sale, today) {
  if (sale.paidDate) { if (!sale.dueDate) return { state: "paid", days: 0 }; const late = day(sale.paidDate) - day(sale.dueDate); return late > 0 ? { state: "paid_late", days: late } : { state: "paid_on_time", days: 0 }; }
  if (!sale.dueDate) return { state: "no_date", days: 0 };
  const left = day(sale.dueDate) - day(today);
  return left < 0 ? { state: "overdue", days: -left } : { state: "due", days: left };
}
export function ledgerTotals(sales, today) {
  const out = { received: 0, pending: 0, overdue: 0, overdueCount: 0 };
  for (const s of sales) { const a = +s.amount || 0, st = payStatus(s, today).state; if (s.paidDate) out.received += a; else { out.pending += a; if (st === "overdue") { out.overdue += a; out.overdueCount++; } } }
  return out;
}
// One buyer across the farmer's own sales: how often the money came late. Only the farmer's own records, never a public rating.
export function buyerRecord(sales, buyer, today) {
  const mine = sales.filter((s) => (s.buyer || "").trim().toLowerCase() === String(buyer || "").trim().toLowerCase() && s.buyer);
  const st = mine.map((s) => payStatus(s, today).state);
  return { sales: mine.length, late: st.filter((x) => x === "paid_late" || x === "overdue").length, onTime: st.filter((x) => x === "paid_on_time").length };
}
export function cleanSales(raw) {
  return (Array.isArray(raw) ? raw : []).filter((s) => s && typeof s === "object" && +s.amount > 0).slice(0, 300).map((s) => ({ id: String(s.id || Math.random().toString(36).slice(2)), buyer: String(s.buyer || "").slice(0, 60), crop: String(s.crop || "").slice(0, 40), qty: +s.qty > 0 ? +s.qty : null, amount: +s.amount, saleDate: /^\d{4}-\d\d-\d\d$/.test(s.saleDate) ? s.saleDate : "", dueDate: /^\d{4}-\d\d-\d\d$/.test(s.dueDate) ? s.dueDate : "", paidDate: /^\d{4}-\d\d-\d\d$/.test(s.paidDate) ? s.paidDate : "" }));
}
// What kind of storage a kind of produce needs
export const STORE_KINDS = {
  grain: { en: "Grain, oilseeds, pulses", hi: "अनाज, तिलहन, दालें", need: { en: "A dry, clean warehouse (godown). Cold is not needed.", hi: "सूखा, साफ़ गोदाम। ठंडक की ज़रूरत नहीं।" }, q: "warehouse godown" },
  potato: { en: "Potato, onion", hi: "आलू, प्याज", need: { en: "Cold storage for potato; onion needs airy, dry storage.", hi: "आलू के लिए कोल्ड स्टोरेज; प्याज के लिए हवादार, सूखा भंडार।" }, q: "cold storage" },
  fresh: { en: "Fruit and vegetables", hi: "फल और सब्ज़ी", need: { en: "A cold chain: pre-cooling, cold storage and, for long distance, refrigerated transport.", hi: "ठंडी कड़ी: पहले ठंडा करना, कोल्ड स्टोरेज, और दूर भेजना हो तो ठंडी गाड़ी।" }, q: "cold storage pack house" },
  flower: { en: "Flowers", hi: "फूल", need: { en: "Special handling and cool storage; ask the horticulture office before you plant for sale.", hi: "ख़ास संभाल और ठंडा भंडार; बेचने के लिए लगाने से पहले बागवानी कार्यालय से पूछें।" }, q: "flower cold storage" },
};
