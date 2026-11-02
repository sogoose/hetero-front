# HETERO FRONT — Building Registry

This folder is the source of all buildings shown in `landscapes.html`.

## Editable spreadsheet

**`registry.csv`** is the editing sheet. Open in Excel, Google Sheets or another spreadsheet editor (UTF-8), fill in data, then commit the CSV to GitHub. Do not change the `file` key: it connects each row to its existing photograph. The public website automatically reads this CSV at page load. GitHub Pages may take a short time to publish changes.

| Column | Meaning |
|---|---|
| file | Exact photo filename (stable unique ID; required) |
| construction_year | Recorded building year, e.g. `1987` or `1980전후` |
| year_status | `verified` (checked), `estimated` (estimated), `unverified` (not independently checked) |
| year_source | Documentary or survey basis for the date |
| structure | Structural system (e.g. `조적조`, `철근콘크리트조`) |
| structure_status | `verified`, `estimated`, or `unverified` |
| wall_finish | Exterior wall finish (e.g. `점토벽돌`, `타일`) |
| wall_status | Confidence for wall finish |
| roof_finish | Roofing (e.g. `시멘트 기와`, `슬레이트`) |
| roof_status | Confidence for roofing |
| railing | Railing material / fabrication (e.g. `주물 난간`, `단조 난간`) |
| railing_status | Confidence for railing |
| notes | Free-text notes, source commentary, or later inference rationale |

### How the date statistics work

- The histogram always counts **all currently listed photos**, not just the cards visible on screen.
- Each photo is one record. If there are multiple photographs of the same building, the count is **not yet deduplicated to unique buildings**.
- Dates in the legacy `metadata.json` were migrated here as **unverified**, not as independently verified building permit dates. Seven circa-year entries were marked `estimated`.
- `1980전후` is tentatively placed in the 1980s and under 1980 in year-by-year mode. The statistics explicitly disclose this approximation.
- Blank materials fields stay unclassified, not guessed from the photograph. Fill material status fields when material information is verified or estimated.
- The photograph's front caption and reverse information reflect edits to `registry.csv` after deployment. Existing title, location, thumbnails, and supplementary photo details remain in `metadata.json`.

### Edit on GitHub

https://github.com/sogoose/hetero-front/edit/main/assets/buildings/registry.csv

No precise street addresses should be stored in this public CSV. Use coarse locations in `metadata.json`; do not add sensitive identifying information to notes.
