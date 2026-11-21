// Voice guide: reads short, everyday-language text aloud (Hindi or Indian English) with the phone's own speech engine,
// and takes spoken input for the search box. Nothing is recorded or uploaded by this app.
const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
let voices = [];
function load() { if (synth) voices = synth.getVoices(); }
load();
if (synth) synth.addEventListener?.("voiceschanged", load);

export const canSpeak = !!synth;
function pick(lang) {
  const want = lang === "hi" ? ["hi-in", "hi"] : ["en-in", "en-gb", "en"];
  for (const w of want) { const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase().startsWith(w)); if (v) return v; }
  return null;
}
export const hasHindiVoice = () => !!pick("hi") && pick("hi").lang.toLowerCase().startsWith("hi");

let token = 0, activeBtn = null;
export function stop() {
  token++;
  if (synth) synth.cancel();
  if (activeBtn) { activeBtn.classList.remove("playing"); activeBtn = null; }
}
export const isPlaying = (btn) => activeBtn && activeBtn === btn;

// Long text is cut into sentences: some phones stop reading after about 15 seconds of one utterance.
export function speak(text, lang, btn) {
  if (!synth || !text) return false;
  stop();
  const my = ++token;
  const parts = String(text).replace(/\s+/g, " ").split(/(?<=[।.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const v = pick(lang);
  activeBtn = btn || null;
  if (btn) btn.classList.add("playing");
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    if (v) u.voice = v;
    u.rate = lang === "hi" ? 0.92 : 0.96;
    if (i === parts.length - 1) u.onend = u.onerror = () => { if (my === token && activeBtn) { activeBtn.classList.remove("playing"); activeBtn = null; } };
    synth.speak(u);
  });
  return true;
}

// Speech to text for the search box
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!SR;
export function listen(lang, onText, onState) {
  if (!SR) return null;
  stop();
  const r = new SR();
  r.lang = lang === "hi" ? "hi-IN" : "en-IN";
  r.interimResults = false; r.maxAlternatives = 1;
  r.onstart = () => onState?.(true);
  r.onend = () => onState?.(false);
  r.onerror = () => onState?.(false);
  r.onresult = (e) => onText(e.results[0][0].transcript);
  try { r.start(); } catch { onState?.(false); }
  return r;
}

// Numbers the way people say them
export function sayMoney(n, lang) {
  const neg = n < 0; n = Math.abs(Math.round(n));
  const lakh = Math.floor(n / 100000), th = Math.round((n % 100000) / 1000);
  let s;
  if (lang === "hi") s = (lakh ? `${lakh} लाख ` : "") + (th ? `${th} हज़ार ` : lakh ? "" : `${n} `) + "रुपये";
  else s = (lakh ? `${lakh} lakh ` : "") + (th ? `${th} thousand ` : lakh ? "" : `${n} `) + "rupees";
  return (neg ? (lang === "hi" ? "घाटा " : "a loss of ") : "") + s;
}
