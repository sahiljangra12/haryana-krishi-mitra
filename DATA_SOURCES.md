# Data sources: Krishi Mitra Haryana

Checked 21 November 2026. "Tested" means a real request was made in the audit and the answer inspected.

## Imagery: which source is best for what

No free source is both very sharp and recent. The app therefore uses two kinds of picture and keeps them apart on screen.

| Need | Best free choice | Detail | Age / revisit | Cloud | Cost and terms | Status |
|---|---|---|---|---|---|---|
| Recognise the field and its boundary | **Esri World Imagery** | 0.31 to 0.5 m in all 20 districts sampled | Photo dates from Oct 2019 (Rewari) to May 2026 (Hisar); most are 2025 | Cloud-free (curated mosaic) | Used through the owner's ArcGIS Location Platform key (free tier: 2 million basemap tiles a month) | In use, tested |
| Condition of the crop now | **Sentinel-2** (ESA), through Microsoft Planetary Computer | 10 m | A pass every 2 to 5 days | Often cloudy in monsoon; cloud is masked per field | Free, open | In use, tested |
| See through cloud | **Sentinel-1 radar** (ESA), terrain-corrected product on Planetary Computer | 10 m | Passes on 4, 12, 16 Nov 2026 at the test field | Not affected by cloud | Free, open | In use since 21 Nov 2026 |
| Fill optical gaps | **Landsat 8/9** (NASA/USGS) | 30 m | Every 8 days combined | Cloud-masked | Free, open | Tested, wired in |
| Cloud-free wide view | Newest-clear-pixel mosaic of the last 30 days of Sentinel-2 (built on request) | 10 m | Up to 30 days | Cloud-free by construction | Free | In use |

### Alternatives considered

| Source | Detail | Why not the default |
|---|---|---|
| Google Map Tiles (2D satellite) | Sharp; dates not published per tile | Needs a Google Cloud key with a billing account. 100,000 tile requests a month are free, then about $0.60 per 1,000 (https://developers.google.com/maps/billing-and-pricing/pricing). A phone map screen uses roughly 15 to 30 tiles. |
| Mapbox Satellite | Sharp; dates not published per tile | Needs a Mapbox token. Up to 200,000 raster tile requests a month are free (https://www.mapbox.com/pricing/). Worth adding as a second photo if the owner creates a token. |
| EOX Sentinel-2 cloudless 2024 | 10 m, one cloud-free mosaic per year | Not sharper than what the app already builds, and a year old. Free for non-commercial use with attribution (CC BY-NC-SA 4.0, https://eox.at/2024/08/sentinel-2-cloudless-2023/). Tile service reachable (tested). |
| ISRO Resourcesat (LISS-IV 5.8 m, LISS-III 23.5 m) | Indian, 5.8 m | No open tile or statistics service was found; data is ordered or downloaded with a login. |
| Planet (3 m daily) and other commercial imagery | Sharp and recent | Paid. |

## Other sources in use

| Source | Used for | Resolution | Freshness | Cost | Status |
|---|---|---|---|---|---|
| ISRO Bhuvan (NRSC) land use and land cover, 1:50,000 | Land-use class at the field, map layer | Mapping scale 1:50,000 | Survey of 2015-16 | Free public WMS | Tested |
| ISRIC SoilGrids 2.0 | Sand, silt, clay, pH, organic carbon, nitrogen | 250 m model, not a field measurement | Static | Free | Tested; often slow or busy |
| Soil Health Card (the farmer's own) | Lab values, fertiliser plan | The field itself | Date on the card | Free; read on the phone | Sample card tested |
| NASA POWER | Root-zone and surface soil wetness, rain, 5-year climate | About 50 km | Daily, about 3 days behind | Free | Tested |
| Open-Meteo | 10-day forecast, evapotranspiration | About 10 km model | Hourly updates | Free for non-commercial use | Tested |
| NASA GIBS | MODIS daily image, VIIRS fires and greenness, land temperature, SMAP soil moisture, IMERG rain | 250 m to 10 km | Daily | Free | Tested earlier in this work session |
| Agmarknet through data.gov.in | Mandi prices | Per mandi | Daily | Free; answers only from India | **Not working from the test location** |
| CCEA MSP decisions | MSP table | National | Each season | Free | Values in code; not re-checked |
| India Post PIN code service (api.postalpincode.in) | Villages inside a PIN code | Post office | Static | Free | Tested |
| Esri World Geocoder, OpenStreetMap Nominatim, Photon | Village and address search | Village | Varies | Free tiers | Tested |
| Copernicus DEM 30 m (Planetary Computer) | Elevation of the field | 30 m | Static | Free | In use |

| OpenStreetMap (relation 1942601, via Nominatim) | Haryana state outline: the map veil and the "only in Haryana" check | Simplified to 428 points, about 1 km | Boundary as mapped in November 2026 | Free, ODbL, credited on the map | Tested (unit test: 6 towns inside, 5 neighbouring cities outside) |

| Impact Observatory annual land cover (Planetary Computer `io-lulc-annual-v02`) | Is this place a field, buildings, water or trees | 10 m | Map of 2023, the newest year published | Free, no key | Tested live: Karnal city 98% built, Tilyar lake 92% water, a Karnal field 100% crops |
| ESA WorldCover (Planetary Computer `esa-worldcover`) | Second opinion for the same check | 10 m | Map of 2021 | Free, no key | Tested live with the above |
| Sentinel-2 scene classification, class 6 (water) | Water on the field on the newest clear passes | 20 m | Every pass | Free, same request as the cloud check | Tested |
| NASA GIBS VIIRS NOAA-20 true colour | "Latest picture" from far out (state view) | 250 m | Every day (yesterday's picture) | Free, no key | Tested: tiles for 26 Nov 2026 loaded with no gaps over Haryana |
| ICAR, CCS HAU, Haryana Forest Department, Haryana Horticulture Department, Haryana Act 23 of 2024 | Orchard, poplar and land-sharing pages | Text sources | See the list on each page and in `docs/js/farmer.js` | Free | Read on 27 Nov 2026; each statement carries its source |

| Kisan Call Centre, 1800-180-1551 (mkisan.gov.in; Lok Sabha answers) | Call button on the soil page and in the assistant | Text source | Free call, 6 am to 10 pm every day, as stated by the Ministry | Free | Number checked against mkisan.gov.in on 27 Nov 2026; the call itself not tested |
| TNAU Agritech, ICAR Indian Farming, Univ. of Maryland, Cornell | The yellow-leaf questions in the assistant | Text sources | Listed in `docs/js/doctor.js` and on the answer | Free | Read on 27 Nov 2026; not reviewed by an agronomist |

| ICAR list of Krishi Vigyan Kendras, Haryana (icar.org.in/en/node/15019) | KVK page: 18 centres, addresses, host bodies | Text source | Read 27 Nov 2026; ICAR's count may lag (four districts have no centre in it) | Free | Unit test checks 18 entries and the nearest-centre rule |
| PIB, pmkisan.gov.in, pmfby.gov.in, Haryana budget and state statements 2025-26 | Schemes page | Text sources, named on each scheme | Read 27 Nov 2026; amounts change | Free | Not re-checked automatically |
| Official sites of CCS HAU, MHU, ICAR institutes in Karnal | Institutes page | Text sources | Read 27 Nov 2026 | Free | Links not opened one by one in the test |
| Haryana State Agricultural Marketing Board papers | "81 mandis on e-NAM", pre-coolers in mandis | Text source | Board papers of 2020-21 | Free | Figures are dated on the page |
| Google Maps search links | "Search on the map" for offices, stores and transport | Not a data source: a search the farmer runs | Live | Free, no key | Results are marked as unchecked on every page that uses them |

## Sources still to investigate
- A checked list of active FPOs in Haryana with crops and contacts (SFACH, SFAC, NABARD).
- A checked list of cold stores and warehouses by district with capacity (a Rajya Sabha answer of February 2024 has district counts; the names are with NHB and the state).
- Current phone numbers of each KVK (kvk.icar.gov.in).
- Soil testing laboratories by district.

- IMD: an official open service usable from a browser.
- CGWB / India-WRIS: block-level groundwater categories as an open table.
- Haryana Agriculture Department and CCS HAU: scheme notices and package-of-practices references for the cost and yield tables.
