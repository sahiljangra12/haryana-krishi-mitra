// Farming techniques library. Subsidy amounts are only stated where verified from
// Haryana government announcements (Kharif 2026); otherwise the farmer is pointed to the portal.
// Video links are YouTube searches in Hindi — they always work and show the latest videos
// from CCS HAU, KVKs, ICAR, DD Kisan and farmer channels.

const yt = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export const CATEGORIES = {
  water: { en: "Save water", hi: "पानी बचाएं", icon: "droplets" },
  soil: { en: "Soil health", hi: "मिट्टी की सेहत", icon: "sprout" },
  residue: { en: "No stubble burning", hi: "पराली प्रबंधन", icon: "flame" },
  pest: { en: "Pest & disease", hi: "कीट व रोग", icon: "bug" },
  income: { en: "More income", hi: "ज़्यादा आमदनी", icon: "coins" },
};

export const TECHNIQUES = [
  {
    id: "dsr", cat: "water", crops: ["paddy", "basmati"],
    en: "Direct Seeded Rice (DSR)", hi: "धान की सीधी बिजाई (DSR)",
    what: { en: "Sow paddy seed directly with a DSR drill instead of raising a nursery and puddled transplanting.", hi: "नर्सरी और कद्दू कर रोपाई की जगह DSR ड्रिल से धान का बीज सीधे खेत में बोएं।" },
    benefits: { en: ["Uses noticeably less irrigation water and no puddling", "Saves transplanting labour and diesel", "Crop matures earlier — more time to manage straw before wheat"], hi: ["काफ़ी कम सिंचाई पानी, कद्दू नहीं", "रोपाई की मज़दूरी और डीज़ल की बचत", "फसल जल्दी पकती है — गेहूं से पहले पराली प्रबंधन का समय"] },
    steps: { en: ["Laser-level the field first (critical for DSR)", "Sow 1–25 June in moist soil (tar-wattar) or dry-sow then irrigate", "Seed 8–10 kg/acre, treated; drill depth 2–3 cm", "Spray pendimethalin pre-emergence within 2 days, then a post-emergence weedicide at 20–25 days", "Watch for iron deficiency (yellow new leaves) — 0.5% ferrous sulphate spray"], hi: ["पहले लेज़र लेवलिंग करें (DSR के लिए ज़रूरी)", "1–25 जून के बीच तर-वत्तर में बोएं या सूखी बिजाई कर पानी दें", "8–10 कि.ग्रा./एकड़ उपचारित बीज; 2–3 से.मी. गहराई", "2 दिन के अंदर पेंडिमेथालिन छिड़कें, फिर 20–25 दिन पर खरपतवारनाशी", "लोहे की कमी (नई पत्तियां पीली) पर 0.5% फेरस सल्फेट छिड़कें"] },
    subsidy: { en: "Haryana: ₹4,500 per acre for DSR (Kharif 2026), no acreage cap; DSR machine subsidy available. Register on agriharyana.gov.in before the deadline.", hi: "हरियाणा: DSR पर ₹4,500 प्रति एकड़ (खरीफ 2026), रकबे की कोई सीमा नहीं; DSR मशीन पर सब्सिडी। समय-सीमा से पहले agriharyana.gov.in पर पंजीकरण करें।" },
    video: yt("धान की सीधी बिजाई DSR हरियाणा HAU"), link: "https://agriharyana.gov.in",
  },
  {
    id: "mpmv", cat: "water", crops: ["maize", "cotton", "bajra", "moong", "guar"],
    en: "Crop diversification (Mera Pani Meri Virasat)", hi: "फसल विविधीकरण (मेरा पानी मेरी विरासत)",
    what: { en: "Replace paddy with maize, cotton, bajra, pulses, oilseeds or vegetables in Kharif.", hi: "खरीफ में धान की जगह मक्का, कपास, बाजरा, दालें, तिलहन या सब्ज़ियां लगाएं।" },
    benefits: { en: ["Much less groundwater use", "Breaks the paddy–wheat pest and disease cycle", "Government incentive per acre on top of crop income"], hi: ["भूजल की बहुत कम खपत", "धान–गेहूं के कीट-रोग चक्र को तोड़ता है", "फसल आय के ऊपर सरकारी प्रोत्साहन"] },
    steps: { en: ["Check eligibility (paddy grown in the previous years on that land)", "Register the alternate crop on Meri Fasal Mera Byora", "Pick a crop with an assured buyer or MSP procurement (maize, moong, cotton)", "Keep photos/geo-tagged proof for field verification"], hi: ["पात्रता जांचें (उस ज़मीन पर पिछले वर्षों में धान)", "मेरी फसल मेरा ब्योरा पर वैकल्पिक फसल दर्ज करें", "पक्के खरीदार या MSP खरीद वाली फसल चुनें (मक्का, मूंग, कपास)", "सत्यापन के लिए फोटो/जियो-टैग प्रमाण रखें"] },
    subsidy: { en: "Haryana Kharif 2026: ₹8,000 per acre for shifting away from paddy, plus a ₹2,000 per acre bonus for pulses, oilseeds and cotton.", hi: "हरियाणा खरीफ 2026: धान छोड़ने पर ₹8,000 प्रति एकड़, दालें, तिलहन और कपास पर ₹2,000 प्रति एकड़ अतिरिक्त बोनस।" },
    video: yt("मेरा पानी मेरी विरासत योजना फसल विविधीकरण"), link: "https://fasal.haryana.gov.in",
  },
  {
    id: "laser", cat: "water", crops: ["wheat", "paddy", "basmati", "mustard", "gram", "barley", "maize", "cotton"],
    en: "Laser land levelling", hi: "लेज़र लैंड लेवलिंग",
    what: { en: "A tractor-drawn laser-guided scraper makes the field perfectly flat.", hi: "ट्रैक्टर से चलने वाला लेज़र-निर्देशित स्क्रेपर खेत को पूरी तरह समतल करता है।" },
    benefits: { en: ["Water spreads evenly — fewer, faster irrigations", "Even germination and crop stand; fewer weak patches", "Needed before DSR, zero-till and bed planting"], hi: ["पानी बराबर फैलता है — कम और जल्दी सिंचाई", "एक समान अंकुरण; कमज़ोर हिस्से कम", "DSR, ज़ीरो-टिल और बेड बुवाई से पहले ज़रूरी"] },
    steps: { en: ["Hire from a Custom Hiring Centre (CHC) — one levelling lasts 3–4 years", "Do it in dry soil after harvest (May or Oct)", "Keep 0–0.1% slope toward the water outlet"], hi: ["कस्टम हायरिंग सेंटर (CHC) से किराए पर लें — एक बार लेवलिंग 3–4 साल चलती है", "कटाई के बाद सूखी मिट्टी में करें (मई या अक्टूबर)", "पानी निकास की ओर 0–0.1% ढलान रखें"] },
    subsidy: { en: "Machinery subsidy for individuals and CHCs under state schemes — check agriharyana.gov.in.", hi: "राज्य योजनाओं में व्यक्तिगत किसान और CHC को मशीन पर सब्सिडी — agriharyana.gov.in देखें।" },
    video: yt("लेजर लैंड लेवलर खेत समतल कैसे करें"), link: "https://agriharyana.gov.in",
    trigger: "uneven",
  },
  {
    id: "happyseeder", cat: "residue", crops: ["wheat"],
    en: "Happy Seeder / Super Seeder (in-situ straw management)", hi: "हैप्पी सीडर / सुपर सीडर (खेत में पराली प्रबंधन)",
    what: { en: "Sow wheat directly into standing paddy stubble — straw stays as mulch, nothing is burnt.", hi: "धान की खड़ी पराली में सीधे गेहूं बोएं — पराली मल्च बनती है, जलानी नहीं पड़ती।" },
    benefits: { en: ["No burning fines; cleaner air for the village", "Mulch conserves moisture and suppresses weeds", "Builds organic carbon over years", "Saves 1–2 tillage passes"], hi: ["जलाने पर जुर्माना नहीं; गांव की हवा साफ़", "मल्च नमी बचाती है, खरपतवार दबाती है", "सालों में जैविक कार्बन बढ़ता है", "1–2 जुताई की बचत"] },
    steps: { en: ["Harvest paddy with a combine fitted with Super-SMS (spreads straw evenly)", "Sow wheat 25 Oct–15 Nov with Happy/Super Seeder at proper moisture", "Seed rate 45–50 kg/acre", "First irrigation a little lighter"], hi: ["सुपर-SMS लगी कंबाइन से धान काटें (पराली बराबर फैलती है)", "25 अक्टूबर–15 नवंबर, सही नमी में हैप्पी/सुपर सीडर से बोएं", "बीज दर 45–50 कि.ग्रा./एकड़", "पहली सिंचाई थोड़ी हल्की"] },
    subsidy: { en: "Haryana: ₹1,200 per acre for paddy straw management (in-situ/ex-situ); machines on subsidy via CRM scheme.", hi: "हरियाणा: पराली प्रबंधन पर ₹1,200 प्रति एकड़ (खेत में/बाहर); CRM योजना से मशीनों पर सब्सिडी।" },
    video: yt("हैप्पी सीडर सुपर सीडर गेहूं बिजाई पराली"), link: "https://agriharyana.gov.in",
  },
  {
    id: "zerotill", cat: "soil", crops: ["wheat", "mustard"],
    en: "Zero tillage wheat", hi: "ज़ीरो टिलेज गेहूं",
    what: { en: "Sow wheat with a zero-till drill without ploughing after paddy.", hi: "धान के बाद बिना जुताई के ज़ीरो-टिल ड्रिल से गेहूं बोएं।" },
    benefits: { en: ["Timely sowing — avoids late-sowing yield loss", "Saves diesel and time", "Less Phalaris minor (gulli danda) weed"], hi: ["समय पर बुवाई — पछेती बुवाई का नुकसान नहीं", "डीज़ल और समय की बचत", "गुल्ली डंडा खरपतवार कम"] },
    steps: { en: ["Remove or spread loose straw", "Sow immediately after paddy harvest at field-capacity moisture", "Use a pre-emergence herbicide if weed pressure is high"], hi: ["ढीली पराली हटाएं या फैलाएं", "धान कटाई के तुरंत बाद सही नमी में बोएं", "खरपतवार ज़्यादा हो तो अंकुरण-पूर्व खरपतवारनाशी"] },
    video: yt("जीरो टिलेज गेहूं बुवाई तकनीक"), link: "https://www.hau.ac.in",
  },
  {
    id: "drip", cat: "water", crops: ["cotton", "potato", "onion_rabi", "sugarcane", "maize"],
    en: "Drip & sprinkler (micro-irrigation)", hi: "टपक व फव्वारा सिंचाई (सूक्ष्म सिंचाई)",
    what: { en: "Deliver water (and fertilizer — fertigation) straight to the root zone through pipes and drippers or sprinklers.", hi: "पाइप और ड्रिपर/फव्वारों से पानी (और खाद — फर्टिगेशन) सीधे जड़ों तक पहुंचाएं।" },
    benefits: { en: ["Large water saving on sandy soils of south-west Haryana", "Fertigation cuts fertilizer waste", "Works with saline or scarce water better than flooding", "Higher yield and quality in vegetables, cotton, sugarcane"], hi: ["दक्षिण-पश्चिम हरियाणा की रेतीली मिट्टी में पानी की बड़ी बचत", "फर्टिगेशन से खाद की बर्बादी कम", "खारे या कम पानी में भी कारगर", "सब्ज़ियों, कपास, गन्ने में ज़्यादा उपज और गुणवत्ता"] },
    steps: { en: ["Get a water test (EC) and field design from the supplier", "Install a sand/screen filter — clogging is the main problem", "Flush laterals every 2 weeks; acid-treat if salts build up", "Schedule irrigation by ET₀ shown in the Weather tab"], hi: ["पानी की जांच (EC) और सप्लायर से खेत डिज़ाइन लें", "सैंड/स्क्रीन फ़िल्टर लगाएं — बंद होना मुख्य समस्या", "हर 2 हफ्ते लेटरल फ्लश करें", "मौसम टैब में दिए ET₀ से सिंचाई तय करें"] },
    subsidy: { en: "Large subsidy on drip/sprinkler sets with water tanks under state micro-irrigation schemes (MICADA / Horticulture dept.) — apply online.", hi: "राज्य सूक्ष्म सिंचाई योजनाओं (MICADA / बागवानी विभाग) में ड्रिप/फव्वारा व टैंक पर बड़ी सब्सिडी — ऑनलाइन आवेदन करें।" },
    video: yt("ड्रिप सिंचाई सब्सिडी हरियाणा कैसे लगाएं"), link: "https://agriharyana.gov.in",
  },
  {
    id: "awd", cat: "water", crops: ["paddy", "basmati"],
    en: "Alternate wetting & drying + tensiometer (paddy)", hi: "बारी-बारी गीला-सूखा + टेंसियोमीटर (धान)",
    what: { en: "Irrigate paddy only when standing water has gone and soil starts to dry, instead of keeping it flooded.", hi: "धान में लगातार पानी भरने की बजाय, खड़ा पानी सूखने और मिट्टी सूखने लगे तभी सिंचाई करें।" },
    benefits: { en: ["Fewer irrigations, less electricity", "Stronger roots, less lodging", "Lower methane emissions"], hi: ["कम सिंचाई, कम बिजली", "मज़बूत जड़ें, फसल कम गिरती है", "मीथेन उत्सर्जन कम"] },
    steps: { en: ["Keep flooded for 2 weeks after transplanting", "Then irrigate 2 days after water disappears (or when a tensiometer reads in the yellow zone)", "Keep water at flowering stage"], hi: ["रोपाई के बाद 2 हफ्ते पानी भरा रखें", "फिर पानी सूखने के 2 दिन बाद सिंचाई करें (या टेंसियोमीटर पीले क्षेत्र में)", "फूल आने के समय पानी रखें"] },
    video: yt("धान में टेंसियोमीटर से सिंचाई पानी बचत"), link: "https://www.hau.ac.in",
  },
  {
    id: "beds", cat: "water", crops: ["wheat", "moong_summer", "maize", "onion_rabi"],
    en: "Raised-bed / furrow planting", hi: "मेड़ / बेड पर बुवाई",
    what: { en: "Sow on raised beds with irrigation in the furrows between them.", hi: "उठी हुई मेड़ों (बेड) पर बुवाई, बीच की नालियों में सिंचाई।" },
    benefits: { en: ["Less water and seed", "Better drainage — protects crops from waterlogging after heavy rain", "Easier weeding and spraying"], hi: ["कम पानी और बीज", "अच्छी जल-निकासी — भारी बारिश के बाद जल-भराव से बचाव", "निराई और छिड़काव आसान"] },
    steps: { en: ["Use a bed planter (CHC)", "Wheat: 2–3 rows per 67 cm bed", "Reuse beds for summer moong or maize (permanent beds)"], hi: ["बेड प्लांटर का उपयोग करें (CHC)", "गेहूं: 67 से.मी. बेड पर 2–3 कतारें", "गर्मी की मूंग या मक्का के लिए वही बेड दोबारा"] },
    video: yt("बेड प्लांटर गेहूं मेड़ पर बुवाई"), link: "https://www.hau.ac.in",
  },
  {
    id: "ipm", cat: "pest", crops: ["cotton", "paddy", "basmati", "mustard", "gram", "wheat", "maize"],
    en: "Integrated Pest Management (IPM)", hi: "समेकित कीट प्रबंधन (IPM)",
    what: { en: "Watch pests with traps and spray only when they cross the economic threshold.", hi: "ट्रैप से कीटों की निगरानी करें और आर्थिक सीमा पार होने पर ही छिड़काव करें।" },
    benefits: { en: ["Fewer sprays — lower cost", "Protects friendly insects", "Lower pesticide residue (important for basmati export)"], hi: ["कम छिड़काव — कम लागत", "मित्र कीट बचते हैं", "कम कीटनाशक अवशेष (बासमती निर्यात के लिए ज़रूरी)"] },
    steps: { en: ["Pheromone traps (5/acre) for pink bollworm, pod borer, stem borer", "Yellow sticky traps for whitefly, aphids", "Release Trichogramma egg cards for borers", "Spray only above threshold; rotate chemical groups"], hi: ["गुलाबी सुंडी, फली छेदक, तना छेदक के लिए फेरोमोन ट्रैप (5/एकड़)", "सफेद मक्खी, चेपा के लिए पीले चिपचिपे ट्रैप", "छेदकों के लिए ट्राइकोग्रामा कार्ड", "सीमा से ऊपर ही छिड़काव; दवाओं का समूह बदलें"] },
    video: yt("कपास गुलाबी सुंडी फेरोमोन ट्रैप IPM"), link: "https://www.hau.ac.in",
  },
  {
    id: "seedtreat", cat: "pest", crops: ["wheat", "gram", "bajra", "basmati", "mustard", "moong", "guar"],
    en: "Seed treatment", hi: "बीज उपचार",
    what: { en: "Coat seed with fungicide/insecticide and bio-agents before sowing.", hi: "बुवाई से पहले बीज पर फफूंदनाशी/कीटनाशी और जैव-एजेंट लगाएं।" },
    benefits: { en: ["Cheapest protection — costs very little per acre", "Prevents seed-borne diseases: bakanae, smut, wilt, downy mildew", "Better germination"], hi: ["सबसे सस्ती सुरक्षा — प्रति एकड़ बहुत कम ख़र्च", "बीज-जनित रोगों से बचाव: बकाने, कंडुआ, उखेड़ा, जोगिया", "बेहतर अंकुरण"] },
    steps: { en: ["Wheat: tebuconazole or carbendazim for smut", "Gram: Trichoderma + Rhizobium", "Bajra: metalaxyl for downy mildew", "Basmati: carbendazim soak for bakanae"], hi: ["गेहूं: कंडुआ के लिए टेबुकोनाज़ोल या कार्बेन्डाजिम", "चना: ट्राइकोडर्मा + राइजोबियम", "बाजरा: जोगिया के लिए मेटालेक्सिल", "बासमती: बकाने के लिए कार्बेन्डाजिम घोल"] },
    video: yt("बीज उपचार कैसे करें गेहूं चना"), link: "https://www.hau.ac.in",
  },
  {
    id: "shc", cat: "soil", crops: ["wheat", "paddy", "mustard", "cotton", "maize", "potato"],
    en: "Soil testing & balanced fertilizer", hi: "मिट्टी जांच व संतुलित खाद",
    what: { en: "Test soil every 2–3 years and apply fertilizer as per the Soil Health Card — use the scanner in this app.", hi: "हर 2–3 साल मिट्टी जांचें और मृदा स्वास्थ्य कार्ड के अनुसार खाद डालें — इस ऐप का स्कैनर इस्तेमाल करें।" },
    benefits: { en: ["Stops over-use of urea/DAP — saves money", "Fixes hidden zinc/sulphur deficiencies", "Same or better yield with less fertilizer"], hi: ["यूरिया/DAP का ज़्यादा उपयोग रुकता है — पैसे बचते हैं", "छिपी जिंक/गंधक की कमी दूर", "कम खाद में बराबर या ज़्यादा उपज"] },
    steps: { en: ["Take samples in V-shape from 8–10 spots, 0–15 cm deep, after harvest", "Mix, keep 500 g, label with your name and khasra number", "Give to the nearest soil testing lab (free)", "Scan the card here for a fertilizer plan in bags"], hi: ["कटाई के बाद 8–10 जगह से V-आकार में 0–15 से.मी. गहरा नमूना लें", "मिलाकर 500 ग्राम रखें, नाम और खसरा नंबर लिखें", "नज़दीकी मिट्टी जांच लैब में दें (मुफ़्त)", "खाद योजना के लिए कार्ड यहां स्कैन करें"] },
    video: yt("मिट्टी का नमूना कैसे लें मृदा स्वास्थ्य कार्ड"), link: "https://soilhealth.dac.gov.in",
  },
  {
    id: "greenmanure", cat: "soil", crops: ["paddy", "basmati", "maize"],
    en: "Green manure (dhaincha) & FYM", hi: "हरी खाद (ढैंचा) व गोबर खाद",
    what: { en: "Grow dhaincha or sunhemp for 45–55 days in summer and plough it in before paddy.", hi: "गर्मी में 45–55 दिन ढैंचा या सनई उगाकर धान से पहले खेत में मिला दें।" },
    benefits: { en: ["Raises organic carbon and soil life", "Supplies nitrogen — cut urea for the next crop", "Helps reclaim alkaline (usar) soils"], hi: ["जैविक कार्बन और मिट्टी के जीव बढ़ते हैं", "नाइट्रोजन मिलती है — अगली फसल में यूरिया कम", "क्षारीय (ऊसर) मिट्टी सुधारने में मदद"] },
    steps: { en: ["Sow dhaincha 20 kg/acre after wheat harvest (April–May)", "Give 2–3 irrigations", "Bury at 45–55 days, 1 week before transplanting"], hi: ["गेहूं कटाई के बाद (अप्रैल–मई) 20 कि.ग्रा./एकड़ ढैंचा बोएं", "2–3 सिंचाई दें", "45–55 दिन पर, रोपाई से 1 हफ्ता पहले मिट्टी में दबाएं"] },
    video: yt("ढैंचा हरी खाद कैसे उगाएं धान से पहले"), link: "https://www.hau.ac.in",
    trigger: "lowOC",
  },
  {
    id: "gypsum", cat: "soil", crops: ["wheat", "paddy", "barley", "mustard"],
    en: "Gypsum for alkaline (usar) soil", hi: "क्षारीय (ऊसर) मिट्टी के लिए जिप्सम",
    what: { en: "Calcium in gypsum replaces sodium in alkaline soils so water can drain and roots can grow.", hi: "जिप्सम का कैल्शियम क्षारीय मिट्टी के सोडियम को हटाता है, जिससे पानी रिसता है और जड़ें बढ़ती हैं।" },
    benefits: { en: ["Brings back barren patches into production", "Also supplies sulphur", "Improves water infiltration"], hi: ["बंजर हिस्से फिर से उपजाऊ", "गंधक भी मिलता है", "पानी का रिसाव बेहतर"] },
    steps: { en: ["Get a gypsum-requirement (GR) test from the soil lab", "Spread 50% of GR in May–June, mix in top 10 cm", "Flood with good-quality water to leach sodium", "Start with paddy or barley; add green manure"], hi: ["मिट्टी लैब से जिप्सम-आवश्यकता (GR) जांच कराएं", "मई–जून में GR का 50% फैलाकर ऊपरी 10 से.मी. में मिलाएं", "अच्छे पानी से भराव कर सोडियम बहाएं", "धान या जौ से शुरू करें; हरी खाद डालें"] },
    video: yt("ऊसर भूमि सुधार जिप्सम कैसे डालें"), link: "https://cssri.res.in",
    trigger: "alkaline",
  },
  {
    id: "summermoong", cat: "income", crops: ["moong_summer"],
    en: "Summer moong between wheat and paddy", hi: "गेहूं और धान के बीच गर्मी की मूंग",
    what: { en: "A 60–65 day moong crop in the empty April–June window.", hi: "अप्रैल–जून की खाली अवधि में 60–65 दिन की मूंग।" },
    benefits: { en: ["Extra income from land that is otherwise empty", "Adds nitrogen — less urea for paddy", "MSP for moong"], hi: ["खाली ज़मीन से अतिरिक्त आय", "नाइट्रोजन मिलती है — धान में कम यूरिया", "मूंग पर MSP"] },
    steps: { en: ["Sow right after wheat harvest (by mid-April) with a zero-till drill", "Short-duration varieties (MH 421, MH 1142)", "Pick pods in 2 rounds; bury residue as green manure"], hi: ["गेहूं कटाई के तुरंत बाद (मध्य अप्रैल तक) ज़ीरो-टिल ड्रिल से बोएं", "कम अवधि की किस्में (MH 421, MH 1142)", "2 बार फलियां तोड़ें; अवशेष हरी खाद की तरह दबाएं"] },
    video: yt("गर्मी की मूंग गेहूं के बाद खेती"), link: "https://www.hau.ac.in",
  },
  {
    id: "lcc", cat: "soil", crops: ["paddy", "basmati", "wheat", "maize"],
    en: "Leaf colour chart (LCC) for urea", hi: "यूरिया के लिए लीफ कलर चार्ट (LCC)",
    what: { en: "Match the leaf colour to a plastic chart and apply urea only when leaves are paler than the threshold shade.", hi: "पत्ती का रंग प्लास्टिक चार्ट से मिलाएं और पत्ती तय रंग से फीकी हो तभी यूरिया दें।" },
    benefits: { en: ["Avoids excess urea (less lodging, fewer pests)", "Saves fertilizer money", "Costs very little"], hi: ["ज़्यादा यूरिया से बचाव (फसल कम गिरती है, कीट कम)", "खाद का पैसा बचता है", "बहुत सस्ता"] },
    steps: { en: ["Check 10 top fully opened leaves every 7–10 days", "Compare in your body's shade, not direct sun", "If 6+ leaves are below the critical shade, apply ~25 kg urea/acre"], hi: ["हर 7–10 दिन 10 ऊपरी खुली पत्तियां जांचें", "धूप में नहीं, अपनी छाया में मिलाएं", "6+ पत्तियां तय रंग से कम हों तो ~25 कि.ग्रा. यूरिया/एकड़ दें"] },
    video: yt("लीफ कलर चार्ट यूरिया धान"), link: "https://www.hau.ac.in",
  },
  {
    id: "fpo", cat: "income", crops: ["mustard", "gram", "moong", "basmati", "potato", "onion_rabi", "guar"],
    en: "Sell better: e-NAM, FPOs, storage", hi: "बेहतर बिक्री: e-NAM, FPO, भंडारण",
    what: { en: "Join a Farmer Producer Organisation, compare mandis on e-NAM, and store produce to avoid harvest-time price dips.", hi: "किसान उत्पादक संगठन (FPO) से जुड़ें, e-NAM पर मंडियों की तुलना करें और कटाई के समय दाम गिरने से बचने के लिए भंडारण करें।" },
    benefits: { en: ["Bulk selling and input buying at better rates", "Warehouse receipts can get you a loan without selling", "Choose the mandi with the best modal price (see Mandi tab)"], hi: ["मिलकर बेचना और सस्ते में खाद-बीज ख़रीदना", "वेयरहाउस रसीद पर बिना बेचे ऋण", "सबसे अच्छे भाव वाली मंडी चुनें (मंडी टैब देखें)"] },
    steps: { en: ["Register on e-NAM / Meri Fasal Mera Byora before harvest", "For MSP crops, book a procurement slot on time", "Store in a WDRA-registered warehouse for pledge loans"], hi: ["कटाई से पहले e-NAM / मेरी फसल मेरा ब्योरा पर पंजीकरण", "MSP फसलों के लिए समय पर खरीद स्लॉट बुक करें", "गिरवी ऋण के लिए WDRA-पंजीकृत गोदाम में रखें"] },
    video: yt("e-NAM मंडी ऑनलाइन फसल बेचें किसान"), link: "https://enam.gov.in",
  },
  {
    id: "insurance", cat: "income", crops: ["wheat", "paddy", "cotton", "bajra", "mustard", "maize", "gram", "barley", "moong"],
    en: "Crop insurance (PMFBY)", hi: "फसल बीमा (PMFBY)",
    what: { en: "Insure notified crops against drought, flood, hail, pests and unseasonal rain at a small farmer premium.", hi: "अधिसूचित फसलों का सूखा, बाढ़, ओले, कीट और बेमौसम बारिश से थोड़े प्रीमियम पर बीमा।" },
    benefits: { en: ["Protects the budget you plan in this app against a bad year", "Covers localised hail and post-harvest losses if reported in time"], hi: ["इस ऐप में बनाए बजट को ख़राब साल से बचाता है", "समय पर सूचना दें तो ओले और कटाई-बाद नुकसान भी कवर"] },
    steps: { en: ["Enrol through your bank, CSC or the PMFBY portal before the cut-off date", "Report a loss within 72 hours (helpline / app)", "Keep sowing records and photos"], hi: ["अंतिम तिथि से पहले बैंक, CSC या PMFBY पोर्टल से नामांकन", "नुकसान की सूचना 72 घंटे में दें (हेल्पलाइन / ऐप)", "बुवाई रिकॉर्ड और फोटो रखें"] },
    video: yt("प्रधानमंत्री फसल बीमा योजना क्लेम कैसे करें"), link: "https://pmfby.gov.in",
  },
];

// Which techniques matter most for this farmer, given what the app already knows
export function relevantTechniques(ctx) {
  const ids = new Set();
  if (ctx.district?.gw === "stressed") ["dsr", "mpmv", "drip", "awd", "laser"].forEach((i) => ids.add(i));
  if (ctx.district?.zone === "SW") ["drip", "seedtreat"].forEach((i) => ids.add(i));
  if (ctx.district?.zone === "NE") ["happyseeder", "zerotill", "summermoong"].forEach((i) => ids.add(i));
  if ((ctx.soil?.phh2o ?? 0) > 8.5) ids.add("gypsum");
  if (ctx.soil?.soc != null && ctx.soil.soc / 10 < 0.5) ids.add("greenmanure");
  if (ctx.uneven) ids.add("laser");
  if (!ctx.cardDone) ids.add("shc");
  (ctx.topCrops || []).forEach((c) => TECHNIQUES.filter((t) => t.crops.includes(c)).slice(0, 2).forEach((t) => ids.add(t.id)));
  return ids;
}
