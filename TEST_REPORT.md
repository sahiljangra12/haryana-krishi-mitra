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

## Phase 1 acceptance (to be run after Phase 1 is built)
1. A field under cloud on its newest optical pass still shows a dated radar reading.
2. Every picture shows satellite, resolution, date, cloud share and a quality grade.
3. Three fields can be saved, renamed, reopened and deleted; they survive closing the browser.
4. Area appears in acres, hectares and killa/kanal and matches an independent calculation within 1%.
5. Two chosen dates can be compared for a field.
6. A change is shown as "possible" until confirmed by a later pass, radar or the farmer.
7. No regression in tests 1 to 32.
