// Voice guide: reads short, everyday-language text aloud (Hindi or Indian English) with the device's own speech engine,
// and takes spoken input for the search box. Nothing is recorded or uploaded by this app.
//
// Written to survive the real differences between browsers:
// - no regex lookbehind anywhere (it stops the whole app from loading on iPhones older than iOS 16.4)
// - sentences are spoken one after another, each started from the end of the one before (queues get dropped on iOS)
// - every utterance is kept in a list until it ends (Chrome forgets them otherwise and never reports the end)
// - a watchdog notices when the phone stays silent and hands the text back so it can be shown on screen instead
// - speech is "unlocked" on the first touch, because iPhones refuse speech that does not start from a touch
const synth = typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function" ? window.speechSynthesis : null;
let voices = [];
function load() { try { if (synth) voices = synth.getVoices() || []; } catch { voices = []; } }
load();
try { if (synth) { if (synth.addEventListener) synth.addEventListener("voiceschanged", load); else synth.onvoiceschanged = load; } } catch {}

export const canSpeak = !!synth;
const norm = (l) => String(l || "").replace("_", "-").toLowerCase();
function pick(lang) {
  if (!voices.length) load();
  const want = lang === "hi" ? ["hi-in", "hi"] : ["en-in", "en-gb", "en-us", "en"];
  for (const w of want) {
    const list = voices.filter((x) => norm(x.lang).startsWith(w));
    if (list.length) return list.find((x) => /google|lekha|rishi|veena|natural|enhanced|premium/i.test(x.name)) || list[0];
  }
  return null;
}
export const hasVoiceFor = (lang) => { const v = pick(lang); return !!v && norm(v.lang).startsWith(lang === "hi" ? "hi" : "en"); };
export const hasHindiVoice = () => hasVoiceFor("hi");

let token = 0, activeBtn = null, live = [], watchdog = null, listeners = [];
// app.js subscribes to draw the "now reading" bar: {state: "start"|"sentence"|"end"|"fail", text, reason}
export function onSpeech(fn) { listeners.push(fn); }
const emit = (e) => listeners.forEach((fn) => { try { fn(e); } catch {} });

function clearBtn() { if (activeBtn) { activeBtn.classList.remove("playing"); activeBtn = null; } }
export function stop() {
  token++;
  clearTimeout(watchdog);
  live = [];
  try { if (synth && (synth.speaking || synth.pending)) synth.cancel(); } catch {}
  clearBtn();
  emit({ state: "end" });
}
export const isPlaying = (btn) => !!activeBtn && activeBtn === btn;

// Cut text into short pieces at sentence ends (and at commas when a sentence is long):
// some browsers go silent after about 15 seconds of a single utterance.
export function sentences(text) {
  const out = [];
  String(text).replace(/\s+/g, " ").replace(/([।.!?])\s+/g, "$1\n").split("\n").forEach((s) => {
    s = s.trim();
    if (!s) return;
    if (s.length <= 180) { out.push(s); return; }
    let cur = "";
    s.split(/,\s*/).forEach((part) => {
      if (cur && (cur + ", " + part).length > 180) { out.push(cur); cur = part; } else cur = cur ? cur + ", " + part : part;
    });
    if (cur) out.push(cur);
  });
  return out;
}

// Call once from the first touch or click: lets later speech start without a new touch (needed on iPhone and iPad).
let primed = false;
export function prime() {
  if (!synth || primed) return;
  primed = true;
  try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); } catch {}
}

// Returns true when speech was handed to the device. If the device then stays silent, a "fail" event follows.
export function speak(text, lang, btn) {
  const full = String(text || "").trim();
  if (!full) return false;
  if (!synth) { emit({ state: "fail", text: full, reason: "unsupported" }); return false; }
  stop();
  primed = true;
  const my = ++token, parts = sentences(full), v = pick(lang);
  activeBtn = btn || null;
  if (btn) btn.classList.add("playing");
  let started = false;
  const fail = (reason) => { if (my !== token) return; stop(); emit({ state: "fail", text: full, reason }); };
  const finish = () => { if (my !== token) return; clearTimeout(watchdog); live = []; clearBtn(); emit({ state: "end" }); };
  const next = (i) => {
    if (my !== token) return;
    if (i >= parts.length) return finish();
    const u = new SpeechSynthesisUtterance(parts[i]);
    u.lang = v ? v.lang.replace("_", "-") : lang === "hi" ? "hi-IN" : "en-IN";
    if (v) u.voice = v;
    u.rate = lang === "hi" ? 0.92 : 0.96;
    u.onstart = () => { if (my !== token) return; started = true; clearTimeout(watchdog); emit({ state: "sentence", text: parts[i], full }); };
    u.onend = () => { live = live.filter((x) => x !== u); next(i + 1); };
    u.onerror = (e) => {
      live = live.filter((x) => x !== u);
      if (my !== token) return;
      const err = (e && e.error) || "";
      if (err === "interrupted" || err === "canceled") return; // our own stop()
      if (!started) return fail(err === "not-allowed" ? "blocked" : hasVoiceFor(lang) ? "error" : "novoice");
      next(i + 1);
    };
    live.push(u);
    try { synth.resume(); synth.speak(u); } catch { return fail("error"); }
  };
  emit({ state: "start", text: full });
  next(0);
  // Nothing started after a few seconds: the phone has no voice for this language, or speech is blocked.
  watchdog = setTimeout(() => { if (my === token && !started) fail(hasVoiceFor(lang) ? "silent" : "novoice"); }, 4500);
  return true;
}

/* ---------------- speech to text ---------------- */
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
export const canListen = !!SR;
let rec = null;
export function stopListening() { try { rec && rec.abort(); } catch {} rec = null; }

// handlers: onText(final text), onPartial(text so far), onState(true|false), onError(code)
// codes: unsupported, denied (microphone blocked), service (the phone's speech service is off or missing),
//        nospeech (nothing heard), network, error
export function listen(lang, h = {}) {
  if (!SR) { h.onError && h.onError("unsupported"); return null; }
  stop(); stopListening();
  let got = false, failed = false, r;
  try { r = new SR(); } catch { h.onError && h.onError("unsupported"); return null; }
  rec = r;
  r.lang = lang === "hi" ? "hi-IN" : "en-IN";
  r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
  r.onstart = () => h.onState && h.onState(true);
  r.onresult = (e) => {
    let finalText = "", partial = "";
    for (let i = 0; i < e.results.length; i++) { const tx = e.results[i][0].transcript; if (e.results[i].isFinal) finalText += tx; else partial += tx; }
    if (finalText) { got = true; h.onText && h.onText(finalText.trim()); } else if (partial && h.onPartial) h.onPartial(partial.trim());
  };
  r.onerror = (e) => {
    failed = true;
    const c = e && e.error;
    h.onError && h.onError(c === "not-allowed" ? "denied" : c === "service-not-allowed" || c === "language-not-supported" ? "service" : c === "no-speech" ? "nospeech" : c === "network" ? "network" : c === "aborted" ? "aborted" : c === "audio-capture" ? "denied" : "error");
  };
  r.onend = () => { if (rec === r) rec = null; h.onState && h.onState(false); if (!got && !failed) h.onError && h.onError("nospeech"); };
  try { r.start(); } catch { h.onState && h.onState(false); h.onError && h.onError("error"); return null; }
  return r;
}

// Spoken numbers arrive as words or spaced digits: "एक तीन दो शून्य शून्य एक", "1 3 2 0 0 1", "१३२००१"
const WORD_DIGIT = { "शून्य": 0, "जीरो": 0, "ज़ीरो": 0, zero: 0, oh: 0, "एक": 1, one: 1, "दो": 2, two: 2, "तीन": 3, three: 3, "चार": 4, four: 4, "पांच": 5, "पाँच": 5, five: 5, "छह": 6, "छः": 6, "छे": 6, six: 6, "सात": 7, seven: 7, "आठ": 8, eight: 8, "नौ": 9, nine: 9 };
export function tidyHeard(text) {
  let s = String(text || "").replace(/[०-९]/g, (d) => "०१२३४५६७८९".indexOf(d)).replace(/[।.?!]+$/g, "").trim();
  const words = s.split(/\s+/);
  if (words.length >= 4 && words.every((w) => w.toLowerCase() in WORD_DIGIT || /^\d+$/.test(w))) s = words.map((w) => (w.toLowerCase() in WORD_DIGIT ? WORD_DIGIT[w.toLowerCase()] : w)).join("");
  if (/^[\d\s-]+$/.test(s)) s = s.replace(/[\s-]/g, "");
  return s;
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
