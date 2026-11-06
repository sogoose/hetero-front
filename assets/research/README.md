# RESEARCH 자료 교체 안내

이 페이지는 세 장의 가로 도판으로 구성됩니다. 세로로 스크롤하지 않습니다.

- 실제 내용과 이미지 경로: assets/research/research-data.json
- 페이지 구조: research.html
- 화면 디자인: research-page.css
- 지도 전환과 도상 확대: research-page.js

**대부분의 수정은 research-data.json 한 파일에서 끝납니다.** HTML과 JS는 수정하지 않아도 됩니다.

## 업데이트: 실제 업로드한 지도 파일 (1991 / 2026)

실제 업로드된 지도에는 공통 지도 `assets/research/map.png`와 각 재료별 투명 분포 레이어가 있습니다.
이제 `mapBase` 및 `maps[].images` 경로에서 원본 파일을 직접 연결합니다.

| 재료 | 1991 | 2026 |
| --- | --- | --- |
| 벽돌 | `brick_1991xxxhdpi.png` | `brick_2026xxxhdpi.png` |
| 기와 | `roof_1991xxxhdpi.png` | `roof_2026xxxhdpi.png` |
| 주물 | 없음 (`null`) | `casting_2026xxxhdpi.png` |

첫 연구 도판은 연도(1991 / 2026)와 재료(종합 / 벽돌 / 기와 / 주물)를 따로 선택합니다.
**1991년에는 주물 지도가 없으므로 주물 선택이 비활성화됩니다.** 종합 지도는 있는 레이어만 합성합니다.
공통 베이스맵과 각 오버레이는 동일 좌표·캔버스 크기의 투명 PNG로 맞춰 업로드하세요.

**나중에 자료를 교체할 때** `research-data.json`의 `mapBase` 또는 `maps` 배열의 `images["1991"]`, `images["2026"]` 필드만 수정하세요.
새 주물 1991 파일을 추가하면 `null` 대신 해당 경로를 넣기만 하면 됩니다.

## 01 / DISTRIBUTION — 지도 4장

실제 지도가 이미 연결돼 있습니다. `combined`는 선택한 연도의 자료가 존재하는 레이어를 합쳐 보여줍니다. 각 `maps[].images`에서 연도별 경로를 교체하고, 추가 연도가 필요하면 `mapYears`에 등록하세요. `null`은 지도 미등록이라는 뜻입니다.

## 02 / PRODUCTION — 생산과 유통

JSON의 production.stages 배열에서 각 단계의 image를 교체하세요.

예: "image": "assets/research/process/merchant.webp"

원형 / 공장 / 건재상 / 시공자 / 혼종 주택의 다섯 단계를 기본으로 표시합니다.
label은 단계 이름, sub는 작은 부제목, description은 클릭해 확대했을 때 보이는 설명입니다.
image가 null이면 검은 선형 기본 도상이 표시됩니다. 현재 일부 단계는 기존 assets/archive 이미지로 시연합니다.
원래 전시 도면을 개별 부재 PNG/WebP 투명 배경으로 분리하면 가장 잘 어울립니다.

## 03 / TESTIMONY — 제작자 인터뷰

JSON의 testimonies.items 배열에서 이미지, 질문, 발언을 수정하세요.

- material: 벽돌 / 기와 / 주물
- question: 질문
- quote: 인용문
- speaker: 인터뷰이 / 출처
- image: 이미지 주소
- detail: 이미지를 클릭하면 열리는 설명
- href: 자세한 인터뷰 페이지 주소 (기본 interviews.html)

데스크톱에서는 세 열, 모바일에서는 탭으로 하나씩 보입니다.

## 권장 업로드 위치

assets/research/maps/combined-1991.webp
assets/research/maps/tile-1991.webp
assets/research/maps/brick-1991.webp
assets/research/maps/cast-1991.webp

assets/research/process/source.webp
assets/research/process/factory.webp
assets/research/process/merchant.webp
assets/research/process/site.webp
assets/research/process/house.webp

assets/research/interviews/brick.webp
assets/research/interviews/tile.webp
assets/research/interviews/cast.webp

파일과 폴더는 지금 미리 만들어 둘 필요가 없습니다. 새로운 이미지를 올릴 때 생성해도 됩니다.

**주의:** 경로는 research.html이 위치한 폴더를 기준으로 작성하고, 맨 앞에 슬래시(/)를 붙이지 마세요. GitHub Pages 배포 후 강력 새로고침을 해주세요.

화면은 좌우 화살표, 휠, 가로 스와이프, 하단 도판 선택으로 탐색합니다. 큰 이미지나 긴 글을 열었을 때만 상세 창 내부에서 스크롤할 수 있습니다.
