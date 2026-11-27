# Development roadmap: Krishi Mitra Haryana

Written 21 November 2026, after the audit in `PROJECT_AUDIT.md`. Nothing here is built yet. Work starts after the owner approves Phase 1.

## Status on 27 November 2026

| Phase | Status |
|---|---|
| 1 Imagery and land mapping | **Built and verified** (see `TEST_REPORT.md`). Open point: haze is not graded, only cautioned. |
| 2 Land cover and likely crop | **First version built.** Rule-based, confidence never above medium, farmer can correct. Not validated against known fields. |
| 3 Health and harvest timeline | **Partly built**: field story from well-seen seasons, possible-harvest with confirmation, standing-water check. |
| 4 Soil, water, weather | **Partly built**: source labels, elevation. Block-level groundwater and IMD not started. |
| 12/13 Tests and checks | **Started**: 40 unit tests and a compatibility check on every push. `app.js` not yet split. |
| 5 Recommendation engine | **Built and verified**: plain reasons, last crop and irrigation method, sowing calendar (a crop whose sowing has closed is marked late), costly no-MSP crops ranked down unless the farmer picks high risk, duration, water, yield, general fertiliser dose, assumptions, label check before any spray. **Missing: seed rate per crop** (no verified CCS HAU figures found yet) and Hindi wording of the sowing dates. |
| 8 Mandi | Text corrected. Waiting for the India phone test. |
| 10 Farm history | **Built and verified**: saved fields, crop per season, harvest answers, a diary per field (sowing, irrigation, fertiliser, spray, harvest, sale) and a backup file. Kept on the phone only. |
| 6 Assistant | **Built and verified**: eight questions (what to grow, is my field right for a crop, when to irrigate, rain, why weaker, fertiliser, when to harvest, which mandi) answered from the field's own data by tap, typing or voice, in Hindi and English. No outside AI service. Other questions get "not understood yet". Haryanvi not done. |
| 11 Interface | **Built and verified (27 Nov)**: six sections (Field, Crops, Weather, Mandi, My farm, More); soil card, methods and About under More; the assistant opens from the header on every page; first-visit "listen or read" choice; a saved field opens at once with its last result and keeps it when there is no network; sowing dates in Hindi. "Crop Doctor" is not a section yet because Phase 7 is not built. |
| 11 Interface, second pass | **Built and verified (27 Nov, commit `96b6a8a`)**: map locked to India and opened on Haryana, the rest behind a frosted veil; fields accepted only in Haryana; interface in the iOS design language; web font removed and scripts deferred. |
| 2 Land cover (second part) | **Built and verified (27 Nov, commit `949428e`)**: buildings and water are detected from two 10 m maps and the newest pass, and no crop advice is given there. Open point: both maps are one to five years old; new construction is caught only when the maps disagree and a year passes without green cover. |
| 10 Farmer profile | **Built and verified (27 Nov)**: kind of farming asked on first visit, stored profile, personal My farm page, orchard planning, crops between poplar rows, land-on-share preparation. Open points: no Haryanvi (Hindi and English only); no cost or income figures for fruit or timber; eucalyptus guidance missing; the land-sharing marketplace needs a server and is not built. |
| 1 Imagery (latest picture) | **Changed (27 Nov)**: the "Latest picture" button now works from far out too (NASA daily picture, 250 m) and switches to the newest Sentinel-2 pass when zoomed in. A sharp picture that is new every day does not exist free of charge. |
| 7 Crop doctor, 9 Schemes | Not started |

## Ground rules for every phase
- Work inside the existing app. No rewrite.
- Free data and free hosting unless the owner approves a cost.
- Nothing is called live. Every picture and number carries its date and source.
- A result that is a guess is worded as possible, and the farmer can confirm or correct it.
- Each phase ends with tests on the live site and an update to `TEST_REPORT.md`.

## Proposed architecture changes

| Change | Why | Cost |
|---|---|---|
| Split `app.js` into one module per page (map, result, advice, soil card, prices, weather) | Smaller files, fewer regressions | None |
| Add ESLint (with a browser-support rule) and unit tests for the pure logic (`field.js`, `advisor.js`, `risk.js`, `soilcard.js`, `voice.js` text handling), run on every push by GitHub Actions | Catches faults such as the one that broke older iPhones | None |
| On-device database (IndexedDB) for several fields, crop records and past results, with export and import of a backup file | Multiple fields and history without a server; data stays on the farmer's phone | None |
| Integrity hashes on CDN scripts and a Content-Security-Policy | Supply-chain safety | None |
| A short privacy note in the app | The field location is sent to data services | None |
| Optional small server (serverless function) | Needed only for: mandi price relay from India, alerts when a field changes, same fields on several phones, an AI assistant | Depends on the provider; to be costed before any decision |

The app stays a static site. A server is added only if the owner chooses one of the features that cannot work without it.

## Decisions and credentials needed from the owner

| Item | Needed for | Who can do it |
|---|---|---|
| Free ArcGIS Location Platform account and API key | Licensed use of the sharp Esri photo | Owner |
| One test on a phone in India: do mandi prices load? | Deciding the mandi design | Owner or a contact in Haryana |
| Real-phone voice test (one iPhone, one Android) | Phase 1 sign-off | Owner |
| Optional: Mapbox token (free tier) or Google Maps key (needs a billing account) | A second sharp photo to compare ages per village | Owner |
| Ground truth: 20 to 30 fields with known crop and harvest date | Validating change detection and crop identification | Owner or contacts |
| A Haryanvi speaker to review wording | Haryanvi text | Owner |

## Phases in priority order

### Phase 1: satellite imagery and land mapping
1. **Sentinel-1 radar reading for every field.** VV and VH backscatter from the radiometrically corrected product, a pass every 4 to 12 days, through cloud. Shown as a simple "crop cover seen by radar" line and used to fill gaps when optical passes are cloudy. Clearly labelled as radar.
2. **Image information line** on every picture: satellite, resolution, capture date, cloud over the field, and a plain quality grade (clear, partly cloudy, hazy).
3. **Several saved fields**, each with a name, stored on the phone. Area in acres, hectares and killa/kanal.
4. **Compare two dates.** A list of clear passes; the farmer picks two and sees both pictures and the difference.
5. **Safer change detection.** A change is "possible" until a second pass, or radar, shows the same thing, or the farmer confirms it. A haze check using the surrounding area.
6. **Cloud-free recent picture.** When the newest pass is cloudy over the field, show the newest clear one and say so; offer a 30-day cloud-free composite for the wider view.
7. **Licensed sharp photo** once the owner has the Esri key.

Verification: the test list in `TEST_REPORT.md` section "Phase 1 acceptance", on the live site at phone and desktop size.

### Phase 2: land cover and likely crop
- Land cover per field from the yearly greenness curve, moisture, bare-soil index and radar: crop, bare soil, fallow, water, built-up, trees.
- Likely crop from the seasonal curve and Haryana crop calendars: wheat, mustard, paddy, cotton, bajra, sugarcane first. Shown as "likely" with a confidence level and the date of the last observation, never from one image.
- The farmer confirms or corrects; corrections are saved and become ground truth.
- Limit: without labelled fields this is a rule-based method. Its accuracy is unknown until the ground-truth fields are collected.

### Phase 3: health and harvest timeline
- A plain timeline per field: previous observation, latest observation, difference, likely reason, suggested action.
- Waterlogging and moisture stress from the moisture index and radar.
- "Possible harvest" events that the farmer can confirm.

### Phase 4: soil, water, weather
- Every soil value labelled as lab result (card), map estimate (250 m) or regional estimate.
- Elevation and slope from the Copernicus 30 m model (verified available).
- Block-level groundwater category from CGWB, if an open table can be sourced; otherwise district-level with the year stated.
- IMD: investigate; use only if an official open service exists.

### Phase 5: recommendation engine
- Add previous crop, rotation, irrigation method.
- Each crop card: reasons, water need, sowing window, duration, seed, fertiliser, cost, yield range, price, revenue, net profit range, risks, and the assumptions behind them.
- A reference and year for every cost and yield figure.

### Phase 8: mandi and income
- Fix the mandi page first with whatever the India test shows: browser fetch if it works there, otherwise a relay.
- Nearest mandis by distance, price history, transport cost estimate, net selling income. Actual prices, averages and estimates labelled separately.

### Phase 10: farm history
- Per field: crop, sowing and harvest dates, irrigation, fertiliser, yield, selling price, saved results. Backup file export.

### Phase 9: Haryana knowledge
- Schemes and crop insurance page from official sources, each with its source link and date checked.

### Phase 6: assistant
- First: answers to the eight listed questions built from the farmer's own field data (rules, no outside service, free).
- An AI model for open questions needs a paid service and a server to hold its key. To be costed and approved separately.

### Phase 7: crop doctor
- Photo-based disease detection needs a model validated on Indian field photos. Public datasets are mostly laboratory photos and cover few Haryana crops, so accuracy in the field is unproven.
- Proposed: start with a guided symptom checker per crop that ends in "show this to your Krishi Vigyan Kendra", with no pesticide names or doses. Add a photo model only after it has been tested on real local photos.

### Phase 11 and 12: interface, security, performance
- Run alongside the phases above: six-item navigation (My Land, What to Grow, Weather, Crop Doctor, Mandi and Income, My Farm History), simple-language errors, the architecture changes listed at the top.

## What will not be promised
- Exact crop identification, confirmed harvest dates, or field-level soil chemistry from satellites.
- Guaranteed profit figures.
- Imagery that is both 0.3 m sharp and a few days old. No free source offers that.
