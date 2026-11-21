# API configuration: Krishi Mitra Haryana

As of 21 November 2026.

## What the app uses today

| Service | Key | Where |
|---|---|---|
| Esri sharp photo tiles and place search | **ArcGIS Location Platform API key**, in `docs/js/config.js` | Browser |
| Microsoft Planetary Computer (Sentinel-2, Sentinel-1, Landsat, DEM) | None | Browser |
| NASA POWER, NASA GIBS, ISRIC SoilGrids, Open-Meteo, ISRO Bhuvan WMS, India Post PIN service, OpenStreetMap | None | Browser |
| data.gov.in (Agmarknet) | Public sample key, in `docs/js/sources.js` | Browser |

### The ArcGIS key
- Created 20 November 2026 in the owner's ArcGIS Location Platform account, item "Krishi Mitra Haryana".
- Privileges: Basemap styles service, Static basemap tiles, Geocode (not stored). Nothing else.
- Restricted to the referrer `https://sahiljangra12.github.io`. Verified: it works from the site and is refused from another website.
- Pay-as-you-go is off on the account, so use beyond the free tier stops instead of billing.
- **Expires 19 November 2027.** Before then: portal > Content > "Krishi Mitra Haryana" > generate a new API key, paste it into `docs/js/config.js`, update the date there.
- If the key fails, the app switches by itself to the open Esri addresses, so the map keeps working.
- A site moved to its own domain needs that domain added to the key's referrers.

The data.gov.in sample key is published by data.gov.in for trials. It returns 10 records per request. It is not a secret.

## Optional settings that exist in the code

| Setting | Where it is set | Effect | Current state |
|---|---|---|---|
| `DATA_GOV_IN_API_KEY` | GitHub repository secret | The scheduled price job uses your own data.gov.in key (more records per request) | Not set |
| `PRICE_PROXY` | GitHub repository variable | Turns the twice-daily price job on and routes it through an India-based relay | Not set, so the job is off and `docs/data/prices.json` does not exist |
| `km-ogd-key` | Browser `localStorage` | Lets one browser use a personal data.gov.in key | Not set |

## Owner actions (credentials only the owner can create)

| Credential | Why | Cost | Where it would live |
|---|---|---|---|
| data.gov.in personal key | Full mandi price lists | Free | GitHub secret for the job; never in the page |
| Mapbox token (optional) | A second sharp photo | Up to 200,000 raster tile requests a month free | In the page, restricted to the site's address |
| Google Maps key (optional) | Google's satellite tiles | Needs a billing account; 100,000 tile requests a month free | In the page, restricted to the site's address, with a spending cap set |

## Rules for any future server
- Private keys (for example an AI model key or a messaging key) go in the provider's environment variables, never in `docs/` and never in Git.
- Keys that must be in the page are restricted by website address and given a quota.
- No integration is described as working until a real request has succeeded with the real credential.
