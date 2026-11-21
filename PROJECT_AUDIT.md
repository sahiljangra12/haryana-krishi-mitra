# Project audit: Krishi Mitra Haryana

Audit date: 21 November 2026 (IST). Code audited: commit `09fb783` on `main`. Live site tested: https://sahiljangra12.github.io/haryana-krishi-mitra/

No application code was changed for this audit. Work done after it is listed in `DEVELOPMENT_ROADMAP.md` (status table) and `TEST_REPORT.md`; the findings below describe the app as it was at the audit.

Status words used below:
- **Working**: tested in this audit and behaved correctly.
- **Partially working**: works with a stated gap.
- **Not working**: tested and failed.
- **Missing**: not built.
- **Needs verification**: exists, but could not be tested from here (needs a real phone, a location in India, a credential, or ground truth).

Test environment: the desktop browser pane of the Claude app (Chromium), at 375 x 812 (phone) and 1024 x 768, from a US network. It cannot hear audio, cannot grant microphone or GPS permission, and is outside India. Every limit that follows from this is marked.

---

## 1. What the application is today

| Item | Finding |
|---|---|
| Type | Static website. Files in `docs/` are served by GitHub Pages. No build step. |
| Backend | **None.** No server, no database, no login. |
| Where analysis runs | In the visitor's browser, which calls public data services directly. The heavy satellite maths runs on Microsoft Planetary Computer's servers. |
| Storage | The last field, language, theme, voice setting and Soil Health Card values, in the browser's `localStorage`. Map tiles in a service-worker cache. |
| Automation | One GitHub Action (`update-prices.yml`) for mandi prices. It is switched off unless a repository variable is set. |
| Size | 13 JavaScript modules, about 4,300 lines. `app.js` alone is 1,470 lines. One HTML file (486 lines), one CSS file (618 lines). |
| Libraries (from CDN) | Leaflet 1.9.4, Chart.js 4.4.1, Tesseract.js 5.1.1, pdf.js 4.4.168, vector-tile and pbf decoders. |
| Tests, lint, type checks | **None exist.** The only check available is `node --check` (syntax), which passes for every file. |

### File inventory
| File | Lines | Role |
|---|---|---|
| `docs/index.html` | 486 | Single page, icon sprite, all tabs |
| `docs/css/style.css` | 618 | All styles, light and night themes |
| `docs/js/app.js` | 1,470 | UI for every tab, map, guide, result, voice wiring, navigation |
| `docs/js/sources.js` | 634 | Every external data call, geocoding, soil, weather, prices |
| `docs/js/rs.js` | 141 | Map layers: Sentinel-2 tiles and mosaics, NASA GIBS |
| `docs/js/field.js` | 123 | Cell-by-cell field health and change detection |
| `docs/js/voice.js` | 162 | Read-aloud and speech input |
| `docs/js/advisor.js` | 187 | Crop scoring, weather alerts, series interpretation |
| `docs/js/risk.js` | 127 | Bad/normal/good year scenarios, incentives |
| `docs/js/crops.js` | 361 | Crop table: costs, yields, MSP, calendars, precautions |
| `docs/js/soilcard.js` | 252 | Soil Health Card OCR, parsing, fertiliser plan |
| `docs/js/techniques.js` | 175 | 17 farming techniques with video links |
| `docs/js/districts.js` | 42 | 22 districts with coordinates and flags |
| `docs/js/i18n.js`, `images.js` | 253, 194 | Hindi/English strings; photo credits |
| `docs/sw.js`, `manifest.webmanifest` | 35, 17 | Offline shell, tile cache, install |
| `scripts/fetch_prices.py`, `.github/workflows/update-prices.yml` | 151, 45 | Mandi price fetch (inactive) |

---

## 2. Findings by area

### 2.1 Search, GPS, field boundary

| Feature | Status | Evidence / gap |
|---|---|---|
| PIN code search | Working | `132117` returned 10 villages from India Post; choosing Bairsal opened the map at zoom 16. |
| Village name search | Working | The village pick above goes through the same geocoder (Esri + OpenStreetMap + Photon). |
| GPS "My location" | Needs verification | Code path exists. The test browser cannot grant location. |
| Tap-and-size field | Working | Tap at zoom 17, choose 1/2/3/5/10 acres. |
| Draw boundary | Working | Four corners drawn; finish and cancel both work. |
| Area in acres | Working | Drawn rectangle: app 2.39 acres, independent calculation 2.379 acres (0.5% apart). |
| Area in hectares, killa/kanal | Missing | Only acres are shown. |
| Several saved fields | Missing | Only the last field is remembered. |

### 2.2 Satellite imagery and map

| Feature | Status | Evidence / gap |
|---|---|---|
| Sharp base photo, no blank tiles | Working | Esri World Imagery; enlarged beyond zoom 18, checked to zoom 21. |
| Capture date of the sharp photo | Working | Read from Esri's metadata per place and shown on the map. |
| Source and resolution shown to the farmer | Partially working | Date is shown. Sensor and resolution are read but not displayed. |
| Latest Sentinel-2 image with exact date | Working | Chip and badge show the date of the pass on screen. |
| Cloud cover and image quality | Partially working | Cloud share over the field is computed and shown in the details panel. There is no simple "good / hazy / partly cloudy" grade, and haze or smoke is not detected. |
| Automatic check for a newer pass | Partially working | Re-analysis when the app opens: observed. The 15-minute check while open: written, not yet observed with a real new pass. |
| Historical comparison | Partially working | A two-date "what changed" picture and a 13-month greenness chart. The farmer cannot pick two dates to compare. |
| Sentinel-1 radar for cloudy weeks | Missing | Verified available and free: Planetary Computer returned VV/VH statistics for a field (passes on 4, 12 and 16 November). Not used in the app. |
| Landsat 8/9 as a second source | Partially working | The function returned a valid reading (8 November, NDVI 0.41). It has not yet appeared in a real result because Sentinel-2 was newer everywhere tested. |
| ISRO Bhuvan land-use layer | Working | Tiles and point query load. The survey is from 2015-16. |
| NASA daily layers (fires, heat, rain, soil moisture) | Working | Tested earlier in this work session; not re-run in this audit. |
| Tile caching | Working | 70 tiles found in the `km-tiles-1` cache after use. |

**Age of the sharp photo across Haryana** (read from Esri in this audit, one rural point per district):

| Year of photo | Districts sampled |
|---|---|
| 2026 | Hisar (May), Ambala (Apr), Yamunanagar (Mar), Panchkula (Mar), Sirsa (Feb) |
| 2025 | Karnal, Kurukshetra, Bhiwani, Rohtak, Sonipat, Mahendragarh, Nuh, Palwal, Jhajjar |
| 2024 | Jind (Dec) |
| 2023 | Kaithal (Nov), Panipat (Oct), Fatehabad (May) |
| 2022 | Charkhi Dadri (Oct) |
| 2019 | Rewari (Oct) |

Resolution 0.31 to 0.5 m everywhere sampled. So the sharp photo is cloud-free and detailed, but its age ranges from 6 months to 7 years depending on the place. This is why the app must keep it separate from the dated satellite passes.

### 2.3 Vegetation indices, health, change

| Feature | Status | Evidence / gap |
|---|---|---|
| NDVI, NDMI, NDRE, BSI for the field | Working | Values returned per pass; the Sentinel-2 processing-baseline offset is handled. |
| EVI | Missing | |
| Cloud masking | Working | Uses the scene classification layer; passes with more than 30% bad cells over the field are dropped. |
| Cell-by-cell health picture | Working | 196 cells for a 5-acre field; colours drawn over the photo and aligned with the boundary. |
| Change detection (cut / less green / greener) | Partially working | Runs and produces plausible output (about a quarter "cut" near Jind between 4 and 11 November, matching a fall in greenness over three passes). **Not validated against ground truth.** One-date smoke or haze could cause a false signal. |
| Comparison with neighbouring fields | Working | 1 km neighbourhood average. |
| Land-cover class of the field (crop, bare, water, built-up, fallow) | Missing | Only the 2015-16 ISRO class at the centre point. |
| Crop identification, confidence, growth stage | Missing | |
| Waterlogging detection | Missing | |
| Simple field timeline (before, after, difference, likely reason, action) | Partially working | The change card gives before/after/difference. Reason and action are thin; the chart is in a details panel. |

### 2.4 Soil, water, weather

| Feature | Status | Evidence / gap |
|---|---|---|
| SoilGrids texture, pH, organic carbon, nitrogen | Partially working | Returned values in most runs; failed once today with a timeout (the service is often busy). |
| Honest labelling of soil source | Partially working | SoilGrids is a 250 m model. The details panel says so, but the one-line soil row on the result shows the texture without saying it is an estimate. |
| Soil Health Card scanner | Partially working | The built-in sample card parsed to 12 correct values and cleared correctly. Reading a real photographed card: needs verification. |
| N, P, K | Partially working | Only from a scanned card. No field-level source otherwise. |
| Soil wetness (NASA POWER) | Working | Root-zone 35%, dated 17 November. Grid is about 50 km, so it is regional. |
| Elevation and slope | Missing | Verified available: Copernicus 30 m DEM returned 255.8 m for a test field. |
| Groundwater | Partially working | One flag per district (moderate / stressed / saline) in `districts.js`, attributed to CGWB assessments with no year. Block-level data is not used. |
| 10-day forecast and farm alerts | Working | Ten day cards and alerts rendered (Open-Meteo). |
| 5-year climate history | Working | NASA POWER monthly data loaded. |
| IMD data | Missing | No IMD service usable from a browser was found; needs verification. |

### 2.5 Crop recommendation

| Feature | Status | Evidence / gap |
|---|---|---|
| Ranked crops with score | Working | Six crops ranked for Rabi; mustard first with 88. |
| Bad / normal / good-year profit, cost, price basis, break-even | Working | Shown per crop. |
| Climate and market risk per crop | Working | Frost, heat, drought, waterlogging, hail scores shown. |
| Haryana incentives (diversification, DSR, straw) | Working | Amounts need a yearly check against the official scheme notices. |
| Seed quantity, fertiliser need, duration, sowing window in each card | Partially working | A calendar and a card-based fertiliser plan exist; they are not in each crop card. |
| Previous crop and rotation, irrigation method | Missing | Only "sure / limited / rain-fed water" and one paddy checkbox. |
| Stated assumptions and uncertainty | Partially working | A disclaimer exists; the yield and cost assumptions behind each number are not shown. |
| Cost and yield tables | Needs verification | Static per-acre ranges in `crops.js`, described there as indicative figures compiled from CCS HAU package-of-practices and CACP reports. No year or page reference per figure; not re-checked in this audit. |
| MSP values | Needs verification | Displayed (for example wheat ₹2,610, mustard ₹6,613). The code records the source as CCEA decisions of 30 Sep 2026 (rabi) and 13 May 2026 (kharif). Not re-checked against the official notices in this audit. |

### 2.6 Mandi prices

| Feature | Status | Evidence / gap |
|---|---|---|
| Live prices (Agmarknet through data.gov.in) | **Not working** from the test location | The request timed out. data.gov.in answers only from India. Whether it works on a phone in India: needs verification. |
| Stored fallback prices | **Not working** | `docs/data/prices.json` does not exist (404), because the scheduled job is switched off. |
| On-screen message | Not working | The page says prices "update automatically twice a day". That is not true while the job is off. |
| MSP table | Working | Always shown. |
| Price history and trend | Missing | Depends on the stored file. |
| Nearby mandis, transport cost, net selling income | Missing | |

### 2.7 Voice and language

| Feature | Status | Evidence / gap |
|---|---|---|
| Read-aloud on desktop Chromium | Working | Speech started on every speaker button; the reading bar and stop button worked. |
| Fallback when the device is silent | Working | Simulated a silent device: after 4.5 s the bar showed the full text and the reason. |
| Read-aloud on iPhone and Android | Needs verification | A code fault that stopped the whole app loading on iPhones older than iOS 16.4 was removed on 20 November. Real devices have not been tried. |
| Speech input | Needs verification | The microphone is blocked in the test browser. The "microphone blocked" message appeared correctly. |
| Hindi and English | Working | Both render; switching re-renders every tab. |
| Haryanvi | Missing | No Haryanvi text. No browser offers a Haryanvi voice. |
| Question-and-answer assistant | Missing | The mic understands a place name and six fixed commands only. |

### 2.8 Other features

| Feature | Status | Evidence / gap |
|---|---|---|
| Techniques and videos | Partially working | 17 cards with 17 YouTube links render. The links were not opened one by one. |
| Crop disease detection from photos | Missing | |
| Farmer profile, crop history, records | Missing | |
| Government schemes, crop insurance | Partially working | Three Haryana incentives inside the advice page. No scheme or insurance page. |
| Navigation and back buttons | Working | Back arrow on six pages; phone/browser back moves between pages and closes the layer panel. |
| Phone and desktop layout | Working | No sideways scroll at 375 px or 1024 px. Real iPhone Safari: needs verification. |
| Print / PDF | Needs verification | Uses the browser's print dialog with print styles. Cannot be checked in the test browser. |
| Install as app, offline shell | Working | Service worker registered; shell and tile caches present. |
| Authentication | Missing | None. Not needed while everything stays on the phone. |

---

## 3. Security and privacy

| Finding | Severity | Detail |
|---|---|---|
| No private keys in the repository | Good | Checked every file. |
| data.gov.in key in `sources.js` | Low | It is the public sample key published by data.gov.in (10 records per request). It is not a secret, but it is rate-limited and shared with the world. |
| CDN scripts without integrity hashes; no Content-Security-Policy | Medium | A compromised CDN file would run in the app. |
| `innerHTML` used 46 times in `app.js` | Medium, needs review | Text from outside (place names, API messages) passes through an escape function in the places checked. A full pass is needed. |
| Shared origin | Low | All of the owner's GitHub Pages projects share `sahiljangra12.github.io`, so they share browser storage and can read each other's saved data, including the saved field location. A custom domain would separate them. |
| Field location sent to third parties | Inherent | Coordinates go to Microsoft, Esri, NASA, ISRIC, Open-Meteo, ISRO Bhuvan and India Post to fetch data. There is no privacy note telling the farmer this. |
| Esri imagery licence | Needs verification by the owner | Esri's terms summary says use outside Esri software needs an ArcGIS subscription. The proper route is an ArcGIS Location Platform account and API key. The app currently calls the tiles without one. |

## 4. Performance

| Measure | Result |
|---|---|
| First result after "See result" | About 6 s |
| Complete result (history, soil, climate) | About 25 s |
| Requests per analysis | More than 60 (two per satellite pass, plus grids, soil, weather, land use) |
| Slowest parts | SoilGrids (often busy), the 13-month history, the first load of the field photo |
| Weak point | Each late result redraws the whole report, so pictures reload and can flicker |

## 5. Code quality

| Finding | Detail |
|---|---|
| One very large file | `app.js` holds every tab; many lines exceed 300 characters. Hard to review and easy to break. |
| No automated checks | No tests, no lint, no browser-compatibility check. The iPhone fault above would have been caught by a lint rule. |
| Dead code | 55 of 241 text keys are never used; 27 CSS classes are never used; 4 exports in `sources.js` are unused (`fieldTimeSeries`, `ndmiExpr`, `ndviTileUrl`, `trueColorTileUrl`). |
| Duplication | Scene search and fetch helpers exist in both `rs.js` and `sources.js`. |
| Repository hygiene | `scripts/__pycache__` is committed; there is no `.gitignore`. |
| Error messages | Some failures show the raw English error text to the farmer. |
| Versioning | Cache-busting depends on running `scripts/bump_version.sh` by hand before each commit. |

---

## 6. Highest-priority issues

1. **Mandi prices do not load** outside India, are unverified inside India, have no stored fallback, and the page text says otherwise.
2. **No radar.** In the monsoon, cloud hides the field for weeks and the app has nothing to show. Sentinel-1 is free and was verified to work.
3. **Change detection is unvalidated** and can be fooled by smoke or haze on one date. It needs a confirmation step and "possible" wording until confirmed.
4. **Only one field, no history.** A farmer with several plots cannot use it properly, and nothing is remembered season to season.
5. **Coarse soil data looks like a field measurement** in the short result row.
6. **Voice is unverified on real phones**, which is where every farmer will use it.
7. **Esri licence** needs the owner to create an account and key.
8. **No tests or lint**, with one 1,470-line file. Every change risks a regression.
9. **Crop cost and yield tables** are indicative ranges without a year or reference per figure; MSP values need a re-check against the official notices.
10. **Missing altogether:** land-cover and crop identification, assistant, disease detection, farm records, schemes page.
