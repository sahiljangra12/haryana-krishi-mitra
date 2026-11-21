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

## Sources still to investigate
- IMD: an official open service usable from a browser.
- CGWB / India-WRIS: block-level groundwater categories as an open table.
- Haryana Agriculture Department and CCS HAU: scheme notices and package-of-practices references for the cost and yield tables.
