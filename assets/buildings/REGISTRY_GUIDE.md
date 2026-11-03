# HETERO FRONT — Building Registry

This folder is the source of all buildings shown in `landscapes.html`.

## Editable spreadsheet

**`registry.csv`** is the editing sheet. Open in Excel, Google Sheets or another spreadsheet editor (UTF-8), fill in data, then commit the CSV to GitHub. Do not change the `file` key: it connects each row to its existing photograph. The public website automatically reads this CSV at page load. GitHub Pages may take a short time to publish changes.

| Column | Meaning |
|---|---|
| file | Exact photo filename (stable unique ID; required) |
| building_id | Anonymous building-group ID (B-001 etc). Identical buildings in different photos share an ID. Do not expose full addresses. |
| construction_year | Recorded building year, e.g. `1987` or `1980전후` |
| year_status | `verified` (direct official check), `crosschecked` (independent secondary republication checked), `estimated` (estimated), `unverified` (not independently checked) |
| year_source | Documentary or survey basis for the date; avoid addresses or deep links exposing exact location |
| approval_date | Occupancy approval date `YYYY-MM-DD` only when explicitly confirmed |
| structure | Structural system (e.g. `조적조`, `철근콘크리트조`) |
| structure_status | `verified`, `crosschecked`, `estimated`, or `unverified` |
| wall_finish | Exterior wall finish (e.g. `점토벽돌`, `타일`) |
| wall_status | Confidence for wall finish |
| roof_finish | Roofing (e.g. `시멘트 기와`, `슬레이트`) |
| roof_status | Confidence for roofing |
| railing | Railing material / fabrication (e.g. `주물 난간`, `단조 난간`) |
| railing_status | Confidence for railing |
| primary_use | Primary building use when matched to external records |
| floors_above | Aboveground number of floors when matched to external records |
| record_source | Publicly safe summary of provenance (no private street address) |
| notes | Free-text notes, source commentary, or later inference rationale |

### How the date statistics work

- Current website statistics count all listed photographs; the CSV now contains `building_id` for deduplicating to unique buildings. There are 147 photos / 135 tentative unique buildings. Website deduplication is not yet enabled.
- Each photo is one CSV row. The `building_id` keys group repeated photos of the same building. Grouping was based on historic original filename identity; unnamed exact-number locations remain provisional.
- Dates in the legacy `metadata.json` were migrated here as **unverified**, not as independently verified building permit dates. Seven circa-year entries were marked `estimated`.
- `1980전후` is tentatively placed in the 1980s and under 1980 in year-by-year mode. The statistics explicitly disclose this approximation.
- Three initial archive cases were crosschecked against independent public republications of building-register data; they are marked `crosschecked`, not as original-government-register verification.
- Blank materials fields stay unclassified, not guessed from the photograph. Fill material status fields when material information is verified or estimated.
- The photograph's front caption and reverse information reflect edits to `registry.csv` after deployment. Existing title, location, thumbnails, and supplementary photo details remain in `metadata.json`.

### Edit on GitHub

https://github.com/sogoose/hetero-front/edit/main/assets/buildings/registry.csv

No precise street addresses should be stored in this public CSV. Use coarse locations in `metadata.json`; do not add sensitive identifying information to notes.

## Public register research, 2026-11-02

35 buildings were individually crosschecked via public third-party republication of Architecture HUB building-register records (juso.zzxxccvv.com), for structure, use, number of aboveground floors, and occupancy approval dates. 2 earlier buildings were also crosschecked, giving 37 buildings with status `crosschecked`. That does not mean the official original register was read through an authenticated API. Exact addresses and per-building deep links were intentionally not added to public CSV. Roof finish, wall finish and railing remain blank until supported by evidence.

## Structure verification progress — 2026-11-03

- Structure recorded for **51 of 147 photo records**, covering **48 provisional unique buildings**; **96 photo records** remain without independently supported structure classifications.
- These are **secondary public building-register republications** (architecture HUB data via 주소주소, 집품, 빌딩샵AI). They are marked `structure_status=crosschecked` and must not be relabeled as direct government API verification.
- The user's example Jootek parcel was matched to its archive photo via the historic filename and a public parcel record; that building's structure is crosschecked as 벽돌. The specific Jootek detail URL was not directly retrievable through the available external reader.
- Some source approval years differ from the years recorded on original photo filenames. The project retains the original construction-year strings, marks the discrepancy in `notes`, and records independently reported `approval_date` where available. **Do not automatically equate approval dates with original construction dates.**
- None of the newly written source descriptions or notes contain specific road addresses or cadastral numbers. Private full-address references must never be published in the CSV.
- Roof structure `(철근)콘크리트` is not automatically assigned to `roof_finish`. The latter is the visible roofing finish/material and requires separate evidence.
