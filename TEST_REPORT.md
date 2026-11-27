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

## Phase 6 (assistant): run 21 November 2026 (IST), live site

| Check | Result | Detail |
|---|---|---|
| Eight question buttons, Hindi | Pass | Each gave an answer built from the test field's data. Examples: "what to grow" named wheat, then onion, then barley, and listed mustard, gram and potato as past sowing time; "rain" read the 10-day forecast; "harvest" used the crop's duration and asked for the sowing date in the diary. |
| Typed questions, Hindi and English | Pass | "सरसों के लिए मेरा खेत सही है क्या" and "Is my field right for bajra?" picked the right crop and answered. |
| Unknown question | Pass | "ट्रैक्टर कौन सा लूं?" got "not understood yet, tap a question above". |
| Spoken answer | Pass (state only) | The browser reported speaking and the speaker button showed playing. Audio not heard by the tester. |
| Question by microphone | Not testable | Microphone is blocked in the test browser. |
| Mandi question | Pass with a known limit | Says live prices have not loaded and gives the MSP, because prices do not load outside India. |
| Place names are not taken as questions | Pass | Unit tests: "Mandi Dabwali", "बैरसाल करनाल", "132001" are not questions. |
| Young crop wording | Pass | In sowing weeks a thin green cover now reads "crop is small or just coming up", not "crop is weak". |

## Phase 11 (interface): run 27 November 2026 (IST), live site, commit `e9e65ba`

| Check | Result | Detail |
|---|---|---|
| Six sections in the bottom bar | Pass | Field, Crops, Weather, Mandi, My farm, More. No sideways scroll at 375 px. |
| More page | Pass | Soil card scanner, methods and videos, About. Opening one keeps "More" lit; its back arrow returns to More. |
| First visit | Pass | Welcome sheet with language choice and two buttons. "Explain it to me aloud" switched the voice on and speech started. Not shown again afterwards. |
| Assistant from the header | Pass | Opens as a sheet on any page; the phone's back button and the close button both close it and leave the page as it was. |
| My farm page | Pass | Field card with name, place, area in three units, last result and its date; rename, two-tap delete; diary entry added and kept; backup buttons present. |
| Diary feeds the assistant | Pass | With sowing written as 12 Nov and the crop told as wheat, "when to harvest" answered "around 6 April 2027" (12 Nov + 145 days). |
| Saved field opens at once | Pass | The last result was on screen 0.4 s after the app loaded, marked with its date, and was replaced by the fresh result. |
| No network | Pass (simulated) | With every request made to fail, the saved result stayed, with "The internet did not connect. This is the result of ...". Not tried on a real phone in a real dead zone. |
| Sowing dates in Hindi | Pass | Crop cards show the Hindi wording. |

## India and Haryana map, iOS-style interface: run 27 November 2026 (IST), live site, commit `96b6a8a`

Tested in a desktop browser at phone size (375 x 812) and at 1024 x 768. Not tested on a real iPhone or Android phone.

| Check | Result |
|---|---|
| Map opens on the whole of Haryana, clear of the search bar and buttons | Pass (phone and desktop) |
| Map cannot leave India: moved to London, the map came back inside the India box; zoom-out stops at level 5 | Pass |
| Haryana sharp, everything else blurred and dimmed; the cut-out follows pan and zoom | Pass by eye. The blur needs `backdrop-filter`; phones with 2 GB of memory or less get a plain dim veil instead (not tested on such a phone) |
| Veil removed at zoom 13 and above so border fields stay visible | Pass |
| Tap in central Delhi: message "this app works for fields in Haryana", no field made | Pass |
| Full flow in Karnal: tap, 2 acres, result in 6 s with four cards | Pass |
| All six sections open, no sideways scrolling, no console errors | Pass |
| Light and night themes | Pass by eye |
| Search or GPS outside Haryana gives the same message | Code path is the same as the tap; GPS is blocked in the test browser, so not observed |
| Border accuracy | The outline is simplified to about 1 km, so fields within 2.5 km outside it are accepted. A field in a neighbouring state within that strip is therefore also accepted |

## Land check, farmer profile, latest picture, ways back: run 27 November 2026 (IST), live site, commit `949428e` and after

Tested in a desktop browser at phone size (375 x 812). Not tested on a real phone. GPS and sound are blocked in the test browser.

| Check | Result |
|---|---|
| Karnal city centre (29.6857, 76.9905): "This is built-up land, not a field", 98% built, no crop, soil, water or best-crop card; map stays on the photo | Pass |
| Tilyar lake, Rohtak (28.8830, 76.6370): "This is water, not a field", 92% water | Pass |
| Karnal field (29.7235, 76.9512): normal four cards, land check silent | Pass |
| Place east of Karnal where the 2023 map says buildings and the 2021 map says field (29.7235, 76.9860): "two maps disagree", results still shown; the year's greenness reached 0.46, so it is not blocked | Pass |
| Crops page for the built-up place: ranking hidden, reason shown with two buttons | Pass |
| "No, this is my field": advice returns (6 crops), finding stays as a note; "Undo" blocks again | Pass |
| "Choose another place": pin removed, back at step 1 | Pass |
| A blocked place is not kept in My fields | Pass after the fix in `949428e` |
| Time to first result with the land check added | 5 to 6.5 s (was about 6 s) |
| Outline that is partly buildings ("mixed") | Unit test only; no such square was found in a short search |
| First visit: language, then district, then kind of farming; back works at each step and keeps the answer; Continue is disabled until a kind is chosen; "later" skips | Pass |
| Profile saved as `km-profile` with farmer_category, district, language | Pass |
| Seasonal, medium-term and long-term each show their own list on My farm | Pass (all three) |
| Change the kind from My farm and from More; Escape and the close button leave it unchanged | Pass |
| Orchard page: Rewari with limited water puts ber, amla, bael, lasoda, pomegranate, date palm first and marks kinnow and guava "only with assured water"; Karnal with assured water puts kinnow and guava first | Pass |
| Trees page: Rewari assured water "ask locally", limited water "not advised", Yamunanagar assured water "can suit"; young trees with tractor show all four crop groups; grown trees without tractor show only turmeric and ginger | Pass |
| Land on share: owner with 4 acres, grown trees, no tractor gets three cautions and a message; cultivator gets a different message; "Clear my answers" clears | Pass |
| Back from share to trees to My farm | Pass |
| English for all new pages | Pass |
| Map sheet: "Back: search another place", "Remove pin", "Stop" during reading, "Remove this field from my list" (two taps) | Pass (delete tested by code path, same as My farm) |
| "Latest picture" from far out: NASA picture of 26 Nov with its date; zoomed in: Sentinel-2 pass of 24 Nov; the choice is remembered | Pass. The first version used MODIS, which had a black gap over Sirsa that day; changed to VIIRS, whose four tiles had no gap |
| Language and district selection that existed before | Pass (language buttons, district lists on Crops and Weather) |
| Voice reading of the new pages; GPS button on the district step | Not tested (blocked in the test browser) |
| Facts on the orchard, trees and share pages | Taken from the sources listed on each page; not checked by an agronomist or a lawyer |

## Start screens are required: run 27 November 2026 (IST), live site, commit `0e160b7`

Tested in a desktop browser at phone size. Not tested on a real phone; reading the questions aloud could not be heard in the test browser.

| Check | Result |
|---|---|
| First visit: start screens cover the whole window; header, pages and bottom bar are inert; no skip and no close button | Pass |
| Escape and a tap on the screen edge do not close them | Pass |
| Four steps in order (language, district, kind of farming, water); Continue and "Start the app" stay disabled until a choice is made; Back keeps earlier answers | Pass |
| After "Start the app": app opens on My farm, profile saved with all four answers, the water answer is set on the Crops page | Pass |
| Reload after finishing: no start screens | Pass |
| Someone with saved data but no answers: start screens shown again | Pass |
| Shared field link without answers: start screens first, then the field's result on the map page | Pass |
| "Change" on My farm later: ordinary sheet with a close button, app not locked | Pass |

## Ecosystem Phase 1 and reading aloud switched off: run 27 November 2026 (IST), live site, commit `a559731` and after

Tested in a desktop browser at phone size. Not tested on a real phone. The microphone cannot be tested in the test browser.

| Check | Result |
|---|---|
| No speaker button, sound switch or reading bar anywhere; start screen has one Continue button | Pass |
| Year plan: wheat on 2 acres gives cost ₹54,000 and income ₹1,06,740 to ₹1,38,060 (34 to 46 qtl at MSP ₹2,610 plus straw) | Pass, matches hand calculation |
| Own figures (transport ₹3,000, price ₹2,700) change the totals and stay marked as the farmer's | Pass |
| Tomato as a custom crop: nothing estimated, "none" in every estimate cell, income only after the farmer's own yield and price | Pass |
| Planned 3.5 acres in rabi with 3 acres of land: warning shown | Pass |
| Real spending added and removed; sale entered; "real left over" shown; plan survives reload (stored as `km-plan`) | Pass |
| Soil page with no report: says so, shows no-card help with tel:18001801551 | Pass |
| Sample values: marked as a sample, no fertiliser plan, not used by the Crops page | Pass |
| Typed values (pH, N, K): marked "typed by you", 9 missing values listed, report of 2021 gets the old-report warning, kept in the list, cleared and brought back | Pass |
| Crops page: notice when there is no soil report, gone when there is one | Pass |
| Assistant: the sentence from the brief about yellow wheat leaves starts the two questions; Back works; old leaves and whole leaf gives "may be nitrogen, not certain", agrees with the typed report (N low); spots sends the farmer to an expert; no chemical is named; five sources listed | Pass |
| The eight earlier questions still answer (rain tested) | Pass |
| Experience note written, kept, shown as personal experience, removed with two taps | Pass |
| New rows on My farm and More open the right pages | Pass |
| Photo share and WhatsApp send | Not tested (need a phone) |

## Automated tests
`npm test` runs 47 unit tests (year-plan arithmetic, stored plan, yellow-leaf reading, start-screen completeness, land check on live readings, fruit order, poplar fit, crops under poplar, land-sharing cautions, stored profile, Haryana outline and border rule, change classes, picture frame, radar comparison, spoken PIN codes, speech chunking, season logic, crop reading on real and synthetic curves, crop ranking, rotation, sowing calendar, question understanding in Hindi and English). `npm run check` runs a syntax check and blocks the regex feature that broke older iPhones. Both run on every push in GitHub Actions and passed on commit `96b6a8a`.

