# Krishi Mitra Haryana · कृषि मित्र हरियाणा

A free, open web app for Haryana farmers: a **satellite land report** for any field, **what to grow** with a per-acre **budget**, **precautions**, **10-day weather alerts** and **live mandi prices**. Hindi and English. No login, no API keys in the browser, and it runs entirely on GitHub Pages.

**Live site:** https://sahiljangra12.github.io/haryana-krishi-mitra/

## The six sections
Field (the map and the result), Crops (what to grow), Weather, Mandi, My farm (saved fields, their last result, diary, backup) and More (Soil Health Card scanner, farming methods and videos, About). A mic button in the header opens the question box on every page.

On the first visit the app asks one thing: listen or read. A saved field opens straight away with its last result and its date, then updates. With no network the last result stays on screen and says which day it is from.

## The farmer first
The app starts only after four basic answers, one full screen each: language, district, the kind of farming (seasonal crops, a fruit orchard, or timber trees) and the water for the land (assured, limited, rain only). Until all four are given the start screens cover the whole window; there is no skip and the app behind cannot be reached. This also holds for someone who used the app before the questions existed and for someone who opens a shared field link (the field is shown as soon as they finish). The answers are kept on the phone (`km-profile`) and can be changed at any time under My farm. Water is asked because every crop recommendation depends on it; before this the app silently assumed assured water. It decides what the My farm page shows first:

| Kind of farming | Shown first |
|---|---|
| Seasonal (wheat, mustard, bajra, vegetables) | Field from the satellite, what to grow this season, soil test, mandi prices, weather |
| Medium-term (amla, ber, guava, kinnow) | Orchard planning, land from the satellite, season crops beside the orchard, ways to save water, weather |
| Long-term (poplar, eucalyptus) | Trees and crops between the rows, land on share, land from the satellite, weather |

- **Orchard planning** orders eight fruits by the district's zone and the farmer's water, and says which need assured water. It gives no cost or income figure, because no checked Haryana figures were found.
- **Trees and crops between the rows** says whether poplar fits the farmer's water and zone, asks the age of the trees and whether a tractor can pass, and lists the crops the Haryana Forest Department names as grown with poplar.
- **Land on share** helps an owner or a cultivator get ready for a sharing talk: cautions from their own answers, seven things to settle, the name of the Haryana law, and a message they can send themselves. Nothing is listed or published; a marketplace would need a server and identity checks and is not built.

Every statement on these pages names its source on the page. The data and the rules are in `docs/js/farmer.js`.

## Plan, soil, problems, experience (Phase 1 of the ecosystem brief)
- **Year plan and money** (`docs/js/planner.js`): crops by season and acres, cost by item, income and left-over as ranges, the farmer's own figures in place of any estimate, real spending and sale against the plan. Crops without checked data (tomato and other vegetables) take the farmer's figures only.
- **Soil profile**: scanned or typed values with their source and date, reports kept on the phone, help for farmers without a card. Missing values are never guessed.
- **Assistant**: a large microphone, the eight field questions, and a first guided problem (yellow leaves) in `docs/js/doctor.js`. It is rule-based, not an AI.
- **Farmer experience forum**: personal notes kept on the phone and sent by the farmer. The shared forum needs a server and is not open.
- **Reading aloud** is switched off in `docs/js/config.js` (`READ_ALOUD`).

`DEVELOPMENT_ROADMAP.md` lists, module by module, what works, what needs an API, a server or official data, and what is left.

## Is it a field at all?
Before any crop advice, the app checks what is on the chosen ground (`docs/js/landtype.js`): two 10 m land-cover maps (Impact Observatory 2023 and ESA WorldCover 2021), the greenness on the newest satellite pass, and the satellite's own water class. On buildings or water it gives no crop, soil or irrigation advice, on the result page, the Crops page and in the assistant; the farmer can overrule it with one tap ("this is my field"). If the outline takes in some buildings or water, or the two maps disagree, it says so and still shows the results.

## How a farmer uses it (three steps)
1. **Type the PIN code** (or the village name, or say it with the mic, or press "My location"). A PIN code lists its villages; picking one opens the map at field level, where single fields and their boundaries are clear.
2. **Tap the field** and pick its size: 1, 2, 3, 5 or 10 acres, or draw the boundary.
3. **Press "See result".** The first answer comes in about 6 seconds; history, soil map and climate fill in over the next 20 seconds.

The next time the app is opened, the saved field is checked again by itself. While the app is open it looks for a new satellite pass every few minutes and updates the field when one arrives.

**My fields.** Every field that is checked is saved on the phone with a name; the first screen lists them. Area is shown in acres (killa), hectares and kanal.

**What the farmer sees**
- **A picture of the field.** The sharp photo, to recognise the land, with the satellite's 10 m cells coloured inside the boundary. Four views: Health, What changed, Latest image, Sharp photo. Every view carries its real capture date.
- **Crop health**: bare, weak, fair or strong, and which side of the field is weaker.
- **What changed** between two clear passes, or any two dates the farmer picks: a part that was possibly cut, a part that lost greenness, or a part that grew, with the share of the field and the side. A possible harvest stays "possible" until the farmer answers Yes or No. A radar reading (Sentinel-1, through cloud) follows it.
- **Land and crop**: the kind of land and the likely crop of the last well-seen season, read from a year of images, with a confidence and a list to correct it.
- **Water**: whether the crop looks thirsty, and soil wetness.
- Soil, weather and best crop as three one-line rows that open their own pages.

Nothing is presented as live. The sharp photo shows the month it was taken, and satellite results show the date of the pass and how many days ago it was.

**Ask a question.** Eight everyday questions (what to grow, is my field right for wheat, when to irrigate, will it rain, why is the crop weaker, which fertiliser, when to harvest, which mandi) are answered from the field's own satellite, weather and price data, by tap, typing or voice. No outside AI service is used.

**Field diary.** Each saved field has a diary (sowing, irrigation, fertiliser, spray, harvest, sale) and a backup file.

**Voice.** Every step, result card, page, crop and technique has a speaker button (everyday Hindi or English, the device's own text-to-speech). A bar shows the sentence being read, with a stop button. If the device stays silent (no Hindi voice, speech blocked, or an in-app browser without speech), the same bar shows the full text and says what to change. The mic in the search box takes a village name or PIN and a few commands ("मौसम", "नतीजा देखो", "2 एकड़"). Where the browser cannot listen, the mic explains why and opens the keyboard so its own dictation key can be used.

**Navigation.** Every page has a back arrow. The phone's back button and the browser's back button move between pages and close the layer panel.

## What it does

| Tab | What the farmer gets | Data |
|---|---|---|
| **Land report** (ज़मीन रिपोर्ट) | Draw your field (or tap once and give acres). You get 12 months of crop greenness (NDVI) and moisture (NDMI), a cloud-masked history, a comparison with fields 1 km around, crop-season interpretation, an uneven-growth warning, soil texture, pH, organic carbon, N and CEC, and 5-year climate. Printable as PDF. | Copernicus **Sentinel-2 L2A** (10 m) via **Microsoft Planetary Computer** (STAC + titiler statistics); **ISRIC SoilGrids 2.0**; **NASA POWER** |
| **What to grow** (क्या बोएं) | Crops for the coming Rabi, Kharif or Zaid season ranked 0–100. Each crop shows **bad / normal / good-year profit** and a **risk-adjusted profit** that combine the budget, straw income, soil-card fertilizer cost, Haryana incentives (MPMV, DSR, straw), **climate risk** (frost, terminal heat, drought, waterlogging and hail from 5 years of NASA POWER data at the field) and **market risk and demand**. It also shows what-if sliders for yield, price and cost, a comparison chart, a crop calendar, precautions and linked techniques and videos. | `docs/js/crops.js` knowledge base, live mandi price, MSP |
| **Mandi prices** (मंडी भाव) | Today's prices across Haryana mandis, filterable by crop and district, a price trend, and MSP vs market. | **Agmarknet** via **data.gov.in**, refreshed twice a day by a GitHub Action |
| **Soil card scanner** (मृदा कार्ड) | Photograph the Soil Health Card or upload its PDF. Tesseract.js (English + Hindi) reads it on the phone, and digital PDFs are read directly. It extracts 12 parameters, rates them on the standard SHC thresholds, lets the farmer correct values, gives plain-language advice (gypsum, zinc, sulphur, organic carbon) and a crop-wise fertilizer plan in bags of urea, DAP and MOP with cost and savings vs. a blanket dose. The card values then drive the advisor. | Tesseract.js, pdf.js, `docs/js/soilcard.js` |
| **Techniques & videos** (तकनीकें) | 17 techniques: DSR, crop diversification, laser levelling, Happy/Super Seeder, zero-till, drip/sprinkler, AWD, raised beds, IPM, seed treatment, soil testing, green manure, gypsum, summer moong, leaf colour chart, e-NAM/FPO, crop insurance. Each has steps, benefits, verified Haryana incentives and YouTube video links. Techniques that suit your field are starred. | `docs/js/techniques.js` |
| **Weather** (मौसम) | 10-day forecast with farm alerts for frost, heavy rain, heat during grain filling, wind (don't spray) and rust/blight-favourable humidity. | **Open-Meteo** |

## Remote sensing

### Which satellite for what (Haryana)
| Need | Source used | Detail | Freshness | Why |
|---|---|---|---|---|
| Recognise the field | Esri World Imagery (Vantor/Maxar WorldView) | 0.3 to 0.5 m | Usually 1 to 2 years old; the app reads and shows the capture month for each place | Sharpest imagery that is free to use without a key |
| Condition of the crop | **Sentinel-2** A/B/C (ESA) | 10 m | A pass every 2 to 5 days | Best free mix of detail and revisit; red-edge and SWIR bands |
| Fill gaps | **Landsat 8/9** (NASA/USGS) | 30 m | Every 8 days | Used when it has a clear view newer than the newest clear Sentinel-2 view |
| Land use | **ISRO Bhuvan** (NRSC) LULC 1:50,000 | Survey of 2015-16 | Static | Indian national map: crop land, built-up, water, forest |
| Soil wetness, rain | NASA POWER | About 50 km | Daily, 3 days behind | Independent of cloud |
| Regional view | NASA GIBS (MODIS, VIIRS fires, SMAP, IMERG) | 250 m to 10 km | Daily | Stubble fires, heat, rain |

Not used, and why: **Google Maps/Earth imagery** needs a Google Cloud key with a billing account, which only the site owner can create, and its use is governed by Google's Maps Platform terms; it can be added as the base photo once a key exists. **ISRO Resourcesat (LISS-IV 5.8 m, LISS-III 23.5 m, AWiFS 56 m)** has no open tile or statistics service; scenes are ordered or downloaded from Bhuvan/NRSC with a login. **Sentinel-1 radar** sees through monsoon cloud and is the next source worth adding. Commercial daily imagery (Planet, 3 m) is paid.

### Field analysis
For the field boundary, one server call per Sentinel-2 pass returns four indices from the raw bands, after masking cloud with the scene classification: **NDVI** (greenness), **NDMI** (moisture), **NDRE** (leaf colour, a nitrogen hint) and **BSI** (bare soil). The four newest passes are read first, then one every 15 days over 13 months.

**Cell by cell** (`docs/js/field.js`). For the newest clear pass and a clear pass 5 to 30 days older, the NDVI of every 10 m cell inside the boundary is read. Each cell is graded bare (< 0.2), weak, fair or strong (> 0.6). Comparing the two dates, a cell is:
- **cut** when it was a crop (NDVI >= 0.35), dropped by 0.15 or more and is now bare (< 0.3)
- **less green** when it was a crop and dropped by 0.1 or more
- **greener** when it rose by 0.1 or more and is now a crop
- otherwise unchanged; bare soil changing a little between passes is ignored

The shares and the side of the field (north, south-east ...) become the sentences on the cards. Limits: a 1-acre field is only about 40 cells; ripening also lowers greenness, so "less green" is worded as a prompt to look; smoke or thin haze that the cloud mask misses can lower NDVI on one date. The app says "looks cut", and the next pass re-checks it.

**Map layers** (three chips on the map): Sharp photo, Latest image, Crop health, each with its date. The layers button adds water stress, false colour, any Sentinel-2 date of the last 4 months, the NASA daily layers and the ISRO land-use map.

## Finding a field
Village-level addresses in India are patchy in every free database, so the search:
1. Reads exact coordinates (`29.7621, 76.8623`) or a full Google Maps link and pins that spot.
2. Strips filler words such as Village, VPO, Tehsil, Distt., जिला and PIN codes, then queries **Esri World Geocoder** (best coverage of Haryana villages) and **OpenStreetMap** together.
3. Retries with village + district, then the village alone, then the PIN.
4. Transliterates Hindi input (रम्भा → rambha).
5. Drops any result outside Haryana, including Delhi and Chandigarh.

Suggestions appear as you type. A village or PIN is an area, not a field, so the app drops a pin there and asks the farmer to tap the exact field. It then names the nearest village (reverse geocoding) to confirm.

## Design (mobile first)
- The first screen is the map, edge to edge, with a white sheet at the bottom that shows one step at a time. A bottom bar switches between the six sections.
- Interface in the iOS design language: the phone's own system font (San Francisco on Apple devices, Roboto and Noto Sans Devanagari on Android), so no font is downloaded; grouped white lists on a grey ground, translucent bars, segmented controls and bottom sheets. Green for actions, orange for the field outline and the speaker buttons, and green, orange, red and blue only to grade a result.
- The map cannot leave India and opens on the whole of Haryana. Haryana is sharp; everything else sits behind a frosted veil cut to the state outline (OpenStreetMap). A field can be chosen only in Haryana (within 2.5 km of the outline, because the outline is simplified). At field scale (zoom 13 and above) the veil is removed.
- Light theme by default (readable in sunlight) with a night theme.
- **Logo:** the tractor emblem with the words "No Farmers No Food", supplied by the project owner (`docs/img/logo-full.png`). The header and the app icon use the tractor scene alone, because the words cannot be read at that size. The logo is drawn in the text colour, so it is black in the light theme and white in the night theme.
- It's **installable** (web app manifest plus service worker): it opens from the home screen and works offline for screens already seen.
- It **remembers the last field**. **Share on WhatsApp** sends a link (`#poly=…` or `#field=lat,lon,acres`) that reopens the same field.
- Photos come from Wikimedia Commons (credited on the About page, listed in `docs/js/images.js`). Icons are from [Lucide](https://lucide.dev) (ISC licence). The site uses no emojis.

## Where the work happens
There is no server and no database. The site is static files on GitHub Pages. The phone's browser asks the public data services directly, and the heavy work is done by their servers: Microsoft Planetary Computer finds the Sentinel-2 and Landsat passes, masks cloud and computes the indices and cell grids for the field; Esri, NASA, ISRO Bhuvan, ISRIC and Open-Meteo serve the rest. The only stored data is the last field, kept on the phone.
- The quick answer (newest passes, wetness, forecast, land use) runs in parallel and shows first; slower sources fill in.
- A service worker keeps the app shell, the sharp photo tiles and the tiles of each dated satellite pass on the phone (up to 900 tiles), so a field opens fast the second time on a weak network.
- A new pass is detected with one small search every 15 minutes while the app is open, and on every opening.
- What a server would add: a message to the farmer when a new pass shows a change, the same fields on several phones, and Sentinel-1 radar processing for the monsoon.

## How it's built

```
docs/index.html       single page (GitHub Pages serves /docs), no build step
docs/css/style.css
docs/js/app.js             UI, map (Leaflet), charts (Chart.js)
docs/js/sources.js         every external API call lives here
docs/js/rs.js              map layers: Sentinel-2 tiles and mosaics, NASA GIBS, legends
docs/js/field.js           cell-by-cell field health and change (harvest) detection
docs/js/phenology.js       land cover and likely crop from the yearly greenness curve
docs/js/ask.js             which of the eight questions a sentence is asking
docs/js/config.js          public settings: the ArcGIS key and its expiry date
tests/                     unit tests (npm test)
docs/js/voice.js           read-aloud and voice search (Web Speech API), with on-screen fallback
docs/js/advisor.js         scoring, budgets, weather alerts, NDVI interpretation (transparent rules)
docs/js/soilcard.js        Soil Health Card OCR, parsing, rating, fertilizer plan
docs/js/risk.js            climate/market risk, incentives, scenarios
docs/js/techniques.js      techniques library + video links
docs/js/crops.js           crop knowledge base: MSP, yield, cost, water, soils, varieties, precautions (EN + HI)
docs/js/districts.js       22 districts, zone, groundwater status
docs/js/i18n.js            Hindi / English strings
scripts/fetch_prices.py               daily Agmarknet fetch (standard library only)
.github/workflows/update-prices.yml   runs it at 12:10 and 18:10 IST, commits docs/data/*.json
```

### Satellite method
1. STAC search of `sentinel-2-l2a` over the field for the last 13 months, with scene cloud below 35%.
2. Keep about one scene every 12 days.
3. For each scene, the **Scene Classification Layer** is read over the field polygon. Scenes where more than 30% of field pixels are cloud, shadow or snow are dropped.
4. NDVI `(B08−B04)/(B08+B04)` and NDMI `(B8A−B11)/(B8A+B11)` are averaged over the field, server-side, by the Planetary Computer titiler `/item/statistics` endpoint. The processing-baseline ≥ 04.00 offset of +1000 DN is corrected in the expressions.
5. NDVI and true-colour map tiles of the latest clear scene are drawn on the map.

### Advisor scoring (out of 100)
Profit (40), water fit (25: irrigation access, crop water need, district groundwater stress or salinity), soil fit (20: SoilGrids texture, pH and alkalinity tolerance), region fit (10: NE or SW agro-zone), price safety (5: MSP or no MSP, adjusted by the farmer's risk choice). The planning price is MSP for wheat and paddy (strong procurement), a blend of MSP and mandi price for partially procured crops, and the live mandi price for non-MSP crops. When there's no live price, a reference price is used and clearly flagged.

## Mandi prices and the India geo-fence
data.gov.in only answers requests from inside India. So the site gets prices in two ways:
1. **From the visitor's browser (default).** When a farmer in India opens the site, their browser fetches today's Haryana prices directly from data.gov.in. This needs no setup.
2. **Server-side, saved to `docs/data/` (optional).** The GitHub Action saves prices for everyone, including visitors outside India, and builds the price-trend history. It only works if it can reach India: set the repository variable `PRICE_PROXY` to an India-based relay (for example, a small proxy on an Indian cloud region) or run the workflow on a self-hosted runner in India. Without that, the Action logs a warning and exits cleanly.

## Setup (one time)
1. **Get a free data.gov.in API key:** register at https://data.gov.in → My Account → API key.
2. In this repo, go to **Settings → Secrets and variables → Actions → New repository secret**. Name it `DATA_GOV_IN_API_KEY` and paste the key. Without it, the public sample key is used, which returns far fewer records.
3. Go to **Actions → Update mandi prices → Run workflow** to fill prices right away.

## Deploying changes
After editing any file in `docs/`, run `scripts/bump_version.sh` before committing. It stamps the script URLs so visitors get the new version immediately instead of a cached copy.

## Editing crop data
Every number the advisor uses is in `docs/js/crops.js`. MSP values are official (Rabi Marketing Season 2027-28, Kharif Marketing Season 2026-27). Yield, cost and water figures are indicative Haryana ranges. Update them each season or replace them with district-level CACP data.

## Limitations
- Yield and cost are state-average estimates, not field measurements.
- No price forecasting. The app uses today's mandi price and MSP.
- SoilGrids is a 250 m model. A Soil Health Card lab test is the ground truth.
- Advice is decision support. Confirm with your KVK or agriculture officer.

## Roadmap ideas
- District-level yield model from DES / Haryana crop-cutting data
- Sentinel-1 radar for cloudy monsoon months
- Field-boundary auto-detection
- WhatsApp report sharing and voice (Hindi/Haryanvi)
- Soil Health Card integration

## License
MIT. Data belongs to the respective providers (Copernicus/ESA, Microsoft Planetary Computer, ISRIC, NASA, Open-Meteo, Agmarknet/GoI).
