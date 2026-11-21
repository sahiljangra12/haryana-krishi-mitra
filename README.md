# Krishi Mitra Haryana · कृषि मित्र हरियाणा

A free, open web app for Haryana farmers: a **satellite land report** for any field, **what to grow** with a per-acre **budget**, **precautions**, **10-day weather alerts** and **live mandi prices**. Hindi and English. No login, no API keys in the browser, and it runs entirely on GitHub Pages.

**Live site:** https://sahiljangra12.github.io/haryana-krishi-mitra/

## How a farmer uses it (three steps)
1. **Type the PIN code** (or village name, or say it with the mic, or press "My location").
2. **Tap the field** on the sharp map and pick its size: 1, 2, 3, 5 or 10 acres, or draw the boundary.
3. **Press "See result".** The first answer appears in about 6 seconds from the newest satellite passes; the season history, soil map and climate fill in over the next 20 seconds or so.

The result is written in plain words on five cards: crop health, water, soil, weather and best crop. Each card has a traffic-light colour, and the measurements behind it sit under "Full satellite details".

**Voice guide.** Every step, every result card, every tab and every crop and technique has a speaker button that reads it aloud in everyday Hindi or English (the browser's own text-to-speech, nothing recorded or uploaded). Turn on the speaker in the header and each step is read out automatically. The mic in the search box takes a spoken village name or PIN.

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
**Base map.** A sharp aerial photo (Esri World Imagery) that zooms all the way in. Real tiles stop at zoom 18 in rural Haryana, so the map enlarges those instead of asking for deeper ones, and no blank boxes appear. The photo can be a few years old, so it's used only to find the field. Everything measured comes from the live layers below.

**Field analysis (Sentinel-2, 10 m, a new pass every 2 to 5 days).** For the field boundary, one server call per pass returns four indices computed from the raw bands, after masking cloud:
- **NDVI** crop greenness, plus how even it is across the field
- **NDMI** moisture in the crop and soil
- **NDRE** red-edge leaf colour, a hint of nitrogen shortage
- **BSI** how much bare soil is showing

The four newest passes are read first, then one every 15 days over 13 months for the season chart, and the field is compared with the fields within 1 km.

**Other live sources in the result**
- **NASA POWER** root-zone and surface soil wetness and 7-day rain (daily, about 3 days behind).
- **ISRO Bhuvan (NRSC)** land-use map of Haryana, 1:50,000, survey of 2015-16: says whether the spot is crop land, built-up, forest or waste land. It can also be switched on as a map layer.
- **ISRIC SoilGrids** (250 m model): texture class from sand, silt and clay, pH, organic carbon and nitrogen. A scanned Soil Health Card overrides it.
- **Open-Meteo** 10-day forecast and **NASA POWER** 5-year monthly climate.

**Map layers** (chips on the map): Photo, Crop health, Water, Latest image, and under More: false colour, any Sentinel-2 date from the last 4 months, the NASA daily image (MODIS), VIIRS fire detections (stubble burning), VIIRS 8-day greenness, MODIS land temperature, SMAP root-zone soil moisture, GPM IMERG rainfall and the ISRO land-use map.

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
- One typeface, *Anek Devanagari*, for Hindi and English. Leaf green for actions, marigold for the field outline and the speaker buttons, and green, amber, red and blue only to grade a result.
- Light theme by default (readable in sunlight) with a night theme.
- It's **installable** (web app manifest plus service worker): it opens from the home screen and works offline for screens already seen.
- It **remembers the last field**. **Share on WhatsApp** sends a link (`#poly=…` or `#field=lat,lon,acres`) that reopens the same field.
- Photos come from Wikimedia Commons (credited on the About page, listed in `docs/js/images.js`). Icons are from [Lucide](https://lucide.dev) (ISC licence). The site uses no emojis.

## How it's built

```
docs/index.html       single page (GitHub Pages serves /docs), no build step
docs/css/style.css
docs/js/app.js             UI, map (Leaflet), charts (Chart.js)
docs/js/sources.js         every external API call lives here
docs/js/rs.js              map layers: Sentinel-2 tiles and mosaics, NASA GIBS, legends
docs/js/voice.js           read-aloud and voice search (Web Speech API)
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
