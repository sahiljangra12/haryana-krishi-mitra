// Understanding a farmer's question: which of the eight supported questions a sentence is asking, and which crop it names.
// Pure text rules, so they can be tested without a browser.
export const CROP_WORDS = { wheat: ["wheat", "गेहूं", "गेहूँ", "कनक"], mustard: ["mustard", "सरसों"], paddy: ["paddy", "rice", "धान", "जीरी"], basmati: ["basmati", "बासमती"], cotton: ["cotton", "कपास", "नरमा"], bajra: ["bajra", "बाजरा", "बाजरे"], gram: ["gram", "chana", "चना", "चने"], barley: ["barley", "जौ"], potato: ["potato", "आलू"], onion_rabi: ["onion", "प्याज"], maize: ["maize", "मक्का"], moong: ["moong", "मूंग"], guar: ["guar", "ग्वार"], sugarcane: ["sugarcane", "गन्ना", "गन्ने"] };
export const cropInText = (s) => Object.keys(CROP_WORDS).find((id) => CROP_WORDS[id].some((w) => s.includes(w))) || null;
// which of the eight questions a sentence is asking, or null
export function askIntent(text) {
  const s = String(text || "").toLowerCase();
  if (!/[?？]|क्या|कब|कौन|क्यों|किस|कैसे|which|when|why|what|is |should|how/.test(s)) return null;
  if (/(मंडी|भाव|price|rate)/.test(s)) return "mandi";
  if (/(बारिश|बरसात|rain)/.test(s)) return "rain";
  if (/(सिंचाई|पानी कब|पानी दूं|पानी देना|पानी लगा|irrigat)/.test(s)) return "water";
  if (/(खाद|यूरिया|डीएपी|fertili|urea|dap)/.test(s)) return "fert";
  if (/(कटाई|काटूं|काटना|harvest)/.test(s)) return "harvest";
  if (cropInText(s) && /(ठीक|सही|suitable|right for|good for|हो जाएगी|लगा सकता|उगा सकता|बो सकता)/.test(s)) return "suit";
  if (/(क्यों|why).*(कमज़ोर|कमजोर|घट|पीली|सूख|weak|declin|yellow|dry)|(कमज़ोर|कमजोर|घट|पीली|weak|declin|yellow).*(क्यों|why)/.test(s)) return "why";
  if (/(कौन सी फसल|कौन-सी फसल|क्या बो|क्या उगा|which crop|what.*grow|what.*sow)/.test(s)) return "grow";
  return null;
}
