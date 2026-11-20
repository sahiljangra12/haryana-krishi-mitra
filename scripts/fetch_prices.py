#!/usr/bin/env python3
"""Fetch today's Haryana mandi prices from Agmarknet via the data.gov.in OGD API.

Writes:
  data/prices.json         latest records (what the website shows)
  data/price_history.json  one Haryana-wide median modal price per commodity per day, last 400 days

Runs in GitHub Actions twice a day. Set the repository secret DATA_GOV_IN_API_KEY
(free: register at https://data.gov.in, then "My Account" -> API key). Without it the
public sample key is used, which only returns 10 records per request, so fewer markets show up.

Standard library only, no pip install needed.
"""
import json
import os
import statistics
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"  # Current Daily Price of Various Commodities from Various Markets (Mandi)
SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def fetch_page(key, offset, limit, filter_field):
    params = {
        "api-key": key,
        "format": "json",
        "offset": offset,
        "limit": limit,
        f"filters[{filter_field}]": "Haryana",
    }
    url = f"https://api.data.gov.in/resource/{RESOURCE}?" + urllib.parse.urlencode(params)
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "krishi-mitra-haryana/1.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except Exception as e:  # network hiccups are common on this API
            last = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"data.gov.in request failed: {last}")


def to_iso(d):
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(d, fmt).date().isoformat()
        except (ValueError, TypeError):
            pass
    return d


def num(v):
    try:
        return float(str(v).replace(",", ""))
    except (TypeError, ValueError):
        return None


def main():
    key = os.environ.get("DATA_GOV_IN_API_KEY") or SAMPLE_KEY
    using_sample = key == SAMPLE_KEY
    limit = 10 if using_sample else 1000
    max_pages = 60 if using_sample else 10

    records = []
    for filter_field in ("state.keyword", "state"):
        records, offset = [], 0
        for _ in range(max_pages):
            j = fetch_page(key, offset, limit, filter_field)
            batch = j.get("records") or []
            records.extend(batch)
            total = int(j.get("total") or 0)
            offset += len(batch)
            if not batch or len(batch) < limit or (total and offset >= total):
                break
        if records:
            break

    clean = []
    for r in records:
        if str(r.get("state", "")).strip().lower() != "haryana":
            continue
        mn, mx, md = num(r.get("min_price")), num(r.get("max_price")), num(r.get("modal_price"))
        if not md or md <= 0:
            continue
        clean.append({
            "district": str(r.get("district", "")).strip(),
            "market": str(r.get("market", "")).strip(),
            "commodity": str(r.get("commodity", "")).strip(),
            "variety": str(r.get("variety", "")).strip(),
            "grade": str(r.get("grade", "")).strip(),
            "date": to_iso(r.get("arrival_date")),
            "min": mn or md,
            "max": mx or md,
            "modal": md,
        })

    print(f"fetched {len(records)} raw, {len(clean)} Haryana records (sample key: {using_sample})")
    os.makedirs(DATA, exist_ok=True)
    if not clean:
        # keep yesterday's file rather than blanking the site
        print("no records today; leaving existing data untouched")
        return 0

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with open(os.path.join(DATA, "prices.json"), "w", encoding="utf-8") as f:
        json.dump({"updated": now, "source": "Agmarknet via data.gov.in (OGD)", "records": clean}, f, ensure_ascii=False, indent=0)

    hist_path = os.path.join(DATA, "price_history.json")
    try:
        with open(hist_path, encoding="utf-8") as f:
            hist = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        hist = {"series": {}}
    series = hist.setdefault("series", {})
    by_comm = {}
    for r in clean:
        by_comm.setdefault((r["commodity"], r["date"]), []).append(r["modal"])
    for (comm, date), vals in by_comm.items():
        pts = [p for p in series.get(comm, []) if p["date"] != date]
        pts.append({"date": date, "modal": round(statistics.median(vals)), "n": len(vals)})
        pts.sort(key=lambda p: p["date"])
        series[comm] = pts[-400:]
    hist["updated"] = now
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=0)
    return 0


if __name__ == "__main__":
    sys.exit(main())
