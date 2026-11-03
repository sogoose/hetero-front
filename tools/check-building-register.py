#!/usr/bin/env python3
"""Direct Korean Building Register API checks; never uploads addresses or credentials.

Inputs: 19-digit PNU, or a PRIVATE CSV with columns building_id,pnu.
Outputs: review-only records, without PNU, road addresses or the service key.
This script intentionally never edits the public registry.csv automatically.
"""
import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ENDPOINT = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"
PUBLIC_COLUMNS = [
    "building_id", "status", "photo_years", "structure", "raw_structure",
    "approval_date", "primary_use", "floors_above", "record_source", "comment"
]


def pnu_parts(pnu):
    """A PNU is 10-digit legal-dong code, 1-digit land type, 4+4 lot number."""
    if not re.fullmatch(r"\d{19}", pnu):
        raise ValueError("PNU must be exactly 19 decimal digits")
    if pnu[10] not in "12":
        raise ValueError("PNU land-type digit must be 1 (land) or 2 (mountain)")
    return {
        "sigunguCd": pnu[:5],
        "bjdongCd": pnu[5:10],
        "platGbCd": "0" if pnu[10] == "1" else "1",
        "bun": pnu[11:15],
        "ji": pnu[15:19],
    }


def parse_response(text):
    """Support both official JSON and legacy XML/error responses."""
    try:
        root = json.loads(text)
        resp = root.get("response", root)
        header = resp.get("header") or {}
        code = str(header.get("resultCode", "00")).zfill(2)
        if code != "00":
            raise RuntimeError("Official service returned error code " + code)
        body = resp.get("body") or {}
        items = (body.get("items") or {}).get("item", [])
        if not items:
            return []
        return items if isinstance(items, list) else [items]
    except json.JSONDecodeError:
        try:
            root = ET.fromstring(text)
        except ET.ParseError:
            raise RuntimeError("Non-JSON, non-XML upstream response") from None
        code = root.findtext(".//resultCode") or "00"
        if code not in ("00", "0"):
            raise RuntimeError("Official service returned error code " + code)
        return [{child.tag: child.text or "" for child in element} for element in root.findall(".//items/item")]


def fetch_by_pnu(key, pnu):
    params = {"serviceKey": key, **pnu_parts(pnu), "numOfRows": 100,
              "pageNo": 1, "_type": "json"}
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)
    # Only the fixed official HTTPS endpoint receives the credential.
    request = urllib.request.Request(url, headers={"Accept": "application/json,application/xml"})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = response.read(4_000_000).decode("utf-8-sig")
    except urllib.error.HTTPError as exc:
        # Never print exc.url or the complete exception: those include the key.
        raise RuntimeError("Official API HTTP status " + str(exc.code)) from None
    except urllib.error.URLError:
        raise RuntimeError("Network cannot reach the official API") from None
    return parse_response(raw)


def normalize_structure(raw):
    name = str(raw or "").strip()
    if "철근콘크리트" in name or "철근콘크리트" in name.replace(" ", ""):
        return "철근콘크리트"
    if "연와" in name or "벽돌" in name:
        return "벽돌"
    # Other systems (e.g. block masonry) must not be guessed as brick.
    return name


def approval_date(raw):
    digits = re.sub(r"\D", "", str(raw or ""))
    if len(digits) == 8:
        return digits[:4] + "-" + digits[4:6] + "-" + digits[6:]
    return ""


def load_original_years(path):
    years = {}
    if not path.exists():
        return years
    with path.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            bid = (row.get("building_id") or "").strip()
            if bid:
                years.setdefault(bid, set()).add((row.get("construction_year") or "").strip())
    return years


def report(building_id, items, years):
    if not items:
        return [building_id, "not_found", years, "", "", "", "", "",
                "official 建축HUB API", "No current title ledger returned"]
    if len(items) != 1:
        return [building_id, "multiple_titles_review", years, "", "", "", "", "",
                "official 建축HUB API", "Multiple title records; do not choose a structure automatically"]
    item = items[0]
    raw = str(item.get("strctCdNm") or "")
    structure = normalize_structure(raw)
    approval = approval_date(item.get("useAprDay"))
    if not raw:
        status = "missing_structure"
    elif not approval or not years:
        status = "year_unconfirmed_review"
    elif len(years.split("|")) != 1 or not re.fullmatch(r"\d{4}", years):
        status = "multiple_or_approx_years_review"
    elif years != approval[:4]:
        status = "year_mismatch_review"
    else:
        status = "year_matched_review"
    return [
        building_id, status, years, structure, raw, approval,
        str(item.get("mainPurpsCdNm") or ""), str(item.get("grndFlrCnt") or ""),
        "official 建축HUB API / title",
        "Confirm photo-to-building identity before writing to public registry"
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--pnu", help="Single 19-digit cadastral PNU")
    source.add_argument("--input", type=Path,
                        help="Private CSV (building_id,pnu), NEVER commit this file")
    parser.add_argument("--registry", type=Path, default=Path("assets/buildings/registry.csv"))
    parser.add_argument("--output", type=Path, default=Path("private-data/structure-proposals.csv"))
    args = parser.parse_args()
    key = os.environ.get("BUILDING_API_KEY", "").strip()
    if not key:
        parser.error("Set BUILDING_API_KEY in your local environment (never in GitHub code)")
    all_years = load_original_years(args.registry)
    if args.pnu:
        work = [("single-query", args.pnu)]
    else:
        with args.input.open(encoding="utf-8-sig", newline="") as stream:
            work = [((row.get("building_id") or "").strip(), (row.get("pnu") or "").strip())
                    for row in csv.DictReader(stream)]
        if not work or any(not bid for bid, _ in work):
            parser.error("Input CSV must have nonempty building_id,pnu columns")
    proposals = []
    for index, (bid, pnu) in enumerate(work):
        try:
            items = fetch_by_pnu(key, pnu)
            years = "|".join(sorted(y for y in all_years.get(bid, set()) if y))
            result = report(bid, items, years)
        except (ValueError, RuntimeError) as exc:
            result = [bid, "query_error", "", "", "", "", "", "",
                      "official 建축HUB API", str(exc)]
        proposals.append(result)
        print(bid + ": " + result[1] + " " + result[3], flush=True)
        if index < len(work) - 1:
            time.sleep(0.3)
    if args.pnu:
        # A one-record smoke test does not write any private file.
        return
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(PUBLIC_COLUMNS)
        writer.writerows(proposals)
    print("Review-only proposals saved locally; no public registry was changed.")


if __name__ == "__main__":
    main()
