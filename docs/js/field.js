// What is happening inside one field, cell by cell.
// Sentinel-2 sees the ground in 10 m x 10 m cells. For the newest clear pass and an earlier clear pass this module
// reads the greenness (NDVI) of every cell inside the field boundary, grades each cell, and compares the two dates
// to find parts that were cut (harvested), parts that lost greenness and parts that grew.
import * as src from "./sources.js?v=20261120231002";

const M = 111320;

// Picture frame around the field: padded, 4:3, with a grid of about 10 m cells
export function fieldBox(feature) {
  const ring = feature.geometry.coordinates[0], xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  let w = Math.min(...xs), e = Math.max(...xs), s = Math.min(...ys), n = Math.max(...ys);
  const lat = (s + n) / 2, kx = M * Math.cos((lat * Math.PI) / 180);
  let wm = (e - w) * kx, hm = (n - s) * M;
  const pad = Math.max(30, 0.4 * Math.max(wm, hm));
  wm += 2 * pad; hm += 2 * pad;
  if (wm / hm < 4 / 3) wm = (hm * 4) / 3; else hm = (wm * 3) / 4;
  const cx = (w + e) / 2, cy = lat;
  w = cx - wm / 2 / kx; e = cx + wm / 2 / kx; s = cy - hm / 2 / M; n = cy + hm / 2 / M;
  const cell = Math.max(10, Math.max(wm, hm) / 160);
  return { bbox: [w, s, e, n], W: Math.max(8, Math.round(wm / cell)), H: Math.max(6, Math.round(hm / cell)), cell, widthM: wm, heightM: hm };
}

function insideMask(feature, box) {
  const ring = feature.geometry.coordinates[0], [w, s, e, n] = box.bbox, { W, H } = box, mask = new Uint8Array(W * H);
  const pip = (x, y) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  let count = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    if (pip(w + ((i + 0.5) * (e - w)) / W, n - ((j + 0.5) * (n - s)) / H)) { mask[j * W + i] = 1; count++; }
  }
  return { mask, count };
}

// 0 bare, 1 weak, 2 fair, 3 strong
export const healthClass = (v) => (v < 0.2 ? 0 : v < 0.4 ? 1 : v < 0.6 ? 2 : 3);
// change between two dates: "cut" (was green, now bare), "down" (clearly less green), "up" (clearly greener), "same"
export function changeClass(before, now) {
  const d = now - before;
  if (before >= 0.35 && d <= -0.15 && now < 0.3) return "cut";
  // bare soil also changes a little from pass to pass (ploughing, wet soil): only count change where there is a crop
  if (before >= 0.3 && d <= -0.1) return "down";
  if (now >= 0.3 && d >= 0.1) return "up";
  return "same";
}

// Which side of the field a group of cells lies on: "n", "s", "e", "w", "ne" ... or "" when spread all over
function side(cells, all, W) {
  if (!cells.length || !all.length) return "";
  const c = (list) => { let x = 0, y = 0; list.forEach((k) => { x += k % W; y += Math.floor(k / W); }); return [x / list.length, y / list.length]; };
  const [ax, ay] = c(all), [zx, zy] = c(cells);
  const xs = all.map((k) => k % W), ys = all.map((k) => Math.floor(k / W));
  const hx = (Math.max(...xs) - Math.min(...xs) + 1) / 2, hy = (Math.max(...ys) - Math.min(...ys) + 1) / 2;
  const dx = (zx - ax) / hx, dy = (zy - ay) / hy;
  return (dy < -0.18 ? "n" : dy > 0.18 ? "s" : "") + (dx > 0.18 ? "e" : dx < -0.18 ? "w" : "");
}

const clearS2 = (r) => r && r.sensor !== "landsat" && r.cloud <= 0.05 && r.ndvi != null;

export const clearPasses = (rows) => rows.filter(clearS2);
// rows: the field's time series (oldest first). Returns null when there is no clear Sentinel-2 pass to read.
// pick: optional { now: "YYYY-MM-DD", ref: "YYYY-MM-DD" } when the farmer chooses the two dates to compare.
export async function analyse(feature, rows, pick = null) {
  const good = rows.filter(clearS2);
  const now = (pick && good.find((r) => r.date === pick.now)) || good[good.length - 1];
  if (!now) return null;
  const tNow = Date.parse(now.date);
  // compare with a clear pass at least 5 days older (so a real change has time to show), else the previous clear pass
  const ref = (pick && good.find((r) => r.date === pick.ref && r.date < now.date)) || [...good].reverse().find((r) => tNow - Date.parse(r.date) >= 5 * 864e5 && tNow - Date.parse(r.date) <= 30 * 864e5) || [...good].reverse().find((r) => r.date < now.date) || null;
  const box = fieldBox(feature), { mask, count } = insideMask(feature, box);
  if (count < 2) return null;
  const [gNow, gRef] = await Promise.all([src.ndviGrid(now.item, box.bbox, box.W, box.H), ref ? src.ndviGrid(ref.item, box.bbox, box.W, box.H).catch(() => null) : null]);
  const all = [], byHealth = [[], [], [], []], byChange = { cut: [], down: [], up: [], same: [] };
  let sum = 0;
  for (let k = 0; k < mask.length; k++) {
    if (!mask[k] || Number.isNaN(gNow[k])) continue;
    all.push(k); sum += gNow[k];
    byHealth[healthClass(gNow[k])].push(k);
    if (gRef && !Number.isNaN(gRef[k])) byChange[changeClass(gRef[k], gNow[k])].push(k);
  }
  if (!all.length) return null;
  // the same test on the land around the field: if nearly all crops around "vanished" on the same date, smoke or haze is a possible cause
  let aroundCrop = 0, aroundCut = 0;
  if (gRef) for (let k = 0; k < mask.length; k++) {
    if (mask[k] || Number.isNaN(gNow[k]) || Number.isNaN(gRef[k]) || gRef[k] < 0.35) continue;
    aroundCrop++; if (changeClass(gRef[k], gNow[k]) === "cut") aroundCut++;
  }
  const N = all.length, compared = byChange.cut.length + byChange.down.length + byChange.up.length + byChange.same.length;
  const frac = (l) => (compared ? l.length / compared : 0);
  const weak = [...byHealth[0], ...byHealth[1]], fine = [...byHealth[2], ...byHealth[3]];
  return {
    box, mask, cells: N, mean: sum / N,
    now: { date: now.date, item: now.item, grid: gNow },
    ref: gRef ? { date: ref.date, item: ref.item, grid: gRef } : null,
    health: byHealth.map((l) => l.length / N),
    // a field is "patchy" when a real part of it is weak while another real part is growing well
    weakShare: weak.length / N, weakSide: weak.length / N >= 0.15 && fine.length / N >= 0.25 ? side(weak, all, box.W) : "", patchy: weak.length / N >= 0.15 && fine.length / N >= 0.25,
    picked: !!pick, aroundCut: aroundCrop >= 20 ? aroundCut / aroundCrop : null,
    change: gRef ? { cut: frac(byChange.cut), down: frac(byChange.down), up: frac(byChange.up), same: frac(byChange.same), cutSide: side(byChange.cut, all, box.W), downSide: side(byChange.down, all, box.W), days: Math.round((tNow - Date.parse(ref.date)) / 864e5) } : null,
  };
}

export const HEALTH_COLOURS = ["#b0793a", "#f0c020", "#8ccf5a", "#16873a"];
export const CHANGE_COLOURS = { cut: "#e4502a", down: "#f0c020", up: "#16873a", same: "rgba(255,255,255,0.10)" };

// Paint the cells of the field on a canvas that sits exactly over the photo of the same frame
export function draw(canvas, A, mode) {
  const { W, H } = A.box, k = Math.max(2, Math.floor(900 / W));
  canvas.width = W * k; canvas.height = H * k;
  const cx = canvas.getContext("2d");
  cx.clearRect(0, 0, canvas.width, canvas.height);
  if (mode !== "health" && mode !== "change") return;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const q = j * W + i, v = A.now.grid[q];
    if (!A.mask[q] || Number.isNaN(v)) continue;
    if (mode === "health") { cx.globalAlpha = 0.62; cx.fillStyle = HEALTH_COLOURS[healthClass(v)]; }
    else {
      const b = A.ref ? A.ref.grid[q] : NaN;
      if (Number.isNaN(b)) continue;
      const c = changeClass(b, v);
      cx.globalAlpha = c === "same" ? 1 : 0.78; cx.fillStyle = CHANGE_COLOURS[c];
    }
    cx.fillRect(i * k, j * k, k, k);
  }
  cx.globalAlpha = 1;
}

// The sharp photo of the frame, stitched from the map's own (licensed, cached) tiles instead of a separate export service.
// Resolves to a data URL, or null if the tiles cannot be read.
export async function photoFrame(box, tileUrl, maxZoom = 18) {
  const [w, s, e, n] = box.bbox;
  const X = (lon, z) => ((lon + 180) / 360) * 2 ** z, Y = (lat, z) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z;
  let z = maxZoom;
  while (z > 10 && X(e, z) - X(w, z) > 4.2) z--;
  const x0 = X(w, z), x1 = X(e, z), y0 = Y(n, z), y1 = Y(s, z);
  const tx0 = Math.floor(x0), tx1 = Math.floor(x1), ty0 = Math.floor(y0), ty1 = Math.floor(y1);
  const cv = document.createElement("canvas");
  cv.width = Math.round((x1 - x0) * 256); cv.height = Math.round((y1 - y0) * 256);
  const cx = cv.getContext("2d");
  const jobs = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    jobs.push(new Promise((res) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => { cx.drawImage(im, Math.round((tx - x0) * 256), Math.round((ty - y0) * 256), 256, 256); res(true); };
      im.onerror = () => res(false);
      im.src = tileUrl.replace("{z}", z).replace("{x}", tx).replace("{y}", ty);
    }));
  }
  const ok = await Promise.all(jobs);
  if (!ok.some(Boolean)) return null;
  try { return cv.toDataURL("image/jpeg", 0.88); } catch { return null; }
}
