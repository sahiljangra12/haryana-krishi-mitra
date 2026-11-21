# Test report: Krishi Mitra Haryana

Run: 21 November 2026 (IST), on the live site, commit `09fb783`.
Environment: Chromium browser pane, 375 x 812 and 1024 x 768, US network. It cannot play audio to the tester, cannot grant microphone or GPS, and is outside India.

There are no automated tests, lint rules or type checks in the repository. `node --check` (syntax only) passes for all 14 JavaScript files.

## Results

| # | Test | Result | Detail |
|---|---|---|---|
| 1 | PIN search `132117` | Pass | 10 villages listed; map at zoom 14 |
| 2 | Choose village Bairsal | Pass | Map at zoom 16, guide moves to step 2, photo date shown (Jan 2025) |
| 3 | Tap field, pick 2 acres, "See result" | Pass | First result in about 6 s |
| 4 | Draw 4-corner boundary | Pass | 2.39 acres against 2.379 calculated independently |
| 5 | Clear field | Pass | Guide returns to step 1 |
| 6 | Saved field re-checked on opening | Pass | Result appeared without pressing anything |
| 7 | Zoom to 21 on the sharp photo | Pass | No blank tiles |
| 8 | Sharp photo dates, 20 districts | Pass | All returned a date and resolution (see audit) |
| 9 | Sentinel-2 indices for a field | Pass | NDVI, NDMI, NDRE, BSI returned for 4 newest passes, then 13-month history |
| 10 | Cell picture, 5-acre field | Pass | 196 cells, aligned with the boundary |
| 11 | Change detection, 80 acres near Jind | Pass (not ground-checked) | About a quarter "cut", 4 to 11 Nov, consistent with the 3-pass trend |
| 12 | Change detection on bare fields | Pass | "No big change" after the crop-only rule |
| 13 | Landsat reading (direct call) | Pass | 8 Nov, NDVI 0.41, 16 cells, cloud 0 |
| 14 | Sentinel-1 statistics (direct call) | Pass | VV and VH returned for the 16 Nov pass |
| 15 | Copernicus DEM (direct call) | Pass | 255.8 m |
| 16 | SoilGrids | Pass, flaky | One timeout, success on re-run |
| 17 | NASA POWER wetness | Pass | 35% root zone, dated 17 Nov |
| 18 | ISRO land-use point query and layer | Pass | "Agriculture / Crop land" at Karnal test field |
| 19 | Forecast page | Pass | 10 day cards |
| 20 | Advice page | Pass | 6 crops ranked, scenario profits shown |
| 21 | Soil card sample | Pass | 12 values parsed; clear works |
| 22 | Techniques page | Pass | 17 cards, 17 video links (links not opened) |
| 23 | **Mandi live prices** | **Fail** | data.gov.in request timed out; `data/prices.json` is 404; only MSP shown |
| 24 | Read-aloud, every page | Pass (state only) | Browser reported speaking; audio not heard by the tester |
| 25 | Read-aloud fallback | Pass | Silent device simulated; text shown after 4.5 s |
| 26 | Microphone | Not testable | Blocked by the test browser; the "blocked" message appeared |
| 27 | Back arrow on each page | Pass | 6 pages |
| 28 | Browser back button | Pass | Returns to previous page; closes layer panel |
| 29 | English; night theme | Pass | English checked in this run. Night theme checked earlier the same day, before the latest changes. |
| 30 | Sideways scroll at 375 px | Pass | None on any page |
| 31 | Service worker and caches | Pass | Shell cache and 70 tiles in tile cache |
| 32 | Console errors during the run | Pass | None from the app; two 503 answers from an outside service |

## Not tested, and what is needed

| Item | Needed |
|---|---|
| Audio actually heard; Hindi voice present | A real Android phone and a real iPhone |
| Speech input | A browser where the microphone can be allowed |
| GPS | A device that grants location |
| Mandi prices inside India | A phone on an Indian network |
| Print / PDF output | A normal browser print dialog |
| Real Soil Health Card photo | A photo of a real card |
| Harvest detection accuracy | Fields with known harvest dates |
| Automatic update when a new pass arrives | Waiting for the next pass with the app open |
| Each YouTube link | Opening the 17 links |

## Phase 1 acceptance: run 21 November 2026 (IST), commit `6e76ad0`, live site

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | Radar reading shown with its date | Pass | "Radar (sees through cloud), 16 Nov 2026: no big change", from passes of 4 and 16 Nov (same flight direction). A field under optical cloud was not available to test on; the radar line itself does not depend on cloud. |
| 2 | Every picture shows satellite, resolution, date, cloud share, quality | Pass | "Sentinel-2B (10 m) · 14 Nov 2026 (7 days ago) · cloud over field 0% · clear image". Sharp photo: "Vantor LG02, 0.34 m, Jan 2025". Quality has two grades (clear, partly cloudy); haze is not graded. |
| 3 | Several fields saved, renamed, reopened, deleted | Pass | Two fields saved; one renamed; one reopened from the list and analysed; delete asks for a second tap. Stored in the browser. Survives reload. |
| 4 | Area in acres, hectares, kanal | Pass | 2.00 acres (killa) · 0.81 hectare · 16.0 kanal. Drawn-boundary area was within 0.5% of an independent calculation in the audit. |
| 5 | Compare two chosen dates | Pass | Picked 5 Oct against 11 Nov near Jind: 61% of the block "possibly cut". |
| 6 | Change shown as possible until confirmed | Pass | "Possible harvest ... This is not confirmed", Yes/No buttons, answer saved with the field and shown afterwards. Caution appears when most land around shows the same on that date (75% in the Jind test). |
| 7 | Licensed sharp photo through the ArcGIS key | Pass | Map tiles load from `ibasemaps-api.arcgis.com` with the key; place search through `geocode-api.arcgis.com`. From another website the key is refused. |
| 8 | No regression | Pass with limits | Search, tap, size, result, voice state, navigation re-checked. Items in "Not tested" below are unchanged. |

## Phase 2 to 4 (first part): run the same day

| Check | Result | Detail |
|---|---|---|
| Land cover from the year | Pass (unvalidated) | "Farm land" for crop fields; built-up, bare, water and all-year-green are separate outcomes (unit tests). |
| Likely crop | Pass (unvalidated) | Karnal test field: "Probably wheat, Rabi 2025-26, confidence low". The curve is a textbook wheat curve, but no one has confirmed the crop. |
| Season hidden by cloud is not guessed | Pass | The same field had a 58-day gap in the 2026 monsoon; the app says so and does not name a kharif crop. Before this rule it wrongly said "cotton". |
| Farmer correction | Pass | Chose wheat for Rabi 2026-27; card shows "Wheat (you told us)"; saved with the field. |
| Soil labelled as estimate | Pass | "Loam (map estimate)" in the short row; a note in the details says which numbers are map, regional or laboratory. |
| Elevation | Pass | 256 m at the test field. |
| Standing-water check | Written, not observed | No waterlogged field was found to test on. |

## Phase 5 and Phase 10: run 21 November 2026 (IST), live site

| Check | Result | Detail |
|---|---|---|
| Reasons on each crop card | Pass | Four plain lines for or against (water, soil, area, MSP), plus a sowing line when late. |
| Sowing calendar | Pass | On 21 November mustard, gram and potato are marked "sowing time ended N days ago" and ranked below wheat and barley. Before this, mustard was the top advice five weeks after its window. |
| Costly crop without MSP | Pass | Onion (about ₹62,500 an acre, bad-year loss shown) no longer tops the list at medium risk; wheat does. At high risk the penalty is not applied. |
| Last crop and irrigation method | Pass | Choosing moong as the last crop adds the "after a pulse" reason and 3 points to non-pulse crops (unit test and live). |
| Facts per crop | Pass | Sowing window, duration, water need, usual yield, general N-P-K dose per acre, varieties. Seed rate is not shown: no verified figure yet. Sowing window text is in English only. |
| Assumptions and no-guarantee note | Pass | Shown above the list. |
| Label check before spraying | Pass | Shown under every precautions list. |
| Field diary | Pass | Added and removed an entry; it survives a reload; a confirmed harvest is written to the diary. |
| Backup file | Written, download not observed | The button creates a JSON file in the browser. The test browser cannot show the download. Loading a backup adds only fields that are not already on the phone. |

## Automated tests
`npm test` runs 23 unit tests (change classes, picture frame, radar comparison, spoken PIN codes, speech chunking, season logic, crop reading on real and synthetic curves, crop ranking, rotation, sowing calendar). `npm run check` runs a syntax check and blocks the regex feature that broke older iPhones. Both run on every push in GitHub Actions and passed on commit `6e76ad0`.

