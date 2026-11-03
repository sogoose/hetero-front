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

- Current website statistics count all listed photographs; the CSV now contains `building_id` for deduplicating to unique buildings. There are 147 photos / 134 tentative unique buildings (one exact-address duplicate was reconciled in the fourth pass). Website deduplication is not yet enabled.
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

- Structure recorded for **81 of 147 photo records**, covering **74 provisional unique buildings**; **66 photo records** remain without independently supported structure classifications.
- These are **secondary public building-register republications** (architecture HUB data via 주소주소, 집품, 빌딩샵AI). They are marked `structure_status=crosschecked` and must not be relabeled as direct government API verification.
- The user's example Jootek parcel was matched to its archive photo via the historic filename and a public parcel record; that building's structure is crosschecked as 벽돌. The specific Jootek detail URL was not directly retrievable through the available external reader.
- Some source approval years differ from the years recorded on original photo filenames. The project retains the original construction-year strings, marks the discrepancy in `notes`, and records independently reported `approval_date` where available. **Do not automatically equate approval dates with original construction dates.**
- None of the newly written source descriptions or notes contain specific road addresses or cadastral numbers. Private full-address references must never be published in the CSV.
- Roof structure `(철근)콘크리트` is not automatically assigned to `roof_finish`. The latter is the visible roofing finish/material and requires separate evidence.

### Additional checks — 2026-11-03 (second pass)

- Public building-register republications supplied 15 more matched photo records across 12 building IDs (Seodaemun-gu, Eunpyeong-gu, Gangdong-gu, and Dongdaemun-gu). Source: 집품, with individual address-level matching performed privately against the original archive record.
- Source-confirmed `건축구조=벽돌구조` was normalized to existing CSV value `structure=벽돌`, with `structure_status=crosschecked`. No claims of direct official API verification were made.
- In some cases, the source occupancy approval year differs from the year originally captioned on the photographs; these were preserved with discrepancy notes. Do not modify original years solely from approval dates.
- Roof structural material, exterior surface material, tile type, and railing type were not inferred and remain unfilled where not independently supported.
- Public CSV contains no new full street addresses; public source descriptions are coarse.

### Follow-up crosscheck — 2026-11-03 (third pass)

- Four independently matched photo records were added from the public republication of Korean building-register summaries: IDs B-005, B-065, B-077, and B-082. Their main structural system is `벽돌구조`, stored as `structure=벽돌`, with `structure_status=crosschecked`; source: 집품 / 국토교통부 건축HUB 재게시.
- For B-082, the original photographed year (1981) differs from the source's 1987 approval date. Neither year has been silently overwritten; the discrepancy is recorded in `notes` and requires manual historic-image reconciliation.
- For B-007, the *current* address-level property database describes a building completed in 2023, while the archive photo has a circa-1980 year. That contemporary building cannot be treated as the building in the historical photo. No structure was inferred or assigned; a warning was added in `notes`.
- Current-site reconstruction/redevelopment is a significant risk in matching 1980s/1990s photos. Verify the **identity and era of the depicted building**, not only the street address of a current building.
- Do not introduce exact road addresses or parcel identifiers into the public repository.

### Follow-up crosscheck — 2026-11-03 (fourth pass)

- Added 4 photo records: B-057 (1973, 철근콘크리트구조, factory), B-104 (1992, 벽돌구조, detached multi-household dwelling), and B-114 plus B-126 (both photographs of a single 1987 철근콘크리트구조 building). Source: 집품 republication of Ministry of Land building register. All new structure statuses are `crosschecked`, not `verified`.
- Reconciled the exact-address duplicate `B-126` to `B-114` in `building_id` only; `file` references and visible anonymized titles stay unchanged. Provisional building groups therefore decreased from 135 to 134, and today's confirmed structures cover 67 unique groups.
- The 1987 building has mixed documented uses; register `primary_use` is 창고시설, but first-floor occupancy shows residence/storage. Do not simplify the register's usage or infer it is solely residential.
- B-106 was checked but deliberately left without `structure`: original photo caption year 2000 vs a 1990 occupancy approval year for the currently registered address. The discrepancy is noted and needs archival identity checking.
- A close neighboring address with the same road-name stem but a different street number was not treated as a match. Match the exact address and the depicted building era.
- No new precise street address, original address-laden filename, or per-address property URL is included in the public CSV or this guide.

### Follow-up crosscheck — 2026-11-03 (fifth pass)

- Five new unique building records were researched and populated after exact-site and period matching: B-003, B-004, B-009 (Mapo-gu), B-049 (Seodaemun-gu), and B-079 (Gangdong-gu).
- All five have a matching entry in public secondary republications of the Ministry of Land building register. Recorded main structural system: `벽돌구조` (stored as `structure=벽돌`, `structure_status=crosschecked`).
- Verified public register dates, when specifically displayed, were saved as `approval_date`. Photo-year fields were preserved; one record without directly confirmed day-level approval kept its approval date blank.
- Match exact historic property identity, not only neighborhood, property name, or adjacent house number. For instance, similar names in different neighborhoods and adjacent roads do not count as matches.
- Public CSV intentionally keeps only broad-safe source names and does not include exact street addresses, parcel IDs or public deep links to individual houses.
- Totals after this pass: 147 photographs; 134 provisional unique buildings; 79 photo rows / 72 unique building groups with structural classification; 68 unclassified photos.

### Follow-up crosscheck — 2026-11-03 (sixth pass)

- Newly crosschecked B-076 (Gangdong-gu, 1986), an exact-address match to a building-register republication: `벽돌구조`, 2 aboveground floors, communal housing (6 units), occupancy approval 1986-11-12. Source: 집품 / 국토교통부 건축HUB 표제부 재게시. The exact street address and per-building source link were deliberately not inserted into the public CSV.
- Verified that the official 국토교통부_건축HUB_건축물대장정보 service is free, auto-approved, REST JSON/XML, and requires an issued `serviceKey` after applying through the 공공데이터포털 (data.go.kr dataset 15134735). **No service key was supplied or available; therefore no direct authenticated API calls were made.** Do not place service keys in public GitHub repositories or GitHub Pages JavaScript.
- Several neighbors of unverified archive buildings also appeared in search results; their structural data were **not** copied. A matching street name without an exact building number and historical-era identity is not sufficient evidence.
- B-078 could be matched to a named multi-family building with 1992 completion date, but its indexed page did not expose an unambiguous structural-system field; structure remains blank pending direct documentary verification.
- New coverage: 80 / 147 photo rows with supported main structure, 73 provisional unique building groups, 67 photo rows unclassified.

### Municipal document crosscheck — 2026-11-03 (seventh pass)

- B-059 was matched privately by cadastral parcel to the published 2026 Eunpyeong-gu urban-renewal project implementation notice and its property inventory. Under the column `건축물 용도/구조`, the inventory lists `단독주택/연와조`, one building/two floors; normalized to `structure=벽돌`, with `structure_status=crosschecked`.
- This municipal property inventory is **not** the original authenticated building-register title. It documents the present registered structure but does **not** establish the original photo filename's 1993 construction year. That year remains unverified and the distinction is recorded in public `notes`.
- The notice PDF was text-indexed, but a rendered screenshot was not available from the external PDF reader; crosscheck status rather than directly verified is therefore retained. Do not promote this to an official building-register API verification.
- B-076 (earlier sixth pass) was also updated with its exact 1986 brick-built multi-family property match. Totals now 81 of 147 photo records, 74 distinct building groups, 66 unconfirmed photographs.
